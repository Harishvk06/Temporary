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

def is_running_under_streamlit() -> bool:
    """Check if the current script is being executed by Streamlit runner"""
    try:
        from streamlit.runtime.scriptrunner import get_script_run_ctx
        if get_script_run_ctx() is not None:
            return True
    except Exception:
        pass
    if "streamlit" in sys.modules:
        if any("streamlit" in str(arg).lower() for arg in sys.argv):
            return True
    return False

if __name__ == "__main__":
    if is_running_under_streamlit():
        # Executed by Streamlit Cloud runner -> render Streamlit Studio UI
        import streamlit_app
    else:
        # Executed directly via standard Python CLI -> start Uvicorn server
        import uvicorn
        is_main = threading.current_thread() is threading.main_thread()
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=is_main)
