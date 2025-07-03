// src/components/GeneralChats/ClaudeChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, Cloud, Lock, LogOut, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ClaudeChatProps {
  onNewMessage?: (message: Message) => void;
  apiEndpoint?: string;
  placeholder?: string;
  welcomeMessage?: string;
  isLoading?: boolean;
  // Firebase props
  firebaseToken?: string | null;
  firebaseUser?: any;
  onAuthRequired?: () => void;
  onSignOut?: () => void;
}

interface ApiStatus {
  connected: boolean;
  error?: string;
  authRequired?: boolean;
}

const ClaudeChat: React.FC<ClaudeChatProps> = ({
  onNewMessage,
  apiEndpoint = 'https://lma-chat-api-443545551926.us-central1.run.app/claude/chat/claude',
  placeholder = 'Type your message... (Press Enter to send, Shift+Enter for new line)',
  welcomeMessage = 'Hello! I\'m your AI assistant powered by Claude AI running on Google Cloud Run. How can I help you today?',
  isLoading: externalLoading = false,
  firebaseToken,
  firebaseUser,
  onAuthRequired,
  onSignOut
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: welcomeMessage,
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ connected: false });
  const [authStatus, setAuthStatus] = useState<{ verified: boolean; error?: string }>({ verified: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const actualIsLoading = externalLoading || isLoading;

  const baseUrl = 'https://lma-chat-api-443545551926.us-central1.run.app';
  const statusEndpoint = `${baseUrl}/health`; // Use health endpoint (unprotected)
  const authStatusEndpoint = `${baseUrl}/auth/status`; // Use auth status endpoint (unprotected)
  const authVerifyEndpoint = `${baseUrl}/auth/verify`; // Verify token endpoint (protected)
  const chatEndpoint = apiEndpoint;

  useEffect(() => {
    checkApiStatus();
    checkAuthStatus();
  }, [statusEndpoint]);

  useEffect(() => {
    if (firebaseToken) {
      verifyToken();
    }
  }, [firebaseToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 1 && messages[0].id === '1') {
      setMessages([{
        id: '1',
        text: welcomeMessage,
        sender: 'assistant',
        timestamp: new Date()
      }]);
    }
  }, [welcomeMessage]);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (firebaseToken) {
      headers['Authorization'] = `Bearer ${firebaseToken}`;
    }
    
    return headers;
  };

  const checkApiStatus = async () => {
    try {
      const response = await fetch(statusEndpoint);
      if (response.ok) {
        const data = await response.json();
        setApiStatus({
          connected: data.status === 'healthy',
          error: data.status !== 'healthy' ? data.error : undefined
        });
      } else {
        setApiStatus({
          connected: false,
          error: `HTTP ${response.status}`
        });
      }
    } catch (error) {
      setApiStatus({
        connected: false,
        error: 'Cannot connect to server'
      });
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(authStatusEndpoint);
      if (response.ok) {
        const data = await response.json();
        setApiStatus(prev => ({
          ...prev,
          authRequired: data.authentication_enabled
        }));
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
    }
  };

  const verifyToken = async () => {
    if (!firebaseToken) {
      setAuthStatus({ verified: false, error: 'No token provided' });
      return;
    }

    try {
      const response = await fetch(authVerifyEndpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setAuthStatus({ verified: true });
        console.log('Token verified successfully:', data.user);
      } else {
        const errorData = await response.json();
        setAuthStatus({ 
          verified: false, 
          error: errorData.error || 'Token verification failed' 
        });
      }
    } catch (error) {
      setAuthStatus({ 
        verified: false, 
        error: 'Token verification failed' 
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || actualIsLoading) return;

    // Check authentication for protected endpoints
    if (!firebaseToken && apiStatus.authRequired) {
      onAuthRequired?.();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (onNewMessage) {
      onNewMessage(userMessage);
    }

    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      const conversationHistory = [...messages, userMessage].map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messages: conversationHistory,
          temperature: 0.7,
          max_tokens: 4096
        }),
      });

      if (response.status === 401) {
        // Authentication failed
        const errorData = await response.json();
        setAuthStatus({ verified: false, error: errorData.error });
        onAuthRequired?.();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || 'Sorry, I couldn\'t generate a response.',
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (onNewMessage) {
        onNewMessage(assistantMessage);
      }

      setApiStatus(prev => ({ ...prev, connected: true }));

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error && error.message === 'Authentication required' 
          ? 'Authentication required. Please sign in to continue.'
          : 'Sorry, I\'m having trouble connecting to the API. The service might be starting up (this can take a few seconds on first use). Please try again.',
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      if (onNewMessage) {
        onNewMessage(errorMessage);
      }

      setApiStatus(prev => ({
        ...prev,
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }));

    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    await checkApiStatus();
    await checkAuthStatus();
    if (firebaseToken) {
      await verifyToken();
    }
    setIsLoading(false);
  };

  const needsAuth = apiStatus.authRequired && !firebaseToken;
  const authVerified = firebaseToken && authStatus.verified;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Claude Chat Assistant</h2>
            <p className="text-sm text-gray-500 flex items-center">
              <Cloud size={14} className="mr-1" />
              Powered by Claude AI on Cloud Run
            </p>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-2">
            {/* Auth Status */}
            {apiStatus.authRequired && (
              <div className="flex items-center">
                {authVerified ? (
                  <div className="flex items-center text-green-600">
                    <Lock size={16} className="mr-1" />
                    <span className="text-xs">Authenticated</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <Lock size={16} className="mr-1" />
                    <span className="text-xs">Auth Required</span>
                  </div>
                )}
              </div>
            )}

            {/* API Status */}
            {apiStatus.connected ? (
              <div className="flex items-center text-green-600">
                <CheckCircle size={16} className="mr-1" />
                <span className="text-xs">Connected</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <AlertCircle size={16} className="mr-1" />
                <span className="text-xs">Disconnected</span>
              </div>
            )}

            <button
              onClick={testConnection}
              disabled={actualIsLoading}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Test
            </button>
          </div>
        </div>

        {/* User Info */}
        {firebaseUser && (
          <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded p-2">
            <div className="flex items-center">
              {firebaseUser.photoURL && (
                <img 
                  src={firebaseUser.photoURL} 
                  alt="Profile" 
                  className="w-6 h-6 rounded-full mr-2"
                />
              )}
              <div>
                <span className="text-xs text-blue-700 font-medium">
                  {firebaseUser.displayName || firebaseUser.email}
                </span>
                {firebaseUser.email && firebaseUser.displayName && (
                  <div className="text-xs text-blue-600">{firebaseUser.email}</div>
                )}
              </div>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}

        {/* API URL Display */}
        <div className="mt-2 text-xs text-gray-500">
          Mode: Claude Chat | Model: Claude Opus
          {apiStatus.authRequired && (
            <span className="ml-2 text-orange-600">🔐 Auth Required</span>
          )}
        </div>

        {/* Auth Required Warning */}
        {needsAuth && (
          <div className="mt-2 bg-orange-50 border border-orange-200 rounded p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-orange-700 font-medium">
                🔐 Authentication required to use this service
              </span>
              {onAuthRequired && (
                <button
                  onClick={onAuthRequired}
                  className="text-xs px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}

        {/* Auth Error */}
        {firebaseToken && !authStatus.verified && authStatus.error && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
            <span className="text-xs text-red-700">
              Authentication Error: {authStatus.error}
            </span>
          </div>
        )}

        {/* Error Message */}
        {!apiStatus.connected && apiStatus.error && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            Error: {apiStatus.error}
            {apiStatus.error.includes('Cannot connect') && (
              <div className="mt-1 text-gray-600">
                Note: Cloud Run services may take 10-15 seconds to start up from cold start.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="text-sm whitespace-pre-wrap">{children}</p>
                }}
              >
                {message.text}
              </ReactMarkdown>
              <p className={`text-xs mt-2 ${
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {actualIsLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-lg max-w-xs lg:max-w-md">
              <div className="flex items-center space-x-2">
                <Loader2 size={16} className="animate-spin" />
                <p className="text-sm">
                  {apiStatus.connected ? 'Thinking...' : 'Starting service...'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={needsAuth ? "Please sign in to start chatting..." : placeholder}
            className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none min-h-[44px] max-h-32 ${
              needsAuth
                ? 'border-orange-300 focus:ring-orange-500 bg-orange-50'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            rows={1}
            disabled={actualIsLoading || needsAuth}
          />
          <button
            onClick={handleSendMessage}
            disabled={actualIsLoading || !inputText.trim() || needsAuth}
            className={`${
              needsAuth 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600'
            } disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors min-w-[44px] flex items-center justify-center`}
            title={needsAuth ? "Sign in to send messages" : "Send message"}
          >
            {actualIsLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>

        {/* Connection status */}
        <div className="mt-2 text-xs text-gray-500">
          {needsAuth ? (
            'Authentication required - Please sign in to continue'
          ) : actualIsLoading ? (
            apiStatus.connected ? 'Sending message...' : 'Waking up service...'
          ) : (
            apiStatus.connected ? 'Ready to chat' : 'Click Test to check connection'
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaudeChat;