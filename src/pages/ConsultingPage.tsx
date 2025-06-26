// src/pages/ConsultingPage.tsx
import React, { useState } from 'react';
import ConsultingChat from '../components/ConsultingFrameworks/ConsultingChat';
import ConsultingFrameworks from '../components/ConsultingFrameworks/ConsultingFrameworks';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  framework?: string;
}

const ConsultingPage: React.FC = () => {
  const [messageCount, setMessageCount] = useState(1); // Start with 1 for the initial assistant message

  const handleNewMessage = (message: Message) => {
    setMessageCount(prev => prev + 1);
  };

  return (
    <div className="flex h-full">
      {/* Chat Interface - 2/3 width */}
      <div className="w-2/3 border-r border-gray-200">
        <ConsultingChat onNewMessage={handleNewMessage} />
      </div>
      
      {/* Frameworks - 1/3 width */}
      <div className="w-1/3">
        <ConsultingFrameworks messageCount={messageCount} />
      </div>
    </div>
  );
};

export default ConsultingPage;