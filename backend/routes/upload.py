from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import os
from pathlib import Path
from typing import Optional

from mcp.file_system import file_system
from models.schemas import UploadResponse, ErrorResponse
from auth import require_api_token, require_rate_limit

router = APIRouter(dependencies=[Depends(require_api_token), Depends(require_rate_limit)])

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
ALLOWED_CONTENT_TYPES = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",  # fallback from some clients
}


def validate_file_type(file: UploadFile) -> None:
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()
    content_type = (file.content_type or "").lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file extension")

    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type: {content_type}",
        )


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
    """
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")

        validate_file_type(file)
        await validate_file_size(file)

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
