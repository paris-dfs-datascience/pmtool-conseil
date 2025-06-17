from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal
from enum import Enum

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