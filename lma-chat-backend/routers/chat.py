from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse
from models import ChatRequest, ChatResponse
from google import genai
from google.genai import types
import logging
import json
import base64
from typing import List, Optional

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

def process_file_for_genai(file_content: bytes, filename: str, content_type: str):
    """Process uploaded file for GenAI"""
    
    if content_type == 'application/pdf':
        # For PDFs, create a blob part
        return types.Part(
            inline_data=types.Blob(
                mime_type=content_type,
                data=base64.b64encode(file_content).decode()
            )
        )
    elif content_type and content_type.startswith('text/'):
        # For text files, use text content
        return types.Part(text=file_content.decode('utf-8'))
    else:
        raise ValueError(f"Unsupported file type: {content_type}")

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

# Add this enhanced version to your chat.py file

@router.post("/chat/with-files", response_model=ChatResponse)
async def chat_with_files(
    message: str = Form(...),
    temperature: float = Form(0.7),
    max_tokens: int = Form(4096),
    files: List[UploadFile] = File(default=[])
):
    """Enhanced chat endpoint with PDF and text file support"""
    try:
        # Debug logging
        logger.info(f"=== CHAT WITH FILES REQUEST ===")
        logger.info(f"Message: '{message}'")
        logger.info(f"Temperature: {temperature}")
        logger.info(f"Max tokens: {max_tokens}")
        logger.info(f"Files received: {len(files) if files else 0}")
        
        if files:
            for i, file in enumerate(files):
                logger.info(f"File {i}: name='{file.filename}', type='{file.content_type}', size={file.size}")
        
        # Validate inputs
        if not message or not message.strip():
            if not files:
                logger.error("No message and no files provided")
                return ChatResponse(
                    response="Please provide a message or upload a file.",
                    status="error"
                )
            else:
                message = "Please analyze the uploaded files."
                logger.info(f"No message provided, using default: '{message}'")
        
        client = initialize_genai_client()
        
        # Build content parts - IMPORTANT: PDF files should come BEFORE text prompt
        parts = []
        pdf_parts = []
        text_parts = []
        
        # Process uploaded files first
        files_processed = 0
        if files:
            for file in files:
                if file.filename and file.size > 0:
                    logger.info(f"Processing file: {file.filename}")
                    
                    try:
                        file_content = await file.read()
                        logger.info(f"Read {len(file_content)} bytes from {file.filename}")
                        
                        if file.content_type == 'application/pdf':
                            # Check total request size before processing
                            file_size_mb = len(file_content) / (1024 * 1024)
                            logger.info(f"PDF size: {file_size_mb:.2f} MB")
                            
                            # Base64 encoding increases size by ~33%
                            estimated_request_size = len(file_content) * 1.33
                            if estimated_request_size > 15 * 1024 * 1024:  # 15MB safety margin
                                logger.error(f"PDF too large for inline processing: {estimated_request_size / (1024*1024):.2f} MB")
                                return ChatResponse(
                                    response=f"PDF file is too large ({file_size_mb:.1f} MB). Please use a smaller file (under 10MB) or split the document.",
                                    status="error"
                                )
                            
                            # CORRECTED METHOD: Using Part.from_bytes (recommended)
                            try:
                                file_part = types.Part.from_bytes(
                                    data=file_content,
                                    mime_type="application/pdf"
                                )
                                pdf_parts.append(file_part)
                                files_processed += 1
                                logger.info(f"Successfully processed PDF using from_bytes: {file.filename}")
                            except Exception as bytes_error:
                                logger.warning(f"from_bytes failed, trying inline_data: {bytes_error}")
                                
                                # FALLBACK: Original inline_data method
                                file_part = types.Part(
                                    inline_data=types.Blob(
                                        mime_type="application/pdf",
                                        data=base64.b64encode(file_content).decode('utf-8')
                                    )
                                )
                                pdf_parts.append(file_part)
                                files_processed += 1
                                logger.info(f"Successfully processed PDF using inline_data fallback: {file.filename}")
                            
                        elif file.content_type and file.content_type.startswith('text/'):
                            # Process text file
                            text_content = file_content.decode('utf-8')
                            text_parts.append(types.Part(text=f"\n**FILE: {file.filename}**\n{text_content}"))
                            files_processed += 1
                            logger.info(f"Successfully processed text file: {file.filename}")
                        else:
                            logger.warning(f"Unsupported file type: {file.content_type}")
                            text_parts.append(types.Part(text=f"\n[Unsupported file type: {file.filename}]"))
                            
                    except Exception as file_error:
                        logger.error(f"Error processing file {file.filename}: {str(file_error)}")
                        text_parts.append(types.Part(text=f"\n[Error processing {file.filename}]"))
                else:
                    logger.warning(f"Skipping empty file: {file.filename}")
        
        # Assemble parts in correct order: PDFs first, then text content, then user message
        parts.extend(pdf_parts)
        parts.extend(text_parts)
        parts.append(types.Part(text=message))
        
        logger.info(f"Total parts to send: {len(parts)}, Files processed: {files_processed}")
        
        # Create content
        contents = [types.Content(role="user", parts=parts)]
        
        # Configuration with minimal settings to avoid conflicts
        generate_content_config = types.GenerateContentConfig(
            temperature=min(max(temperature, 0.0), 2.0),
            max_output_tokens=min(max_tokens, 8192),
            # Temporarily remove safety settings to test if they're causing the issue
        )
        
        # Call API
        logger.info("Calling Gemini API...")
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=contents,
            config=generate_content_config,
        )
        
        logger.info("API call successful")
        return ChatResponse(
            response=response.text if response.text else "No response generated.",
            status="success"
        )
        
    except Exception as e:
        logger.error(f"Chat with files error: {str(e)}", exc_info=True)
        return ChatResponse(
            response=f"I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.",
            status="error"
        )

# Also update your regular chat endpoint to fix the JSON schema issue
@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint using Google GenAI Gemini"""
    try:
        client = initialize_genai_client()
        contents = build_contents_from_messages(request.messages)
        
        if not contents:
            contents = [
                types.Content(
                    role="user",
                    parts=[types.Part(text="Hello")]
                )
            ]
        
        # FIXED: Separate configs for text-only vs multimodal
        generate_content_config = types.GenerateContentConfig(
            temperature=min(max(request.temperature, 0.0), 2.0),
            top_p=0.95,
            max_output_tokens=min(request.max_tokens, 8192),
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                )
            ],
            # JSON schema only for text-only requests
            response_mime_type="application/json",
            response_schema={
                "type": "object", 
                "properties": {
                    "response": {"type": "string"}
                },
                "required": ["response"]
            }
        )
        
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=contents,
            config=generate_content_config,
        )
        
        # Parse JSON response
        try:
            response_data = json.loads(response.text)
            response_text = response_data.get("response", "No response generated")
        except json.JSONDecodeError:
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

# Also update your regular chat endpoint to fix the JSON schema issue
@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint using Google GenAI Gemini"""
    try:
        client = initialize_genai_client()
        contents = build_contents_from_messages(request.messages)
        
        if not contents:
            contents = [
                types.Content(
                    role="user",
                    parts=[types.Part(text="Hello")]
                )
            ]
        
        # FIXED: Separate configs for text-only vs multimodal
        generate_content_config = types.GenerateContentConfig(
            temperature=min(max(request.temperature, 0.0), 2.0),
            top_p=0.95,
            max_output_tokens=min(request.max_tokens, 8192),
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                )
            ],
            # JSON schema only for text-only requests
            response_mime_type="application/json",
            response_schema={
                "type": "object", 
                "properties": {
                    "response": {"type": "string"}
                },
                "required": ["response"]
            }
        )
        
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=contents,
            config=generate_content_config,
        )
        
        # Parse JSON response
        try:
            response_data = json.loads(response.text)
            response_text = response_data.get("response", "No response generated")
        except json.JSONDecodeError:
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

# Also update your regular chat endpoint to fix the JSON schema issue
@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint using Google GenAI Gemini"""
    try:
        client = initialize_genai_client()
        contents = build_contents_from_messages(request.messages)
        
        if not contents:
            contents = [
                types.Content(
                    role="user",
                    parts=[types.Part(text="Hello")]
                )
            ]
        
        # FIXED: Separate configs for text-only vs multimodal
        generate_content_config = types.GenerateContentConfig(
            temperature=min(max(request.temperature, 0.0), 2.0),
            top_p=0.95,
            max_output_tokens=min(request.max_tokens, 8192),
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                )
            ],
            # JSON schema only for text-only requests
            response_mime_type="application/json",
            response_schema={
                "type": "object", 
                "properties": {
                    "response": {"type": "string"}
                },
                "required": ["response"]
            }
        )
        
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=contents,
            config=generate_content_config,
        )
        
        # Parse JSON response
        try:
            response_data = json.loads(response.text)
            response_text = response_data.get("response", "No response generated")
        except json.JSONDecodeError:
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

@router.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    """Standalone file upload endpoint for testing"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Read file content
        content = await file.read()
        
        # Handle different file types
        if file.content_type == 'application/pdf':
            return {
                "filename": file.filename,
                "size": len(content),
                "content": "[PDF content - will be processed by AI]",
                "mime_type": file.content_type,
                "status": "success"
            }
        elif file.content_type and file.content_type.startswith('text/'):
            file_text = content.decode('utf-8')
            return {
                "filename": file.filename,
                "size": len(content),
                "content": file_text[:500] + "..." if len(file_text) > 500 else file_text,
                "mime_type": file.content_type,
                "status": "success"
            }
        else:
            raise HTTPException(status_code=400, detail="Only PDF and text files are supported")
            
    except Exception as e:
        logger.error(f"File upload error: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")

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
            "test_response": response_status,
            "features": ["text_chat", "pdf_support", "multimodal"]
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