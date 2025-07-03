import re
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional, AsyncGenerator

import httpx
import google.auth
from google.auth.transport.requests import Request

from .github_models import CodeBlock, GitHubAction, GitHubActionType, GitHubActionStatus
from .github_exceptions import ModelAPIError

logger = logging.getLogger(__name__)

class MistralClient:
    """Mistral Codestral client via Google Cloud Vertex AI Model Garden"""
    
    def __init__(self, project_id: str, region: str = "us-central1", model: str = "codestral-2501"):
        self.project_id = project_id
        self.region = region  
        self.model = model
        self.base_url = (
            f"https://{region}-aiplatform.googleapis.com/v1/projects/{project_id}"
            f"/locations/{region}/publishers/mistralai/models/{model}:rawPredict"
        )
        
        logger.info(f"Mistral client initialized for model {model} in {region}")
    
    def get_access_token(self) -> str:
        """Get Google Cloud access token"""
        try:
            credentials, _ = google.auth.default(
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
            credentials.refresh(Request())
            return credentials.token
        except Exception as e:
            logger.error(f"Error getting access token: {e}")
            raise ModelAPIError(
                status_code=500,
                message=f"Failed to get GCP access token: {str(e)}",
                model=self.model
            )
    
    def build_system_prompt(self, repo_context: Optional[Dict[str, Any]] = None) -> str:
        """Build system prompt for GitHub code assistant"""
        base_prompt = """You are a Code Assistant powered by Mistral Codestral. You specialize in:

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

        if repo_context:
            base_prompt += f"\n\nRepository Context:\n{json.dumps(repo_context, indent=2)}"
        
        return base_prompt
    
    def extract_code_blocks(self, content: str) -> List[CodeBlock]:
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
    
    def extract_github_actions(self, content: str) -> Optional[GitHubAction]:
        """Extract GitHub action suggestions from assistant response"""
        content_lower = content.lower()
        
        if "create file" in content_lower or "creating file" in content_lower:
            return GitHubAction(
                type=GitHubActionType.CREATE_FILE, 
                status=GitHubActionStatus.SUGGESTED
            )
        elif "pull request" in content_lower or "create pr" in content_lower:
            return GitHubAction(
                type=GitHubActionType.CREATE_PR, 
                status=GitHubActionStatus.SUGGESTED
            )
        elif "repository structure" in content_lower or "analyze repo" in content_lower:
            return GitHubAction(
                type=GitHubActionType.ANALYZE_REPO, 
                status=GitHubActionStatus.SUGGESTED
            )
        elif "list files" in content_lower or "browse files" in content_lower:
            return GitHubAction(
                type=GitHubActionType.LIST_FILES, 
                status=GitHubActionStatus.SUGGESTED
            )
        
        return None
    
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        stream: bool = True,
        repo_context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.1,
        max_tokens: int = 4000
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate response using Mistral Codestral"""
        try:
            # Build system prompt with repository context
            system_message = self.build_system_prompt(repo_context)
            
            # Prepare messages for Mistral format
            formatted_messages = [
                {"role": "system", "content": system_message}
            ]
            formatted_messages.extend(messages)
            
            # Get access token
            token = self.get_access_token()
            
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.model,
                "messages": formatted_messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(self.base_url, json=payload, headers=headers)
                
                if response.status_code != 200:
                    error_detail = f"Model Garden API error: {response.status_code} - {response.text}"
                    logger.error(error_detail)
                    raise ModelAPIError(
                        status_code=response.status_code,
                        message=error_detail,
                        model=self.model
                    )
                
                data = response.json()
                
                # Extract content from Mistral response format
                if "choices" in data and data["choices"]:
                    content = data["choices"][0]["message"]["content"]
                    
                    if stream:
                        # Simulate streaming for consistency with frontend
                        async for chunk in self._stream_content(content):
                            yield chunk
                    else:
                        # Non-streaming response
                        code_blocks = self.extract_code_blocks(content)
                        github_action = self.extract_github_actions(content)
                        
                        yield {
                            "type": "complete",
                            "content": content,
                            "code_blocks": [block.dict() for block in code_blocks] if code_blocks else None,
                            "github_action": github_action.dict() if github_action else None
                        }
                else:
                    raise ModelAPIError(
                        status_code=500,
                        message="No response from Mistral model",
                        model=self.model
                    )
                        
        except httpx.TimeoutException:
            raise ModelAPIError(
                status_code=408,
                message="Model API request timed out",
                model=self.model
            )
        except httpx.HTTPError as e:
            raise ModelAPIError(
                status_code=500,
                message=f"HTTP error: {str(e)}",
                model=self.model
            )
        except Exception as e:
            logger.error(f"Error calling Mistral Codestral: {e}")
            raise ModelAPIError(
                status_code=500,
                message=str(e),
                model=self.model
            )
    
    async def _stream_content(self, content: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream content in chunks"""
        chunk_size = 50
        
        # Stream content chunks
        for i in range(0, len(content), chunk_size):
            chunk = content[i:i + chunk_size]
            yield {
                "type": "content",
                "content": chunk
            }
            # Small delay to simulate streaming
            await asyncio.sleep(0.01)
        
        # Extract and send metadata
        code_blocks = self.extract_code_blocks(content)
        github_action = self.extract_github_actions(content)
        
        yield {
            "type": "metadata",
            "code_blocks": [block.dict() for block in code_blocks] if code_blocks else None,
            "github_action": github_action.dict() if github_action else None
        }
    
    async def test_connection(self) -> bool:
        """Test connection to Mistral API"""
        try:
            test_messages = [{"role": "user", "content": "Hello"}]
            
            async for chunk in self.generate_response(
                test_messages, 
                stream=False, 
                max_tokens=10
            ):
                if chunk.get("type") == "complete":
                    return True
                elif "error" in chunk:
                    return False
            
            return False
            
        except Exception as e:
            logger.error(f"Mistral connection test failed: {e}")
            return False