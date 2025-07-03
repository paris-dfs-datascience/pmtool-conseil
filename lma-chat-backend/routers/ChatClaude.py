from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from models import ChatRequest, ChatResponse, MessageRole
import anthropic
import logging
import json
import asyncio
import time
import random
from datetime import datetime, timedelta
import os
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter()

# Configuration
MODEL = "claude-3-opus-20240229"  # Most capable Claude model

# Alternative models you can use:
# MODEL = "claude-3-5-sonnet-20241022"  # Latest and very capable
# MODEL = "claude-3-sonnet-20240229"    # Balanced
# MODEL = "claude-3-haiku-20240307"     # Fastest

# Global client instance (reuse across requests)
_anthropic_client = None

class RateLimiter:
    """Rate limiter to prevent quota exhaustion"""
    def __init__(self, max_requests_per_minute=100):
        self.max_requests = max_requests_per_minute
        self.requests = []
    
    async def check_rate_limit(self):
        """Check if request is within rate limits"""
        now = datetime.now()
        # Remove requests older than 1 minute
        self.requests = [req_time for req_time in self.requests if now - req_time < timedelta(minutes=1)]
        
        if len(self.requests) >= self.max_requests:
            logger.warning(f"Rate limit exceeded: {len(self.requests)} requests in the last minute")
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        
        self.requests.append(now)
        logger.debug(f"Rate limit check passed: {len(self.requests)}/{self.max_requests} requests in the last minute")

# Initialize rate limiter
rate_limiter = RateLimiter(max_requests_per_minute=95)  # Slightly below API limits for safety

def get_claude_api_key():
    """Get Claude API key from environment variable"""
    api_key = os.environ.get("CLAUDE")
    if not api_key:
        logger.error("CLAUDE environment variable not found")
        raise HTTPException(status_code=500, detail="Claude API key not configured")
    
    logger.info("Successfully retrieved API key from environment variable")
    return api_key

def get_anthropic_client():
    """Get or create Anthropic client (singleton pattern)"""
    global _anthropic_client
    if _anthropic_client is None:
        try:
            # Get API key from environment variable
            api_key = get_claude_api_key()
            
            _anthropic_client = anthropic.Anthropic(api_key=api_key)
            logger.info("Anthropic client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic client: {e}")
            raise HTTPException(status_code=500, detail="Failed to initialize Anthropic client")
    return _anthropic_client

def build_messages_from_request(messages):
    """Convert ChatRequest messages to Anthropic messages format"""
    anthropic_messages = []
    system_message = None

    for msg in messages:
        if msg.role == MessageRole.SYSTEM:
            # Store system message separately (Anthropic handles it as a parameter)
            system_message = msg.content
            continue
        
        role = "user" if msg.role == MessageRole.USER else "assistant"
        anthropic_messages.append({
            "role": role,
            "content": msg.content
        })

    return anthropic_messages, system_message

async def make_request_with_backoff(client, anthropic_messages, system_message, request, max_retries=3):
    """Make API request with exponential backoff retry logic"""
    for attempt in range(max_retries):
        try:
            logger.debug(f"Making API request (attempt {attempt + 1}/{max_retries})")
            
            # Prepare request parameters
            request_params = {
                "model": MODEL,
                "max_tokens": request.max_tokens,
                "temperature": request.temperature,
                "messages": anthropic_messages
            }
            
            # Add system message if present
            if system_message:
                request_params["system"] = system_message
            
            response = client.messages.create(**request_params)
            logger.debug("API request successful")
            return response
            
        except anthropic.RateLimitError as e:
            logger.warning(f"Rate limit error on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                # Exponential backoff with jitter
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                logger.info(f"Retrying in {wait_time:.2f} seconds...")
                await asyncio.sleep(wait_time)
                continue
            raise e
        except anthropic.APIError as e:
            logger.error(f"Anthropic API error on attempt {attempt + 1}: {e}")
            raise e
        except Exception as e:
            logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")
            raise e

async def make_stream_request_with_backoff(client, anthropic_messages, system_message, request, max_retries=3):
    """Make streaming API request with exponential backoff retry logic"""
    for attempt in range(max_retries):
        try:
            logger.debug(f"Making streaming API request (attempt {attempt + 1}/{max_retries})")
            
            # Prepare request parameters
            request_params = {
                "model": MODEL,
                "max_tokens": request.max_tokens,
                "temperature": request.temperature,
                "messages": anthropic_messages
            }
            
            # Add system message if present
            if system_message:
                request_params["system"] = system_message
            
            return client.messages.stream(**request_params)
            
        except anthropic.RateLimitError as e:
            logger.warning(f"Rate limit error on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                # Exponential backoff with jitter
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                logger.info(f"Retrying in {wait_time:.2f} seconds...")
                await asyncio.sleep(wait_time)
                continue
            raise e
        except anthropic.APIError as e:
            logger.error(f"Anthropic API error on attempt {attempt + 1}: {e}")
            raise e
        except Exception as e:
            logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")
            raise e

@router.post("/chat/claude", response_model=ChatResponse)
async def chat_claude(request: ChatRequest):
    """Chat endpoint using direct Anthropic API"""
    try:
        # Check rate limit first
        await rate_limiter.check_rate_limit()
        
        # Get client
        client = get_anthropic_client()

        # Convert messages to Anthropic format
        anthropic_messages, system_message = build_messages_from_request(request.messages)

        # If no messages, add a default user message
        if not anthropic_messages:
            anthropic_messages = [
                {
                    "role": "user",
                    "content": "Hello"
                }
            ]

        # Make request with retry logic
        response = await make_request_with_backoff(client, anthropic_messages, system_message, request)

        # Extract response text
        response_text = ""
        if response.content:
            for content_block in response.content:
                if hasattr(content_block, 'text'):
                    response_text += content_block.text

        if not response_text:
            response_text = "I'm sorry, I couldn't generate a response."

        logger.info("Chat request completed successfully")
        return ChatResponse(
            response=response_text,
            status="success"
        )

    except HTTPException:
        # Re-raise HTTPExceptions (like rate limit errors) as-is
        raise
    except anthropic.RateLimitError as e:
        logger.error(f"Rate limit exceeded: {e}")
        return ChatResponse(
            response="I'm currently experiencing high demand. Please try again in a moment.",
            status="error"
        )
    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        return ChatResponse(
            response="I'm having trouble connecting to the AI service. Please try again.",
            status="error"
        )
    except Exception as e:
        logger.error(f"Unexpected chat error: {e}")
        return ChatResponse(
            response="I apologize, but I encountered an error. Please try again.",
            status="error"
        )

@router.post("/chat/claude/stream")
async def chat_claude_stream(request: ChatRequest):
    """Streaming chat endpoint using direct Anthropic API"""
    try:
        # Check rate limit first
        await rate_limiter.check_rate_limit()
        
        # Get client
        client = get_anthropic_client()

        # Convert messages to Anthropic format
        anthropic_messages, system_message = build_messages_from_request(request.messages)

        if not anthropic_messages:
            anthropic_messages = [
                {
                    "role": "user",
                    "content": "Hello"
                }
            ]

        async def generate_stream():
            try:
                # Make streaming request with retry logic
                stream = await make_stream_request_with_backoff(
                    client, anthropic_messages, system_message, request
                )
                
                with stream as stream_context:
                    for text in stream_context.text_stream:
                        yield f"data: {json.dumps({'chunk': text})}\n\n"
                yield "data: [DONE]\n\n"
                logger.info("Streaming chat request completed successfully")
                
            except anthropic.RateLimitError as e:
                logger.error(f"Rate limit exceeded in stream: {e}")
                yield f"data: {json.dumps({'error': 'High demand detected. Please try again in a moment.'})}\n\n"
            except anthropic.APIError as e:
                logger.error(f"Anthropic API error in stream: {e}")
                yield f"data: {json.dumps({'error': 'Connection issue with AI service. Please try again.'})}\n\n"
            except Exception as e:
                logger.error(f"Unexpected streaming error: {e}")
                yield f"data: {json.dumps({'error': 'An unexpected error occurred. Please try again.'})}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )

    except HTTPException:
        # Re-raise HTTPExceptions (like rate limit errors) as-is
        raise
    except Exception as e:
        logger.error(f"Chat stream initialization error: {e}")
        raise HTTPException(status_code=500, detail="Streaming failed to initialize")

@router.get("/status/claude")
async def status_claude():
    """Status endpoint for Anthropic Claude chat service"""
    try:
        # Check if client can be initialized without making API calls
        client = get_anthropic_client()
        
        # Get current rate limit status
        now = datetime.now()
        recent_requests = [req_time for req_time in rate_limiter.requests if now - req_time < timedelta(minutes=1)]
        
        return JSONResponse(content={
            "status": "healthy",
            "service": "anthropic-claude-direct",
            "client": "anthropic-python",
            "model": MODEL,
            "api_key_source": "environment_variable",
            "api_endpoint": "https://api.anthropic.com/v1/messages",
            "rate_limit": {
                "requests_last_minute": len(recent_requests),
                "max_requests_per_minute": rate_limiter.max_requests,
                "available_requests": rate_limiter.max_requests - len(recent_requests)
            },
            "note": "Direct Anthropic API client initialized successfully using environment variable"
        })
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "anthropic-claude-direct",
                "error": str(e)
            }
        )

@router.get("/models/available")
async def available_models():
    """Get list of available Claude models"""
    return JSONResponse(content={
        "current_model": MODEL,
        "available_models": [
            {
                "id": "claude-3-opus-20240229",
                "name": "Claude 3 Opus",
                "description": "Most capable model for complex reasoning (CURRENT)"
            },
            {
                "id": "claude-3-5-sonnet-20241022",
                "name": "Claude 3.5 Sonnet",
                "description": "Latest and very capable model, excellent balance"
            },
            {
                "id": "claude-3-sonnet-20240229",
                "name": "Claude 3 Sonnet",
                "description": "Balanced performance and speed"
            },
            {
                "id": "claude-3-haiku-20240307",
                "name": "Claude 3 Haiku",
                "description": "Fastest model for simple tasks"
            }
        ]
    })