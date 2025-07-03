import React, { useState } from 'react';
import { FileText, CheckSquare, BarChart, Users, Target, DollarSign, Lightbulb, Search, Shield, Zap, Gpu, Container, Cloudy } from 'lucide-react';

interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: 'Analysis' | 'Strategy' | 'Evaluation' | 'Planning' | 'Innovation' | 'Digital' | 'Operations';
  icon: React.ReactNode;
}

interface PromptLibraryProps {
  onSelectPrompt?: (prompt: string) => void;
  selectedPromptId?: string | null;
}

const LMAPromptLibrary: React.FC<PromptLibraryProps> = ({ onSelectPrompt, selectedPromptId }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const [promptTemplates] = useState<PromptTemplate[]>([
    {
      id: '1',
      title: 'Comprehensive Document Analysis',
      description: 'Transform dense documents into actionable business intelligence with structured analysis and strategic insights',
      prompt: 'Please conduct a thorough analysis of this document and provide a comprehensive breakdown structured as follows:\n\n**EXECUTIVE SUMMARY** (3-4 sentences capturing the essence and primary purpose)\n\n**KEY FINDINGS & INSIGHTS** (6-8 critical points with supporting evidence)\n- Include quantitative data points where available\n- Highlight strategic implications for each finding\n- Note any contradictions or gaps in the information\n\n**STAKEHOLDER IMPACT ANALYSIS** (Who is affected and how)\n- Primary stakeholders and their interests\n- Secondary stakeholders and potential reactions\n- Impact severity assessment (High/Medium/Low)\n\n**CRITICAL ACTION ITEMS** (Prioritized by urgency and impact)\n- Immediate actions (0-30 days)\n- Short-term initiatives (1-3 months)\n- Long-term strategic moves (3+ months)\n\n**RISK ASSESSMENT & MITIGATION**\n- Potential risks or concerns mentioned\n- Unaddressed risks that should be considered\n- Recommended mitigation strategies\n\n**STRATEGIC QUESTIONS FOR LEADERSHIP**\n- 5-7 probing questions that need executive attention\n- Resource allocation considerations\n- Decision points requiring stakeholder input',
      category: 'Analysis',
      icon: <FileText size={18} />
    },
    {
      id: '2',
      title: 'Advanced Scoring Rubric Development',
      description: 'Create sophisticated evaluation frameworks with weighted criteria, behavioral indicators, and calibration guidelines',
      prompt: 'Develop a comprehensive scoring rubric for evaluating [TOPIC/PROCESS/PERFORMANCE]. Structure the rubric as follows:\n\n**EVALUATION FRAMEWORK OVERVIEW**\n- Purpose and scope of evaluation\n- Target audience and use cases\n- Evaluation timeline and frequency\n\n**CORE EVALUATION CRITERIA** (6-8 dimensions)\nFor each criterion, provide:\n- Clear definition and rationale\n- Specific behavioral indicators\n- Relative importance weighting (totaling 100%)\n- Measurement methodology\n\n**PERFORMANCE SCALE** (5-point scale recommended)\n- **Exceptional (5)**: Consistently exceeds expectations with measurable impact\n- **Proficient (4)**: Meets expectations with occasional excellence\n- **Developing (3)**: Approaches expectations with improvement needed\n- **Emerging (2)**: Below expectations requiring significant development\n- **Inadequate (1)**: Fails to meet basic requirements\n\n**DETAILED SCORING DESCRIPTORS**\n- Specific examples for each criterion at each performance level\n- Observable behaviors and outcomes\n- Common pitfalls and how to avoid them\n\n**CALIBRATION GUIDELINES**\n- Inter-rater reliability recommendations\n- Bias awareness and mitigation strategies\n- Quality assurance checkpoints\n\n**IMPLEMENTATION TOOLKIT**\n- Sample scoring scenarios with explanations\n- Evaluator training recommendations\n- Documentation and feedback templates\n- Continuous improvement process',
      category: 'Evaluation',
      icon: <CheckSquare size={18} />
    },
    {
      id: '3',
      title: 'Strategic Competitive Intelligence',
      description: 'Conduct deep competitive analysis with market positioning, strategic moves, and actionable competitive insights',
      prompt: 'Perform a comprehensive competitive analysis comparing [COMPANY/PRODUCT] with key market players. Structure your analysis as follows:\n\n**COMPETITIVE LANDSCAPE OVERVIEW**\n- Market definition and boundaries\n- Competitive dynamics and intensity\n- Key success factors in this market\n- Emerging competitive threats\n\n**COMPETITOR PROFILING** (For each major competitor)\n- Company background and strategic positioning\n- Core value proposition and differentiation\n- Target customer segments and go-to-market strategy\n- Financial performance and market share trends\n- Strengths, weaknesses, and vulnerabilities\n- Recent strategic moves and future intentions\n\n**COMPARATIVE ANALYSIS MATRIX**\n- Product/service feature comparison\n- Pricing strategy and value positioning\n- Distribution channels and market reach\n- Marketing and brand positioning\n- Technology and innovation capabilities\n- Operational efficiency and scalability\n\n**STRATEGIC INSIGHTS**\n- White space opportunities in the market\n- Competitive advantages to leverage\n- Threats requiring immediate attention\n- Partnership or acquisition opportunities\n\n**COMPETITIVE RESPONSE STRATEGY**\n- Defensive strategies to protect market position\n- Offensive strategies to gain market share\n- Differentiation opportunities\n- Resource allocation recommendations\n\n**MONITORING & INTELLIGENCE FRAMEWORK**\n- Key metrics to track competitive performance\n- Early warning indicators of competitive threats\n- Information sources and collection methods\n- Quarterly competitive intelligence reporting structure',
      category: 'Strategy',
      icon: <BarChart size={18} />
    },
    {
      id: '4',
      title: 'Comprehensive Stakeholder Ecosystem Mapping',
      description: 'Map complex stakeholder relationships with influence dynamics, engagement strategies, and coalition-building approaches',
      prompt: 'Create a detailed stakeholder analysis and engagement strategy for [PROJECT/INITIATIVE/CHANGE]. Provide a comprehensive mapping as follows:\n\n**STAKEHOLDER IDENTIFICATION & CATEGORIZATION**\n- Primary stakeholders (directly impacted)\n- Secondary stakeholders (indirectly affected)\n- Key influencers (opinion leaders and decision makers)\n- External stakeholders (regulators, media, community)\n- Hidden stakeholders (often overlooked but important)\n\n**STAKEHOLDER POWER-INTEREST GRID**\nFor each stakeholder, assess and plot:\n- Influence level (High/Medium/Low) with specific examples\n- Interest level (High/Medium/Low) with rationale\n- Current stance (Champion/Supporter/Neutral/Skeptic/Opponent)\n- Potential to change position\n\n**RELATIONSHIP MAPPING**\n- Stakeholder interdependencies and alliances\n- Conflict areas and competing interests\n- Coalition-building opportunities\n- Communication channels and preferred methods\n\n**ENGAGEMENT STRATEGY BY STAKEHOLDER GROUP**\n- **Manage Closely** (High Power, High Interest): Partnership approach\n- **Keep Satisfied** (High Power, Low Interest): Consultation approach\n- **Keep Informed** (Low Power, High Interest): Communication approach\n- **Monitor** (Low Power, Low Interest): Awareness approach\n\n**CUSTOMIZED COMMUNICATION PLAN**\n- Key messages for each stakeholder group\n- Preferred communication channels and frequency\n- Feedback mechanisms and two-way dialogue\n- Crisis communication protocols\n\n**ENGAGEMENT TACTICS & ACTIVITIES**\n- Formal engagement methods (meetings, presentations, reports)\n- Informal engagement opportunities (networking, social events)\n- Digital engagement strategies (portals, surveys, social media)\n- Stakeholder advisory groups or committees\n\n**RISK MITIGATION & CONTINGENCY PLANNING**\n- Potential stakeholder resistance scenarios\n- Mitigation strategies for each risk\n- Escalation procedures and decision trees\n- Regular stakeholder sentiment monitoring',
      category: 'Planning',
      icon: <Users size={18} />
    },
    {
      id: '5',
      title: 'Enterprise Risk Assessment & Management Framework',
      description: 'Develop comprehensive risk analysis with quantitative assessment, mitigation strategies, and monitoring systems',
      prompt: 'Conduct a thorough risk assessment for [PROJECT/INITIATIVE/ORGANIZATION]. Provide a comprehensive risk management framework:\n\n**RISK IDENTIFICATION & CATEGORIZATION**\n- **Strategic Risks**: Market changes, competitive threats, regulatory shifts\n- **Operational Risks**: Process failures, resource constraints, technology issues\n- **Financial Risks**: Budget overruns, revenue shortfalls, cost escalation\n- **Reputational Risks**: Brand damage, stakeholder confidence, public perception\n- **Compliance Risks**: Regulatory violations, legal challenges, audit findings\n- **External Risks**: Economic conditions, natural disasters, supplier issues\n\n**QUANTITATIVE RISK ANALYSIS**\nFor each identified risk, provide:\n- Risk description and potential triggers\n- Probability assessment (1-5 scale with percentages)\n- Impact severity across multiple dimensions (1-5 scale):\n  * Financial impact ($ estimates where possible)\n  * Timeline impact (delay in days/weeks)\n  * Quality/scope impact\n  * Stakeholder satisfaction impact\n- Risk score calculation (Probability × Impact)\n- Risk velocity (how quickly it could materialize)\n\n**RISK PRIORITIZATION MATRIX**\n- Critical risks requiring immediate attention\n- High-priority risks needing active management\n- Medium-priority risks for monitoring\n- Low-priority risks for periodic review\n\n**RISK RESPONSE STRATEGIES**\nFor each significant risk:\n- **Avoid**: Eliminate risk by changing project approach\n- **Mitigate**: Reduce probability or impact\n- **Transfer**: Shift risk to third parties (insurance, contracts)\n- **Accept**: Acknowledge and monitor with contingency plans\n\n**DETAILED MITIGATION PLANS**\n- Specific actions to reduce risk probability\n- Measures to minimize potential impact\n- Resource requirements and ownership\n- Implementation timeline and milestones\n- Success metrics and monitoring indicators\n\n**CONTINGENCY & RESPONSE PLANS**\n- Trigger points for activating contingency plans\n- Step-by-step response procedures\n- Communication protocols during risk events\n- Recovery strategies and business continuity\n- Lessons learned integration process\n\n**RISK MONITORING & REPORTING**\n- Key risk indicators (KRIs) and thresholds\n- Regular risk review schedule and ownership\n- Escalation procedures and decision authority\n- Risk dashboard and reporting templates\n- Continuous risk identification processes',
      category: 'Evaluation',
      icon: <Shield size={18} />
    },
    {
      id: '6',
      title: 'Strategic Roadmap & Implementation Framework',
      description: 'Generate comprehensive strategic recommendations with phased implementation, resource planning, and success metrics',
      prompt: 'Based on the analysis provided, develop a comprehensive strategic roadmap with detailed implementation guidance:\n\n**STRATEGIC CONTEXT & RATIONALE**\n- Current state assessment and key challenges\n- Market opportunities and competitive landscape\n- Organizational capabilities and constraints\n- Strategic imperatives driving recommendations\n\n**TIERED STRATEGIC RECOMMENDATIONS**\n\n**IMMEDIATE ACTIONS (0-3 months)**\n- 3-5 critical quick wins with high impact\n- Specific deliverables and success criteria\n- Resource requirements and ownership\n- Risk mitigation for each initiative\n- Expected outcomes and business value\n\n**SHORT-TERM INITIATIVES (3-12 months)**\n- 4-6 strategic projects building on quick wins\n- Detailed project charters and scope\n- Cross-functional dependencies and coordination\n- Budget estimates and resource allocation\n- Milestone-based progress tracking\n\n**LONG-TERM STRATEGIC GOALS (1-3 years)**\n- 3-4 transformational initiatives\n- Vision and end-state definition\n- Capability building requirements\n- Investment priorities and funding strategy\n- Change management considerations\n\n**IMPLEMENTATION PLANNING**\n- Integrated project timeline and sequencing\n- Resource capacity planning and allocation\n- Governance structure and decision rights\n- Communication and change management plan\n- Risk management and contingency planning\n\n**SUCCESS METRICS & KPIs**\nFor each recommendation tier:\n- Leading indicators (early success signals)\n- Lagging indicators (ultimate outcome measures)\n- Quantitative targets and benchmarks\n- Qualitative success factors\n- Measurement methodology and reporting frequency\n\n**RESOURCE REQUIREMENTS**\n- Human capital needs (FTE, skills, roles)\n- Technology and infrastructure investments\n- External support requirements (consultants, vendors)\n- Budget estimates by initiative and time period\n- Funding sources and approval processes\n\n**ORGANIZATIONAL READINESS**\n- Change management and adoption strategy\n- Training and capability development needs\n- Cultural considerations and resistance management\n- Leadership alignment and sponsorship\n- Communication strategy and stakeholder engagement\n\n**MONITORING & COURSE CORRECTION**\n- Regular review checkpoints and governance\n- Performance dashboard and reporting\n- Decision points for strategy adjustments\n- Continuous improvement and learning integration\n- Exit criteria and success celebration milestones',
      category: 'Strategy',
      icon: <Target size={18} />
    },
    {
      id: '7',
      title: 'Comprehensive Financial Impact Analysis',
      description: 'Conduct detailed cost-benefit analysis with scenario modeling, risk-adjusted projections, and investment recommendations',
      prompt: 'Perform a comprehensive financial analysis for [INITIATIVE/INVESTMENT/PROJECT]. Provide a detailed cost-benefit evaluation:\n\n**FINANCIAL ANALYSIS FRAMEWORK**\n- Analysis scope and time horizon\n- Key assumptions and methodology\n- Currency and inflation considerations\n- Baseline scenario definition\n\n**COMPREHENSIVE COST ANALYSIS**\n\n**Initial Investment Costs**\n- Capital expenditures (equipment, technology, facilities)\n- Implementation costs (consulting, training, change management)\n- One-time setup and integration costs\n- Contingency reserves (10-20% of total)\n\n**Ongoing Operational Costs**\n- Personnel costs (salaries, benefits, contractor fees)\n- Technology and infrastructure maintenance\n- Process and operational expenses\n- Compliance and regulatory costs\n\n**Hidden and Indirect Costs**\n- Opportunity costs of diverted resources\n- Productivity loss during implementation\n- Training and learning curve impacts\n- Integration and coordination overhead\n\n**QUANTIFIED BENEFITS ANALYSIS**\n\n**Revenue Generation**\n- New revenue streams and market opportunities\n- Revenue enhancement from existing products/services\n- Pricing optimization and margin improvements\n- Customer acquisition and retention value\n\n**Cost Savings and Efficiency Gains**\n- Process automation and labor savings\n- Reduced operational and overhead costs\n- Improved resource utilization\n- Error reduction and quality improvements\n\n**Strategic and Intangible Benefits**\n- Market positioning and competitive advantage\n- Risk reduction and compliance benefits\n- Innovation and capability development\n- Brand enhancement and stakeholder value\n\n**FINANCIAL MODELING & PROJECTIONS**\n- 5-year cash flow projections (monthly for Year 1)\n- NPV calculation with appropriate discount rate\n- IRR and payback period analysis\n- Sensitivity analysis on key variables\n- Break-even analysis and scenarios\n\n**RISK-ADJUSTED ANALYSIS**\n- Monte Carlo simulation for key uncertainties\n- Best case, worst case, and most likely scenarios\n- Risk probability weightings and impact\n- Contingency planning and mitigation costs\n\n**INVESTMENT RECOMMENDATION**\n- Go/no-go recommendation with rationale\n- Optimal timing and phasing strategy\n- Alternative approaches and trade-offs\n- Funding sources and financial structure\n- Success metrics and value realization tracking\n\n**ONGOING FINANCIAL MONITORING**\n- Key financial indicators and dashboards\n- Variance analysis and course correction triggers\n- Value realization milestones and reviews\n- Post-implementation financial validation',
      category: 'Analysis',
      icon: <DollarSign size={18} />
    },
    {
      id: '8',
      title: 'Business Process Transformation Analysis',
      description: 'Analyze end-to-end processes with detailed optimization recommendations, technology enablement, and change management',
      prompt: 'Conduct a comprehensive business process analysis and optimization for [PROCESS/WORKFLOW/SYSTEM]. Provide detailed transformation recommendations:\n\n**PROCESS DISCOVERY & MAPPING**\n- End-to-end process flow documentation\n- Process boundaries and scope definition\n- Key stakeholders and their roles\n- Input/output identification and dependencies\n- Current state process metrics and performance\n\n**DETAILED CURRENT STATE ANALYSIS**\n\n**Process Performance Assessment**\n- Cycle time analysis by process step\n- Volume and throughput measurements\n- Quality metrics and error rates\n- Cost per transaction or process execution\n- Customer satisfaction and experience metrics\n\n**Pain Point & Bottleneck Identification**\n- Process steps causing delays or errors\n- Resource constraints and capacity issues\n- Technology limitations and integration gaps\n- Decision points and approval bottlenecks\n- Compliance and regulatory friction points\n\n**Root Cause Analysis**\n- People-related issues (skills, training, motivation)\n- Process design flaws and inefficiencies\n- Technology limitations and system issues\n- Policy and governance constraints\n- External dependencies and supplier issues\n\n**FUTURE STATE DESIGN**\n\n**Process Optimization Opportunities**\n- Elimination of non-value-added activities\n- Automation potential and technology enablement\n- Parallel processing and workflow optimization\n- Self-service and customer empowerment options\n- Quality improvement and error prevention\n\n**Technology Integration Strategy**\n- Digital transformation opportunities\n- System integration and data flow optimization\n- Automation tools and AI/ML applications\n- Mobile and cloud enablement\n- Analytics and real-time monitoring capabilities\n\n**TRANSFORMATION ROADMAP**\n\n**Quick Wins (0-3 months)**\n- Immediate process improvements requiring minimal investment\n- Policy and procedure clarifications\n- Training and communication enhancements\n- Simple technology fixes and workarounds\n\n**Medium-term Improvements (3-12 months)**\n- Process redesign and workflow optimization\n- Technology upgrades and system enhancements\n- Role clarification and organizational changes\n- Performance measurement and feedback systems\n\n**Long-term Transformation (12+ months)**\n- Comprehensive process reengineering\n- Major technology implementations\n- Organizational restructuring and capability building\n- Cultural change and adoption programs\n\n**IMPACT ASSESSMENT**\n- Quantified benefits (time savings, cost reduction, quality improvement)\n- Implementation costs and resource requirements\n- Risk assessment and mitigation strategies\n- Change management and stakeholder impact\n- Success metrics and measurement framework\n\n**IMPLEMENTATION SUPPORT**\n- Change management and communication strategy\n- Training and capability development plan\n- Project governance and oversight structure\n- Pilot program and phased rollout approach\n- Continuous improvement and optimization process',
      category: 'Analysis',
      icon: <Zap size={18} />
    },
    {
      id: '9',
      title: 'Strategic Market Intelligence & Opportunity Assessment',
      description: 'Conduct comprehensive market research with competitive intelligence, customer insights, and strategic recommendations',
      prompt: 'Conduct comprehensive market research and strategic analysis for [INDUSTRY/MARKET/SECTOR]. Provide detailed intelligence and opportunity assessment:\n\n**MARKET LANDSCAPE ANALYSIS**\n\n**Market Size & Growth Dynamics**\n- Total Addressable Market (TAM) and historical trends\n- Serviceable Addressable Market (SAM) and growth projections\n- Market segmentation and sub-sector analysis\n- Geographic market variations and opportunities\n- Growth drivers and market catalysts\n\n**Industry Structure & Value Chain**\n- Key players across the value chain\n- Supplier power and concentration\n- Buyer power and purchasing patterns\n- Threat of substitutes and alternatives\n- Barriers to entry and competitive intensity\n\n**COMPETITIVE INTELLIGENCE**\n\n**Market Share & Positioning Analysis**\n- Leading players and market share distribution\n- Competitive positioning and differentiation strategies\n- Pricing strategies and value propositions\n- Distribution channels and go-to-market approaches\n- Innovation and product development trends\n\n**Emerging Competitors & Disruptors**\n- Startup companies and new entrants\n- Technology disruptors and business model innovations\n- Cross-industry competitors and convergence\n- Potential acquisition targets or partnership opportunities\n\n**CUSTOMER INSIGHTS & SEGMENTATION**\n\n**Customer Segment Analysis**\n- Primary customer segments and characteristics\n- Segment size, growth, and profitability\n- Customer needs, preferences, and pain points\n- Buying behavior and decision-making process\n- Price sensitivity and value perception\n\n**Customer Journey & Experience**\n- Awareness and consideration process\n- Purchase decision factors and criteria\n- Usage patterns and satisfaction levels\n- Retention and loyalty drivers\n- Advocacy and referral behaviors\n\n**MARKET TRENDS & DISRUPTIONS**\n\n**Technology Trends**\n- Emerging technologies impacting the market\n- Digital transformation and automation trends\n- Data and analytics capabilities\n- Platform and ecosystem developments\n\n**Regulatory & Policy Environment**\n- Current regulatory framework and compliance requirements\n- Pending legislation and policy changes\n- Government initiatives and support programs\n- International trade and regulatory considerations\n\n**Social & Economic Factors**\n- Demographic trends and generational shifts\n- Economic conditions and purchasing power\n- Environmental and sustainability concerns\n- Cultural and behavioral changes\n\n**STRATEGIC OPPORTUNITIES**\n\n**Market Entry Strategies**\n- Organic growth opportunities and market gaps\n- Acquisition and partnership opportunities\n- Geographic expansion potential\n- Product/service extension possibilities\n\n**Competitive Advantage Development**\n- Differentiation opportunities and unique positioning\n- Capability building and investment priorities\n- Innovation and R&D focus areas\n- Strategic partnerships and ecosystem development\n\n**STRATEGIC RECOMMENDATIONS**\n- Market entry and expansion strategy\n- Product/service portfolio optimization\n- Competitive positioning and differentiation\n- Investment priorities and resource allocation\n- Risk mitigation and contingency planning\n\n**MARKET MONITORING FRAMEWORK**\n- Key market indicators and metrics to track\n- Competitive intelligence sources and methods\n- Customer feedback and market research programs\n- Trend monitoring and early warning systems\n- Regular market assessment and strategy review schedule',
      category: 'Strategy',
      icon: <Search size={18} />
    },
    {
      id: '10',
      title: 'Innovation Laboratory & Ideation Framework',
      description: 'Design comprehensive innovation programs with structured ideation, evaluation, and implementation methodologies',
      prompt: 'Create a comprehensive innovation workshop and ideation framework for addressing [CHALLENGE/OPPORTUNITY/STRATEGIC OBJECTIVE]. Design an end-to-end innovation process:\n\n**INNOVATION PROGRAM DESIGN**\n\n**Program Objectives & Success Criteria**\n- Innovation goals and desired outcomes\n- Success metrics and measurement framework\n- Timeline and resource allocation\n- Stakeholder engagement and sponsorship\n- Integration with organizational strategy\n\n**Pre-Workshop Preparation**\n- Participant selection and diversity criteria\n- Background research and trend analysis\n- Challenge definition and problem framing\n- Inspiration materials and case studies\n- Logistics and facilitation requirements\n\n**STRUCTURED IDEATION METHODOLOGY**\n\n**Divergent Thinking Exercises (Day 1)**\n\n**Exercise 1: Problem Reframing**\n- Multiple problem statement variations\n- "How Might We" question generation\n- Assumption challenging and constraint removal\n- Stakeholder perspective taking\n- Root cause and systems thinking\n\n**Exercise 2: Inspiration & Analogies**\n- Cross-industry solution exploration\n- Nature-inspired innovation (biomimicry)\n- Historical precedent analysis\n- Trend extrapolation and scenario building\n- Technology transfer opportunities\n\n**Exercise 3: Rapid Ideation**\n- Individual brainstorming sessions\n- Building on others\' ideas\n- Quantity over quality focus\n- Visual and conceptual thinking\n- Wild and impossible ideas encouragement\n\n**Exercise 4: Collaborative Synthesis**\n- Idea clustering and theme identification\n- Cross-pollination and idea combination\n- Stakeholder impact assessment\n- Feasibility and desirability mapping\n\n**CONVERGENT THINKING & EVALUATION (Day 2)**\n\n**Multi-Criteria Evaluation Framework**\n- **Innovation Potential**: Novelty, differentiation, breakthrough potential\n- **Market Viability**: Customer need, market size, competitive advantage\n- **Technical Feasibility**: Technology readiness, implementation complexity\n- **Business Case**: Revenue potential, cost structure, risk profile\n- **Strategic Fit**: Alignment with vision, capability leverage, timing\n- **Implementation Readiness**: Resource requirements, organizational capacity\n\n**Structured Evaluation Process**\n- Individual scoring and ranking\n- Group discussion and consensus building\n- Devil\'s advocate and red team review\n- Expert panel evaluation\n- Stakeholder impact assessment\n\n**CONCEPT DEVELOPMENT & PROTOTYPING**\n\n**Rapid Prototyping Methods**\n- Paper prototypes and wireframes\n- Digital mockups and simulations\n- Service blueprints and journey maps\n- Business model canvas development\n- Minimum viable product (MVP) definition\n\n**Concept Validation Framework**\n- Customer interview and feedback protocols\n- Market testing and validation experiments\n- Technical proof-of-concept development\n- Financial modeling and business case\n- Risk assessment and mitigation planning\n\n**IMPLEMENTATION ROADMAP**\n\n**Innovation Pipeline Management**\n- Idea categorization and portfolio management\n- Stage-gate process and decision criteria\n- Resource allocation and funding mechanisms\n- Progress tracking and milestone reviews\n- Success celebration and learning capture\n\n**Organizational Innovation Capability**\n- Innovation culture and mindset development\n- Innovation processes and governance\n- Collaboration tools and platforms\n- Training and skill development programs\n- External partnership and ecosystem building\n\n**POST-WORKSHOP EXECUTION**\n\n**Immediate Follow-up Actions (Week 1)**\n- Idea documentation and repository creation\n- Participant feedback and engagement\n- Sponsor and stakeholder communication\n- Resource allocation and team formation\n- Quick win identification and execution\n\n**Short-term Development (Months 1-3)**\n- Prototype development and testing\n- Market validation and customer feedback\n- Business case development and refinement\n- Implementation planning and preparation\n- Partnership and collaboration development\n\n**Long-term Innovation Program (Months 3-12)**\n- Pilot program launch and execution\n- Scaling and commercialization planning\n- Continuous innovation process embedding\n- Success measurement and optimization\n- Next innovation cycle planning and execution\n\n**CONTINUOUS IMPROVEMENT**\n- Innovation process evaluation and refinement\n- Participant and stakeholder feedback integration\n- Best practice identification and sharing\n- Innovation capability assessment and development\n- External learning and benchmark integration',
      category: 'Planning',
      icon: <Lightbulb size={18} />
    },
    {
      id: '11',
      title: 'Innovation Laboratory & Ideation Framework',
      description: 'Design comprehensive innovation programs with structured ideation, evaluation, and implementation methodologies',
      prompt: 'Create a comprehensive innovation workshop and ideation framework for addressing [CHALLENGE/OPPORTUNITY/STRATEGIC OBJECTIVE]. Design an end-to-end innovation process:\n\n**INNOVATION PROGRAM DESIGN**\n\n**Program Objectives & Success Criteria**\n- Innovation goals and desired outcomes\n- Success metrics and measurement framework\n- Timeline and resource allocation\n- Stakeholder engagement and sponsorship\n- Integration with organizational strategy\n\n**Pre-Workshop Preparation**\n- Participant selection and diversity criteria\n- Background research and trend analysis\n- Challenge definition and problem framing\n- Inspiration materials and case studies\n- Logistics and facilitation requirements\n\n**STRUCTURED IDEATION METHODOLOGY**\n\n**Divergent Thinking Exercises (Day 1)**\n\n**Exercise 1: Problem Reframing**\n- Multiple problem statement variations\n- "How Might We" question generation\n- Assumption challenging and constraint removal\n- Stakeholder perspective taking\n- Root cause and systems thinking\n\n**Exercise 2: Inspiration & Analogies**\n- Cross-industry solution exploration\n- Nature-inspired innovation (biomimicry)\n- Historical precedent analysis\n- Trend extrapolation and scenario building\n- Technology transfer opportunities\n\n**Exercise 3: Rapid Ideation**\n- Individual brainstorming sessions\n- Building on others\' ideas\n- Quantity over quality focus\n- Visual and conceptual thinking\n- Wild and impossible ideas encouragement\n\n**Exercise 4: Collaborative Synthesis**\n- Idea clustering and theme identification\n- Cross-pollination and idea combination\n- Stakeholder impact assessment\n- Feasibility and desirability mapping\n\n**CONVERGENT THINKING & EVALUATION (Day 2)**\n\n**Multi-Criteria Evaluation Framework**\n- **Innovation Potential**: Novelty, differentiation, breakthrough potential\n- **Market Viability**: Customer need, market size, competitive advantage\n- **Technical Feasibility**: Technology readiness, implementation complexity\n- **Business Case**: Revenue potential, cost structure, risk profile\n- **Strategic Fit**: Alignment with vision, capability leverage, timing\n- **Implementation Readiness**: Resource requirements, organizational capacity\n\n**Structured Evaluation Process**\n- Individual scoring and ranking\n- Group discussion and consensus building\n- Devil\'s advocate and red team review\n- Expert panel evaluation\n- Stakeholder impact assessment\n\n**CONCEPT DEVELOPMENT & PROTOTYPING**\n\n**Rapid Prototyping Methods**\n- Paper prototypes and wireframes\n- Digital mockups and simulations\n- Service blueprints and journey maps\n- Business model canvas development\n- Minimum viable product (MVP) definition\n\n**Concept Validation Framework**\n- Customer interview and feedback protocols\n- Market testing and validation experiments\n- Technical proof-of-concept development\n- Financial modeling and business case\n- Risk assessment and mitigation planning\n\n**IMPLEMENTATION ROADMAP**\n\n**Innovation Pipeline Management**\n- Idea categorization and portfolio management\n- Stage-gate process and decision criteria\n- Resource allocation and funding mechanisms\n- Progress tracking and milestone reviews\n- Success celebration and learning capture\n\n**Organizational Innovation Capability**\n- Innovation culture and mindset development\n- Innovation processes and governance\n- Collaboration tools and platforms\n- Training and skill development programs\n- External partnership and ecosystem building\n\n**POST-WORKSHOP EXECUTION**\n\n**Immediate Follow-up Actions (Week 1)**\n- Idea documentation and repository creation\n- Participant feedback and engagement\n- Sponsor and stakeholder communication\n- Resource allocation and team formation\n- Quick win identification and execution\n\n**Short-term Development (Months 1-3)**\n- Prototype development and testing\n- Market validation and customer feedback\n- Business case development and refinement\n- Implementation planning and preparation\n- Partnership and collaboration development\n\n**Long-term Innovation Program (Months 3-12)**\n- Pilot program launch and execution\n- Scaling and commercialization planning\n- Continuous innovation process embedding\n- Success measurement and optimization\n- Next innovation cycle planning and execution\n\n**CONTINUOUS IMPROVEMENT**\n- Innovation process evaluation and refinement\n- Participant and stakeholder feedback integration\n- Best practice identification and sharing\n- Innovation capability assessment and development\n- External learning and benchmark integration',
      category: 'Innovation',
      icon: <Cloudy size={18} />
    },
    {
      id: '12',
      title: 'Operational Excellence Assessment',
      description: 'Comprehensive operational analysis with performance metrics, process optimization, and efficiency improvements',
      prompt: 'Conduct a thorough operational excellence assessment for [DEPARTMENT/FUNCTION/PROCESS]. Provide detailed analysis and improvement recommendations:\n\n**OPERATIONAL BASELINE ASSESSMENT**\n\n**Current Performance Metrics**\n- Key Performance Indicators (KPIs) and current performance levels\n- Productivity metrics and efficiency ratios\n- Quality metrics and defect rates\n- Cost per unit/transaction analysis\n- Customer satisfaction and service level agreements\n- Employee satisfaction and engagement scores\n\n**Resource Utilization Analysis**\n- Staffing levels and capacity utilization\n- Technology and equipment effectiveness\n- Space and facility optimization\n- Budget allocation and cost structure\n- Vendor and supplier performance\n\n**OPERATIONAL PROCESS DEEP DIVE**\n\n**Process Flow Analysis**\n- End-to-end process mapping and documentation\n- Cycle time analysis by process step\n- Bottleneck identification and capacity constraints\n- Handoff points and coordination challenges\n- Exception handling and error recovery processes\n\n**Waste Identification (Lean Methodology)**\n- **Overproduction**: Producing more than needed\n- **Waiting**: Idle time and delays\n- **Transportation**: Unnecessary movement of materials/information\n- **Overprocessing**: Excessive or unnecessary work\n- **Inventory**: Excess materials or work-in-progress\n- **Motion**: Inefficient movement of people\n- **Defects**: Errors requiring rework\n- **Underutilized Talent**: Skills not being leveraged\n\n**PERFORMANCE GAP ANALYSIS**\n\n**Benchmarking Against Best Practices**\n- Industry standard comparisons\n- Internal benchmarking across departments\n- Historical performance trend analysis\n- Competitive performance analysis\n- World-class performance targets\n\n**Root Cause Analysis**\n- Performance gap identification and quantification\n- Contributing factors and interdependencies\n- Systemic issues vs. isolated problems\n- People, process, and technology factors\n- Cultural and organizational barriers\n\n**IMPROVEMENT OPPORTUNITY IDENTIFICATION**\n\n**Quick Wins (0-30 days)**\n- Low-cost, high-impact improvements\n- Policy and procedure clarifications\n- Simple automation and tool improvements\n- Communication and coordination enhancements\n- Training and skill development needs\n\n**Process Optimization (1-6 months)**\n- Workflow redesign and streamlining\n- Technology upgrades and system improvements\n- Role clarification and responsibility matrices\n- Performance management system enhancements\n- Supplier and vendor optimization\n\n**Strategic Initiatives (6+ months)**\n- Major process reengineering projects\n- Technology platform implementations\n- Organizational restructuring\n- Capability building and training programs\n- Cultural transformation initiatives\n\n**IMPLEMENTATION ROADMAP**\n\n**Prioritization Framework**\n- Impact vs. effort matrix for all improvements\n- Resource requirements and availability\n- Dependencies and sequencing considerations\n- Risk assessment and mitigation strategies\n- Quick win vs. long-term balance\n\n**Change Management Strategy**\n- Stakeholder engagement and communication plan\n- Training and capability development\n- Resistance management and adoption strategies\n- Success measurement and feedback loops\n- Continuous improvement culture development\n\n**PERFORMANCE MONITORING SYSTEM**\n\n**Dashboard and Metrics Framework**\n- Real-time operational dashboards\n- Leading and lagging indicators\n- Exception reporting and alert systems\n- Trend analysis and predictive analytics\n- Benchmarking and comparative analysis\n\n**Governance and Oversight**\n- Regular performance review meetings\n- Escalation procedures and decision rights\n- Continuous improvement processes\n- Best practice sharing and standardization\n- Performance incentive alignment',
      category: 'Operations',
      icon: <Container size={18} />,
    },
    {
      id: '12',
      title: 'Digital Innovation Strategy Framework',
      description: 'Comprehensive digital transformation roadmap with technology assessment, innovation pipeline, and implementation strategy',
      prompt: 'Develop a comprehensive digital innovation strategy for [ORGANIZATION/DEPARTMENT/FUNCTION]. Create a detailed transformation roadmap:\n\n**DIGITAL MATURITY ASSESSMENT**\n\n**Current State Analysis**\n- Technology infrastructure and architecture assessment\n- Digital capabilities and skill inventory\n- Data management and analytics maturity\n- Customer digital experience evaluation\n- Process digitization and automation levels\n- Digital culture and mindset assessment\n\n**Digital Readiness Evaluation**\n- Leadership commitment and digital vision\n- Organizational agility and change capacity\n- Financial resources and investment appetite\n- Technical debt and legacy system constraints\n- Regulatory and compliance considerations\n- Competitive digital positioning\n\n**INNOVATION OPPORTUNITY LANDSCAPE**\n\n**Emerging Technology Assessment**\n- Artificial Intelligence and Machine Learning applications\n- Internet of Things (IoT) and connected devices\n- Blockchain and distributed ledger technologies\n- Cloud computing and edge computing opportunities\n- Robotics and process automation potential\n- Augmented/Virtual Reality applications\n- 5G and advanced connectivity implications\n\n**Digital Disruption Analysis**\n- Industry digital transformation trends\n- Competitive digital initiatives and threats\n- Customer behavior and expectation shifts\n- New business model opportunities\n- Platform and ecosystem development potential\n- Regulatory and policy digital requirements\n\n**INNOVATION PIPELINE DEVELOPMENT**\n\n**Idea Generation and Capture**\n- Internal innovation challenges and hackathons\n- External partnership and collaboration opportunities\n- Customer co-creation and feedback integration\n- Employee suggestion and innovation programs\n- Technology scouting and startup engagement\n- Academic and research institution partnerships\n\n**Innovation Evaluation Framework**\n- **Technology Readiness**: Maturity and implementation feasibility\n- **Business Impact**: Revenue potential and cost savings\n- **Strategic Alignment**: Fit with organizational objectives\n- **Customer Value**: User experience and satisfaction improvement\n- **Competitive Advantage**: Differentiation and market positioning\n- **Risk Assessment**: Technical, financial, and operational risks\n\n**DIGITAL TRANSFORMATION ROADMAP**\n\n**Foundation Building (0-6 months)**\n- Digital infrastructure modernization\n- Data governance and management systems\n- Cybersecurity and privacy framework\n- Digital skills training and development\n- Agile and DevOps methodology adoption\n- Innovation governance and processes\n\n**Capability Development (6-18 months)**\n- Advanced analytics and AI implementation\n- Process automation and optimization\n- Customer digital experience enhancement\n- Digital product and service development\n- Partnership and ecosystem building\n- Innovation lab and experimentation setup\n\n**Transformation Acceleration (18+ months)**\n- Platform and ecosystem development\n- Advanced AI and automation deployment\n- New business model implementation\n- Market expansion and scaling strategies\n- Continuous innovation and adaptation\n- Digital culture and mindset embedding\n\n**IMPLEMENTATION AND GOVERNANCE**\n\n**Program Management Framework**\n- Innovation portfolio management\n- Stage-gate process and decision criteria\n- Resource allocation and funding mechanisms\n- Project management and execution standards\n- Risk management and mitigation strategies\n- Success measurement and value realization\n\n**Cultural Transformation**\n- Digital leadership development\n- Innovation mindset and behavior change\n- Collaboration and knowledge sharing\n- Continuous learning and adaptation\n- Recognition and reward systems\n- Change management and communication\n\n**MEASUREMENT AND OPTIMIZATION**\n\n**Innovation Metrics Dashboard**\n- Innovation pipeline health and velocity\n- Time-to-market and implementation speed\n- Innovation ROI and value creation\n- Customer adoption and satisfaction\n- Employee engagement and participation\n- Competitive positioning and market share\n\n**Continuous Improvement Process**\n- Regular innovation strategy reviews\n- Best practice identification and sharing\n- Failure analysis and learning integration\n- Process optimization and refinement\n- Technology trend monitoring and adaptation\n- Strategic pivoting and course correction',
      category: 'Innovation',
      icon: <Gpu size={18} />
    }
  ]);

  const categories = ['All', 'Analysis', 'Strategy', 'Evaluation', 'Planning', 'Innovation', 'Digital', 'Operations'];
  
  const filteredPrompts = selectedCategory === 'All' 
    ? promptTemplates 
    : promptTemplates.filter(prompt => prompt.category === selectedCategory);

  const handlePromptSelect = (prompt: PromptTemplate) => {
    if (onSelectPrompt) {
      onSelectPrompt(prompt.prompt);
    }
  };

  return (
    <div className="bg-gray-50 h-screen max-h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Consultant Prompt Library</h3>
          <p className="text-sm text-gray-500 mt-1">
            {filteredPrompts.length} ready-to-use templates
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Templates List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {filteredPrompts.map((template) => (
          <div
            key={template.id}
            onClick={() => handlePromptSelect(template)}
            className={`bg-white border-2 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-all group ${
              selectedPromptId === template.id 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <div className={`mr-3 transition-colors ${
                  selectedPromptId === template.id 
                    ? 'text-blue-700' 
                    : 'text-blue-600 group-hover:text-blue-700'
                }`}>
                  {template.icon}
                </div>
                <div>
                  <h4 className={`font-semibold transition-colors ${
                    selectedPromptId === template.id 
                      ? 'text-blue-800' 
                      : 'text-gray-800 group-hover:text-blue-700'
                  }`}>
                    {template.title}
                  </h4>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                    template.category === 'Analysis' ? 'bg-green-100 text-green-700' :
                    template.category === 'Strategy' ? 'bg-purple-100 text-purple-700' :
                    template.category === 'Evaluation' ? 'bg-orange-100 text-orange-700' :
                    template.category === 'Innovation' ? 'bg-yellow-100 text-yellow-700' :
                    template.category === 'Planning' ? 'bg-pink-100 text-pink-700' :
                    template.category === 'Digital' ? 'bg-blue-100 text-blue-700' :
                    template.category === 'Operations' ? 'bg-grey-100 text-black-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {template.category}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              {template.description}
            </p>
            
            <div className={`rounded p-3 transition-colors ${
              selectedPromptId === template.id 
                ? 'bg-blue-100' 
                : 'bg-gray-50 group-hover:bg-gray-100'
            }`}>
              <p className="text-xs text-gray-700" style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {template.prompt}
              </p>
            </div>
            
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
              <span className={`text-xs transition-colors ${
                selectedPromptId === template.id 
                  ? 'text-blue-600' 
                  : 'text-gray-500'
              }`}>
                {selectedPromptId === template.id ? 'Selected template' : 'Click to use template'}
              </span>
              <button className={`text-xs font-medium transition-colors ${
                selectedPromptId === template.id 
                  ? 'text-blue-700' 
                  : 'text-blue-600 hover:text-blue-700'
              }`}>
                {selectedPromptId === template.id ? 'Selected →' : 'Select Prompt →'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LMAPromptLibrary;