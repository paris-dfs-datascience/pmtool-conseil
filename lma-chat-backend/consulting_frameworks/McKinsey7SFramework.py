from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from models import (
    ChatRequest, ChatResponse, Message, MessageRole,
    PitchResponse, ErrorResponse
)
from google import genai
from google.genai import types
import logging
import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from functools import lru_cache

logger = logging.getLogger(__name__)

# Debug: Confirm module is being imported
logger.info("🔧 McKinsey 7S Framework module loading...")

# Configuration
PROJECT_ID = "lma-website-461920"
LOCATION = "global"
MODEL_NAME = "gemini-2.5-pro"  # Centralized model name
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 2000

# McKinsey 7S-specific models - Define all models first
class McKinsey7SMatrix(BaseModel):
    """McKinsey 7S analysis matrix"""
    strategy: List[str] = Field(..., description="Strategic direction and goals")
    structure: List[str] = Field(..., description="Organizational structure and design")
    systems: List[str] = Field(..., description="Processes and procedures")
    style: List[str] = Field(..., description="Leadership and management style")
    staff: List[str] = Field(..., description="Human resources and skills")
    skills: List[str] = Field(..., description="Competencies and capabilities")
    shared_values: List[str] = Field(..., description="Cultural values and beliefs")

class McKinsey7SAnalysisRequest(BaseModel):
    """Request for McKinsey 7S analysis"""
    business_context: str = Field(..., min_length=10, max_length=5000, description="Business context or situation to analyze")
    company_description: Optional[str] = Field(default=None, max_length=2000, description="Company description")
    industry: Optional[str] = Field(default=None, max_length=200, description="Industry sector")
    specific_focus: Optional[str] = Field(default=None, max_length=1000, description="Specific area to focus the 7S analysis on")
    include_action_plan: bool = Field(default=True, description="Whether to include strategic action plan")
    enable_grounding: bool = Field(default=True, description="Enable Google web search grounding for real-time data")
    competitor_analysis: bool = Field(default=False, description="Include competitor analysis with grounding")
    market_research: bool = Field(default=False, description="Include market research with grounding")

class McKinsey7SAnalysisResponse(BaseModel):
    """Response for McKinsey 7S analysis"""
    id: str = Field(..., description="Analysis ID")
    framework: str = Field(default="McKinsey 7S Framework", description="Framework used")
    business_context: str = Field(..., description="Business context analyzed")
    mckinsey_7s_matrix: McKinsey7SMatrix = Field(..., description="McKinsey 7S matrix breakdown")
    key_insights: List[str] = Field(..., description="Key strategic insights")
    priority_actions: List[str] = Field(..., description="Priority actions to take")
    recommendations: List[str] = Field(..., description="Strategic recommendations")
    next_steps: List[str] = Field(..., description="Suggested next steps")
    grounding_enabled: bool = Field(default=False, description="Whether grounding was used")
    sources_used: Optional[List[str]] = Field(default=None, description="Web sources used in analysis")
    market_data: Optional[Dict[str, Any]] = Field(default=None, description="Real-time market data found")
    competitor_insights: Optional[List[str]] = Field(default=None, description="Competitor insights from grounding")
    timestamp: datetime = Field(..., description="Analysis timestamp")
    generation_time_ms: int = Field(..., description="Time taken to generate analysis")

class McKinsey7SChatRequest(BaseModel):
    """McKinsey 7S-specific chat request"""
    messages: List[Message] = Field(..., min_length=1, description="Conversation messages")
    current_7s: Optional[McKinsey7SMatrix] = Field(default=None, description="Current 7S matrix if available")
    business_context: Optional[str] = Field(default=None, description="Business context")
    enable_grounding: bool = Field(default=True, description="Enable Google web search grounding")
    temperature: float = Field(default=DEFAULT_TEMPERATURE, ge=0.0, le=1.0, description="Response creativity level")
    max_tokens: int = Field(default=DEFAULT_MAX_TOKENS, ge=100, le=4000, description="Maximum response length")

# Initialize router AFTER model definitions
router = APIRouter()

# Global GenAI client - initialized once
_genai_client = None
_grounding_tool = None  # Cache grounding tool

def get_genai_client():
    """Get or initialize the GenAI client (singleton pattern)"""
    global _genai_client
    if _genai_client is None:
        try:
            _genai_client = genai.Client(
                vertexai=True,
                project=PROJECT_ID,
                location=LOCATION,
            )
            logger.info("✅ Google GenAI client initialized for McKinsey 7S Framework")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Google GenAI client: {e}")
            raise HTTPException(status_code=500, detail="Failed to initialize GenAI client")
    return _genai_client

# McKinsey 7S-specific models (keeping your existing models)
class McKinsey7SAnalysisRequest(BaseModel):
    """Request for McKinsey 7S analysis"""
    business_context: str = Field(..., min_length=10, max_length=5000, description="Business context or situation to analyze")
    company_description: Optional[str] = Field(default=None, max_length=2000, description="Company description")
    industry: Optional[str] = Field(default=None, max_length=200, description="Industry sector")
    specific_focus: Optional[str] = Field(default=None, max_length=1000, description="Specific area to focus the 7S analysis on")
    include_action_plan: bool = Field(default=True, description="Whether to include strategic action plan")
    enable_grounding: bool = Field(default=True, description="Enable Google web search grounding for real-time data")
    competitor_analysis: bool = Field(default=False, description="Include competitor analysis with grounding")
    market_research: bool = Field(default=False, description="Include market research with grounding")

class McKinsey7SMatrix(BaseModel):
    """McKinsey 7S analysis matrix"""
    strategy: List[str] = Field(..., description="Strategic direction and goals")
    structure: List[str] = Field(..., description="Organizational structure and design")
    systems: List[str] = Field(..., description="Processes and procedures")
    style: List[str] = Field(..., description="Leadership and management style")
    staff: List[str] = Field(..., description="Human resources and skills")
    skills: List[str] = Field(..., description="Competencies and capabilities")
    shared_values: List[str] = Field(..., description="Cultural values and beliefs")

class McKinsey7SAnalysisResponse(BaseModel):
    """Response for McKinsey 7S analysis"""
    id: str = Field(..., description="Analysis ID")
    framework: str = Field(default="McKinsey 7S Framework", description="Framework used")
    business_context: str = Field(..., description="Business context analyzed")
    mckinsey_7s_matrix: McKinsey7SMatrix = Field(..., description="McKinsey 7S matrix breakdown")
    key_insights: List[str] = Field(..., description="Key strategic insights")
    priority_actions: List[str] = Field(..., description="Priority actions to take")
    recommendations: List[str] = Field(..., description="Strategic recommendations")
    next_steps: List[str] = Field(..., description="Suggested next steps")
    grounding_enabled: bool = Field(default=False, description="Whether grounding was used")
    sources_used: Optional[List[str]] = Field(default=None, description="Web sources used in analysis")
    market_data: Optional[Dict[str, Any]] = Field(default=None, description="Real-time market data found")
    competitor_insights: Optional[List[str]] = Field(default=None, description="Competitor insights from grounding")
    timestamp: datetime = Field(..., description="Analysis timestamp")
    generation_time_ms: int = Field(..., description="Time taken to generate analysis")

# Optional: Create an extended response model if you need extra fields
class McKinsey7SChatResponse(ChatResponse):
    """Extended chat response for McKinsey 7S with additional metadata"""
    conversation_id: Optional[str] = Field(default=None, description="Conversation ID")
    sources_used: Optional[List[str]] = Field(default=None, description="Web sources used if grounding enabled")
    grounding_enabled: Optional[bool] = Field(default=False, description="Whether grounding was used")

# Centralized content generation service
class ContentGenerationService:
    """Centralized service for all content generation"""
    
    def __init__(self):
        self.client = get_genai_client()
        self._grounding_tool = None
    
    @lru_cache(maxsize=1)
    def get_grounding_tool(self):
        """Get or create grounding tool (cached)"""
        if self._grounding_tool is None:
            self._grounding_tool = create_grounding_config(True)
        return self._grounding_tool
    
    def generate_content(
        self,
        contents: List[types.Content],
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        enable_grounding: bool = False,
        stream: bool = False
    ) -> Union[Any, Any]:  # Returns response or stream
        """Centralized content generation method"""
        
        # Set up tools if grounding is enabled
        tools = []
        if enable_grounding:
            grounding_tool = self.get_grounding_tool()
            if grounding_tool:
                tools.append(grounding_tool)
        
        # Create generation config with proper structure
        generation_config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            response_modalities=["TEXT"],
            tools=tools if tools else None  # Include tools in config if available
        )
        
        # Generate content (streaming or regular)
        if stream:
            return self.client.models.generate_content_stream(
                model=MODEL_NAME,
                contents=contents,
                config=generation_config
            )
        else:
            return self.client.models.generate_content(
                model=MODEL_NAME,
                contents=contents,
                config=generation_config
            )
    
    async def generate_streaming_response(
        self,
        contents: List[types.Content],
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        enable_grounding: bool = False
    ):
        """Generate streaming response with proper error handling"""
        async def stream_generator():
            try:
                stream = self.generate_content(
                    contents=contents,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    enable_grounding=enable_grounding,
                    stream=True
                )
                
                async for chunk in stream:
                    if hasattr(chunk, 'text') and chunk.text:
                        yield f"data: {json.dumps({'content': chunk.text})}\n\n"
                
                yield f"data: {json.dumps({'done': True})}\n\n"
                
            except Exception as e:
                logger.error(f"❌ Streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            stream_generator(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )

# Initialize content generation service
content_service = ContentGenerationService()

# Keep your existing helper functions
def get_mckinsey_7s_system_prompt(enable_grounding: bool = False) -> str:
    """Get specialized McKinsey 7S analysis system prompt"""
    base_prompt = """You are a senior strategic consultant specializing in McKinsey 7S Framework. You have 15+ years of experience helping companies across all industries conduct comprehensive strategic assessments.

McKINSEY 7S FRAMEWORK EXPERTISE:
- Strategy: Long-term goals and direction
- Structure: Organizational design and layout
- Systems: Processes and procedures
- Style: Leadership and management style
- Staff: Human resources and skills
- Skills: Competencies and capabilities
- Shared Values: Cultural values and beliefs

ANALYSIS APPROACH:
1. Be specific and actionable - avoid generic statements
2. Focus on factors that truly impact competitive position
3. Distinguish clearly between internal (S, S, S) and external (S, S, S) factors
4. Provide strategic combinations (SO, WO, ST, WT strategies)
5. Prioritize insights based on strategic impact
6. Offer concrete next steps and implementation guidance"""

    if enable_grounding:
        base_prompt += """

GROUNDING & RESEARCH CAPABILITIES:
- Use real-time web search to gather current market data, industry trends, and competitor information
- Incorporate latest news, financial reports, and industry analyses into your 7S assessment
- Validate assumptions with current market conditions and recent developments
- Include specific data points, statistics, and recent events in your analysis
- Reference credible sources and provide attribution for key findings
- Search for competitor activities, market trends, regulatory changes, and industry disruptions

When grounding is enabled, actively search for:
- Recent industry reports and market analysis
- Competitor news, funding, product launches, strategic moves
- Market size, growth rates, and trend data
- Regulatory changes and policy updates
- Technology trends and disruptions in the industry
- Economic factors affecting the business/industry"""

    base_prompt += """

COMMUNICATION STYLE:
- Professional and insightful
- Use business terminology appropriately
- Provide structured, organized responses
- Include specific examples and data when available
- Focus on actionable recommendations
- Cite sources when using grounded information

Always structure your 7S analysis to be practical and immediately usable for strategic planning and decision-making."""

    return base_prompt

def get_grounded_mckinsey_7s_analysis_prompt(request: McKinsey7SAnalysisRequest) -> str:
    """Generate comprehensive McKinsey 7S analysis prompt with grounding instructions"""
    grounding_instructions = ""

    if request.enable_grounding:
        grounding_instructions = f"""
GROUNDING RESEARCH REQUIRED:
Before conducting the 7S analysis, search for current information about:

1. INDUSTRY ANALYSIS:
   - Current market trends and developments in {request.industry or 'the relevant industry'}
   - Recent industry reports and market analysis
   - Industry growth rates and market size data
   - Key industry challenges and opportunities

2. COMPETITIVE LANDSCAPE:
   - Major competitors and their recent activities
   - New market entrants and disruptions
   - Competitive advantages and positioning
   - Recent competitor news, funding, or strategic moves

3. MARKET CONDITIONS:
   - Current economic factors affecting the industry
   - Regulatory changes and policy updates
   - Technology trends and disruptions
   - Consumer behavior and preference shifts

4. EXTERNAL FACTORS:
   - Economic indicators relevant to the business
   - Supply chain and operational considerations
   - Geopolitical factors affecting the market
   - Environmental and social trends

Use this real-time information to enhance the accuracy and relevance of your 7S analysis. Include specific data points, recent developments, and credible source citations in your analysis.
"""

    prompt = f"""
COMPREHENSIVE McKINSEY 7S ANALYSIS REQUEST WITH REAL-TIME GROUNDING

{grounding_instructions}

BUSINESS CONTEXT:
{request.business_context}

COMPANY DETAILS:
{request.company_description or 'Not specified'}

INDUSTRY:
{request.industry or 'Not specified'}

SPECIFIC FOCUS:
{request.specific_focus or 'General strategic analysis'}

GROUNDING ENABLED: {request.enable_grounding}
COMPETITOR ANALYSIS: {request.competitor_analysis}
MARKET RESEARCH: {request.market_research}

Please conduct a comprehensive 7S analysis following this structure:

1. INDUSTRY & MARKET RESEARCH (if grounding enabled):
   - Current industry trends and market conditions
   - Recent developments and news affecting the sector
   - Key statistics and market data
   - Competitive landscape overview

2. McKINSEY 7S MATRIX:
   - Strategy (5-7 key strategic goals and directions)
   - Structure (5-7 key organizational design elements)
   - Systems (5-7 key processes and procedures)
   - Style (5-7 key leadership and management practices)
   - Staff (5-7 key human resources and skills)
   - Skills (5-7 key competencies and capabilities)
   - Shared Values (5-7 key cultural values and beliefs)

3. KEY INSIGHTS:
   - 5 critical strategic insights from the analysis
   - Focus on the most impactful findings supported by recent data

4. PRIORITY ACTIONS:
   - Top 5 actions to take immediately based on current market conditions
   - Rank by impact and feasibility given current environment

5. STRATEGIC RECOMMENDATIONS:
   - 5 high-level strategic recommendations
   - Link back to 7S findings and current market realities

6. NEXT STEPS:
   - Concrete next steps for implementation
   - Timeline considerations based on market dynamics

7. SOURCES AND GROUNDING (if applicable):
   - Key sources used in the analysis
   - Recent data points and statistics referenced
   - Attribution for significant findings

Make your analysis specific, actionable, and grounded in current market realities. Include real data, recent developments, and credible sources where grounding is enabled. Focus on factors that will truly impact strategic success in the current environment.
"""
    return prompt

def build_mckinsey_7s_contents(messages: List[Message], business_context: Optional[str] = None, current_7s: Optional[McKinsey7SMatrix] = None, enable_grounding: bool = False):
    """Build contents for McKinsey 7S conversation"""
    contents = []

    # Add system prompt
    system_prompt = get_mckinsey_7s_system_prompt(enable_grounding)

    # Add business context if available
    if business_context:
        system_prompt += f"\n\nBUSINESS CONTEXT: {business_context}"

    # Add current 7S if available
    if current_7s:
        system_prompt += f"""

CURRENT McKINSEY 7S MATRIX:
Strategy: {', '.join(current_7s.strategy)}
Structure: {', '.join(current_7s.structure)}
Systems: {', '.join(current_7s.systems)}
Style: {', '.join(current_7s.style)}
Staff: {', '.join(current_7s.staff)}
Skills: {', '.join(current_7s.skills)}
Shared Values: {', '.join(current_7s.shared_values)}
"""

    contents.append(types.Content(
        role="user",
        parts=[types.Part(text=f"SYSTEM: {system_prompt}")]
    ))

    grounding_acknowledgment = "I understand. I'm ready to provide expert McKinsey 7S analysis and strategic guidance."
    if enable_grounding:
        grounding_acknowledgment += " I'll use real-time web search to gather current market data and industry insights to enhance my analysis."

    contents.append(types.Content(
        role="model",
        parts=[types.Part(text=grounding_acknowledgment)]
    ))

    # Add conversation messages
    for msg in messages:
        role = "user" if msg.role == MessageRole.USER else "model"
        contents.append(types.Content(
            role=role,
            parts=[types.Part(text=msg.content)]
        ))

    return contents

def create_grounding_config(enable_grounding: bool = True):
    """Create grounding configuration for GenAI"""
    if not enable_grounding:
        return None

    try:
        # Use the new API structure for Google Search
        tool = types.Tool(google_search=types.GoogleSearch())
        return tool

    except ImportError as e:
        logger.warning(f"⚠️ Grounding imports not available: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ Failed to create grounding config: {e}")
        return None

def extract_grounding_metadata(response):
    """Extract grounding metadata from response"""
    sources_used = []
    grounding_supports = []

    try:
        # Check if response has grounding metadata
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]

            # Extract grounding metadata if available
            if hasattr(candidate, 'grounding_metadata'):
                grounding_metadata = candidate.grounding_metadata

                # Extract web search queries and results
                if hasattr(grounding_metadata, 'web_search_queries'):
                    for query in grounding_metadata.web_search_queries:
                        if hasattr(query, 'search_results'):
                            for result in query.search_results:
                                if hasattr(result, 'uri'):
                                    sources_used.append(result.uri)

                # Extract grounding supports/citations
                if hasattr(grounding_metadata, 'grounding_supports'):
                    for support in grounding_metadata.grounding_supports:
                        if hasattr(support, 'segment') and hasattr(support, 'grounding_chunk_indices'):
                            grounding_supports.append({
                                'segment': support.segment,
                                'sources': support.grounding_chunk_indices
                            })
    except Exception as e:
        logger.warning(f"⚠️ Could not extract grounding metadata: {e}")

    return {
        'sources_used': sources_used,
        'grounding_supports': grounding_supports,
        'grounding_enabled': len(sources_used) > 0
    }

# Routes
@router.get("/info")
async def get_mckinsey_7s_info():
    """Get information about McKinsey 7S Framework"""
    return {
        "framework": "McKinsey 7S Framework",
        "description": "A strategic planning framework that evaluates the seven key elements of an organization",
        "elements": {
            "strategy": "Long-term goals and direction",
            "structure": "Organizational design and layout", 
            "systems": "Processes and procedures",
            "style": "Leadership and management style",
            "staff": "Human resources and skills",
            "skills": "Competencies and capabilities",
            "shared_values": "Cultural values and beliefs"
        },
        "version": "1.0.0",
        "status": "available",
        "model": MODEL_NAME,
        "capabilities": [
            "Comprehensive 7S matrix analysis",
            "Strategic recommendations",
            "Real-time market grounding",
            "Interactive chat conversations",
            "Streaming responses",
            "Competitor analysis",
            "Market research integration"
        ]
    }

@router.post("/analyze", response_model=McKinsey7SAnalysisResponse)
async def analyze_mckinsey_7s(request: McKinsey7SAnalysisRequest):
    """Conduct comprehensive McKinsey 7S analysis"""
    start_time = datetime.now()
    analysis_id = str(uuid.uuid4())
    
    try:
        # Generate analysis prompt
        prompt = get_grounded_mckinsey_7s_analysis_prompt(request)
        
        # Create contents
        contents = [types.Content(
            role="user",
            parts=[types.Part(text=prompt)]
        )]
        
        # Use centralized content generation
        response = content_service.generate_content(
            contents=contents,
            temperature=0.7,
            max_tokens=3000,
            enable_grounding=request.enable_grounding
        )
        
        # Extract grounding metadata
        grounding_metadata = extract_grounding_metadata(response)
        
        # Parse the response
        analysis_text = response.text if hasattr(response, 'text') else str(response)
        
        # For now, return a structured response - you'd parse the actual AI response
        end_time = datetime.now()
        generation_time = int((end_time - start_time).total_seconds() * 1000)
        
        # TODO: Parse the AI response into structured format
        # This is a placeholder - implement proper parsing
        return McKinsey7SAnalysisResponse(
            id=analysis_id,
            business_context=request.business_context,
            mckinsey_7s_matrix=McKinsey7SMatrix(
                strategy=["Strategic direction needs analysis"],
                structure=["Organizational structure needs analysis"],
                systems=["Process systems need analysis"],
                style=["Leadership style needs analysis"],
                staff=["Staff capabilities need analysis"],
                skills=["Core skills need analysis"],
                shared_values=["Cultural values need analysis"]
            ),
            key_insights=["Analysis completed - detailed parsing needed"],
            priority_actions=["Implement structured response parsing"],
            recommendations=["Complete the McKinsey 7S analysis implementation"],
            next_steps=["Parse AI response into structured format"],
            grounding_enabled=grounding_metadata['grounding_enabled'],
            sources_used=grounding_metadata['sources_used'],
            timestamp=end_time,
            generation_time_ms=generation_time
        )
        
    except Exception as e:
        logger.error(f"❌ McKinsey 7S analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/chat", response_model=ChatResponse)
async def chat_mckinsey_7s(request: McKinsey7SChatRequest):
    """Interactive McKinsey 7S chat conversation"""
    try:
        # Build conversation contents
        contents = build_mckinsey_7s_contents(
            messages=request.messages,
            business_context=request.business_context,
            current_7s=request.current_7s,
            enable_grounding=request.enable_grounding
        )
        
        # Use centralized content generation
        response = content_service.generate_content(
            contents=contents,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            enable_grounding=request.enable_grounding
        )
        
        # Extract response text
        response_text = response.text if hasattr(response, 'text') else str(response)
        
        # Return ChatResponse with only the required fields
        return ChatResponse(
            response=response_text,
            status="success"
        )
        
    except Exception as e:
        logger.error(f"❌ McKinsey 7S chat failed: {e}")
        # Return error response in the correct format
        return ChatResponse(
            response=f"Chat failed: {str(e)}",
            status="error"
        )

@router.post("/chat/stream")
async def stream_chat_mckinsey_7s(request: McKinsey7SChatRequest):
    """Streaming McKinsey 7S chat conversation"""
    try:
        # Build conversation contents
        contents = build_mckinsey_7s_contents(
            messages=request.messages,
            business_context=request.business_context,
            current_7s=request.current_7s,
            enable_grounding=request.enable_grounding
        )
        
        # Use centralized streaming response generation
        return await content_service.generate_streaming_response(
            contents=contents,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            enable_grounding=request.enable_grounding
        )
        
    except Exception as e:
        logger.error(f"❌ McKinsey 7S streaming failed: {e}")
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")

@router.get("/grounding/test")
async def test_mckinsey_7s_grounding():
    """Test McKinsey 7S grounding capabilities"""
    try:
        grounding_config = content_service.get_grounding_tool()
        return {
            "grounding_available": grounding_config is not None,
            "framework": "McKinsey 7S Framework",
            "model": MODEL_NAME,
            "grounding_capabilities": [
                "Real-time market data",
                "Industry trends and analysis",
                "Competitor intelligence",
                "Regulatory changes",
                "Economic indicators",
                "Technology trends"
            ] if grounding_config else []
        }
    except Exception as e:
        logger.error(f"❌ Grounding test failed: {e}")
        return {
            "grounding_available": False,
            "error": str(e)
        }

@router.get("/status")
async def mckinsey_7s_status():
    """Get McKinsey 7S framework status"""
    try:
        # Test GenAI client
        client = get_genai_client()
        genai_status = "available"
        
        # Test grounding
        grounding_config = content_service.get_grounding_tool()
        grounding_status = "available" if grounding_config else "unavailable"
        
        return {
            "framework": "McKinsey 7S Framework",
            "status": "operational",
            "model": MODEL_NAME,
            "genai_status": genai_status,
            "grounding_status": grounding_status,
            "capabilities": {
                "analysis": True,
                "chat": True,
                "streaming": True,
                "grounding": grounding_config is not None
            },
            "endpoints": [
                "/info",
                "/analyze", 
                "/chat",
                "/chat/stream",
                "/grounding/test",
                "/status"
            ]
        }
    except Exception as e:
        logger.error(f"❌ Status check failed: {e}")
        return {
            "framework": "McKinsey 7S Framework",
            "status": "error",
            "error": str(e)
        }

# Log successful module loading
logger.info("✅ McKinsey 7S Framework module loaded successfully with router")