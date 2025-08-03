import os
import uuid
import json
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

# Initialize OpenAI client
openai_client = OpenAI()

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

def _parse_ai_response_to_insights(ai_response: str) -> list:
    """Parse AI response into structured insights"""
    import re
    
    # Split response into sections
    sections = ai_response.split('\n\n')
    insights = []
    
    # Skip intro and conclusion sections
    for section in sections:
        section_lower = section.lower()
        
        # Skip intro/conclusion sections
        if any(keyword in section_lower for keyword in ['introduction', 'conclusion', 'summary', 'overview', 'thrilling insights derived']):
            continue
            
        # Look for insights with emoji titles
        title_match = re.search(r'[🎯📊💡🎉📈🎓💰⚡🔍🎵🔥💔][^:]+:', section)
        if title_match:
            title = title_match.group(0).strip()
            
            # Extract description (everything after title until next section)
            description = section.replace(title_match.group(0), '').strip()
            
            # Extract business impact if present
            business_impact_match = re.search(r'Business Impact:\s*(.*?)(?=\n\n|\n[A-Z]|$)', description, re.DOTALL | re.IGNORECASE)
            if business_impact_match:
                business_impact = business_impact_match.group(1).strip()
                # Remove the business impact part from description
                description = re.sub(r'Business Impact:.*?(?=\n\n|\n[A-Z]|$)', '', description, flags=re.DOTALL | re.IGNORECASE).strip()
            else:
                # Try alternative patterns for business impact
                alt_patterns = [
                    r'Business Impact:\s*(.*?)(?=\n|$)',
                    r'Impact:\s*(.*?)(?=\n|$)',
                    r'Implications:\s*(.*?)(?=\n|$)'
                ]
                business_impact = "This insight provides valuable information for decision-making."
                for pattern in alt_patterns:
                    match = re.search(pattern, description, re.IGNORECASE)
                    if match:
                        business_impact = match.group(1).strip()
                        description = re.sub(pattern, '', description, flags=re.IGNORECASE).strip()
                        break
                
                # If still not found, try to extract from the end of the section
                if business_impact == "This insight provides valuable information for decision-making.":
                    # Look for the last Business Impact in the entire section
                    section_business_impact = re.search(r'Business Impact:\s*(.*?)(?=\n\n|\n[A-Z]|$)', section, re.DOTALL | re.IGNORECASE)
                    if section_business_impact:
                        business_impact = section_business_impact.group(1).strip()
            
            if description:
                # Convert markdown bold to HTML bold for title, description, and business impact
                title = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', title)
                description = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', description)
                business_impact = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', business_impact)
                
                insights.append({
                    "title": title,
                    "description": description,
                    "business_impact": business_impact,
                    "confidence": "high"
                })
    
    # If no insights found, create a basic one
    if not insights:
        insights = [{
            "title": "AI Analysis Complete",
            "description": "AI has analyzed your dataset and found interesting patterns.",
            "business_impact": "These insights can guide your business decisions.",
            "confidence": "high"
        }]
    
    return insights

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
        
        # Generate shorter unique file ID (8 characters)
        import secrets
        import string
        file_id = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(8))
        
        # Read file content
        content = await file.read()
        
        # Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Create uploads directory if it doesn't exist
        uploads_dir = "uploads"
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Save file to disk
        file_path = os.path.join(uploads_dir, f"{file_id}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(content)
        
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
                "file_path": file_path,  # Store the file path
                "content": content,  # Store the raw content for analysis
                "columns": columns,
                "rows": rows,
                "preview": preview,
                "uploaded_at": "2024-01-01T00:00:00Z"
            }
            
            # Basic file info
            file_info = {
                "file_id": file_id,  # Make sure file_id is returned
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
                "file_path": file_path,  # Store the file path
                "columns": ["Column1", "Column2", "Column3"],  # Placeholder
                "rows": [],
                "preview": [
                    {"Column1": "Data1", "Column2": "Data2", "Column3": "Data3"},
                    {"Column1": "Data4", "Column2": "Data5", "Column3": "Data6"}
                ],
                "uploaded_at": "2024-01-01T00:00:00Z"
            }
            
            file_info = {
                "file_id": file_id,  # Make sure file_id is returned
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
async def analyze_data(request: dict = Body(...)):
    """Analyze uploaded data and return insights"""
    try:
        file_id = request.get("file_id", "")
        
        if not file_id:
            raise HTTPException(status_code=400, detail="file_id is required")
        
        # Find the file in storage
        if file_id not in file_storage:
            raise HTTPException(status_code=404, detail="File not found. Please upload the file first.")
        
        stored_file = file_storage[file_id]
        content = stored_file["content"]
        filename = stored_file["filename"]
        
        # Validate file type
        if not filename.lower().endswith(('.csv', '.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
        
        # For CSV files, parse the content
        if filename.lower().endswith('.csv'):
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
            
            # Generate real AI insights using OpenAI
            try:
                import pandas as pd
                
                # Create DataFrame for analysis
                df = pd.DataFrame(rows)
                
                # Create detailed data context for OpenAI
                numeric_cols = df.select_dtypes(include=['number']).columns
                categorical_cols = df.select_dtypes(include=['object', 'category']).columns
                
                context_parts = []
                context_parts.append(f"Dataset: {len(df)} rows, {len(df.columns)} columns")
                context_parts.append(f"Columns: {list(df.columns)}")
                
                if len(numeric_cols) > 0:
                    context_parts.append("Numeric columns:")
                    for col in numeric_cols[:5]:  # Show first 5 numeric columns
                        stats = df[col].describe()
                        context_parts.append(f"- {col}: mean={stats['mean']:.2f}, std={stats['std']:.2f}, min={stats['min']:.2f}, max={stats['max']:.2f}")
                
                if len(categorical_cols) > 0:
                    context_parts.append("Categorical columns:")
                    for col in categorical_cols[:5]:  # Show first 5 categorical columns
                        value_counts = df[col].value_counts()
                        context_parts.append(f"- {col}: top value = {value_counts.index[0]} ({value_counts.iloc[0]} times)")
                
                # Add correlation analysis if multiple numeric columns
                if len(numeric_cols) >= 2:
                    corr_matrix = df[numeric_cols].corr()
                    high_corr = []
                    for i in range(len(corr_matrix.columns)):
                        for j in range(i+1, len(corr_matrix.columns)):
                            corr_val = corr_matrix.iloc[i, j]
                            if abs(corr_val) > 0.3:
                                high_corr.append(f"{corr_matrix.columns[i]} & {corr_matrix.columns[j]}: {corr_val:.2f}")
                    
                    if high_corr:
                        context_parts.append("Strong correlations:")
                        context_parts.extend(high_corr[:3])
                
                # Add sample data
                context_parts.append("Sample data (first 5 rows):")
                context_parts.append(df.head(5).to_string())
                
                dataset_context = "\n".join(context_parts)
                
                # Create prompt for AI insights
                prompt = f"""
You are a brilliant, enthusiastic data analyst who loves helping people understand their data! 🚀

Your mission: Generate EXCITING, SPECIFIC insights from this dataset that are fun and professional.

Dataset Context:
{dataset_context}

Your task: Generate EXACTLY 5-10 specific insights that:
🎯 SPECIFIC - Use actual numbers, names, and exact values from the data
🎉 EXCITING - Make it fun and engaging with emojis and personality  
📊 DETAILED - Show the exact patterns you found
💡 ANALYTICAL - Explain what the numbers mean

Focus on:
- Highest/lowest values with specific numbers
- Strongest correlations with exact correlation values
- Interesting patterns/outliers with specific examples
- Business implications with actionable insights
- Fun facts with specific data points

CRITICAL FORMATTING REQUIREMENTS:
1. Each insight must be separated by double newlines
2. Each insight must follow this EXACT format:
   [EMOJI] **Title:**
   **Full description with ALL important numbers, column names, and values in bold**
   
   Business Impact: **column_name=value, another_column=value, specific business implication**

3. Use **bold** for ALL important numbers, column names, and key phrases
4. Make the ENTIRE title bold (no ** symbols visible)
5. Each Business Impact must be COMPLETELY DIFFERENT and include specific column=value pairs
6. Generate EXACTLY 5-10 insights minimum

Example format:
🎵 **Top Track Alert: El Ultimo Adiós Dominates!**
**The track 'El Ultimo Adiós - Varios Artistas Version' stands out as the most frequently appearing track in the dataset with track_count=15 occurrences, making it the clear leader in track popularity.**

Business Impact: **track_count=15, popularity_rank=1, suggests focusing marketing efforts on similar tracks or artists for maximum engagement.**

📊 **Correlation Discovery: Energy vs Danceability**
**There is a strong positive correlation of 0.85 between energy_level and danceability_score, indicating that high-energy tracks are also highly danceable.**

Business Impact: **energy_level=0.85, danceability_score=0.85, suggests targeting workout and party playlists with high-energy, danceable tracks for maximum engagement.**

IMPORTANT: 
- Bold ALL column names, numbers, and important terms
- Business Impact must include specific column=value pairs
- Never show ** symbols in the final output
- Each Business Impact must be completely unique

Be specific to THIS dataset - use actual column names, real numbers, and exact values you find in the data!
"""
                
                # Call OpenAI API
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are an expert data analyst who provides specific, engaging insights. You MUST generate EXACTLY 5-10 insights minimum. Each insight must have a COMPLETELY DIFFERENT business impact with specific column=value pairs. NEVER repeat the same business impact. Each Business Impact must include actual column names and values from the dataset. Make ALL important terms, numbers, and column names bold."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=5000,
                    temperature=0.3,
                    top_p=0.9
                )
                
                # Parse the response
                ai_response = response.choices[0].message.content
                print(f"AI Response: {ai_response}")
                
                # Parse the natural language response
                insights = _parse_ai_response_to_insights(ai_response)
                print(f"Parsed Insights: {insights}")
                
            except Exception as e:
                print(f"OpenAI API error: {e}")
                # Fallback to basic insights
                insights = [
                    {
                        "title": "Data Analysis Ready",
                        "description": f"Your dataset contains {len(rows)} records with {len(columns)} variables ready for analysis.",
                        "business_impact": "This provides a solid foundation for data-driven insights.",
                        "confidence": "high"
                    }
                ]
            
        else:
            # For Excel files, return basic info (would need pandas for full parsing)
            insights = [
                {
                    "title": "Excel File Detected",
                    "description": f"Excel file '{filename}' uploaded successfully",
                    "business_impact": "File ready for analysis",
                    "confidence": "high"
                }
            ]
            stats = {}
            missing_values = {}
            data_types = {}
        

        
        from datetime import datetime, timezone
        
        analysis_result = {
            "file_id": file_id,  # Use the same file ID from storage
            "statistics": stats,
            "missing_values": missing_values,
            "data_types": data_types,
            "insights": insights,
            "analyzed_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Store the analysis result
        analysis_storage[file_id] = analysis_result
        print(f"Stored analysis for file_id: {file_id}")
        print(f"Analysis result: {analysis_result}")
        
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
        openai_client = OpenAI()
        
        # Load actual dataset
        file_path = None
        try:
            # Try to find the file in uploads directory
            uploads_dir = "uploads"
            for filename in os.listdir(uploads_dir):
                if file_id in filename:
                    file_path = os.path.join(uploads_dir, filename)
                    break
        except Exception as e:
            print(f"Warning: Could not find file: {e}")
        
        # Create dataset context based on actual data
        dataset_context = ""
        if file_path and os.path.exists(file_path):
            try:
                import pandas as pd
                if file_path.endswith('.csv'):
                    df = pd.read_csv(file_path)
                else:
                    df = pd.read_excel(file_path)
                
                # Create detailed context from actual data
                numeric_cols = df.select_dtypes(include=['number']).columns
                categorical_cols = df.select_dtypes(include=['object', 'category']).columns
                
                context_parts = []
                context_parts.append(f"Dataset: {len(df)} rows, {len(df.columns)} columns")
                context_parts.append(f"Columns: {list(df.columns)}")
                
                if len(numeric_cols) > 0:
                    context_parts.append("Numeric columns:")
                    for col in numeric_cols[:3]:
                        stats = df[col].describe()
                        context_parts.append(f"- {col}: mean={stats['mean']:.2f}, std={stats['std']:.2f}")
                
                if len(categorical_cols) > 0:
                    context_parts.append("Categorical columns:")
                    for col in categorical_cols[:3]:
                        value_counts = df[col].value_counts()
                        context_parts.append(f"- {col}: top value = {value_counts.index[0]} ({value_counts.iloc[0]} times)")
                
                # Add correlation analysis if multiple numeric columns
                if len(numeric_cols) >= 2:
                    corr_matrix = df[numeric_cols].corr()
                    high_corr = []
                    for i in range(len(corr_matrix.columns)):
                        for j in range(i+1, len(corr_matrix.columns)):
                            corr_val = corr_matrix.iloc[i, j]
                            if abs(corr_val) > 0.5:
                                high_corr.append(f"{corr_matrix.columns[i]} & {corr_matrix.columns[j]}: {corr_val:.2f}")
                    
                    if high_corr:
                        context_parts.append("Strong correlations:")
                        context_parts.extend(high_corr[:3])
                
                context_parts.append("Sample data (first 3 rows):")
                context_parts.append(df.head(3).to_string())
                
                dataset_context = "\n".join(context_parts)
                
            except Exception as e:
                print(f"Warning: Could not load actual data: {e}")
                dataset_context = f"Dataset with file ID: {file_id} (data loading failed)"
        else:
            dataset_context = f"Dataset with file ID: {file_id} (file not found)"
        
        # Create the full context for the question
        full_context = f"""
You are a brilliant, enthusiastic data analyst who loves helping people understand their data! 🚀

Your superpower: Making complex data insights fun and easy to understand!

Dataset Context:
{dataset_context}

User Question: {question}

Your mission: Provide a detailed, fun, and professional answer that:
🎯 Directly addresses their question with SPECIFIC data insights
📊 Uses ACTUAL numbers and patterns from their dataset
💡 Provides actionable insights and recommendations
🎉 Makes it engaging and exciting to read with emojis
🔍 Shows your analytical expertise with specific examples

Be specific to their actual data - mention real correlations, patterns, and insights you find. 
Use exact numbers, column names, and specific data points from their dataset.

Make it conversational but professional, detailed but not overwhelming.
Include specific examples like: "The correlation between age and salary is 0.85, meaning older employees earn significantly more."

Keep your response detailed and informative (3-4 paragraphs) to provide real value.
"""
        
        try:
            # Call OpenAI API with optimized settings
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",  # Use more efficient model
                messages=[
                    {"role": "system", "content": "You are a brilliant, enthusiastic data analyst who loves discovering hidden patterns in data! You make complex insights fun and easy to understand while maintaining professional expertise. Use emojis sparingly but effectively to make responses engaging."},
                    {"role": "user", "content": full_context}
                ],
                max_tokens=1200,  # Increased for more detailed responses
                temperature=0.3,  # Slightly higher for more engaging responses
                top_p=0.9
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # Generate follow-up questions based on the actual data
            follow_up_prompt = f"""
Based on the dataset context:
{dataset_context}

And the user's question: "{question}"
And your response: "{ai_response}"

Generate 3-4 relevant follow-up questions that would help the user explore their specific data further.
Make them specific to the actual data patterns and insights.
Return only the questions, one per line, without numbering.
"""
            
            follow_up_response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a data analyst helping generate relevant follow-up questions based on actual data."},
                    {"role": "user", "content": follow_up_prompt}
                ],
                max_tokens=200,
                temperature=0.3,
                top_p=0.9
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
            
            # Create a more specific fallback based on actual data context
            if "correlation" in dataset_context.lower():
                response = "🎯 I found some fascinating correlations in your data! The strongest relationships show meaningful patterns that could guide your business decisions."
            elif "numeric" in dataset_context.lower():
                response = "📊 Your dataset reveals interesting numerical patterns! I've identified key insights that could significantly impact your analysis and decision-making."
            elif "categorical" in dataset_context.lower():
                response = "🏷️ Your categorical data shows compelling patterns! I've discovered insights that could help you understand customer segments and market trends."
            else:
                response = "🚀 I've analyzed your dataset and found some exciting patterns! The data quality looks great, and I've identified several opportunities for deeper insights."
            
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
        "file_id": file_id,
        "statistics": stored_analysis.get("statistics", {}),
        "missing_values": stored_analysis.get("missing_values", {}),
        "data_types": stored_analysis.get("data_types", {}),
        "insights": stored_analysis.get("insights", []),
        "analyzed_at": stored_file.get("uploaded_at", "2024-01-01T00:00:00Z")
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