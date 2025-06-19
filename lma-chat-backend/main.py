from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
import logging

# Import routers
from ChatBasic import router as basic_router
from ChatRAG import router as rag_router
from ConsultingPitch import router as consulting_router
from GitHubCodeAssistant import router as github_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up LMA Chat API with GitHub Code Assistant and Google GenAI")
    yield
    # Shutdown
    logger.info("Shutting down LMA Chat API")

app = FastAPI(
    title="LMA Chat API",
    description="API with Google GenAI basic chat, RAG-enhanced chat, consulting pitch generation, and GitHub code assistance",
    version="1.2.1",  # Minor version bump for GenAI integration
    lifespan=lifespan
)

# CORS Configuration
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(basic_router, prefix="/basic", tags=["Basic Chat"])
app.include_router(rag_router, prefix="/rag", tags=["RAG Chat"])
app.include_router(consulting_router, prefix="/consulting", tags=["Consulting Pitch"])
app.include_router(github_router, prefix="/github", tags=["GitHub Code Assistant"])

@app.get("/", tags=["Root"])
def root():
    """Root endpoint with API information"""
    return JSONResponse(content={
        "message": "LMA Chat API is running!",
        "version": "1.2.1",
        "services": {
            "basic_llm": {
                "description": "Google GenAI Gemini 2.5 Pro chat with advanced thinking capabilities",
                "base_path": "/basic",
                "model": "gemini-2.5-pro",
                "features": ["thinking_mode", "structured_output", "streaming"]
            },
            "rag_engine": {
                "description": "RAG-enhanced chat with knowledge base",
                "base_path": "/rag"
            },
            "consulting_pitch": {
                "description": "AI-powered consulting pitch generation",
                "base_path": "/consulting"
            },
            "github_code_assistant": {
                "description": "GitHub-integrated code assistant with Mistral Codestral",
                "base_path": "/github"
            }
        },
        "endpoints": {
            "basic_chat": "/basic/chat",
            "basic_chat_stream": "/basic/chat/stream",  # Added streaming endpoint
            "basic_status": "/basic/status",
            "rag_chat": "/rag/chat",
            "rag_status": "/rag/status",
            "consulting_pitch": "/consulting/generate-pitch",
            "consulting_custom": "/consulting/generate-custom",
            "consulting_status": "/consulting/status",
            "github_chat": "/github/chat",
            "github_create_file": "/github/create-file",
            "github_repo_info": "/github/repo-info",
            "github_status": "/github/status"
        },
        "docs": "/docs",
        "health": "/health"
    })

@app.get("/health", tags=["Health"])
async def health():
    """Health check endpoint"""
    try:
        return JSONResponse(content={
            "status": "healthy",
            "services": {
                "basic_llm": "operational - Google GenAI",
                "rag_engine": "operational", 
                "consulting_pitch": "operational",
                "github_code_assistant": "operational"
            },
            "version": "1.2.1",
            "infrastructure": {
                "google_genai": "connected",
                "vertex_ai": "connected",
                "project": os.environ.get("GOOGLE_CLOUD_PROJECT", "lma-website-461920"),
                "location": "global"
            }
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": "The requested endpoint does not exist",
            "available_endpoints": [
                "/",
                "/health",
                "/docs",
                "/basic/chat",
                "/basic/chat/stream",  # Added streaming endpoint
                "/basic/status",
                "/rag/chat",
                "/rag/status",
                "/consulting/generate-pitch",
                "/consulting/generate-custom",
                "/consulting/pitch-templates",
                "/consulting/status",
                "/github/chat",
                "/github/create-file",
                "/github/repo-info",
                "/github/status"
            ]
        }
    )

if __name__ == "__main__":
    import uvicorn
        
    # Configuration from environment variables
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8080))
    reload = os.environ.get("RELOAD", "false").lower() == "true"
    log_level = os.environ.get("LOG_LEVEL", "info").lower()
        
    logger.info(f"Starting server on {host}:{port} with Google GenAI integration")
        
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=log_level,
        access_log=True
    )