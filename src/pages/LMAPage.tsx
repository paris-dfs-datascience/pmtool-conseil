// src/pages/LMAPage.tsx
import React, { useState } from 'react';
import RAGChatInterface from '../components/RAGChatInterface';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const LMAPage: React.FC = () => {
  const [messageCount, setMessageCount] = useState(1); // Start with 1 for the initial assistant message

  const handleNewMessage = (message: Message) => {
    setMessageCount(prev => prev + 1);
  };

  return (
    <div className="h-full">
      <RAGChatInterface 
        onNewMessage={handleNewMessage}
        welcomeMessage="Hello! I'm your LMA knowledge assistant. I can help you find information from our knowledge base using advanced RAG technology. Ask me anything about LMA policies, procedures, or any other topics in our system."
        placeholder="Ask me anything about LMA... (Press Enter to send, Shift+Enter for new line)"
      />
    </div>
  );
};

export default LMAPage;