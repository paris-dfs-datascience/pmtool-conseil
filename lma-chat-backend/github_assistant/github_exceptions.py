from typing import Optional
from dataclasses import dataclass

@dataclass
class GitHubAPIError(Exception):
    """Custom exception for GitHub API errors"""
    status_code: int
    message: str
    rate_limit_remaining: Optional[int] = None
    rate_limit_reset: Optional[int] = None
    retry_after: Optional[int] = None
    request_id: Optional[str] = None
    
    def __str__(self):
        return f"GitHub API Error {self.status_code}: {self.message}"
    
    def __repr__(self):
        return (f"GitHubAPIError(status_code={self.status_code}, "
                f"message='{self.message}', "
                f"rate_limit_remaining={self.rate_limit_remaining})")

@dataclass 
class GitHubConfigurationError(Exception):
    """Exception for GitHub configuration issues"""
    message: str
    missing_config: Optional[str] = None
    
    def __str__(self):
        return f"GitHub Configuration Error: {self.message}"

@dataclass
class GitHubValidationError(Exception):
    """Exception for GitHub request validation errors"""
    message: str
    field: Optional[str] = None
    value: Optional[str] = None
    
    def __str__(self):
        if self.field:
            return f"GitHub Validation Error in '{self.field}': {self.message}"
        return f"GitHub Validation Error: {self.message}"

@dataclass
class ModelAPIError(Exception):
    """Exception for AI model API errors"""
    status_code: int
    message: str
    model: Optional[str] = None
    request_id: Optional[str] = None
    
    def __str__(self):
        model_info = f" (model: {self.model})" if self.model else ""
        return f"Model API Error {self.status_code}: {self.message}{model_info}"

@dataclass
class RateLimitExceededError(GitHubAPIError):
    """Specific exception for rate limit exceeded"""
    reset_time: Optional[int] = None
    
    def __str__(self):
        if self.reset_time:
            return f"GitHub Rate Limit Exceeded: {self.message} (resets at {self.reset_time})"
        return f"GitHub Rate Limit Exceeded: {self.message}"