"""
SQLAlchemy ORM models for GravityPanel.
"""

import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from database import Base


# ---------------------------------------------------------------------------
# Account
# ---------------------------------------------------------------------------

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String(32), nullable=False)          # instagram | youtube | tiktok
    username = Column(String(255), nullable=False)
    encrypted_credentials = Column(Text, nullable=False)    # Fernet-encrypted JSON blob
    token_status = Column(String(32), default="connected")  # connected | expired
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


# ---------------------------------------------------------------------------
# Scheduled Post
# ---------------------------------------------------------------------------

class ScheduledPost(Base):
    __tablename__ = "scheduled_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, default="")
    hashtags = Column(Text, default="")                     # comma-separated
    video_path = Column(Text, nullable=False)               # absolute local path
    platforms = Column(String(255), nullable=False)         # comma-separated: instagram,youtube,tiktok
    scheduled_time = Column(DateTime, nullable=False)
    status = Column(String(32), default="pending")          # pending | posted | failed
    error_message = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


# ---------------------------------------------------------------------------
# DM Watcher
# ---------------------------------------------------------------------------

class DMWatcher(Base):
    __tablename__ = "dm_watchers"

    id = Column(Integer, primary_key=True, index=True)
    post_url = Column(Text, nullable=False)
    trigger_keyword = Column(String(255), nullable=False)
    dm_template = Column(Text, nullable=False)              # supports {username}
    check_interval_minutes = Column(Integer, default=5)
    max_dms_per_hour = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    logs = relationship("DMLog", back_populates="watcher", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# DM Log
# ---------------------------------------------------------------------------

class DMLog(Base):
    __tablename__ = "dm_logs"

    id = Column(Integer, primary_key=True, index=True)
    watcher_id = Column(Integer, ForeignKey("dm_watchers.id"), nullable=False)
    commenter_username = Column(String(255), nullable=False)
    comment_text = Column(Text, default="")
    dm_sent = Column(Boolean, default=False)
    error_message = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    watcher = relationship("DMWatcher", back_populates="logs")


# ---------------------------------------------------------------------------
# DMed User (anti-duplicate)
# ---------------------------------------------------------------------------

class DMedUser(Base):
    __tablename__ = "dmed_users"

    id = Column(Integer, primary_key=True, index=True)
    instagram_user_id = Column(String(255), nullable=False, unique=True)
    username = Column(String(255), nullable=False)
    dmed_at = Column(DateTime, default=datetime.datetime.utcnow)


# ---------------------------------------------------------------------------
# Settings (key-value store)
# ---------------------------------------------------------------------------

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text, default="")                        # encrypted for sensitive keys
    is_secret = Column(Boolean, default=False)
