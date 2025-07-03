import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, Database, Search, Bot, User, Lock, LogOut, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth'; // Use the main app's useAuth hook

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export interface AuthContext {
  firebaseToken: string | null;
  firebaseUser: any;
  onSignOut: () => void;
  onAuthRequired: () => void;
}

interface RAGChatInterfaceProps {
  onNewMessage?: (message: Message) => void;
  placeholder?: string;
  welcomeMessage?: string;
  isLoading?: boolean;
  authContext: AuthContext;
}

interface ApiStatus {
  connected: boolean;
  error?: string;
  authRequired?: boolean;
}

// Helper function to format text with proper spacing and structure
const formatMessageText = (text: string): React.ReactNode => {
  // Split by double newlines to identify paragraphs
  const paragraphs = text.split(/\n\n+/);
  
  return paragraphs.map((paragraph, index) => {
    // Check if this paragraph is a list (starts with - or * or number.)
    const isUnorderedList = paragraph.includes('\n-') || paragraph.includes('\n*') || 
                           paragraph.startsWith('-') || paragraph.startsWith('*');
    const isOrderedList = /^\d+\./.test(paragraph) || /\n\d+\./.test(paragraph);
    
    if (isUnorderedList || isOrderedList) {
      // Split list items
      const items = paragraph.split('\n').filter(item => item.trim());
      return (
        <ul key={index} className={isOrderedList ? "list-decimal" : "list-disc"} 
            style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
          {items.map((item, itemIndex) => {
            // Remove list markers
            const cleanedItem = item.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '');
            return <li key={itemIndex} className="mb-1">{cleanedItem}</li>;
          })}
        </ul>
      );
    }
    
    // Check if it's a heading (starts with # or is in all caps)
    const isHeading = paragraph.startsWith('#') || 
                     (paragraph.length < 100 && paragraph === paragraph.toUpperCase());
    
    if (isHeading) {
      const headingText = paragraph.replace(/^#+\s*/, '');
      return (
        <h3 key={index} className="font-semibold text-base mb-2 mt-3">
          {headingText}
        </h3>
      );
    }
    
    // Check for code blocks (enclosed in backticks)
    if (paragraph.includes('```') || paragraph.includes('`')) {
      const codeFormatted = paragraph.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre class="bg-gray-800 text-gray-100 p-3 rounded-md overflow-x-auto mb-3"><code>${code.trim()}</code></pre>`;
      });
      
      // Replace inline code
      const inlineFormatted = codeFormatted.replace(/`([^`]+)`/g, 
        '<code class="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-sm">$1</code>');
      
      return (
        <div key={index} dangerouslySetInnerHTML={{ __html: inlineFormatted }} />
      );
    }
    
    // Regular paragraph - split by single newlines for line breaks
    const lines = paragraph.split('\n');
    return (
      <p key={index} className="mb-3 leading-relaxed">
        {lines.map((line, lineIndex) => (
          <React.Fragment key={lineIndex}>
            {line}
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
};

// Message component with better formatting
const MessageContent: React.FC<{ text: string; sender: 'user' | 'assistant' }> = ({ text, sender }) => {
  if (sender === 'user') {
    // User messages can be simpler
    return <p className="text-sm whitespace-pre-wrap">{text}</p>;
  }
  
  // Assistant messages get full formatting
  return <div className="text-sm space-y-2">{formatMessageText(text)}</div>;
};

const RAGChatInterface: React.FC<RAGChatInterfaceProps> = ({ 
  onNewMessage,
  placeholder = 'Ask me anything about LMA... (Press Enter to send, Shift+Enter for new line)',
  welcomeMessage = 'Hello! I\'m your LMA Knowledge Assistant powered by RAG technology. I can help you find information from our knowledge base. What would you like to know?',
  isLoading: externalLoading = false,
  authContext
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
  const [searchMode, setSearchMode] = useState<'chat' | 'search'>('chat');
  const [temperature, setTemperature] = useState(0.7);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use the main app's useAuth hook
  const { user, loading: authLoading, isAuthorized } = useAuth();

  // Destructure authContext
  const { firebaseToken, firebaseUser, onSignOut, onAuthRequired } = authContext;

  // Use external loading state if provided, otherwise use internal state
  const actualIsLoading = externalLoading || isLoading;

  // RAG API endpoints
  const baseUrl = 'https://lma-chat-api-443545551926.us-central1.run.app';
  const statusEndpoint = `${baseUrl}/health`;
  const authStatusEndpoint = `${baseUrl}/auth/status`;
  const chatEndpoint = `${baseUrl}/rag_chat/chat`; // Fixed: use rag_chat prefix
  const searchEndpoint = `${baseUrl}/rag_chat/search`; // Fixed: use rag_chat prefix

  // Check API status on component mount
  useEffect(() => {
    checkApiStatus();
    checkAuthStatus();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update welcome message when prop changes
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
      console.log(`🔍 Checking RAG API status at: ${statusEndpoint}`);
      const response = await fetch(statusEndpoint);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ RAG API Status Response:', data);
        setApiStatus({ 
          connected: data.status === 'healthy',
          error: data.status !== 'healthy' ? data.error : undefined
        });
      } else {
        console.error(`❌ RAG Status check failed: HTTP ${response.status}`);
        setApiStatus({ 
          connected: false, 
          error: `HTTP ${response.status}` 
        });
      }
    } catch (error) {
      console.error('❌ RAG Status check error:', error);
      setApiStatus({ 
        connected: false, 
        error: 'Cannot connect to RAG server' 
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

  // Helper function to clean and format the response from the backend
  const cleanAndFormatResponse = (response: string): string => {
    // Remove excessive whitespace
    let cleaned = response.trim();
    
    // Fix bullet point formatting - convert * to proper bullets
    cleaned = cleaned.replace(/^\* /gm, '• ');
    cleaned = cleaned.replace(/\n\* /g, '\n• ');
    
    // Fix nested bullet points (convert * * to proper indentation)
    cleaned = cleaned.replace(/\n• \* /g, '\n  • ');
    cleaned = cleaned.replace(/^\* \* /gm, '  • ');
    
    // Add proper spacing around section headers (lines that end with colons)
    cleaned = cleaned.replace(/^([A-Za-z][^:\n]*:)$/gm, '\n## $1\n');
    
    // Format headings better (standalone words followed by newlines and bullets)
    cleaned = cleaned.replace(/^([A-Z][A-Za-z\s]+)\n(• )/gm, '\n## $1\n\n$2');
    
    // Add double newlines before major sections
    cleaned = cleaned.replace(/(However,|Additionally,|Furthermore,|In conclusion,|For example,|Note:|Important:)/gi, '\n\n$1');
    
    // Ensure proper spacing between sentences
    cleaned = cleaned.replace(/\.(?=[A-Z])/g, '. ');
    
    // Clean up excessive newlines but preserve intentional breaks
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
    cleaned = cleaned.replace(/\n{2}(• )/g, '\n$1');
    
    // Remove leading newlines
    cleaned = cleaned.replace(/^\n+/, '');
    
    // Add spacing between major sections
    cleaned = cleaned.replace(/\n## /g, '\n\n## ');
    
    return cleaned;
  };

  const handleRAGChat = async (userMessage: string) => {
    try {
      // Prepare conversation history for chat mode
      const conversationHistory = [...messages, { id: Date.now().toString(), text: userMessage, sender: 'user' as const, timestamp: new Date() }].map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      console.log(`🚀 Sending RAG chat to: ${chatEndpoint}`);
      
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messages: conversationHistory,
          temperature: temperature,
          max_tokens: 4096
        }),
      });

      if (response.status === 401) {
        // Authentication failed
        onAuthRequired();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ RAG Chat response received:', data);
      
      // Clean and format the response before returning
      const formattedResponse = cleanAndFormatResponse(data.response || 'Sorry, I couldn\'t generate a response from the knowledge base.');
      return formattedResponse;
    } catch (error) {
      console.error('❌ Error calling RAG chat API:', error);
      throw error;
    }
  };

  const handleRAGSearch = async (query: string) => {
    try {
      console.log(`🔍 Sending RAG search to: ${searchEndpoint}`);
      
      const response = await fetch(searchEndpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          query: query,
          top_k: 10
        }),
      });

      if (response.status === 401) {
        // Authentication failed
        onAuthRequired();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ RAG Search response received:', data);
      
      // Clean and format the response before returning
      const formattedResponse = cleanAndFormatResponse(data.response || 'No results found for your search.');
      return formattedResponse;
    } catch (error) {
      console.error('❌ Error calling RAG search API:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || actualIsLoading) return;

    // Check authentication for protected endpoints
    if (!firebaseToken && apiStatus.authRequired) {
      onAuthRequired();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    
    // Call the callback to update chat history
    if (onNewMessage) {
      onNewMessage(userMessage);
    }

    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      let responseText: string;
      
      if (searchMode === 'chat') {
        responseText = await handleRAGChat(currentInput);
      } else {
        responseText = await handleRAGSearch(currentInput);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (onNewMessage) {
        onNewMessage(assistantMessage);
      }

      // Update API status to connected on successful response
      setApiStatus(prev => ({ ...prev, connected: true }));

    } catch (error) {
      console.error('❌ Error in RAG operation:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error && error.message === 'Authentication required' 
          ? 'Authentication required. Please sign in to continue.'
          : 'Sorry, I\'m having trouble accessing the knowledge base. The service might be starting up. Please try again.',
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      if (onNewMessage) {
        onNewMessage(errorMessage);
      }

      // Update API status
      setApiStatus(prev => ({ 
        ...prev,
        connected: false, 
        error: error instanceof Error ? error.message : 'RAG connection failed' 
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
    setIsLoading(false);
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        text: welcomeMessage,
        sender: 'assistant',
        timestamp: new Date()
      }
    ]);
  };

  const needsAuth = apiStatus.authRequired && !firebaseToken;
  const userIsAuthenticated = user && isAuthorized && firebaseToken;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Database size={20} className="mr-2 text-blue-600" />
              LMA Knowledge Assistant
            </h2>
            <p className="text-sm text-gray-500 flex items-center">
              <Bot size={14} className="mr-1" />
              Powered by RAG + Gemini AI on Cloud Run
            </p>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center space-x-2">
            {/* Auth Status */}
            {apiStatus.authRequired && (
              <div className="flex items-center">
                {userIsAuthenticated ? (
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

        {/* Mode and Controls */}
        <div className="mt-3 flex items-center justify-between">
          {/* Search Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSearchMode('chat')}
              disabled={needsAuth}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center ${
                searchMode === 'chat'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : needsAuth
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Bot size={14} className="mr-1" />
              Chat
            </button>
            <button
              onClick={() => setSearchMode('search')}
              disabled={needsAuth}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center ${
                searchMode === 'search'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : needsAuth
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Search size={14} className="mr-1" />
              Search
            </button>
          </div>

          {/* Temperature Control */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Temp:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              disabled={needsAuth}
              className="w-16"
            />
            <span className="text-sm text-gray-600 w-8">{temperature}</span>
            
            <button
              onClick={clearChat}
              disabled={needsAuth}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                needsAuth
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Mode Description */}
        <div className="mt-2 text-sm text-gray-600">
          {searchMode === 'chat' ? (
            <p>💬 <strong>Chat Mode:</strong> Conversational RAG with context and memory</p>
          ) : (
            <p>🔍 <strong>Search Mode:</strong> Direct knowledge base search queries</p>
          )}
        </div>
        
        {/* API URL Display */}
        <div className="mt-2 text-xs text-gray-500">
          API: LMA Knowledge Base with Gemini Pro 2.0
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
        {firebaseToken && user && !isAuthorized && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
            <span className="text-xs text-red-700">
              Access Denied: Your account is not authorized for this application
            </span>
          </div>
        )}
        
        {/* Error Message */}
        {!apiStatus.connected && apiStatus.error && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            Error: {apiStatus.error}
            {apiStatus.error.includes('Cannot connect') && (
              <div className="mt-1 text-gray-600">
                Note: RAG services may take 10-15 seconds to start up from cold start.
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
              className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.sender === 'assistant' && (
                  <Database size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                )}
                {message.sender === 'user' && (
                  <User size={16} className="text-white mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <MessageContent text={message.text} sender={message.sender} />
                  <p className={`text-xs mt-2 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {actualIsLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-lg max-w-xs lg:max-w-md">
              <div className="flex items-center space-x-2">
                <Database size={16} className="text-blue-600" />
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <p className="text-sm">
                  {searchMode === 'chat' ? 'Thinking with knowledge base...' : 'Searching knowledge base...'}
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
            ) : searchMode === 'chat' ? (
              <Send size={20} />
            ) : (
              <Search size={20} />
            )}
          </button>
        </div>
        
        {/* Connection status */}
        <div className="mt-2 text-xs text-gray-500">
          {needsAuth ? (
            'Authentication required - Please sign in to continue'
          ) : actualIsLoading ? 
            (apiStatus.connected ? 
              (searchMode === 'chat' ? 'Processing with RAG...' : 'Searching knowledge base...') : 
              'Waking up RAG service...') : 
            apiStatus.connected ? 'Ready for knowledge queries' : 
            'Click Test to check RAG connection'
          }
        </div>
      </div>
    </div>
  );
};

export default RAGChatInterface;