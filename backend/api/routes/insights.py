from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Optional
import pandas as pd

from mcp.file_system import file_system
from mcp.openai import openai_mcp
from services.data_service import data_service
from models.schemas import ChartRequest, ChartResponse, ChatRequest, ChatResponse, ErrorResponse, ChartType
from api.auth import require_api_token, require_rate_limit

router = APIRouter(dependencies=[Depends(require_api_token), Depends(require_rate_limit)])

@router.post("/chart", response_model=ChartResponse)
async def generate_chart(request: ChartRequest):
    """
    Generate chart configuration for data visualization
    
    Args:
        request: ChartRequest containing file_id, chart_type, and column
        
    Returns:
        ChartResponse: Chart configuration data
    """
    try:
        # Get file path
        file_path = await file_system.get_file_path(request.file_id)
        
        if not file_path:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Load data
        file_extension = file_path.split('.')[-1].lower()
        if file_extension == 'csv':
            df = pd.read_csv(file_path)
        elif file_extension in ['xlsx', 'xls']:
            df = pd.read_excel(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Validate column exists
        if request.column not in df.columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Column '{request.column}' not found in dataset"
            )
        
        # Generate chart data
        chart_config = data_service.get_chart_data(df, request.chart_type.value, request.column)
        
        if "error" in chart_config:
            raise HTTPException(status_code=400, detail=chart_config["error"])
        
        return ChartResponse(
            success=True,
            chart_id=f"chart_{request.file_id}_{request.chart_type.value}_{request.column}",
            chart_config=chart_config,
            message="Chart configuration generated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return ChartResponse(
            success=False,
            message=f"Failed to generate chart: {str(e)}"
        )

@router.post("/chat", response_model=ChatResponse)
async def chat_with_data(request: ChatRequest):
    """
    Chat with data using GPT with dataset-specific answers
    
    Args:
        request: ChatRequest containing file_id and question
        
    Returns:
        ChatResponse: GPT's answer to the question
    """
    try:
        # Get file path
        file_path = await file_system.get_file_path(request.file_id)
        
        if not file_path:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Parse data to get context
        parse_result = await data_service.parse_file(file_path)
        
        if not parse_result["success"]:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse file: {parse_result.get('error', 'Unknown error')}"
            )
        
        # Create data context for GPT
        data_summary = parse_result["data_summary"]
        sample_data = parse_result["sample_data"]
        
        data_context = f"""
Dataset Summary:
- Rows: {data_summary.get('rows', 'N/A')}
- Columns: {data_summary.get('columns', 'N/A')}
- Column names: {data_summary.get('column_names', [])}
- Data types: {data_summary.get('data_types', {})}

Sample Data:
{sample_data}
        """
        
        # Get answer from GPT with actual file path
        chat_result = await openai_mcp.chat_with_data(request.question, data_context, file_path)
        
        return ChatResponse(
            success=True,
            question=request.question,
            answer=chat_result["answer"],
            message="Chat response generated successfully",
            timestamp=chat_result["timestamp"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return ChatResponse(
            success=False,
            question=request.question,
            message=f"Failed to process chat question: {str(e)}"
        )

@router.get("/insights/{file_id}")
async def get_insights(file_id: str):
    """
    Get insights for a specific file
    
    Args:
        file_id: The ID of the uploaded file
        
    Returns:
        Insights for the file
    """
    try:
        # Get file path
        file_path = await file_system.get_file_path(file_id)
        
        if not file_path:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Parse data
        parse_result = await data_service.parse_file(file_path)
        
        if not parse_result["success"]:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse file: {parse_result.get('error', 'Unknown error')}"
            )
        
        data_summary = parse_result["data_summary"]
        sample_data = parse_result["sample_data"]
        
        # Generate insights with actual file path
        insights_result = await openai_mcp.generate_insights(data_summary, sample_data, file_path)
        
        return {
            "success": True,
            "file_id": file_id,
            "insights": insights_result,
            "data_summary": data_summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        return ErrorResponse(
            error="Failed to get insights",
            detail=str(e)
        ) 