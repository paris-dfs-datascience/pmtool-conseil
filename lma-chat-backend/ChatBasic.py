from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from models import ChatRequest, ChatResponse
from google import genai
from google.genai import types
import logging
import json

logger = logging.getLogger(__name__)
router = APIRouter()

# Configuration
PROJECT_ID = "lma-website-461920"
LOCATION = "global"

def initialize_genai_client():
    """Initialize Google GenAI client"""
    try:
        client = genai.Client(
            vertexai=True,
            project=PROJECT_ID,
            location=LOCATION,
        )
        logger.info("Google GenAI client initialized successfully")
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Google GenAI client: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize GenAI client")

def build_contents_from_messages(messages):
    """Convert ChatRequest messages to GenAI contents format"""
    contents = []
    
    for msg in messages:
        # Map roles - GenAI uses 'user' and 'model' instead of 'assistant'
        role = "user" if msg.role == "user" else "model"
        
        content = types.Content(
            role=role,
            parts=[types.Part(text=msg.content)]
        )
        contents.append(content)
    
    return contents

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint using Google GenAI Gemini 2.5 Pro"""
    try:
        # Initialize client
        client = initialize_genai_client()
        
        # Convert messages to GenAI format
        contents = build_contents_from_messages(request.messages)
        
        # If no messages, add a default user message
        if not contents:
            contents = [
                types.Content(
                    role="user",
                    parts=[types.Part(text="Hello")]
                )
            ]
        
        # Configure generation parameters
        generate_content_config = types.GenerateContentConfig(
            temperature=request.temperature,
            top_p=0.95,
            seed=0,
            max_output_tokens=min(request.max_tokens, 65535),  # Cap at model limit
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT",
                    threshold="OFF"
                )
            ],
            response_mime_type="application/json",
            response_schema={"type": "OBJECT", "properties": {"response": {"type": "STRING"}}},
        )
        
        # Generate response (non-streaming for FastAPI compatibility)
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=contents,
            config=generate_content_config,
        )
        
        # Parse JSON response
        try:
            response_data = json.loads(response.text)
            response_text = response_data.get("response", "No response generated")
        except json.JSONDecodeError:
            # Fallback if response isn't valid JSON
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

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint using Google GenAI"""
    try:
        from fastapi.responses import StreamingResponse
        import asyncio
        
        # Initialize client
        client = initialize_genai_client()
        
        # Convert messages to GenAI format
        contents = build_contents_from_messages(request.messages)
        
        if not contents:
            contents = [
                types.Content(
                    role="user",
                    parts=[types.Part(text="Hello")]
                )
            ]
        
        # Configure generation parameters
        generate_content_config = types.GenerateContentConfig(
            temperature=request.temperature,
            top_p=0.95,
            seed=0,
            max_output_tokens=min(request.max_tokens, 65535),
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT",
                    threshold="OFF"
                )
            ],
            response_mime_type="application/json",
            response_schema={"type": "OBJECT", "properties": {"response": {"type": "STRING"}}}
        )
        
        def generate_stream():
            try:
                for chunk in client.models.generate_content_stream(
                    model="gemini-2.5-pro",
                    contents=contents,
                    config=generate_content_config,
                ):
                    if chunk.text:
                        yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )
        
    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        raise HTTPException(status_code=500, detail="Streaming failed")

@router.get("/status")
async def status():
    """Status endpoint for GenAI chat service"""
    try:
        client = initialize_genai_client()
        
        # Test with a simple generation
        test_contents = [
            types.Content(
                role="user",
                parts=[types.Part(text="Hello")]
            )
        ]
        
        test_config = types.GenerateContentConfig(
            temperature=0.5,
            max_output_tokens=100,
            response_mime_type="application/json",
            response_schema={"type": "OBJECT", "properties": {"response": {"type": "STRING"}}}
        )
        
        test_response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=test_contents,
            config=test_config
        )
        
        # Check if we got a valid response
        response_status = "successful"
        if test_response and test_response.text:
            try:
                # Try to parse the JSON response
                response_data = json.loads(test_response.text)
                response_status = "successful with valid JSON"
            except json.JSONDecodeError:
                response_status = "successful but invalid JSON format"
        else:
            response_status = "no response text received"
        
        return JSONResponse(content={
            "status": "healthy",
            "service": "genai-chat",
            "client": "google-genai",
            "model": "gemini-2.5-pro",
            "project": PROJECT_ID,
            "location": LOCATION,
            "test_response": response_status
        })
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "genai-chat",
                "error": str(e)
            }
        )