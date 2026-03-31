"""
Routes for account management.
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, encrypt_value, decrypt_value
from models import Account

router = APIRouter(prefix="/api/accounts", tags=["Accounts"])


class AccountCreate(BaseModel):
    platform: str
    username: str
    credentials: dict  # Will be encrypted before storage


class AccountUpdate(BaseModel):
    credentials: Optional[dict] = None


@router.post("")
def create_account(payload: AccountCreate, db: Session = Depends(get_db)):
    """Add a new social media account."""
    # Encrypt credentials
    creds_json = json.dumps(payload.credentials)
    encrypted = encrypt_value(creds_json)

    account = Account(
        platform=payload.platform.lower(),
        username=payload.username,
        encrypted_credentials=encrypted,
        token_status="connected",
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    return {
        "id": account.id,
        "platform": account.platform,
        "username": account.username,
        "token_status": account.token_status,
        "created_at": account.created_at.isoformat(),
    }


@router.get("")
def list_accounts(platform: Optional[str] = None, db: Session = Depends(get_db)):
    """List all accounts, optionally filtered by platform."""
    query = db.query(Account)
    if platform:
        query = query.filter(Account.platform == platform.lower())
    accounts = query.order_by(Account.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "platform": a.platform,
            "username": a.username,
            "token_status": a.token_status,
            "created_at": a.created_at.isoformat(),
            "updated_at": a.updated_at.isoformat(),
        }
        for a in accounts
    ]


@router.get("/{account_id}")
def get_account(account_id: int, db: Session = Depends(get_db)):
    """Get a single account by ID (credentials are NOT returned in plaintext)."""
    account = db.query(Account).filter_by(id=account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return {
        "id": account.id,
        "platform": account.platform,
        "username": account.username,
        "token_status": account.token_status,
        "created_at": account.created_at.isoformat(),
        "updated_at": account.updated_at.isoformat(),
    }


@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    """Remove an account."""
    account = db.query(Account).filter_by(id=account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(account)
    db.commit()
    return {"message": "Account removed"}


@router.put("/{account_id}/refresh")
def refresh_token(account_id: int, payload: Optional[AccountUpdate] = None, db: Session = Depends(get_db)):
    """Refresh / update account credentials and mark as connected."""
    account = db.query(Account).filter_by(id=account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if payload and payload.credentials:
        creds_json = json.dumps(payload.credentials)
        account.encrypted_credentials = encrypt_value(creds_json)

    account.token_status = "connected"
    account.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(account)

    return {
        "id": account.id,
        "platform": account.platform,
        "username": account.username,
        "token_status": account.token_status,
        "updated_at": account.updated_at.isoformat(),
    }
