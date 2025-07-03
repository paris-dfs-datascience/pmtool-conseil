from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Literal, Union
from datetime import datetime
from enum import Enum

class GitHubActionType(str, Enum):
    """Types of GitHub actions"""
    CREATE_FILE = "create_file"
    CREATE_PR = "create_pr"
    GET_REPO_INFO = "get_repo_info"
    LIST_FILES = "list_files"
    ANALYZE_REPO = "analyze_repo"

class GitHubActionStatus(str, Enum):
    """Status of GitHub actions"""
    PENDING = "pending"
    SUGGESTED = "suggested"
    COMPLETED = "completed"
    FAILED = "failed"

class CodeBlock(BaseModel):
    """Code block extracted from assistant response"""
    language: str = Field(..., description="Programming language")
    code: str = Field(..., min_length=1, description="Code content")
    filename: Optional[str] = Field(None, description="Suggested filename")
    description: Optional[str] = Field(None, description="Code description")
    
    @validator('code')
    def validate_code(cls, v):
        if not v or not v.strip():
            raise ValueError("Code content cannot be empty")
        return v.strip()

class GitHubAction(BaseModel):
    """GitHub action suggestion from assistant"""
    type: GitHubActionType = Field(..., description="Type of GitHub action")
    status: GitHubActionStatus = Field(default=GitHubActionStatus.PENDING, description="Action status")
    details: Optional[Dict[str, Any]] = Field(None, description="Action details")
    error: Optional[str] = Field(None, description="Error message if failed")

class GitHubMessage(BaseModel):
    """Message in GitHub assistant conversation"""
    role: Literal["user", "assistant", "system"] = Field(..., description="Message role")
    content: str = Field(..., min_length=1, description="Message content")
    timestamp: Optional[datetime] = Field(default_factory=datetime.now, description="Message timestamp")
    
    @validator('content')
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError("Message content cannot be empty")
        return v.strip()

class GitHubChatRequest(BaseModel):
    """Request for GitHub code assistant chat"""
    message: str = Field(..., min_length=1, max_length=50000, description="User message")
    conversation_history: List[GitHubMessage] = Field(default=[], description="Previous conversation")
    repository_url: Optional[str] = Field(None, description="GitHub repository URL for context")
    github_context: Optional[Dict[str, Any]] = Field(None, description="Additional GitHub context")
    stream: bool = Field(default=True, description="Stream response")
    temperature: Optional[float] = Field(default=0.1, ge=0.0, le=2.0, description="Model temperature")
    max_tokens: Optional[int] = Field(default=4000, gt=0, le=8192, description="Maximum tokens")
    
    @validator('message')
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()
    
    @validator('repository_url')
    def validate_repo_url(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Repository URL cannot be empty string")
        return v.strip() if v else None

class GitHubChatResponse(BaseModel):
    """Response from GitHub code assistant chat"""
    message: str = Field(..., description="Assistant response")
    sender: Literal["assistant"] = Field(default="assistant", description="Response sender")
    timestamp: datetime = Field(default_factory=datetime.now, description="Response timestamp")
    code_blocks: Optional[List[CodeBlock]] = Field(None, description="Extracted code blocks")
    github_action: Optional[GitHubAction] = Field(None, description="Suggested GitHub action")
    session_id: Optional[str] = Field(None, description="Session identifier")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

class GitHubFileCreateRequest(BaseModel):
    """Request to create a file in GitHub repository"""
    repository_url: str = Field(..., description="GitHub repository URL")
    file_path: str = Field(..., min_length=1, description="File path in repository")
    content: str = Field(..., description="File content")
    commit_message: str = Field(..., min_length=1, max_length=500, description="Commit message")
    branch: str = Field(default="main", description="Target branch")
    
    @validator('file_path')
    def validate_file_path(cls, v):
        if not v or not v.strip():
            raise ValueError("File path cannot be empty")
        if v.startswith('/'):
            raise ValueError("File path cannot start with '/'")
        return v.strip()
    
    @validator('commit_message')
    def validate_commit_message(cls, v):
        if not v or not v.strip():
            raise ValueError("Commit message cannot be empty")
        return v.strip()

class GitHubPRCreateRequest(BaseModel):
    """Request to create a pull request"""
    repository_url: str = Field(..., description="GitHub repository URL")
    title: str = Field(..., min_length=1, max_length=200, description="PR title")
    body: str = Field(..., description="PR description")
    head_branch: str = Field(..., min_length=1, description="Source branch")
    base_branch: str = Field(default="main", description="Target branch")
    draft: bool = Field(default=False, description="Create as draft PR")
    
    @validator('title')
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError("PR title cannot be empty")
        return v.strip()
    
    @validator('head_branch', 'base_branch')
    def validate_branch_names(cls, v):
        if not v or not v.strip():
            raise ValueError("Branch name cannot be empty")
        return v.strip()

class GitHubRepoInfo(BaseModel):
    """GitHub repository information"""
    name: str = Field(..., description="Repository name")
    full_name: str = Field(..., description="Full repository name (owner/repo)")
    description: Optional[str] = Field(None, description="Repository description")
    language: Optional[str] = Field(None, description="Primary language")
    default_branch: str = Field(..., description="Default branch name")
    private: bool = Field(..., description="Is repository private")
    owner: str = Field(..., description="Repository owner")
    html_url: Optional[str] = Field(None, description="Repository URL")
    clone_url: Optional[str] = Field(None, description="Clone URL")
    stars: Optional[int] = Field(None, description="Star count")
    forks: Optional[int] = Field(None, description="Fork count")

class GitHubFileInfo(BaseModel):
    """GitHub file information"""
    name: str = Field(..., description="File name")
    path: str = Field(..., description="File path")
    type: Literal["file", "dir"] = Field(..., description="File type")
    size: Optional[int] = Field(None, description="File size in bytes")
    sha: Optional[str] = Field(None, description="File SHA")
    download_url: Optional[str] = Field(None, description="Download URL")

class GitHubFileContent(BaseModel):
    """GitHub file content"""
    path: str = Field(..., description="File path")
    name: str = Field(..., description="File name")
    content: str = Field(..., description="File content")
    sha: str = Field(..., description="File SHA")
    size: int = Field(..., description="File size")
    encoding: str = Field(default="utf-8", description="Content encoding")

class RateLimitInfo(BaseModel):
    """GitHub API rate limit information"""
    limit: int = Field(..., description="Rate limit")
    remaining: int = Field(..., description="Remaining requests")
    reset: int = Field(..., description="Reset timestamp")
    used: int = Field(..., description="Used requests")
    resource: str = Field(default="core", description="API resource")

class GitHubAPIResponse(BaseModel):
    """Standard GitHub API response wrapper"""
    success: bool = Field(..., description="Operation success")
    data: Optional[Union[Dict[str, Any], List[Dict[str, Any]]]] = Field(None, description="Response data")
    error: Optional[str] = Field(None, description="Error message")
    status_code: Optional[int] = Field(None, description="HTTP status code")
    rate_limit: Optional[RateLimitInfo] = Field(None, description="Rate limit info")
    retry_after: Optional[int] = Field(None, description="Retry after seconds")

class GitHubServiceStatus(BaseModel):
    """GitHub service status information"""
    status: Literal["operational", "degraded", "error"] = Field(..., description="Service status")
    service: str = Field(default="GitHub Code Assistant", description="Service name")
    model: str = Field(..., description="AI model name")
    platform: str = Field(..., description="Platform name")
    capabilities: List[str] = Field(default=[], description="Service capabilities")
    configuration: Dict[str, Any] = Field(default={}, description="Configuration details")

class RepositoryStructure(BaseModel):
    """Repository structure analysis"""
    repository_info: GitHubRepoInfo = Field(..., description="Basic repository info")
    languages: Dict[str, int] = Field(default={}, description="Language statistics")
    readme_content: Optional[str] = Field(None, description="README content preview")
    root_structure: List[GitHubFileInfo] = Field(default=[], description="Root directory structure")
    total_files: Optional[int] = Field(None, description="Total file count")