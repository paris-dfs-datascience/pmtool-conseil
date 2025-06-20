from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, AsyncGenerator
import json
import logging
import asyncio
import re
from datetime import datetime, timedelta
import os
import base64
import google.auth
from google.auth.transport.requests import Request
import httpx
from dataclasses import dataclass
import time

# Add dotenv import at the top
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# CREATE ROUTER IMMEDIATELY - THIS IS THE KEY FIX!
router = APIRouter()
logger.info("✅ GitHub router created successfully")

# GCP Configuration
PROJECT_ID = os.getenv("PROJECT_ID", "lma-website-461920")
REGION = os.getenv("REGION", "us-central1") 
MODEL = os.getenv("MODEL", "codestral-2501")

# GitHub API configuration - now will load from .env
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API_BASE = "https://api.github.com"

# Log whether token was loaded (without exposing it)
if GITHUB_TOKEN:
    logger.info("GitHub token loaded successfully")
else:
    logger.warning("GitHub token not found in environment variables")

# Rate limiting configuration
RATE_LIMIT_CACHE = {}
RATE_LIMIT_RESET_TIME = {}

@dataclass
class GitHubAPIError(Exception):
    """Custom exception for GitHub API errors"""
    status_code: int
    message: str
    rate_limit_remaining: Optional[int] = None
    rate_limit_reset: Optional[int] = None
    retry_after: Optional[int] = None
    
    def __str__(self):
        return f"GitHub API Error {self.status_code}: {self.message}"

@dataclass 
class RateLimitInfo:
    """Rate limit information from GitHub API"""
    limit: int
    remaining: int
    reset: int
    used: int
    resource: str = "core"

def parse_rate_limit_headers(headers: dict) -> RateLimitInfo:
    """Parse rate limit information from GitHub API response headers"""
    return RateLimitInfo(
        limit=int(headers.get('x-ratelimit-limit', 5000)),
        remaining=int(headers.get('x-ratelimit-remaining', 0)),
        reset=int(headers.get('x-ratelimit-reset', 0)),
        used=int(headers.get('x-ratelimit-used', 0)),
        resource=headers.get('x-ratelimit-resource', 'core')
    )

def check_rate_limit(rate_limit_info: RateLimitInfo) -> Optional[int]:
    """Check if we're approaching rate limits and return wait time if needed"""
    current_time = int(time.time())
    
    # If we have very few requests remaining, wait until reset
    if rate_limit_info.remaining < 10:
        wait_time = max(0, rate_limit_info.reset - current_time)
        logger.warning(f"Rate limit nearly exhausted. Remaining: {rate_limit_info.remaining}, Reset in: {wait_time}s")
        return wait_time
    
    # If we're using requests rapidly, add a small delay
    if rate_limit_info.remaining < 100:
        logger.info(f"Rate limit getting low. Remaining: {rate_limit_info.remaining}")
        return 1  # Small delay
    
    return None

async def make_github_request(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    headers: dict,
    json_data: Optional[dict] = None,
    timeout: float = 30.0
) -> dict:
    """Make a GitHub API request with comprehensive error handling and rate limiting"""
    try:
        # Make the request
        if method.upper() == "GET":
            response = await client.get(url, headers=headers, timeout=timeout)
        elif method.upper() == "POST":
            response = await client.post(url, headers=headers, json=json_data, timeout=timeout)
        elif method.upper() == "PUT":
            response = await client.put(url, headers=headers, json=json_data, timeout=timeout)
        elif method.upper() == "DELETE":
            response = await client.delete(url, headers=headers, timeout=timeout)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        # Parse rate limit info
        rate_limit_info = parse_rate_limit_headers(response.headers)
        
        # Log rate limit status
        logger.info(f"GitHub API Rate Limit - Remaining: {rate_limit_info.remaining}/{rate_limit_info.limit}")
        
        # Handle different response status codes
        if response.status_code == 200 or response.status_code == 201:
            # Check if we should slow down for future requests
            wait_time = check_rate_limit(rate_limit_info)
            if wait_time:
                logger.info(f"Adding {wait_time}s delay for rate limit management")
                await asyncio.sleep(wait_time)
            
            return {
                "success": True,
                "data": response.json(),
                "rate_limit": rate_limit_info.__dict__
            }
        
        elif response.status_code == 304:
            # Not modified
            return {
                "success": True,
                "data": None,
                "message": "Not modified",
                "rate_limit": rate_limit_info.__dict__
            }
        
        elif response.status_code == 403:
            # Rate limit exceeded or forbidden
            if rate_limit_info.remaining == 0:
                reset_time = datetime.fromtimestamp(rate_limit_info.reset)
                wait_seconds = rate_limit_info.reset - int(time.time())
                
                raise GitHubAPIError(
                    status_code=403,
                    message=f"GitHub API rate limit exceeded. Resets at {reset_time} (in {wait_seconds} seconds)",
                    rate_limit_remaining=rate_limit_info.remaining,
                    rate_limit_reset=rate_limit_info.reset,
                    retry_after=wait_seconds
                )
            else:
                # Other forbidden error
                error_detail = "Access forbidden"
                try:
                    error_data = response.json()
                    error_detail = error_data.get('message', error_detail)
                except:
                    pass
                
                raise GitHubAPIError(
                    status_code=403,
                    message=f"GitHub API access forbidden: {error_detail}",
                    rate_limit_remaining=rate_limit_info.remaining
                )
        
        elif response.status_code == 404:
            # Not found
            error_detail = "Resource not found"
            try:
                error_data = response.json()
                error_detail = error_data.get('message', error_detail)
            except:
                pass
            
            raise GitHubAPIError(
                status_code=404,
                message=f"GitHub API resource not found: {error_detail}",
                rate_limit_remaining=rate_limit_info.remaining
            )
        
        elif response.status_code == 401:
            # Unauthorized
            raise GitHubAPIError(
                status_code=401,
                message="GitHub API authentication failed. Check your GitHub token.",
                rate_limit_remaining=rate_limit_info.remaining
            )
        
        elif response.status_code == 422:
            # Validation failed
            error_detail = "Validation failed"
            try:
                error_data = response.json()
                if 'errors' in error_data:
                    error_messages = [error.get('message', '') for error in error_data['errors']]
                    error_detail = '; '.join(error_messages)
                else:
                    error_detail = error_data.get('message', error_detail)
            except:
                pass
            
            raise GitHubAPIError(
                status_code=422,
                message=f"GitHub API validation error: {error_detail}",
                rate_limit_remaining=rate_limit_info.remaining
            )
        
        elif response.status_code >= 500:
            # Server error
            raise GitHubAPIError(
                status_code=response.status_code,
                message=f"GitHub API server error: {response.status_code}",
                rate_limit_remaining=rate_limit_info.remaining
            )
        
        else:
            # Other client errors
            error_detail = f"HTTP {response.status_code}"
            try:
                error_data = response.json()
                error_detail = error_data.get('message', error_detail)
            except:
                pass
            
            raise GitHubAPIError(
                status_code=response.status_code,
                message=f"GitHub API error: {error_detail}",
                rate_limit_remaining=rate_limit_info.remaining
            )
            
    except httpx.TimeoutException:
        raise GitHubAPIError(
            status_code=408,
            message="GitHub API request timed out"
        )
    except httpx.NetworkError as e:
        raise GitHubAPIError(
            status_code=503,
            message=f"Network error connecting to GitHub API: {str(e)}"
        )
    except httpx.HTTPError as e:
        raise GitHubAPIError(
            status_code=500,
            message=f"HTTP error: {str(e)}"
        )

def validate_github_token():
    """Validate GitHub token is present and warn if missing"""
    if not GITHUB_TOKEN:
        logger.error("GitHub token not found in environment variables")
        raise HTTPException(
            status_code=400, 
            detail={
                "error": "GitHub integration not configured",
                "message": "GITHUB_TOKEN environment variable is required",
                "solution": "Add your GitHub personal access token to the .env file"
            }
        )

def validate_repo_url(repo_url: str) -> tuple[str, str]:
    """Validate and parse GitHub repository URL"""
    if not repo_url:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Repository URL required",
                "message": "Please provide a valid GitHub repository URL"
            }
        )
    
    # Clean up URL
    repo_url = repo_url.strip()
    if repo_url.endswith('/'):
        repo_url = repo_url[:-1]
    
    # Extract owner/repo from URL
    patterns = [
        r'github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$',  # HTTPS
        r'git@github\.com:([^/]+)/([^/]+?)(?:\.git)?/?$',  # SSH
    ]
    
    for pattern in patterns:
        match = re.search(pattern, repo_url)
        if match:
            owner, repo = match.groups()
            # Clean repo name
            repo = repo.replace('.git', '')
            return owner, repo
    
    raise HTTPException(
        status_code=400,
        detail={
            "error": "Invalid GitHub repository URL",
            "message": f"Could not parse repository URL: {repo_url}",
            "examples": [
                "https://github.com/owner/repo",
                "https://github.com/owner/repo.git",
                "git@github.com:owner/repo.git"
            ]
        }
    )

def get_access_token() -> str:
    """Get Google Cloud access token"""
    try:
        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        credentials.refresh(Request())
        return credentials.token
    except Exception as e:
        logger.error(f"Error getting access token: {e}")
        raise

def build_codestral_url(project_id: str, region: str, model: str) -> str:
    """Build Mistral Codestral Model Garden URL"""
    return f"https://{region}-aiplatform.googleapis.com/v1/projects/{project_id}/locations/{region}/publishers/mistralai/models/{model}:rawPredict"

# Pydantic models
class CodeBlock(BaseModel):
    language: str
    code: str
    filename: Optional[str] = None
    description: Optional[str] = None

class GitHubAction(BaseModel):
    type: str  # 'create_file', 'create_pr', 'get_repo_info', 'list_files'
    status: str = "pending"  # 'pending', 'completed', 'failed'
    details: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[datetime] = None

class GitHubChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = []
    repository_url: Optional[str] = None
    github_context: Optional[Dict[str, Any]] = None
    stream: bool = True

class GitHubChatResponse(BaseModel):
    message: str
    sender: str = "assistant"
    timestamp: datetime = Field(default_factory=datetime.now)
    code_blocks: Optional[List[CodeBlock]] = None
    github_action: Optional[GitHubAction] = None
    session_id: Optional[str] = None

class GitHubFileCreateRequest(BaseModel):
    repository_url: str
    file_path: str
    content: str
    commit_message: str
    branch: Optional[str] = "main"

class GitHubPRCreateRequest(BaseModel):
    repository_url: str
    title: str
    body: str
    head_branch: str
    base_branch: str = "main"

# Enhanced GitHub API functions
async def get_github_repo_info(repo_url: str) -> Dict[str, Any]:
    """Get basic repository information from GitHub API with enhanced error handling"""
    try:
        validate_github_token()
        owner, repo = validate_repo_url(repo_url)
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Code-Assistant/1.0"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            result = await make_github_request(
                client, "GET", f"{GITHUB_API_BASE}/repos/{owner}/{repo}", headers
            )
            
            if result["success"]:
                repo_data = result["data"]
                return {
                    "success": True,
                    "name": repo_data["name"],
                    "full_name": repo_data["full_name"],
                    "description": repo_data.get("description"),
                    "language": repo_data.get("language"),
                    "languages_url": repo_data["languages_url"],
                    "default_branch": repo_data["default_branch"],
                    "private": repo_data["private"],
                    "owner": repo_data["owner"]["login"],
                    "rate_limit": result["rate_limit"]
                }
            else:
                return {"success": False, "error": "Unexpected response format"}
                
    except GitHubAPIError as e:
        logger.error(f"GitHub API error getting repo info: {e}")
        return {
            "success": False,
            "error": str(e),
            "status_code": e.status_code,
            "rate_limit_remaining": e.rate_limit_remaining,
            "retry_after": e.retry_after
        }
    except HTTPException:
        raise  # Re-raise HTTPExceptions
    except Exception as e:
        logger.error(f"Unexpected error getting repo info: {e}")
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "status_code": 500
        }

async def create_github_file(request: GitHubFileCreateRequest) -> Dict[str, Any]:
    """Create a file in GitHub repository with enhanced error handling"""
    try:
        validate_github_token()
        owner, repo = validate_repo_url(request.repository_url)
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Code-Assistant/1.0"
        }
        
        # Validate file path
        if not request.file_path or request.file_path.startswith('/'):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid file path",
                    "message": "File path cannot be empty or start with '/'"
                }
            )
        
        # Encode content to base64
        try:
            content_encoded = base64.b64encode(request.content.encode('utf-8')).decode('utf-8')
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Content encoding error",
                    "message": f"Failed to encode file content: {str(e)}"
                }
            )
        
        payload = {
            "message": request.commit_message,
            "content": content_encoded,
            "branch": request.branch
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:  # Longer timeout for file creation
            result = await make_github_request(
                client, "PUT", 
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{request.file_path}",
                headers, payload
            )
            
            if result["success"]:
                return {
                    "success": True,
                    "data": result["data"],
                    "rate_limit": result["rate_limit"]
                }
            else:
                return {"success": False, "error": "Unexpected response format"}
                
    except GitHubAPIError as e:
        logger.error(f"GitHub API error creating file: {e}")
        return {
            "success": False,
            "error": str(e),
            "status_code": e.status_code,
            "rate_limit_remaining": e.rate_limit_remaining,
            "retry_after": e.retry_after
        }
    except HTTPException:
        raise  # Re-raise HTTPExceptions
    except Exception as e:
        logger.error(f"Unexpected error creating file: {e}")
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "status_code": 500
        }

async def get_file_content(repo_full_name: str, file_path: str) -> Dict[str, Any]:
    """Get content of a specific file"""
    try:
        validate_github_token()
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Code-Assistant/1.0"
        }
        
        url = f"{GITHUB_API_BASE}/repos/{repo_full_name}/contents/{file_path}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            result = await make_github_request(client, "GET", url, headers)
            
            if result["success"]:
                data = result["data"]
                # Decode base64 content
                content = base64.b64decode(data["content"]).decode('utf-8')
                return {
                    "path": data["path"],
                    "name": data["name"],
                    "content": content,
                    "sha": data["sha"]
                }
            else:
                raise HTTPException(status_code=500, detail="GitHub API error")
                
    except GitHubAPIError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching file content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# System prompt for Mistral Codestral
GITHUB_CODE_ASSISTANT_PROMPT = """You are a Code Assistant powered by Mistral Codestral. You specialize in:

1. **Code Generation & Review**: Writing high-quality code in multiple languages
2. **GitHub Integration**: Creating files, pull requests, and managing repositories
3. **Code Analysis**: Reviewing existing code and suggesting improvements
4. **Development Workflow**: Helping with git workflows, CI/CD, and best practices

**Capabilities:**
- Generate code snippets and complete files
- Create GitHub files and pull requests
- Analyze repository structure and suggest improvements
- Provide code reviews and optimization suggestions
- Help with debugging and troubleshooting

**Response Format:**
- Always provide clear, well-commented code
- Include explanations for complex logic
- Suggest file names and directory structures
- Mention relevant GitHub actions when applicable

**Code Block Format:**
When providing code, use this format:
```language
// filename: path/to/file.ext
code content here
```

**GitHub Actions:**
You can suggest GitHub actions like:
- Creating new files
- Creating pull requests  
- Analyzing repository structure
- Setting up workflows

Be helpful, accurate, and focused on practical solutions."""

def extract_code_blocks(content: str) -> List[CodeBlock]:
    """Extract code blocks from assistant response"""
    code_blocks = []
    
    # Pattern to match code blocks with optional filename
    pattern = r'```(\w+)?\n(?:// filename: ([^\n]+)\n)?(.*?)```'
    matches = re.findall(pattern, content, re.DOTALL)
    
    for match in matches:
        language = match[0] if match[0] else 'text'
        filename = match[1] if match[1] else None
        code = match[2].strip()
        
        if code:
            code_blocks.append(CodeBlock(
                language=language,
                code=code,
                filename=filename
            ))
    
    return code_blocks

def extract_github_actions(content: str) -> Optional[GitHubAction]:
    """Extract GitHub action suggestions from assistant response"""
    # Simple pattern matching for GitHub actions
    if "create file" in content.lower() or "creating file" in content.lower():
        return GitHubAction(type="create_file", status="suggested")
    elif "pull request" in content.lower() or "create pr" in content.lower():
        return GitHubAction(type="create_pr", status="suggested")
    elif "repository structure" in content.lower():
        return GitHubAction(type="get_repo_info", status="suggested")
    
    return None

async def call_mistral_codestral(
    messages: List[Dict[str, str]], 
    stream: bool = True,
    repo_context: Optional[Dict[str, Any]] = None
) -> AsyncGenerator[Dict[str, Any], None]:
    """Call Mistral Codestral via Model Garden"""
    try:
        if not all([PROJECT_ID, REGION, MODEL]):
            yield {"error": "GCP configuration missing (PROJECT_ID, REGION, MODEL)"}
            return
        
        # Add system prompt and repository context
        system_message = GITHUB_CODE_ASSISTANT_PROMPT
        if repo_context:
            system_message += f"\n\nRepository Context:\n{json.dumps(repo_context, indent=2)}"
        
        # Prepare messages for Mistral format
        formatted_messages = [
            {"role": "system", "content": system_message}
        ]
        formatted_messages.extend(messages)
        
        # Get access token
        token = get_access_token()
        
        # Build Model Garden URL
        url = build_codestral_url(PROJECT_ID, REGION, MODEL)
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": MODEL,
            "messages": formatted_messages,
            "temperature": 0.1,
            "max_tokens": 4000
        }
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code != 200:
                error_detail = f"Model Garden API error: {response.status_code} - {response.text}"
                logger.error(error_detail)
                yield {"error": error_detail}
                return
            
            data = response.json()
            
            # Extract content from Mistral response format
            if "choices" in data and data["choices"]:
                content = data["choices"][0]["message"]["content"]
                
                if stream:
                    # Simulate streaming for consistency with frontend
                    chunk_size = 50
                    for i in range(0, len(content), chunk_size):
                        chunk = content[i:i + chunk_size]
                        yield {
                            "type": "content",
                            "content": chunk
                        }
                        # Small delay to simulate streaming
                        await asyncio.sleep(0.01)
                    
                    # Extract metadata from full response
                    code_blocks = extract_code_blocks(content)
                    github_action = extract_github_actions(content)
                    
                    yield {
                        "type": "metadata",
                        "code_blocks": [block.dict() for block in code_blocks] if code_blocks else None,
                        "github_action": github_action.dict() if github_action else None
                    }
                else:
                    # Non-streaming response
                    code_blocks = extract_code_blocks(content)
                    github_action = extract_github_actions(content)
                    
                    yield {
                        "type": "complete",
                        "content": content,
                        "code_blocks": [block.dict() for block in code_blocks] if code_blocks else None,
                        "github_action": github_action.dict() if github_action else None
                    }
            else:
                yield {"error": "No response from Mistral model"}
                    
    except Exception as e:
        logger.error(f"Error calling Mistral Codestral: {e}")
        yield {"error": str(e)}

async def stream_response_generator(
    messages: List[Dict[str, str]], 
    repo_context: Optional[Dict[str, Any]] = None
) -> AsyncGenerator[str, None]:
    """Generate streaming response for FastAPI"""
    async for chunk in call_mistral_codestral(messages, stream=True, repo_context=repo_context):
        yield json.dumps(chunk) + "\n"

# ENDPOINTS - Now these will be registered because router is created early

@router.get("/test-router")
async def test_router():
    """Test endpoint to verify GitHub router is working"""
    return {
        "message": "GitHub router test successful!",
        "status": "working",
        "router": "github",
        "timestamp": datetime.now().isoformat()
    }

@router.post("/chat", response_model=GitHubChatResponse)
async def github_chat(request: GitHubChatRequest):
    """GitHub Code Assistant chat endpoint"""
    try:
        # Prepare conversation history
        messages = []
        for msg in request.conversation_history:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add current message
        messages.append({
            "role": "user", 
            "content": request.message
        })
        
        # Get repository context if provided
        repo_context = None
        if request.repository_url:
            if not GITHUB_TOKEN:
                raise HTTPException(status_code=400, detail="GitHub integration not configured")
            repo_context = await get_github_repo_info(request.repository_url)
        
        # Stream response
        if request.stream:
            return StreamingResponse(
                stream_response_generator(messages, repo_context),
                media_type="text/plain"
            )
        else:
            # Non-streaming response
            full_response = ""
            code_blocks = None
            github_action = None
            
            async for chunk in call_mistral_codestral(messages, stream=False, repo_context=repo_context):
                if chunk.get("type") == "complete":
                    full_response = chunk["content"]
                    if chunk.get("code_blocks"):
                        code_blocks = [CodeBlock(**block) for block in chunk["code_blocks"]]
                    if chunk.get("github_action"):
                        github_action = GitHubAction(**chunk["github_action"])
                    break
                elif "error" in chunk:
                    raise HTTPException(status_code=500, detail=chunk["error"])
            
            return GitHubChatResponse(
                message=full_response,
                code_blocks=code_blocks,
                github_action=github_action
            )
            
    except Exception as e:
        logger.error(f"Error in GitHub chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-file")
async def create_file(request: GitHubFileCreateRequest):
    """Create a file in GitHub repository"""
    try:
        result = await create_github_file(request)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return JSONResponse(content={
            "success": True,
            "message": "File created successfully",
            "data": result.get("data")
        })
        
    except Exception as e:
        logger.error(f"Error creating file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repo-info")
async def get_repo_info(repo_url: str):
    """Get repository information with enhanced error handling"""
    try:
        if not repo_url:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Missing repository URL",
                    "message": "Please provide a GitHub repository URL"
                }
            )
        
        repo_info = await get_github_repo_info(repo_url)
        
        if not repo_info.get("success", False):
            error_detail = repo_info.get("error", "Unknown error")
            status_code = repo_info.get("status_code", 500)
            
            # Handle specific error cases
            if status_code == 404:
                raise HTTPException(
                    status_code=404,
                    detail={
                        "error": "Repository not found",
                        "message": f"Could not find repository at {repo_url}. Please check the URL and your access permissions.",
                        "rate_limit_remaining": repo_info.get("rate_limit_remaining")
                    }
                )
            elif status_code == 403:
                if repo_info.get("retry_after"):
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "error": "Rate limit exceeded",
                            "message": f"GitHub API rate limit exceeded. Try again in {repo_info.get('retry_after')} seconds.",
                            "retry_after": repo_info.get("retry_after"),
                            "rate_limit_remaining": repo_info.get("rate_limit_remaining")
                        }
                    )
                else:
                    raise HTTPException(
                        status_code=403,
                        detail={
                            "error": "Access forbidden",
                            "message": "Access to this repository is forbidden. Check your GitHub token permissions.",
                            "rate_limit_remaining": repo_info.get("rate_limit_remaining")
                        }
                    )
            elif status_code == 401:
                raise HTTPException(
                    status_code=401,
                    detail={
                        "error": "Authentication failed",
                        "message": "GitHub authentication failed. Please check your GitHub token.",
                        "solution": "Verify your GITHUB_TOKEN environment variable is correct"
                    }
                )
            else:
                raise HTTPException(
                    status_code=status_code,
                    detail={
                        "error": "GitHub API error",
                        "message": error_detail,
                        "rate_limit_remaining": repo_info.get("rate_limit_remaining")
                    }
                )
        
        # Remove internal success flag before returning
        response_data = {k: v for k, v in repo_info.items() if k != "success"}
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise  # Re-raise HTTPExceptions
    except Exception as e:
        logger.error(f"Unexpected error in get_repo_info endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "message": "An unexpected error occurred while fetching repository information",
                "details": str(e)
            }
        )

@router.post("/create-pr")
async def create_pull_request(request: GitHubPRCreateRequest):
    """Create a pull request in GitHub repository"""
    try:
        owner, repo = validate_repo_url(request.repository_url)
        validate_github_token()
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Code-Assistant/1.0"
        }
        
        payload = {
            "title": request.title,
            "body": request.body,
            "head": request.head_branch,
            "base": request.base_branch
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            result = await make_github_request(
                client, "POST", 
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls",
                headers, payload
            )
            
            if result["success"]:
                return JSONResponse(content={
                    "success": True,
                    "message": "Pull request created successfully",
                    "data": result["data"]
                })
            else:
                raise HTTPException(status_code=500, detail="GitHub API error")
                
    except GitHubAPIError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating pull request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repo-languages")
async def get_repo_languages(repo_full_name: str):
    """Get repository languages"""
    try:
        validate_github_token()
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Code-Assistant/1.0"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            result = await make_github_request(
                client, "GET", 
                f"{GITHUB_API_BASE}/repos/{repo_full_name}/languages",
                headers
            )
            
            if result["success"]:
                return result["data"]
            else:
                raise HTTPException(status_code=500, detail="GitHub API error")
                
    except GitHubAPIError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching repo languages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repo-structure")
async def analyze_repo_structure(repo_full_name: str):
    """Analyze repository structure for AI context"""
    try:
        validate_github_token()
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Code-Assistant/1.0"
        }
        
        # Get repository info
        repo_info = await get_github_repo_info(f"https://github.com/{repo_full_name}")
        
        # Get languages
        async with httpx.AsyncClient(timeout=30.0) as client:
            languages_result = await make_github_request(
                client, "GET",
                f"{GITHUB_API_BASE}/repos/{repo_full_name}/languages",
                headers
            )
            languages = languages_result["data"] if languages_result["success"] else {}
            
            # Get README
            readme_content = None
            try:
                readme_result = await make_github_request(
                    client, "GET",
                    f"{GITHUB_API_BASE}/repos/{repo_full_name}/readme",
                    headers
                )
                if readme_result["success"]:
                    readme_data = readme_result["data"]
                    readme_content = base64.b64decode(readme_data["content"]).decode('utf-8')
            except:
                pass
            
            # Get root directory structure
            root_files_result = await make_github_request(
                client, "GET",
                f"{GITHUB_API_BASE}/repos/{repo_full_name}/contents",
                headers
            )
            root_files = root_files_result["data"] if root_files_result["success"] else []
            
            return {
                "repository_info": repo_info,
                "languages": languages,
                "readme_content": readme_content[:2000] if readme_content else None,  # Truncate for context
                "root_structure": [
                    {
                        "name": file["name"],
                        "type": file["type"],
                        "path": file["path"]
                    } for file in root_files
                ]
            }
                
    except GitHubAPIError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Error analyzing repo structure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user")
async def get_github_user():
    """Get current GitHub user information"""
    try:
        validate_github_token()
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Code-Assistant/1.0"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            result = await make_github_request(
                client, "GET", f"{GITHUB_API_BASE}/user", headers
            )
            
            if result["success"]:
                return result["data"]
            else:
                raise HTTPException(status_code=500, detail="GitHub API error")
                
    except GitHubAPIError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching GitHub user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repositories")
async def get_github_repositories():
    """Get user's GitHub repositories"""
    try:
        validate_github_token()
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Code-Assistant/1.0"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            result = await make_github_request(
                client, "GET", 
                f"{GITHUB_API_BASE}/user/repos?sort=updated&per_page=50", 
                headers
            )
            
            if result["success"]:
                return result["data"]
            else:
                raise HTTPException(status_code=500, detail="GitHub API error")
                
    except GitHubAPIError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching repositories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repo-files")
async def get_repo_files(repo_full_name: str, path: str = ""):
    """Get repository files and folders"""
    try:
        validate_github_token()
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Code-Assistant/1.0"
        }
        
        url = f"{GITHUB_API_BASE}/repos/{repo_full_name}/contents/{path}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            result = await make_github_request(client, "GET", url, headers)
            
            if result["success"]:
                files = result["data"]
                return files if isinstance(files, list) else [files]
            else:
                raise HTTPException(status_code=500, detail="GitHub API error")
                
    except GitHubAPIError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching repo files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/file-content")
async def get_file_content_endpoint(repo_full_name: str, file_path: str):
    """Get content of a specific file"""
    try:
        result = await get_file_content(repo_full_name, file_path)
        return result
    except Exception as e:
        logger.error(f"Error in file content endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def github_status():
    """Enhanced GitHub Code Assistant status endpoint with comprehensive checks"""
    try:
        status_info = {
            "status": "operational",
            "service": "GitHub Code Assistant",
            "model": MODEL,
            "platform": "Google Cloud Vertex AI Model Garden",
            "timestamp": datetime.now().isoformat(),
            "capabilities": [
                "Code generation",
                "GitHub integration", 
                "Code review",
                "File creation",
                "Pull request management"
            ],
            "configuration": {
                "project_id": PROJECT_ID,
                "region": REGION,
                "model": MODEL,
                "github_integration": GITHUB_TOKEN is not None,
                "model_garden_connected": False,
                "github_api_accessible": False,
                "test_results": {}
            }
        }
        
        # Test Model Garden connection
        try:
            token = get_access_token()
            url = build_codestral_url(PROJECT_ID, REGION, MODEL)
            
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            test_payload = {
                "model": MODEL,
                "messages": [{"role": "user", "content": "Hello"}],
                "temperature": 0,
                "max_tokens": 10
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=test_payload, headers=headers)
                
                if response.status_code == 200:
                    status_info["configuration"]["model_garden_connected"] = True
                    status_info["configuration"]["test_results"]["model_garden"] = "successful"
                else:
                    status_info["configuration"]["test_results"]["model_garden"] = f"failed - {response.status_code}"
                    
        except Exception as e:
            logger.error(f"Model Garden test failed: {e}")
            status_info["configuration"]["test_results"]["model_garden"] = f"failed - {str(e)}"
        
        # Test GitHub API connection if token is available
        if GITHUB_TOKEN:
            try:
                headers = {
                    "Authorization": f"token {GITHUB_TOKEN}",
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "GitHub-Code-Assistant/1.0"
                }
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    result = await make_github_request(
                        client, "GET", f"{GITHUB_API_BASE}/user", headers
                    )
                    
                    if result["success"]:
                        status_info["configuration"]["github_api_accessible"] = True
                        status_info["configuration"]["test_results"]["github_api"] = "successful"
                        status_info["configuration"]["github_user"] = result["data"]["login"]
                        status_info["configuration"]["rate_limit"] = result["rate_limit"]
                    else:
                        status_info["configuration"]["test_results"]["github_api"] = "failed - unexpected response"
                        
            except GitHubAPIError as e:
                status_info["configuration"]["test_results"]["github_api"] = f"failed - {str(e)}"
                if e.rate_limit_remaining is not None:
                    status_info["configuration"]["rate_limit_remaining"] = e.rate_limit_remaining
            except Exception as e:
                logger.error(f"GitHub API test failed: {e}")
                status_info["configuration"]["test_results"]["github_api"] = f"failed - {str(e)}"
        else:
            status_info["configuration"]["test_results"]["github_api"] = "skipped - no token"
        
        # Determine overall status
        if (status_info["configuration"]["model_garden_connected"] and 
            (not GITHUB_TOKEN or status_info["configuration"]["github_api_accessible"])):
            status_info["status"] = "operational"
            return JSONResponse(content=status_info)
        else:
            status_info["status"] = "degraded"
            return JSONResponse(status_code=503, content=status_info)
            
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "service": "GitHub Code Assistant",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "configuration": {
                    "model_garden_connected": False,
                    "github_integration": GITHUB_TOKEN is not None,
                    "project_id": PROJECT_ID,
                    "region": REGION,
                    "model": MODEL
                }
            }
        )

# Log final route count
logger.info(f"✅ GitHub router setup complete. Total routes: {len(router.routes)}")

# Log all registered routes
for i, route in enumerate(router.routes):
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        logger.info(f"  Route {i}: {list(route.methods)} {route.path}")