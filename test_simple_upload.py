#!/usr/bin/env python3
"""
Simple test to verify upload and analysis work correctly
"""

import requests
import json

def test_upload_and_analyze():
    """Test upload and analysis with the same file"""
    print("🧪 Testing Upload and Analysis")
    print("=" * 50)
    
    backend_url = "http://localhost:8000"
    
    # Create a simple test CSV
    test_csv = """id,name,value,date
1,Test1,100,2024-01-01
2,Test2,200,2024-01-02
3,Test3,150,2024-01-03
4,Test4,300,2024-01-04
5,Test5,250,2024-01-05"""
    
    files = {'file': ('test_data.csv', test_csv, 'text/csv')}
    
    try:
        # Step 1: Upload file
        print("📤 Step 1: Uploading file...")
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
            print("\n🔍 Step 2: Analyzing file...")
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
                    if full_data.get('data_summary', {}).get('rows') == 5:
                        print("✅ Row count is correct (5 rows)")
                    else:
                        print(f"❌ Row count is wrong: {full_data.get('data_summary', {}).get('rows')}")
                    
                    if full_data.get('file_info', {}).get('original_filename') == 'test_data.csv':
                        print("✅ Filename is correct")
                    else:
                        print(f"❌ Filename is wrong: {full_data.get('file_info', {}).get('original_filename')}")
                        
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
    test_upload_and_analyze() 