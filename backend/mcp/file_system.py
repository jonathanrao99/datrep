import os
import uuid
import shutil
import aiofiles
from pathlib import Path
from typing import Optional, List
from fastapi import UploadFile, HTTPException
from datetime import datetime, timedelta
import asyncio

class FileSystemMCP:
    """Model Context Protocol for file system operations"""
    
    def __init__(self, upload_dir: str = "./uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(exist_ok=True)
    
    async def save_uploaded_file(self, file: UploadFile) -> dict:
        """
        Save uploaded file and return metadata
        
        Args:
            file: FastAPI UploadFile object
            
        Returns:
            dict: File metadata including ID, path, and info
        """
        # Validate file type
        allowed_extensions = {'.csv', '.xlsx', '.xls'}
        file_extension = Path(file.filename).suffix.lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_extension} not supported. Allowed: {allowed_extensions}"
            )
        
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        safe_filename = f"{file_id}_{file.filename}"
        file_path = self.upload_dir / safe_filename
        
        # Save file
        try:
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save file: {str(e)}"
            )
        
        return {
            "file_id": file_id,
            "original_filename": file.filename,
            "stored_filename": safe_filename,
            "file_path": str(file_path),
            "file_size": len(content),
            "file_type": file_extension,
            "uploaded_at": datetime.utcnow().isoformat()
        }
    
    async def get_file_path(self, file_id: str) -> Optional[str]:
        """Get file path by file ID"""
        for file_path in self.upload_dir.glob(f"{file_id}_*"):
            return str(file_path)
        return None
    
    async def delete_file(self, file_id: str) -> bool:
        """Delete file by file ID"""
        file_path = await self.get_file_path(file_id)
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    
    async def cleanup_old_files(self, hours: int = 72) -> int:
        """
        Clean up files older than specified hours
        
        Args:
            hours: Number of hours after which files should be deleted
            
        Returns:
            int: Number of files deleted
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        deleted_count = 0
        
        for file_path in self.upload_dir.glob("*"):
            if file_path.is_file():
                file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                if file_time < cutoff_time:
                    try:
                        file_path.unlink()
                        deleted_count += 1
                    except Exception as e:
                        print(f"Failed to delete {file_path}: {e}")
        
        return deleted_count
    
    async def get_file_info(self, file_id: str) -> Optional[dict]:
        """Get file information by file ID"""
        file_path = await self.get_file_path(file_id)
        if not file_path or not os.path.exists(file_path):
            return None
        
        stat = os.stat(file_path)
        return {
            "file_id": file_id,
            "file_path": file_path,
            "file_size": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
        }
    
    async def list_files(self) -> List[dict]:
        """List all files in upload directory"""
        files = []
        for file_path in self.upload_dir.glob("*"):
            if file_path.is_file():
                stat = file_path.stat()
                files.append({
                    "filename": file_path.name,
                    "file_size": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        return files

# Global file system instance
file_system = FileSystemMCP(os.getenv("UPLOAD_DIR", "./uploads")) 