from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import json
import os
import uuid
from datetime import datetime, timedelta
import aiofiles
import httpx
from pathlib import Path
import asyncio

# Import your existing Claude infrastructure
from models import ChatRequest, ChatResponse, MessageRole
import anthropic

logger = logging.getLogger(__name__)
router = APIRouter()

# Use your existing Claude configuration
MODEL = "claude-3-5-sonnet-20241022"  # Using the latest and most capable model for coding

# Import your existing Claude client function
from routers.ChatClaude import get_anthropic_client, build_messages_from_request, make_request_with_backoff

# In-memory session storage (use Redis in production)
chat_sessions: Dict[str, Dict] = {}

# Enhanced Models with Claude Integration
class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: user, assistant, or system")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now)

class ChatSession(BaseModel):
    session_id: str
    messages: List[ChatMessage] = Field(default_factory=list)
    context_files: List[Dict[str, Any]] = Field(default_factory=list)
    repository_info: Optional[Dict[str, str]] = None
    current_code: str = ""
    language: str = "python"
    created_at: datetime = Field(default_factory=datetime.now)
    last_updated: datetime = Field(default_factory=datetime.now)

class CodeGenerationRequest(BaseModel):
    session_id: Optional[str] = Field(default=None, description="Chat session ID")
    prompt: str = Field(..., description="The coding prompt/request")
    language: Optional[str] = Field(default="python", description="Programming language")
    context_files: Optional[List[Dict[str, Any]]] = Field(default=None, description="Context files")
    repository_info: Optional[Dict[str, str]] = Field(default=None, description="Repository information")
    current_code: Optional[str] = Field(default="", description="Current code in editor")
    max_tokens: Optional[int] = Field(default=4000, description="Maximum tokens")
    temperature: Optional[float] = Field(default=0.1, description="Temperature for code generation")
    stream: Optional[bool] = Field(default=False, description="Stream response")

class CodeGenerationResponse(BaseModel):
    session_id: str
    generated_code: str
    explanation: str
    suggestions: List[str]
    chat_history: List[ChatMessage]
    status: str

class GitHubConnectRequest(BaseModel):
    token: str = Field(..., description="GitHub personal access token")
    repo_url: str = Field(..., description="GitHub repository URL")

class GitHubRepository(BaseModel):
    name: str
    owner: str
    full_name: str
    url: str
    description: Optional[str] = None

class GitHubFile(BaseModel):
    name: str
    path: str
    type: str = "file"
    size: Optional[int] = None
    download_url: Optional[str] = None

class GitHubConnectResponse(BaseModel):
    repository: GitHubRepository
    files: List[GitHubFile]
    status: str

class FileUploadResponse(BaseModel):
    filename: str
    size: int
    content_preview: str
    status: str

# Session Management Functions
def create_session() -> str:
    """Create a new chat session"""
    session_id = str(uuid.uuid4())
    chat_sessions[session_id] = ChatSession(session_id=session_id).dict()
    return session_id

def get_session(session_id: str) -> Optional[ChatSession]:
    """Get session by ID"""
    if session_id in chat_sessions:
        session_data = chat_sessions[session_id]
        return ChatSession(**session_data)
    return None

def update_session(session: ChatSession):
    """Update session in storage"""
    session.last_updated = datetime.now()
    chat_sessions[session.session_id] = session.dict()

def cleanup_old_sessions():
    """Remove sessions older than 24 hours"""
    cutoff = datetime.now() - timedelta(hours=24)
    expired_sessions = [
        sid for sid, session_data in chat_sessions.items()
        if datetime.fromisoformat(session_data['last_updated']) < cutoff
    ]
    for sid in expired_sessions:
        del chat_sessions[sid]

def build_claude_system_prompt() -> str:
    """Build system prompt optimized for coding assistance"""
    return """You are an expert coding assistant that helps developers write clean, efficient, and well-documented code. 

Key guidelines:
1. **Code Quality**: Write production-ready code with proper error handling, type hints, and documentation
2. **Explain Your Work**: Always provide clear explanations of your code and design decisions
3. **Context Awareness**: Use provided file context, repository structure, and conversation history to inform your responses
4. **Best Practices**: Follow language-specific best practices and conventions
5. **Iterative Development**: Build upon previous code and suggestions when continuing conversations
6. **Security**: Consider security implications and suggest secure coding practices
7. **Performance**: Optimize for readability first, then performance when needed

Response Format:
- Provide complete, working code
- Add clear comments explaining complex logic
- Include usage examples when helpful
- Suggest improvements or next steps
- Reference previous conversation context when relevant

When analyzing context files or repository structure, use that information to:
- Match existing coding patterns and styles
- Suggest improvements to existing code
- Ensure new code integrates well with the existing codebase
- Recommend architectural improvements"""

def build_conversation_context(session: ChatSession, new_prompt: str) -> str:
    """Build enhanced prompt with conversation history and context"""
    context_parts = []
    
    # Add conversation history (last 6 messages for context)
    if session.messages and len(session.messages) > 1:
        context_parts.append("## Conversation History")
        for msg in session.messages[-6:]:
            role_label = "Assistant" if msg.role == "assistant" else "User"
            # Truncate long messages for context
            content = msg.content[:300] + "..." if len(msg.content) > 300 else msg.content
            context_parts.append(f"**{role_label}**: {content}")
        context_parts.append("")
    
    # Add repository context
    if session.repository_info:
        context_parts.append("## Repository Context")
        context_parts.append(f"**Repository**: {session.repository_info.get('full_name', 'Unknown')}")
        context_parts.append(f"**URL**: {session.repository_info.get('url', 'Unknown')}")
        if session.repository_info.get('description'):
            context_parts.append(f"**Description**: {session.repository_info['description']}")
        context_parts.append("")
    
    # Add context files
    if session.context_files:
        context_parts.append("## Context Files")
        for i, file_info in enumerate(session.context_files[:5]):  # Limit to 5 files
            file_name = file_info.get('name', file_info.get('path', f'File {i+1}'))
            context_parts.append(f"**{file_name}**:")
            
            if file_info.get('content'):
                # Truncate very long files
                content = file_info['content']
                if len(content) > 2000:
                    content = content[:1000] + "\n\n... [truncated] ...\n\n" + content[-1000:]
                context_parts.append(f"```\n{content}\n```")
            elif file_info.get('path'):
                context_parts.append(f"Path: {file_info['path']}")
            
            context_parts.append("")
    
    # Add current code context
    if session.current_code and session.current_code.strip():
        context_parts.append("## Current Code in Editor")
        context_parts.append(f"```{session.language}")
        context_parts.append(session.current_code)
        context_parts.append("```")
        context_parts.append("")
    
    # Add language context
    context_parts.append(f"## Target Language: {session.language}")
    context_parts.append("")
    
    # Add the new prompt
    context_parts.append("## Current Request")
    context_parts.append(new_prompt)
    
    return "\n".join(context_parts)

async def generate_code_with_claude(session: ChatSession, request: CodeGenerationRequest) -> CodeGenerationResponse:
    """Generate code using Claude with full context"""
    try:
        # Get Claude client
        client = get_anthropic_client()
        
        # Build conversation-aware prompt
        enhanced_prompt = build_conversation_context(session, request.prompt)
        
        # Build messages for Claude
        claude_messages = []
        
        # Add conversation history in Claude format
        for msg in session.messages[-10:]:  # Last 10 messages for better context
            claude_role = "user" if msg.role == "user" else "assistant"
            claude_messages.append({
                "role": claude_role,
                "content": msg.content
            })
        
        # Add current request
        claude_messages.append({
            "role": "user",
            "content": enhanced_prompt
        })
        
        # Prepare Claude request
        claude_request_params = {
            "model": MODEL,
            "max_tokens": request.max_tokens or 4000,
            "temperature": request.temperature or 0.1,
            "messages": claude_messages,
            "system": build_claude_system_prompt()
        }
        
        # Make request to Claude
        response = await make_request_with_backoff(
            client, claude_messages, build_claude_system_prompt(), request
        )
        
        # Extract response text
        response_text = ""
        if response.content:
            for content_block in response.content:
                if hasattr(content_block, 'text'):
                    response_text += content_block.text
        
        if not response_text:
            response_text = "I'm sorry, I couldn't generate a response."
        
        # Parse Claude's response to extract code, explanation, and suggestions
        generated_code, explanation, suggestions = parse_claude_response(response_text, session.language)
        
        # Add messages to session
        user_message = ChatMessage(role="user", content=request.prompt)
        assistant_message = ChatMessage(role="assistant", content=response_text)
        session.messages.extend([user_message, assistant_message])
        
        # Update session
        update_session(session)
        
        logger.info(f"Generated code with Claude for session {session.session_id}")
        
        return CodeGenerationResponse(
            session_id=session.session_id,
            generated_code=generated_code,
            explanation=explanation,
            suggestions=suggestions,
            chat_history=session.messages,
            status="success"
        )
        
    except Exception as e:
        logger.error(f"Error generating code with Claude: {e}")
        
        # Add error message to session
        user_message = ChatMessage(role="user", content=request.prompt)
        error_message = ChatMessage(
            role="assistant", 
            content=f"I encountered an error: {str(e)}. Please try rephrasing your request."
        )
        session.messages.extend([user_message, error_message])
        update_session(session)
        
        return CodeGenerationResponse(
            session_id=session.session_id,
            generated_code="// Error generating code",
            explanation=f"I encountered an error while generating code: {str(e)}",
            suggestions=[
                "Try rephrasing your request",
                "Check if your context files are valid",
                "Ensure your GitHub repository is accessible"
            ],
            chat_history=session.messages,
            status="error"
        )

def parse_claude_response(response_text: str, language: str) -> tuple[str, str, list[str]]:
    """Parse Claude's response to extract code, explanation, and suggestions"""
    try:
        # Look for code blocks in the response
        import re
        
        # Find code blocks with language specification
        code_pattern = rf"```{language}\n(.*?)\n```"
        code_matches = re.findall(code_pattern, response_text, re.DOTALL | re.IGNORECASE)
        
        # If no language-specific blocks, look for generic code blocks
        if not code_matches:
            code_pattern = r"```\n(.*?)\n```"
            code_matches = re.findall(code_pattern, response_text, re.DOTALL)
        
        # Extract the largest code block as the main code
        if code_matches:
            generated_code = max(code_matches, key=len).strip()
        else:
            # If no code blocks found, try to extract code from the response
            lines = response_text.split('\n')
            code_lines = []
            in_code = False
            
            for line in lines:
                if any(keyword in line.lower() for keyword in ['def ', 'function', 'class ', 'import ', 'const ', 'let ', 'var ']):
                    in_code = True
                if in_code:
                    code_lines.append(line)
                # Stop if we hit explanation markers
                if any(marker in line.lower() for marker in ['explanation:', 'this code', 'the above']):
                    break
            
            generated_code = '\n'.join(code_lines).strip() if code_lines else response_text[:500]
        
        # Extract explanation (everything after code blocks)
        explanation_start = response_text.find(generated_code)
        if explanation_start != -1:
            explanation_start += len(generated_code)
            explanation = response_text[explanation_start:].strip()
        else:
            explanation = response_text
        
        # Remove code blocks from explanation
        explanation = re.sub(r"```.*?```", "", explanation, flags=re.DOTALL).strip()
        
        # Extract suggestions
        suggestions = []
        suggestion_patterns = [
            r"(?:suggestions?|recommendations?|next steps?|improvements?):\s*\n(.*?)(?:\n\n|\Z)",
            r"(?:consider|you (?:could|might|should))([^.!?]*[.!?])",
            r"(?:try|add|include|use)([^.!?]*[.!?])"
        ]
        
        for pattern in suggestion_patterns:
            matches = re.findall(pattern, explanation, re.IGNORECASE | re.DOTALL)
            for match in matches:
                suggestion = match.strip()
                if suggestion and len(suggestion) > 10 and len(suggestion) < 200:
                    suggestions.append(suggestion)
        
        # Default suggestions if none found
        if not suggestions:
            suggestions = [
                "Consider adding error handling",
                "Add type hints for better code clarity",
                "Include unit tests for your functions",
                "Document your code with comments"
            ]
        
        # Clean up and validate
        if not generated_code or len(generated_code) < 10:
            generated_code = f"# Generated {language} code\n# Please provide more specific requirements"
        
        if not explanation or len(explanation) < 20:
            explanation = "Code generated based on your request. Please let me know if you need any modifications or have questions."
        
        return generated_code, explanation, suggestions[:5]  # Limit to 5 suggestions
        
    except Exception as e:
        logger.error(f"Error parsing Claude response: {e}")
        return (
            f"# Error parsing response\n# {response_text[:200]}...",
            f"Error parsing Claude's response: {str(e)}",
            ["Try rephrasing your request", "Provide more specific requirements"]
        )

# GitHub Integration Functions (keeping from original)
def parse_github_url(url: str) -> tuple:
    """Parse GitHub repository URL to extract owner and repo name"""
    try:
        if url.startswith("https://github.com/"):
            path = url.replace("https://github.com/", "").rstrip("/")
        elif url.startswith("github.com/"):
            path = url.replace("github.com/", "").rstrip("/")
        else:
            raise ValueError("Invalid GitHub URL format")
        
        parts = path.split("/")
        if len(parts) >= 2:
            return parts[0], parts[1]
        else:
            raise ValueError("Invalid repository path")
    except Exception as e:
        logger.error(f"Error parsing GitHub URL {url}: {e}")
        raise HTTPException(status_code=400, detail="Invalid GitHub repository URL")

async def fetch_github_files(token: str, owner: str, repo: str) -> List[GitHubFile]:
    """Fetch files from GitHub repository"""
    try:
        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/contents",
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Repository not found")
            elif response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid GitHub token")
            
            response.raise_for_status()
            contents = response.json()
            
            files = []
            
            for item in contents:
                if item["type"] == "file":
                    file_extensions = {".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".yml", ".yaml", ".txt", ".html", ".css", ".sql"}
                    if any(item["name"].endswith(ext) for ext in file_extensions):
                        files.append(GitHubFile(
                            name=item["name"],
                            path=item["path"],
                            type="file",
                            size=item.get("size"),
                            download_url=item.get("download_url")
                        ))
                elif item["type"] == "dir":
                    common_dirs = {"src", "app", "lib", "utils", "components", "pages", "api", "models", "services"}
                    if item["name"] in common_dirs:
                        try:
                            dir_response = await client.get(
                                f"https://api.github.com/repos/{owner}/{repo}/contents/{item['path']}",
                                headers=headers,
                                timeout=30.0
                            )
                            if dir_response.status_code == 200:
                                dir_contents = dir_response.json()
                                for subitem in dir_contents:
                                    if subitem["type"] == "file":
                                        file_extensions = {".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".md"}
                                        if any(subitem["name"].endswith(ext) for ext in file_extensions):
                                            files.append(GitHubFile(
                                                name=f"{item['name']}/{subitem['name']}",
                                                path=subitem["path"],
                                                type="file",
                                                size=subitem.get("size"),
                                                download_url=subitem.get("download_url")
                                            ))
                        except Exception as e:
                            logger.warning(f"Error fetching directory {item['name']}: {e}")
                            continue
            
            return files
            
    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching GitHub files: {e}")
        raise HTTPException(status_code=500, detail="Error connecting to GitHub API")
    except Exception as e:
        logger.error(f"Error fetching GitHub files: {e}")
        raise HTTPException(status_code=500, detail="Error fetching repository files")

# API Endpoints
@router.post("/generate", response_model=CodeGenerationResponse)
async def generate_code_with_claude_endpoint(request: CodeGenerationRequest):
    """Generate code using Claude with full conversation context"""
    try:
        # Clean up old sessions
        cleanup_old_sessions()
        
        # Get or create session
        if request.session_id:
            session = get_session(request.session_id)
            if not session:
                session_id = create_session()
                session = get_session(session_id)
        else:
            session_id = create_session()
            session = get_session(session_id)
        
        # Update session with new context if provided
        if request.language and request.language != session.language:
            session.language = request.language
        
        if request.context_files is not None:
            session.context_files = request.context_files
        
        if request.repository_info is not None:
            session.repository_info = request.repository_info
            
        if request.current_code is not None:
            session.current_code = request.current_code
        
        # Generate code with Claude
        response = await generate_code_with_claude(session, request)
        
        return response
        
    except Exception as e:
        logger.error(f"Code generation error: {e}")
        raise HTTPException(status_code=500, detail="Code generation failed")

@router.post("/generate/stream")
async def generate_code_stream_claude(request: CodeGenerationRequest):
    """Stream code generation using Claude"""
    try:
        # Get or create session
        if request.session_id:
            session = get_session(request.session_id)
            if not session:
                session_id = create_session()
                session = get_session(session_id)
        else:
            session_id = create_session()
            session = get_session(session_id)
        
        # Update session context
        if request.language and request.language != session.language:
            session.language = request.language
        if request.context_files is not None:
            session.context_files = request.context_files
        if request.repository_info is not None:
            session.repository_info = request.repository_info
        if request.current_code is not None:
            session.current_code = request.current_code
        
        # Build enhanced prompt
        enhanced_prompt = build_conversation_context(session, request.prompt)
        
        async def generate_stream():
            try:
                client = get_anthropic_client()
                
                # Build messages for Claude
                claude_messages = []
                for msg in session.messages[-10:]:
                    claude_role = "user" if msg.role == "user" else "assistant"
                    claude_messages.append({
                        "role": claude_role,
                        "content": msg.content
                    })
                
                claude_messages.append({
                    "role": "user",
                    "content": enhanced_prompt
                })
                
                # Stream request
                stream = client.messages.stream(
                    model=MODEL,
                    max_tokens=request.max_tokens or 4000,
                    temperature=request.temperature or 0.1,
                    messages=claude_messages,
                    system=build_claude_system_prompt()
                )
                
                full_response = ""
                with stream as stream_context:
                    for text in stream_context.text_stream:
                        full_response += text
                        yield f"data: {json.dumps({'chunk': text, 'session_id': session.session_id})}\n\n"
                
                # Add to session after streaming is complete
                user_message = ChatMessage(role="user", content=request.prompt)
                assistant_message = ChatMessage(role="assistant", content=full_response)
                session.messages.extend([user_message, assistant_message])
                update_session(session)
                
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                yield f"data: {json.dumps({'error': f'Streaming failed: {str(e)}'})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )
        
    except Exception as e:
        logger.error(f"Stream initialization error: {e}")
        raise HTTPException(status_code=500, detail="Streaming failed to initialize")

# Session Management Endpoints
@router.post("/session/new")
async def create_new_session():
    """Create a new chat session"""
    session_id = create_session()
    return {"session_id": session_id, "status": "created"}

@router.get("/session/{session_id}")
async def get_chat_session(session_id: str):
    """Get chat session and history"""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session.session_id,
        "messages": session.messages,
        "context_files": session.context_files,
        "repository_info": session.repository_info,
        "current_code": session.current_code,
        "language": session.language,
        "created_at": session.created_at,
        "last_updated": session.last_updated
    }

@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session"""
    if session_id in chat_sessions:
        del chat_sessions[session_id]
        return {"status": "deleted"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")

# GitHub Integration Endpoints
@router.post("/github/connect", response_model=GitHubConnectResponse)
async def connect_github(request: GitHubConnectRequest):
    """Connect to GitHub repository and fetch files"""
    try:
        owner, repo = parse_github_url(request.repo_url)
        
        headers = {
            "Authorization": f"token {request.token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        async with httpx.AsyncClient() as client:
            repo_response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}",
                headers=headers,
                timeout=30.0
            )
            
            if repo_response.status_code == 404:
                raise HTTPException(status_code=404, detail="Repository not found")
            elif repo_response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid GitHub token")
            
            repo_response.raise_for_status()
            repo_data = repo_response.json()
        
        repository = GitHubRepository(
            name=repo_data["name"],
            owner=repo_data["owner"]["login"],
            full_name=repo_data["full_name"],
            url=repo_data["html_url"],
            description=repo_data.get("description")
        )
        
        files = await fetch_github_files(request.token, owner, repo)
        
        logger.info(f"Connected to repository {repository.full_name} with {len(files)} files")
        
        return GitHubConnectResponse(
            repository=repository,
            files=files,
            status="success"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub connection error: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to GitHub repository")

@router.get("/github/file/{owner}/{repo}")
async def get_github_file_content(owner: str, repo: str, path: str, token: str):
    """Get content of a specific file from GitHub repository"""
    try:
        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="File not found")
            
            response.raise_for_status()
            file_data = response.json()
            
            import base64
            content = base64.b64decode(file_data["content"]).decode("utf-8")
            
            return {
                "name": file_data["name"],
                "path": file_data["path"],
                "content": content,
                "size": file_data["size"],
                "status": "success"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching file content: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch file content")

# File Upload Endpoint
@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload and process a file for context"""
    try:
        allowed_extensions = {".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".txt", ".html", ".css", ".sql", ".yml", ".yaml"}
        file_extension = Path(file.filename).suffix.lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_extension} not allowed. Supported: {', '.join(allowed_extensions)}"
            )
        
        content = await file.read()
        
        try:
            text_content = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="File must be valid UTF-8 text")
        
        content_preview = text_content[:500] + "..." if len(text_content) > 500 else text_content
        
        logger.info(f"Uploaded file: {file.filename} ({len(content)} bytes)")
        
        return FileUploadResponse(
            filename=file.filename,
            size=len(content),
            content_preview=content_preview,
            status="success"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload error: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")

# Status Endpoints
@router.get("/status")
async def get_status():
    """Get code assistant service status"""
    cleanup_old_sessions()
    return {
        "status": "healthy",
        "service": "code-assistant-claude",
        "claude_model": MODEL,
        "active_sessions": len(chat_sessions),
        "features": {
            "claude_integration": True,
            "conversation_memory": True,
            "code_generation": True,
            "github_integration": True,
            "file_upload": True,
            "streaming": True
        },
        "supported_languages": ["python", "react", "typescript", "javascript", "html", "css", "sql"],
        "timestamp": datetime.now().isoformat()
    }

@router.get("/languages")
async def get_supported_languages():
    """Get list of supported programming languages"""
    return {
        "languages": [
            {
                "id": "python",
                "name": "Python",
                "description": "Python programming language with Claude optimization",
                "file_extensions": [".py"],
                "features": ["functions", "classes", "async", "type_hints", "data_science", "web_frameworks"]
            },
            {
                "id": "react",
                "name": "React",
                "description": "React with TypeScript/JavaScript, optimized for modern development",
                "file_extensions": [".tsx", ".jsx"],
                "features": ["components", "hooks", "state_management", "typescript", "testing", "performance"]
            },
            {
                "id": "typescript",
                "name": "TypeScript",
                "description": "TypeScript with advanced type system knowledge",
                "file_extensions": [".ts", ".tsx"],
                "features": ["types", "interfaces", "generics", "decorators", "modules", "tooling"]
            },
            {
                "id": "javascript",
                "name": "JavaScript",
                "description": "Modern JavaScript (ES6+) with best practices",
                "file_extensions": [".js", ".jsx"],
                "features": ["functions", "objects", "async", "modules", "dom_manipulation", "node_js"]
            },
            {
                "id": "html",
                "name": "HTML",
                "description": "Semantic HTML5 with accessibility focus",
                "file_extensions": [".html", ".htm"],
                "features": ["semantic_markup", "accessibility", "forms", "responsive_design"]
            },
            {
                "id": "css",
                "name": "CSS",
                "description": "Modern CSS with Flexbox, Grid, and animations",
                "file_extensions": [".css", ".scss", ".sass"],
                "features": ["flexbox", "grid", "animations", "responsive_design", "preprocessors"]
            },
            {
                "id": "sql",
                "name": "SQL",
                "description": "Database queries and schema design",
                "file_extensions": [".sql"],
                "features": ["queries", "schema_design", "optimization", "stored_procedures"]
            }
        ]
    }

@router.get("/sessions")
async def list_active_sessions():
    """List all active sessions (for debugging)"""
    cleanup_old_sessions()
    sessions_info = []
    for session_id, session_data in chat_sessions.items():
        sessions_info.append({
            "session_id": session_id,
            "message_count": len(session_data.get('messages', [])),
            "language": session_data.get('language', 'unknown'),
            "last_updated": session_data.get('last_updated'),
            "has_repo": bool(session_data.get('repository_info')),
            "context_files_count": len(session_data.get('context_files', []))
        })
    
    return {
        "active_sessions": len(sessions_info),
        "sessions": sessions_info
    }