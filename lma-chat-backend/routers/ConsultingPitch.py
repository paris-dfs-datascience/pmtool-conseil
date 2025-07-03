from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
import asyncio
from datetime import datetime
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

# Configuration constants
GEMINI_MODEL = 'gemini-2.5-pro'
GEMINI_FLASH_MODEL = 'gemini-2.0-flash-001'

# Pydantic models
class PitchRequest(BaseModel):
    job_description: str = Field(..., min_length=10, max_length=10000, description="The job description to generate a pitch for")
    max_characters: Optional[int] = Field(default=2000, ge=500, le=5000, description="Maximum characters for the response")

class CustomQuestionRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=2000, description="The custom question to answer")
    max_words: Optional[int] = Field(default=500, ge=100, le=1000, description="Maximum words for the response")

class PitchResponse(BaseModel):
    id: str
    type: str  # 'pitch' or 'custom'
    response: str
    character_count: Optional[int] = None
    word_count: Optional[int] = None
    timestamp: datetime
    generation_time_ms: int
    status: str = "success"
    used_rag: bool = False

def get_rag_tools(similarity_top_k=10):
    """Get configured RAG tools for retrieving past performance"""
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

def count_words(text: str) -> int:
    """Count words in text"""
    return len(text.split())

def truncate_response(text: str, max_chars: Optional[int] = None, max_words: Optional[int] = None) -> str:
    """Truncate response to fit within limits"""
    if max_words and count_words(text) > max_words:
        words = text.split()
        text = ' '.join(words[:max_words])
        # Try to end at a sentence boundary
        last_period = text.rfind('.')
        if last_period > len(text) * 0.8:  # If period is in last 20%
            text = text[:last_period + 1]
    
    if max_chars and len(text) > max_chars:
        text = text[:max_chars]
        # Try to end at a sentence boundary
        last_period = text.rfind('.')
        if last_period > len(text) * 0.8:  # If period is in last 20%
            text = text[:last_period + 1]
        elif text[-1] != ' ':  # Try to end at word boundary
            last_space = text.rfind(' ')
            if last_space > len(text) * 0.9:  # If space is in last 10%
                text = text[:last_space]
    
    return text.strip()

def build_performance_query(job_description: str) -> str:
    """Build a targeted query to find relevant past performance and projects"""
    
    # Extract key terms from job description
    key_terms = []
    
    # Industry/sector terms
    industries = ['healthcare', 'financial services', 'technology', 'manufacturing', 'retail', 'energy', 'government']
    for industry in industries:
        if industry in job_description.lower():
            key_terms.append(industry)
    
    # Project type terms
    project_types = ['digital transformation', 'change management', 'process improvement', 'strategy', 'operations', 'data analytics', 'ai implementation', 'cost reduction']
    for proj_type in project_types:
        if proj_type in job_description.lower():
            key_terms.append(proj_type)
    
    # Function/role terms
    functions = ['supply chain', 'finance', 'hr', 'marketing', 'sales', 'operations', 'it', 'procurement']
    for function in functions:
        if function in job_description.lower():
            key_terms.append(function)
    
    # Build query focusing on past performance
    if key_terms:
        terms_str = ' '.join(key_terms[:5])  # Limit to top 5 terms
        query = f"past projects results achievements {terms_str} performance outcomes metrics"
    else:
        # Generic performance query
        query = "past project results achievements performance outcomes client success metrics"
    
    return query

async def get_past_performance_context(job_description: str) -> str:
    """Retrieve relevant past performance and project details from RAG"""
    try:
        # Build targeted query for past performance
        performance_query = build_performance_query(job_description)
        
        tools = get_rag_tools()
        
        system_instruction = """You are retrieving specific past performance data. Focus on:
- Concrete project examples with specific outcomes
- Quantifiable results and metrics (percentages, dollar amounts, timeframes)
- Client types and industries worked with
- Specific methodologies and approaches used
- Team sizes and project scope
- Challenges overcome and solutions implemented
- Before/after comparisons and improvements achieved

Provide detailed, specific examples that demonstrate proven track record and credibility."""
        
        model = GenerativeModel(
            GEMINI_MODEL,
            tools=tools,
            system_instruction=system_instruction
        )
        
        response = model.generate_content(
            [performance_query],
            generation_config={
                "max_output_tokens": 2048,
                "temperature": 0.1,  # Very low for factual retrieval
                "top_p": 0.9,
                "candidate_count": 1,
            },
            safety_settings=get_safety_settings(),
        )
        
        if response.text:
            # Clean response - remove citations but keep content
            cleaned = response.text.strip()
            cleaned = re.sub(r'\[\d+\]', '', cleaned)  # Remove citation numbers
            cleaned = re.sub(r'\(\d+\)', '', cleaned)  # Remove parenthetical numbers
            return cleaned
        else:
            return ""
            
    except Exception as e:
        logger.error(f"Error retrieving past performance: {e}")
        return ""

async def generate_performance_based_pitch(job_description: str, max_characters: int = 2000) -> tuple[str, bool]:
    """Generate pitch with specific past performance examples"""
    
    # Get relevant past performance
    past_performance = await get_past_performance_context(job_description)
    used_rag = bool(past_performance.strip())
    
    if used_rag:
        # Performance-focused prompt with actual past work
        prompt = f"""You are creating a professional consulting pitch response to: "Please provide a short pitch detailing why you're interested in this project and the specific relevant skills & experience you would bring to it."

**Job Description/Opportunity:**
{job_description}

**Your Past Performance & Project History:**
{past_performance}

**CRITICAL INSTRUCTIONS:**
Create a compelling pitch that heavily references YOUR ACTUAL PAST WORK from the performance data above. Structure it as:

1. **Opening Interest** (2-3 sentences): Show genuine enthusiasm for this specific opportunity

2. **Past Performance Examples** (Main section - 60% of response): 
   - Reference specific past projects that relate to this opportunity
   - Include actual metrics, results, and outcomes from your work
   - Use phrases like: "In my previous work with [type of client]..." or "When I led a similar project..."
   - Mention specific improvements, cost savings, efficiency gains, etc.
   - Reference industries, client types, and project scales from your experience

3. **Relevant Skills Demonstrated** (20% of response): Connect the skills shown in past projects to current needs

4. **Approach** (15% of response): Briefly outline how you'd tackle this based on past success

5. **Confident Close** (5% of response): Strong finish referencing your track record

**STYLE REQUIREMENTS:**
- Write in first person ("I", "my experience")
- Include specific numbers, percentages, timeframes from past work
- Reference actual client types and industries you've worked with
- Make it clear these are YOUR actual past projects and results
- Be confident but professional
- Maximum {max_characters} characters

**EXAMPLE PHRASES TO USE:**
- "In my recent project with a Fortune 500 [industry] company, I achieved..."
- "Having led similar initiatives that resulted in..."
- "My experience includes delivering..."
- "In one particularly relevant project, I..."

Focus on making your past performance the hero of this pitch."""

    else:
        # Fallback prompt when no performance data found
        prompt = f"""You are creating a professional consulting pitch for this opportunity: {job_description}

Since specific past performance data wasn't available, create a compelling pitch that:
1. Shows genuine interest in the opportunity
2. Highlights relevant consulting experience and capabilities
3. Demonstrates understanding of the challenges
4. Outlines a clear approach
5. Expresses confidence in delivering results

Maximum {max_characters} characters. Write in first person and maintain a professional consulting tone."""

    try:
        model = GenerativeModel(GEMINI_MODEL)
        
        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": max_characters * 2,
                "temperature": 0.4,  # Balanced for engaging but accurate content
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
            
            # Ensure it fits within character limit
            final_response = truncate_response(cleaned_response, max_chars=max_characters)
            return final_response, used_rag
        else:
            raise Exception("No response generated from Gemini")
            
    except Exception as e:
        logger.error(f"Error generating performance-based pitch: {e}")
        return "Error generating pitch, please try again.", False

async def generate_custom_response_with_performance(question: str, max_words: int = 500) -> tuple[str, bool]:
    """Generate custom response incorporating past performance"""
    
    # Get relevant performance context
    performance_query = f"past experience projects results related to: {question}"
    past_performance = await get_past_performance_context(performance_query)
    used_rag = bool(past_performance.strip())
    
    if used_rag:
        prompt = f"""You are answering a consulting question using your actual past experience and performance.

**Question:** {question}

**Your Relevant Past Performance:**
{past_performance}

Provide a comprehensive response that:
1. **Draws heavily from your actual past work** shown above
2. **Includes specific examples, metrics, and outcomes** from your experience
3. **References similar situations** you've handled before
4. **Provides actionable insights** based on proven results
5. **Demonstrates expertise** through concrete past performance

Use phrases like:
- "In my experience working with..."
- "I've seen this challenge before when..."
- "Based on my work with [client type]..."
- "In a similar situation, I achieved..."

Write in first person, reference your actual past work, and be specific about results and outcomes.
Maximum {max_words} words."""
    
    else:
        prompt = f"""Answer this consulting question with professional expertise: {question}

Provide a comprehensive response demonstrating consulting knowledge and practical insights.
Maximum {max_words} words."""

    try:
        model = GenerativeModel(GEMINI_MODEL)
        
        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": max_words * 3,
                "temperature": 0.3,
                "top_p": 0.9,
                "candidate_count": 1,
            },
            safety_settings=get_safety_settings()
        )
        
        if response.text:
            cleaned_response = response.text.strip()
            cleaned_response = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned_response)
            cleaned_response = re.sub(r'\*(.*?)\*', r'\1', cleaned_response)
            cleaned_response = re.sub(r'#{1,6}\s', '', cleaned_response)
            
            final_response = truncate_response(cleaned_response, max_words=max_words)
            return final_response, used_rag
        else:
            raise Exception("No response generated from Gemini")
            
    except Exception as e:
        logger.error(f"Error generating custom response: {e}")
        return "Unable to generate response. Please provide more specific information.", False

@router.post("/generate-pitch", response_model=PitchResponse)
async def generate_pitch(request: PitchRequest):
    """Generate a performance-based consulting pitch"""
    start_time = asyncio.get_event_loop().time()
    
    try:
        logger.info(f"Generating performance-based pitch for: {request.job_description[:100]}...")
        
        # Generate the pitch with past performance
        response_text, used_rag = await generate_performance_based_pitch(
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
        
        logger.info(f"Generated pitch in {generation_time_ms}ms, {len(response_text)} characters, used past performance: {used_rag}")
        return pitch_response
        
    except Exception as e:
        logger.error(f"Error generating pitch: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate pitch: {str(e)}"
        )

@router.post("/generate-custom", response_model=PitchResponse)
async def generate_custom(request: CustomQuestionRequest):
    """Generate a custom response with past performance"""
    start_time = asyncio.get_event_loop().time()
    
    try:
        logger.info(f"Generating custom response for: {request.question[:100]}...")
        
        # Generate the custom response with performance
        response_text, used_rag = await generate_custom_response_with_performance(
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
        
        logger.info(f"Generated custom response in {generation_time_ms}ms, {count_words(response_text)} words, used past performance: {used_rag}")
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
            "description": "Performance-based consulting pitch using actual past work",
            "max_characters": 2000,
            "features": [
                "References specific past projects and results",
                "Includes actual metrics and outcomes",
                "Uses real client examples and industries",
                "Demonstrates proven track record",
                "Connects past performance to current opportunity"
            ],
            "structure": [
                "Opening with genuine interest (10%)",
                "Past performance examples (60%)",
                "Relevant skills demonstrated (20%)",
                "Approach outline (10%)"
            ]
        },
        "performance_focus": {
            "description": "How past performance is integrated",
            "rag_queries": [
                "Specific project outcomes and metrics",
                "Client types and industries worked with", 
                "Methodologies and approaches used",
                "Challenges overcome and solutions",
                "Team leadership and project scope"
            ],
            "example_phrases": [
                "In my previous work with a Fortune 500 [industry] company, I achieved...",
                "Having led similar initiatives that resulted in...",
                "My experience includes delivering...",
                "In one particularly relevant project, I..."
            ]
        }
    })

@router.get("/status")
async def get_status():
    """Get status of the performance-based pitch service"""
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
            "service": "performance-based-pitch-generator",
            "model": GEMINI_MODEL,
            "features": [
                "past_performance_integration",
                "specific_project_references", 
                "metrics_and_outcomes_focus",
                "targeted_performance_queries",
                "credibility_enhancement"
            ],
            "gemini_connection": "connected",
            "rag_connection": rag_status,
            "endpoints": [
                "/generate-pitch",
                "/generate-custom", 
                "/pitch-templates",
                "/status"
            ],
            "last_updated": "2025-06-21"
        })
        
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "service": "performance-based-pitch-generator",
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
        "service": "performance-based-pitch-generator"
    })