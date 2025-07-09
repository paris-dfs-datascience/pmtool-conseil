// src/pages/ClaudeCodeAssistantPage.tsx
import React, { useState } from 'react';
import ClaudeCodeAssistant from '../components/ClaudeAssistant';
import { AuthContext } from '../types/auth';

interface ClaudeCodeAssistantPageProps {
  authContext: AuthContext;
}

const ClaudeCodeAssistantPage: React.FC<ClaudeCodeAssistantPageProps> = ({ authContext }) => {
  const [messageCount, setMessageCount] = useState(1); // Start with 1 for the initial assistant message
  const [sessionStats, setSessionStats] = useState({
    filesCreated: 0,
    pullRequestsCreated: 0,
    codeBlocksGenerated: 0,
    repositoriesAccessed: 0
  });

  const handleNewMessage = (message: any) => {
    setMessageCount(prev => prev + 1);
    
    // Update session statistics
    if (message.sender === 'assistant') {
      if (message.codeBlocks && message.codeBlocks.length > 0) {
        setSessionStats(prev => ({
          ...prev,
          codeBlocksGenerated: prev.codeBlocksGenerated + message.codeBlocks!.length
        }));
      }
      
      if (message.githubAction) {
        switch (message.githubAction.type) {
          case 'create_file':
            if (message.githubAction.status === 'completed') {
              setSessionStats(prev => ({
                ...prev,
                filesCreated: prev.filesCreated + 1
              }));
            }
            break;
          case 'create_pr':
            if (message.githubAction.status === 'completed') {
              setSessionStats(prev => ({
                ...prev,
                pullRequestsCreated: prev.pullRequestsCreated + 1
              }));
            }
            break;
        }
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Optional: Session Stats Header */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-6">
            <span>Session: {messageCount} messages</span>
            <span>Code blocks: {sessionStats.codeBlocksGenerated}</span>
            <span>Files created: {sessionStats.filesCreated}</span>
            <span>PRs created: {sessionStats.pullRequestsCreated}</span>
          </div>
          <div className="text-xs">
            Claude Code Assistant • Powered by Claude Sonnet
            {authContext.firebaseUser && (
              <span className="ml-2 text-green-600">
                • {authContext.firebaseUser.displayName || authContext.firebaseUser.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Code Assistant Component */}
      <div className="flex-1">
        <ClaudeCodeAssistant 
          onNewMessage={handleNewMessage}
          apiEndpoint="https://lma-chat-api-443545551926.us-central1.run.app/claude_assistant"
          authContext={authContext}
        />
      </div>
    </div>
  );
};

export default ClaudeCodeAssistantPage;