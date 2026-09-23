import sys
import os
import threading
from pathlib import Path

# Ensure paths are configured
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.utils.utf8_utils import init_utf8_environment
init_utf8_environment()

if __name__ == "__main__":
    import uvicorn
    is_main = threading.current_thread() is threading.main_thread()
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=is_main)
