import requests
import json

# Test the health endpoint
def test_health():
    try:
        response = requests.get("http://localhost:8000/health")
        print("✅ Health Check:")
        print(json.dumps(response.json(), indent=2))
        return True
    except Exception as e:
        print(f"❌ Health Check Failed: {e}")
        return False

# Test the test endpoint
def test_endpoint():
    try:
        response = requests.get("http://localhost:8000/test")
        print("\n✅ Test Endpoint:")
        print(json.dumps(response.json(), indent=2))
        return True
    except Exception as e:
        print(f"❌ Test Endpoint Failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing DatRep Backend API...\n")
    
    # Test health endpoint
    health_ok = test_health()
    
    # Test test endpoint
    test_ok = test_endpoint()
    
    if health_ok and test_ok:
        print("\n🎉 All tests passed! Backend is working correctly.")
    else:
        print("\n❌ Some tests failed. Check the server logs.") 