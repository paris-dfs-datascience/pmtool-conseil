# Complete moe_chat.py file
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import logging
import os
from datetime import datetime
from huggingface_hub import InferenceClient

# Create the router instance
router = APIRouter()

# Set up logging
logger = logging.getLogger(__name__)

# Environment variables
HF_TOKEN = os.getenv("REACT_APP_HF_TOKEN")
# Initialize the HuggingFace InferenceClient with standard setup
client = InferenceClient(token=HF_TOKEN) if HF_TOKEN else None

# Pydantic models
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    temperature: float = 0.7
    max_tokens: int = 4096

class ChatResponse(BaseModel):
    response: str
    status: str

class StatusResponse(BaseModel):
    status: str
    service: str
    model: str
    features: List[str]
    error: Optional[str] = None

# Helper functions
def get_current_user(request: Request):
    """Get the current authenticated user from request state"""
    if hasattr(request.state, 'user'):
        return request.state.user
    return None

async def require_user(request: Request):
    """Dependency to get current user (request must be authenticated by middleware)"""
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="User not found in request")
    return user

def call_huggingface_api(messages: List[Message], temperature: float = 0.7, max_tokens: int = 4096) -> str:
    """Call Hugging Face API using the official InferenceClient"""
    logger.info(f"Calling HF InferenceClient with {len(messages)} messages, temp={temperature}, max_tokens={max_tokens}")
    
    if not client:
        logger.error("HF_TOKEN not configured!")
        raise HTTPException(status_code=500, detail="HF_TOKEN not configured")
    
    try:
        # Convert messages to the format expected by the client
        message_dicts = [{"role": msg.role, "content": msg.content} for msg in messages]
        
        # Filter out any invalid messages and ensure proper format
        valid_messages = []
        for msg in message_dicts:
            if msg.get("role") in ["user", "assistant", "system"] and msg.get("content"):
                valid_messages.append({
                    "role": msg["role"],
                    "content": str(msg["content"]).strip()
                })
        
        if not valid_messages:
            raise ValueError("No valid messages provided")
        
        logger.info(f"Calling InferenceClient with {len(valid_messages)} valid messages")
        
        # Ensure parameters are within valid ranges
        temperature = max(0.0, min(2.0, temperature))
        max_tokens = max(1, min(8192, max_tokens))
        
        # Try using chat_completion with different models
        models_to_try = [
            "mistralai/Mistral-7B-Instruct-v0.3",
            "meta-llama/Meta-Llama-3-8B-Instruct",
            "HuggingFaceH4/zephyr-7b-beta"
        ]
        
        for model in models_to_try:
            try:
                logger.info(f"Trying model: {model}")
                
                response = client.chat_completion(
                    messages=valid_messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                
                logger.info(f"Success with model: {model}")
                
                if response.choices and len(response.choices) > 0:
                    content = response.choices[0].message.content
                    if content:
                        return content.strip()
                
            except Exception as model_error:
                logger.warning(f"Model {model} failed: {str(model_error)}")
                continue
        
        raise ValueError("All models failed to respond")
            
    except Exception as e:
        logger.error(f"InferenceClient error: {e}")
        raise HTTPException(status_code=500, detail="Failed to communicate with AI service")

# Endpoints
@router.post("/chat", response_model=ChatResponse)
async def moe_chat(request: ChatRequest, req: Request):
    """MOE chat endpoint with Firebase auth support"""
    try:
        # Get authenticated user info
        user = get_current_user(req)
        user_id = user.get('uid') if user else 'anonymous'
        user_email = user.get('email') if user else 'unknown'
        
        logger.info(f"MOE chat request from user {user_email} ({user_id}) with {len(request.messages)} messages")
        
        # Debug: Log the actual messages
        for i, msg in enumerate(request.messages):
            logger.info(f"Message {i}: role={msg.role}, content_preview={msg.content[:100]}...")
        
        if not request.messages:
            return ChatResponse(
                response="Please provide a message.",
                status="error"
            )
        
        # Validate message format - ensure we have at least one user message
        user_messages = [msg for msg in request.messages if msg.role == "user"]
        if not user_messages:
            return ChatResponse(
                response="Please provide at least one user message.",
                status="error"
            )
        
        # Call Hugging Face API
        response_text = call_huggingface_api(
            messages=request.messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        return ChatResponse(
            response=response_text,
            status="success"
        )
        
    except Exception as e:
        user = get_current_user(req)
        user_id = user.get('uid') if user else 'anonymous'
        logger.error(f"MOE chat error for user {user_id}: {str(e)}", exc_info=True)
        return ChatResponse(
            response="I apologize, but I encountered an error. Please try again.",
            status="error"
        )

@router.get("/status", response_model=StatusResponse)
async def get_moe_status(req: Request):
    """MOE health check endpoint with user context"""
    try:
        user = get_current_user(req)
        user_email = user.get('email') if user else 'anonymous'
        logger.info(f"MOE status check from user: {user_email}")
        
        if not client:
            return StatusResponse(
                status="unhealthy",
                service="moe-chat",
                model="huggingface-inference-client",
                features=["text_chat"],
                error="HF_TOKEN not configured"
            )
        
        # Test with a simple call
        try:
            test_response = client.chat_completion(
                messages=[{"role": "user", "content": "Hello"}],
                model="mistralai/Mistral-7B-Instruct-v0.3",
                max_tokens=10
            )
            
            return StatusResponse(
                status="healthy",
                service="moe-chat", 
                model="huggingface-inference-client",
                features=["text_chat", "firebase_auth", "multi_model_fallback"]
            )
        except Exception as test_error:
            logger.error(f"Status check failed: {test_error}")
            return StatusResponse(
                status="unhealthy",
                service="moe-chat",
                model="huggingface-inference-client", 
                features=["text_chat"],
                error=f"Test call failed: {str(test_error)}"
            )
        if not HF_TOKEN:
            return StatusResponse(
                status="unhealthy",
                service="moe-chat",
                model="mistral-7b-instruct",
                features=["text_chat"],
                error="HF_TOKEN not configured"
            )
        
        # Quick test call to HF API
        headers = {"Authorization": f"Bearer {HF_TOKEN}"}
        test_payload = {
            "inputs": "[INST] Hello [/INST]",
            "parameters": {"max_new_tokens": 10, "return_full_text": False}
        }
        
        response = requests.post(HF_CHAT_URL, headers=headers, json=test_payload, timeout=10)
        
        if response.status_code == 200:
            return StatusResponse(
                status="healthy",
                service="moe-chat", 
                model="mistral-7b-instruct",
                features=["text_chat", "firebase_auth"]
            )
        else:
            logger.error(f"Status check failed: {response.status_code} - {response.text}")
            return StatusResponse(
                status="unhealthy",
                service="moe-chat",
                model="mistral-7b-instruct", 
                features=["text_chat"],
                error=f"HF API returned {response.status_code}: {response.text}"
            )
            
    except Exception as e:
        logger.error(f"MOE status check failed: {e}")
        return StatusResponse(
            status="unhealthy",
            service="moe-chat",
            model="huggingface-inference-client",
            features=["text_chat"],
            error=str(e)
        )