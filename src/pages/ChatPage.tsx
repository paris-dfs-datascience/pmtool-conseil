// src/pages/ChatPage.tsx
import React, { useState } from 'react';
import ChatInterface from '../components/GeneralChats/ChatInterface';
import PromptLibrary from '../components/GeneralChats/PromptLibrary';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const ChatPage: React.FC = () => {
  const [messageCount, setMessageCount] = useState(1); // Start with 1 for the initial assistant message
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  
  const handleNewMessage = (message: Message) => {
    setMessageCount(prev => prev + 1);
    
    // If this is a user message and we have a selected prompt, clear the selection
    if (message.sender === 'user' && selectedPromptId) {
      setSelectedPromptId(null);
    }
  };

  const handlePromptSelect = (prompt: string, promptId: string) => {
    setSelectedPrompt(prompt);
    setSelectedPromptId(promptId);
  };

  const clearSelectedPrompt = () => {
    setSelectedPrompt('');
    setSelectedPromptId(null);
  };

  return (
    <div className="flex h-full">
      {/* Chat Interface - 2/3 width */}
      <div className="w-2/3 border-r border-gray-200">
        <ChatInterface 
          onNewMessage={handleNewMessage}
          selectedPrompt={selectedPrompt}
          onPromptSent={clearSelectedPrompt}
        />
      </div>
      
      {/* Prompt Library - 1/3 width */}
      <div className="w-1/3">
        <PromptLibrary 
          onSelectPrompt={(prompt) => handlePromptSelect(prompt, Date.now().toString())}
          selectedPromptId={selectedPromptId}
        />
      </div>
    </div>
  );
};

export default ChatPage;