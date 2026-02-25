#!/usr/bin/env python3
"""Start backend (and optionally check env). Run from repo root: python scripts/start-dev.py"""

import os
import sys
import time
import subprocess
import signal
import requests
from pathlib import Path

# Load root .env so checks see OPENROUTER_API_KEY / OPENAI_API_KEY
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

class DatRepLauncher:
    def __init__(self):
        self.backend_process = None
        self.running = True
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        self.setup_environment()

    def setup_environment(self):
        print("DatRep dev launcher")
        print("=" * 50)
        if not Path("package.json").exists():
            print("Error: run from repo root (where package.json is)")
            sys.exit(1)
        if not os.getenv("OPENAI_API_KEY") and not os.getenv("OPENROUTER_API_KEY"):
            print("Set OPENROUTER_API_KEY or OPENAI_API_KEY in .env")
            sys.exit(1)
        os.environ.setdefault("BACKEND_URL", "http://localhost:8000")
        print("Env OK")

    def check_dependencies(self):
        try:
            import fastapi
            import uvicorn
            print("Python deps OK")
        except ImportError as e:
            print(f"Run: pip install -r backend/requirements.txt — {e}")
            return False
        if not Path("node_modules").exists():
            print("Run: npm install")
            return False
        return True

    def start_backend(self):
        print("Starting backend...")
        backend_dir = Path("backend")
        if not backend_dir.exists():
            print("Backend dir not found")
            return False
        self.backend_process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        time.sleep(3)
        try:
            r = requests.get("http://localhost:8000/health", timeout=5)
            if r.status_code == 200:
                print("Backend OK:", r.json())
                return True
        except Exception as e:
            print("Backend not responding:", e)
        return False

    def show_frontend_instructions(self):
        print("\n" + "=" * 50)
        print("In another terminal run: npm run dev")
        print("Frontend: http://localhost:3000  Backend: http://localhost:8000")
        print("Ctrl+C here stops the backend")
        print("=" * 50)

    def monitor_backend(self):
        while self.running:
            try:
                ok = False
                try:
                    ok = requests.get("http://localhost:8000/health", timeout=2).status_code == 200
                except Exception:
                    pass
                print(f"\rBackend {'OK' if ok else 'down'} | Ctrl+C to stop", end="")
                time.sleep(5)
            except KeyboardInterrupt:
                break

    def signal_handler(self, signum, frame):
        self.running = False
        self.cleanup()
        sys.exit(0)

    def cleanup(self):
        if self.backend_process:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=5)
            except Exception:
                self.backend_process.kill()

    def run(self):
        if not self.check_dependencies():
            return False
        if not self.start_backend():
            return False
        self.show_frontend_instructions()
        self.monitor_backend()
        self.cleanup()
        return True

if __name__ == "__main__":
    DatRepLauncher().run()
