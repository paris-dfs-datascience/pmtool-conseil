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
from vertexai.preview.generative_models import GenerativeModel, SafetySetting

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

class ErrorResponse(BaseModel):
    error: str
    status: str = "error"
    timestamp: datetime

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

async def generate_standard_pitch(job_description: str, max_characters: int = 2000) -> str:
    """Generate a standard consulting pitch response using Gemini"""
    
    # Enhanced prompt for pitch generation
    prompt = f"""You are an expert consultant from LMA (a premier consulting firm) creating a professional pitch response. You need to respond to this specific prompt: "Please provide a short pitch detailing why you're interested in this project and the specific relevant skills & experience you would bring to it."

Job Description/Opportunity:
{job_description}

Create a compelling, professional consulting pitch that:

1. **Opens with genuine interest** - Show specific enthusiasm for this particular opportunity
2. **Highlights relevant LMA experience** - Draw from LMA's consulting expertise in:
   - Strategic transformation and operational excellence
   - Process optimization and change management
   - Cross-functional team leadership
   - Digital transformation projects
   - Stakeholder alignment and management
   - Data-driven analysis and recommendations

3. **Demonstrates specific value proposition** - Connect LMA's capabilities directly to the job requirements
4. **Shows proven track record** - Include specific examples of:
   - Years of consulting experience
   - Types of clients served (Fortune 500, etc.)
   - Project outcomes and results
   - Team leadership experience
   - Industry expertise

5. **Outlines approach** - Briefly describe how you would tackle this specific project
6. **Closes with confidence** - End with a strong statement about adding value

Style Guidelines:
- Professional but conversational consulting tone
- Use "I" statements (representing LMA consultant)
- Include specific metrics and examples where appropriate
- Be concise but comprehensive
- Show both analytical and implementation skills
- Demonstrate understanding of the opportunity

Maximum length: {max_characters} characters, use as close to this as possible.

Focus on creating a response that directly addresses "why you're interested" and "what relevant skills & experience you bring" while showcasing LMA's consulting excellence."""

    try:
        model = GenerativeModel(GEMINI_MODEL)
        
        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": max_characters // 2,  # Rough token estimate
                "temperature": 0.4,  # Balanced creativity and consistency
                "top_p": 0.9,
                "candidate_count": 1,
            },
            safety_settings=get_safety_settings()
        )
        
        if response.text:
            # Clean and format the response
            cleaned_response = response.text.strip()
            
            # Remove any unwanted formatting
            cleaned_response = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned_response)  # Remove bold markdown
            cleaned_response = re.sub(r'\*(.*?)\*', r'\1', cleaned_response)  # Remove italic markdown
            cleaned_response = re.sub(r'#{1,6}\s', '', cleaned_response)  # Remove headers
            
            # Ensure it fits within character limit
            final_response = truncate_response(cleaned_response, max_chars=max_characters)
            
            return final_response
        else:
            raise Exception("No response generated from Gemini")
            
    except Exception as e:
        logger.error(f"Error generating standard pitch: {e}")
        # Fallback response
        return f"""I'm very interested in this consulting opportunity as it aligns perfectly with my expertise and LMA's core strengths.

My relevant background includes 18+ years in management consulting, with deep experience in strategic transformation, process optimization, and stakeholder management. I've successfully led cross-functional teams on digital transformation initiatives for Fortune 500 clients, consistently delivering measurable results including average efficiency gains of 25-30%.

What particularly excites me about this project is the opportunity to apply proven methodologies while addressing the specific challenges outlined. My approach would involve comprehensive stakeholder analysis, data-driven assessment of current vs. desired state, and development of an actionable roadmap with clear milestones.

I bring a unique combination of analytical rigor and practical implementation experience, ensuring recommendations are both strategically sound and operationally viable. My collaborative leadership style has consistently built strong client relationships while delivering results.

I'm confident I can add immediate value and would welcome discussing how my background specifically addresses your needs."""

async def generate_custom_response(question: str, max_words: int = 500) -> str:
    """Generate a custom response to any question using Gemini with LMA context"""
    
    prompt = f"""You are a senior consultant from LMA, a premier consulting firm specializing in strategic transformation, operational excellence, and executive advisory services. You're answering a specific question from a potential client or project opportunity.

Question: {question}

Provide a comprehensive, professional response that:

1. **Demonstrates LMA's expertise** - Show deep knowledge and consulting experience
2. **Provides actionable insights** - Give practical, implementable advice
3. **Uses consulting frameworks** - Apply structured thinking and proven methodologies
4. **Shows industry knowledge** - Reference best practices and industry standards
5. **Balances strategic and tactical** - Address both high-level strategy and implementation details

Your response should reflect:
- Senior-level consulting experience and perspective
- Familiarity with Fortune 500 client challenges
- Expertise in change management and transformation
- Strong analytical and problem-solving capabilities
- Understanding of cross-functional business operations
- Experience with stakeholder management and alignment

Style Guidelines:
- Professional consulting tone
- Clear, structured thinking
- Specific examples and frameworks where relevant
- Balanced between being comprehensive and concise
- Demonstrate thought leadership
- Show practical implementation experience

Maximum length: {max_words} words

Provide a response that showcases LMA's consulting excellence while directly addressing the question asked."""

    try:
        model = GenerativeModel(GEMINI_MODEL)
        
        response = model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": max_words * 2,  # Rough token estimate
                "temperature": 0.3,  # Slightly more conservative for custom responses
                "top_p": 0.9,
                "candidate_count": 1,
            },
            safety_settings=get_safety_settings()
        )
        
        if response.text:
            # Clean and format the response
            cleaned_response = response.text.strip()
            
            # Remove unwanted formatting
            cleaned_response = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned_response)
            cleaned_response = re.sub(r'\*(.*?)\*', r'\1', cleaned_response)
            cleaned_response = re.sub(r'#{1,6}\s', '', cleaned_response)
            
            # Ensure it fits within word limit
            final_response = truncate_response(cleaned_response, max_words=max_words)
            
            return final_response
        else:
            raise Exception("No response generated from Gemini")
            
    except Exception as e:
        logger.error(f"Error generating custom response: {e}")
        # Fallback response
        return f"""Not able to create response provide more specific information."""

@router.post("/generate-pitch", response_model=PitchResponse)
async def generate_pitch(request: PitchRequest):
    """Generate a standard consulting pitch response"""
    start_time = asyncio.get_event_loop().time()
    
    try:
        logger.info(f"Generating pitch for job description: {request.job_description[:100]}...")
        
        # Generate the pitch response
        response_text = await generate_standard_pitch(
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
            generation_time_ms=generation_time_ms
        )
        
        logger.info(f"Generated pitch in {generation_time_ms}ms, {len(response_text)} characters")
        return pitch_response
        
    except Exception as e:
        logger.error(f"Error generating pitch: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate pitch: {str(e)}"
        )

@router.post("/generate-custom", response_model=PitchResponse)
async def generate_custom(request: CustomQuestionRequest):
    """Generate a custom response to any question"""
    start_time = asyncio.get_event_loop().time()
    
    try:
        logger.info(f"Generating custom response for question: {request.question[:100]}...")
        
        # Generate the custom response
        response_text = await generate_custom_response(
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
            generation_time_ms=generation_time_ms
        )
        
        logger.info(f"Generated custom response in {generation_time_ms}ms, {count_words(response_text)} words")
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
            "description": "Standard consulting pitch for job opportunities",
            "max_characters": 2000,
            "prompt": "Please provide a short pitch detailing why you're interested in this project and the specific relevant skills & experience you would bring to it.",
            "structure": [
                "Opening with genuine interest",
                "Relevant LMA experience highlights",
                "Specific value proposition",
                "Proven track record examples",
                "Approach outline",
                "Confident closing"
            ]
        },
        "custom_question": {
            "description": "Custom response to any consulting question",
            "max_words": 500,
            "guidelines": [
                "Demonstrate LMA expertise",
                "Provide actionable insights",
                "Use consulting frameworks",
                "Show industry knowledge",
                "Balance strategic and tactical"
            ]
        },
        "lma_context": {
            "specializations": [
                "Strategic transformation",
                "Operational excellence", 
                "Digital transformation",
                "Change management",
                "Stakeholder alignment",
                "Process optimization",
                "Executive advisory"
            ],
            "experience": "8+ years management consulting with Fortune 500 clients",
            "approach": "Data-driven, collaborative, results-focused"
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
        
        return JSONResponse(content={
            "status": "healthy",
            "service": "consulting-pitch-generator",
            "model": GEMINI_MODEL,
            "features": [
                "standard_pitch_generation",
                "custom_question_responses", 
                "lma_context_awareness",
                "character_word_limits",
                "response_optimization"
            ],
            "gemini_connection": "connected",
            "endpoints": [
                "/generate-pitch",
                "/generate-custom", 
                "/pitch-templates",
                "/status"
            ],
            "last_updated": "2025-06-17"
        })
        
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "service": "consulting-pitch-generator",
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
        "service": "consulting-pitch-generator"
    })