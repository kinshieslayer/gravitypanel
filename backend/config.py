import os
import sys

def get_data_dir() -> str:
    """Return the absolute path strictly intended for app data (writable)."""
    if getattr(sys, 'frozen', False):
        # We are running as a PyInstaller bundle
        app_data = os.getenv('APPDATA') or os.path.expanduser('~')
        return os.path.join(app_data, 'GravityPanel', 'data')
    else:
        # Development mode
        return os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

DATA_DIR = get_data_dir()
os.makedirs(DATA_DIR, exist_ok=True)
