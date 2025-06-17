from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from models import RAGRequest, RAGResponse, ChatRequest, ChatResponse
import logging
import re
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import asyncio

# Official Vertex AI imports
import vertexai
from vertexai.preview.generative_models import GenerativeModel, Part, SafetySetting, Tool
from vertexai.preview import rag

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Vertex AI once at module level
vertexai.init(
    project="lma-website-461920",
    location="us-central1",
    api_endpoint="us-central1-aiplatform.googleapis.com"
)

# Configuration constants
GEMINI_MODEL = 'gemini-2.0-flash-001'

@dataclass
class QueryResult:
    """Structured result from query processing"""
    original_query: str
    reformulated_queries: List[str]
    has_personal_context: bool
    query_type: str  # 'factual', 'personal', 'procedural', 'exploratory', 'content_creation', 'company_info'
    confidence: float

class FlexibleRAGProcessor:
    """Enhanced RAG processor with multiple strategies"""
    
    def __init__(self):
        self.personal_indicators = [
            'my', 'me', 'i', 'mine', 'myself', 'our', 'we', 'us', 'user'
        ]
        
        # Company context awareness
        self.company_context = {
            'name': 'LMA',
            'full_name': 'LMA',
            'aliases': ['lma', 'our company', 'our organization', 'our firm'],
            'business_areas': ['consulting', 'advisory', 'private equity', 'PE', 'investment']
        }
    
    async def analyze_query(self, query: str) -> QueryResult:
        """Analyze query to understand intent and context"""
        query_lower = query.lower()
        
        # Check for personal context (including company context)
        has_personal = any(indicator in query_lower for indicator in self.personal_indicators)
        
        # Check for company context
        has_company_context = self._detect_company_context(query_lower)
        
        # Treat company queries as personal context since user works at LMA
        if has_company_context:
            has_personal = True
        
        # Determine query type
        query_type = self._classify_query_type(query_lower)
        
        # Generate reformulated queries using LLM
        reformulated = await generate_query_variations_with_llm(query, query_type, has_personal, has_company_context)
        
        # Calculate confidence based on query clarity
        confidence = self._calculate_confidence(query, reformulated)
        
        return QueryResult(
            original_query=query,
            reformulated_queries=reformulated,
            has_personal_context=has_personal,
            query_type=query_type,
            confidence=confidence
        )
    
    def _detect_company_context(self, query: str) -> bool:
        """Detect if query is about the company (LMA)"""
        # Direct company mentions
        if any(alias in query for alias in self.company_context['aliases']):
            return True
        
        # Implicit company context
        company_implicit_indicators = [
            'our experience', 'our expertise', 'our approach', 'our services',
            'our capabilities', 'our team', 'our process', 'our methodology',
            'company experience', 'firm experience', 'organization experience'
        ]
        
        return any(indicator in query for indicator in company_implicit_indicators)
    
    def _classify_query_type(self, query: str) -> str:
        """Classify the type of query"""
        # Handle simple company info queries first
        if any(phrase in query.lower() for phrase in ['tell me about lma', 'about lma', 'what is lma']):
            return 'company_info'
        elif any(word in query for word in ['write', 'create', 'draft', 'generate', 'compose']):
            return 'content_creation'
        elif any(word in query for word in ['experience', 'background', 'worked', 'consulting']):
            return 'experience'
        elif any(word in query for word in ['how', 'process', 'steps', 'procedure']):
            return 'procedural'
        elif any(word in query for word in ['what', 'who', 'when', 'where']):
            return 'factual'
        else:
            return 'exploratory'
    
    def _calculate_confidence(self, original: str, variations: List[str]) -> float:
        """Calculate confidence in query processing"""
        base_confidence = 0.5
        
        if len(original.split()) > 3:
            base_confidence += 0.2
        
        if len(variations) > 2:
            base_confidence += 0.2
        
        if len(original.split()) < 2:
            base_confidence -= 0.3
        
        return max(0.1, min(1.0, base_confidence))
    
async def generate_query_variations_with_llm(original_query: str, query_type: str, has_personal_context: bool, has_company_context: bool) -> List[str]:
    """Use LLM to generate intelligent query variations for better RAG retrieval"""
    try:
        model = GenerativeModel('gemini-2.0-flash-001')
        
        # Build context for the LLM
        context_info = []
        if has_company_context or has_personal_context:
            context_info.append("This query is about LMA (a consulting firm)")
        if query_type == 'company_info':
            context_info.append("User wants company information")
        elif query_type == 'content_creation':
            context_info.append("User wants to create content using company information")
        elif query_type == 'experience':
            context_info.append("User is asking about experience/background")
        
        context_str = ". ".join(context_info) if context_info else "General query"
        
        prompt = f"""You are helping generate search query variations for a RAG (Retrieval Augmented Generation) system that searches through LMA's company knowledge base.

Original Query: "{original_query}"
Query Type: {query_type}
Context: {context_str}

Generate 5-7 different search query variations that would help retrieve relevant information from LMA's knowledge base. The variations should:

1. Include the original query
2. Add relevant synonyms and related terms
3. Include company-specific variations (LMA + topic) when appropriate
4. Use different phrasings and perspectives
5. Include both specific and broader search terms
6. Avoid redundant or overly similar variations

For LMA context:
- LMA is a consulting firm
- Specializes in private equity, C-suite advisory, executive consulting
- Has experience with AI, digital transformation, policy management
- When users ask about "my" or "our" experience, they mean LMA's experience

Return ONLY the query variations, one per line, without numbering or explanation:"""

        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": 1000,
                "temperature": 0.4,  # Some creativity but controlled
                "top_p": 0.9,
                "candidate_count": 1,
            }
        )
        
        if response.text:
            # Parse the response into individual queries
            variations = [
                line.strip() 
                for line in response.text.strip().split('\n') 
                if line.strip() and len(line.strip()) > 3
            ]
            
            # Ensure we always include the original query
            if original_query not in variations:
                variations.insert(0, original_query)
            
            # Limit to reasonable number and remove duplicates
            seen = set()
            unique_variations = []
            for var in variations[:8]:  # Max 8 variations
                var_lower = var.lower().strip()
                if var_lower not in seen and len(var.strip()) > 3:
                    seen.add(var_lower)
                    unique_variations.append(var.strip())
            
            return unique_variations
        else:
            return fallback_query_generation(original_query, query_type, has_personal_context, has_company_context)
            
    except Exception as e:
        logger.warning(f"LLM query generation failed, using fallback: {e}")
        return fallback_query_generation(original_query, query_type, has_personal_context, has_company_context)

def fallback_query_generation(query: str, query_type: str, has_personal: bool, has_company_context: bool) -> List[str]:
    """Fallback query generation if LLM fails"""
    variations = [query]
    
    # Simple fallback logic
    if has_company_context or has_personal:
        if not query.lower().startswith('lma'):
            variations.append(f"LMA {query}")
        variations.append(f"LMA experience with {query}")
    
    # Add query type specific variations
    if query_type == 'company_info':
        variations.extend([
            "LMA company information",
            "LMA services and capabilities"
        ])
    elif query_type == 'experience':
        variations.append(f"background in {query}")
    
    return list(set(variations))[:5]  # Remove duplicates and limit
    
def get_enhanced_rag_tools(similarity_top_k=15):
    """Enhanced RAG tools configuration"""
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

async def clean_and_format_response_with_llm(text):
    """Use a cheap LLM to fix formatting issues in RAG responses"""
    if not text or len(text.strip()) < 10:
        return text
    
    try:
        # Use Gemini Flash (cheapest) to fix formatting
        model = GenerativeModel('gemini-2.0-flash-001')
        
        prompt = f"""Fix any formatting issues in the following text. Common problems to fix:
- Missing spaces between words (e.g., "experiencein" should be "experience in")
- Words concatenated together without spaces
- Missing spaces after periods
- Any other obvious formatting issues

Keep the content exactly the same, only fix spacing and formatting. Do not add, remove, or change any information.

Text to fix:
{text}

Fixed text:"""

        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": len(text) + 500,  # Allow some buffer
                "temperature": 0.1,  # Very low temperature for consistency
                "top_p": 0.9,
                "candidate_count": 1,
            }
        )
        
        if response.text:
            return response.text.strip()
        else:
            return simple_clean_response(text)
            
    except Exception as e:
        logger.warning(f"LLM formatting failed, using simple cleaning: {e}")
        return simple_clean_response(text)

def simple_clean_response(text):
    """Simple fallback cleaning if LLM formatting fails"""
    if not text:
        return ""
    
    # Basic cleaning only
    clean_text = text.strip()
    
    # Remove citations and references
    clean_text = re.sub(r'\[\d+\]', '', clean_text)
    clean_text = re.sub(r'\(\d+\)', '', clean_text)
    clean_text = re.sub(r'Source: .*?\n', '', clean_text)
    clean_text = re.sub(r'Citation: .*?\n', '', clean_text)
    clean_text = re.sub(r'Reference: .*?\n', '', clean_text)
    
    # Fix obvious sentence spacing issues
    clean_text = re.sub(r'\.(?=[A-Z])', '. ', clean_text)
    clean_text = re.sub(r'\s+', ' ', clean_text)
    
    return clean_text.strip()

async def enhanced_gemini_rag_search(query: str) -> str:
    """Enhanced Gemini RAG search"""
    try:
        tools = get_enhanced_rag_tools()
        
        # Enhanced system instruction for better LMA context understanding
        system_instruction = """You are an expert LMA assistant with comprehensive access to LMA's organizational knowledge base. 

Key Guidelines:
- You have access to LMA's internal documents, case studies, professional background, experience, and organizational information
- When users ask about "my experience" or "our experience", they are referring to LMA's organizational capabilities and track record
- Provide detailed, professional responses using the specific information from LMA's knowledge base
- Focus on LMA's expertise, proven experience, case studies, and business capabilities
- If asked to create content using "information about me", understand this means using LMA's organizational information
- Be comprehensive and draw from multiple relevant sources in your knowledge base
- Maintain a professional consulting tone while being conversational and helpful

You are responding as LMA's knowledgeable assistant with full access to organizational information."""
        
        model = GenerativeModel(
            GEMINI_MODEL,
            tools=tools,
            system_instruction=system_instruction
        )
        
        # Enhanced generation config for better responses
        generation_config = {
            "max_output_tokens": 8192,
            "temperature": 0.3,
            "top_p": 0.9,
            "top_k": 40,
            "candidate_count": 1,
        }
        
        response_text = ""
        
        try:
            responses = model.generate_content(
                [query],
                generation_config=generation_config,
                safety_settings=get_safety_settings(),
                stream=True,
            )

            response_parts = []
            for response in responses:
                if (response.candidates and 
                    response.candidates[0].content and 
                    response.candidates[0].content.parts and
                    response.text):
                    
                    cleaned_chunk = await clean_and_format_response_with_llm(response.text)
                    if cleaned_chunk:
                        response_parts.append(cleaned_chunk)
            
            response_text = "".join(response_parts)
            # No need to clean again since each chunk was already cleaned
                    
        except Exception as e:
            logger.error(f"Error generating Gemini RAG content: {e}")
            response_text = ""
        
        return response_text
        
    except Exception as e:
        logger.error(f"Error in Gemini RAG search for '{query}': {e}")
        return ""

async def multi_query_gemini_search(queries: List[str], max_concurrent=3) -> List[str]:
    """Perform multiple Gemini RAG searches concurrently"""
    async def single_search(query: str) -> str:
        return await enhanced_gemini_rag_search(query)
    
    # Execute searches with concurrency limit
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def bounded_search(query):
        async with semaphore:
            return await single_search(query)
    
    # Run searches concurrently
    tasks = [bounded_search(query) for query in queries[:6]]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Filter out exceptions and empty results
    valid_results = [
        result for result in results 
        if isinstance(result, str) and result.strip()
    ]
    
    return valid_results

def synthesize_gemini_results(results: List[str], original_query: str, query_analysis: QueryResult) -> str:
    """Synthesize results from multiple Gemini searches"""
    if not results:
        return generate_helpful_fallback_response(original_query, query_analysis)
    
    # Take the best result (first non-empty comprehensive result)
    best_result = ""
    for result in results:
        if len(result.strip()) > 100:  # Look for substantial responses
            best_result = result
            break
    
    # If no substantial result, combine shorter ones
    if not best_result:
        combined_info = "\n\n".join(results[:3])  # Combine top 3 results
        
        if combined_info.strip():
            # Use Gemini to synthesize the combined information
            synthesis_query = f"""Based on the following information about LMA, provide a comprehensive response to: "{original_query}"

Information:
{combined_info}

Please synthesize this information into a clear, comprehensive response that directly addresses the user's question."""
            
            try:
                synthesized = asyncio.run(enhanced_gemini_rag_search(synthesis_query))
                return synthesized if synthesized else combined_info
            except Exception as e:
                logger.error(f"Error in synthesis: {e}")
                return combined_info
        else:
            return generate_helpful_fallback_response(original_query, query_analysis)
    
    return best_result

def generate_helpful_fallback_response(query: str, analysis: QueryResult) -> str:
    """Generate helpful response when RAG retrieval fails"""
    if analysis.has_personal_context:
        return f"""I understand you're asking about LMA's {analysis.query_type} related to "{query}". 

While I wasn't able to find specific information in our knowledge base about this topic, I can help you in other ways:

1. **Broader Search**: I can search for general information about {analysis.query_type} in this area
2. **Related Topics**: I could look for information about related LMA services or capabilities
3. **Specific Context**: If you can provide more specific details about what aspect you're interested in, I can search more targeted information

Since you're asking about LMA specifically, let me know if you'd like me to search for:
- General LMA capabilities and services
- Related consulting areas where LMA has experience
- Specific industry sectors or client types

What would be most helpful for you?"""
    
    else:
        return f"""I wasn't able to find specific information about "{query}" in our LMA knowledge base. Let me suggest some ways to help:

1. **Rephrase with LMA context**: Since this is about LMA, try adding "LMA" to your question
2. **Be more specific**: Adding more context about the specific area or service might help
3. **Related LMA topics**: I could search for related LMA capabilities

For example, you could ask:
- "What is LMA's experience with [specific area]?"
- "How does LMA approach [specific process]?"
- "What LMA services are available for [specific need]?"

What would be most helpful for you?"""

@router.post("/chat", response_model=ChatResponse)
async def enhanced_gemini_rag_chat(request: ChatRequest):
    """Enhanced Gemini RAG chat with flexible query processing"""
    try:
        current_query = request.messages[-1].content if request.messages else ""
        
        if not current_query.strip():
            return ChatResponse(
                response="Hello! I'm your LMA knowledge assistant powered by Gemini with access to your comprehensive knowledge base. I can help you find information from your documents, create content using your case studies and background, and answer questions about LMA's specific capabilities and experience. What would you like to know?",
                status="success"
            )
        
        # Initialize the flexible RAG processor
        processor = FlexibleRAGProcessor()
        
        # Analyze the query (now async)
        query_analysis = await processor.analyze_query(current_query)
        
        logger.info(f"Query analysis: {query_analysis}")
        
        # For simple queries or company info requests, use direct Gemini RAG
        if query_analysis.query_type == 'company_info' or len(query_analysis.reformulated_queries) <= 2:
            direct_result = await enhanced_gemini_rag_search(current_query)
            final_response = await clean_and_format_response_with_llm(direct_result) if direct_result else generate_helpful_fallback_response(current_query, query_analysis)
        else:
            # Perform multi-query RAG search
            search_results = await multi_query_gemini_search(query_analysis.reformulated_queries)
            
            # Synthesize results
            final_response = synthesize_gemini_results(search_results, current_query, query_analysis)
            final_response = await clean_and_format_response_with_llm(final_response)
        
        return ChatResponse(
            response=final_response,
            status="success"
        )
        
    except Exception as e:
        logger.error(f"Enhanced Gemini RAG chat error: {e}")
        return ChatResponse(
            response="I encountered an error while processing your request. Please try rephrasing your question or contact support if the issue persists.",
            status="error"
        )

@router.post("/search", response_model=RAGResponse)
async def enhanced_gemini_rag_search_endpoint(request: RAGRequest):
    """Enhanced Gemini RAG search endpoint"""
    try:
        processor = FlexibleRAGProcessor()
        query_analysis = await processor.analyze_query(request.query)
        
        # Use enhanced Gemini RAG search
        search_result = await enhanced_gemini_rag_search(request.query)
        
        if search_result:
            final_response = await clean_and_format_response_with_llm(search_result)
        else:
            final_response = generate_helpful_fallback_response(request.query, query_analysis)
        
        return RAGResponse(
            response=final_response,
            status="success" if search_result else "partial_results",
            sources=None
        )
        
    except Exception as e:
        logger.error(f"Enhanced Gemini RAG search error: {e}")
        return RAGResponse(
            response=f"Search error: {str(e)}",
            status="error",
            sources=None
        )

@router.get("/lma-info")
async def get_lma_info():
    """Get information about LMA"""
    try:
        return JSONResponse(content={
            "organization": "LMA",
            "description": "LMA knowledge assistant powered by Gemini with enhanced RAG capabilities",
            "model": GEMINI_MODEL,
            "rag_corpus": "1152921504606846976",
            "architecture": "Enhanced Gemini RAG with intelligent query processing",
            "features": [
                "Enhanced RAG retrieval",
                "Intelligent query analysis", 
                "Multi-query search strategies",
                "Company context awareness",
                "Content creation capabilities",
                "Flexible response generation"
            ],
            "optimization": "Smart query processing, efficient RAG access, comprehensive responses",
            "last_updated": "2025-06-17"
        })
    except Exception as e:
        logger.error(f"LMA info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def status():
    """Status endpoint for enhanced Gemini RAG service"""
    try:
        status_info = {
            "status": "healthy",
            "service": "enhanced-gemini-rag-chat",
            "model": GEMINI_MODEL,
            "rag_corpus": "1152921504606846976",
            "architecture": "enhanced_gemini_rag",
            "features": ["intelligent_queries", "rag_access", "multi_search", "context_awareness", "content_creation"]
        }
        
        try:
            # Test Gemini RAG connectivity
            tools = get_enhanced_rag_tools()
            test_model = GenerativeModel(GEMINI_MODEL, tools=tools)
            test_response = test_model.generate_content(
                ["Test query"],
                generation_config={"max_output_tokens": 10}
            )
            status_info["gemini_rag_system"] = "connected"
            status_info["test_response"] = "success"
            
        except Exception as e:
            status_info["gemini_rag_system"] = f"error: {str(e)}"
            status_info["status"] = "degraded"
        
        return JSONResponse(content=status_info)
    except Exception as e:
        return JSONResponse(content={
            "status": "unhealthy",
            "service": "enhanced-gemini-rag-chat",
            "error": str(e)
        }, status_code=500)