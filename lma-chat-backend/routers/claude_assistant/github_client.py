import re
import base64
import time
import asyncio
import logging
from typing import Optional, Dict, Any, Tuple, List
from datetime import datetime

import httpx

from .github_models import (
    RateLimitInfo, GitHubAPIResponse, GitHubRepoInfo, 
    GitHubFileInfo, GitHubFileContent, RepositoryStructure
)
from .github_exceptions import (
    GitHubAPIError, GitHubConfigurationError, 
    GitHubValidationError, RateLimitExceededError
)

logger = logging.getLogger(__name__)

class GitHubClient:
    """GitHub API client with comprehensive error handling and rate limiting"""
    
    def __init__(self, token: str, base_url: str = "https://api.github.com"):
        if not token:
            raise GitHubConfigurationError(
                "GitHub token is required", 
                missing_config="GITHUB_TOKEN"
            )
        
        self.token = token
        self.base_url = base_url.rstrip('/')
        self.user_agent = "GitHub-Code-Assistant/1.0"
        
        # Rate limiting state
        self._rate_limit_cache = {}
        self._last_request_time = 0
        
        logger.info("GitHub client initialized successfully")
    
    @property
    def headers(self) -> Dict[str, str]:
        """Get standard headers for GitHub API requests"""
        return {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": self.user_agent
        }
    
    def validate_repo_url(self, repo_url: str) -> Tuple[str, str]:
        """Validate and parse GitHub repository URL"""
        if not repo_url:
            raise GitHubValidationError("Repository URL is required", field="repository_url")
        
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
                repo = repo.replace('.git', '')
                return owner, repo
        
        raise GitHubValidationError(
            f"Invalid GitHub repository URL: {repo_url}",
            field="repository_url",
            value=repo_url
        )
    
    def parse_rate_limit_headers(self, headers: Dict[str, str]) -> RateLimitInfo:
        """Parse rate limit information from response headers"""
        return RateLimitInfo(
            limit=int(headers.get('x-ratelimit-limit', 5000)),
            remaining=int(headers.get('x-ratelimit-remaining', 0)),
            reset=int(headers.get('x-ratelimit-reset', 0)),
            used=int(headers.get('x-ratelimit-used', 0)),
            resource=headers.get('x-ratelimit-resource', 'core')
        )
    
    def check_rate_limit(self, rate_limit_info: RateLimitInfo) -> Optional[int]:
        """Check if we need to wait for rate limits and return wait time"""
        current_time = int(time.time())
        
        # If we have very few requests remaining, wait until reset
        if rate_limit_info.remaining < 10:
            wait_time = max(0, rate_limit_info.reset - current_time)
            logger.warning(
                f"Rate limit nearly exhausted. Remaining: {rate_limit_info.remaining}, "
                f"Reset in: {wait_time}s"
            )
            return wait_time
        
        # If we're using requests rapidly, add a small delay
        if rate_limit_info.remaining < 100:
            logger.info(f"Rate limit getting low. Remaining: {rate_limit_info.remaining}")
            return 1  # Small delay
        
        return None
    
    async def make_request(
        self,
        method: str,
        endpoint: str,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        timeout: float = 30.0
    ) -> GitHubAPIResponse:
        """Make a GitHub API request with comprehensive error handling"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Make the request
                response = await client.request(
                    method=method.upper(),
                    url=url,
                    headers=self.headers,
                    json=json_data,
                    params=params
                )
                
                # Parse rate limit info
                rate_limit_info = self.parse_rate_limit_headers(response.headers)
                logger.info(
                    f"GitHub API Rate Limit - Remaining: {rate_limit_info.remaining}/{rate_limit_info.limit}"
                )
                
                # Handle successful responses
                if response.status_code in [200, 201]:
                    # Check if we should slow down for future requests
                    wait_time = self.check_rate_limit(rate_limit_info)
                    if wait_time:
                        logger.info(f"Adding {wait_time}s delay for rate limit management")
                        await asyncio.sleep(wait_time)
                    
                    return GitHubAPIResponse(
                        success=True,
                        data=response.json(),
                        rate_limit=rate_limit_info
                    )
                
                elif response.status_code == 304:
                    return GitHubAPIResponse(
                        success=True,
                        data=None,
                        rate_limit=rate_limit_info
                    )
                
                # Handle error responses
                else:
                    return await self._handle_error_response(response, rate_limit_info)
                    
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
    
    async def _handle_error_response(
        self, 
        response: httpx.Response, 
        rate_limit_info: RateLimitInfo
    ) -> GitHubAPIResponse:
        """Handle error responses from GitHub API"""
        try:
            error_data = response.json()
            error_message = error_data.get('message', f'HTTP {response.status_code}')
        except:
            error_message = f'HTTP {response.status_code}'
        
        if response.status_code == 403 and rate_limit_info.remaining == 0:
            # Rate limit exceeded
            reset_time = datetime.fromtimestamp(rate_limit_info.reset)
            wait_seconds = rate_limit_info.reset - int(time.time())
            
            raise RateLimitExceededError(
                status_code=403,
                message=f"GitHub API rate limit exceeded. Resets at {reset_time} (in {wait_seconds} seconds)",
                rate_limit_remaining=rate_limit_info.remaining,
                rate_limit_reset=rate_limit_info.reset,
                retry_after=wait_seconds,
                reset_time=rate_limit_info.reset
            )
        
        elif response.status_code == 401:
            raise GitHubAPIError(
                status_code=401,
                message="GitHub API authentication failed. Check your GitHub token.",
                rate_limit_remaining=rate_limit_info.remaining
            )
        
        elif response.status_code == 404:
            raise GitHubAPIError(
                status_code=404,
                message=f"GitHub API resource not found: {error_message}",
                rate_limit_remaining=rate_limit_info.remaining
            )
        
        elif response.status_code == 422:
            # Validation failed
            if isinstance(error_data, dict) and 'errors' in error_data:
                error_messages = [error.get('message', '') for error in error_data['errors']]
                error_message = '; '.join(error_messages)
            
            raise GitHubAPIError(
                status_code=422,
                message=f"GitHub API validation error: {error_message}",
                rate_limit_remaining=rate_limit_info.remaining
            )
        
        else:
            raise GitHubAPIError(
                status_code=response.status_code,
                message=f"GitHub API error: {error_message}",
                rate_limit_remaining=rate_limit_info.remaining
            )
    
    async def get_repo_info(self, repo_url: str) -> GitHubRepoInfo:
        """Get repository information"""
        owner, repo = self.validate_repo_url(repo_url)
        
        response = await self.make_request("GET", f"/repos/{owner}/{repo}")
        
        if not response.success:
            raise GitHubAPIError(500, "Failed to get repository information")
        
        data = response.data
        return GitHubRepoInfo(
            name=data["name"],
            full_name=data["full_name"],
            description=data.get("description"),
            language=data.get("language"),
            default_branch=data["default_branch"],
            private=data["private"],
            owner=data["owner"]["login"],
            html_url=data.get("html_url"),
            clone_url=data.get("clone_url"),
            stars=data.get("stargazers_count"),
            forks=data.get("forks_count")
        )
    
    async def create_file(
        self,
        repo_url: str,
        file_path: str,
        content: str,
        commit_message: str,
        branch: str = "main"
    ) -> Dict[str, Any]:
        """Create a file in repository"""
        owner, repo = self.validate_repo_url(repo_url)
        
        # Validate file path
        if not file_path or file_path.startswith('/'):
            raise GitHubValidationError(
                "File path cannot be empty or start with '/'",
                field="file_path",
                value=file_path
            )
        
        # Encode content to base64
        try:
            content_encoded = base64.b64encode(content.encode('utf-8')).decode('utf-8')
        except Exception as e:
            raise GitHubValidationError(f"Failed to encode file content: {str(e)}")
        
        payload = {
            "message": commit_message,
            "content": content_encoded,
            "branch": branch
        }
        
        response = await self.make_request(
            "PUT", 
            f"/repos/{owner}/{repo}/contents/{file_path}",
            json_data=payload,
            timeout=60.0
        )
        
        if not response.success:
            raise GitHubAPIError(500, "Failed to create file")
        
        return response.data
    
    async def get_file_content(self, repo_full_name: str, file_path: str) -> GitHubFileContent:
        """Get content of a specific file"""
        response = await self.make_request("GET", f"/repos/{repo_full_name}/contents/{file_path}")
        
        if not response.success:
            raise GitHubAPIError(500, "Failed to get file content")
        
        data = response.data
        content = base64.b64decode(data["content"]).decode('utf-8')
        
        return GitHubFileContent(
            path=data["path"],
            name=data["name"],
            content=content,
            sha=data["sha"],
            size=data["size"]
        )
    
    async def get_repo_files(self, repo_full_name: str, path: str = "") -> List[GitHubFileInfo]:
        """Get repository files and folders"""
        response = await self.make_request("GET", f"/repos/{repo_full_name}/contents/{path}")
        
        if not response.success:
            raise GitHubAPIError(500, "Failed to get repository files")
        
        files_data = response.data
        if not isinstance(files_data, list):
            files_data = [files_data]
        
        return [
            GitHubFileInfo(
                name=file["name"],
                path=file["path"],
                type=file["type"],
                size=file.get("size"),
                sha=file.get("sha"),
                download_url=file.get("download_url")
            )
            for file in files_data
        ]
    
    async def get_repo_languages(self, repo_full_name: str) -> Dict[str, int]:
        """Get repository languages"""
        response = await self.make_request("GET", f"/repos/{repo_full_name}/languages")
        
        if not response.success:
            raise GitHubAPIError(500, "Failed to get repository languages")
        
        return response.data
    
    async def create_pull_request(
        self,
        repo_url: str,
        title: str,
        body: str,
        head_branch: str,
        base_branch: str = "main",
        draft: bool = False
    ) -> Dict[str, Any]:
        """Create a pull request"""
        owner, repo = self.validate_repo_url(repo_url)
        
        payload = {
            "title": title,
            "body": body,
            "head": head_branch,
            "base": base_branch,
            "draft": draft
        }
        
        response = await self.make_request(
            "POST", 
            f"/repos/{owner}/{repo}/pulls",
            json_data=payload
        )
        
        if not response.success:
            raise GitHubAPIError(500, "Failed to create pull request")
        
        return response.data
    
    async def get_user_info(self) -> Dict[str, Any]:
        """Get current user information"""
        response = await self.make_request("GET", "/user")
        
        if not response.success:
            raise GitHubAPIError(500, "Failed to get user information")
        
        return response.data
    
    async def get_user_repositories(self, per_page: int = 50) -> List[Dict[str, Any]]:
        """Get user's repositories"""
        params = {"sort": "updated", "per_page": per_page}
        response = await self.make_request("GET", "/user/repos", params=params)
        
        if not response.success:
            raise GitHubAPIError(500, "Failed to get user repositories")
        
        return response.data
    
    async def analyze_repo_structure(self, repo_url: str) -> RepositoryStructure:
        """Analyze repository structure for AI context"""
        # Get basic repo info
        repo_info = await self.get_repo_info(repo_url)
        
        # Get languages
        try:
            languages = await self.get_repo_languages(repo_info.full_name)
        except:
            languages = {}
        
        # Get README content
        readme_content = None
        try:
            readme_response = await self.make_request("GET", f"/repos/{repo_info.full_name}/readme")
            if readme_response.success:
                readme_data = readme_response.data
                readme_content = base64.b64decode(readme_data["content"]).decode('utf-8')
                # Truncate for context
                if len(readme_content) > 2000:
                    readme_content = readme_content[:2000] + "..."
        except:
            pass
        
        # Get root directory structure
        try:
            root_files = await self.get_repo_files(repo_info.full_name)
        except:
            root_files = []
        
        return RepositoryStructure(
            repository_info=repo_info,
            languages=languages,
            readme_content=readme_content,
            root_structure=root_files,
            total_files=len(root_files)
        )