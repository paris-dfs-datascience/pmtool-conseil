from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
import logging
import asyncio
from datetime import datetime
import re
import hashlib

# Official Vertex AI imports
import vertexai
from vertexai.preview.generative_models import GenerativeModel, SafetySetting, Tool
from vertexai.preview import rag

# Import models from separate file
from models import PitchRequest, CustomQuestionRequest, PitchResponse, ErrorResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Vertex AI once at module level
vertexai.init(
    project="lma-website-461920",
    location="us-central1",
    api_endpoint="us-central1-aiplatform.googleapis.com"
)

# Configuration constants
GEMINI_MODEL = 'gemini-2.5-pro'
GEMINI_FLASH_MODEL = 'gemini-2.0-flash-001'

# Consulting area templates for better RAG queries
CONSULTING_TEMPLATES = {
    'digital_transformation': {
        'keywords': ['digital', 'transformation', 'technology', 'automation', 'ai', 'data', 'analytics'],
        'rag_query': 'LMA digital transformation AI implementation data analytics technology projects experience'
    },
    'change_management': {
        'keywords': ['change', 'management', 'organizational', 'culture', 'leadership', 'transition'],
        'rag_query': 'LMA change management organizational transformation culture leadership experience'
    },
    'strategy_consulting': {
        'keywords': ['strategy', 'strategic', 'planning', 'growth', 'market', 'competitive'],
        'rag_query': 'LMA strategic consulting business planning market analysis competitive strategy experience'
    },
    'operations': {
        'keywords': ['operations', 'operational', 'efficiency', 'process', 'optimization', 'supply chain'],
        'rag_query': 'LMA operational excellence process optimization efficiency supply chain experience'
    },
    'private_equity': {
        'keywords': ['private equity', 'pe', 'investment', 'portfolio', 'due diligence', 'value creation'],
        'rag_query': 'LMA private equity PE investment portfolio due diligence value creation experience'
    }
}

def get_rag_tools(similarity_top_k=8):
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

def count_words(text: str) -> int:
    """Count words in text"""
    return len(text.split())

def truncate_response(text: str, max_chars: Optional[int] = None, max_words: Optional[int] = None) -> str:
    """Truncate response to fit within limits - LESS AGGRESSIVE"""
    if max_words and count_words(text) > max_words:
        words = text.split()
        text = ' '.join(words[:max_words])
        # Try to end at a sentence boundary
        last_period = text.rfind('.')
        if last_period > len(text) * 0.7:  # More lenient - last 30%
            text = text[:last_period + 1]

    if max_chars and len(text) > max_chars:
        text = text[:max_chars]
        # Try to end at a sentence boundary
        last_period = text.rfind('.')
        if last_period > len(text) * 0.7:  # More lenient - last 30%
            text = text[:last_period + 1]
        elif text[-1] != ' ':  # Try to end at word boundary
            last_space = text.rfind(' ')
            if last_space > len(text) * 0.8:  # More lenient - last 20%
                text = text[:last_space]

    return text.strip()

def detect_consulting_area(job_description: str) -> str:
    """Detect primary consulting area to optimize RAG query"""
    text = job_description.lower()
    
    for area, config in CONSULTING_TEMPLATES.items():
        if any(keyword in text for keyword in config['keywords']):
            return area
    
    return 'general'

def get_optimal_model(content_length: int, complexity: str = 'medium') -> str:
    """Choose model based on content complexity - UPDATED to prefer full model for pitches"""
    # For pitches, always use the full model to get detailed responses
    return GEMINI_MODEL  # Always use the more capable model for better results

async def get_lma_context_from_rag(query: str) -> str:
    """Get relevant LMA context from RAG system"""
    try:
        tools = get_rag_tools()
        
        system_instruction = """You are extracting specific LMA experience and expertise. Focus on:
- Concrete project examples and results
- Specific industry experience
- Proven methodologies and approaches
- Quantifiable outcomes and achievements
- Team capabilities and backgrounds

Provide detailed, specific information that can be used to demonstrate credibility and expertise."""
        
        model = GenerativeModel(
            GEMINI_MODEL,
            tools=tools,
            system_instruction=system_instruction
        )
        
        response = model.generate_content(
            [query],
            generation_config={
                "max_output_tokens": 2048,
                "temperature": 0.2,
                "top_p": 0.9,
                "candidate_count": 1,
            },
            safety_settings=get_safety_settings(),
        )
        
        if response.text:
            # Clean response
            cleaned = response.text.strip()
            cleaned = re.sub(r'\[\d+\]', '', cleaned)  # Remove citations
            return cleaned
        else:
            return ""
            
    except Exception as e:
        logger.error(f"RAG context retrieval error: {e}")
        return ""

async def generate_standard_pitch_with_rag(job_description: str, max_characters: int = 3000) -> tuple[str, bool]:
    """Generate a standard consulting pitch response using Gemini and RAG"""
    
    # Detect consulting area for targeted RAG query
    consulting_area = detect_consulting_area(job_description)
    
    # Build targeted RAG query
    if consulting_area != 'general':
        rag_query = CONSULTING_TEMPLATES[consulting_area]['rag_query']
    else:
        # Extract key terms from job description for RAG query
        key_terms = re.findall(r'\b[a-zA-Z]{4,}\b', job_description.lower())
        unique_terms = list(set(key_terms))[:8]  # Take top 8 unique terms
        rag_query = f"LMA experience with {' '.join(unique_terms)}"
    
    # Get relevant LMA context
    lma_context = await get_lma_context_from_rag(rag_query)
    used_rag = bool(lma_context.strip())
    
    # Enhanced prompt with RAG context - MUCH MORE DETAILED
    if used_rag:
        prompt = f"""You are Matt Paris, a principal consultant at LMA. Create a COMPREHENSIVE, DETAILED pitch that fully utilizes the character limit of {max_characters} characters.

**LMA's Relevant Experience & Expertise:**
{lma_context}

**Job Description to Address:**
{job_description}

**CRITICAL REQUIREMENTS:**
- TARGET LENGTH: {max_characters - 100} to {max_characters} characters (use nearly the full limit!)
- Write in first person as Matt Paris from LMA
- Be comprehensive and detailed, not brief
- Use specific examples and metrics from LMA experience
- Include multiple relevant project examples
- Show deep understanding of their challenges
- Provide detailed methodology and approach

**DETAILED PITCH STRUCTURE (expand each section fully):**

1. **Strong Opening (150-200 characters):** 
   - Introduce yourself as Matt Paris, Principal Consultant at LMA
   - Immediately demonstrate understanding of their specific challenge
   - Hook them with confidence and expertise

2. **Relevant Experience Deep Dive (800-1000 characters):**
   - Connect 2-3 specific LMA projects to their needs
   - Include quantifiable results and outcomes
   - Use phrases like "In our work with [similar client], we achieved [specific metric]"
   - Reference specific methodologies and frameworks used
   - Show industry expertise and understanding

3. **Proven Track Record & Capabilities (600-800 characters):**
   - Highlight LMA's broader experience and client base  
   - Reference specific tools, technologies, and approaches
   - Include team capabilities and backgrounds
   - Show scale and sophistication of past work

4. **Detailed Approach & Methodology (600-800 characters):**
   - Outline a comprehensive 4-5 step approach
   - Reference LMA's proven frameworks and methodologies
   - Include timeline and delivery expectations
   - Show how you'll measure success and deliver value

5. **Compelling Close (200-300 characters):**
   - Reinforce why LMA is the right choice
   - Include next steps and call to action
   - Show enthusiasm and confidence

**STYLE REQUIREMENTS:**
- Professional yet engaging tone
- Use industry terminology appropriately  
- Include specific numbers, percentages, and outcomes where possible
- Make it feel personal and tailored, not generic
- Use the FULL character limit - don't be brief!

Write a pitch that uses nearly all {max_characters} characters and demonstrates LMA's full capabilities."""
    else:
        # Enhanced fallback prompt without RAG context
        prompt = f"""You are Matt Paris, a principal consultant at LMA. Create a COMPREHENSIVE pitch that uses the full character limit of {max_characters} characters.

**Job Description:**
{job_description}

**CRITICAL REQUIREMENTS:**
- TARGET LENGTH: {max_characters - 100} to {max_characters} characters
- Use nearly the entire character limit - be detailed and comprehensive
- Write in first person as Matt Paris from LMA
- Show deep consulting expertise and experience

**COMPREHENSIVE PITCH STRUCTURE:**

1. **Professional Introduction (150-200 chars):**
   - Introduce yourself as Matt Paris, Principal Consultant at LMA
   - Show immediate understanding of their challenge

2. **LMA's Relevant Experience (900-1100 chars):**
   - Detail multiple relevant consulting engagements
   - Include specific industries, project types, and outcomes
   - Reference strategic transformation, change management, operational excellence
   - Include quantifiable results and client successes
   - Show breadth and depth of LMA's capabilities

3. **Methodology & Approach (700-900 chars):**
   - Outline LMA's proven consulting framework
   - Detail 4-5 specific steps for their project
   - Include risk mitigation and quality assurance
   - Reference change management and stakeholder engagement
   - Show timeline and milestone approach

4. **Team & Capabilities (400-600 chars):**
   - Highlight LMA's team expertise and backgrounds
   - Reference relevant certifications and specializations
   - Show scale of LMA's operations and client base
   - Include technology and analytical capabilities

5. **Value Proposition & Close (200-300 chars):**
   - Reinforce LMA's unique value and track record
   - Include confident next steps and call to action
   - Show enthusiasm for the opportunity

Focus on LMA's expertise in strategic transformation, digital transformation, change management, and operational excellence. Use the FULL character limit."""

    try:
        # Always use the more capable model for detailed pitches
        model = GenerativeModel(GEMINI_MODEL)  # Force use of full model, not flash

        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": max_characters * 4,  # Much more generous token limit
                "temperature": 0.4,  # Slightly lower for more structured response
                "top_p": 0.95,
                "candidate_count": 1,
            },
            safety_settings=get_safety_settings()
        )

        if response.text:
            # Clean and format the response
            cleaned_response = response.text.strip()
            cleaned_response = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned_response)
            cleaned_response = re.sub(r'\*(.*?)\*', r'\1', cleaned_response)
            cleaned_response = re.sub(r'#{1,6}\s', '', cleaned_response)

            # Only truncate if significantly over limit (allow 10% buffer)
            if len(cleaned_response) > max_characters * 1.1:
                final_response = truncate_response(cleaned_response, max_chars=max_characters)
            else:
                final_response = cleaned_response
                
            return final_response, used_rag
        else:
            raise Exception("No response generated from Gemini")

    except Exception as e:
        logger.error(f"Error generating pitch: {e}")
        return "Error generating pitch, please try again.", False

async def generate_custom_response_with_rag(question: str, max_words: int = 500) -> tuple[str, bool]:
    """Generate a custom response to any question using Gemini with LMA context"""

    # Get relevant LMA context for the question
    context_query = f"LMA expertise and experience related to: {question}"
    lma_expertise = await get_lma_context_from_rag(context_query)
    used_rag = bool(lma_expertise.strip())

    if used_rag:
        prompt = f"""You are a senior consultant at LMA. Answer this question using our firm's actual experience and expertise.

**Relevant LMA Experience & Capabilities:**
{lma_expertise}

**Question:** {question}

Provide a comprehensive, professional response that:
1. Demonstrates LMA's specific expertise using the context provided
2. References concrete examples and proven results from our experience
3. Provides actionable insights based on our track record
4. Shows thought leadership and consulting excellence
5. Maintains a senior consultant perspective

Style: Professional, confident, practical. Reference specific LMA capabilities and experience.
Length: Maximum {max_words} words."""
    else:
        prompt = f"""You are a senior consultant at LMA, a premier consulting firm. Answer this consulting question with expertise and insight.

**Question:** {question}

Provide a response that demonstrates:
- Senior consulting experience and strategic thinking
- Practical, actionable insights
- Understanding of business challenges and solutions
- Professional consulting approach
- LMA's commitment to excellence and results

Maximum {max_words} words. Be comprehensive but concise."""

    try:
        # Choose model based on complexity
        model_name = get_optimal_model(len(question), 'medium')
        model = GenerativeModel(model_name)

        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": max_words * 3,  # Allow buffer for word count
                "temperature": 0.3,
                "top_p": 0.9,
                "candidate_count": 1,
            },
            safety_settings=get_safety_settings()
        )

        if response.text:
            # Clean and format the response
            cleaned_response = response.text.strip()
            cleaned_response = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned_response)
            cleaned_response = re.sub(r'\*(.*?)\*', r'\1', cleaned_response)
            cleaned_response = re.sub(r'#{1,6}\s', '', cleaned_response)

            # Ensure it fits within word limit
            final_response = truncate_response(cleaned_response, max_words=max_words)
            return final_response, used_rag
        else:
            raise Exception("No response generated from Gemini")

    except Exception as e:
        logger.error(f"Error generating custom response: {e}")
        return "Unable to generate response. Please provide more specific information.", False

@router.post("/generate-pitch", response_model=PitchResponse)
async def generate_pitch(request: PitchRequest):
    """Generate a standard consulting pitch response with RAG"""
    start_time = asyncio.get_event_loop().time()

    try:
        logger.info(f"Generating pitch for job description: {request.job_description[:100]}...")

        # Generate the pitch response with RAG
        response_text, used_rag = await generate_standard_pitch_with_rag(
            request.job_description,
            request.max_characters
        )

        end_time = asyncio.get_event_loop().time()
        generation_time_ms = int((end_time - start_time) * 1000)

        # Create response
        pitch_response = PitchResponse(
            id=str(int(datetime.now().timestamp() * 1000)),
            type="pitch",
            response=response_text,
            character_count=len(response_text),
            word_count=count_words(response_text),
            timestamp=datetime.now(),
            generation_time_ms=generation_time_ms,
            used_rag=used_rag
        )

        logger.info(f"Generated pitch in {generation_time_ms}ms, {len(response_text)} characters, RAG used: {used_rag}")
        return pitch_response

    except Exception as e:
        logger.error(f"Error generating pitch: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate pitch: {str(e)}"
        )

@router.post("/generate-custom", response_model=PitchResponse)
async def generate_custom(request: CustomQuestionRequest):
    """Generate a custom response to any question with RAG"""
    start_time = asyncio.get_event_loop().time()

    try:
        logger.info(f"Generating custom response for question: {request.question[:100]}...")

        # Generate the custom response with RAG
        response_text, used_rag = await generate_custom_response_with_rag(
            request.question,
            request.max_words
        )

        end_time = asyncio.get_event_loop().time()
        generation_time_ms = int((end_time - start_time) * 1000)

        # Create response
        custom_response = PitchResponse(
            id=str(int(datetime.now().timestamp() * 1000)),
            type="custom",
            response=response_text,
            character_count=len(response_text),
            word_count=count_words(response_text),
            timestamp=datetime.now(),
            generation_time_ms=generation_time_ms,
            used_rag=used_rag
        )

        logger.info(f"Generated custom response in {generation_time_ms}ms, {count_words(response_text)} words, RAG used: {used_rag}")
        return custom_response

    except Exception as e:
        logger.error(f"Error generating custom response: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate custom response: {str(e)}"
        )

@router.get("/pitch-templates")
async def get_pitch_templates():
    """Get available pitch templates and guidelines"""
    return JSONResponse(content={
        "standard_pitch": {
            "description": "Standard consulting pitch for job opportunities with RAG-enhanced LMA context",
            "max_characters": 3000,
            "features": [
                "Uses actual LMA experience from knowledge base",
                "Targeted consulting area detection",
                "Specific project examples and results",
                "Proven methodology references"
            ],
            "structure": [
                "Introduce Matt Paris from LMA",
                "Connect specific LMA experience to client needs",
                "Reference concrete results and metrics",
                "Outline proven approach",
                "Confident closing with next steps"
            ]
        },
        "custom_question": {
            "description": "Custom response with LMA expertise and context",
            "max_words": 500,
            "features": [
                "Leverages LMA knowledge base",
                "Industry-specific expertise",
                "Proven frameworks and methodologies",
                "Actionable insights"
            ],
            "guidelines": [
                "Demonstrate LMA expertise with specific examples",
                "Provide actionable, practical insights",
                "Reference proven consulting frameworks",
                "Show industry knowledge and best practices",
                "Balance strategic and tactical perspectives"
            ]
        },
        "consulting_areas": {
            "digital_transformation": "AI, data analytics, technology implementation",
            "change_management": "Organizational transformation, culture, leadership",
            "strategy_consulting": "Business planning, market analysis, competitive strategy",
            "operations": "Process optimization, efficiency, supply chain",
            "private_equity": "Investment support, due diligence, value creation"
        },
        "rag_integration": {
            "corpus_id": "1152921504606846976",
            "similarity_threshold": 8,
            "intelligent_querying": True,
            "context_aware": True
        }
    })

@router.get("/status")
async def get_status():
    """Get status of the consulting pitch service"""
    try:
        # Test Gemini connectivity
        test_model = GenerativeModel(GEMINI_MODEL)
        test_response = test_model.generate_content(
            "Test connection",
            generation_config={"max_output_tokens": 10}
        )

        # Test RAG connectivity
        rag_status = "unknown"
        try:
            tools = get_rag_tools()
            rag_model = GenerativeModel(GEMINI_MODEL, tools=tools)
            rag_test = rag_model.generate_content(
                "Test RAG connection",
                generation_config={"max_output_tokens": 5}
            )
            rag_status = "connected"
        except Exception as e:
            rag_status = f"error: {str(e)[:100]}"

        return JSONResponse(content={
            "status": "healthy",
            "service": "consulting-pitch-generator-with-rag",
            "model": GEMINI_MODEL,
            "flash_model": GEMINI_FLASH_MODEL,
            "features": [
                "rag_enhanced_pitches",
                "intelligent_consulting_area_detection",
                "adaptive_model_selection",
                "lma_context_integration",
                "character_word_optimization",
                "performance_tracking"
            ],
            "gemini_connection": "connected",
            "rag_connection": rag_status,
            "endpoints": [
                "/generate-pitch",
                "/generate-custom",
                "/pitch-templates",
                "/status",
                "/health"
            ],
            "optimization": {
                "smart_model_selection": True,
                "targeted_rag_queries": True,
                "response_caching_ready": True
            },
            "last_updated": "2025-06-21"
        })

    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "service": "consulting-pitch-generator-with-rag",
                "error": str(e),
                "gemini_connection": "failed"
            }
        )

@router.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return JSONResponse(content={
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "consulting-pitch-generator-with-rag"
    })