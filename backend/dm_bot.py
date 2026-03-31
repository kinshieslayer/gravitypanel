"""
Instagram DM Bot using instagrapi.
Watches post comments for trigger keywords and auto-DMs matching users.
"""

import time
import logging
import threading
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger("dm_bot")

# Guard import — instagrapi may not be installed in all environments
try:
    from instagrapi import Client as InstaClient
    from instagrapi.exceptions import (
        LoginRequired,
        ChallengeRequired,
        TwoFactorRequired,
    )
    INSTAGRAPI_AVAILABLE = True
except ImportError:
    INSTAGRAPI_AVAILABLE = False
    logger.warning("instagrapi not installed — DM bot features will be unavailable")


class DMBot:
    """
    Manages Instagram DM automation:
    - Login via instagrapi (supports 2FA)
    - Watch comments on specific posts
    - Send templated DMs when trigger keywords are detected
    - Anti-duplicate and rate-limiting
    """

    def __init__(self):
        self.client: Optional[object] = None
        self.logged_in = False
        self._lock = threading.Lock()
        self._dm_timestamps: list[datetime] = []  # for rate limiting

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    def login(self, username: str, password: str, verification_code: str = "") -> dict:
        """Login to Instagram via instagrapi."""
        if not INSTAGRAPI_AVAILABLE:
            return {"success": False, "error": "instagrapi library is not installed"}

        try:
            self.client = InstaClient()
            self.client.delay_range = [2, 5]  # human-like delays

            if verification_code:
                self.client.login(username, password, verification_code=verification_code)
            else:
                self.client.login(username, password)

            self.logged_in = True
            logger.info(f"Successfully logged in as {username}")
            return {"success": True, "message": f"Logged in as {username}"}

        except TwoFactorRequired:
            return {"success": False, "error": "2FA_REQUIRED", "message": "Two-factor authentication code required"}
        except ChallengeRequired:
            return {"success": False, "error": "CHALLENGE_REQUIRED", "message": "Instagram challenge required — please verify on the app"}
        except LoginRequired as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            logger.exception("Login failed")
            return {"success": False, "error": str(exc)}

    def logout(self):
        """Logout from Instagram."""
        if self.client and self.logged_in:
            try:
                self.client.logout()
            except Exception:
                pass
        self.logged_in = False
        self.client = None

    # ------------------------------------------------------------------
    # Comment watching
    # ------------------------------------------------------------------

    def get_media_id_from_url(self, post_url: str) -> Optional[str]:
        """Extract the media PK from a post URL."""
        if not self.client or not self.logged_in:
            return None
        try:
            media_pk = self.client.media_pk_from_url(post_url)
            return str(media_pk)
        except Exception as exc:
            logger.error(f"Failed to get media ID from URL {post_url}: {exc}")
            return None

    def fetch_comments(self, media_id: str, amount: int = 50) -> list:
        """Fetch recent comments on a post."""
        if not self.client or not self.logged_in:
            return []
        try:
            comments = self.client.media_comments(int(media_id), amount=amount)
            return [
                {
                    "user_id": str(c.user.pk),
                    "username": c.user.username,
                    "text": c.text,
                    "created_at": str(c.created_at_utc),
                }
                for c in comments
            ]
        except Exception as exc:
            logger.error(f"Failed to fetch comments for media {media_id}: {exc}")
            return []

    # ------------------------------------------------------------------
    # DM sending
    # ------------------------------------------------------------------

    def _check_rate_limit(self, max_per_hour: int) -> bool:
        """Return True if we can send another DM without exceeding the rate limit."""
        now = datetime.utcnow()
        cutoff = now - timedelta(hours=1)
        with self._lock:
            self._dm_timestamps = [t for t in self._dm_timestamps if t > cutoff]
            return len(self._dm_timestamps) < max_per_hour

    def _record_dm(self):
        """Record a DM send timestamp for rate limiting."""
        with self._lock:
            self._dm_timestamps.append(datetime.utcnow())

    def send_dm(self, user_id: str, message: str) -> dict:
        """Send a direct message to a user by their user ID."""
        if not self.client or not self.logged_in:
            return {"success": False, "error": "Not logged in"}
        try:
            self.client.direct_send(message, user_ids=[int(user_id)])
            self._record_dm()
            logger.info(f"DM sent to user {user_id}")
            return {"success": True}
        except Exception as exc:
            logger.error(f"Failed to send DM to {user_id}: {exc}")
            return {"success": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Watcher loop (called by APScheduler)
    # ------------------------------------------------------------------

    def process_watcher(self, watcher_id: int, post_url: str, trigger_keyword: str,
                        dm_template: str, max_dms_per_hour: int,
                        db_session_factory) -> list:
        """
        Process a single watcher:
        1. Fetch comments from the post
        2. Filter by trigger keyword
        3. Check anti-duplicate
        4. Respect rate limit
        5. Send DMs
        Returns list of log entries.
        """
        from models import DMedUser, DMLog

        results = []

        media_id = self.get_media_id_from_url(post_url)
        if not media_id:
            logger.error(f"Watcher {watcher_id}: Could not resolve media ID for {post_url}")
            return results

        comments = self.fetch_comments(media_id)

        db: Session = db_session_factory()
        try:
            for comment in comments:
                # Check trigger keyword (case-insensitive)
                if trigger_keyword.lower() not in comment["text"].lower():
                    continue

                user_id = comment["user_id"]
                username = comment["username"]

                # Anti-duplicate check
                already_dmed = db.query(DMedUser).filter_by(instagram_user_id=user_id).first()
                if already_dmed:
                    continue

                # Rate limit check
                if not self._check_rate_limit(max_dms_per_hour):
                    logger.warning(f"Watcher {watcher_id}: Rate limit reached ({max_dms_per_hour}/hr)")
                    break

                # Prepare DM message
                message = dm_template.replace("{username}", username)

                # Send DM
                result = self.send_dm(user_id, message)

                # Record in anti-duplicate table
                db.add(DMedUser(instagram_user_id=user_id, username=username))

                # Create log entry
                log_entry = DMLog(
                    watcher_id=watcher_id,
                    commenter_username=username,
                    comment_text=comment["text"],
                    dm_sent=result["success"],
                    error_message=result.get("error", ""),
                )
                db.add(log_entry)
                results.append({
                    "username": username,
                    "comment": comment["text"],
                    "dm_sent": result["success"],
                    "error": result.get("error", ""),
                })

                # Small delay between DMs to avoid triggering Instagram's spam detection
                time.sleep(3)

            db.commit()
        except Exception as exc:
            db.rollback()
            logger.exception(f"Watcher {watcher_id} error: {exc}")
        finally:
            db.close()

        return results


# Singleton bot instance
dm_bot = DMBot()
