import os
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv

try:
    from google.cloud import secretmanager
    SECRET_MANAGER_AVAILABLE = True
except ImportError:
    SECRET_MANAGER_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Secret Manager not available, falling back to environment variables")

from .github_service import GitHubService
from .github_models import (
    GitHubChatRequest, GitHubChatResponse, GitHubFileCreateRequest,
    GitHubPRCreateRequest, GitHubServiceStatus
)
from .github_exceptions import (
    GitHubAPIError, GitHubConfigurationError, GitHubValidationError,
    ModelAPIError, RateLimitExceededError
)

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Create router WITHOUT prefix since we want routes to be directly under /claude_assistant
router = APIRouter(tags=["Claude Code Assistant"])

# Configuration - only keep what we need
PROJECT_ID = os.getenv("PROJECT_ID", "lma-website-461920")

# Initialize service
github_service: Optional[GitHubService] = None

def get_github_token_from_secret_manager() -> str:
    """Get GitHub token from Google Cloud Secret Manager"""
    # First try Secret Manager if available
    if SECRET_MANAGER_AVAILABLE:
        try:
            client = secretmanager.SecretManagerServiceClient()
            secret_name = f"projects/{PROJECT_ID}/secrets/GITHUB_TOKEN/versions/latest"
            
            response = client.access_secret_version(request={"name": secret_name})
            github_token = response.payload.data.decode("UTF-8")
            
            logger.info("✅ GitHub token retrieved from Secret Manager")
            return github_token
            
        except Exception as e:
            logger.error(f"❌ Failed to get GitHub token from Secret Manager: {e}")
    
    # Fallback to environment variable
    token = os.getenv("GITHUB_TOKEN")
    if token:
        logger.info("✅ GitHub token retrieved from environment variable")
        return token
    else:
        raise GitHubConfigurationError(
            "GitHub token not found in Secret Manager or environment variables",
            missing_config="GITHUB_TOKEN"
        )

def get_github_service() -> GitHubService:
    """Get or create GitHub service instance"""
    global github_service
    
    if github_service is None:
        try:
            github_token = get_github_token_from_secret_manager()
            
            # Simplified - only pass GitHub token
            github_service = GitHubService(github_token=github_token)
            
            logger.info("GitHub service created successfully")
            
        except Exception as e:
            logger.error(f"Failed to create GitHub service: {e}")
            raise
    
    return github_service

def handle_github_error(error: Exception) -> HTTPException:
    """Convert GitHub exceptions to HTTP exceptions"""
    if isinstance(error, RateLimitExceededError):
        return HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "message": str(error),
                "retry_after": error.retry_after,
                "rate_limit_remaining": error.rate_limit_remaining
            }
        )
    elif isinstance(error, GitHubValidationError):
        return HTTPException(
            status_code=400,
            detail={
                "error": "Validation error",
                "message": str(error),
                "field": error.field,
                "value": error.value
            }
        )
    elif isinstance(error, GitHubConfigurationError):
        return HTTPException(
            status_code=500,
            detail={
                "error": "Configuration error",
                "message": str(error),
                "missing_config": error.missing_config
            }
        )
    elif isinstance(error, GitHubAPIError):
        return HTTPException(
            status_code=error.status_code,
            detail={
                "error": "GitHub API error",
                "message": str(error),
                "rate_limit_remaining": error.rate_limit_remaining
            }
        )
    elif isinstance(error, ModelAPIError):
        return HTTPException(
            status_code=error.status_code,
            detail={
                "error": "Model API error",
                "message": str(error),
                "model": error.model
            }
        )
    else:
        logger.error(f"Unexpected error: {error}")
        return HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "message": "An unexpected error occurred"
            }
        )

@router.get("/test")
async def test_router():
    """Test endpoint to verify Claude assistant router is working"""
    return {
        "message": "Claude Code Assistant test successful!",
        "status": "working",
        "router": "claude_assistant",
        "timestamp": datetime.now().isoformat(),
        "configuration": {
            "github_token_configured": os.getenv("GITHUB_TOKEN") is not None
        }
    }

@router.post("/chat", response_model=GitHubChatResponse)
async def github_chat(request: GitHubChatRequest):
    """Claude Code Assistant chat endpoint"""
    try:
        service = get_github_service()
        
        if request.stream:
            return StreamingResponse(
                service.stream_chat(request),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Content-Type": "text/event-stream"
                }
            )
        else:
            response = await service.chat(request)
            return response
            
    except Exception as e:
        raise handle_github_error(e)

@router.post("/create-file")
async def create_file(request: GitHubFileCreateRequest):
    """Create a file in GitHub repository"""
    try:
        service = get_github_service()
        result = await service.create_file(request)
        return JSONResponse(content=result)
        
    except Exception as e:
        raise handle_github_error(e)

@router.post("/create-pr")
async def create_pull_request(request: GitHubPRCreateRequest):
    """Create a pull request in GitHub repository"""
    try:
        service = get_github_service()
        result = await service.create_pull_request(request)
        return JSONResponse(content=result)
        
    except Exception as e:
        raise handle_github_error(e)

@router.get("/repo-info")
async def get_repo_info(repo_url: str = Query(..., description="GitHub repository URL")):
    """Get repository information"""
    try:
        service = get_github_service()
        repo_info = await service.get_repo_info(repo_url)
        return JSONResponse(content=repo_info)
        
    except Exception as e:
        raise handle_github_error(e)

@router.get("/repo-structure")
async def analyze_repo_structure(repo_url: str = Query(..., description="GitHub repository URL")):
    """Analyze repository structure for AI context"""
    try:
        service = get_github_service()
        structure = await service.get_repo_structure(repo_url)
        return JSONResponse(content=structure.dict())
        
    except Exception as e:
        raise handle_github_error(e)

@router.get("/repo-languages")
async def get_repo_languages(repo_full_name: str = Query(..., description="Repository full name (owner/repo)")):
    """Get repository languages"""
    try:
        service = get_github_service()
        languages = await service.get_repo_languages(repo_full_name)
        return JSONResponse(content=languages)
        
    except Exception as e:
        raise handle_github_error(e)

@router.get("/repo-files")
async def get_repo_files(
    repo_full_name: str = Query(..., description="Repository full name (owner/repo)"),
    path: str = Query("", description="Path within repository")
):
    """Get repository files and folders"""
    try:
        service = get_github_service()
        files = await service.get_repo_files(repo_full_name, path)
        return JSONResponse(content=files)
        
    except Exception as e:
        raise handle_github_error(e)

@router.get("/file-content")
async def get_file_content(
    repo_full_name: str = Query(..., description="Repository full name (owner/repo)"),
    file_path: str = Query(..., description="File path within repository")
):
    """Get content of a specific file"""
    try:
        service = get_github_service()
        content = await service.get_file_content(repo_full_name, file_path)
        return JSONResponse(content=content)
        
    except Exception as e:
        raise handle_github_error(e)

@router.get("/user")
async def get_github_user():
    """Get current GitHub user information"""
    try:
        service = get_github_service()
        user_info = await service.get_user_info()
        return JSONResponse(content=user_info)
        
    except Exception as e:
        raise handle_github_error(e)

@router.get("/repositories")
async def get_github_repositories():
    """Get user's GitHub repositories"""
    try:
        service = get_github_service()
        repositories = await service.get_user_repositories()
        return JSONResponse(content=repositories)
        
    except Exception as e:
        raise handle_github_error(e)

@router.get("/status", response_model=GitHubServiceStatus)
async def github_status():
    """Get comprehensive Claude assistant service status"""
    try:
        service = get_github_service()
        status = await service.get_service_status()
        
        if status.status == "operational":
            return JSONResponse(content=status.dict())
        else:
            return JSONResponse(
                status_code=503 if status.status == "error" else 200,
                content=status.dict()
            )
            
    except GitHubConfigurationError as e:
        # Service not configured properly
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "service": "Claude Code Assistant",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "configuration": {
                    "github_token_configured": False,
                    "missing_config": e.missing_config if hasattr(e, 'missing_config') else None
                }
            }
        )
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "service": "Claude Code Assistant",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "configuration": {
                    "github_token_configured": False
                }
            }
        )

# Log router setup
logger.info(f"✅ Claude Code Assistant router setup complete. Total routes: {len(router.routes)}")

# Log all registered routes for debugging
for i, route in enumerate(router.routes):
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        logger.info(f"  Route {i}: {list(route.methods)} {route.path}")