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
    """Attempt to publish a single scheduled post to all selected platforms."""
    from instagram_api import InstagramAPI
    from youtube_api import YouTubeAPI
    from tiktok_api import TikTokAPI
    from models import Setting
    from database import decrypt_value

    db: Session = SessionLocal()
    try:
        post = db.query(ScheduledPost).filter_by(id=post_id).first()
        if not post or post.status != "pending":
            return

        platforms = [p.strip().lower() for p in post.platforms.split(",")]
        errors: list[str] = []
        caption = f"{post.title}\n\n{post.description}"
        if post.hashtags:
            caption += f"\n\n{post.hashtags}"

        # --- Instagram ---
        if "instagram" in platforms:
            try:
                token_row = db.query(Setting).filter_by(key="meta_access_token").first()
                ig_user_row = db.query(Setting).filter_by(key="instagram_user_id").first()
                if token_row and ig_user_row:
                    token = decrypt_value(token_row.value) if token_row else ""
                    ig_user = ig_user_row.value if ig_user_row else ""
                    api = InstagramAPI(token, ig_user)
                    # Note: Meta Graph API requires a public URL; for local files
                    # a pre-signed upload URL workflow would be needed.
                    result = api.publish_reel(post.video_path, caption)
                    if not result["success"]:
                        errors.append(f"Instagram: {result['error']}")
                else:
                    errors.append("Instagram: API credentials not configured")
            except Exception as exc:
                errors.append(f"Instagram: {exc}")

        # --- YouTube ---
        if "youtube" in platforms:
            try:
                yt_key_row = db.query(Setting).filter_by(key="youtube_api_key").first()
                if yt_key_row:
                    api = YouTubeAPI(api_key=yt_key_row.value)
                    tags = [t.strip() for t in post.hashtags.split(",") if t.strip()] if post.hashtags else []
                    result = api.upload_video(
                        file_path=post.video_path,
                        title=post.title,
                        description=post.description,
                        tags=tags,
                    )
                    if not result["success"]:
                        errors.append(f"YouTube: {result['error']}")
                else:
                    errors.append("YouTube: API key not configured")
            except Exception as exc:
                errors.append(f"YouTube: {exc}")

        # --- TikTok ---
        if "tiktok" in platforms:
            try:
                tt_token_row = db.query(Setting).filter_by(key="tiktok_access_token").first()
                if tt_token_row:
                    token = decrypt_value(tt_token_row.value) if tt_token_row else ""
                    api = TikTokAPI(token)
                    result = api.publish_video(
                        file_path=post.video_path,
                        title=post.title,
                        description=post.description,
                    )
                    if not result["success"]:
                        errors.append(f"TikTok: {result['error']}")
                else:
                    errors.append("TikTok: API credentials not configured")
            except Exception as exc:
                errors.append(f"TikTok: {exc}")

        # Update post status
        if errors:
            post.status = "failed"
            post.error_message = "; ".join(errors)
            logger.error(f"Post {post_id} failed: {post.error_message}")
        else:
            post.status = "posted"
            logger.info(f"Post {post_id} published successfully")

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
