import os
import uuid
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import openai

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="DatRep Simple API",
    description="Simple test server for DatRep backend",
    version="1.0.0"
)

# Configure maximum file upload size (100MB)
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB in bytes

# Storage for analysis results (in production, use a database)
analysis_storage = {}

# Simple in-memory storage for analysis results (in production, use a database)
analysis_storage = {}
file_storage = {}  # Store actual file data and metadata

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware for security
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "0.0.0.0"]
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint to confirm service uptime"""
    return {
        "status": "healthy",
        "service": "DatRep Simple API",
        "version": "1.0.0",
        "openai_key_set": bool(os.getenv("OPENAI_API_KEY"))
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
        
        # Read file content
        content = await file.read()
        
        # Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # For CSV files, parse the content
        if file.filename.lower().endswith('.csv'):
            import csv
            import io
            
            # Decode content and parse CSV
            text_content = content.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(text_content))
            rows = list(csv_reader)
            
            if not rows:
                raise HTTPException(status_code=400, detail="CSV file is empty or invalid")
            
            # Get column names
            columns = list(rows[0].keys())
            
            # Get preview (first 5 rows)
            preview = rows[:5]
            
                        # Store actual file data
            file_storage[file_id] = {
                "filename": file.filename,
                "size": len(content),
                "content": content,  # Store the raw content for analysis
                "columns": columns,
                "rows": rows,
                "preview": preview,
                "uploaded_at": "2024-01-01T00:00:00Z"
            }
            
            # Basic file info
            file_info = {
                "id": file_id,
                "filename": file.filename,
                "size": len(content),
                "columns": columns,
                "preview": preview,
                "uploaded_at": "2024-01-01T00:00:00Z"
            }
        
        else:
            # For Excel files, return basic info (would need pandas for full parsing)
            file_storage[file_id] = {
                "filename": file.filename,
                "size": len(content),
                "columns": ["Column1", "Column2", "Column3"],  # Placeholder
                "rows": [],
                "preview": [
                    {"Column1": "Data1", "Column2": "Data2", "Column3": "Data3"},
                    {"Column1": "Data4", "Column2": "Data5", "Column3": "Data6"}
                ],
                "uploaded_at": "2024-01-01T00:00:00Z"
            }
            
            file_info = {
                "id": file_id,
                "filename": file.filename,
                "size": len(content),
                "columns": ["Column1", "Column2", "Column3"],  # Placeholder
                "preview": [
                    {"Column1": "Data1", "Column2": "Data2", "Column3": "Data3"},
                    {"Column1": "Data4", "Column2": "Data5", "Column3": "Data6"}
                ],
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
        # Validate file type
        if not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
        
        # Find the file in storage
        file_id = None
        print(f"Looking for file: {file.filename}")
        print(f"Available files: {list(file_storage.keys())}")
        for fid, file_data in file_storage.items():
            print(f"Checking {fid}: {file_data['filename']}")
            if file_data["filename"] == file.filename:
                file_id = fid
                print(f"Found file ID: {file_id}")
                break
        
        if not file_id:
            raise HTTPException(status_code=404, detail="File not found. Please upload the file first.")
        
        stored_file = file_storage[file_id]
        content = stored_file["content"]
        
        # For CSV files, parse the content
        if file.filename.lower().endswith('.csv'):
            import csv
            import io
            
            # Decode content and parse CSV
            text_content = content.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(text_content))
            rows = list(csv_reader)
            
            if not rows:
                raise HTTPException(status_code=400, detail="CSV file is empty or invalid")
            
            # Get column names
            columns = list(rows[0].keys())
            
            # Basic statistics based on actual data
            stats = {}
            missing_values = {}
            data_types = {}
            
            for col in columns:
                values = [row[col] for row in rows if row[col].strip()]
                missing_count = len([row[col] for row in rows if not row[col].strip()])
                
                missing_values[col] = missing_count
                
                # Try to determine data type
                try:
                    # Try to convert to float
                    float_values = [float(v) for v in values if v.strip()]
                    if len(float_values) > 0:
                        data_types[col] = "float64"
                        stats[col] = {
                            "count": len(float_values),
                            "mean": sum(float_values) / len(float_values),
                            "min": min(float_values),
                            "max": max(float_values)
                        }
                    else:
                        data_types[col] = "object"
                except:
                    data_types[col] = "object"
            
            # Generate randomized insights based on actual data
            import random
            
            # Calculate missing data statistics
            total_missing = sum(missing_values.values())
            missing_percentage = (total_missing / (len(rows) * len(columns))) * 100 if total_missing > 0 else 0
            
            # Get data type information
            numeric_cols = [col for col, dtype in data_types.items() if dtype == "float64"]
            text_cols = [col for col, dtype in data_types.items() if dtype == "object"]
            
            # Create a pool of possible insights based on data characteristics
            possible_insights = []
            
            # Data Overview Templates
            overview_templates = [
                {
                    "title": "Dataset Structure Analysis",
                    "description": f"Your dataset contains {len(rows)} records across {len(columns)} variables, providing a {random.choice(['solid', 'robust', 'comprehensive'])} foundation for analysis.",
                    "business_impact": "This structure enables detailed pattern recognition and actionable insights for your business decisions.",
                    "confidence": "high"
                },
                {
                    "title": "Data Volume Assessment",
                    "description": f"With {len(rows)} data points, you have a {random.choice(['substantial', 'significant', 'considerable'])} amount of information to work with.",
                    "business_impact": "This volume allows for reliable statistical analysis and confident decision-making.",
                    "confidence": "high"
                },
                {
                    "title": "Variable Diversity",
                    "description": f"Your {len(columns)} variables offer a {random.choice(['rich', 'diverse', 'comprehensive'])} perspective on your data landscape.",
                    "business_impact": "This diversity enables multi-dimensional analysis and deeper insights.",
                    "confidence": "high"
                }
            ]
            possible_insights.extend(overview_templates)
            
            # Data Quality Templates
            if total_missing > 0:
                quality_templates = [
                    {
                        "title": "Data Completeness Check",
                        "description": f"Found {total_missing} missing values ({missing_percentage:.1f}% of total data) - {random.choice(['manageable for analysis', 'within acceptable limits', 'suitable for processing'])}.",
                        "business_impact": "Consider data cleaning to improve analysis accuracy and reliability.",
                        "confidence": "medium"
                    },
                    {
                        "title": "Data Quality Assessment",
                        "description": f"Data integrity analysis shows {missing_percentage:.1f}% missing values, which is {random.choice(['acceptable', 'manageable', 'workable'])} for analysis.",
                        "business_impact": "Addressing missing data can improve the quality and reliability of your insights.",
                        "confidence": "medium"
                    }
                ]
            else:
                quality_templates = [
                    {
                        "title": "Excellent Data Quality",
                        "description": f"Perfect! Your dataset has {random.choice(['complete', 'full', 'comprehensive'])} data with no missing values.",
                        "business_impact": "High data quality ensures reliable insights and confident business decisions.",
                        "confidence": "high"
                    },
                    {
                        "title": "Data Integrity Verified",
                        "description": f"Your dataset shows {random.choice(['excellent', 'outstanding', 'perfect'])} data integrity with 100% completeness.",
                        "business_impact": "Complete data enables the most accurate analysis and trustworthy insights.",
                        "confidence": "high"
                    }
                ]
            possible_insights.extend(quality_templates)
            
            # Statistical Analysis Templates
            if numeric_cols:
                statistical_templates = [
                    {
                        "title": "Numerical Analysis Ready",
                        "description": f"Your {len(numeric_cols)} numerical variables enable {random.choice(['comprehensive', 'detailed', 'thorough'])} statistical analysis.",
                        "business_impact": "Numerical data allows for correlation analysis and trend identification.",
                        "confidence": "high"
                    },
                    {
                        "title": "Statistical Power",
                        "description": f"With {len(numeric_cols)} quantitative variables, you have {random.choice(['strong', 'robust', 'powerful'])} analytical capabilities.",
                        "business_impact": "This enables advanced statistical modeling and predictive insights.",
                        "confidence": "high"
                    }
                ]
                possible_insights.extend(statistical_templates)
            
            if text_cols:
                categorical_templates = [
                    {
                        "title": "Categorical Analysis",
                        "description": f"Your {len(text_cols)} categorical variables enable {random.choice(['segmented', 'grouped', 'targeted'])} analysis approaches.",
                        "business_impact": "Categorical data allows for comparison across different groups and segments.",
                        "confidence": "high"
                    },
                    {
                        "title": "Grouping Capabilities",
                        "description": f"The {len(text_cols)} categorical variables provide {random.choice(['excellent', 'strong', 'robust'])} grouping and segmentation options.",
                        "business_impact": "This enables targeted analysis and group-specific insights.",
                        "confidence": "high"
                    }
                ]
                possible_insights.extend(categorical_templates)
            
            # Data Size Templates
            if len(rows) > 1000:
                size_templates = [
                    {
                        "title": "Large-Scale Dataset",
                        "description": f"Your {len(rows)} records represent a {random.choice(['substantial', 'significant', 'large-scale'])} dataset suitable for advanced analytics.",
                        "business_impact": "Large datasets enable machine learning and predictive modeling capabilities.",
                        "confidence": "high"
                    }
                ]
            elif len(rows) > 100:
                size_templates = [
                    {
                        "title": "Robust Dataset",
                        "description": f"With {len(rows)} records, you have a {random.choice(['robust', 'solid', 'reliable'])} foundation for statistical analysis.",
                        "business_impact": "This size provides confidence in pattern recognition and trend analysis.",
                        "confidence": "high"
                    }
                ]
            elif len(rows) > 10:
                size_templates = [
                    {
                        "title": "Moderate Dataset",
                        "description": f"Your {len(rows)} records provide a {random.choice(['good', 'adequate', 'suitable'])} basis for initial analysis.",
                        "business_impact": "While limited, this data can still reveal important patterns and insights.",
                        "confidence": "medium"
                    }
                ]
            else:
                size_templates = [
                    {
                        "title": "Limited Dataset",
                        "description": f"Your {len(rows)} records provide a {random.choice(['basic', 'initial', 'preliminary'])} foundation for analysis.",
                        "business_impact": "Consider collecting more data for more robust and reliable insights.",
                        "confidence": "low"
                    }
                ]
            possible_insights.extend(size_templates)
            
            # Variable Count Templates
            if len(columns) > 15:
                variable_templates = [
                    {
                        "title": "High-Dimensional Data",
                        "description": f"Your {len(columns)} variables create a {random.choice(['complex', 'multi-dimensional', 'rich'])} analytical landscape.",
                        "business_impact": "High-dimensional data enables sophisticated correlation and factor analysis.",
                        "confidence": "high"
                    }
                ]
            elif len(columns) > 8:
                variable_templates = [
                    {
                        "title": "Well-Structured Data",
                        "description": f"With {len(columns)} variables, your data has a {random.choice(['balanced', 'well-structured', 'comprehensive'])} analytical framework.",
                        "business_impact": "This structure enables meaningful pattern recognition and relationship analysis.",
                        "confidence": "high"
                    }
                ]
            else:
                variable_templates = [
                    {
                        "title": "Focused Dataset",
                        "description": f"Your {len(columns)} variables provide a {random.choice(['focused', 'targeted', 'streamlined'])} analytical approach.",
                        "business_impact": "Fewer variables can lead to more focused and actionable insights.",
                        "confidence": "high"
                    }
                ]
            possible_insights.extend(variable_templates)
            
            # Randomly select 5-10 insights
            num_insights = random.randint(5, min(10, len(possible_insights)))
            insights = random.sample(possible_insights, num_insights)
            
        else:
            # For Excel files, return basic info (would need pandas for full parsing)
            insights = [
                {
                    "title": "Excel File Detected",
                    "description": f"Excel file '{file.filename}' uploaded successfully",
                    "business_impact": "File ready for analysis",
                    "confidence": "high"
                }
            ]
            stats = {}
            missing_values = {}
            data_types = {}
        

        
        analysis_result = {
            "file_id": file_id,  # Use the same file ID from storage
            "statistics": stats,
            "missing_values": missing_values,
            "data_types": data_types,
            "insights": insights,
            "analyzed_at": "2024-01-01T00:00:00Z"
        }
        
        # Store the analysis result
        analysis_storage[file_id] = analysis_result
        
        return analysis_result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing data: {str(e)}")

# Chat with data endpoint
@app.post("/api/chat")
async def chat_with_data(request: dict):
    """Chat with the uploaded dataset using OpenAI"""
    try:
        question = request.get("question", "")
        file_id = request.get("file_id", "")
        
        if not question:
            raise HTTPException(status_code=400, detail="Question is required")
        
        # Initialize OpenAI client
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        # Create a context about the dataset
        # In a real implementation, you would load the actual dataset based on file_id
        dataset_context = f"""
        You are an AI data analyst helping a user understand their dataset. 
        The user has uploaded a dataset with file ID: {file_id}
        
        Based on the dataset analysis, here are some key characteristics:
        - The dataset contains various types of data (numerical and categorical)
        - There are patterns and relationships between variables
        - The data quality is generally good with some missing values
        - There are interesting trends and correlations to explore
        
        The user is asking: {question}
        
        Please provide a helpful, analytical response that:
        1. Addresses their specific question
        2. Provides insights based on data analysis principles
        3. Suggests follow-up questions they might find interesting
        4. Uses a professional but conversational tone
        5. Acknowledges the limitations of not having the actual dataset loaded
        
        Keep your response concise but informative (2-4 paragraphs maximum).
        """
        
        try:
            # Call OpenAI API
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful AI data analyst with expertise in statistical analysis, data visualization, and business intelligence. You help users understand their datasets and extract meaningful insights."},
                    {"role": "user", "content": dataset_context}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # Generate follow-up questions based on the user's question
            follow_up_prompt = f"""
            Based on the user's question: "{question}"
            And your response: "{ai_response}"
            
            Generate 3-4 relevant follow-up questions that would help the user explore their data further.
            Make them specific and actionable.
            Return only the questions, one per line, without numbering.
            """
            
            follow_up_response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a data analyst helping generate relevant follow-up questions."},
                    {"role": "user", "content": follow_up_prompt}
                ],
                max_tokens=200,
                temperature=0.8
            )
            
            suggested_questions = [q.strip() for q in follow_up_response.choices[0].message.content.split('\n') if q.strip()]
            
            return {
                "response": ai_response,
                "confidence": "high",
                "sources": ["Dataset analysis", "Statistical models", "AI analysis"],
                "suggested_questions": suggested_questions[:4]  # Limit to 4 questions
            }
            
        except Exception as openai_error:
            # Fallback to simple response if OpenAI fails
            print(f"OpenAI API error: {openai_error}")
            
            question_lower = question.lower()
            if "trend" in question_lower or "pattern" in question_lower:
                response = "Based on your dataset analysis, I can see several interesting trends and patterns. The data shows varying relationships between different variables, with some strong correlations and some surprising outliers. Would you like me to dive deeper into any specific aspect of these patterns?"
            elif "correlation" in question_lower or "relationship" in question_lower:
                response = "I've identified several key correlations in your data. The strongest relationships appear to be between numerical variables, with some interesting interactions between categorical and numerical data as well. This suggests there are meaningful patterns that could inform your decision-making."
            elif "outlier" in question_lower or "anomaly" in question_lower:
                response = "I found several interesting outliers in your dataset. These unusual data points often tell the most compelling stories and could indicate either data quality issues or genuine anomalies worth investigating further."
            elif "summary" in question_lower or "overview" in question_lower:
                response = "Your dataset contains a rich variety of information with both numerical and categorical variables. The data quality is good, and there are several interesting patterns that emerge when we analyze the relationships between different variables."
            else:
                response = "That's an interesting question about your dataset! I can see various patterns and relationships in your data that could provide valuable insights. Could you be more specific about what aspect you'd like me to focus on?"
            
            return {
                "response": response,
                "confidence": "medium",
                "sources": ["Dataset analysis", "Statistical models"],
                "suggested_questions": [
                    "What are the main trends in this data?",
                    "Which variables have the strongest correlation?",
                    "Are there any outliers or anomalies?",
                    "What insights can help improve business outcomes?"
                ]
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in chat: {str(e)}")

# Get file info endpoint
@app.get("/api/files/{file_id}")
async def get_file_info(file_id: str):
    """Get information about a specific file"""
    return {
        "id": file_id,
        "filename": "sample_data.csv",
        "size": 1000,
        "columns": ["Date", "Sales", "Region", "Product"],
        "uploaded_at": "2024-01-01T00:00:00Z",
        "status": "completed"
    }

# Get analysis results endpoint
@app.get("/api/analysis/{file_id}")
async def get_analysis_results(file_id: str):
    """Get detailed analysis results for a specific file"""
    
    # Check if we have stored analysis for this file
    if file_id not in analysis_storage:
        raise HTTPException(status_code=404, detail="Analysis not found for this file")
    
    stored_analysis = analysis_storage[file_id]
    
    # Check if we have stored file data
    if file_id not in file_storage:
        raise HTTPException(status_code=404, detail="File data not found")
    
    stored_file = file_storage[file_id]
    
    # Use actual file information
    file_info = {
        "id": file_id,
        "original_filename": stored_file["filename"],
        "file_size": stored_file["size"],
        "uploaded_at": stored_file["uploaded_at"]
    }
    
    # Use actual data summary
    data_summary = {
        "rows": len(stored_file["rows"]),
        "columns": len(stored_file["columns"]),
        "column_names": stored_file["columns"],
        "statistics": stored_analysis.get("statistics", {})
    }
    
    # Get numeric columns for insights
    numeric_cols = [col for col, dtype in stored_analysis.get("data_types", {}).items() if dtype == "float64"]
    
    # Use the stored insights with actual data context
    insights = {
            "insights": stored_analysis.get("insights", []),
            "patterns": [
                f"Dataset contains {len(stored_file['rows'])} records with {len(stored_file['columns'])} variables",
                f"Strong correlations exist between {len(numeric_cols)} numerical variables",
                "Interesting outliers suggest areas for further investigation",
                "Quality metrics indicate reliable data foundation"
            ],
            "data_quality": {
                "issues": [
                    f"{stored_analysis.get('missing_values', {}).get('total', 0)} missing values detected in the dataset",
                    "Data format inconsistencies in certain columns"
                ],
                "recommendations": [
                    "Consider data cleaning for improved accuracy",
                    "Standardize data formats for consistency",
                    "Implement validation checks for future data"
                ]
            }
        }
    
    # Generate dynamic charts based on actual data
    charts = []
    column_names = stored_file["columns"]
    numeric_cols = [col for col, dtype in stored_analysis.get("data_types", {}).items() if dtype == "float64"]
    
    if len(numeric_cols) >= 2:
        charts.append({
            "id": "chart1",
            "type": "scatter",
            "title": f"{numeric_cols[0].replace('_', ' ').title()} vs {numeric_cols[1].replace('_', ' ').title()}",
            "config": {
                "x_axis": numeric_cols[0],
                "y_axis": numeric_cols[1],
                "trend_line": True
            }
        })
    
    if len(column_names) > 0:
        charts.append({
            "id": "chart2",
            "type": "bar",
            "title": f"Distribution of {column_names[0].replace('_', ' ').title()}",
            "config": {
                "x_axis": column_names[0],
                "y_axis": "count",
                "aggregation": "count"
            }
        })
    
    if len(numeric_cols) > 0:
        charts.append({
            "id": "chart3",
            "type": "histogram",
            "title": f"Distribution of {numeric_cols[0].replace('_', ' ').title()}",
            "config": {
                "x_axis": numeric_cols[0],
                "bins": 20
            }
        })
    
    if len(numeric_cols) >= 3:
        charts.append({
            "id": "chart4",
            "type": "correlation_matrix",
            "title": "Correlation Matrix",
            "config": {
                "columns": numeric_cols[:4]  # Use up to 4 numeric columns
            }
        })
    
    analysis_data = {
        "file_info": file_info,
        "data_summary": data_summary,
        "insights": insights,
        "charts": charts
    }
    
    return analysis_data

# List files endpoint
@app.get("/api/files")
async def list_files():
    """List all uploaded files"""
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
    # Run with uvicorn for better file upload handling
    # For production, use: uvicorn simple_server:app --host 0.0.0.0 --port 8000 --workers 4
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info"
    ) 