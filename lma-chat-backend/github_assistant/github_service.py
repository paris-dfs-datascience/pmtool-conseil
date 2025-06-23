import logging
from typing import Optional, Dict, Any, List, AsyncGenerator
from datetime import datetime

from .github_client import GitHubClient
from .mistral_client import MistralClient
from .github_models import (
    GitHubChatRequest, GitHubChatResponse, GitHubFileCreateRequest,
    GitHubPRCreateRequest, GitHubServiceStatus, RepositoryStructure,
    GitHubMessage, CodeBlock, GitHubAction
)
from .github_exceptions import (
    GitHubAPIError, GitHubConfigurationError, ModelAPIError
)

logger = logging.getLogger(__name__)

class GitHubService:
    """Service layer for GitHub code assistant operations"""
    
    def __init__(
        self, 
        github_token: str,
        project_id: str,
        region: str = "us-central1",
        model: str = "codestral-2501"
    ):
        self.github_client = GitHubClient(github_token)
        self.mistral_client = MistralClient(project_id, region, model)
        
        logger.info("GitHub service initialized successfully")
    
    async def chat(self, request: GitHubChatRequest) -> GitHubChatResponse:
        """Handle chat request with GitHub context"""
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
                try:
                    repo_structure = await self.github_client.analyze_repo_structure(
                        request.repository_url
                    )
                    repo_context = repo_structure.dict()
                except Exception as e:
                    logger.warning(f"Failed to get repo context: {e}")
                    # Continue without repo context
            
            # Generate response
            full_response = ""
            code_blocks = None
            github_action = None
            
            async for chunk in self.mistral_client.generate_response(
                messages,
                stream=request.stream,
                repo_context=repo_context,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            ):
                if chunk.get("type") == "complete":
                    full_response = chunk["content"]
                    if chunk.get("code_blocks"):
                        code_blocks = [CodeBlock(**block) for block in chunk["code_blocks"]]
                    if chunk.get("github_action"):
                        github_action = GitHubAction(**chunk["github_action"])
                    break
                elif chunk.get("type") == "content":
                    full_response += chunk["content"]
                elif chunk.get("type") == "metadata":
                    if chunk.get("code_blocks"):
                        code_blocks = [CodeBlock(**block) for block in chunk["code_blocks"]]
                    if chunk.get("github_action"):
                        github_action = GitHubAction(**chunk["github_action"])
            
            return GitHubChatResponse(
                message=full_response,
                code_blocks=code_blocks,
                github_action=github_action
            )
            
        except Exception as e:
            logger.error(f"Error in chat service: {e}")
            raise
    
    async def stream_chat(self, request: GitHubChatRequest) -> AsyncGenerator[str, None]:
        """Stream chat response"""
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
                try:
                    repo_structure = await self.github_client.analyze_repo_structure(
                        request.repository_url
                    )
                    repo_context = repo_structure.dict()
                except Exception as e:
                    logger.warning(f"Failed to get repo context: {e}")
            
            # Stream response
            async for chunk in self.mistral_client.generate_response(
                messages,
                stream=True,
                repo_context=repo_context,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            ):
                yield f"data: {chunk}\n\n"
                
        except Exception as e:
            logger.error(f"Error in stream chat service: {e}")
            error_chunk = {"type": "error", "error": str(e)}
            yield f"data: {error_chunk}\n\n"
    
    async def create_file(self, request: GitHubFileCreateRequest) -> Dict[str, Any]:
        """Create a file in GitHub repository"""
        try:
            result = await self.github_client.create_file(
                repo_url=request.repository_url,
                file_path=request.file_path,
                content=request.content,
                commit_message=request.commit_message,
                branch=request.branch
            )
            
            return {
                "success": True,
                "message": "File created successfully",
                "data": result
            }
            
        except Exception as e:
            logger.error(f"Error creating file: {e}")
            raise
    
    async def create_pull_request(self, request: GitHubPRCreateRequest) -> Dict[str, Any]:
        """Create a pull request"""
        try:
            result = await self.github_client.create_pull_request(
                repo_url=request.repository_url,
                title=request.title,
                body=request.body,
                head_branch=request.head_branch,
                base_branch=request.base_branch,
                draft=request.draft
            )
            
            return {
                "success": True,
                "message": "Pull request created successfully", 
                "data": result
            }
            
        except Exception as e:
            logger.error(f"Error creating pull request: {e}")
            raise
    
    async def get_repo_info(self, repo_url: str) -> Dict[str, Any]:
        """Get repository information"""
        try:
            repo_info = await self.github_client.get_repo_info(repo_url)
            return repo_info.dict()
            
        except Exception as e:
            logger.error(f"Error getting repo info: {e}")
            raise
    
    async def get_repo_structure(self, repo_url: str) -> RepositoryStructure:
        """Analyze repository structure"""
        try:
            return await self.github_client.analyze_repo_structure(repo_url)
            
        except Exception as e:
            logger.error(f"Error analyzing repo structure: {e}")
            raise
    
    async def get_repo_languages(self, repo_full_name: str) -> Dict[str, int]:
        """Get repository languages"""
        try:
            return await self.github_client.get_repo_languages(repo_full_name)
            
        except Exception as e:
            logger.error(f"Error getting repo languages: {e}")
            raise
    
    async def get_repo_files(self, repo_full_name: str, path: str = "") -> List[Dict[str, Any]]:
        """Get repository files"""
        try:
            files = await self.github_client.get_repo_files(repo_full_name, path)
            return [file.dict() for file in files]
            
        except Exception as e:
            logger.error(f"Error getting repo files: {e}")
            raise
    
    async def get_file_content(self, repo_full_name: str, file_path: str) -> Dict[str, Any]:
        """Get file content"""
        try:
            file_content = await self.github_client.get_file_content(repo_full_name, file_path)
            return file_content.dict()
            
        except Exception as e:
            logger.error(f"Error getting file content: {e}")
            raise
    
    async def get_user_info(self) -> Dict[str, Any]:
        """Get GitHub user information"""
        try:
            return await self.github_client.get_user_info()
            
        except Exception as e:
            logger.error(f"Error getting user info: {e}")
            raise
    
    async def get_user_repositories(self) -> List[Dict[str, Any]]:
        """Get user repositories"""
        try:
            return await self.github_client.get_user_repositories()
            
        except Exception as e:
            logger.error(f"Error getting user repositories: {e}")
            raise
    
    async def get_service_status(self) -> GitHubServiceStatus:
        """Get comprehensive service status"""
        try:
            status_info = GitHubServiceStatus(
                status="operational",
                model=self.mistral_client.model,
                platform="Google Cloud Vertex AI Model Garden",
                capabilities=[
                    "Code generation",
                    "GitHub integration",
                    "Code review", 
                    "File creation",
                    "Pull request management"
                ],
                configuration={
                    "project_id": self.mistral_client.project_id,
                    "region": self.mistral_client.region,
                    "model": self.mistral_client.model,
                    "github_integration": True,
                    "model_garden_connected": False,
                    "github_api_accessible": False,
                    "test_results": {}
                }
            )
            
            # Test Model Garden connection
            try:
                model_connected = await self.mistral_client.test_connection()
                status_info.configuration["model_garden_connected"] = model_connected
                status_info.configuration["test_results"]["model_garden"] = (
                    "successful" if model_connected else "failed"
                )
            except Exception as e:
                logger.error(f"Model Garden test failed: {e}")
                status_info.configuration["test_results"]["model_garden"] = f"failed - {str(e)}"
            
            # Test GitHub API connection
            try:
                user_info = await self.github_client.get_user_info()
                status_info.configuration["github_api_accessible"] = True
                status_info.configuration["test_results"]["github_api"] = "successful"
                status_info.configuration["github_user"] = user_info.get("login")
            except Exception as e:
                logger.error(f"GitHub API test failed: {e}")
                status_info.configuration["test_results"]["github_api"] = f"failed - {str(e)}"
            
            # Determine overall status
            if (status_info.configuration["model_garden_connected"] and 
                status_info.configuration["github_api_accessible"]):
                status_info.status = "operational"
            else:
                status_info.status = "degraded"
            
            return status_info
            
        except Exception as e:
            logger.error(f"Status check failed: {e}")
            return GitHubServiceStatus(
                status="error",
                model=self.mistral_client.model,
                platform="Google Cloud Vertex AI Model Garden",
                configuration={
                    "error": str(e),
                    "model_garden_connected": False,
                    "github_integration": True,
                    "project_id": self.mistral_client.project_id,
                    "region": self.mistral_client.region,
                    "model": self.mistral_client.model
                }
            )