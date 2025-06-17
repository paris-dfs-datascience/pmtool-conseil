// src/components/ChatHistory.tsx
import React, { useState } from 'react';
import { Clock, MessageCircle } from 'lucide-react';


interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

interface ChatHistoryProps {
  currentMessages?: number;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ currentMessages = 0 }) => {
  const [chatSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'Project Planning Discussion',
      lastMessage: 'Let me help you with that project timeline...',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      messageCount: 15
    },
    {
      id: '2',
      title: 'Code Review Questions',
      lastMessage: 'Here are some suggestions for your React component...',
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
      messageCount: 8
    },
    {
      id: '3',
      title: 'Design System Help',
      lastMessage: 'For your design system, I recommend...',
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      messageCount: 23
    },
    {
      id: '4',
      title: 'Firebase Integration',
      lastMessage: 'The Firebase setup looks good. Just make sure...',
      timestamp: new Date(Date.now() - 172800000), // 2 days ago
      messageCount: 12
    }
  ]);

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      {/* History Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <h3 className="text-lg font-semibold text-gray-800">Chat History</h3>
        {currentMessages > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Current: {currentMessages} messages
          </p>
        )}
      </div>

      {/* Chat Sessions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Current Session */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-blue-800">Current Session</h4>
            <div className="flex items-center text-blue-600">
              <MessageCircle size={14} className="mr-1" />
              <span className="text-xs">{currentMessages}</span>
            </div>
          </div>
          <p className="text-sm text-blue-600">Active conversation...</p>
          <div className="flex items-center mt-2 text-xs text-blue-500">
            <Clock size={12} className="mr-1" />
            <span>Now</span>
          </div>
        </div>

        {/* Previous Sessions */}
        {chatSessions.map((session) => (
          <div
            key={session.id}
            className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-800 truncate">{session.title}</h4>
              <div className="flex items-center text-gray-500">
                <MessageCircle size={14} className="mr-1" />
                <span className="text-xs">{session.messageCount}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 truncate">{session.lastMessage}</p>
            <div className="flex items-center mt-2 text-xs text-gray-400">
              <Clock size={12} className="mr-1" />
              <span>{session.timestamp.toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatHistory;