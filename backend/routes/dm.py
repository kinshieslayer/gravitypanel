"""
Routes for DM bot watcher management.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import DMWatcher, DMLog

router = APIRouter(prefix="/api/dm", tags=["DM Bot"])


# -----------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------

class WatcherCreate(BaseModel):
    post_url: str
    trigger_keyword: str
    dm_template: str
    check_interval_minutes: int = 5
    max_dms_per_hour: int = 10
    account_id: Optional[int] = None


class WatcherUpdate(BaseModel):
    post_url: Optional[str] = None
    trigger_keyword: Optional[str] = None
    dm_template: Optional[str] = None
    check_interval_minutes: Optional[int] = None
    max_dms_per_hour: Optional[int] = None
    is_active: Optional[bool] = None


class LoginRequest(BaseModel):
    username: str
    password: str
    verification_code: str = ""


# -----------------------------------------------------------------------
# DM Bot login
# -----------------------------------------------------------------------

@router.post("/login")
def dm_bot_login(payload: LoginRequest):
    """Log into Instagram for DM automation."""
    from dm_bot import dm_bot
    result = dm_bot.login(payload.username, payload.password, payload.verification_code)
    if not result["success"]:
        status = 400
        if result.get("error") == "2FA_REQUIRED":
            status = 428  # Precondition Required
        raise HTTPException(status_code=status, detail=result)
    return result


@router.post("/logout")
def dm_bot_logout():
    """Log out of Instagram DM bot."""
    from dm_bot import dm_bot
    dm_bot.logout()
    return {"message": "Logged out"}


@router.get("/status")
def dm_bot_status():
    """Check DM bot login status."""
    from dm_bot import dm_bot
    return {"logged_in": dm_bot.logged_in}


# -----------------------------------------------------------------------
# Watchers CRUD
# -----------------------------------------------------------------------

@router.post("/watchers")
def create_watcher(payload: WatcherCreate, db: Session = Depends(get_db)):
    """Create a new comment watcher."""
    from scheduler import add_dm_watcher_job

    watcher = DMWatcher(
        post_url=payload.post_url,
        trigger_keyword=payload.trigger_keyword,
        dm_template=payload.dm_template,
        check_interval_minutes=payload.check_interval_minutes,
        max_dms_per_hour=payload.max_dms_per_hour,
        is_active=True,
        account_id=payload.account_id,
    )
    db.add(watcher)
    db.commit()
    db.refresh(watcher)

    # Register with scheduler
    add_dm_watcher_job(watcher.id, watcher.check_interval_minutes)

    return _watcher_dict(watcher)


@router.get("/watchers")
def list_watchers(db: Session = Depends(get_db)):
    """List all DM watchers."""
    watchers = db.query(DMWatcher).order_by(DMWatcher.created_at.desc()).all()
    return [_watcher_dict(w) for w in watchers]


@router.get("/watchers/{watcher_id}")
def get_watcher(watcher_id: int, db: Session = Depends(get_db)):
    """Get a single watcher by ID."""
    watcher = db.query(DMWatcher).filter_by(id=watcher_id).first()
    if not watcher:
        raise HTTPException(status_code=404, detail="Watcher not found")
    return _watcher_dict(watcher)


@router.put("/watchers/{watcher_id}")
def update_watcher(watcher_id: int, payload: WatcherUpdate, db: Session = Depends(get_db)):
    """Update a watcher's settings or toggle it on/off."""
    from scheduler import add_dm_watcher_job, remove_dm_watcher_job

    watcher = db.query(DMWatcher).filter_by(id=watcher_id).first()
    if not watcher:
        raise HTTPException(status_code=404, detail="Watcher not found")

    if payload.post_url is not None:
        watcher.post_url = payload.post_url
    if payload.trigger_keyword is not None:
        watcher.trigger_keyword = payload.trigger_keyword
    if payload.dm_template is not None:
        watcher.dm_template = payload.dm_template
    if payload.check_interval_minutes is not None:
        watcher.check_interval_minutes = payload.check_interval_minutes
    if payload.max_dms_per_hour is not None:
        watcher.max_dms_per_hour = payload.max_dms_per_hour
    if payload.is_active is not None:
        watcher.is_active = payload.is_active

    db.commit()
    db.refresh(watcher)

    # Update scheduler job
    if watcher.is_active:
        add_dm_watcher_job(watcher.id, watcher.check_interval_minutes)
    else:
        remove_dm_watcher_job(watcher.id)

    return _watcher_dict(watcher)


@router.delete("/watchers/{watcher_id}")
def delete_watcher(watcher_id: int, db: Session = Depends(get_db)):
    """Delete a watcher and its logs."""
    from scheduler import remove_dm_watcher_job

    watcher = db.query(DMWatcher).filter_by(id=watcher_id).first()
    if not watcher:
        raise HTTPException(status_code=404, detail="Watcher not found")

    remove_dm_watcher_job(watcher.id)
    db.delete(watcher)
    db.commit()
    return {"message": "Watcher deleted"}


# -----------------------------------------------------------------------
# Activity logs
# -----------------------------------------------------------------------

@router.get("/logs")
def get_logs(
    watcher_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """Fetch DM activity logs with optional watcher filter."""
    query = db.query(DMLog)
    if watcher_id is not None:
        query = query.filter(DMLog.watcher_id == watcher_id)
    total = query.count()
    logs = query.order_by(DMLog.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "logs": [
            {
                "id": log.id,
                "watcher_id": log.watcher_id,
                "commenter_username": log.commenter_username,
                "comment_text": log.comment_text,
                "dm_sent": log.dm_sent,
                "error_message": log.error_message,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
    }


# -----------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------

def _watcher_dict(w: DMWatcher) -> dict:
    return {
        "id": w.id,
        "post_url": w.post_url,
        "trigger_keyword": w.trigger_keyword,
        "dm_template": w.dm_template,
        "check_interval_minutes": w.check_interval_minutes,
        "max_dms_per_hour": w.max_dms_per_hour,
        "is_active": w.is_active,
        "account_id": w.account_id,
        "created_at": w.created_at.isoformat(),
        "updated_at": w.updated_at.isoformat(),
    }
