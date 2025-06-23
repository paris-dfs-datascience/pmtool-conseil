from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from models import RAGRequest, RAGResponse, ChatRequest, ChatResponse
import logging
import re

# Official Vertex AI imports
import vertexai
from vertexai.preview.generative_models import GenerativeModel, SafetySetting, Tool
from vertexai.preview import rag

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Vertex AI once at module level
vertexai.init(
    project="lma-website-461920",
    location="us-central1",
    api_endpoint="us-central1-aiplatform.googleapis.com"
)

GEMINI_MODEL = 'gemini-2.5-pro'

def get_rag_tools(similarity_top_k=10):
    """Get configured RAG tools"""
    retrieval = rag.Retrieval(
        source=rag.VertexRagStore(
            rag_resources=[
                rag.RagResource(
                    rag_corpus="projects/lma-website-461920/locations/us-central1/ragCorpora/1152921504606846976"
                )
            ],
            similarity_top_k=similarity_top_k,
        ),
    )
    return [Tool.from_retrieval(retrieval=retrieval)]

def get_safety_settings():
    """Get safety settings"""
    return [
        SafetySetting(
            category=SafetySetting.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold=SafetySetting.HarmBlockThreshold.OFF
        ),
        SafetySetting(
            category=SafetySetting.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=SafetySetting.HarmBlockThreshold.OFF
        ),
        SafetySetting(
            category=SafetySetting.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold=SafetySetting.HarmBlockThreshold.OFF
        ),
        SafetySetting(
            category=SafetySetting.HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold=SafetySetting.HarmBlockThreshold.OFF
        ),
    ]

def clean_response(text: str) -> str:
    """Simple response cleaning"""
    if not text:
        return ""
    
    # Remove citations and references
    clean_text = re.sub(r'\[\d+\]', '', text)
    clean_text = re.sub(r'\(\d+\)', '', text)
    clean_text = re.sub(r'Source: .*?\n', '', clean_text, flags=re.MULTILINE)
    clean_text = re.sub(r'Citation: .*?\n', '', clean_text, flags=re.MULTILINE)
    
    # Fix basic spacing issues
    clean_text = re.sub(r'\.(?=[A-Z])', '. ', clean_text)
    clean_text = re.sub(r'\s+', ' ', clean_text)
    
    return clean_text.strip()

def enhance_query(query: str) -> str:
    """Simple query enhancement based on context clues"""
    query_lower = query.lower()
    
    # If user asks about "my" or "our" experience, make it clear they mean LMA
    personal_indicators = ['my', 'me', 'our', 'we', 'us']
    if any(word in query_lower.split() for word in personal_indicators):
        if 'lma' not in query_lower:
            query = f"LMA {query}"
    
    # If asking about company info directly
    company_questions = ['tell me about', 'what is', 'who is', 'about lma']
    if any(phrase in query_lower for phrase in company_questions) and 'lma' in query_lower:
        return query  # Keep as is
    
    return query

async def simple_rag_search(query: str) -> str:
    """Simple, efficient RAG search"""
    try:
        # Enhance query if needed
        enhanced_query = enhance_query(query)
        
        # Setup model with RAG tools
        tools = get_rag_tools()
        
        system_instruction = """You are LMA's knowledgeable assistant with access to LMA's comprehensive knowledge base.

Key Guidelines:
- When users refer to "my experience" or "our experience", they mean LMA's organizational capabilities
- Provide detailed, professional responses using specific information from the knowledge base
- Focus on LMA's expertise, experience, case studies, and capabilities
- Review the All Slides files first for answers.
- Maintain a professional consulting tone while being conversational
- If you don't find specific information, acknowledge this and offer to help in other ways

You are responding as LMA's assistant with full access to organizational information."""
        
        model = GenerativeModel(
            GEMINI_MODEL,
            tools=tools,
            system_instruction=system_instruction
        )
        
        # Generate response
        response = model.generate_content(
            [enhanced_query],
            generation_config={
                "max_output_tokens": 8192,  # Reasonable limit
                "temperature": 0.1,         # Lower temperature for consistency
                "top_p": 0.9,
                "candidate_count": 1,
            },
            safety_settings=get_safety_settings(),
        )
        
        if response.text:
            return clean_response(response.text)
        else:
            return ""
            
    except Exception as e:
        logger.error(f"RAG search error: {e}")
        return ""

@router.post("/chat", response_model=ChatResponse)
async def simple_rag_chat(request: ChatRequest):
    """Simple RAG chat endpoint"""
    try:
        current_query = request.messages[-1].content if request.messages else ""
        
        if not current_query.strip():
            return ChatResponse(
                response="Hello! I'm your LMA knowledge assistant. I can help you find information from LMA's knowledge base, answer questions about our capabilities and experience, and assist with creating content. What would you like to know?",
                status="success"
            )
        
        # Perform RAG search
        result = await simple_rag_search(current_query)
        
        if result:
            return ChatResponse(response=result, status="success")
        else:
            # Simple fallback
            fallback_response = f"""I wasn't able to find specific information about "{current_query}" in LMA's knowledge base. 

Here are some ways I can help:
- Try rephrasing your question with more specific details
- Ask about specific LMA services, capabilities, or experience areas
- Request information about LMA's background in particular industries or consulting areas

What specific aspect of LMA would you like to know more about?"""
            
            return ChatResponse(response=fallback_response, status="partial")
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(
            response="I encountered an error processing your request. Please try again or rephrase your question.",
            status="error"
        )

@router.post("/search", response_model=RAGResponse)
async def simple_rag_search_endpoint(request: RAGRequest):
    """Simple RAG search endpoint"""
    try:
        result = await simple_rag_search(request.query)
        
        if result:
            return RAGResponse(
                response=result,
                status="success",
                sources=None
            )
        else:
            return RAGResponse(
                response=f"No specific information found for: {request.query}",
                status="no_results",
                sources=None
            )
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        return RAGResponse(
            response=f"Search error: {str(e)}",
            status="error",
            sources=None
        )

@router.get("/status")
async def status():
    """Status endpoint"""
    try:
        status_info = {
            "status": "healthy",
            "service": "simple-rag-chat",
            "model": GEMINI_MODEL,
            "rag_corpus": "1152921504606846976",
            "architecture": "simple_rag"
        }
        
        # Test connectivity
        try:
            tools = get_rag_tools()
            test_model = GenerativeModel(GEMINI_MODEL, tools=tools)
            test_response = test_model.generate_content(
                ["Test"],
                generation_config={"max_output_tokens": 5}
            )
            status_info["rag_system"] = "connected"
            
        except Exception as e:
            status_info["rag_system"] = f"error: {str(e)}"
            status_info["status"] = "degraded"
        
        return JSONResponse(content=status_info)
        
    except Exception as e:
        return JSONResponse(content={
            "status": "unhealthy",
            "error": str(e)
        }, status_code=500)