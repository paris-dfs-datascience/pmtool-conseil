// src/pages/ConsultingPage.tsx
import React, { useState } from 'react';
import ConsultingChat from '../components/ConsultingFrameworkChat';
import { Message } from '../components/ConsultingFrameworkChat/types';
import { AuthContext } from '../types/auth';

interface ConsultingPageProps {
  authContext?: AuthContext;
}

const ConsultingPage: React.FC<ConsultingPageProps> = ({ authContext }) => {
  const [messageCount, setMessageCount] = useState(1);

  const handleNewMessage = (message: Message) => {
    setMessageCount(prev => prev + 1);
  };

  return (
    <div className="h-full">
      <ConsultingChat 
        onNewMessage={handleNewMessage}
        firebaseToken={authContext?.firebaseToken || null}
        firebaseUser={authContext?.firebaseUser || null}
        onAuthRequired={authContext?.onAuthRequired || (() => console.log('Auth required'))}
        onSignOut={authContext?.onSignOut || (() => console.log('Sign out'))}
      />
    </div>
  );
};

export default ConsultingPage;