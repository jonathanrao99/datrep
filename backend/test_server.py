import os
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import json
from typing import List, Dict, Any

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="DatRep API Test",
    description="Test server for DatRep backend",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint to confirm service uptime"""
    return {
        "status": "healthy",
        "service": "DatRep API Test",
        "version": "1.0.0",
        "openai_key_set": bool(os.getenv("OPENAI_API_KEY"))
    }

# Test endpoint
@app.get("/test")
async def test_endpoint():
    """Test endpoint"""
    return {
        "message": "DatRep backend is working!",
        "timestamp": "2024-01-01T00:00:00Z"
    }

# File upload endpoint
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a CSV or Excel file and return preview"""
    try:
        # Validate file type
        if not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
        
        # Generate file ID
        file_id = str(uuid.uuid4())
        
        # Mock preview data (in real implementation, this would parse the file)
        preview = [
            {"Date": "2024-01-01", "Sales": 1500.50, "Region": "North", "Product": "Laptop"},
            {"Date": "2024-01-02", "Sales": 2200.75, "Region": "South", "Product": "Phone"},
            {"Date": "2024-01-03", "Sales": 1800.25, "Region": "East", "Product": "Tablet"},
            {"Date": "2024-01-04", "Sales": 3100.00, "Region": "West", "Product": "Laptop"},
            {"Date": "2024-01-05", "Sales": 1200.50, "Region": "North", "Product": "Phone"}
        ]
        
        # Basic file info
        file_info = {
            "id": file_id,
            "filename": file.filename,
            "size": 1000,  # Mock size
            "columns": ["Date", "Sales", "Region", "Product"],
            "preview": preview,
            "uploaded_at": "2024-01-01T00:00:00Z"
        }
        
        return file_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

# Data analysis endpoint
@app.post("/api/analyze")
async def analyze_data(file: UploadFile = File(...)):
    """Analyze uploaded data and return insights"""
    try:
        # Mock analysis (in real implementation, this would parse and analyze the file)
        stats = {
            "Sales": {
                "count": 1000.0,
                "mean": 2500.0,
                "std": 500.0,
                "min": 1000.0,
                "25%": 2000.0,
                "50%": 2500.0,
                "75%": 3000.0,
                "max": 4000.0
            }
        }
        
        missing_values = {"Date": 0, "Sales": 5, "Region": 0, "Product": 0}
        data_types = {"Date": "object", "Sales": "float64", "Region": "object", "Product": "object"}
        
        # Mock insights (in real implementation, this would use OpenAI)
        insights = [
            {
                "title": "Data Overview",
                "description": "Dataset contains 1000 rows and 4 columns",
                "business_impact": "Provides a comprehensive view of your data structure",
                "confidence": "high"
            },
            {
                "title": "Missing Data Analysis",
                "description": "Found 5 missing values in the Sales column",
                "business_impact": "Missing data may affect analysis accuracy",
                "confidence": "medium"
            },
            {
                "title": "Data Types",
                "description": "Columns include: object, float64",
                "business_impact": "Understanding data types helps in proper analysis",
                "confidence": "high"
            }
        ]
        
        analysis_result = {
            "file_id": str(uuid.uuid4()),
            "statistics": stats,
            "missing_values": missing_values,
            "data_types": data_types,
            "insights": insights,
            "analyzed_at": "2024-01-01T00:00:00Z"
        }
        
        return analysis_result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing data: {str(e)}")

# Get file info endpoint
@app.get("/api/files/{file_id}")
async def get_file_info(file_id: str):
    """Get information about a specific file"""
    # Mock response - in real implementation, this would query a database
    return {
        "id": file_id,
        "filename": "sample_data.csv",
        "size": 1000,
        "columns": ["Date", "Sales", "Region", "Product"],
        "uploaded_at": "2024-01-01T00:00:00Z",
        "status": "completed"
    }

# List files endpoint
@app.get("/api/files")
async def list_files():
    """List all uploaded files"""
    # Mock response - in real implementation, this would query a database
    return [
        {
            "id": "1",
            "filename": "sales_data_2024.csv",
            "size": 1500,
            "uploaded_at": "2024-01-01T10:30:00Z",
            "status": "completed"
        },
        {
            "id": "2", 
            "filename": "customer_data.xlsx",
            "size": 800,
            "uploaded_at": "2024-01-01T11:15:00Z",
            "status": "completed"
        }
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 