"""
Routes for application settings management.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, encrypt_value, decrypt_value
from models import Setting

router = APIRouter(prefix="/api/settings", tags=["Settings"])

# Keys that should always be encrypted
SECRET_KEYS = {
    "meta_access_token",
    "meta_app_secret",
    "tiktok_access_token",
    "instagram_password",
}


class SettingValue(BaseModel):
    key: str
    value: str


class SettingsBulkUpdate(BaseModel):
    settings: list[SettingValue]


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    """
    Get all settings. Secret values are masked unless ?reveal=true is passed
    (for pre-filling forms).
    """
    rows = db.query(Setting).order_by(Setting.key).all()
    result = {}
    for row in rows:
        if row.is_secret:
            try:
                result[row.key] = decrypt_value(row.value)
            except Exception:
                result[row.key] = "••••••••"
        else:
            result[row.key] = row.value
    return result


@router.put("")
def update_settings(payload: SettingsBulkUpdate, db: Session = Depends(get_db)):
    """Bulk-update settings. Secret keys are automatically encrypted."""
    updated = []
    for item in payload.settings:
        is_secret = item.key in SECRET_KEYS
        stored_value = encrypt_value(item.value) if is_secret else item.value

        existing = db.query(Setting).filter_by(key=item.key).first()
        if existing:
            existing.value = stored_value
            existing.is_secret = is_secret
        else:
            db.add(Setting(key=item.key, value=stored_value, is_secret=is_secret))
        updated.append(item.key)

    db.commit()
    return {"message": "Settings updated", "keys": updated}


@router.get("/{key}")
def get_setting(key: str, db: Session = Depends(get_db)):
    """Get a single setting value."""
    row = db.query(Setting).filter_by(key=key).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    value = row.value
    if row.is_secret:
        try:
            value = decrypt_value(value)
        except Exception:
            value = "••••••••"
    return {"key": row.key, "value": value, "is_secret": row.is_secret}


@router.delete("/{key}")
def delete_setting(key: str, db: Session = Depends(get_db)):
    """Delete a setting."""
    row = db.query(Setting).filter_by(key=key).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    db.delete(row)
    db.commit()
    return {"message": f"Setting '{key}' deleted"}
