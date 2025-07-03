"""
GitHub Code Assistant Package

A comprehensive GitHub integration package for FastAPI applications.
Provides AI-powered code assistance with GitHub repository management.
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
from .mistral_client import MistralClient
from .github_service import GitHubService
from .github_routes import router as github_router

__version__ = "1.0.0"
__author__ = "GitHub Code Assistant Team"
__description__ = "AI-powered GitHub integration for FastAPI"

# Export the main router for easy integration
__all__ = [
    # Router
    "github_router",
    
    # Core classes
    "GitHubClient",
    "MistralClient", 
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