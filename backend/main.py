"""
GravityPanel — FastAPI Entry Point
Mounts all route modules, initialises the database, and starts the scheduler.
"""

import logging
import sys
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
from routes import posts, accounts, analytics, dm, settings as settings_routes

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("gravitypanel")


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run on startup and shutdown."""
    # --- Startup ---
    logger.info("Creating database tables …")
    Base.metadata.create_all(bind=engine)

    logger.info("Starting scheduler …")
    from scheduler import start_scheduler
    start_scheduler()

    yield

    # --- Shutdown ---
    logger.info("Stopping scheduler …")
    from scheduler import stop_scheduler
    stop_scheduler()


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="GravityPanel API",
    description="Social media management backend — scheduling, DM automation, analytics",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Electron / Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Mount routes
# ---------------------------------------------------------------------------

app.include_router(posts.router)
app.include_router(accounts.router)
app.include_router(analytics.router)
app.include_router(dm.router)
app.include_router(settings_routes.router)

# Serve uploaded video files
from config import DATA_DIR
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"app": "GravityPanel", "version": "1.0.0", "status": "running"}


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    import multiprocessing
    # Required for Windows PyInstaller multiprocessing compatibility
    multiprocessing.freeze_support()
    uvicorn.run(app, host="127.0.0.1", port=8000)
