from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, AsyncGenerator
import json
import logging
import asyncio
import re
from datetime import datetime
import os
import base64
import google.auth
from google.auth.transport.requests import Request
import httpx

# Add dotenv import at the top
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

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

router = APIRouter()

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

async def get_github_repo_info(repo_url: str) -> Dict[str, Any]:
    """Get basic repository information from GitHub API"""
    try:
        # Extract owner/repo from URL
        match = re.search(r'github\.com/([^/]+)/([^/]+)', repo_url)
        if not match:
            raise ValueError("Invalid GitHub repository URL")
        
        owner, repo = match.groups()
        repo = repo.replace('.git', '')
        
        if not GITHUB_TOKEN:
            return {"error": "GitHub token not configured"}
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}",
                headers=headers
            )
            
            if response.status_code == 200:
                repo_data = response.json()
                return {
                    "name": repo_data["name"],
                    "full_name": repo_data["full_name"],
                    "description": repo_data.get("description"),
                    "language": repo_data.get("language"),
                    "languages_url": repo_data["languages_url"],
                    "default_branch": repo_data["default_branch"]
                }
            else:
                return {"error": f"GitHub API error: {response.status_code}"}
                
    except Exception as e:
        logger.error(f"Error getting repo info: {e}")
        return {"error": str(e)}

async def create_github_file(request: GitHubFileCreateRequest) -> Dict[str, Any]:
    """Create a file in GitHub repository"""
    try:
        match = re.search(r'github\.com/([^/]+)/([^/]+)', request.repository_url)
        if not match:
            raise ValueError("Invalid GitHub repository URL")
        
        owner, repo = match.groups()
        repo = repo.replace('.git', '')
        
        if not GITHUB_TOKEN:
            return {"error": "GitHub token not configured"}
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # Encode content to base64
        content_encoded = base64.b64encode(request.content.encode()).decode()
        
        payload = {
            "message": request.commit_message,
            "content": content_encoded,
            "branch": request.branch
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{request.file_path}",
                headers=headers,
                json=payload
            )
            
            if response.status_code in [200, 201]:
                return {"success": True, "data": response.json()}
            else:
                return {"error": f"GitHub API error: {response.status_code}"}
                
    except Exception as e:
        logger.error(f"Error creating GitHub file: {e}")
        return {"error": str(e)}

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

@router.get("/user")
async def get_github_user():
    """Get current GitHub user information"""
    try:
        if not GITHUB_TOKEN:
            raise HTTPException(status_code=400, detail="GitHub token not configured")
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{GITHUB_API_BASE}/user",
                headers=headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, detail="GitHub API error")
                
    except Exception as e:
        logger.error(f"Error fetching GitHub user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repositories")
async def get_github_repositories():
    """Get user's GitHub repositories"""
    try:
        if not GITHUB_TOKEN:
            raise HTTPException(status_code=400, detail="GitHub token not configured")
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{GITHUB_API_BASE}/user/repos?sort=updated&per_page=50",
                headers=headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, detail="GitHub API error")
                
    except Exception as e:
        logger.error(f"Error fetching repositories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repo-files")
async def get_repo_files(repo_full_name: str, path: str = ""):
    """Get repository files and folders"""
    try:
        if not GITHUB_TOKEN:
            raise HTTPException(status_code=400, detail="GitHub token not configured")
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        url = f"{GITHUB_API_BASE}/repos/{repo_full_name}/contents/{path}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                files = response.json()
                return files if isinstance(files, list) else [files]
            else:
                raise HTTPException(status_code=response.status_code, detail="GitHub API error")
                
    except Exception as e:
        logger.error(f"Error fetching repo files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/file-content")
async def get_file_content(repo_full_name: str, file_path: str):
    """Get content of a specific file"""
    try:
        if not GITHUB_TOKEN:
            raise HTTPException(status_code=400, detail="GitHub token not configured")
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        url = f"{GITHUB_API_BASE}/repos/{repo_full_name}/contents/{file_path}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                # Decode base64 content
                content = base64.b64decode(data["content"]).decode('utf-8')
                return {
                    "path": data["path"],
                    "name": data["name"],
                    "content": content,
                    "sha": data["sha"]
                }
            else:
                raise HTTPException(status_code=response.status_code, detail="GitHub API error")
                
    except Exception as e:
        logger.error(f"Error fetching file content: {e}")
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
    """Get repository information"""
    try:
        repo_info = await get_github_repo_info(repo_url)
        
        if "error" in repo_info:
            raise HTTPException(status_code=400, detail=repo_info["error"])
        
        return JSONResponse(content=repo_info)
        
    except Exception as e:
        logger.error(f"Error getting repo info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-pr")
async def create_pull_request(request: GitHubPRCreateRequest):
    """Create a pull request in GitHub repository"""
    try:
        match = re.search(r'github\.com/([^/]+)/([^/]+)', request.repository_url)
        if not match:
            raise HTTPException(status_code=400, detail="Invalid GitHub repository URL")
        
        owner, repo = match.groups()
        repo = repo.replace('.git', '')
        
        if not GITHUB_TOKEN:
            raise HTTPException(status_code=400, detail="GitHub token not configured")
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        payload = {
            "title": request.title,
            "body": request.body,
            "head": request.head_branch,
            "base": request.base_branch
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 201:
                return JSONResponse(content={
                    "success": True,
                    "message": "Pull request created successfully",
                    "data": response.json()
                })
            else:
                raise HTTPException(status_code=response.status_code, detail="GitHub API error")
                
    except Exception as e:
        logger.error(f"Error creating pull request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repo-languages")
async def get_repo_languages(repo_full_name: str):
    """Get repository languages"""
    try:
        if not GITHUB_TOKEN:
            raise HTTPException(status_code=400, detail="GitHub token not configured")
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{GITHUB_API_BASE}/repos/{repo_full_name}/languages",
                headers=headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, detail="GitHub API error")
                
    except Exception as e:
        logger.error(f"Error fetching repo languages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repo-structure")
async def analyze_repo_structure(repo_full_name: str):
    """Analyze repository structure for AI context"""
    try:
        if not GITHUB_TOKEN:
            raise HTTPException(status_code=400, detail="GitHub token not configured")
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # Get repository info
        repo_info = await get_github_repo_info(f"https://github.com/{repo_full_name}")
        
        # Get languages
        async with httpx.AsyncClient(timeout=30.0) as client:
            languages_response = await client.get(
                f"{GITHUB_API_BASE}/repos/{repo_full_name}/languages",
                headers=headers
            )
            languages = languages_response.json() if languages_response.status_code == 200 else {}
            
            # Get README
            readme_content = None
            try:
                readme_response = await client.get(
                    f"{GITHUB_API_BASE}/repos/{repo_full_name}/readme",
                    headers=headers
                )
                if readme_response.status_code == 200:
                    readme_data = readme_response.json()
                    readme_content = base64.b64decode(readme_data["content"]).decode('utf-8')
            except:
                pass
            
            # Get root directory structure
            root_files_response = await client.get(
                f"{GITHUB_API_BASE}/repos/{repo_full_name}/contents",
                headers=headers
            )
            root_files = root_files_response.json() if root_files_response.status_code == 200 else []
            
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
                
    except Exception as e:
        logger.error(f"Error analyzing repo structure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def github_status():
    """GitHub Code Assistant status endpoint"""
    try:
        # Test Model Garden connection
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
                return JSONResponse(content={
                    "status": "operational",
                    "service": "GitHub Code Assistant",
                    "model": MODEL,
                    "platform": "Google Cloud Vertex AI Model Garden",
                    "capabilities": [
                        "Code generation",
                        "GitHub integration", 
                        "Code review",
                        "File creation",
                        "Pull request management"
                    ],
                    "configuration": {
                        "model_garden_connected": True,
                        "github_integration": GITHUB_TOKEN is not None,
                        "project_id": PROJECT_ID,
                        "region": REGION,
                        "model": MODEL,
                        "test_response": "successful"
                    }
                })
            else:
                raise Exception(f"Model Garden test failed: {response.status_code}")
                
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "service": "GitHub Code Assistant",
                "error": str(e),
                "configuration": {
                    "model_garden_connected": False,
                    "github_integration": GITHUB_TOKEN is not None,
                    "project_id": PROJECT_ID,
                    "region": REGION,
                    "model": MODEL
                }
            }
        )