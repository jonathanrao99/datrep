from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum

class ChartType(str, Enum):
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    SCATTER = "scatter"
    HEATMAP = "heatmap"

class UploadResponse(BaseModel):
    """Response model for file upload"""
    success: bool
    file_id: Optional[str] = None
    message: str
    file_info: Optional[Dict[str, Any]] = None

class AnalysisRequest(BaseModel):
    """Request model for data analysis"""
    file_id: str
    session_id: Optional[str] = None

class AnalysisResponse(BaseModel):
    """Response model for data analysis"""
    success: bool
    analysis_id: Optional[str] = None
    data_summary: Optional[Dict[str, Any]] = None
    insights: Optional[Dict[str, Any]] = None
    message: str
    generated_at: Optional[str] = None

class ChartRequest(BaseModel):
    """Request model for chart generation"""
    file_id: str
    chart_type: ChartType
    column: str
    session_id: Optional[str] = None

class ChartResponse(BaseModel):
    """Response model for chart generation"""
    success: bool
    chart_id: Optional[str] = None
    chart_config: Optional[Dict[str, Any]] = None
    message: str

class ChatRequest(BaseModel):
    """Request model for chat with data"""
    file_id: str
    question: str = Field(..., min_length=1, max_length=1000)
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    """Response model for chat with data"""
    success: bool
    question: str
    answer: Optional[str] = None
    message: str
    timestamp: Optional[str] = None

class InsightItem(BaseModel):
    """Model for individual insight"""
    title: str
    description: str
    business_impact: str
    confidence: str = Field(..., pattern="^(high|medium|low)$")

class DataQuality(BaseModel):
    """Model for data quality information"""
    issues: List[str]
    recommendations: List[str]

class InsightsResponse(BaseModel):
    """Model for insights response"""
    insights: List[InsightItem]
    patterns: List[str]
    data_quality: DataQuality

class SessionInfo(BaseModel):
    """Model for session information"""
    session_id: str
    created_at: datetime
    last_seen: datetime
    is_authenticated: bool = False

class ErrorResponse(BaseModel):
    """Model for error responses"""
    success: bool = False
    error: str
    detail: Optional[str] = None

class HealthResponse(BaseModel):
    """Model for health check response"""
    status: str
    service: str
    version: str
    timestamp: datetime = Field(default_factory=datetime.utcnow) 