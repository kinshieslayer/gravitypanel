"""
APScheduler-based task scheduler for GravityPanel.
Handles:
- Auto-posting scheduled posts when their time arrives
- Running DM bot watchers at configured intervals
"""

import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from database import SessionLocal
from models import ScheduledPost, DMWatcher

logger = logging.getLogger("scheduler")

scheduler = BackgroundScheduler(timezone="UTC")


# -----------------------------------------------------------------------
# Post publishing job
# -----------------------------------------------------------------------

def _publish_post(post_id: int):
    """Attempt to publish a single scheduled post to all selected accounts/platforms."""
    from instagram_api import InstagramAPI
    from youtube_api import YouTubeAPI
    from tiktok_api import TikTokAPI
    from models import Account, Setting
    from database import decrypt_value
    import json

    db: Session = SessionLocal()
    try:
        post = db.query(ScheduledPost).filter_by(id=post_id).first()
        if not post or post.status != "pending":
            return

        errors: list[str] = []
        caption = f"{post.title}\n\n{post.description}"
        if post.hashtags:
            caption += f"\n\n{post.hashtags}"

        # 1. Identify which accounts to post to
        accounts_to_post = []
        
        if post.selected_account_ids:
            # New Multi-Account logic: use specific account IDs
            ids = [int(i.strip()) for i in post.selected_account_ids.split(",") if i.strip()]
            accounts_to_post = db.query(Account).filter(Account.id.in_(ids)).all()
        
        # 2. Loop through selected accounts and publish
        for acc in accounts_to_post:
            try:
                creds = json.loads(decrypt_value(acc.encrypted_credentials))
                
                if acc.platform == "instagram":
                    # Use account-specific credentials
                    api = InstagramAPI(creds.get("access_token"), creds.get("instagram_user_id") or acc.username)
                    result = api.publish_reel(post.video_path, caption)
                    if not result["success"]:
                        errors.append(f"Instagram ({acc.username}): {result['error']}")
                
                elif acc.platform == "youtube":
                    api = YouTubeAPI(api_key=creds.get("access_token") or creds.get("api_key"))
                    tags = [t.strip() for t in post.hashtags.split(",") if t.strip()] if post.hashtags else []
                    result = api.upload_video(post.video_path, post.title, post.description, tags)
                    if not result["success"]:
                        errors.append(f"YouTube ({acc.username}): {result['error']}")
                
                elif acc.platform == "tiktok":
                    api = TikTokAPI(creds.get("access_token"))
                    result = api.publish_video(post.video_path, post.title, post.description)
                    if not result["success"]:
                        errors.append(f"TikTok ({acc.username}): {result['error']}")
                        
            except Exception as e:
                errors.append(f"{acc.platform} ({acc.username}) critical error: {str(e)}")

        # 3. Fallback to Legacy Global Settings (only if no specific accounts are selected)
        if not accounts_to_post and post.platforms:
            legacy_platforms = [p.strip().lower() for p in post.platforms.split(",")]
            
            if "instagram" in legacy_platforms:
                try:
                    token_row = db.query(Setting).filter_by(key="meta_access_token").first()
                    ig_user_row = db.query(Setting).filter_by(key="instagram_user_id").first()
                    if token_row and ig_user_row:
                        api = InstagramAPI(decrypt_value(token_row.value), ig_user_row.value)
                        result = api.publish_reel(post.video_path, caption)
                        if not result["success"]: errors.append(f"Legacy Instagram: {result['error']}")
                except Exception as e: errors.append(f"Legacy Instagram Error: {e}")

            if "youtube" in legacy_platforms:
                try:
                    yt_key_row = db.query(Setting).filter_by(key="youtube_api_key").first()
                    if yt_key_row:
                        api = YouTubeAPI(yt_key_row.value)
                        tags = [t.strip() for t in post.hashtags.split(",") if t.strip()] if post.hashtags else []
                        result = api.upload_video(post.video_path, post.title, post.description, tags)
                        if not result["success"]: errors.append(f"Legacy YouTube: {result['error']}")
                except Exception as e: errors.append(f"Legacy YouTube Error: {e}")

            if "tiktok" in legacy_platforms:
                try:
                    tt_token_row = db.query(Setting).filter_by(key="tiktok_access_token").first()
                    if tt_token_row:
                        api = TikTokAPI(decrypt_value(tt_token_row.value))
                        result = api.publish_video(post.video_path, post.title, post.description)
                        if not result["success"]: errors.append(f"Legacy TikTok: {result['error']}")
                except Exception as e: errors.append(f"Legacy TikTok Error: {e}")

        # Finalize post status
        if errors:
            post.status = "failed"
            post.error_message = "; ".join(errors)
        else:
            # If no accounts were even picked, it shouldn't be "posted"
            if not accounts_to_post and not post.platforms:
                post.status = "failed"
                post.error_message = "No accounts or platforms selected for this post."
            else:
                post.status = "posted"

        post.updated_at = datetime.utcnow()
        db.commit()

    except Exception as exc:
        db.rollback()
        logger.exception(f"Unexpected error publishing post {post_id}: {exc}")
    finally:
        db.close()


def check_pending_posts():
    """Check for pending posts whose scheduled time has passed and publish them."""
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        pending = (
            db.query(ScheduledPost)
            .filter(ScheduledPost.status == "pending", ScheduledPost.scheduled_time <= now)
            .all()
        )
        for post in pending:
            logger.info(f"Publishing post {post.id}: {post.title}")
            _publish_post(post.id)
    except Exception as exc:
        logger.exception(f"Error checking pending posts: {exc}")
    finally:
        db.close()


# -----------------------------------------------------------------------
# DM bot watcher job
# -----------------------------------------------------------------------

def run_dm_watcher(watcher_id: int):
    """Run a single DM watcher iteration."""
    from dm_bot import dm_bot

    db: Session = SessionLocal()
    try:
        watcher = db.query(DMWatcher).filter_by(id=watcher_id, is_active=True).first()
        if not watcher:
            return

        if not dm_bot.logged_in:
            logger.warning(f"DM bot not logged in — skipping watcher {watcher_id}")
            return

        dm_bot.process_watcher(
            watcher_id=watcher.id,
            post_url=watcher.post_url,
            trigger_keyword=watcher.trigger_keyword,
            dm_template=watcher.dm_template,
            max_dms_per_hour=watcher.max_dms_per_hour,
            db_session_factory=SessionLocal,
        )
    except Exception as exc:
        logger.exception(f"DM watcher {watcher_id} error: {exc}")
    finally:
        db.close()


# -----------------------------------------------------------------------
# Scheduler management
# -----------------------------------------------------------------------

def start_scheduler():
    """Initialize and start the background scheduler."""
    # Check pending posts every 60 seconds
    scheduler.add_job(
        check_pending_posts,
        trigger=IntervalTrigger(seconds=60),
        id="check_pending_posts",
        replace_existing=True,
    )

    # Start DM watcher jobs for all active watchers
    _sync_dm_watcher_jobs()

    scheduler.start()
    logger.info("Scheduler started")


def _sync_dm_watcher_jobs():
    """Create APScheduler jobs for all active DM watchers."""
    db: Session = SessionLocal()
    try:
        watchers = db.query(DMWatcher).filter_by(is_active=True).all()
        for w in watchers:
            add_dm_watcher_job(w.id, w.check_interval_minutes)
    finally:
        db.close()


def add_dm_watcher_job(watcher_id: int, interval_minutes: int):
    """Add or replace a DM watcher job."""
    job_id = f"dm_watcher_{watcher_id}"
    scheduler.add_job(
        run_dm_watcher,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id=job_id,
        replace_existing=True,
        args=[watcher_id],
    )
    logger.info(f"DM watcher job {job_id} scheduled every {interval_minutes} min")


def remove_dm_watcher_job(watcher_id: int):
    """Remove a DM watcher job."""
    job_id = f"dm_watcher_{watcher_id}"
    try:
        scheduler.remove_job(job_id)
        logger.info(f"Removed DM watcher job {job_id}")
    except Exception:
        pass


def stop_scheduler():
    """Shutdown the scheduler gracefully."""
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")
