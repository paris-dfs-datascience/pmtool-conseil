from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from models import ChatRequest, ChatResponse
import vertexai
from vertexai.generative_models import GenerativeModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Vertex AI
PROJECT_ID = "lma-website-461920"
LOCATION = "us-central1"

def initialize_vertex_ai():
    """Initialize Vertex AI"""
    try:
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        logger.info("Vertex AI initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Vertex AI: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize Vertex AI")

def get_gemini_model():
    """Get a stable Gemini Pro model"""
    try:
        model = GenerativeModel(model_name="gemini-2.0-flash-001")
        return model
    except Exception as e:
        logger.error(f"Failed to initialize Gemini model: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize AI model")

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Basic chat endpoint using Vertex AI Gemini Pro"""
    try:
        # Initialize Vertex AI if not already done
        initialize_vertex_ai()
        
        # Get the model
        model = get_gemini_model()
        
        # Simple approach: combine all messages into a single prompt
        conversation = []
        for msg in request.messages:
            if msg.role == "user":
                conversation.append(f"User: {msg.content}")
            elif msg.role == "assistant":
                conversation.append(f"Assistant: {msg.content}")
        
        # Get the last user message or use a default
        if conversation:
            prompt = "\n".join(conversation)
        else:
            prompt = "Hello"
        
        # Generate response
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": request.temperature,
                "top_p": 0.95,
                "max_output_tokens": request.max_tokens,
            }
        )
        
        # Extract response text
        response_text = response.text if response.text else "I'm sorry, I couldn't generate a response."
        
        return ChatResponse(
            response=response_text,
            status="success"
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(
            response="I apologize, but I encountered an error. Please try again.",
            status="error"
        )

@router.get("/status")
async def status():
    """Status endpoint for basic chat service"""
    try:
        initialize_vertex_ai()
        model = get_gemini_model()
        
        # Test with a simple generation
        test_response = model.generate_content("Hello")
        
        return JSONResponse(content={
            "status": "healthy",
            "service": "basic-chat",
            "vertex_ai": "connected",
            "model": "gemini-2.0-flash-001",
            "test_response": "successful"
        })
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "basic-chat",
                "error": str(e)
            }
        )