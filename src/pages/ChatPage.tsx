// src/pages/ChatPage.tsx
import React, { useState } from 'react';
import ChatInterface from '../components/ChatInterface';
import ChatHistory from '../components/ChatHistory';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const ChatPage: React.FC = () => {
  const [messageCount, setMessageCount] = useState(1); // Start with 1 for the initial assistant message

  const handleNewMessage = (message: Message) => {
    setMessageCount(prev => prev + 1);
  };

  return (
    <div className="flex h-full">
      {/* Chat Interface - 2/3 width */}
      <div className="w-2/3 border-r border-gray-200">
        <ChatInterface onNewMessage={handleNewMessage} />
      </div>
      
      {/* Chat History - 1/3 width */}
      <div className="w-1/3">
        <ChatHistory currentMessages={messageCount} />
      </div>
    </div>
  );
};

export default ChatPage;