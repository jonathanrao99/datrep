import requests
import time
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_backend_health():
    """Test if the backend is running and healthy"""
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend Health Check:")
            print(f"   Status: {data.get('status')}")
            print(f"   Service: {data.get('service')}")
            print(f"   OpenAI Key Set: {data.get('openai_key_set')}")
            return True
        else:
            print(f"❌ Backend Health Check Failed: Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend Health Check Failed: {e}")
        return False

def test_frontend_health():
    """Test if the frontend is running"""
    try:
        response = requests.get("http://localhost:3000")
        if response.status_code == 200:
            print("✅ Frontend Health Check:")
            print(f"   Status: {response.status_code}")
            print(f"   Content Length: {len(response.content)} bytes")
            return True
        else:
            print(f"❌ Frontend Health Check Failed: Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend Health Check Failed: {e}")
        return False

def test_file_upload():
    """Test file upload functionality"""
    try:
        # Create a test CSV file
        test_csv_content = """Date,Sales,Region,Product
2024-01-01,1500.50,North,Laptop
2024-01-02,2200.75,South,Phone
2024-01-03,1800.25,East,Tablet"""
        
        with open("test_upload.csv", "w") as f:
            f.write(test_csv_content)
        
        # Test upload
        with open("test_upload.csv", "rb") as f:
            files = {"file": ("test_upload.csv", f, "text/csv")}
            response = requests.post("http://localhost:8000/api/upload", files=files)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ File Upload Test:")
            print(f"   Success: {data.get('success')}")
            print(f"   File ID: {data.get('file_id')}")
            print(f"   Message: {data.get('message')}")
            
            # Clean up test file
            os.remove("test_upload.csv")
            return True
        else:
            print(f"❌ File Upload Test Failed: Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ File Upload Test Failed: {e}")
        return False

def test_data_analysis():
    """Test data analysis functionality"""
    try:
        # First upload a file
        test_csv_content = """Date,Sales,Region,Product
2024-01-01,1500.50,North,Laptop
2024-01-02,2200.75,South,Phone
2024-01-03,1800.25,East,Tablet"""
        
        with open("test_analysis.csv", "w") as f:
            f.write(test_csv_content)
        
        # Upload file
        with open("test_analysis.csv", "rb") as f:
            files = {"file": ("test_analysis.csv", f, "text/csv")}
            upload_response = requests.post("http://localhost:8000/api/upload", files=files)
        
        if upload_response.status_code != 200:
            print("❌ Data Analysis Test Failed: Could not upload file")
            return False
        
        upload_data = upload_response.json()
        file_id = upload_data.get('file_id')
        
        # Test analysis
        analysis_response = requests.post(
            "http://localhost:8000/api/analyze",
            json={"file_id": file_id}
        )
        
        if analysis_response.status_code == 200:
            data = analysis_response.json()
            print("✅ Data Analysis Test:")
            print(f"   Success: {data.get('success')}")
            print(f"   Analysis ID: {data.get('analysis_id')}")
            print(f"   Message: {data.get('message')}")
            
            # Clean up test file
            os.remove("test_analysis.csv")
            return True
        else:
            print(f"❌ Data Analysis Test Failed: Status {analysis_response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Data Analysis Test Failed: {e}")
        return False

def main():
    print("🧪 DatRep Integration Test")
    print("=" * 50)
    
    # Wait for services to be ready
    print("⏳ Waiting for services to start...")
    time.sleep(3)
    
    # Test backend
    backend_ok = test_backend_health()
    
    # Test frontend
    frontend_ok = test_frontend_health()
    
    # Test file upload
    upload_ok = test_file_upload()
    
    # Test data analysis
    analysis_ok = test_data_analysis()
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Integration Test Summary:")
    print(f"   Backend Health: {'✅' if backend_ok else '❌'}")
    print(f"   Frontend Health: {'✅' if frontend_ok else '❌'}")
    print(f"   File Upload: {'✅' if upload_ok else '❌'}")
    print(f"   Data Analysis: {'✅' if analysis_ok else '❌'}")
    
    all_tests = backend_ok and frontend_ok and upload_ok and analysis_ok
    
    if all_tests:
        print("\n🎉 SUCCESS! DatRep is fully functional!")
        print("\n🔗 Access Points:")
        print("   📱 Frontend: http://localhost:3000")
        print("   🔧 Backend API: http://localhost:8000")
        print("   📚 API Docs: http://localhost:8000/docs")
        print("   🔍 Health Check: http://localhost:8000/health")
        
        print("\n🚀 Next Steps:")
        print("   1. Open http://localhost:3000 in your browser")
        print("   2. Try uploading a CSV or Excel file")
        print("   3. View the generated insights and charts")
        print("   4. Test the 'Chat with Data' feature")
        
    else:
        print("\n❌ Some tests failed. Check the service logs.")
        if not backend_ok:
            print("   - Backend server may not be running")
        if not frontend_ok:
            print("   - Frontend server may not be running")
        if not upload_ok:
            print("   - File upload functionality needs attention")
        if not analysis_ok:
            print("   - Data analysis functionality needs attention")

if __name__ == "__main__":
    main() 