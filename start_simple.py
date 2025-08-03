#!/usr/bin/env python3
"""
Simple DatRep Startup Script
Runs both frontend and backend servers
"""

import subprocess
import time
import sys
import signal
import os

def signal_handler(sig, frame):
    print('\n🛑 Shutting down DatRep...')
    sys.exit(0)

def main():
    print("🚀 Starting DatRep...")
    print("📊 Frontend: http://localhost:3000")
    print("🔧 Backend:  http://localhost:8000")
    print("Press Ctrl+C to stop")
    print("-" * 50)
    
    # Set up signal handler
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        # Start backend
        print("Starting backend...")
        backend_process = subprocess.Popen(
            ["python", "simple_server.py"],
            cwd="backend",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Give backend time to start
        time.sleep(3)
        
        # Start frontend
        print("Starting frontend...")
        frontend_process = subprocess.Popen(
            ["npm", "run", "dev"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        print("✅ Both services started!")
        print("🎉 DatRep is running!")
        
        # Keep running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print('\n🛑 Shutting down...')
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Cleanup
        try:
            if 'backend_process' in locals():
                backend_process.terminate()
            if 'frontend_process' in locals():
                frontend_process.terminate()
        except:
            pass
        print("✅ Shutdown complete")

if __name__ == "__main__":
    main() 