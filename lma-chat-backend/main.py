from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
import logging

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import routers with error handling
try:
    from ChatBasic import router as basic_router
    logger.info("✅ ChatBasic router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import ChatBasic router: {e}")
    basic_router = None

try:
    from ChatRAG import router as rag_router
    logger.info("✅ ChatRAG router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import ChatRAG router: {e}")
    rag_router = None

try:
    from ConsultingPitch import router as consulting_router
    logger.info("✅ ConsultingPitch router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import ConsultingPitch router: {e}")
    consulting_router = None

try:
    from github_assistant import github_router
    logger.info("✅ GitHub Assistant router imported successfully")
    # Debug the GitHub router specifically
    if github_router:
        logger.info(f"GitHub router routes: {len(github_router.routes)}")
        for route in github_router.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                logger.info(f"  GitHub route: {list(route.methods)} {route.path}")
except Exception as e:
    logger.error(f"❌ Failed to import GitHub Assistant router: {e}")
    github_router = None

try:
    from CatalantPitch import router as catalant_router
    logger.info("✅ CatalantPitch router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import CatalantPitch router: {e}")
    catalant_router = None

try:
    from ChatClaude import router as claude_router
    logger.info("✅ ChatClaude router imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import ChatClaude router: {e}")
    claude_router = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting up LMA Chat API with GitHub Code Assistant and Google GenAI")

    # Log all registered routes
    logger.info("=== REGISTERED ROUTES ===")
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            methods = list(route.methods)
            logger.info(f"  {methods} {route.path}")
    logger.info("=== END ROUTES ===")

    yield
    # Shutdown
    logger.info("⛔ Shutting down LMA Chat API")

app = FastAPI(
    title="LMA Chat API",
    description="API with Google GenAI basic chat, RAG-enhanced chat, consulting pitch generation, and GitHub code assistance",
    version="1.2.1",
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

# Include routers with error handling
if basic_router:
    app.include_router(basic_router, prefix="/basic", tags=["Basic Chat"])
    logger.info("✅ Basic router included")

if rag_router:
    app.include_router(rag_router, prefix="/rag", tags=["RAG Chat"])
    logger.info("✅ RAG router included")

if consulting_router:
    app.include_router(consulting_router, prefix="/consulting", tags=["Consulting Pitch"])
    logger.info("✅ Consulting router included")

if github_router:
    app.include_router(github_router, prefix="/github", tags=["GitHub Code Assistant"])
    logger.info("✅ GitHub router included")
    # Debug GitHub routes after inclusion
    github_routes = [route for route in app.routes if route.path.startswith("/github")]
    logger.info(f"GitHub routes in app: {len(github_routes)}")
    for route in github_routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            logger.info(f"  App GitHub route: {list(route.methods)} {route.path}")
else:
    logger.error("❌ GitHub router not included - import failed")

if catalant_router:
    app.include_router(catalant_router, prefix="/catalant", tags=["Catalant Pitch"])
    logger.info("✅ Catalant router included")

if claude_router:
    app.include_router(claude_router, prefix="/claude", tags=["Claude Chat"])
    logger.info("✅ Claude router included")

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
            },
            "claude_chat": {
                "description": "Anthropic Claude chat with advanced capabilities",
                "base_path": "/claude",
                "model": "claude-opus-4@20250514",
                "features": ["streaming"]
            }
        },
        "endpoints": {
            "basic_chat": "/basic/chat",
            "basic_chat_stream": "/basic/chat/stream",
            "basic_status": "/basic/status",
            "rag_chat": "/rag/chat",
            "rag_status": "/rag/status",
            "consulting_pitch": "/consulting/generate-pitch",
            "consulting_custom": "/consulting/generate-custom",
            "consulting_status": "/consulting/status",
            "github_chat": "/github/chat",
            "github_user": "/github/user",
            "github_repositories": "/github/repositories",
            "github_create_file": "/github/create-file",
            "github_repo_info": "/github/repo-info",
            "github_status": "/github/status",
            "catalant_pitch": "/catalant/generate-pitch",
            "catalant_status": "/catalant/status",
            "catalant_custom": "/catalant/generate-custom",
            "claude_chat": "/claude/chat/claude",
            "claude_chat_stream": "/claude/chat/claude/stream",
            "claude_status": "/claude/status/claude"
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
                "github_code_assistant": "operational" if github_router else "unavailable",
                "claude_chat": "operational" if claude_router else "unavailable"
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

# Debug endpoint to show all routes
@app.get("/debug/routes", tags=["Debug"])
async def debug_routes():
    """Debug endpoint to show all registered routes"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": getattr(route, 'name', 'unknown')
            })

    return {
        "total_routes": len(routes),
        "routes": routes,
        "github_routes": [r for r in routes if r["path"].startswith("/github")],
        "claude_routes": [r for r in routes if r["path"].startswith("/claude")]
    }

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler with debugging info"""
    logger.warning(f"404 Error: {request.method} {request.url}")

    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": f"The requested endpoint {request.url.path} does not exist",
            "method": request.method,
            "debug_url": "/debug/routes",
            "available_endpoints": [
                "/",
                "/health",
                "/docs",
                "/debug/routes",
                "/basic/chat",
                "/basic/chat/stream",
                "/basic/status",
                "/rag/chat",
                "/rag/status",
                "/consulting/generate-pitch",
                "/consulting/generate-custom",
                "/consulting/pitch-templates",
                "/consulting/status",
                "/github/chat",
                "/github/user",
                "/github/repositories",
                "/github/create-file",
                "/github/repo-info",
                "/github/status",
                "/github/test-router",  # Added test endpoint
                "/catalant/generate-pitch",
                "/catalant/generate-custom",
                "/catalant/pitch-templates",
                "/catalant/status",
                "/claude/chat/claude",
                "/claude/chat/claude/stream",
                "/claude/status/claude"
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

    logger.info(f"🚀 Starting server on {host}:{port} with Google GenAI integration")

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=log_level,
        access_log=True
    )