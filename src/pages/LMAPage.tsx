// src/pages/LMAPage.tsx
import React, { useState } from 'react';
import RAGChatInterface from '../components/LMARagChat/RAGChatInterface';
import ConsultingPromptLibrary from '../components/LMARagChat/LMAPrompts';
import { AuthContext } from '../types/auth';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface LMAPageProps {
  authContext?: AuthContext;
}

const LMAPage: React.FC<LMAPageProps> = ({ authContext }) => {
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

  // Create a modified authContext if needed, or use the default one
  const chatAuthContext: AuthContext = authContext || {
    firebaseToken: null,
    firebaseUser: null,
    onSignOut: () => {},
    onAuthRequired: () => {}
  };

  return (
    <div className="flex h-full">
      {/* Chat Interface - 2/3 width */}
      <div className="w-2/3 border-r border-gray-200">
        <RAGChatInterface
          onNewMessage={handleNewMessage}
          authContext={chatAuthContext}
          placeholder={
            selectedPrompt 
              ? `Selected prompt: "${selectedPrompt.slice(0, 50)}${selectedPrompt.length > 50 ? '...' : ''}" - Press Enter to send or modify first`
              : 'Ask me anything about LMA... (Press Enter to send, Shift+Enter for new line)'
          }
          welcomeMessage="Hello! I'm your LMA Knowledge Assistant powered by RAG technology. I can help you find information from our knowledge base. Select a prompt from the library or ask me anything!"
        />
      </div>
      
      {/* Prompt Library - 1/3 width */}
      <div className="w-1/3">
        <ConsultingPromptLibrary 
          onSelectPrompt={(prompt) => handlePromptSelect(prompt, Date.now().toString())}
          selectedPromptId={selectedPromptId}
        />
      </div>
    </div>
  );
};

export default LMAPage;