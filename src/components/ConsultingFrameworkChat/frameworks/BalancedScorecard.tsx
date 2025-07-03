// src/components/ConsultingChat/frameworks/BalancedScorecard.tsx
import { FrameworkMessageParams, FrameworkResponse } from '../types';

const BalancedScorecard = {
  name: 'Balanced Scorecard',
  
  handleMessage: async (params: FrameworkMessageParams): Promise<FrameworkResponse> => {
    // Placeholder implementation - will be replaced when backend is ready
    return {
      message: 'Balanced Scorecard framework is coming soon. This will help you track organizational performance across financial, customer, internal process, and learning perspectives.',
      grounding_enabled: false,
      sources_used: 0
    };
  }
};

export default BalancedScorecard;