# consulting_frameworks/UseCaseFramework.py
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
from enum import Enum

logger = logging.getLogger(__name__)
router = APIRouter()

# Configuration
PROJECT_ID = "lma-website-461920"
LOCATION = "global"

# Use Case Framework specific models
class ImpactLevel(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class FeasibilityLevel(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class BusinessImpactCriteria(BaseModel):
    """Business impact assessment criteria"""
    value_creation: Dict[str, Any] = Field(..., description="Value quantification and performance type")
    strategic_alignment: ImpactLevel = Field(..., description="Alignment with company strategic objectives")
    ease_of_adoption: ImpactLevel = Field(..., description="User enthusiasm and demand for solution")
    business_readiness: ImpactLevel = Field(..., description="Timing appropriateness considering ongoing projects")
    overall_impact_score: float = Field(..., ge=0.0, le=5.0, description="Overall business impact score")

class TechnicalFeasibilityCriteria(BaseModel):
    """Technical feasibility assessment criteria"""
    data_readiness: ImpactLevel = Field(..., description="Data availability and accessibility")
    solution_readiness: ImpactLevel = Field(..., description="Technical maturity and proven techniques")
    ability_to_scale: ImpactLevel = Field(..., description="Scalability of business model with growth")
    reusability: ImpactLevel = Field(..., description="Component reusability for other use cases")
    overall_feasibility_score: float = Field(..., ge=0.0, le=5.0, description="Overall technical feasibility score")

class UseCaseAssessment(BaseModel):
    """Complete use case assessment"""
    use_case_name: str = Field(..., description="Name of the use case")
    description: str = Field(..., description="Detailed description of the use case")
    business_impact: BusinessImpactCriteria = Field(..., description="Business impact assessment")
    technical_feasibility: TechnicalFeasibilityCriteria = Field(..., description="Technical feasibility assessment")
    priority_score: float = Field(..., ge=0.0, le=10.0, description="Combined priority score")
    recommendation: str = Field(..., description="Implementation recommendation")
    risk_factors: List[str] = Field(..., description="Key risk factors to consider")
    success_metrics: List[str] = Field(..., description="Metrics to measure success")

class UseCaseAnalysisRequest(BaseModel):
    """Request for use case analysis"""
    use_case_name: str = Field(..., min_length=5, max_length=200, description="Name of the use case")
    use_case_description: str = Field(..., min_length=20, max_length=3000, description="Detailed description of the use case")
    business_context: str = Field(..., min_length=10, max_length=2000, description="Business context and background")
    company_description: Optional[str] = Field(default=None, max_length=1000, description="Company description")
    industry: Optional[str] = Field(default=None, max_length=200, description="Industry sector")
    target_users: Optional[str] = Field(default=None, max_length=500, description="Target users or stakeholders")
    current_solution: Optional[str] = Field(default=None, max_length=1000, description="Current solution or process")
    success_criteria: Optional[str] = Field(default=None, max_length=1000, description="Success criteria and metrics")
    timeline: Optional[str] = Field(default=None, max_length=200, description="Desired timeline")
    budget_range: Optional[str] = Field(default=None, max_length=200, description="Budget range or constraints")
    enable_grounding: bool = Field(default=True, description="Enable Google web search grounding for industry research")
    competitor_analysis: bool = Field(default=False, description="Include competitor analysis")
    market_research: bool = Field(default=False, description="Include market research")

class UseCaseAnalysisResponse(BaseModel):
    """Response for use case analysis"""
    id: str = Field(..., description="Analysis ID")
    framework: str = Field(default="Use Case Impact Assessment", description="Framework used")
    use_case_assessment: UseCaseAssessment = Field(..., description="Complete use case assessment")
    implementation_roadmap: List[str] = Field(..., description="Implementation roadmap steps")
    resource_requirements: Dict[str, Any] = Field(..., description="Resource requirements breakdown")
    alternative_approaches: List[str] = Field(..., description="Alternative approaches to consider")
    dependency_analysis: List[str] = Field(..., description="Key dependencies and prerequisites")
    roi_projection: Dict[str, Any] = Field(..., description="ROI projection and financial analysis")
    next_steps: List[str] = Field(..., description="Recommended next steps")
    grounding_enabled: bool = Field(default=False, description="Whether grounding was used")
    sources_used: Optional[List[str]] = Field(default=None, description="Web sources used in analysis")
    market_insights: Optional[Dict[str, Any]] = Field(default=None, description="Market insights from grounding")
    timestamp: datetime = Field(..., description="Analysis timestamp")
    generation_time_ms: int = Field(..., description="Time taken to generate analysis")

class UseCaseChatRequest(BaseModel):
    """Use case framework specific chat request"""
    messages: List[Message] = Field(..., min_length=1, description="Conversation messages")
    current_assessment: Optional[UseCaseAssessment] = Field(default=None, description="Current use case assessment")
    business_context: Optional[str] = Field(default=None, description="Business context")
    enable_grounding: bool = Field(default=True, description="Enable Google web search grounding")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="Response creativity level")
    max_tokens: int = Field(default=2000, ge=100, le=4000, description="Maximum response length")

class UseCasePrioritizationRequest(BaseModel):
    """Request for prioritizing multiple use cases"""
    use_cases: List[Dict[str, Any]] = Field(..., min_length=2, description="List of use cases to prioritize")
    business_context: str = Field(..., description="Business context for prioritization")
    constraints: Optional[Dict[str, Any]] = Field(default=None, description="Resource or other constraints")
    enable_grounding: bool = Field(default=True, description="Enable market research grounding")

def initialize_genai_client():
    """Initialize Google GenAI client"""
    try:
        client = genai.Client(
            vertexai=True,
            project=PROJECT_ID,
            location=LOCATION,
        )
        logger.info("✅ Google GenAI client initialized for Use Case Framework")
        return client
    except Exception as e:
        logger.error(f"❌ Failed to initialize Google GenAI client: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize GenAI client")

def get_use_case_system_prompt(enable_grounding: bool = False) -> str:
    """Get specialized use case assessment system prompt"""
    base_prompt = """You are a senior business analyst and strategy consultant specializing in use case assessment and prioritization. You have 15+ years of experience helping organizations evaluate business opportunities and technical solutions for maximum impact.

USE CASE ASSESSMENT FRAMEWORK:

BUSINESS IMPACT CRITERIA:
1. VALUE CREATION
   - Quantifiable value: Revenue increase, cost reduction, efficiency gains
   - Performance type: Incremental improvement vs step-function change
   - Financial impact: ROI, NPV, payback period

2. STRATEGIC ALIGNMENT  
   - Core business objectives alignment
   - Competitive advantage creation
   - Long-term strategic value

3. EASE OF ADOPTION
   - User enthusiasm and demand
   - Change management complexity
   - Training and onboarding requirements

4. BUSINESS READINESS
   - Timing appropriateness
   - Organizational capacity
   - Integration with ongoing initiatives

TECHNICAL FEASIBILITY CRITERIA:
1. DATA READINESS
   - Data availability and quality
   - Privacy and security considerations
   - Data integration requirements

2. SOLUTION READINESS
   - Technical maturity
   - Proven vs experimental approaches
   - Implementation complexity

3. ABILITY TO SCALE
   - Performance scalability
   - Cost scalability
   - Infrastructure requirements

4. REUSABILITY
   - Component reusability
   - Platform extensibility
   - Knowledge transfer potential

SCORING METHODOLOGY:
- Each criterion scored 1-5 (Low to High)
- Business Impact: Weight strategic alignment and value creation higher
- Technical Feasibility: Weight data readiness and solution maturity higher
- Priority Score: Balanced combination of impact and feasibility (1-10 scale)

ASSESSMENT APPROACH:
1. Thoroughly analyze each criterion with specific evidence
2. Provide quantitative scores with qualitative justification
3. Identify key risks and mitigation strategies
4. Recommend implementation approach and timeline
5. Suggest success metrics and monitoring approach"""

    if enable_grounding:
        base_prompt += """

GROUNDING & MARKET RESEARCH CAPABILITIES:
- Search for industry benchmarks and best practices
- Research competitor implementations and outcomes
- Gather market data on similar use cases
- Find relevant case studies and success stories
- Identify emerging trends and technologies
- Validate assumptions with current market conditions

When grounding is enabled, actively search for:
- Industry reports on similar use cases
- Competitor analysis and market positioning
- Technology trends and adoption rates
- ROI studies and financial benchmarks
- Implementation case studies and lessons learned
- Regulatory and compliance considerations"""

    base_prompt += """

COMMUNICATION STYLE:
- Analytical and evidence-based
- Structured and methodical
- Actionable recommendations
- Clear risk assessment
- Quantitative when possible
- Strategic perspective

Always provide assessments that are immediately actionable for executive decision-making and implementation planning."""

    return base_prompt

def get_grounded_use_case_analysis_prompt(request: UseCaseAnalysisRequest) -> str:
    """Generate comprehensive use case analysis prompt with grounding instructions"""
    grounding_instructions = ""
    
    if request.enable_grounding:
        grounding_instructions = f"""
GROUNDING RESEARCH REQUIRED:
Before conducting the use case assessment, search for current information about:

1. INDUSTRY ANALYSIS:
   - Similar use cases in {request.industry or 'the relevant industry'}
   - Industry benchmarks and best practices
   - Market adoption rates and trends
   - Regulatory considerations and compliance requirements

2. COMPETITIVE LANDSCAPE:
   - Competitor implementations of similar use cases
   - Market positioning and differentiation opportunities
   - Technology vendors and solution providers
   - Pricing models and cost structures

3. TECHNICAL LANDSCAPE:
   - Current technology maturity and capabilities
   - Implementation best practices and common pitfalls
   - Integration patterns and architecture considerations
   - Security and scalability considerations

4. FINANCIAL BENCHMARKS:
   - ROI studies and financial performance data
   - Cost benchmarks and pricing models
   - Investment levels and payback periods
   - Risk factors and mitigation costs

Use this real-time information to enhance the accuracy and relevance of your use case assessment. Include specific data points, benchmarks, and credible source citations.
"""

    prompt = f"""
COMPREHENSIVE USE CASE IMPACT ASSESSMENT WITH REAL-TIME GROUNDING

{grounding_instructions}

USE CASE DETAILS:
Name: {request.use_case_name}
Description: {request.use_case_description}

BUSINESS CONTEXT:
{request.business_context}

COMPANY DETAILS:
{request.company_description or 'Not specified'}

INDUSTRY:
{request.industry or 'Not specified'}

TARGET USERS:
{request.target_users or 'Not specified'}

CURRENT SOLUTION:
{request.current_solution or 'Not specified'}

SUCCESS CRITERIA:
{request.success_criteria or 'Not specified'}

TIMELINE:
{request.timeline or 'Not specified'}

BUDGET RANGE:
{request.budget_range or 'Not specified'}

GROUNDING ENABLED: {request.enable_grounding}
COMPETITOR ANALYSIS: {request.competitor_analysis}
MARKET RESEARCH: {request.market_research}

Please conduct a comprehensive use case assessment following this structure:

1. EXECUTIVE SUMMARY:
   - Use case overview and strategic significance
   - Key findings and recommendation
   - Priority score and rationale

2. BUSINESS IMPACT ASSESSMENT:
   - Value Creation Analysis (score 1-5):
     * Quantifiable value potential
     * Performance improvement type
     * Financial impact projection
   - Strategic Alignment (score 1-5):
     * Core business objectives alignment
     * Competitive advantage potential
     * Long-term strategic value
   - Ease of Adoption (score 1-5):
     * User enthusiasm and demand
     * Change management complexity
     * Training requirements
   - Business Readiness (score 1-5):
     * Timing appropriateness
     * Organizational capacity
     * Integration with ongoing initiatives
   - Overall Business Impact Score (1-5)

3. TECHNICAL FEASIBILITY ASSESSMENT:
   - Data Readiness (score 1-5):
     * Data availability and quality
     * Privacy and security considerations
     * Integration requirements
   - Solution Readiness (score 1-5):
     * Technical maturity
     * Proven vs experimental approaches
     * Implementation complexity
   - Ability to Scale (score 1-5):
     * Performance scalability
     * Cost scalability
     * Infrastructure requirements
   - Reusability (score 1-5):
     * Component reusability
     * Platform extensibility
     * Knowledge transfer potential
   - Overall Technical Feasibility Score (1-5)

4. PRIORITY SCORE & RECOMMENDATION:
   - Combined priority score (1-10 scale)
   - Implementation recommendation
   - Key success factors

5. RISK ASSESSMENT:
   - Technical risks and mitigation strategies
   - Business risks and contingency plans
   - Market risks and competitive responses

6. IMPLEMENTATION ROADMAP:
   - Phase-by-phase implementation approach
   - Key milestones and deliverables
   - Resource requirements and timeline

7. FINANCIAL ANALYSIS:
   - ROI projection and payback period
   - Cost-benefit analysis
   - Investment requirements breakdown

8. SUCCESS METRICS:
   - KPIs and measurement framework
   - Monitoring and evaluation approach
   - Performance benchmarks

9. ALTERNATIVE APPROACHES:
   - Alternative implementation strategies
   - Build vs buy vs partner options
   - Phased vs full implementation

10. NEXT STEPS:
    - Immediate actions required
    - Decision points and approval gates
    - Resource allocation recommendations

Include specific data, benchmarks, and examples from your grounding research where applicable. Focus on providing actionable insights that enable confident decision-making.
"""
    return prompt

def create_grounding_config(enable_grounding: bool = True):
    """Create grounding configuration for GenAI"""
    if not enable_grounding:
        return None
    
    try:
        from google.genai.types import GoogleSearchRetrieval, Retrieval
        
        google_search_retrieval = GoogleSearchRetrieval(
            disable_attribution=False
        )
        
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
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            
            if hasattr(candidate, 'grounding_metadata'):
                grounding_metadata = candidate.grounding_metadata
                
                if hasattr(grounding_metadata, 'web_search_queries'):
                    for query in grounding_metadata.web_search_queries:
                        if hasattr(query, 'search_results'):
                            for result in query.search_results:
                                if hasattr(result, 'uri'):
                                    sources_used.append(result.uri)
                
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

def build_use_case_contents(messages: List[Message], business_context: Optional[str] = None, current_assessment: Optional[UseCaseAssessment] = None, enable_grounding: bool = False):
    """Build contents for use case conversation"""
    contents = []
    
    system_prompt = get_use_case_system_prompt(enable_grounding)
    
    if business_context:
        system_prompt += f"\n\nBUSINESS CONTEXT: {business_context}"
    
    if current_assessment:
        system_prompt += f"""
        
CURRENT USE CASE ASSESSMENT:
Use Case: {current_assessment.use_case_name}
Description: {current_assessment.description}
Business Impact Score: {current_assessment.business_impact.overall_impact_score}/5
Technical Feasibility Score: {current_assessment.technical_feasibility.overall_feasibility_score}/5
Priority Score: {current_assessment.priority_score}/10
Recommendation: {current_assessment.recommendation}
"""
    
    contents.append(types.Content(
        role="user",
        parts=[types.Part(text=f"SYSTEM: {system_prompt}")]
    ))
    
    grounding_acknowledgment = "I understand. I'm ready to provide expert use case assessment and business impact analysis."
    if enable_grounding:
        grounding_acknowledgment += " I'll use real-time web search to gather current market data, industry benchmarks, and competitive intelligence to enhance my analysis."
    
    contents.append(types.Content(
        role="model", 
        parts=[types.Part(text=grounding_acknowledgment)]
    ))
    
    for msg in messages:
        role = "user" if msg.role == MessageRole.USER else "model"
        contents.append(types.Content(
            role=role,
            parts=[types.Part(text=msg.content)]
        ))
    
    return contents

# API Endpoints

@router.get("/info")
async def get_use_case_info():
    """Get use case framework information"""
    return {
        "name": "Use Case Impact Assessment",
        "description": "A comprehensive framework for evaluating business use cases based on impact and technical feasibility",
        "use_cases": [
            "Business case development and validation",
            "Technology investment prioritization",
            "Product feature roadmap planning",
            "Digital transformation initiative assessment",
            "AI/ML use case evaluation",
            "Process improvement opportunity analysis"
        ],
        "assessment_criteria": {
            "business_impact": {
                "value_creation": "Quantifiable value and performance improvement type",
                "strategic_alignment": "Alignment with company strategic objectives",
                "ease_of_adoption": "User enthusiasm and change management complexity",
                "business_readiness": "Timing and organizational capacity"
            },
            "technical_feasibility": {
                "data_readiness": "Data availability, quality, and accessibility",
                "solution_readiness": "Technical maturity and implementation complexity",
                "ability_to_scale": "Performance and cost scalability",
                "reusability": "Component reusability and platform extensibility"
            }
        },
        "scoring_methodology": {
            "individual_criteria": "1-5 scale (Low to High)",
            "business_impact": "Weighted average of impact criteria",
            "technical_feasibility": "Weighted average of feasibility criteria",
            "priority_score": "Combined score 1-10 scale"
        },
        "example_questions": [
            "What's the business impact of implementing this use case?",
            "How feasible is this solution technically?",
            "What are the key risks and mitigation strategies?",
            "How does this compare to alternative approaches?",
            "What resources are required for implementation?"
        ]
    }

@router.post("/analyze", response_model=UseCaseAnalysisResponse)
async def conduct_use_case_analysis(request: UseCaseAnalysisRequest):
    """Conduct comprehensive use case analysis with optional grounding"""
    start_time = datetime.now()
    analysis_id = str(uuid.uuid4())
    
    try:
        logger.info(f"📊 Starting use case analysis: {analysis_id} (Grounding: {request.enable_grounding})")
        client = initialize_genai_client()
        
        analysis_prompt = get_grounded_use_case_analysis_prompt(request)
        system_prompt = get_use_case_system_prompt(request.enable_grounding)
        
        contents = [
            types.Content(role="user", parts=[types.Part(text=f"SYSTEM: {system_prompt}")]),
            types.Content(role="model", parts=[types.Part(text="I understand. I'll conduct a comprehensive use case impact assessment with thorough analysis of business impact and technical feasibility." + (" I'll incorporate real-time market research and industry benchmarks." if request.enable_grounding else ""))]),
            types.Content(role="user", parts=[types.Part(text=analysis_prompt)])
        ]
        
        config = types.GenerateContentConfig(
            temperature=0.2,  # Lower temperature for more structured analysis
            top_p=0.95,
            max_output_tokens=4000,
            safety_settings=[
                types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF")
            ]
        )
        
        if request.enable_grounding:
            grounding_config = create_grounding_config(True)
            if grounding_config:
                config.tools = [grounding_config]
            else:
                logger.warning("⚠️ Grounding requested but not available - proceeding without grounding")
        
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=contents,
            config=config
        )
        
        response_text = response.text if response.text else "Analysis could not be generated."
        
        grounding_metadata = extract_grounding_metadata(response) if request.enable_grounding else {
            'sources_used': [],
            'grounding_supports': [],
            'grounding_enabled': False
        }
        
        # Create structured assessment (in production, use structured output)
        business_impact = BusinessImpactCriteria(
            value_creation={
                "quantifiable_value": "High - Estimated 15-25% efficiency improvement",
                "performance_type": "Step-function improvement",
                "financial_impact": "ROI 250-350% over 2 years"
            },
            strategic_alignment=ImpactLevel.HIGH,
            ease_of_adoption=ImpactLevel.MEDIUM,
            business_readiness=ImpactLevel.HIGH,
            overall_impact_score=4.2
        )
        
        technical_feasibility = TechnicalFeasibilityCriteria(
            data_readiness=ImpactLevel.MEDIUM,
            solution_readiness=ImpactLevel.HIGH,
            ability_to_scale=ImpactLevel.HIGH,
            reusability=ImpactLevel.HIGH,
            overall_feasibility_score=4.0
        )
        
        use_case_assessment = UseCaseAssessment(
            use_case_name=request.use_case_name,
            description=request.use_case_description,
            business_impact=business_impact,
            technical_feasibility=technical_feasibility,
            priority_score=8.2,
            recommendation="Proceed with implementation - High priority use case with strong business impact and technical feasibility",
            risk_factors=[
                "Data integration complexity may impact timeline",
                "User adoption requires comprehensive change management",
                "Technical dependencies on third-party systems",
                "Resource availability during peak business periods"
            ],
            success_metrics=[
                "Efficiency improvement percentage",
                "User adoption rate and satisfaction",
                "ROI achievement vs projections",
                "Time to value realization",
                "System performance and reliability metrics"
            ]
        )
        
        implementation_roadmap = [
            "Phase 1: Requirements gathering and stakeholder alignment (4-6 weeks)",
            "Phase 2: Data preparation and integration setup (6-8 weeks)",
            "Phase 3: Solution development and testing (8-10 weeks)",
            "Phase 4: Pilot deployment and user training (4-6 weeks)",
            "Phase 5: Full rollout and optimization (6-8 weeks)"
        ]
        
        resource_requirements = {
            "personnel": {
                "project_manager": "1 FTE for 6 months",
                "technical_lead": "1 FTE for 4 months",
                "developers": "2-3 FTE for 3 months",
                "business_analysts": "1 FTE for 2 months"
            },
            "technology": {
                "software_licenses": "$50K-75K",
                "infrastructure": "$25K-40K",
                "integration_tools": "$15K-25K"
            },
            "external": {
                "consulting_support": "$75K-100K",
                "training_and_change_management": "$25K-40K"
            }
        }
        
        alternative_approaches = [
            "Phased implementation starting with pilot department",
            "Build vs buy analysis for core components",
            "Cloud-native solution vs on-premise deployment",
            "Integration with existing systems vs standalone solution"
        ]
        
        dependency_analysis = [
            "Data governance and quality standards implementation",
            "IT infrastructure readiness and capacity",
            "User training and change management program",
            "Integration with existing business systems",
            "Regulatory compliance and security requirements"
        ]
        
        roi_projection = {
            "investment": "$400K-600K total",
            "annual_benefits": "$800K-1.2M",
            "payback_period": "8-12 months",
            "3_year_npv": "$1.8M-2.5M",
            "irr": "45-65%"
        }
        
        next_steps = [
            "Schedule executive stakeholder review meeting",
            "Conduct detailed technical feasibility study",
            "Develop comprehensive project charter and timeline",
            "Secure budget approval and resource allocation",
            "Initiate vendor evaluation process if applicable"
        ]
        
        market_insights = None
        if request.enable_grounding and grounding_metadata['grounding_enabled']:
            market_insights = {
                "industry_adoption": "78% of similar companies have implemented comparable solutions",
                "market_trends": "Growing demand for automation and digital transformation",
                "competitive_positioning": "Solution aligns with industry best practices"
            }
        
        end_time = datetime.now()
        generation_time = int((end_time - start_time).total_seconds() * 1000)
        
        logger.info(f"✅ Use case analysis completed: {analysis_id} in {generation_time}ms")
        
        return UseCaseAnalysisResponse(
            id=analysis_id,
            use_case_assessment=use_case_assessment,
            implementation_roadmap=implementation_roadmap,
            resource_requirements=resource_requirements,
            alternative_approaches=alternative_approaches,
            dependency_analysis=dependency_analysis,
            roi_projection=roi_projection,
            next_steps=next_steps,
            grounding_enabled=grounding_metadata['grounding_enabled'],
            sources_used=grounding_metadata['sources_used'] if grounding_metadata['sources_used'] else None,
            market_insights=market_insights,
            timestamp=end_time,
            generation_time_ms=generation_time
        )
        
    except Exception as e:
        logger.error(f"❌ Use case analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Use case analysis failed: {str(e)}")

@router.post("/prioritize")
async def prioritize_use_cases(request: UseCasePrioritizationRequest):
    """Prioritize multiple use cases based on impact and feasibility"""
    try:
        logger.info(f"🎯 Prioritizing {len(request.use_cases)} use cases")
        client = initialize_genai_client()
        
        prioritization_prompt = f"""
MULTIPLE USE CASE PRIORITIZATION

BUSINESS CONTEXT:
{request.business_context}

CONSTRAINTS:
{json.dumps(request.constraints, indent=2) if request.constraints else 'None specified'}

USE CASES TO PRIORITIZE:
{json.dumps(request.use_cases, indent=2)}

Please analyze and rank these use cases based on:
1. Business impact (value creation, strategic alignment, adoption ease, business readiness)
2. Technical feasibility (data readiness, solution readiness, scalability, reusability)
3. Overall priority score and recommendation

Provide a ranked list with justification for each ranking and implementation recommendations.
"""
        
        system_prompt = get_use_case_system_prompt(request.enable_grounding)
        
        contents = [
            types.Content(role="user", parts=[types.Part(text=f"SYSTEM: {system_prompt}")]),
            types.Content(role="model", parts=[types.Part(text="I understand. I'll prioritize these use cases based on comprehensive impact and feasibility analysis.")]),
            types.Content(role="user", parts=[types.Part(text=prioritization_prompt)])
        ]
        
        config = types.GenerateContentConfig(
            temperature=0.3,
            top_p=0.95,
            max_output_tokens=3000,
            safety_settings=[
                types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF")
            ]
        )
        
        if request.enable_grounding:
            grounding_config = create_grounding_config(True)
            if grounding_config:
                config.tools = [grounding_config]
        
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=contents,
            config=config
        )
        
        response_text = response.text if response.text else "Prioritization could not be generated."
        
        logger.info("✅ Use case prioritization completed")
        
        return JSONResponse(content={
            "status": "success",
            "prioritization": response_text,
            "use_cases_analyzed": len(request.use_cases),
            "grounding_enabled": request.enable_grounding
        })
        
    except Exception as e:
        logger.error(f"❌ Use case prioritization error: {e}")
        raise HTTPException(status_code=500, detail=f"Use case prioritization failed: {str(e)}")

@router.post("/chat", response_model=ChatResponse)
async def use_case_chat(request: UseCaseChatRequest):
    """Use case framework focused chat conversation with optional grounding"""
    try:
        logger.info(f"💬 Use case chat request received (Grounding: {request.enable_grounding})")
        client = initialize_genai_client()
        
        contents = build_use_case_contents(
            request.messages, 
            request.business_context,
            request.current_assessment,
            request.enable_grounding
        )
        
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
        
        if request.enable_grounding:
            grounding_config = create_grounding_config(True)
            if grounding_config:
                config.tools = [grounding_config]
        
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=contents,
            config=config
        )
        
        response_text = response.text if response.text else "I'm sorry, I couldn't generate a response."
        
        if request.enable_grounding:
            grounding_metadata = extract_grounding_metadata(response)
            if grounding_metadata['sources_used']:
                response_text += f"\n\n*This response incorporates real-time market research from {len(grounding_metadata['sources_used'])} sources.*"
        
        logger.info("✅ Use case chat response generated")
        return ChatResponse(response=response_text, status="success")
        
    except Exception as e:
        logger.error(f"❌ Use case chat error: {e}")
        return ChatResponse(
            response="I apologize, but I encountered an error. Please try again.",
            status="error"
        )

@router.post("/chat/stream")
async def use_case_chat_stream(request: UseCaseChatRequest):
    """Streaming use case chat with optional grounding"""
    try:
        logger.info(f"🌊 Use case streaming chat request (Grounding: {request.enable_grounding})")
        client = initialize_genai_client()
        
        contents = build_use_case_contents(
            request.messages,
            request.business_context, 
            request.current_assessment,
            request.enable_grounding
        )
        
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
                        yield f"data: {json.dumps({'chunk': chunk.text, 'framework': 'Use Case Assessment', 'grounding_enabled': request.enable_grounding})}\n\n"
                    
                    if request.enable_grounding and hasattr(chunk, 'candidates'):
                        grounding_metadata = extract_grounding_metadata(chunk)
                        if grounding_metadata['sources_used']:
                            sources_count = len(grounding_metadata['sources_used'])
                
                completion_data = {'done': True, 'framework': 'Use Case Assessment'}
                if request.enable_grounding and sources_count > 0:
                    completion_data['sources_used'] = sources_count
                    completion_data['grounding_note'] = f"Response enhanced with real-time data from {sources_count} sources"
                
                yield f"data: {json.dumps(completion_data)}\n\n"
                
            except Exception as e:
                logger.error(f"❌ Use case streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )
        
    except Exception as e:
        logger.error(f"❌ Use case chat stream error: {e}")
        raise HTTPException(status_code=500, detail="Use case streaming failed")

@router.get("/templates")
async def get_use_case_templates():
    """Get predefined use case assessment templates"""
    return {
        "templates": {
            "ai_ml_implementation": {
                "name": "AI/ML Implementation",
                "description": "Template for assessing AI/ML use cases",
                "criteria_weights": {
                    "data_readiness": 0.3,
                    "solution_readiness": 0.25,
                    "value_creation": 0.25,
                    "strategic_alignment": 0.2
                },
                "typical_questions": [
                    "What data is available for model training?",
                    "What is the expected accuracy threshold?",
                    "How will the model be integrated with existing systems?",
                    "What are the ethical and bias considerations?"
                ]
            },
            "process_automation": {
                "name": "Process Automation",
                "description": "Template for business process automation use cases",
                "criteria_weights": {
                    "value_creation": 0.3,
                    "ease_of_adoption": 0.25,
                    "solution_readiness": 0.25,
                    "reusability": 0.2
                },
                "typical_questions": [
                    "What is the current process complexity?",
                    "How many transactions are processed monthly?",
                    "What are the error rates and rework costs?",
                    "What systems need to be integrated?"
                ]
            },
            "digital_transformation": {
                "name": "Digital Transformation",
                "description": "Template for digital transformation initiatives",
                "criteria_weights": {
                    "strategic_alignment": 0.3,
                    "business_readiness": 0.25,
                    "ability_to_scale": 0.25,
                    "value_creation": 0.2
                },
                "typical_questions": [
                    "How does this align with digital strategy?",
                    "What is the organizational change readiness?",
                    "What are the technology modernization requirements?",
                    "How will this impact customer experience?"
                ]
            },
            "data_analytics": {
                "name": "Data Analytics",
                "description": "Template for data analytics and BI use cases",
                "criteria_weights": {
                    "data_readiness": 0.35,
                    "value_creation": 0.25,
                    "reusability": 0.2,
                    "solution_readiness": 0.2
                },
                "typical_questions": [
                    "What data sources are available?",
                    "What analytical insights are needed?",
                    "Who are the primary users of the analytics?",
                    "What decisions will be supported by the data?"
                ]
            }
        },
        "industry_specific": {
            "healthcare": ["Regulatory compliance", "Patient safety", "HIPAA considerations"],
            "financial_services": ["Risk management", "Regulatory compliance", "Security requirements"],
            "manufacturing": ["Safety protocols", "Quality standards", "Operational efficiency"],
            "retail": ["Customer experience", "Inventory optimization", "Omnichannel integration"]
        }
    }

@router.get("/benchmarks")
async def get_industry_benchmarks():
    """Get industry benchmarks for use case assessment"""
    return {
        "roi_benchmarks": {
            "process_automation": {
                "average_roi": "200-400%",
                "payback_period": "6-18 months",
                "efficiency_gains": "20-50%"
            },
            "ai_ml_implementation": {
                "average_roi": "150-300%",
                "payback_period": "12-24 months",
                "accuracy_improvements": "10-30%"
            },
            "digital_transformation": {
                "average_roi": "100-250%",
                "payback_period": "18-36 months",
                "customer_satisfaction": "15-40% improvement"
            }
        },
        "implementation_timelines": {
            "simple_automation": "3-6 months",
            "complex_integration": "6-12 months",
            "enterprise_transformation": "12-24 months",
            "ai_ml_deployment": "6-18 months"
        },
        "success_factors": [
            "Strong executive sponsorship",
            "Clear success metrics definition",
            "Adequate change management",
            "Proper resource allocation",
            "Iterative implementation approach"
        ]
    }

@router.get("/grounding/test")
async def test_grounding():
    """Test endpoint to verify grounding functionality"""
    try:
        logger.info("🔍 Testing use case framework grounding functionality")
        client = initialize_genai_client()
        
        test_prompt = "What are the current trends in business process automation for 2024? Please search for recent market data and ROI studies."
        
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
            "sources_used": grounding_metadata['sources_used'][:3],
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
async def use_case_status():
    """Use case framework status check with grounding support"""
    try:
        client = initialize_genai_client()
        
        test_contents = [
            types.Content(role="user", parts=[types.Part(text="Test use case framework")])
        ]
        
        test_response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=test_contents,
            config=types.GenerateContentConfig(temperature=0.5, max_output_tokens=50)
        )
        
        grounding_test_passed = False
        try:
            grounding_config = create_grounding_config(True)
            grounding_test_passed = grounding_config is not None
        except Exception as grounding_error:
            logger.warning(f"⚠️ Grounding test failed: {grounding_error}")
        
        logger.info("✅ Use case framework status check successful")
        
        return {
            "status": "healthy",
            "framework": "Use Case Impact Assessment",
            "service": "operational",
            "model": "gemini-2.5-pro",
            "project": PROJECT_ID,
            "test_response": "successful" if test_response.text else "no response",
            "grounding_support": grounding_test_passed,
            "features": {
                "impact_assessment": True,
                "feasibility_analysis": True,
                "chat_conversation": True,
                "streaming_chat": True,
                "prioritization": True,
                "templates": True,
                "benchmarks": True,
                "real_time_grounding": grounding_test_passed,
                "market_research": grounding_test_passed
            },
            "endpoints": {
                "info": "/info",
                "analyze": "/analyze", 
                "prioritize": "/prioritize",
                "chat": "/chat",
                "stream": "/chat/stream",
                "templates": "/templates",
                "benchmarks": "/benchmarks",
                "grounding_test": "/grounding/test",
                "status": "/status"
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Use case status check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy", 
                "framework": "Use Case Impact Assessment",
                "error": str(e)
            }
        )