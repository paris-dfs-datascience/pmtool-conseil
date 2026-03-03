from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from models import RAGRequest, RAGResponse, ChatRequest, ChatResponse
import logging
import re
from typing import List, Dict, Optional, Tuple
from google.cloud import discoveryengine_v1 as discoveryengine
from google.api_core.client_options import ClientOptions

# Official Vertex AI imports for Gemini
import vertexai
from vertexai.preview.generative_models import GenerativeModel, SafetySetting

logger = logging.getLogger(__name__)
router = APIRouter()

logger.info("🚀 ChatRAG router module loading...")
logger.info(f"   Module name: {__name__}")

# Project configuration from environment variables
import os

PROJECT_ID = os.getenv("GCP_PROJECT_ID", "lma-website-461920")
LOCATION = os.getenv("VERTEX_SEARCH_LOCATION", "us")  # Vertex AI Search location (us, eu, or global)
GEMINI_LOCATION = os.getenv("VERTEX_AI_LOCATION", "us-central1")  # Vertex AI Gemini location
DATA_STORE_ID = os.getenv("VERTEX_SEARCH_DATA_STORE_ID")  # Required: Set in environment
SEARCH_ENGINE_ID = os.getenv("VERTEX_SEARCH_ENGINE_ID")  # Required: Set in environment

# Validate required environment variables
logger.info(f"🔧 Configuration loaded:")
logger.info(f"  PROJECT_ID: {PROJECT_ID}")
logger.info(f"  LOCATION: {LOCATION}")
logger.info(f"  GEMINI_LOCATION: {GEMINI_LOCATION}")
logger.info(f"  DATA_STORE_ID: {DATA_STORE_ID if DATA_STORE_ID else 'NOT SET'}")
logger.info(f"  SEARCH_ENGINE_ID: {SEARCH_ENGINE_ID if SEARCH_ENGINE_ID else 'NOT SET'}")

if not DATA_STORE_ID:
    logger.error("❌ VERTEX_SEARCH_DATA_STORE_ID environment variable is required but not set")
    raise ValueError("VERTEX_SEARCH_DATA_STORE_ID environment variable is required")
if not SEARCH_ENGINE_ID:
    logger.error("❌ VERTEX_SEARCH_ENGINE_ID environment variable is required but not set")
    raise ValueError("VERTEX_SEARCH_ENGINE_ID environment variable is required")

logger.info("✅ All required environment variables are set")

# Initialize Vertex AI for Gemini
vertexai.init(
    project=PROJECT_ID,
    location=GEMINI_LOCATION,
)

# Gemini models
GEMINI_MODEL = 'gemini-2.0-flash-001'
GEMINI_PRO_MODEL = 'gemini-2.5-pro'

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


def get_search_client() -> discoveryengine.SearchServiceClient:
    """Initialize and return Vertex AI Search client"""
    # For US multi-region, use us-discoveryengine endpoint
    api_endpoint = f"{LOCATION}-discoveryengine.googleapis.com" if LOCATION != "global" else "discoveryengine.googleapis.com"
    client_options = ClientOptions(api_endpoint=api_endpoint)
    return discoveryengine.SearchServiceClient(client_options=client_options)


def get_safety_settings():
    """Get safety settings for Gemini"""
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
    """Use Gemini to format the response with proper spacing"""
    try:
        format_model = GenerativeModel(GEMINI_MODEL)
        
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
                "temperature": 0.1,
                "top_p": 0.9,
            },
            safety_settings=get_safety_settings(),
        )
        
        if response.text:
            return response.text.strip()
        else:
            return text
            
    except Exception as e:
        logger.error(f"LLM formatting error: {e}")
        return text


def categorize_query(query: str) -> str:
    """Categorize query to optimize retrieval"""
    query_lower = query.lower()
    
    for category, config in QUERY_PATTERNS.items():
        if any(keyword in query_lower for keyword in config['keywords']):
            return category
    
    return 'general'


def enhance_query(query: str) -> Tuple[str, str]:
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
    """Extract conversation context from message history"""
    if len(messages) <= 1:
        return ""
    
    recent_messages = messages[-20:]  # Last 10 exchanges
    context_parts = []
    
    for msg in recent_messages:
        role = msg.get('role', '')
        content = msg.get('content', '')
        if content:
            if len(content) > 1000:
                content = content[:1000] + "..."
            context_parts.append(f"{role}: {content}")
    
    context = " | ".join(context_parts)
    
    if len(context) > 10000:
        context = context[-8000:]
    
    return context


def choose_model_for_query(query: str, category: str) -> str:
    """Choose optimal model based on query complexity"""
    query_length = len(query)
    
    # Use flash model for simple, short queries
    simple_categories = ['company_overview']
    if category in simple_categories and query_length < 100:
        return GEMINI_MODEL
    
    # Use pro model for complex queries
    return GEMINI_PRO_MODEL


async def search_vertex_ai(query: str, page_size: int = 10) -> Tuple[List[Dict], List[str]]:
    """
    Search using Vertex AI Search and return results with source URIs
    
    Returns:
        Tuple of (search_results, source_uris)
    """
    try:
        logger.info(f"🔍 Starting Vertex AI Search for query: '{query[:100]}'")
        client = get_search_client()
        
        # Construct the serving config path
        serving_config = f"projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/engines/{SEARCH_ENGINE_ID}/servingConfigs/default_config"
        logger.info(f"📍 Using serving config: {serving_config}")
        
        # Build the search request
        request = discoveryengine.SearchRequest(
            serving_config=serving_config,
            query=query,
            page_size=page_size,
            # Enable snippets and extractive answers
            content_search_spec=discoveryengine.SearchRequest.ContentSearchSpec(
                snippet_spec=discoveryengine.SearchRequest.ContentSearchSpec.SnippetSpec(
                    return_snippet=True,
                    max_snippet_count=3,
                ),
                extractive_content_spec=discoveryengine.SearchRequest.ContentSearchSpec.ExtractiveContentSpec(
                    max_extractive_answer_count=1,
                    max_extractive_segment_count=3,
                ),
                summary_spec=discoveryengine.SearchRequest.ContentSearchSpec.SummarySpec(
                    summary_result_count=5,
                    include_citations=True,
                ),
            ),
            query_expansion_spec=discoveryengine.SearchRequest.QueryExpansionSpec(
                condition=discoveryengine.SearchRequest.QueryExpansionSpec.Condition.AUTO,
            ),
            spell_correction_spec=discoveryengine.SearchRequest.SpellCorrectionSpec(
                mode=discoveryengine.SearchRequest.SpellCorrectionSpec.Mode.AUTO
            ),
        )
        
        # Execute search
        logger.info("🚀 Executing search request...")
        response = client.search(request)
        
        # Extract results and sources
        results = []
        source_uris = []
        
        for result in response.results:
            document = result.document
            
            # Extract document content
            doc_data = {
                'id': document.id,
                'content': '',
                'metadata': {}
            }
            
            # Get snippets if available
            if hasattr(result, 'document') and hasattr(result.document, 'derived_struct_data'):
                struct_data = result.document.derived_struct_data
                if 'snippets' in struct_data:
                    snippets = [s.get('snippet', '') for s in struct_data['snippets']]
                    doc_data['content'] = ' '.join(snippets)
                
                if 'extractive_answers' in struct_data:
                    answers = [a.get('content', '') for a in struct_data['extractive_answers']]
                    if answers:
                        doc_data['content'] = ' '.join(answers)
            
            # Get source URI
            if hasattr(document, 'struct_data') and document.struct_data is not None and 'link' in document.struct_data:
                source_uri = document.struct_data['link']
                source_uris.append(source_uri)
                doc_data['metadata']['source'] = source_uri
            
            results.append(doc_data)
        
        logger.info(f"✅ Search completed: Found {len(results)} results")
        
        # Also get summary if available
        if hasattr(response, 'summary') and response.summary:
            summary_text = response.summary.summary_text
            logger.info(f"📝 Got summary from Vertex AI Search: {summary_text[:200]}...")
        
        return results, source_uris
        
    except Exception as e:
        logger.error(f"❌ Vertex AI Search error: {type(e).__name__}: {str(e)}")
        logger.error(f"   Query: '{query}'")
        logger.error(f"   PROJECT_ID: {PROJECT_ID}")
        logger.error(f"   LOCATION: {LOCATION}")
        logger.error(f"   SEARCH_ENGINE_ID: {SEARCH_ENGINE_ID}")
        import traceback
        logger.error(f"   Stack trace: {traceback.format_exc()}")
        return [], []


async def generate_answer_with_gemini(
    query: str, 
    search_results: List[Dict], 
    conversation_context: str = "",
    category: str = "general"
) -> str:
    """Generate answer using Gemini based on search results"""
    try:
        # Choose optimal model
        model_name = choose_model_for_query(query, category)
        
        # Build context from search results
        context_parts = []
        for i, result in enumerate(search_results[:5], 1):  # Use top 5 results
            content = result.get('content', '')
            if content:
                context_parts.append(f"[Source {i}]: {content}")
        
        context_text = "\n\n".join(context_parts)
        
        # Enhanced system instruction based on category
        category_focus = {
            'company_overview': "Focus on LMA's background, history, mission, and overall company information.",
            'capabilities': "Emphasize LMA's services, expertise areas, and consulting capabilities.",
            'projects_experience': "Highlight specific projects, case studies, client work, and measurable results.",
            'methodologies': "Detail LMA's approaches, frameworks, and consulting methodologies.",
            'team_people': "Provide information about LMA's team, leadership, and consultant backgrounds.",
        }
        
        system_focus = category_focus.get(category, "Provide comprehensive information from LMA's knowledge base.")
        
        system_instruction = f"""You are LMA's knowledgeable assistant with access to comprehensive organizational information.

Context: You're helping someone learn about LMA's capabilities, experience, and expertise.

{system_focus}

Guidelines:
- Provide detailed, professional responses using specific information from the provided context
- When users say "my/our experience" they mean LMA's organizational capabilities  
- Use concrete examples, metrics, and outcomes when available
- Maintain a professional yet conversational consulting tone
- Structure responses clearly with relevant details
- If information isn't available in the context, acknowledge this professionally
- Prioritize the most relevant and recent information

Response Style: Professional, informative, and engaging - like a knowledgeable consultant explaining LMA's capabilities."""

        # Build the prompt
        if conversation_context:
            prompt = f"""Previous conversation context: {conversation_context}

Current question: {query}

Information from knowledge base:
{context_text}

Based on the above information, provide a comprehensive answer to the current question. Use specific details from the knowledge base."""
        else:
            prompt = f"""Question: {query}

Information from knowledge base:
{context_text}

Based on the above information, provide a comprehensive answer. Use specific details from the knowledge base."""
        
        # Generate response
        model = GenerativeModel(
            model_name,
            system_instruction=system_instruction
        )
        
        response = model.generate_content(
            [prompt],
            generation_config={
                "max_output_tokens": 8192,
                "temperature": 0.2,
                "top_p": 0.9,
                "candidate_count": 1,
            },
            safety_settings=get_safety_settings(),
        )
        
        if response.text:
            return response.text
        else:
            return ""
            
    except Exception as e:
        logger.error(f"Gemini generation error: {e}")
        return ""


async def enhanced_search_and_generate(
    query: str, 
    conversation_context: str = ""
) -> Tuple[str, bool, List[str]]:
    """
    Enhanced search and generation pipeline
    
    Returns:
        Tuple of (response_text, found_results, source_uris)
    """
    try:
        # Enhance query and get category
        enhanced_query, category = enhance_query(query)
        
        # Search Vertex AI
        search_results, source_uris = await search_vertex_ai(enhanced_query, page_size=10)
        
        if not search_results:
            return "", False, []
        
        # Generate answer with Gemini
        answer = await generate_answer_with_gemini(
            query, 
            search_results, 
            conversation_context,
            category
        )
        
        if not answer:
            return "", False, source_uris
        
        # Clean and format the answer
        cleaned_answer = clean_basic_artifacts(answer)
        formatted_answer = await format_with_llm(cleaned_answer)
        
        return formatted_answer, True, source_uris
        
    except Exception as e:
        logger.error(f"Enhanced search and generate error: {e}")
        return "", False, []


async def generate_fallback_response(query: str, category: str) -> str:
    """Generate helpful fallback when search doesn't return results"""
    
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
async def chat_endpoint(request: ChatRequest):
    """Enhanced chat endpoint using Vertex AI Search + Gemini"""
    try:
        logger.info(f"💬 Chat endpoint called with {len(request.messages)} messages")
        current_query = request.messages[-1].content if request.messages else ""
        logger.info(f"   Current query: '{current_query[:100]}'")
        
        if not current_query.strip():
            logger.info("   Empty query, returning welcome message")
            return ChatResponse(
                response="Hello! I'm your LMA knowledge assistant. I have access to comprehensive information about LMA's capabilities, experience, projects, and expertise. I can help you understand our consulting services, methodologies, team, and much more. What would you like to know about LMA?",
                status="success"
            )
        
        # Get conversation context
        conversation_context = get_conversation_context([msg.dict() for msg in request.messages])
        logger.info(f"   Conversation context length: {len(conversation_context)} chars")
        
        # Perform search and generation
        logger.info("   Starting search and generation...")
        result, found_results, sources = await enhanced_search_and_generate(
            current_query, 
            conversation_context
        )
        
        if found_results and result:
            logger.info(f"✅ Chat successful: Generated {len(result)} char response")
            return ChatResponse(response=result, status="success")
        else:
            # Generate category-aware fallback
            logger.warning("⚠️ No results found, generating fallback")
            category = categorize_query(current_query)
            fallback_response = await generate_fallback_response(current_query, category)
            return ChatResponse(response=fallback_response, status="partial")
        
    except Exception as e:
        logger.error(f"❌ Chat endpoint error: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"   Stack trace: {traceback.format_exc()}")
        return ChatResponse(
            response="I encountered an error processing your request. Please try rephrasing your question or asking about a specific aspect of LMA's capabilities.",
            status="error"
        )


@router.post("/search", response_model=RAGResponse)
async def search_endpoint(request: RAGRequest):
    """Search endpoint using Vertex AI Search + Gemini"""
    try:
        result, found_results, sources = await enhanced_search_and_generate(request.query)
        
        if found_results and result:
            return RAGResponse(
                response=result,
                status="success",
                sources=sources if sources else None
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
        logger.error(f"Search endpoint error: {e}")
        return RAGResponse(
            response=f"I encountered an error while searching. Please try rephrasing your question or ask about specific LMA capabilities.",
            status="error",
            sources=None
        )


@router.get("/status")
async def status_endpoint():
    """Status endpoint with health check"""
    try:
        status_info = {
            "status": "healthy",
            "service": "lma-knowledge-assistant-vertex-search",
            "search_engine": "vertex-ai-search",
            "primary_model": GEMINI_PRO_MODEL,
            "fast_model": GEMINI_MODEL,
            "project_id": PROJECT_ID,
            "location": LOCATION,
            "features": [
                "vertex_ai_search",
                "query_categorization",
                "conversation_context",
                "adaptive_model_selection", 
                "enhanced_prompting",
                "intelligent_fallbacks",
                "llm_based_formatting",
                "source_citations"
            ],
            "query_categories": list(QUERY_PATTERNS.keys())
        }
        
        # Test connectivity
        try:
            client = get_search_client()
            status_info["search_service"] = "connected"
            status_info["last_test"] = "successful"
            
        except Exception as e:
            status_info["search_service"] = f"error: {str(e)[:100]}"
            status_info["status"] = "degraded"
            status_info["last_test"] = "failed"
        
        return JSONResponse(content=status_info)
        
    except Exception as e:
        return JSONResponse(content={
            "status": "unhealthy",
            "error": str(e),
            "service": "lma-knowledge-assistant-vertex-search"
        }, status_code=500)