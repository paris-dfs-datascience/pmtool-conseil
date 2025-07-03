// src/components/ConsultingChat/frameworks/SWOTAnalysis.tsx
import { FrameworkMessageParams, FrameworkResponse } from '../types';

const SWOTAnalysis = {
  name: 'SWOT Analysis',
  
  handleMessage: async (params: FrameworkMessageParams): Promise<FrameworkResponse> => {
    const { messages, enableGrounding, apiEndpoint, authHeaders } = params;
    
    // Build conversation history in the format expected by SWOT endpoint
    const conversationHistory = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    // SWOT Analysis specific payload
    const requestPayload = {
      messages: conversationHistory,
      enable_grounding: enableGrounding,
      business_context: `SWOT Analysis chat conversation context`,
      temperature: 0.7,
      max_tokens: 2000
    };

    console.log('Sending SWOT Analysis request to:', apiEndpoint);
    console.log('Request payload:', requestPayload);

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SWOT API Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log('SWOT API Response:', data);
    
    // Handle SWOT-specific response format
    const responseText = data.message?.content || data.response || data.text || 'Sorry, I couldn\'t generate a SWOT analysis response.';
    
    return {
      message: responseText,
      grounding_enabled: data.grounding_enabled || false,
      sources_used: data.sources_used?.length || 0
    };
  }
};

export default SWOTAnalysis;