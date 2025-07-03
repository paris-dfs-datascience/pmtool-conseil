// src/components/ConsultingChat/frameworks/McKinsey7S.tsx
import { FrameworkMessageParams, FrameworkResponse } from '../types';

const McKinsey7S = {
  name: 'McKinsey 7S Framework',
  
  handleMessage: async (params: FrameworkMessageParams): Promise<FrameworkResponse> => {
    const { messages, enableGrounding, apiEndpoint, authHeaders } = params;
    
    // Build conversation history in the format expected by McKinsey 7S endpoint
    const conversationHistory = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    // McKinsey 7S specific payload
    const requestPayload = {
      messages: conversationHistory,
      enable_grounding: enableGrounding,
      business_context: `McKinsey 7S Framework chat conversation context`,
      temperature: 0.7,
      max_tokens: 2000
    };

    console.log('Sending McKinsey 7S request to:', apiEndpoint);
    console.log('Request payload:', requestPayload);

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('McKinsey 7S API Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log('McKinsey 7S API Response:', data);
    
    // Handle McKinsey 7S-specific response format
    const responseText = data.message?.content || data.response || data.text || 'Sorry, I couldn\'t generate a McKinsey 7S analysis response.';
    
    return {
      message: responseText,
      grounding_enabled: data.grounding_enabled || false,
      sources_used: data.sources_used?.length || 0
    };
  }
};

export default McKinsey7S;