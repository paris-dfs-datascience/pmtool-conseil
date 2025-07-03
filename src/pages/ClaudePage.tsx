// src/pages/ClaudePage.tsx
import React, { useState } from 'react';
import ClaudeChat from '../components/GeneralChats/ClaudeChat';
import { AuthContext } from '../types/auth';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ClaudePageProps {
  authContext?: AuthContext;
}

const ClaudePage: React.FC<ClaudePageProps> = ({ authContext }) => {
  const [messageCount, setMessageCount] = useState(1); // Start with 1 for the initial assistant message

  const handleNewMessage = (message: Message) => {
    setMessageCount(prev => prev + 1);
  };

  return (
    <div className="h-full">
      <ClaudeChat
        onNewMessage={handleNewMessage}
        welcomeMessage="Hello! I'm Claude, your AI assistant powered by Anthropic. How can I help you today?"
        placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
        
        // Pass Firebase auth props to ClaudeChat
        firebaseToken={authContext?.firebaseToken}
        firebaseUser={authContext?.firebaseUser}
        onAuthRequired={authContext?.onAuthRequired}
        onSignOut={authContext?.onSignOut}
      />
    </div>
  );
};

export default ClaudePage;