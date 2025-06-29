from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal
from enum import Enum
from datetime import datetime

class MessageRole(str, Enum):
    """Enum for message roles"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class Message(BaseModel):
    """Individual message in a conversation"""
    role: MessageRole = Field(..., description="Role of the message sender")
    content: str = Field(..., min_length=1, description="Content of the message")
    
    @validator('content')
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError("Message content cannot be empty")
        return v.strip()

class ChatRequest(BaseModel):
    """Request model for chat endpoints"""
    messages: List[Message] = Field(..., min_length=1, description="List of conversation messages")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(default=4096, gt=0, le=32768, description="Maximum tokens to generate")
    
    @validator('messages')
    def validate_messages(cls, v):
        if not v:
            raise ValueError("At least one message is required")
        if v[-1].role != MessageRole.USER:
            raise ValueError("Last message must be from user")
        return v

class ChatResponse(BaseModel):
    """Response model for chat endpoints"""
    response: str = Field(..., description="Generated response text")
    status: Literal["success", "error"] = Field(..., description="Response status")

# FILE SUPPORT MODELS - NEW ADDITIONS

class FileAttachment(BaseModel):
    """Model for file attachments"""
    filename: str = Field(..., description="Original filename")
    content: str = Field(..., description="File content (text) or base64 (binary)")
    size: int = Field(..., gt=0, description="File size in bytes")
    mime_type: str = Field(..., description="MIME type of the file")
    
    @validator('filename')
    def validate_filename(cls, v):
        if not v or not v.strip():
            raise ValueError("Filename cannot be empty")
        return v.strip()

class ChatMessage(BaseModel):
    """Enhanced message model with optional file attachments"""
    role: str = Field(..., description="Message role (user/assistant)")
    content: str = Field(..., description="Message content")
    files: Optional[List[FileAttachment]] = Field(default=None, description="Optional file attachments")
    
    @validator('role')
    def validate_role(cls, v):
        if v not in ['user', 'assistant', 'system']:
            raise ValueError("Role must be 'user', 'assistant', or 'system'")
        return v

class FileChatRequest(BaseModel):
    """Request model for chat with files"""
    message: str = Field(..., min_length=1, description="User message")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(default=4096, gt=0, le=65535, description="Maximum tokens to generate")
    files: Optional[List[FileAttachment]] = Field(default=None, description="Optional file attachments")
    
    @validator('message')
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()

class FileUploadResponse(BaseModel):
    """Response model for file uploads"""
    filename: str = Field(..., description="Uploaded filename")
    size: int = Field(..., description="File size in bytes")
    content: str = Field(..., description="File content preview or status")
    mime_type: str = Field(..., description="File MIME type")
    status: Literal["success", "error"] = Field(..., description="Upload status")

# EXISTING RAG MODELS

class RAGRequest(BaseModel):
    """Request model for RAG endpoints"""
    query: str = Field(..., min_length=1, max_length=1000, description="Search query for RAG system")
    top_k: Optional[int] = Field(default=5, ge=1, le=20, description="Number of top documents to retrieve")
    
    @validator('query')
    def validate_query(cls, v):
        if not v or not v.strip():
            raise ValueError("Query cannot be empty")
        return v.strip()

class RAGResponse(BaseModel):
    """Response model for RAG endpoints"""
    response: str = Field(..., description="Generated response based on retrieved documents")
    status: Literal["success", "error", "no_results"] = Field(..., description="Response status")
    sources: Optional[List[str]] = Field(default=None, description="Sources used for generation")

# PITCH-SPECIFIC MODELS

class PitchRequest(BaseModel):
    """Request model for pitch generation"""
    job_description: str = Field(..., min_length=10, max_length=25000, description="The job description to generate a pitch for")
    max_characters: Optional[int] = Field(default=2500, ge=500, le=5000, description="Maximum characters for the response")
    
    @validator('job_description')
    def validate_job_description(cls, v):
        if not v or not v.strip():
            raise ValueError("Job description cannot be empty")
        return v.strip()

class CustomQuestionRequest(BaseModel):
    """Request model for custom questions"""
    question: str = Field(..., min_length=5, max_length=2500, description="The custom question to answer")
    max_words: Optional[int] = Field(default=500, ge=100, le=1000, description="Maximum words for the response")
    
    @validator('question')
    def validate_question(cls, v):
        if not v or not v.strip():
            raise ValueError("Question cannot be empty")
        return v.strip()

class PitchResponse(BaseModel):
    """Response model for pitch generation"""
    id: str = Field(..., description="Unique identifier for the response")
    type: Literal["pitch", "custom"] = Field(..., description="Type of response generated")
    response: str = Field(..., description="Generated pitch or answer text")
    character_count: Optional[int] = Field(default=None, description="Number of characters in response")
    word_count: Optional[int] = Field(default=None, description="Number of words in response")
    timestamp: datetime = Field(..., description="When the response was generated")
    generation_time_ms: int = Field(..., description="Time taken to generate response in milliseconds")
    status: Literal["success", "error"] = Field(default="success", description="Generation status")
    used_rag: bool = Field(default=False, description="Whether RAG system was used")

class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error message")
    status: Literal["error"] = Field(default="error", description="Error status")
    timestamp: datetime = Field(..., description="When the error occurred")