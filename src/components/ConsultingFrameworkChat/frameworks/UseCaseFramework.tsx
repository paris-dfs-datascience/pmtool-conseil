// src/components/ConsultingChat/frameworks/UseCaseFramework.tsx
import { FrameworkMessageParams, FrameworkResponse } from '../types';

const UseCaseFramework = {
  name: 'Use Case Impact Assessment',
  
  handleMessage: async (params: FrameworkMessageParams): Promise<FrameworkResponse> => {
    const { messages, enableGrounding, apiEndpoint, authHeaders } = params;
    
    // Build conversation history in the format expected by Use Case endpoint
    const conversationHistory = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    // Use Case Analysis specific payload
    const requestPayload = {
      messages: conversationHistory,
      enable_grounding: enableGrounding,
      business_context: `Use Case Impact Assessment chat conversation context`,
      temperature: 0.7,
      max_tokens: 2000
    };

    console.log('Sending Use Case Analysis request to:', apiEndpoint);
    console.log('Request payload:', requestPayload);

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Use Case API Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log('Use Case API Response:', data);
    
    // Handle Use Case-specific response format
    const responseText = data.message?.content || data.response || data.text || 'Sorry, I couldn\'t generate a use case analysis response.';
    
    return {
      message: responseText,
      grounding_enabled: data.grounding_enabled || false,
      sources_used: data.sources_used?.length || 0
    };
  },

  // Additional Use Case specific methods
  analyzeUseCase: async (params: {
    useCaseName: string;
    useCaseDescription: string;
    businessContext: string;
    companyDescription?: string;
    industry?: string;
    targetUsers?: string;
    currentSolution?: string;
    successCriteria?: string;
    timeline?: string;
    budgetRange?: string;
    enableGrounding?: boolean;
    competitorAnalysis?: boolean;
    marketResearch?: boolean;
    apiEndpoint: string;
    authHeaders: Record<string, string>;
  }) => {
    const {
      useCaseName,
      useCaseDescription,
      businessContext,
      companyDescription,
      industry,
      targetUsers,
      currentSolution,
      successCriteria,
      timeline,
      budgetRange,
      enableGrounding = true,
      competitorAnalysis = false,
      marketResearch = false,
      apiEndpoint,
      authHeaders
    } = params;

    const requestPayload = {
      use_case_name: useCaseName,
      use_case_description: useCaseDescription,
      business_context: businessContext,
      company_description: companyDescription,
      industry,
      target_users: targetUsers,
      current_solution: currentSolution,
      success_criteria: successCriteria,
      timeline,
      budget_range: budgetRange,
      enable_grounding: enableGrounding,
      competitor_analysis: competitorAnalysis,
      market_research: marketResearch
    };

    console.log('Sending Use Case Analysis request to:', `${apiEndpoint}/analyze`);
    console.log('Request payload:', requestPayload);

    const response = await fetch(`${apiEndpoint}/analyze`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Use Case Analysis API Error:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log('Use Case Analysis Response:', data);
    
    return data;
  },

  prioritizeUseCases: async (params: {
    useCases: Array<{
      name: string;
      description: string;
      businessContext?: string;
      [key: string]: any;
    }>;
    businessContext: string;
    constraints?: Record<string, any>;
    enableGrounding?: boolean;
    apiEndpoint: string;
    authHeaders: Record<string, string>;
  }) => {
    const {
      useCases,
      businessContext,
      constraints,
      enableGrounding = true,
      apiEndpoint,
      authHeaders
    } = params;

    const requestPayload = {
      use_cases: useCases,
      business_context: businessContext,
      constraints,
      enable_grounding: enableGrounding
    };

    console.log('Sending Use Case Prioritization request to:', `${apiEndpoint}/prioritize`);
    console.log('Request payload:', requestPayload);

    const response = await fetch(`${apiEndpoint}/prioritize`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Use Case Prioritization API Error:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log('Use Case Prioritization Response:', data);
    
    return data;
  },

  getTemplates: async (params: {
    apiEndpoint: string;
    authHeaders: Record<string, string>;
  }) => {
    const { apiEndpoint, authHeaders } = params;

    console.log('Fetching Use Case Templates from:', `${apiEndpoint}/templates`);

    const response = await fetch(`${apiEndpoint}/templates`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Use Case Templates API Error:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log('Use Case Templates Response:', data);
    
    return data;
  },

  getBenchmarks: async (params: {
    apiEndpoint: string;
    authHeaders: Record<string, string>;
  }) => {
    const { apiEndpoint, authHeaders } = params;

    console.log('Fetching Use Case Benchmarks from:', `${apiEndpoint}/benchmarks`);

    const response = await fetch(`${apiEndpoint}/benchmarks`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Use Case Benchmarks API Error:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log('Use Case Benchmarks Response:', data);
    
    return data;
  },

  getFrameworkInfo: async (params: {
    apiEndpoint: string;
    authHeaders: Record<string, string>;
  }) => {
    const { apiEndpoint, authHeaders } = params;

    console.log('Fetching Use Case Framework Info from:', `${apiEndpoint}/info`);

    const response = await fetch(`${apiEndpoint}/info`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Use Case Framework Info API Error:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log('Use Case Framework Info Response:', data);
    
    return data;
  },

  // Helper method to format assessment results for display
  formatAssessmentResults: (assessment: any) => {
    if (!assessment?.use_case_assessment) {
      return 'No assessment data available.';
    }

    const { use_case_assessment: uca } = assessment;
    
    return `
# ${uca.use_case_name} - Impact Assessment

## Executive Summary
**Priority Score:** ${uca.priority_score}/10
**Recommendation:** ${uca.recommendation}

## Business Impact Assessment
**Overall Score:** ${uca.business_impact.overall_impact_score}/5

- **Strategic Alignment:** ${uca.business_impact.strategic_alignment}
- **Ease of Adoption:** ${uca.business_impact.ease_of_adoption}
- **Business Readiness:** ${uca.business_impact.business_readiness}
- **Value Creation:** ${JSON.stringify(uca.business_impact.value_creation, null, 2)}

## Technical Feasibility Assessment
**Overall Score:** ${uca.technical_feasibility.overall_feasibility_score}/5

- **Data Readiness:** ${uca.technical_feasibility.data_readiness}
- **Solution Readiness:** ${uca.technical_feasibility.solution_readiness}
- **Ability to Scale:** ${uca.technical_feasibility.ability_to_scale}
- **Reusability:** ${uca.technical_feasibility.reusability}

## Key Risk Factors
${uca.risk_factors.map((risk: string) => `- ${risk}`).join('\n')}

## Success Metrics
${uca.success_metrics.map((metric: string) => `- ${metric}`).join('\n')}

## Implementation Roadmap
${assessment.implementation_roadmap?.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n')}

## ROI Projection
${JSON.stringify(assessment.roi_projection, null, 2)}

## Next Steps
${assessment.next_steps?.map((step: string) => `- ${step}`).join('\n')}
    `.trim();
  }
};

export default UseCaseFramework;