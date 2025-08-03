#!/usr/bin/env python3
"""
Test script to verify OpenAI integration in the chat functionality
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_chat_api():
    """Test the chat API endpoint"""
    print("🧪 Testing OpenAI Chat Integration")
    print("=" * 50)
    
    # Test questions
    test_questions = [
        "What are the main trends in this data?",
        "Which variables have the strongest correlation?",
        "Are there any outliers or anomalies?",
        "What insights can help improve business outcomes?",
        "Can you summarize the key findings?"
    ]
    
    backend_url = "http://localhost:8000"
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n📝 Test {i}: {question}")
        
        try:
            response = requests.post(
                f"{backend_url}/api/chat",
                json={
                    "question": question,
                    "file_id": "test-file-123"
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success!")
                print(f"   Response: {data['response'][:100]}...")
                print(f"   Confidence: {data.get('confidence', 'unknown')}")
                print(f"   Sources: {data.get('sources', [])}")
                print(f"   Suggested Questions: {len(data.get('suggested_questions', []))}")
            else:
                print(f"❌ Failed with status {response.status_code}")
                print(f"   Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 OpenAI integration testing complete!")

def test_analysis_api():
    """Test the analysis API endpoint"""
    print("\n📊 Testing Analysis API")
    print("=" * 50)
    
    backend_url = "http://localhost:8000"
    
    try:
        # Test upload endpoint first
        print("📤 Testing file upload...")
        
        # Create a simple test CSV
        test_csv = """id,name,value,date
1,Test1,100,2024-01-01
2,Test2,200,2024-01-02
3,Test3,150,2024-01-03
4,Test4,300,2024-01-04
5,Test5,250,2024-01-05"""
        
        files = {'file': ('test_data.csv', test_csv, 'text/csv')}
        
        upload_response = requests.post(
            f"{backend_url}/api/upload",
            files=files,
            timeout=30
        )
        
        if upload_response.status_code == 200:
            upload_data = upload_response.json()
            file_id = upload_data['id']
            print(f"✅ Upload successful! File ID: {file_id}")
            
            # Test analyze endpoint
            print("🔍 Testing analysis...")
            analyze_response = requests.post(
                f"{backend_url}/api/analyze",
                files=files,
                timeout=30
            )
            
            if analyze_response.status_code == 200:
                analyze_data = analyze_response.json()
                print(f"✅ Analysis successful!")
                print(f"   Insights generated: {len(analyze_data.get('insights', []))}")
                print(f"   File ID: {analyze_data.get('file_id')}")
                
                # Test full analysis endpoint
                print("📋 Testing full analysis...")
                full_analysis_response = requests.get(
                    f"{backend_url}/api/analysis/{file_id}",
                    timeout=30
                )
                
                if full_analysis_response.status_code == 200:
                    full_data = full_analysis_response.json()
                    print(f"✅ Full analysis successful!")
                    print(f"   File info: {full_data.get('file_info', {}).get('original_filename')}")
                    print(f"   Data summary: {full_data.get('data_summary', {}).get('rows')} rows")
                    print(f"   Charts: {len(full_data.get('charts', []))}")
                else:
                    print(f"❌ Full analysis failed: {full_analysis_response.status_code}")
            else:
                print(f"❌ Analysis failed: {analyze_response.status_code}")
        else:
            print(f"❌ Upload failed: {upload_response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    """Main test function"""
    print("🚀 DatRep API Integration Tests")
    print("=" * 50)
    
    # Check if OpenAI API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not found in environment variables")
        print("   Chat functionality may not work properly")
    else:
        print("✅ OpenAI API key found")
    
    # Test analysis functionality
    test_analysis_api()
    
    # Test chat functionality
    test_chat_api()
    
    print("\n" + "=" * 50)
    print("🎉 All tests completed!")

if __name__ == "__main__":
    main() 