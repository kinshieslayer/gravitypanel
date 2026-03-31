"""
Routes for analytics data across all platforms.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db, decrypt_value
from models import Setting

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


def _get_setting(db: Session, key: str) -> Optional[str]:
    """Helper to retrieve a setting value, decrypting if necessary."""
    row = db.query(Setting).filter_by(key=key).first()
    if not row:
        return None
    if row.is_secret:
        try:
            return decrypt_value(row.value)
        except Exception:
            return row.value
    return row.value


@router.get("/instagram")
def instagram_analytics(
    since: Optional[str] = Query(None, description="Start date (UNIX timestamp or ISO)"),
    until: Optional[str] = Query(None, description="End date (UNIX timestamp or ISO)"),
    db: Session = Depends(get_db),
):
    """Fetch Instagram analytics: followers, reach, impressions, profile visits, top posts."""
    from instagram_api import InstagramAPI

    token = _get_setting(db, "meta_access_token")
    ig_user = _get_setting(db, "instagram_user_id")
    if not token or not ig_user:
        raise HTTPException(status_code=400, detail="Instagram API credentials not configured. Go to Settings.")

    api = InstagramAPI(token, ig_user)

    profile = api.get_profile_info()
    insights = api.get_insights(
        metric="impressions,reach,profile_views",
        period="day",
        since=int(since) if since and since.isdigit() else None,
        until=int(until) if until and until.isdigit() else None,
    )
    top_media = api.get_top_media(limit=10)

    return {
        "profile": profile.get("data", {}),
        "insights": insights.get("data", []),
        "top_posts": top_media.get("data", []),
        "errors": [
            e
            for e in [
                None if profile["success"] else profile.get("error"),
                None if insights["success"] else insights.get("error"),
                None if top_media["success"] else top_media.get("error"),
            ]
            if e
        ],
    }


@router.get("/youtube")
def youtube_analytics(
    channel_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Fetch YouTube analytics: views, subscribers, watch time, top videos."""
    from youtube_api import YouTubeAPI

    api_key = _get_setting(db, "youtube_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="YouTube API key not configured. Go to Settings.")

    cid = channel_id or _get_setting(db, "youtube_channel_id")
    if not cid:
        raise HTTPException(status_code=400, detail="YouTube channel ID not configured. Go to Settings.")

    api = YouTubeAPI(api_key=api_key)

    channel_stats = api.get_channel_stats(channel_id=cid)
    top_videos = api.get_top_videos(channel_id=cid, max_results=10)
    recent_videos = api.get_recent_videos(channel_id=cid, max_results=20)

    return {
        "channel": channel_stats.get("data", {}),
        "top_videos": top_videos.get("data", []),
        "recent_videos": recent_videos.get("data", []),
        "errors": [
            e
            for e in [
                None if channel_stats["success"] else channel_stats.get("error"),
                None if top_videos["success"] else top_videos.get("error"),
                None if recent_videos["success"] else recent_videos.get("error"),
            ]
            if e
        ],
    }


@router.get("/tiktok")
def tiktok_analytics(db: Session = Depends(get_db)):
    """Fetch TikTok analytics: views, followers, likes, top videos."""
    from tiktok_api import TikTokAPI

    token = _get_setting(db, "tiktok_access_token")
    if not token:
        raise HTTPException(status_code=400, detail="TikTok API credentials not configured. Go to Settings.")

    api = TikTokAPI(token)

    user_info = api.get_user_info()
    video_list = api.get_video_list(max_count=20)

    videos = video_list.get("data", {}).get("videos", []) if video_list["success"] else []
    # Sort by views descending for "top videos"
    top_videos = sorted(videos, key=lambda v: v.get("view_count", 0), reverse=True)[:10]

    return {
        "user": user_info.get("data", {}),
        "videos": videos,
        "top_videos": top_videos,
        "errors": [
            e
            for e in [
                None if user_info["success"] else user_info.get("error"),
                None if video_list["success"] else video_list.get("error"),
            ]
            if e
        ],
    }


@router.get("/summary")
def analytics_summary(db: Session = Depends(get_db)):
    """Quick summary stats for the dashboard."""
    from models import ScheduledPost, Account, DMWatcher

    total_posts = db.query(ScheduledPost).count()
    pending_posts = db.query(ScheduledPost).filter_by(status="pending").count()
    posted_count = db.query(ScheduledPost).filter_by(status="posted").count()
    failed_count = db.query(ScheduledPost).filter_by(status="failed").count()
    total_accounts = db.query(Account).count()
    active_watchers = db.query(DMWatcher).filter_by(is_active=True).count()

    return {
        "total_posts": total_posts,
        "pending_posts": pending_posts,
        "posted_count": posted_count,
        "failed_count": failed_count,
        "total_accounts": total_accounts,
        "active_watchers": active_watchers,
    }
