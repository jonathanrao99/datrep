from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Optional
import uuid
from datetime import datetime

from mcp.file_system import file_system
from mcp.openai import openai_mcp
from services.data_service import data_service
from models.schemas import AnalysisRequest, AnalysisResponse, ErrorResponse
from api.auth import require_api_token

router = APIRouter(dependencies=[Depends(require_api_token)])

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_data(request: AnalysisRequest):
    """
    Analyze uploaded data and generate insights
    
    Args:
        request: AnalysisRequest containing file_id and optional session_id
        
    Returns:
        AnalysisResponse: Analysis results with insights
    """
    try:
        # Get file path from file system
        file_path = await file_system.get_file_path(request.file_id)
        
        if not file_path:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Parse and analyze the data
        parse_result = await data_service.parse_file(file_path)
        
        if not parse_result["success"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to parse file: {parse_result.get('error', 'Unknown error')}"
            )
        
        data_summary = parse_result["data_summary"]
        sample_data = parse_result["sample_data"]
        
        # Generate insights using OpenAI with actual file path
        insights_result = await openai_mcp.generate_insights(data_summary, sample_data, file_path)
        
        # Generate analysis ID
        analysis_id = str(uuid.uuid4())
        
        return AnalysisResponse(
            success=True,
            analysis_id=analysis_id,
            data_summary=data_summary,
            insights=insights_result,
            message="Analysis completed successfully",
            generated_at=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return AnalysisResponse(
            success=False,
            message=f"Failed to analyze data: {str(e)}"
        )

@router.post("/analyze/quick")
async def quick_analyze(file_id: str = Body(...)):
    """
    Quick analysis endpoint for immediate feedback
    
    Args:
        file_id: The ID of the uploaded file
        
    Returns:
        Quick analysis results
    """
    try:
        # Get file path
        file_path = await file_system.get_file_path(file_id)
        
        if not file_path:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Parse data only (no GPT insights)
        parse_result = await data_service.parse_file(file_path)
        
        if not parse_result["success"]:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse file: {parse_result.get('error', 'Unknown error')}"
            )
        
        return {
            "success": True,
            "data_summary": parse_result["data_summary"],
            "sample_data": parse_result["sample_data"],
            "message": "Quick analysis completed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        return ErrorResponse(
            error="Failed to perform quick analysis",
            detail=str(e)
        )

@router.get("/analyze/{analysis_id}")
async def get_analysis(analysis_id: str):
    """
    Get analysis results by analysis ID
    
    Args:
        analysis_id: The ID of the analysis
        
    Returns:
        Analysis results
    """
    # TODO: Implement storage and retrieval of analysis results
    # For now, return a placeholder
    return {
        "success": False,
        "message": "Analysis storage not implemented yet"
    } 