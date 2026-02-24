#!/usr/bin/env python3
"""
DatRep Unified Startup Script
Starts the backend server and provides instructions for frontend startup.
"""

import os
import sys
import time
import subprocess
import signal
import requests
from pathlib import Path

class DatRepLauncher:
    def __init__(self):
        self.backend_process = None
        self.running = True
        
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        # Environment setup
        self.setup_environment()
    
    def setup_environment(self):
        """Set up environment variables and check prerequisites"""
        print("🚀 DatRep Unified Launcher")
        print("=" * 50)
        
        # Check if we're in the right directory
        if not Path("package.json").exists():
            print("❌ Error: package.json not found. Please run this script from the DatRep root directory.")
            sys.exit(1)
        
        # Require OpenAI API key from environment/.env (never hardcode secrets)
        if not os.getenv("OPENAI_API_KEY"):
            print("❌ OPENAI_API_KEY is not set.")
            print("💡 Add OPENAI_API_KEY to backend/.env or your shell environment.")
            sys.exit(1)
        
        # Set backend URL
        os.environ["BACKEND_URL"] = "http://localhost:8000"
        print("✅ Environment configured")
    
    def check_dependencies(self):
        """Check if required dependencies are installed"""
        print("\n🔍 Checking dependencies...")
        
        # Check Python dependencies
        try:
            import fastapi
            import uvicorn
            import pandas
            import openai
            print("✅ Python dependencies found")
        except ImportError as e:
            print(f"❌ Missing Python dependency: {e}")
            print("💡 Run: pip install -r backend/requirements.txt")
            return False
        
        # Check Node.js dependencies
        if not Path("node_modules").exists():
            print("❌ Node.js dependencies not installed")
            print("💡 Run: npm install")
            return False
        
        print("✅ All dependencies found")
        return True
    
    def start_backend(self):
        """Start the FastAPI backend server"""
        print("\n🐍 Starting backend server...")
        
        try:
            # Change to backend directory
            backend_dir = Path("backend")
            if not backend_dir.exists():
                print("❌ Backend directory not found")
                return False
            
            # Start the backend server
            self.backend_process = subprocess.Popen(
                [sys.executable, "simple_server.py"],
                cwd=backend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait a moment for server to start
            time.sleep(3)
            
            # Check if backend is running
            try:
                response = requests.get("http://localhost:8000/health", timeout=5)
                if response.status_code == 200:
                    print("✅ Backend server started successfully")
                    print(f"   📊 Health: {response.json()}")
                    return True
                else:
                    print(f"❌ Backend health check failed: {response.status_code}")
                    return False
            except requests.exceptions.RequestException as e:
                print(f"❌ Backend not responding: {e}")
                return False
                
        except Exception as e:
            print(f"❌ Failed to start backend: {e}")
            return False
    
    def show_frontend_instructions(self):
        """Show instructions for starting the frontend"""
        print("\n" + "=" * 50)
        print("🌐 Frontend Startup Instructions")
        print("=" * 50)
        print("The backend is now running! To start the frontend:")
        print()
        print("1. Open a NEW terminal window")
        print("2. Navigate to the DatRep directory")
        print("3. Run one of these commands:")
        print()
        print("   npm run dev")
        print("   # OR")
        print("   yarn dev")
        print("   # OR")
        print("   pnpm dev")
        print()
        print("4. The frontend will start on http://localhost:3000")
        print("   (or http://localhost:3001 if port 3000 is busy)")
        print()
        print("💡 Keep this terminal open to monitor the backend")
        print("💡 Press Ctrl+C in this terminal to stop the backend")
        print("=" * 50)
    
    def monitor_backend(self):
        """Monitor the backend server"""
        print("\n👀 Monitoring backend server...")
        
        while self.running:
            try:
                # Check backend
                backend_ok = False
                try:
                    response = requests.get("http://localhost:8000/health", timeout=2)
                    backend_ok = response.status_code == 200
                except:
                    pass
                
                # Display status
                backend_status = "✅" if backend_ok else "❌"
                print(f"\r{backend_status} Backend running | Press Ctrl+C to stop", end="")
                
                time.sleep(5)
                
            except KeyboardInterrupt:
                break
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        print("\n\n🛑 Shutting down DatRep backend...")
        self.running = False
        self.cleanup()
        sys.exit(0)
    
    def cleanup(self):
        """Clean up processes"""
        print("🧹 Cleaning up processes...")
        
        if self.backend_process:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=5)
                print("✅ Backend stopped")
            except:
                self.backend_process.kill()
                print("⚠️  Backend force-killed")
    
    def run(self):
        """Main launcher function"""
        try:
            # Check dependencies
            if not self.check_dependencies():
                print("\n❌ Dependencies check failed. Please install missing dependencies.")
                return False
            
            # Start backend
            if not self.start_backend():
                print("\n❌ Failed to start backend server.")
                return False
            
            # Show frontend instructions
            self.show_frontend_instructions()
            
            # Monitor backend
            self.monitor_backend()
            
        except KeyboardInterrupt:
            print("\n🛑 Shutting down...")
        except Exception as e:
            print(f"\n❌ Unexpected error: {e}")
        finally:
            self.cleanup()
        
        return True

def main():
    """Main entry point"""
    launcher = DatRepLauncher()
    launcher.run()

if __name__ == "__main__":
    main() 