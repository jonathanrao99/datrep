#!/usr/bin/env python3
"""
DatRep Startup Script
Runs both frontend and backend servers with error handling and health checks
"""

import subprocess
import time
import requests
import sys
import os
import signal
import threading
from pathlib import Path

class DatRepStartup:
    def __init__(self):
        self.frontend_process = None
        self.backend_process = None
        self.running = True
        
    def check_backend_health(self):
        """Check if backend is healthy"""
        try:
            response = requests.get("http://localhost:8000/health", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def check_frontend_health(self):
        """Check if frontend is healthy"""
        try:
            response = requests.get("http://localhost:3000", timeout=5)
            return response.status_code == 200
        except requests.exceptions.ConnectionError:
            return False
        except Exception:
            return False
    
    def start_backend(self):
        """Start the backend server"""
        print("🚀 Starting DatRep Backend...")
        
        # Change to backend directory
        backend_dir = Path("backend")
        if not backend_dir.exists():
            print("❌ Backend directory not found!")
            return False
        
        try:
            # Start the backend server with uvicorn for better file upload handling
            self.backend_process = subprocess.Popen(
                ["uvicorn", "simple_server:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
                cwd=backend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for backend to start
            print("⏳ Waiting for backend to start...")
            for i in range(30):  # Wait up to 30 seconds
                if self.check_backend_health():
                    print("✅ Backend is running on http://localhost:8000")
                    return True
                time.sleep(1)
                if i % 5 == 0:
                    print(f"   Still waiting... ({i+1}/30)")
            
            print("❌ Backend failed to start within 30 seconds")
            return False
            
        except Exception as e:
            print(f"❌ Failed to start backend: {e}")
            return False
    
    def start_frontend(self):
        """Start the frontend server"""
        print("🚀 Starting DatRep Frontend...")
        
        try:
            # Check if node_modules exists
            if not Path("node_modules").exists():
                print("📦 Installing frontend dependencies...")
                subprocess.run(["npm", "install"], check=True)
            
            # Start the frontend server
            self.frontend_process = subprocess.Popen(
                ["npm", "run", "dev"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            # Wait for frontend to start
            print("⏳ Waiting for frontend to start...")
            for i in range(30):  # Wait up to 30 seconds
                if self.check_frontend_health():
                    print("✅ Frontend is running on http://localhost:3000")
                    return True
                time.sleep(1)
                if i % 5 == 0:
                    print(f"   Still waiting... ({i+1}/30)")
            
            print("❌ Frontend failed to start within 30 seconds")
            return False
            
        except Exception as e:
            print(f"❌ Failed to start frontend: {e}")
            return False
    
    def run_health_checks(self):
        """Run continuous health checks"""
        while self.running:
            try:
                backend_ok = self.check_backend_health()
                frontend_ok = self.check_frontend_health()
                
                if not backend_ok:
                    print("⚠️  Backend health check failed")
                if not frontend_ok:
                    print("⚠️  Frontend health check failed")
                
                time.sleep(30)  # Check every 30 seconds
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Health check error: {e}")
                time.sleep(30)
    
    def cleanup(self):
        """Clean up processes on exit"""
        print("\n🛑 Shutting down DatRep...")
        self.running = False
        
        if self.backend_process:
            print("   Stopping backend...")
            self.backend_process.terminate()
            try:
                self.backend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.backend_process.kill()
        
        if self.frontend_process:
            print("   Stopping frontend...")
            self.frontend_process.terminate()
            try:
                self.frontend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.frontend_process.kill()
        
        print("✅ DatRep shutdown complete")
    
    def run(self):
        """Main startup sequence"""
        print("=" * 50)
        print("🚀 DatRep Startup Script")
        print("=" * 50)
        
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, lambda s, f: self.cleanup())
        signal.signal(signal.SIGTERM, lambda s, f: self.cleanup())
        
        try:
            # Start backend
            if not self.start_backend():
                print("❌ Backend startup failed. Exiting.")
                return False
            
            # Start frontend
            if not self.start_frontend():
                print("❌ Frontend startup failed. Exiting.")
                return False
            
            print("\n" + "=" * 50)
            print("🎉 DatRep is now running!")
            print("=" * 50)
            print("📊 Frontend: http://localhost:3000")
            print("🔧 Backend:  http://localhost:8000")
            print("📖 API Docs: http://localhost:8000/docs")
            print("\nPress Ctrl+C to stop all services")
            print("=" * 50)
            
            # Start health monitoring in background
            health_thread = threading.Thread(target=self.run_health_checks, daemon=True)
            health_thread.start()
            
            # Keep main thread alive
            while self.running:
                time.sleep(1)
                
        except KeyboardInterrupt:
            pass
        finally:
            self.cleanup()
        
        return True

def main():
    """Main entry point"""
    startup = DatRepStartup()
    success = startup.run()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 