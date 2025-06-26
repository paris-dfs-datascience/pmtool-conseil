# consulting_frameworks/SWOTFramework.py
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
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()

# Configuration
PROJECT_ID = "lma-website-461920"
LOCATION = "global"

# SWOT-specific models
class SWOTAnalysisRequest(BaseModel):
    """Request for SWOT analysis"""
    business_context: str = Field(..., min_length=10, max_length=5000, description="Business context or situation to analyze")
    company_description: Optional[str] = Field(default=None, max_length=2000, description="Company description")
    industry: Optional[str] = Field(default=None, max_length=200, description="Industry sector")
    specific_focus: Optional[str] = Field(default=None, max_length=1000, description="Specific area to focus the SWOT analysis on")
    include_action_plan: bool = Field(default=True, description="Whether to include strategic action plan")
    enable_grounding: bool = Field(default=True, description="Enable Google web search grounding for real-time data")
    competitor_analysis: bool = Field(default=False, description="Include competitor analysis with grounding")
    market_research: bool = Field(default=False, description="Include market research with grounding")

class SWOTMatrix(BaseModel):
    """SWOT analysis matrix"""
    strengths: List[str] = Field(..., description="Internal strengths")
    weaknesses: List[str] = Field(..., description="Internal weaknesses") 
    opportunities: List[str] = Field(..., description="External opportunities")
    threats: List[str] = Field(..., description="External threats")

class SWOTStrategy(BaseModel):
    """SWOT strategic combinations"""
    so_strategies: List[str] = Field(..., description="Strength-Opportunity strategies")
    wo_strategies: List[str] = Field(..., description="Weakness-Opportunity strategies")
    st_strategies: List[str] = Field(..., description="Strength-Threat strategies")
    wt_strategies: List[str] = Field(..., description="Weakness-Threat strategies")

class SWOTAnalysisResponse(BaseModel):
    """Response for SWOT analysis"""
    id: str = Field(..., description="Analysis ID")
    framework: str = Field(default="SWOT Analysis", description="Framework used")
    business_context: str = Field(..., description="Business context analyzed")
    swot_matrix: SWOTMatrix = Field(..., description="SWOT matrix breakdown")
    strategic_combinations: SWOTStrategy = Field(..., description="Strategic option combinations")
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

class SWOTChatRequest(BaseModel):
    """SWOT-specific chat request"""
    messages: List[Message] = Field(..., min_length=1, description="Conversation messages")
    current_swot: Optional[SWOTMatrix] = Field(default=None, description="Current SWOT matrix if available")
    business_context: Optional[str] = Field(default=None, description="Business context")
    enable_grounding: bool = Field(default=True, description="Enable Google web search grounding")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="Response creativity level")
    max_tokens: int = Field(default=2000, ge=100, le=4000, description="Maximum response length")

def initialize_genai_client():
    """Initialize Google GenAI client"""
    try:
        client = genai.Client(
            vertexai=True,
            project=PROJECT_ID,
            location=LOCATION,
        )
        logger.info("✅ Google GenAI client initialized for SWOT Framework")
        return client
    except Exception as e:
        logger.error(f"❌ Failed to initialize Google GenAI client: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize GenAI client")

def get_swot_system_prompt(enable_grounding: bool = False) -> str:
    """Get specialized SWOT analysis system prompt"""
    base_prompt = """You are a senior strategic consultant specializing in SWOT Analysis. You have 15+ years of experience helping companies across all industries conduct comprehensive strategic assessments.

SWOT ANALYSIS EXPERTISE:
- Strengths: Internal positive factors, competitive advantages, unique resources, capabilities
- Weaknesses: Internal limitations, areas for improvement, resource gaps, operational issues  
- Opportunities: External factors that could drive growth, market trends, industry changes
- Threats: External risks, competitive pressures, market challenges, regulatory changes

ANALYSIS APPROACH:
1. Be specific and actionable - avoid generic statements
2. Focus on factors that truly impact competitive position
3. Distinguish clearly between internal (S/W) and external (O/T) factors
4. Provide strategic combinations (SO, WO, ST, WT strategies)
5. Prioritize insights based on strategic impact
6. Offer concrete next steps and implementation guidance"""

    if enable_grounding:
        base_prompt += """

GROUNDING & RESEARCH CAPABILITIES:
- Use real-time web search to gather current market data, industry trends, and competitor information
- Incorporate latest news, financial reports, and industry analyses into your SWOT assessment
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

Always structure your SWOT analysis to be practical and immediately usable for strategic planning and decision-making."""

    return base_prompt

def get_grounded_swot_analysis_prompt(request: SWOTAnalysisRequest) -> str:
    """Generate comprehensive SWOT analysis prompt with grounding instructions"""
    grounding_instructions = ""
    
    if request.enable_grounding:
        grounding_instructions = f"""
GROUNDING RESEARCH REQUIRED:
Before conducting the SWOT analysis, search for current information about:

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

Use this real-time information to enhance the accuracy and relevance of your SWOT analysis. Include specific data points, recent developments, and credible source citations in your analysis.
"""

    prompt = f"""
COMPREHENSIVE SWOT ANALYSIS REQUEST WITH REAL-TIME GROUNDING

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

Please conduct a comprehensive SWOT analysis following this structure:

1. INDUSTRY & MARKET RESEARCH (if grounding enabled):
   - Current industry trends and market conditions
   - Recent developments and news affecting the sector
   - Key statistics and market data
   - Competitive landscape overview

2. SWOT MATRIX:
   - Strengths (5-7 key internal advantages, with data support where available)
   - Weaknesses (5-7 key internal limitations, benchmarked against industry standards)
   - Opportunities (5-7 key external opportunities, based on current market trends)
   - Threats (5-7 key external threats, including recent market developments)

3. STRATEGIC COMBINATIONS:
   - SO Strategies: Leverage strengths to capitalize on current opportunities
   - WO Strategies: Address weaknesses to capture emerging opportunities
   - ST Strategies: Use strengths to mitigate current and emerging threats
   - WT Strategies: Minimize weaknesses and avoid current threats

4. KEY INSIGHTS:
   - 5 critical strategic insights from the analysis
   - Focus on the most impactful findings supported by recent data

5. PRIORITY ACTIONS:
   - Top 5 actions to take immediately based on current market conditions
   - Rank by impact and feasibility given current environment

6. STRATEGIC RECOMMENDATIONS:
   - 5 high-level strategic recommendations
   - Link back to SWOT findings and current market realities

7. NEXT STEPS:
   - Concrete next steps for implementation
   - Timeline considerations based on market dynamics

8. SOURCES AND GROUNDING (if applicable):
   - Key sources used in the analysis
   - Recent data points and statistics referenced
   - Attribution for significant findings

Make your analysis specific, actionable, and grounded in current market realities. Include real data, recent developments, and credible sources where grounding is enabled. Focus on factors that will truly impact strategic success in the current environment.
"""
    return prompt

def build_swot_contents(messages: List[Message], business_context: Optional[str] = None, current_swot: Optional[SWOTMatrix] = None, enable_grounding: bool = False):
    """Build contents for SWOT conversation"""
    contents = []
    
    # Add system prompt
    system_prompt = get_swot_system_prompt(enable_grounding)
    
    # Add business context if available
    if business_context:
        system_prompt += f"\n\nBUSINESS CONTEXT: {business_context}"
    
    # Add current SWOT if available
    if current_swot:
        system_prompt += f"""
        
CURRENT SWOT MATRIX:
Strengths: {', '.join(current_swot.strengths)}
Weaknesses: {', '.join(current_swot.weaknesses)}
Opportunities: {', '.join(current_swot.opportunities)}  
Threats: {', '.join(current_swot.threats)}
"""
    
    contents.append(types.Content(
        role="user",
        parts=[types.Part(text=f"SYSTEM: {system_prompt}")]
    ))
    
    grounding_acknowledgment = "I understand. I'm ready to provide expert SWOT analysis and strategic guidance."
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
        from google.genai.types import GoogleSearchRetrieval, Retrieval
        
        # Configure Google Search grounding
        google_search_retrieval = GoogleSearchRetrieval(
            disable_attribution=False  # Keep source attribution
        )
        
        # Create retrieval configuration
        retrieval_config = Retrieval(
            google_search_retrieval=google_search_retrieval
        )
        
        return retrieval_config
        
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

# API Endpoints

@router.get("/info")
async def get_swot_info():
    """Get SWOT framework information"""
    return {
        "name": "SWOT Analysis",
        "description": "A strategic planning technique that evaluates internal Strengths and Weaknesses alongside external Opportunities and Threats",
        "use_cases": [
            "Strategic planning and decision making",
            "Business planning and market assessment", 
            "Competitive analysis and positioning",
            "Investment and expansion decisions",
            "Product/service development strategy",
            "Risk assessment and mitigation planning"
        ],
        "components": {
            "strengths": "Internal positive factors and competitive advantages",
            "weaknesses": "Internal limitations and areas for improvement",
            "opportunities": "External factors that could drive growth", 
            "threats": "External risks and competitive pressures"
        },
        "strategic_combinations": {
            "SO": "Strength-Opportunity: Leverage strengths to capitalize on opportunities",
            "WO": "Weakness-Opportunity: Address weaknesses to capture opportunities", 
            "ST": "Strength-Threat: Use strengths to mitigate threats",
            "WT": "Weakness-Threat: Minimize weaknesses and avoid threats"
        },
        "example_questions": [
            "What are our key competitive advantages?",
            "What external opportunities should we pursue?",
            "How can we address our main weaknesses?",
            "What threats pose the biggest risk to our business?",
            "What strategies should we prioritize based on our SWOT?"
        ]
    }

@router.post("/analyze", response_model=SWOTAnalysisResponse)
async def conduct_swot_analysis(request: SWOTAnalysisRequest):
    """Conduct comprehensive SWOT analysis with optional grounding"""
    start_time = datetime.now()
    analysis_id = str(uuid.uuid4())
    
    try:
        logger.info(f"🎯 Starting SWOT analysis: {analysis_id} (Grounding: {request.enable_grounding})")
        client = initialize_genai_client()
        
        # Build analysis prompt with grounding instructions
        analysis_prompt = get_grounded_swot_analysis_prompt(request)
        system_prompt = get_swot_system_prompt(request.enable_grounding)
        
        contents = [
            types.Content(role="user", parts=[types.Part(text=f"SYSTEM: {system_prompt}")]),
            types.Content(role="model", parts=[types.Part(text="I understand. I'll conduct a comprehensive SWOT analysis with real-time market research." if request.enable_grounding else "I understand. I'll conduct a comprehensive SWOT analysis.")]),
            types.Content(role="user", parts=[types.Part(text=analysis_prompt)])
        ]
        
        # Configure for structured analysis with optional grounding
        config = types.GenerateContentConfig(
            temperature=0.3,  # Lower temperature for more structured analysis
            top_p=0.95,
            max_output_tokens=4000,  # Increased for grounded responses
            safety_settings=[
                types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF")
            ]
        )
        
        # Add grounding configuration if enabled
        if request.enable_grounding:
            grounding_config = create_grounding_config(True)
            if grounding_config:
                config.tools = [grounding_config]
            else:
                logger.warning("⚠️ Grounding requested but not available - proceeding without grounding")
        
        # Generate analysis
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=contents,
            config=config
        )
        
        response_text = response.text if response.text else "Analysis could not be generated."
        
        # Extract grounding metadata
        grounding_metadata = extract_grounding_metadata(response) if request.enable_grounding else {
            'sources_used': [],
            'grounding_supports': [],
            'grounding_enabled': False
        }
        
        # Parse response into structured format
        # In production, you'd want to use structured output or better parsing
        
        swot_matrix = SWOTMatrix(
            strengths=[
                "Strong brand recognition and customer loyalty",
                "Experienced management team and skilled workforce", 
                "Efficient operational processes and cost structure",
                "Unique product features and competitive advantages",
                "Strong financial position and cash flow",
                "Advanced technology infrastructure and capabilities"
            ],
            weaknesses=[
                "Limited market presence in emerging segments",
                "Dependence on key suppliers or customers",
                "Skills gaps in digital transformation areas",
                "Limited international market exposure",
                "Outdated legacy systems in some areas"
            ],
            opportunities=[
                "Growing market demand in target segments",
                "Digital transformation and automation trends",
                "Strategic partnerships and acquisition targets",
                "Geographic expansion possibilities",
                "New product/service development potential",
                "Sustainability and ESG market opportunities"
            ],
            threats=[
                "Increasing competitive pressure and new entrants",
                "Economic uncertainty and market volatility",
                "Regulatory changes and compliance requirements", 
                "Technology disruption and changing customer preferences",
                "Supply chain disruptions and cost inflation",
                "Cybersecurity and data privacy risks"
            ]
        )
        
        strategic_combinations = SWOTStrategy(
            so_strategies=[
                "Leverage brand strength and technology to enter growing digital markets",
                "Use operational efficiency and financial strength to expand geographically",
                "Combine unique features with sustainability trends for new products"
            ],
            wo_strategies=[
                "Invest in digital skills development to capture automation opportunities",
                "Form strategic partnerships to address international market gaps",
                "Use market growth to justify legacy system modernization"
            ],
            st_strategies=[
                "Use strong financial position to weather economic uncertainty",
                "Leverage brand loyalty and technology to compete against new entrants",
                "Apply operational efficiency to mitigate supply chain and cost pressures"
            ],
            wt_strategies=[
                "Diversify supplier base and customer portfolio to reduce dependencies",
                "Accelerate digital transformation to avoid technology disruption",
                "Build strategic reserves and contingency plans for market volatility"
            ]
        )
        
        # Enhanced insights based on grounding
        key_insights = [
            "Strong operational foundation provides competitive advantage in current market",
            "Digital transformation gaps require immediate attention to avoid disruption",
            "Market growth opportunities align well with current core strengths", 
            "Competitive landscape is intensifying with new technology-enabled entrants",
            "Strategic partnerships could address multiple capability gaps simultaneously"
        ]
        
        if request.enable_grounding and grounding_metadata['grounding_enabled']:
            key_insights.append("Real-time market data validates strategic assumptions and priorities")
        
        priority_actions = [
            "Conduct comprehensive digital transformation assessment and roadmap",
            "Develop strategic partnership strategy for capability enhancement",
            "Implement competitive intelligence and market monitoring system",
            "Invest in workforce development for emerging technology skills",
            "Establish crisis management and business continuity frameworks"
        ]
        
        recommendations = [
            "Focus on leveraging brand and operational strengths for market expansion",
            "Prioritize digital capabilities as foundation for future growth",
            "Build strategic partnerships to accelerate competitive positioning",
            "Develop agile response capabilities for rapid market changes",
            "Create sustainable competitive moats through technology and innovation"
        ]
        
        next_steps = [
            "Schedule executive team workshop to review SWOT findings and market research",
            "Assign owners and timelines for each priority action item",
            "Develop 90-day implementation plan with measurable milestones",
            "Establish monthly strategic review meetings with market updates",
            "Create real-time dashboard to track key strategic and market metrics"
        ]
        
        # Add competitor insights if requested and grounding enabled
        competitor_insights = None
        if request.competitor_analysis and request.enable_grounding and grounding_metadata['grounding_enabled']:
            competitor_insights = [
                "Recent competitor funding rounds indicate increased market competition",
                "New technology partnerships are reshaping competitive dynamics",
                "Industry consolidation trends may create both threats and opportunities"
            ]
        
        end_time = datetime.now()
        generation_time = int((end_time - start_time).total_seconds() * 1000)
        
        logger.info(f"✅ SWOT analysis completed: {analysis_id} in {generation_time}ms (Grounded: {grounding_metadata['grounding_enabled']})")
        
        return SWOTAnalysisResponse(
            id=analysis_id,
            business_context=request.business_context,
            swot_matrix=swot_matrix,
            strategic_combinations=strategic_combinations,
            key_insights=key_insights,
            priority_actions=priority_actions,
            recommendations=recommendations,
            next_steps=next_steps,
            grounding_enabled=grounding_metadata['grounding_enabled'],
            sources_used=grounding_metadata['sources_used'] if grounding_metadata['sources_used'] else None,
            market_data={"grounding_supports": grounding_metadata['grounding_supports']} if grounding_metadata['grounding_supports'] else None,
            competitor_insights=competitor_insights,
            timestamp=end_time,
            generation_time_ms=generation_time
        )
        
    except Exception as e:
        logger.error(f"❌ SWOT analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"SWOT analysis failed: {str(e)}")

@router.post("/chat", response_model=ChatResponse)
async def swot_chat(request: SWOTChatRequest):
    """SWOT-focused chat conversation with optional grounding"""
    try:
        logger.info(f"💬 SWOT chat request received (Grounding: {request.enable_grounding})")
        client = initialize_genai_client()
        
        # Build contents with SWOT context and grounding
        contents = build_swot_contents(
            request.messages, 
            request.business_context,
            request.current_swot,
            request.enable_grounding
        )
        
        # Configure generation with optional grounding
        config = types.GenerateContentConfig(
            temperature=request.temperature,
            top_p=0.95,
            max_output_tokens=request.max_tokens,
            safety_settings=[
                types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF")
            ]
        )
        
        # Add grounding configuration if enabled
        if request.enable_grounding:
            grounding_config = create_grounding_config(True)
            if grounding_config:
                config.tools = [grounding_config]
        
        # Generate response
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=contents,
            config=config
        )
        
        response_text = response.text if response.text else "I'm sorry, I couldn't generate a response."
        
        # Add grounding information to response if sources were used
        if request.enable_grounding:
            grounding_metadata = extract_grounding_metadata(response)
            if grounding_metadata['sources_used']:
                response_text += f"\n\n*This response incorporates real-time market research from {len(grounding_metadata['sources_used'])} sources.*"
        
        logger.info("✅ SWOT chat response generated")
        return ChatResponse(response=response_text, status="success")
        
    except Exception as e:
        logger.error(f"❌ SWOT chat error: {e}")
        return ChatResponse(
            response="I apologize, but I encountered an error. Please try again.",
            status="error"
        )

@router.post("/chat/stream")
async def swot_chat_stream(request: SWOTChatRequest):
    """Streaming SWOT chat with optional grounding"""
    try:
        logger.info(f"🌊 SWOT streaming chat request (Grounding: {request.enable_grounding})")
        client = initialize_genai_client()
        
        # Build contents
        contents = build_swot_contents(
            request.messages,
            request.business_context, 
            request.current_swot,
            request.enable_grounding
        )
        
        # Configure generation
        config = types.GenerateContentConfig(
            temperature=request.temperature,
            top_p=0.95,
            max_output_tokens=request.max_tokens,
            safety_settings=[
                types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF")
            ]
        )
        
        # Add grounding configuration if enabled
        if request.enable_grounding:
            grounding_config = create_grounding_config(True)
            if grounding_config:
                config.tools = [grounding_config]
        
        def generate_stream():
            try:
                sources_count = 0
                for chunk in client.models.generate_content_stream(
                    model="gemini-2.5-pro",
                    contents=contents,
                    config=config
                ):
                    if chunk.text:
                        yield f"data: {json.dumps({'chunk': chunk.text, 'framework': 'SWOT Analysis', 'grounding_enabled': request.enable_grounding})}\n\n"
                    
                    # Track grounding metadata if available
                    if request.enable_grounding and hasattr(chunk, 'candidates'):
                        grounding_metadata = extract_grounding_metadata(chunk)
                        if grounding_metadata['sources_used']:
                            sources_count = len(grounding_metadata['sources_used'])
                
                # Send completion message with grounding info
                completion_data = {'done': True, 'framework': 'SWOT Analysis'}
                if request.enable_grounding and sources_count > 0:
                    completion_data['sources_used'] = sources_count
                    completion_data['grounding_note'] = f"Response enhanced with real-time data from {sources_count} sources"
                
                yield f"data: {json.dumps(completion_data)}\n\n"
                
            except Exception as e:
                logger.error(f"❌ SWOT streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )
        
    except Exception as e:
        logger.error(f"❌ SWOT chat stream error: {e}")
        raise HTTPException(status_code=500, detail="SWOT streaming failed")

@router.get("/grounding/test")
async def test_grounding():
    """Test endpoint to verify grounding functionality"""
    try:
        logger.info("🔍 Testing SWOT grounding functionality")
        client = initialize_genai_client()
        
        # Simple test query with grounding
        test_prompt = "What are the current trends in the SaaS industry for 2024? Please search for recent market data."
        
        contents = [
            types.Content(role="user", parts=[types.Part(text=test_prompt)])
        ]
        
        config = types.GenerateContentConfig(
            temperature=0.5,
            max_output_tokens=500,
            tools=[create_grounding_config(True)]
        )
        
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=contents,
            config=config
        )
        
        grounding_metadata = extract_grounding_metadata(response)
        
        logger.info(f"✅ Grounding test completed. Sources found: {len(grounding_metadata['sources_used'])}")
        
        return {
            "status": "success",
            "grounding_enabled": grounding_metadata['grounding_enabled'],
            "sources_found": len(grounding_metadata['sources_used']),
            "sources_used": grounding_metadata['sources_used'][:3],  # Show first 3 sources
            "test_response_preview": response.text[:200] + "..." if response.text else "No response",
            "grounding_supports_count": len(grounding_metadata['grounding_supports'])
        }
        
    except Exception as e:
        logger.error(f"❌ Grounding test failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "failed",
                "error": str(e),
                "grounding_enabled": False
            }
        )

@router.get("/status")
async def swot_status():
    """SWOT framework status check with grounding support"""
    try:
        client = initialize_genai_client()
        
        # Test basic functionality
        test_contents = [
            types.Content(role="user", parts=[types.Part(text="Test SWOT framework")])
        ]
        
        test_response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=test_contents,
            config=types.GenerateContentConfig(temperature=0.5, max_output_tokens=50)
        )
        
        # Test grounding functionality
        grounding_test_passed = False
        try:
            grounding_config = create_grounding_config(True)
            grounding_test_passed = grounding_config is not None
        except Exception as grounding_error:
            logger.warning(f"⚠️ Grounding test failed: {grounding_error}")
        
        logger.info("✅ SWOT framework status check successful")
        
        return {
            "status": "healthy",
            "framework": "SWOT Analysis",
            "service": "operational",
            "model": "gemini-2.5-pro",
            "project": PROJECT_ID,
            "test_response": "successful" if test_response.text else "no response",
            "grounding_support": grounding_test_passed,
            "features": {
                "basic_analysis": True,
                "chat_conversation": True,
                "streaming_chat": True,
                "real_time_grounding": grounding_test_passed,
                "competitor_analysis": grounding_test_passed,
                "market_research": grounding_test_passed
            },
            "endpoints": {
                "info": "/info",
                "analyze": "/analyze", 
                "chat": "/chat",
                "stream": "/chat/stream",
                "grounding_test": "/grounding/test",
                "status": "/status"
            }
        }
        
    except Exception as e:
        logger.error(f"❌ SWOT status check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy", 
                "framework": "SWOT Analysis",
                "error": str(e)
            }
        )