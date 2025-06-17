// src/pages/LMAPage.tsx
import React, { useState } from 'react';
import ConsultingPitchGenerator from '../components/GraphiteChat';

interface PitchResponse {
  id: string;
  type: 'pitch' | 'custom';
  jobDescription?: string;
  customQuestion?: string;
  response: string;
  timestamp: Date;
  characterCount?: number;
  wordCount?: number;
}

const GraphitePage: React.FC = () => {
  const [responseCount, setResponseCount] = useState(0);

  const handleNewResponse = (response: PitchResponse) => {
    setResponseCount(prev => prev + 1);
  };

  return (
    <div className="h-full">
      <ConsultingPitchGenerator />
    </div>
  );
};

export default GraphitePage;