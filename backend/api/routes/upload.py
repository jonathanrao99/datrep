from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
import os
from typing import Optional

from mcp.file_system import file_system
from models.schemas import UploadResponse, ErrorResponse

router = APIRouter()

async def validate_file_size(file: UploadFile) -> UploadFile:
    """Validate uploaded file size against MAX_FILE_SIZE."""
    max_size = int(os.getenv("MAX_FILE_SIZE", 104857600))  # 100MB default

    # Read once to check size, then rewind so downstream save can read again.
    content = await file.read()
    size = len(content)
    await file.seek(0)

    if size > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {size} bytes. Max allowed is {max_size} bytes",
        )

    return file

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    session_id: Optional[str] = None
):
    """
    Upload a CSV or Excel file for analysis
    
    Args:
        file: The file to upload (CSV, XLSX, or XLS)
        session_id: Optional session ID for tracking
        
    Returns:
        UploadResponse: File upload result with file ID
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Validate file size (basic check)
        await validate_file_size(file)
        
        # Save file using File System MCP
        file_info = await file_system.save_uploaded_file(file)
        
        return UploadResponse(
            success=True,
            file_id=file_info["file_id"],
            message="File uploaded successfully",
            file_info=file_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return UploadResponse(
            success=False,
            message=f"Failed to upload file: {str(e)}"
        )

@router.get("/files/{file_id}")
async def get_file_info(file_id: str):
    """
    Get information about an uploaded file
    
    Args:
        file_id: The ID of the uploaded file
        
    Returns:
        File information
    """
    try:
        file_info = await file_system.get_file_info(file_id)
        
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")
        
        return {
            "success": True,
            "file_info": file_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        return ErrorResponse(
            error="Failed to get file info",
            detail=str(e)
        )

@router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    """
    Delete an uploaded file
    
    Args:
        file_id: The ID of the file to delete
        
    Returns:
        Deletion result
    """
    try:
        success = await file_system.delete_file(file_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="File not found")
        
        return {
            "success": True,
            "message": "File deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        return ErrorResponse(
            error="Failed to delete file",
            detail=str(e)
        )

@router.get("/files")
async def list_files():
    """
    List all uploaded files (for debugging/admin purposes)
    
    Returns:
        List of uploaded files
    """
    try:
        files = await file_system.list_files()
        
        return {
            "success": True,
            "files": files,
            "count": len(files)
        }
        
    except Exception as e:
        return ErrorResponse(
            error="Failed to list files",
            detail=str(e)
        ) 