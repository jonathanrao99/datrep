#!/usr/bin/env python3
"""
Test script to verify large file upload functionality
"""

import requests
import os
import tempfile
import time

def create_test_file(size_mb=50):
    """Create a test CSV file of specified size"""
    print(f"Creating test file of {size_mb}MB...")
    
    # Create a temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        # Write header
        f.write("id,name,value,date\n")
        
        # Calculate how many rows we need for the target size
        # Each row is approximately 50 bytes
        target_bytes = size_mb * 1024 * 1024
        rows_needed = target_bytes // 50
        
        # Write data rows
        for i in range(rows_needed):
            f.write(f"{i},Test Item {i},{i * 1.5},2024-01-01\n")
        
        filename = f.name
    
    print(f"Created test file: {filename}")
    return filename

def test_upload(filename, backend_url="http://localhost:8000"):
    """Test file upload to backend"""
    print(f"Testing upload to {backend_url}...")
    
    try:
        with open(filename, 'rb') as f:
            files = {'file': f}
            start_time = time.time()
            
            response = requests.post(
                f"{backend_url}/api/upload",
                files=files,
                timeout=300  # 5 minutes timeout
            )
            
            end_time = time.time()
            upload_time = end_time - start_time
            
            print(f"Upload completed in {upload_time:.2f} seconds")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Upload successful!")
                print(f"   File ID: {data.get('id')}")
                print(f"   Filename: {data.get('filename')}")
                print(f"   Size: {data.get('size')} bytes")
                print(f"   Columns: {len(data.get('columns', []))}")
                return True
            else:
                print(f"❌ Upload failed with status {response.status_code}")
                print(f"   Error: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return False

def main():
    print("=" * 50)
    print("🧪 Testing Large File Upload Functionality")
    print("=" * 50)
    
    # Test different file sizes
    test_sizes = [10, 25, 50, 75, 100]  # MB
    
    for size in test_sizes:
        print(f"\n📁 Testing {size}MB file upload...")
        
        # Create test file
        filename = create_test_file(size)
        
        try:
            # Test upload
            success = test_upload(filename)
            
            if success:
                print(f"✅ {size}MB upload test PASSED")
            else:
                print(f"❌ {size}MB upload test FAILED")
                break
                
        finally:
            # Clean up test file
            try:
                os.unlink(filename)
                print(f"🗑️  Cleaned up test file")
            except:
                pass
    
    print("\n" + "=" * 50)
    print("🏁 Large file upload testing complete!")
    print("=" * 50)

if __name__ == "__main__":
    main() 