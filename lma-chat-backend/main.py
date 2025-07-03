from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware import Middleware
from contextlib import asynccontextmanager
import logging
import sys
import os
from pathlib import Path
import traceback

# Add the current directory to Python path so 'app' module can be found
current_dir = Path(__file__).parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

# Set up logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("main_app")

# Add the current directory to Python path so modules can be found
current_dir = Path(__file__).parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

# Set up logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("main_app")

logger.info("🚀 Starting LMA Chat API import process...")
logger.info(f"Current working directory: {os.getcwd()}")
logger.info(f"Python path: {sys.path}")
logger.info(f"Directory contents: {os.listdir('.')}")

try:
    # Import configurations first
    logger.info("Attempting to import config...")
    from config import ALLOWED_ORIGINS
    logger.info("✅ Config import successful")
    
    # Import Firebase next
    logger.info("Attempting to import firebase...")
    from firebase import FIREBASE_IS_AVAILABLE
    logger.info("✅ Firebase import successful")
    
    # Import auth middleware last
    logger.info("Attempting to import auth middleware...")
    from auth.middleware import authenticate_request
    logger.info("✅ Auth middleware import successful")
    
except ImportError as e:
    logger.error(f"❌ Core import error: {e}")
    logger.error(f"Full traceback: {traceback.format_exc()}")
    
    # Let's also check what's in auth directory
    if os.path.exists('auth'):
        logger.error(f"Auth directory contents: {os.listdir('auth')}")
    
    sys.exit(1)

try:
    # First, let's see what's in the routers directory
    if os.path.exists('routers'):
        logger.info(f"Routers directory contents: {os.listdir('routers')}")
    else:
        logger.error("❌ Routers directory does not exist!")
        sys.exit(1)
    
    # Check if __init__.py exists in routers
    if not os.path.exists('routers/__init__.py'):
        logger.warning("⚠️ routers/__init__.py does not exist - creating it")
        with open('routers/__init__.py', 'w') as f:
            f.write('# Router package')
    
    # Import auth router first
    logger.info("Attempting to import auth router...")
    from auth.routes import router as auth_router
    logger.info("✅ Auth router imported")
    
    # Try importing routers based on actual file names
    router_imports = [
        ('chat', 'basic_router'),  # chat.py -> basic_router
        ('moe_chat', 'moe_router'),  # moe_chat.py
        ('ChatRAG', 'rag_router'),  # ChatRAG.py -> rag_router
        ('ConsultingPitch', 'consulting_router'),  # ConsultingPitch.py -> consulting_router
        ('CatalantPitch', 'catalant_router'),  # CatalantPitch.py -> catalant_router
        ('ChatClaude', 'claude_router'),  # ChatClaude.py -> claude_router
    ]
    
    imported_routers = {}
    
    for router_file, router_name in router_imports:
        try:
            logger.info(f"Attempting to import {router_file} router...")
            if os.path.exists(f'routers/{router_file}.py'):
                module = __import__(f'routers.{router_file}', fromlist=['router'])
                if hasattr(module, 'router'):
                    imported_routers[router_name] = getattr(module, 'router')
                    logger.info(f"✅ {router_file} router imported")
                else:
                    logger.warning(f"⚠️ {router_file}.py exists but has no 'router' variable")
            else:
                logger.warning(f"⚠️ routers/{router_file}.py does not exist - skipping")
        except Exception as e:
            logger.error(f"❌ Failed to import {router_file}: {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            # Don't exit here, try to continue with other routers
    
    # Try importing from directories
    # Try importing from directories with specific files
    try:
        logger.info("Attempting to import github_assistant router...")
        if os.path.exists('routers/github_assistant/__init__.py'):
            # Import the correctly named router from the package
            from routers.github_assistant import github_router
            imported_routers['github_router'] = github_router
            logger.info("✅ github_assistant router imported as github_router")
        else:
            logger.warning("⚠️ github_assistant __init__.py does not exist")
    except Exception as e:
        logger.error(f"❌ Failed to import github_assistant: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
    
    try:
        logger.info("Attempting to import consulting_frameworks router...")
        if os.path.exists('routers/consulting_frameworks/__init__.py'):
            # Import the correctly named router from the package
            from routers.consulting_frameworks import router as frameworks_router
            imported_routers['frameworks_router'] = frameworks_router
            logger.info("✅ consulting_frameworks router imported as frameworks_router")
        else:
            logger.warning("⚠️ consulting_frameworks __init__.py does not exist")
    except Exception as e:
        logger.error(f"❌ Failed to import consulting_frameworks: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
    
    # Set variables for the routers that imported successfully
    basic_router = imported_routers.get('basic_router')
    moe_router = imported_routers.get('moe_router')
    rag_router = imported_routers.get('rag_router')
    consulting_router = imported_routers.get('consulting_router')
    github_router = imported_routers.get('github_router')
    catalant_router = imported_routers.get('catalant_router')
    claude_router = imported_routers.get('claude_router')
    frameworks_router = imported_routers.get('frameworks_router')
    
    logger.info(f"✅ Successfully imported {len(imported_routers)} routers")
    
except ImportError as e:
    logger.error(f"❌ Router import error: {e}")
    logger.error(f"Full traceback: {traceback.format_exc()}")
    sys.exit(1)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger.info("🚀 Starting up LMA Chat API...")
    if FIREBASE_IS_AVAILABLE:
        logger.info("🔐 Firebase Authentication: Enabled")
    else:
        logger.warning("🔐 Firebase Authentication: Disabled")
    yield
    # Shutdown logic
    logger.info("⛔ Shutting down LMA Chat API.")

# Define middleware list to pass to FastAPI constructor
middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    ),
    # Remove the custom authentication middleware from here for now
]

# Create the FastAPI app instance
app = FastAPI(
    title="LMA Chat API (Refactored)",
    description="API with Google GenAI, MOE, RAG, Firebase Auth, and more. Now in a scalable structure.",
    version="3.0.0",
    lifespan=lifespan,
    middleware=middleware
)

# Add the authentication middleware after app creation
logger.info("Adding authentication middleware...")
try:
    # Try to use the class-based middleware first
    try:
        app.add_middleware(AuthenticationMiddleware)
        logger.info("✅ Authentication middleware (class) added successfully")
    except NameError:
        # Fall back to function-based middleware with wrapper
        from starlette.middleware.base import BaseHTTPMiddleware
        
        class AuthMiddlewareWrapper(BaseHTTPMiddleware):
            async def dispatch(self, request: Request, call_next):
                return await authenticate_request(request, call_next)
        
        app.add_middleware(AuthMiddlewareWrapper)
        logger.info("✅ Authentication middleware (function wrapper) added successfully")
except Exception as e:
    logger.error(f"❌ Failed to add authentication middleware: {e}")
    logger.warning("⚠️ Continuing without authentication middleware")

# Include Routers
try:
    # All auth-related routes are now in their own module
    logger.info(f"DEBUG: Type of auth_router before inclusion: {type(auth_router)}")
    logger.info(f"DEBUG: Routes in auth_router before inclusion: {auth_router.routes}")
    
    app.include_router(auth_router, prefix="/auth")
    
    # Include other routers only if they were successfully imported
    if basic_router:
        app.include_router(basic_router, prefix="/basic", tags=["Basic Chat"])
    if moe_router:
        app.include_router(moe_router, prefix="/moe_chat", tags=["MOE Chat"])
    if rag_router:
        app.include_router(rag_router, prefix="/rag_chat", tags=["RAG Chat"])
    if consulting_router:
        app.include_router(consulting_router, prefix="/consulting", tags=["Consulting"])
    if github_router:
        app.include_router(github_router, prefix="/github_assistant", tags=["GitHub Assistant"])
    if catalant_router:
        app.include_router(catalant_router, prefix="/catalant", tags=["Catalant"])
    if claude_router:
        app.include_router(claude_router, prefix="/claude", tags=["Claude Chat"])
    if frameworks_router:
        app.include_router(frameworks_router, prefix="/frameworks", tags=["Consulting Frameworks"])
    
    logger.info("✅ All available routers included successfully")
except Exception as e:
    logger.error(f"❌ Error including routers: {e}")
    sys.exit(1)

@app.get("/", tags=["System"])
def root():
    """Root endpoint providing basic API information."""
    return {
        "message": "Welcome to the LMA Chat API!",
        "version": "3.0.0",
        "authentication_status": "enabled" if FIREBASE_IS_AVAILABLE else "disabled",
        "docs": "/docs"
    }

@app.get("/health", tags=["System"])
def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy", "firebase_available": FIREBASE_IS_AVAILABLE}

# Add a debug endpoint to list routes for verification
@app.get("/debug/routes", tags=["System"])
def debug_routes():
    """Lists all registered routes for debugging purposes."""
    routes_info = []
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            routes_info.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else [],
                "name": route.name
            })
    return {"total_routes": len(routes_info), "routes": routes_info}

logger.info("✅ Application setup complete. All middleware and routers are configured.")

# Add this for Cloud Run deployment
if __name__ == "__main__":
    import uvicorn
    
    port = int(os.environ.get("PORT", 8080))
    log_level = os.environ.get("LOG_LEVEL", "info")
    
    logger.info(f"🚀 Starting server on port {port}")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level=log_level,
        access_log=True,
        reload=False  # Don't use reload in production
    )