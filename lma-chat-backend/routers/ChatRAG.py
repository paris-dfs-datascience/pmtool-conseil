from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from models import RAGRequest, RAGResponse, ChatRequest, ChatResponse
import logging
import re
import asyncio
from typing import List, Dict, Optional

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
GEMINI_FLASH_MODEL = 'gemini-2.0-flash-001'

# Query categorization patterns
QUERY_PATTERNS = {
    'company_overview': {
        'keywords': ['about lma', 'tell me about', 'what is lma', 'who is lma', 'company background', 'overview'],
        'boost': 'LMA company overview background history mission vision services'
    },
    'capabilities': {
        'keywords': ['what can', 'services', 'capabilities', 'expertise', 'skills', 'experience'],
        'boost': 'LMA capabilities services expertise consulting experience'
    },
    'projects_experience': {
        'keywords': ['projects', 'case studies', 'experience', 'work', 'clients', 'examples'],
        'boost': 'LMA projects case studies client work experience examples results'
    },
    'methodologies': {
        'keywords': ['methodology', 'approach', 'process', 'framework', 'how do'],
        'boost': 'LMA methodology approach process framework consulting methods'
    },
    'team_people': {
        'keywords': ['team', 'people', 'staff', 'consultants', 'who works', 'employees'],
        'boost': 'LMA team people staff consultants employees leadership'
    },
    'industries': {
        'keywords': ['industry', 'sector', 'vertical', 'market'],
        'boost': 'LMA industry experience sector vertical market expertise'
    }
}

def get_rag_tools(similarity_top_k=20):
    """Get configured RAG tools with optimized settings"""
    retrieval = rag.Retrieval(
        source=rag.VertexRagStore(
            rag_resources=[
                rag.RagResource(
                    rag_corpus="projects/lma-website-461920/locations/us-central1/ragCorpora/1152921504606846976"
                )
            ],
            similarity_top_k=similarity_top_k,  # Increased for better coverage
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

def clean_basic_artifacts(text: str) -> str:
    """Remove only the basic artifacts like citations and references"""
    if not text:
        return ""
    
    # Remove citations, references, and artifacts
    clean_text = re.sub(r'\[\d+\]', '', text)
    clean_text = re.sub(r'\(\d+\)', '', text)
    clean_text = re.sub(r'Source: .*?\n', '', clean_text, flags=re.MULTILINE)
    clean_text = re.sub(r'Citation: .*?\n', '', clean_text, flags=re.MULTILINE)
    clean_text = re.sub(r'Document \d+:', '', clean_text)
    clean_text = re.sub(r'Page \d+:', '', clean_text)
    
    # Remove repetitive phrases
    clean_text = re.sub(r'Based on the provided context,?\s*', '', clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r'According to the documents?,?\s*', '', clean_text, flags=re.IGNORECASE)
    
    # Remove markdown artifacts
    clean_text = re.sub(r'\*\*(.*?)\*\*', r'\1', clean_text)  # Bold
    clean_text = re.sub(r'\*(.*?)\*', r'\1', clean_text)      # Italic
    clean_text = re.sub(r'#{1,6}\s', '', clean_text)         # Headers
    
    return clean_text.strip()

async def format_with_llm(text: str) -> str:
    """Use Gemini Flash to format the response with proper spacing"""
    try:
        # Initialize Flash model for formatting
        format_model = GenerativeModel(GEMINI_FLASH_MODEL)
        
        format_prompt = f"""Format the following text to be more readable by adding proper paragraph breaks and spacing. 

Rules:
- Add paragraph breaks between distinct topics or ideas
- Preserve bullet points and lists with proper spacing
- Keep the exact same content and meaning
- Don't add or remove any information
- Just improve the spacing and structure for readability
- Use double newlines between paragraphs
- Use single newlines for list items
- If there's a signature block (name, title, email, etc.), format it nicely

Text to format:
{text}

Formatted text:"""

        response = format_model.generate_content(
            [format_prompt],
            generation_config={
                "max_output_tokens": 8192,
                "temperature": 0.1,  # Very low for consistent formatting
                "top_p": 0.9,
            },
            safety_settings=get_safety_settings(),
        )
        
        if response.text:
            return response.text.strip()
        else:
            # Fallback to original if formatting fails
            return text
            
    except Exception as e:
        logger.error(f"LLM formatting error: {e}")
        # Return original text if formatting fails
        return text

def categorize_query(query: str) -> str:
    """Categorize query to optimize RAG retrieval"""
    query_lower = query.lower()
    
    for category, config in QUERY_PATTERNS.items():
        if any(keyword in query_lower for keyword in config['keywords']):
            return category
    
    return 'general'

def enhance_query(query: str) -> tuple[str, str]:
    """Enhanced query processing with category-specific optimization"""
    query_lower = query.lower()
    category = categorize_query(query)
    
    # Handle personal pronouns
    personal_indicators = ['my', 'me', 'our', 'we', 'us']
    if any(word in query_lower.split() for word in personal_indicators):
        if 'lma' not in query_lower:
            query = f"LMA {query}"
    
    # Get category-specific boost
    boost = ""
    if category in QUERY_PATTERNS:
        boost = QUERY_PATTERNS[category]['boost']
    
    # Enhanced query with context
    enhanced_query = f"{query} {boost}".strip()
    
    return enhanced_query, category

def get_conversation_context(messages: List[Dict]) -> str:
    if len(messages) <= 1:
        return ""
    
    # Be generous with Gemini's large context window
    recent_messages = messages[-20:]  # Last 10 exchanges
    context_parts = []
    
    for msg in recent_messages:
        role = msg.get('role', '')
        content = msg.get('content', '')
        if content:
            # Only truncate extremely long individual messages
            if len(content) > 1000:
                content = content[:1000] + "..."
            context_parts.append(f"{role}: {content}")
    
    context = " | ".join(context_parts)
    
    # Only truncate if context becomes unreasonably large (10K+ chars)
    if len(context) > 10000:
        context = context[-8000:]  # Keep the most recent 8K chars
    
    return context

def choose_model_for_query(query: str, category: str) -> str:
    """Choose optimal model based on query complexity"""
    query_length = len(query)
    
    # Use flash model for simple, short queries
    simple_categories = ['company_overview']
    if category in simple_categories and query_length < 100:
        return GEMINI_FLASH_MODEL
    
    # Use full model for complex queries
    return GEMINI_MODEL

async def enhanced_rag_search(query: str, conversation_context: str = "") -> tuple[str, bool]:
    """Enhanced RAG search with LLM-based formatting"""
    try:
        # Enhance query and get category
        enhanced_query, category = enhance_query(query)
        
        # Choose optimal model
        model_name = choose_model_for_query(query, category)
        
        # Setup model with RAG tools
        tools = get_rag_tools()
        
        # Enhanced system instruction based on category
        if category == 'company_overview':
            system_focus = "Focus on LMA's background, history, mission, and overall company information."
        elif category == 'capabilities':
            system_focus = "Emphasize LMA's services, expertise areas, and consulting capabilities."
        elif category == 'projects_experience':
            system_focus = "Highlight specific projects, case studies, client work, and measurable results."
        elif category == 'methodologies':
            system_focus = "Detail LMA's approaches, frameworks, and consulting methodologies."
        elif category == 'team_people':
            system_focus = "Provide information about LMA's team, leadership, and consultant backgrounds."
        else:
            system_focus = "Provide comprehensive information from LMA's knowledge base."
        
        system_instruction = f"""You are LMA's knowledgeable assistant with access to comprehensive organizational information.

Context: You're helping someone learn about LMA's capabilities, experience, and expertise.

{system_focus}

Guidelines:
- Provide detailed, professional responses using specific information from the knowledge base
- When users say "my/our experience" they mean LMA's organizational capabilities  
- Use concrete examples, metrics, and outcomes when available
- Maintain a professional yet conversational consulting tone
- Structure responses clearly with relevant details
- If information isn't available, acknowledge this professionally and suggest alternatives
- Prioritize the most relevant and recent information

Response Style: Professional, informative, and engaging - like a knowledgeable consultant explaining LMA's capabilities."""

        # Add conversation context if available
        if conversation_context:
            full_query = f"Previous context: {conversation_context}\n\nCurrent question: {enhanced_query}"
        else:
            full_query = enhanced_query
        
        model = GenerativeModel(
            model_name,
            tools=tools,
            system_instruction=system_instruction
        )
        
        # Generate response with optimized settings
        response = model.generate_content(
            [full_query],
            generation_config={
                "max_output_tokens": 8192,  # Good balance of detail vs speed
                "temperature": 0.1,         # Low for consistency
                "top_p": 0.9,
                "candidate_count": 1,
            },
            safety_settings=get_safety_settings(),
        )
        
        if response.text:
            # First, clean basic artifacts
            cleaned_response = clean_basic_artifacts(response.text)
            
            # Then format with LLM for better readability
            formatted_response = await format_with_llm(cleaned_response)
            
            return formatted_response, True
        else:
            return "", False
            
    except Exception as e:
        logger.error(f"Enhanced RAG search error: {e}")
        return "", False

async def generate_fallback_response(query: str, category: str) -> str:
    """Generate helpful fallback when RAG doesn't return results"""
    
    if category == 'company_overview':
        return """I'd be happy to tell you about LMA! While I wasn't able to find the specific information you requested in my immediate search, I can help you learn about:

• LMA's background and company history
• Our mission and core values  
• Key service areas and expertise
• Leadership team and organizational structure

Could you ask about a specific aspect of LMA that interests you most?"""

    elif category == 'capabilities':
        return """LMA offers a range of consulting services and capabilities. While I didn't find the exact information you're looking for, I can help you explore:

• Strategic consulting and planning
• Digital transformation initiatives
• Operational excellence and process optimization
• Change management and organizational development
• Industry-specific expertise and solutions

What specific capability or service area would you like to know more about?"""

    elif category == 'projects_experience':
        return """LMA has extensive project experience across various industries and consulting areas. Though I couldn't find the specific examples you requested, I can help you discover:

• Case studies and client success stories
• Project methodologies and approaches
• Industry-specific experience and results
• Measurable outcomes and impact

Would you like to know about projects in a particular industry or consulting area?"""

    else:
        return f"""I wasn't able to find specific information about "{query}" in LMA's knowledge base at the moment. 

Here are some ways I can help you learn about LMA:
• Company background and services
• Consulting capabilities and expertise  
• Project experience and case studies
• Team information and methodologies
• Industry-specific knowledge

What aspect of LMA would you like to explore?"""

@router.post("/chat", response_model=ChatResponse)
async def enhanced_rag_chat(request: ChatRequest):
    """Enhanced RAG chat endpoint with better context handling"""
    try:
        current_query = request.messages[-1].content if request.messages else ""
        
        if not current_query.strip():
            return ChatResponse(
                response="Hello! I'm your LMA knowledge assistant. I have access to comprehensive information about LMA's capabilities, experience, projects, and expertise. I can help you understand our consulting services, methodologies, team, and much more. What would you like to know about LMA?",
                status="success"
            )
        
        # Get conversation context
        conversation_context = get_conversation_context([msg.dict() for msg in request.messages])
        
        # Perform enhanced RAG search
        result, found_results = await enhanced_rag_search(current_query, conversation_context)
        
        if found_results and result:
            return ChatResponse(response=result, status="success")
        else:
            # Generate category-aware fallback
            category = categorize_query(current_query)
            fallback_response = await generate_fallback_response(current_query, category)
            return ChatResponse(response=fallback_response, status="partial")
        
    except Exception as e:
        logger.error(f"Enhanced chat error: {e}")
        return ChatResponse(
            response="I encountered an error processing your request. Please try rephrasing your question or asking about a specific aspect of LMA's capabilities.",
            status="error"
        )

@router.post("/search", response_model=RAGResponse)
async def enhanced_rag_search_endpoint(request: RAGRequest):
    """Enhanced RAG search endpoint"""
    try:
        result, found_results = await enhanced_rag_search(request.query)
        
        if found_results and result:
            return RAGResponse(
                response=result,
                status="success",
                sources=None  # Could be enhanced to return actual sources
            )
        else:
            category = categorize_query(request.query)
            fallback = await generate_fallback_response(request.query, category)
            return RAGResponse(
                response=fallback,
                status="no_results",
                sources=None
            )
        
    except Exception as e:
        logger.error(f"Enhanced search error: {e}")
        return RAGResponse(
            response=f"I encountered an error while searching. Please try rephrasing your question or ask about specific LMA capabilities.",
            status="error",
            sources=None
        )

@router.get("/status")
async def enhanced_status():
    """Enhanced status endpoint with more details"""
    try:
        status_info = {
            "status": "healthy",
            "service": "enhanced-lma-knowledge-assistant",
            "primary_model": GEMINI_MODEL,
            "fast_model": GEMINI_FLASH_MODEL,
            "rag_corpus": "1152921504606846976",
            "features": [
                "query_categorization",
                "conversation_context",
                "adaptive_model_selection", 
                "enhanced_prompting",
                "intelligent_fallbacks",
                "llm_based_formatting"
            ],
            "query_categories": list(QUERY_PATTERNS.keys())
        }
        
        # Test connectivity
        try:
            tools = get_rag_tools()
            test_model = GenerativeModel(GEMINI_MODEL, tools=tools)
            test_response = test_model.generate_content(
                ["Test LMA knowledge"],
                generation_config={"max_output_tokens": 10}
            )
            status_info["rag_system"] = "connected"
            status_info["last_test"] = "successful"
            
        except Exception as e:
            status_info["rag_system"] = f"error: {str(e)[:100]}"
            status_info["status"] = "degraded"
            status_info["last_test"] = "failed"
        
        return JSONResponse(content=status_info)
        
    except Exception as e:
        return JSONResponse(content={
            "status": "unhealthy",
            "error": str(e),
            "service": "enhanced-lma-knowledge-assistant"
        }, status_code=500)