"""
Database connection and encryption utilities for GravityPanel.
Uses SQLAlchemy with SQLite and Fernet symmetric encryption for credentials.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from cryptography.fernet import Fernet

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

from config import DATA_DIR
DATABASE_DIR = DATA_DIR

DATABASE_URL = f"sqlite:///{os.path.join(DATABASE_DIR, 'gravitypanel.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---------------------------------------------------------------------------
# Encryption helpers
# ---------------------------------------------------------------------------

KEY_FILE = os.path.join(DATABASE_DIR, ".encryption_key")


def _load_or_create_key() -> bytes:
    """Load an existing Fernet key or generate a new one and persist it."""
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "rb") as f:
            return f.read()
    key = Fernet.generate_key()
    with open(KEY_FILE, "wb") as f:
        f.write(key)
    return key


_FERNET = Fernet(_load_or_create_key())


def encrypt_value(plain: str) -> str:
    """Encrypt a plaintext string and return a URL-safe base64 token."""
    return _FERNET.encrypt(plain.encode()).decode()


def decrypt_value(token: str) -> str:
    """Decrypt a Fernet token back to plaintext."""
    return _FERNET.decrypt(token.encode()).decode()


# ---------------------------------------------------------------------------
# Dependency for FastAPI routes
# ---------------------------------------------------------------------------


def get_db():
    """Yield a database session and ensure it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
