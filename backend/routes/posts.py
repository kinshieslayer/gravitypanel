"""
Routes for scheduled post management.
"""

import os
import shutil
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from database import get_db
from models import ScheduledPost
from config import DATA_DIR

router = APIRouter(prefix="/api/posts", tags=["Posts"])

UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("")
async def create_post(
    title: str = Form(...),
    description: str = Form(""),
    hashtags: str = Form(""),
    platforms: str = Form(...),
    scheduled_time: str = Form(...),
    video: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Create a new scheduled post with video upload."""
    try:
        # Parse scheduled time
        sched_dt = datetime.fromisoformat(scheduled_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scheduled_time format. Use ISO 8601.")

    # Save uploaded video
    safe_name = f"{int(datetime.utcnow().timestamp())}_{video.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(video.file, f)

    post = ScheduledPost(
        title=title,
        description=description,
        hashtags=hashtags,
        video_path=file_path,
        platforms=platforms,
        scheduled_time=sched_dt,
        status="pending",
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    return {
        "id": post.id,
        "title": post.title,
        "description": post.description,
        "hashtags": post.hashtags,
        "platforms": post.platforms,
        "video_path": post.video_path,
        "scheduled_time": post.scheduled_time.isoformat(),
        "status": post.status,
        "created_at": post.created_at.isoformat(),
    }


@router.get("")
def list_posts(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all scheduled posts, with optional filters."""
    query = db.query(ScheduledPost)
    if status:
        query = query.filter(ScheduledPost.status == status)
    if platform:
        query = query.filter(ScheduledPost.platforms.contains(platform))
    posts = query.order_by(ScheduledPost.scheduled_time.desc()).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "hashtags": p.hashtags,
            "platforms": p.platforms,
            "video_path": p.video_path,
            "scheduled_time": p.scheduled_time.isoformat(),
            "status": p.status,
            "error_message": p.error_message,
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat(),
        }
        for p in posts
    ]


@router.get("/{post_id}")
def get_post(post_id: int, db: Session = Depends(get_db)):
    """Get a single post by ID."""
    post = db.query(ScheduledPost).filter_by(id=post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return {
        "id": post.id,
        "title": post.title,
        "description": post.description,
        "hashtags": post.hashtags,
        "platforms": post.platforms,
        "video_path": post.video_path,
        "scheduled_time": post.scheduled_time.isoformat(),
        "status": post.status,
        "error_message": post.error_message,
        "created_at": post.created_at.isoformat(),
        "updated_at": post.updated_at.isoformat(),
    }


@router.put("/{post_id}")
def update_post(
    post_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    hashtags: Optional[str] = None,
    platforms: Optional[str] = None,
    scheduled_time: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Update a scheduled post. Only pending posts can be modified."""
    post = db.query(ScheduledPost).filter_by(id=post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending posts can be updated")

    if title is not None:
        post.title = title
    if description is not None:
        post.description = description
    if hashtags is not None:
        post.hashtags = hashtags
    if platforms is not None:
        post.platforms = platforms
    if scheduled_time is not None:
        try:
            post.scheduled_time = datetime.fromisoformat(scheduled_time)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid scheduled_time format")

    post.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(post)
    return {"message": "Post updated", "id": post.id}


@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    """Delete a scheduled post and its uploaded video."""
    post = db.query(ScheduledPost).filter_by(id=post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Remove video file
    if os.path.isfile(post.video_path):
        try:
            os.remove(post.video_path)
        except OSError:
            pass

    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}
