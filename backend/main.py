import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import uvicorn

# Single source of env: repo root .env only (no backend/.env needed)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Import routes
from api.routes import upload, analyze, insights

# Create FastAPI app
app = FastAPI(
    title="DatRep API",
    description="AI-powered data analysis and insights generation",
    version="1.0.0"
)

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
        "service": "DatRep API",
        "version": "1.0.0"
    }

# Include API routes
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(analyze.router, prefix="/api", tags=["analyze"])
app.include_router(insights.router, prefix="/api", tags=["insights"])

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    # Avoid leaking internal exception details to clients.
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENV") == "development"
    ) 