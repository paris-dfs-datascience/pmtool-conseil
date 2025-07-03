// src/components/ConsultingChat/index.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, Cloud, Settings, Lock, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Import framework components
import SWOTAnalysis from './frameworks/SWOTAnalysis';
import PortersFiveForces from './frameworks/PortersFiveForces';
import McKinsey7S from './frameworks/McKinsey7S';
import BalancedScorecard from './frameworks/BalancedScorecard';
import RootCauseAnalysis from './frameworks/RootCauseAnalysis';
import IssueTree from './frameworks/IssueTree';
import UseCaseFramework from './frameworks/UseCaseFramework';


// Import types and utilities
import { Message, ConsultingChatProps, Framework } from './types';
import { useAuth } from '../../hooks/useAuth'; // Use the main app's useAuth hook
import { useApiStatus } from './hooks/useApiStatus';
import FrameworkSelector from './components/FrameworkSelector';

// Framework registry
const frameworks: Record<string, Framework> = {
  'SWOT Analysis': {
    name: 'SWOT Analysis',
    component: SWOTAnalysis,
    endpoint: '/frameworks/consulting/swot/chat',
    supportsGrounding: true,
    isImplemented: true,
    description: 'A strategic planning technique that evaluates internal Strengths and Weaknesses alongside external Opportunities and Threats. It provides a comprehensive view of an organization\'s strategic position in the market.'
  },
  'Use Case Framework': {
  endpoint: '/frameworks/consulting/use_case/chat', // Add this
  name: 'Use Case Framework',
  component: UseCaseFramework,
  supportsGrounding: true,
  isImplemented: true,
  description: 'LMA built use case framework for AI initiatives.'
},
  'Porter\'s Five Forces': {
    name: 'Porter\'s Five Forces',
    component: PortersFiveForces,
    endpoint: '/frameworks/porters/chat',
    supportsGrounding: true,
    isImplemented: false,
    description: 'A framework for analyzing industry competitiveness and profitability potential. It evaluates five key forces: competitive rivalry, supplier power, buyer power, threat of substitutes, and barriers to entry.'
  },
  'McKinsey 7S Framework': {
    name: 'McKinsey 7S Framework',
    component: McKinsey7S,
    endpoint: '/frameworks/mckinsey_7s/chat',
    supportsGrounding: true,
    isImplemented: true,
    description: 'A holistic model for analyzing organizational effectiveness through seven interconnected elements. It examines both hard elements (Strategy, Structure, Systems) and soft elements (Shared Values, Style, Staff, Skills).'
  },
  'Balanced Scorecard': {
    name: 'Balanced Scorecard',
    component: BalancedScorecard,
    endpoint: '/frameworks/balanced-scorecard/chat',
    supportsGrounding: false,
    isImplemented: false,
    description: 'A performance measurement framework that tracks organizational success across four perspectives: Financial, Customer, Internal Business Processes, and Learning & Growth.'
  },
  'Root Cause Analysis (5 Whys)': {
    name: 'Root Cause Analysis (5 Whys)',
    component: RootCauseAnalysis,
    endpoint: '/frameworks/root-cause/chat',
    supportsGrounding: false,
    isImplemented: false,
    description: 'A problem-solving technique that identifies the underlying cause of issues by repeatedly asking "why" until the root cause is discovered.'
  },
  'Issue Tree/Logic Tree': {
    name: 'Issue Tree/Logic Tree',
    component: IssueTree,
    endpoint: '/frameworks/issue-tree/chat',
    supportsGrounding: false,
    isImplemented: false,
    description: 'A structured problem-solving approach that breaks complex problems into smaller, manageable components in a hierarchical tree structure.'
  }
};

const ConsultingChat: React.FC<ConsultingChatProps> = ({
  onNewMessage,
  apiEndpoint,
  placeholder = 'Type your message... (Press Enter to send, Shift+Enter for new line)',
  welcomeMessage = 'Hello! I\'m your AI consulting assistant with real-time market research capabilities. Select a framework to get started with expert strategic analysis!',
  isLoading: externalLoading = false,
  selectedFramework: propSelectedFramework,
  onFrameworkSelect,
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
  const [selectedFramework, setSelectedFramework] = useState<string>(propSelectedFramework || '');
  const [showFrameworkSelector, setShowFrameworkSelector] = useState(false);
  const [availableFrameworks, setAvailableFrameworks] = useState<Framework[]>(Object.values(frameworks));
  const [enableGrounding, setEnableGrounding] = useState(true);
  const [apiStatus, setApiStatus] = useState<{
    connected: boolean;
    authRequired: boolean;
    error?: string;
    frameworksAvailable?: number;
  }>({ connected: false, authRequired: false });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use the main app's useAuth hook
  const { user, loading: authLoading, isAuthorized } = useAuth();
  const { checkApiStatus, checkAuthRequired } = useApiStatus();

  const actualIsLoading = externalLoading || isLoading;
  const API_BASE = process.env.REACT_APP_BACKEND_API || 'https://lma-chat-api-443545551926.us-central1.run.app';

  // Helper function to get auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (firebaseToken) {
      headers['Authorization'] = `Bearer ${firebaseToken}`;
    }
    
    return headers;
  };

  // Get current framework configuration
  const currentFramework = selectedFramework ? frameworks[selectedFramework] : null;
  const chatEndpoint = currentFramework 
    ? `${API_BASE}${currentFramework.endpoint}`
    : apiEndpoint || `${API_BASE}/basic/chat`;

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        const apiResult = await checkApiStatus();
        const authRequired = await checkAuthRequired();
        setApiStatus({ 
          connected: apiResult.connected,
          authRequired,
          error: apiResult.error
        });
        await fetchAvailableFrameworks();
      } catch (error) {
        console.error('Failed to initialize component:', error);
        setApiStatus({
          connected: false,
          authRequired: false,
          error: 'Initialization failed'
        });
      }
    };
    
    initializeComponent();
  }, [checkApiStatus, checkAuthRequired]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (propSelectedFramework !== undefined) {
      setSelectedFramework(propSelectedFramework);
    }
  }, [propSelectedFramework]);

  const fetchAvailableFrameworks = async () => {
    try {
      const headers = firebaseToken ? getAuthHeaders() : {};
      const response = await fetch(`${API_BASE}/frameworks/consulting/list`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        const backendFrameworks = Object.values(data.available_frameworks || {}) as any[];
        
        if (backendFrameworks.length > 0) {
          // Merge backend data with our framework registry
          const updatedFrameworks = Object.values(frameworks).map(framework => {
            const backendMatch = backendFrameworks.find((bf: any) => bf.name === framework.name);
            if (backendMatch && typeof backendMatch === 'object') {
              return {
                ...framework,
                ...backendMatch,
                isImplemented: true
              };
            }
            return framework;
          });
          setAvailableFrameworks(updatedFrameworks);
        }
      }
    } catch (error) {
      console.warn('Could not fetch frameworks from backend, using default list:', error);
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
      timestamp: new Date(),
      framework: selectedFramework || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    if (onNewMessage) {
      onNewMessage(userMessage);
    }

    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      // If we have a specific framework selected, use its component's handler
      if (currentFramework && currentFramework.component) {
        const FrameworkComponent = currentFramework.component;
        
        // Use the framework's specific message handler
        const response = await FrameworkComponent.handleMessage({
          messages: [...messages, userMessage],
          enableGrounding: enableGrounding && currentFramework.supportsGrounding,
          apiEndpoint: chatEndpoint,
          authHeaders: getAuthHeaders()
        });

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.message,
          sender: 'assistant',
          timestamp: new Date(),
          framework: selectedFramework,
          grounding_enabled: response.grounding_enabled,
          sources_used: response.sources_used
        };

        setMessages(prev => [...prev, assistantMessage]);
        if (onNewMessage) {
          onNewMessage(assistantMessage);
        }
      } else {
        // Fallback to basic chat
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
          onAuthRequired?.();
          throw new Error('Authentication required');
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const responseText = data.message?.content || data.response || data.text || 'Sorry, I couldn\'t generate a response.';
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          sender: 'assistant',
          timestamp: new Date(),
          framework: selectedFramework || undefined
        };

        setMessages(prev => [...prev, assistantMessage]);
        if (onNewMessage) {
          onNewMessage(assistantMessage);
        }
      }

    } catch (error) {
      console.error('Message send error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error && error.message === 'Authentication required' 
          ? 'Authentication required. Please sign in to continue.'
          : `Sorry, I'm having trouble connecting to the API. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      if (onNewMessage) {
        onNewMessage(errorMessage);
      }

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

  const handleFrameworkSelect = (frameworkName: string) => {
    if (!firebaseToken && apiStatus.authRequired) {
      onAuthRequired?.();
      return;
    }

    setSelectedFramework(frameworkName);
    setShowFrameworkSelector(false);
    if (onFrameworkSelect) {
      onFrameworkSelect(frameworkName);
    }
    
    const framework = frameworks[frameworkName];
    const frameworkMessage: Message = {
      id: Date.now().toString(),
      text: `🎯 Switched to **${frameworkName}** framework. I'm now ready to provide specialized analysis and guidance using this methodology. ${enableGrounding && framework?.supportsGrounding ? 'Real-time market research is enabled.' : ''}`,
      sender: 'assistant',
      timestamp: new Date(),
      framework: frameworkName
    };
    
    setMessages(prev => [...prev, frameworkMessage]);
  };

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const apiResult = await checkApiStatus();
      const authRequired = await checkAuthRequired();
      
      setApiStatus({ 
        connected: apiResult.connected,
        authRequired,
        error: apiResult.error
      });
      await fetchAvailableFrameworks();
    } catch (error) {
      console.error('Test connection failed:', error);
      setApiStatus({
        connected: false,
        authRequired: false,
        error: 'Connection test failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const needsAuth = apiStatus.authRequired && !firebaseToken;
  const userIsAuthenticated = user && isAuthorized && firebaseToken;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Consulting Framework Assistant</h2>
            <p className="text-sm text-gray-500 flex items-center">
              <Cloud size={14} className="mr-1" />
              Powered by Gemini AI with Real-time Market Research
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
                <span className="text-xs">
                  Connected ({availableFrameworks.filter(f => f.isImplemented).length} frameworks)
                </span>
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

        {/* Framework Selection */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (!firebaseToken && apiStatus.authRequired) {
                  onAuthRequired?.();
                  return;
                }
                setShowFrameworkSelector(!showFrameworkSelector);
              }}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Settings size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {selectedFramework || 'Select Framework'}
              </span>
            </button>
            
            {selectedFramework && (
              <>
                <button
                  onClick={() => {
                    setSelectedFramework('');
                    if (onFrameworkSelect) onFrameworkSelect('');
                  }}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Clear
                </button>
                
                {currentFramework?.supportsGrounding && (
                  <label className="flex items-center space-x-1 text-xs">
                    <input
                      type="checkbox"
                      checked={enableGrounding}
                      onChange={(e) => setEnableGrounding(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-gray-600">Real-time data</span>
                  </label>
                )}
              </>
            )}
          </div>
        </div>

        {/* Model Display */}
        <div className="mt-2 text-xs text-gray-500">
          Model: Gemini Pro 2.0
          {selectedFramework && ` | Framework: ${selectedFramework}`}
          {enableGrounding && currentFramework?.supportsGrounding && ' | Grounding: ON'}
          {apiStatus.authRequired && (
            <span className="ml-2 text-orange-600">🔐 Auth Required</span>
          )}
        </div>

        {/* Auth Required Warning */}
        {needsAuth && (
          <div className="mt-2 bg-orange-50 border border-orange-200 rounded p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-orange-700 font-medium">
                🔐 Authentication required to use consulting frameworks
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
            <div className="mt-1 text-gray-600">
              Make sure your backend is running on {API_BASE}
            </div>
          </div>
        )}
      </div>

      {/* Framework Selector */}
      {showFrameworkSelector && (
        <FrameworkSelector
          frameworks={availableFrameworks}
          selectedFramework={selectedFramework}
          onFrameworkSelect={handleFrameworkSelect}
          needsAuth={needsAuth}
        />
      )}

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
              {message.framework && (
                <div className={`text-xs mb-2 px-2 py-1 rounded flex items-center justify-between ${
                  message.sender === 'user' 
                    ? 'bg-blue-400 text-blue-100' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  <span>📊 {message.framework}</span>
                  {message.grounding_enabled && (
                    <span className="flex items-center ml-2">
                      <Cloud size={10} className="mr-1" />
                      {message.sources_used || 0}
                    </span>
                  )}
                </div>
              )}
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="text-sm whitespace-pre-wrap">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>
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
                  {selectedFramework 
                    ? `Analyzing with ${selectedFramework}${enableGrounding && currentFramework?.supportsGrounding ? ' + real-time data' : ''}...`
                    : apiStatus.connected ? 'Thinking...' : 'Starting service...'
                  }
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
            placeholder={
              needsAuth ? "Please sign in to start chatting..." :
              selectedFramework 
                ? `Ask about ${selectedFramework} analysis...`
                : placeholder
            }
            className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none min-h-[44px] max-h-32 ${
              needsAuth
                ? 'border-orange-300 focus:ring-orange-500 bg-orange-50'
                : selectedFramework
                ? 'border-blue-300 focus:ring-blue-500 bg-blue-50'
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
            selectedFramework 
              ? `Processing with ${selectedFramework}...`
              : apiStatus.connected ? 'Sending message...' : 'Waking up service...'
          ) : (
            <>
              {apiStatus.connected 
                ? `Ready to chat${selectedFramework ? ` • ${selectedFramework} active` : ''}`
                : 'Click Test to check connection'
              }
              {enableGrounding && currentFramework?.supportsGrounding && ' • Real-time data enabled'}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsultingChat;