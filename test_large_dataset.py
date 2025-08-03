#!/usr/bin/env python3
"""
Test with a larger dataset to verify the fix works with realistic data
"""

import requests
import json
import random

def test_large_dataset():
    """Test upload and analysis with a larger dataset"""
    print("🧪 Testing Large Dataset Upload and Analysis")
    print("=" * 50)
    
    backend_url = "http://localhost:8000"
    
    # Create a larger test CSV with more realistic data
    headers = "id,name,age,salary,department,experience,performance_rating,projects_completed,training_hours,attendance_rate\n"
    
    # Generate 100 rows of data
    rows = []
    for i in range(1, 101):
        row = f"{i},Employee{i},{random.randint(22, 65)},{random.randint(30000, 120000)},"
        row += f"{random.choice(['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'])},"
        row += f"{random.randint(1, 20)},{random.uniform(3.0, 5.0):.1f},"
        row += f"{random.randint(1, 50)},{random.randint(0, 200)},{random.uniform(80.0, 100.0):.1f}"
        rows.append(row)
    
    test_csv = headers + "\n".join(rows)
    
    files = {'file': ('large_dataset.csv', test_csv, 'text/csv')}
    
    try:
        # Step 1: Upload file
        print("📤 Step 1: Uploading large dataset...")
        upload_response = requests.post(
            f"{backend_url}/api/upload",
            files=files,
            timeout=30
        )
        
        if upload_response.status_code == 200:
            upload_data = upload_response.json()
            file_id = upload_data['id']
            print(f"✅ Upload successful! File ID: {file_id}")
            print(f"   Filename: {upload_data['filename']}")
            print(f"   Size: {upload_data['size']} bytes")
            print(f"   Columns: {len(upload_data['columns'])}")
            
            # Step 2: Analyze the same file
            print("\n🔍 Step 2: Analyzing large dataset...")
            analyze_response = requests.post(
                f"{backend_url}/api/analyze",
                files=files,
                timeout=30
            )
            
            if analyze_response.status_code == 200:
                analyze_data = analyze_response.json()
                print(f"✅ Analysis successful!")
                print(f"   File ID: {analyze_data.get('file_id')}")
                print(f"   Insights: {len(analyze_data.get('insights', []))}")
                
                # Step 3: Get full analysis
                print("\n📋 Step 3: Getting full analysis...")
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
                    
                    # Verify the data is correct
                    if full_data.get('data_summary', {}).get('rows') == 100:
                        print("✅ Row count is correct (100 rows)")
                    else:
                        print(f"❌ Row count is wrong: {full_data.get('data_summary', {}).get('rows')}")
                    
                    if full_data.get('file_info', {}).get('original_filename') == 'large_dataset.csv':
                        print("✅ Filename is correct")
                    else:
                        print(f"❌ Filename is wrong: {full_data.get('file_info', {}).get('original_filename')}")
                    
                    # Test chat functionality
                    print("\n💬 Step 4: Testing chat functionality...")
                    chat_response = requests.post(
                        f"{backend_url}/api/chat",
                        json={
                            "question": "What are the main trends in this employee data?",
                            "file_id": file_id
                        },
                        timeout=30
                    )
                    
                    if chat_response.status_code == 200:
                        chat_data = chat_response.json()
                        print(f"✅ Chat successful!")
                        print(f"   Response length: {len(chat_data.get('response', ''))} characters")
                        print(f"   Suggested questions: {len(chat_data.get('suggested_questions', []))}")
                    else:
                        print(f"❌ Chat failed: {chat_response.status_code}")
                        
                else:
                    print(f"❌ Full analysis failed: {full_analysis_response.status_code}")
                    print(f"   Error: {full_analysis_response.text}")
            else:
                print(f"❌ Analysis failed: {analyze_response.status_code}")
                print(f"   Error: {analyze_response.text}")
        else:
            print(f"❌ Upload failed: {upload_response.status_code}")
            print(f"   Error: {upload_response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_large_dataset() 