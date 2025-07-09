import re
import json
import asyncio
import logging
import os
from typing import List, Dict, Any, Optional, AsyncGenerator

from anthropic import AsyncAnthropic

from .github_models import CodeBlock, GitHubAction, GitHubActionType, GitHubActionStatus
from .github_exceptions import ModelAPIError

logger = logging.getLogger(__name__)

class ClaudeClient:
    """Claude Sonnet client using official Anthropic SDK"""
    
    def __init__(self, model: str = "claude-3-5-sonnet-20241022", api_key: Optional[str] = None):
        """
        Initialize Claude client
        
        Args:
            model: Claude model name
            api_key: Anthropic API key (if not provided, reads from ANTHROPIC_API_KEY)
        """
        self.model = model
        self.api_key = api_key or os.environ.get("CLAUDE")
        
        if not self.api_key:
            raise ValueError("CLAUDE environment variable is required")
        
        # Official Anthropic client
        self.client = AsyncAnthropic(api_key=self.api_key)
        
        # Built-in conversation management
        self.conversation_history: List[Dict[str, str]] = []
        self.max_history_length: int = 20
        
        logger.info(f"Claude client initialized for model {self.model}")
    
    def add_user_message(self, content: str) -> None:
        """Add a user message to conversation history"""
        self.conversation_history.append({"role": "user", "content": content})
        self._trim_history()
    
    def add_assistant_message(self, content: str) -> None:
        """Add an assistant message to conversation history"""
        self.conversation_history.append({"role": "assistant", "content": content})
        self._trim_history()
    
    def clear_conversation(self) -> None:
        """Clear the entire conversation history"""
        self.conversation_history = []
        logger.info("Conversation history cleared")
    
    def get_conversation_history(self) -> List[Dict[str, str]]:
        """Get the current conversation history"""
        return self.conversation_history.copy()
    
    def get_conversation_length(self) -> int:
        """Get the number of messages in conversation history"""
        return len(self.conversation_history)
    
    def set_max_history_length(self, max_length: int) -> None:
        """Set the maximum number of messages to keep in history"""
        self.max_history_length = max_length
        self._trim_history()
    
    def _trim_history(self) -> None:
        """Trim conversation history to max length, keeping recent messages"""
        if len(self.conversation_history) > self.max_history_length:
            self.conversation_history = self.conversation_history[-self.max_history_length:]
            logger.debug(f"Trimmed conversation history to {self.max_history_length} messages")
    
    def export_conversation(self) -> str:
        """Export conversation history as JSON string"""
        return json.dumps(self.conversation_history, indent=2)
    
    def import_conversation(self, conversation_json: str) -> None:
        """Import conversation history from JSON string"""
        try:
            imported_history = json.loads(conversation_json)
            if isinstance(imported_history, list):
                self.conversation_history = imported_history
                self._trim_history()
                logger.info(f"Imported conversation with {len(self.conversation_history)} messages")
            else:
                raise ValueError("Invalid conversation format")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {e}")
    
    def build_system_prompt(self, repo_context: Optional[Dict[str, Any]] = None) -> str:
        """Build system prompt for GitHub code assistant"""
        base_prompt = """You are a Code Assistant powered by Claude Sonnet. You specialize in:

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
        user_message: str,
        stream: bool = True,
        repo_context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.1,
        max_tokens: int = 4000,
        add_to_history: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate response using official Anthropic client"""
        try:
            # Add user message to conversation history
            if add_to_history:
                self.add_user_message(user_message)
            
            # Build system prompt with repository context
            system_prompt = self.build_system_prompt(repo_context)
            
            # Prepare messages in Anthropic format
            messages_to_send = self.conversation_history if add_to_history else [{"role": "user", "content": user_message}]
            
            assistant_response = ""
            
            if stream:
                # Streaming response using Anthropic's streaming API
                async with self.client.messages.stream(
                    model=self.model,
                    messages=messages_to_send,
                    system=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens
                ) as stream:
                    async for chunk in stream.text_stream:
                        assistant_response += chunk
                        yield {
                            "type": "content",
                            "content": chunk
                        }
                
                # Extract and send metadata after streaming is complete
                code_blocks = self.extract_code_blocks(assistant_response)
                github_action = self.extract_github_actions(assistant_response)
                
                yield {
                    "type": "metadata",
                    "code_blocks": [block.dict() for block in code_blocks] if code_blocks else None,
                    "github_action": github_action.dict() if github_action else None
                }
                
            else:
                # Non-streaming response
                response = await self.client.messages.create(
                    model=self.model,
                    messages=messages_to_send,
                    system=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                
                if response.content and response.content[0].text:
                    content = response.content[0].text
                    assistant_response = content
                    
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
                        message="No response from Claude model",
                        model=self.model
                    )
            
            # Add assistant response to conversation history
            if add_to_history and assistant_response:
                self.add_assistant_message(assistant_response)
                        
        except Exception as e:
            logger.error(f"Error calling Claude: {e}")
            raise ModelAPIError(
                status_code=500,
                message=str(e),
                model=self.model
            )
    
    async def test_connection(self) -> bool:
        """Test connection to Claude API"""
        try:
            async for chunk in self.generate_response(
                "Hello", 
                stream=False, 
                max_tokens=10,
                add_to_history=False
            ):
                if chunk.get("type") == "complete":
                    return True
                elif "error" in chunk:
                    return False
            
            return False
            
        except Exception as e:
            logger.error(f"Claude connection test failed: {e}")
            return False