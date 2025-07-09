"""
Claude Code Assistant Package

A comprehensive GitHub integration package for FastAPI applications.
Provides AI-powered code assistance with GitHub repository management and leverages Claude
"""

from .github_models import (
    # Core models
    GitHubChatRequest,
    GitHubChatResponse,
    GitHubMessage,
    CodeBlock,
    GitHubAction,
    
    # File operations
    GitHubFileCreateRequest,
    GitHubPRCreateRequest,
    GitHubFileContent,
    GitHubFileInfo,
    
    # Repository models
    GitHubRepoInfo,
    RepositoryStructure,
    RateLimitInfo,
    
    # Status and responses
    GitHubServiceStatus,
    GitHubAPIResponse,
    
    # Enums
    GitHubActionType,
    GitHubActionStatus,
)

from .github_exceptions import (
    GitHubAPIError,
    GitHubConfigurationError,
    GitHubValidationError,
    ModelAPIError,
    RateLimitExceededError,
)

from .github_client import GitHubClient
from .claude_client import ClaudeClient
from .github_service import GitHubService
from .github_routes import router as github_router

# Export with both names for compatibility
claude_assistant_router = github_router

__version__ = "1.0.0"
__author__ = "GitHub Code Assistant Team"
__description__ = "AI-powered GitHub integration for FastAPI"

# Export the main router for easy integration
__all__ = [
    # Routers
    "github_router",
    "claude_assistant_router",  # Added this
    
    # Core classes
    "GitHubClient",
    "ClaudeClient", 
    "GitHubService",
    
    # Models
    "GitHubChatRequest",
    "GitHubChatResponse",
    "GitHubMessage",
    "CodeBlock",
    "GitHubAction",
    "GitHubFileCreateRequest",
    "GitHubPRCreateRequest",
    "GitHubFileContent",
    "GitHubFileInfo",
    "GitHubRepoInfo",
    "RepositoryStructure",
    "RateLimitInfo",
    "GitHubServiceStatus",
    "GitHubAPIResponse",
    
    # Enums
    "GitHubActionType",
    "GitHubActionStatus",
    
    # Exceptions
    "GitHubAPIError",
    "GitHubConfigurationError",
    "GitHubValidationError",
    "ModelAPIError",
    "RateLimitExceededError",
]