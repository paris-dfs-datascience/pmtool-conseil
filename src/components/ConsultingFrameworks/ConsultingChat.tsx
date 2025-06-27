import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, Cloud, Settings } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Framework data matching your backend
const consultingFrameworks = [
  {
    name: 'SWOT Analysis',
    description: 'A strategic planning technique that evaluates internal Strengths and Weaknesses alongside external Opportunities and Threats. It provides a comprehensive view of an organization\'s strategic position in the market.'
  },
  {
    name: 'Porter\'s Five Forces',
    description: 'A framework for analyzing industry competitiveness and profitability potential. It evaluates five key forces: competitive rivalry, supplier power, buyer power, threat of substitutes, and barriers to entry.'
  },
  {
    name: 'McKinsey 7S Framework',
    description: 'A holistic model for analyzing organizational effectiveness through seven interconnected elements. It examines both hard elements (Strategy, Structure, Systems) and soft elements (Shared Values, Style, Staff, Skills).'
  },
  {
    name: 'Balanced Scorecard',
    description: 'A performance measurement framework that tracks organizational success across four perspectives: Financial, Customer, Internal Business Processes, and Learning & Growth.'
  },
  {
    name: 'Root Cause Analysis (5 Whys)',
    description: 'A problem-solving technique that identifies the underlying cause of issues by repeatedly asking "why" until the root cause is discovered.'
  },
  {
    name: 'Issue Tree/Logic Tree',
    description: 'A structured problem-solving approach that breaks complex problems into smaller, manageable components in a hierarchical tree structure.'
  }
];

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  framework?: string;
  grounding_enabled?: boolean;
  sources_used?: number;
}

interface ConsultingChatProps {
  onNewMessage?: (message: Message) => void;
  apiEndpoint?: string;
  placeholder?: string;
  welcomeMessage?: string;
  isLoading?: boolean;
  selectedFramework?: string;
  onFrameworkSelect?: (framework: string) => void;
}

interface ApiStatus {
  connected: boolean;
  error?: string;
  frameworksAvailable?: number;
}

const ConsultingChat: React.FC<ConsultingChatProps> = ({
  onNewMessage,
  apiEndpoint,
  placeholder = 'Type your message... (Press Enter to send, Shift+Enter for new line)',
  welcomeMessage = 'Hello! I\'m your AI consulting assistant with real-time market research capabilities. Select a framework to get started with expert strategic analysis!',
  isLoading: externalLoading = false,
  selectedFramework: propSelectedFramework,
  onFrameworkSelect
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
  const [selectedFramework, setSelectedFramework] = useState<string>(propSelectedFramework || '');
  const [hoveredFramework, setHoveredFramework] = useState<string>('');
  const [showFrameworkSelector, setShowFrameworkSelector] = useState(false);
  const [availableFrameworks, setAvailableFrameworks] = useState(consultingFrameworks);
  const [enableGrounding, setEnableGrounding] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const actualIsLoading = externalLoading || isLoading;

  // Fixed API configuration - Updated to match your BACKEND_API variable
  const API_BASE = process.env.REACT_APP_BACKEND_API || 'https://lma-chat-api-443545551926.us-central1.run.app';
  
  // Debug environment variables
  console.log('ConsultingChat Environment Debug:', {
    REACT_APP_BACKEND_API: process.env.REACT_APP_BACKEND_API,
    BACKEND_API: process.env.BACKEND_API,
    NODE_ENV: process.env.NODE_ENV,
    API_BASE_RESOLVED: API_BASE
  });
  
  const statusEndpoint = `${API_BASE}/frameworks/frameworks/status`;
  
  // Determine chat endpoint based on selected framework
  const getChatEndpoint = () => {
    if (!selectedFramework) {
      return apiEndpoint || `${API_BASE}/basic/chat`;
    }
    
    // Map framework names to correct API endpoints based on your backend
    const frameworkEndpoints: Record<string, string> = {
      'SWOT Analysis': `${API_BASE}/frameworks/swot/chat`,
      'Porter\'s Five Forces': `${API_BASE}/frameworks/porters/chat`, // Will be available when implemented
      'McKinsey 7S Framework': `${API_BASE}/frameworks/mckinsey_7s/chat`,
      'Balanced Scorecard': `${API_BASE}/frameworks/balanced-scorecard/chat`, // Will be available when implemented
      'Root Cause Analysis (5 Whys)': `${API_BASE}/frameworks/root-cause/chat`, // Will be available when implemented
      'Issue Tree/Logic Tree': `${API_BASE}/frameworks/issue-tree/chat` // Will be available when implemented
    };
    
    return frameworkEndpoints[selectedFramework] || `${API_BASE}/basic/chat`;
  };

  const chatEndpoint = getChatEndpoint();

  useEffect(() => {
    checkApiStatus();
    fetchAvailableFrameworks();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (propSelectedFramework !== undefined) {
      setSelectedFramework(propSelectedFramework);
    }
  }, [propSelectedFramework]);

  const checkApiStatus = async () => {
    try {
      console.log('Checking API status at:', statusEndpoint);
      const response = await fetch(statusEndpoint);
      if (response.ok) {
        const data = await response.json();
        console.log('API Status Response:', data);
        setApiStatus({
          connected: true,
          frameworksAvailable: data.available_frameworks || 0
        });
      } else {
        console.error('API Status Error:', response.status, response.statusText);
        setApiStatus({
          connected: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        });
      }
    } catch (error) {
      console.error('API Connection Error:', error);
      setApiStatus({
        connected: false,
        error: 'Cannot connect to server'
      });
    }
  };

  const fetchAvailableFrameworks = async () => {
    try {
      console.log('Fetching frameworks from:', `${API_BASE}/frameworks/frameworks/list`);
      const response = await fetch(`${API_BASE}/frameworks/frameworks/list`);
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 RAW Frameworks Response:', JSON.stringify(data, null, 2));
        
        // Check what's in available_frameworks
        console.log('🔍 Available frameworks object:', data.available_frameworks);
        console.log('🔍 Available frameworks keys:', Object.keys(data.available_frameworks || {}));
        console.log('🔍 Available frameworks values:', Object.values(data.available_frameworks || {}));
        
        const backendFrameworks = Object.values(data.available_frameworks || {});
        console.log('🔍 Processed backend frameworks:', backendFrameworks);
        
        if (backendFrameworks.length > 0) {
          console.log('✅ Setting available frameworks from backend');
          setAvailableFrameworks(backendFrameworks as any[]);
        } else {
          console.log('⚠️ No backend frameworks found, using default list');
        }
      } else {
        console.warn('❌ Failed to fetch frameworks, using default list. Status:', response.status);
      }
    } catch (error) {
      console.warn('❌ Could not fetch frameworks from backend, using default list:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || actualIsLoading) return;

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
      // Build conversation history in the format expected by your backend
      const conversationHistory = [...messages, userMessage].map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Prepare request payload based on framework and endpoint
      let requestPayload: any;
      
      if (selectedFramework === 'SWOT Analysis') {
        // SWOT Analysis specific payload
        requestPayload = {
          messages: conversationHistory,
          enable_grounding: enableGrounding,
          business_context: `Chat conversation context`,
          temperature: 0.7,
          max_tokens: 2000
        };
      } else if (selectedFramework === 'McKinsey 7S Framework') {
        // McKinsey 7S specific payload
        requestPayload = {
          messages: conversationHistory,
          enable_grounding: enableGrounding,
          business_context: `Chat conversation context`,
          temperature: 0.7,
          max_tokens: 2000
        };
      } else if (selectedFramework) {
        // Other frameworks (when implemented)
        requestPayload = {
          messages: conversationHistory,
          framework: selectedFramework,
          temperature: 0.7,
          max_tokens: 2000
        };
      } else {
        // Basic chat endpoint payload
        requestPayload = {
          messages: conversationHistory,
          temperature: 0.7,
          max_tokens: 4096
        };
      }

      console.log('Sending request to:', chatEndpoint);
      console.log('Request payload:', requestPayload);

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      // Handle both basic chat and framework-specific responses
      const responseText = data.message?.content || data.response || data.text || 'Sorry, I couldn\'t generate a response.';
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'assistant',
        timestamp: new Date(),
        framework: selectedFramework || undefined,
        grounding_enabled: data.grounding_enabled || false,
        sources_used: data.sources_used?.length || 0
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (onNewMessage) {
        onNewMessage(assistantMessage);
      }

      setApiStatus({ 
        connected: true, 
        frameworksAvailable: apiStatus.frameworksAvailable 
      });

    } catch (error) {
      console.error('Message send error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I'm having trouble connecting to the API. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      if (onNewMessage) {
        onNewMessage(errorMessage);
      }

      setApiStatus({
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      });

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
    await fetchAvailableFrameworks();
    setIsLoading(false);
  };

  const handleFrameworkSelect = (frameworkName: string) => {
    setSelectedFramework(frameworkName);
    setShowFrameworkSelector(false);
    if (onFrameworkSelect) {
      onFrameworkSelect(frameworkName);
    }
    
    // Add a system message about framework selection
    const frameworkMessage: Message = {
      id: Date.now().toString(),
      text: `🎯 Switched to **${frameworkName}** framework. I'm now ready to provide specialized analysis and guidance using this methodology. ${enableGrounding && (frameworkName === 'SWOT Analysis' || frameworkName === 'McKinsey 7S Framework') ? 'Real-time market research is enabled.' : ''}`,
      sender: 'assistant',
      timestamp: new Date(),
      framework: frameworkName
    };
    
    setMessages(prev => [...prev, frameworkMessage]);
  };

  const getFrameworkStatus = (frameworkName: string) => {
    console.log('🔍 Checking status for framework:', frameworkName);
    console.log('🔍 API connected:', apiStatus.connected);
    console.log('🔍 Available frameworks from backend:', availableFrameworks.map(f => f.name));
    
    // Check if this framework exists in the backend response
    const existsInBackend = availableFrameworks.some(f => f.name === frameworkName);
    console.log('🔍 Framework exists in backend:', existsInBackend);
    
    // Both SWOT Analysis and McKinsey 7S Framework are now implemented
    if ((frameworkName === 'SWOT Analysis' || frameworkName === 'McKinsey 7S Framework') && apiStatus.connected) {
      console.log('✅ Framework marked as available:', frameworkName);
      return 'available';
    }
    
    console.log('❌ Framework marked as unavailable:', frameworkName);
    return 'unavailable';
  };

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

          {/* API Status Indicator */}
          <div className="flex items-center space-x-2">
            {apiStatus.connected ? (
              <div className="flex items-center text-green-600">
                <CheckCircle size={16} className="mr-1" />
                <span className="text-xs">
                  Connected ({apiStatus.frameworksAvailable || 0} frameworks)
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

        {/* Framework Selection */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFrameworkSelector(!showFrameworkSelector)}
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
                
                {(selectedFramework === 'SWOT Analysis' || selectedFramework === 'McKinsey 7S Framework') && (
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

        {/* API URL Display */}
        <div className="mt-2 text-xs text-gray-500">
          API Base: {API_BASE} | Endpoint: {chatEndpoint.replace(API_BASE, '')}
          {selectedFramework && ` | Framework: ${selectedFramework}`}
          {enableGrounding && (selectedFramework === 'SWOT Analysis' || selectedFramework === 'McKinsey 7S Framework') && ' | Grounding: ON'}
        </div>

        {/* Error Message */}
        {!apiStatus.connected && apiStatus.error && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            Error: {apiStatus.error}
            <div className="mt-1 text-gray-600">
              Make sure your backend is running on {API_BASE}
            </div>
            <div className="mt-1 text-xs">
              Try running: <code className="bg-gray-100 px-1 rounded">python main.py</code>
            </div>
          </div>
        )}
      </div>

      {/* Framework Selector Panel */}
      {showFrameworkSelector && (
        <div className="border-b border-gray-200 bg-gray-50 p-4 max-h-64 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Choose a Consulting Framework:</h3>
          <div className="space-y-2">
          {availableFrameworks.map((framework, index) => {
            const status = getFrameworkStatus(framework.name);
            return (
              <div key={index} className="relative">
                <button
                  onClick={() => handleFrameworkSelect(framework.name)}
                  onMouseEnter={() => setHoveredFramework(framework.name)}
                  onMouseLeave={() => setHoveredFramework('')}
                  disabled={status === 'unavailable'}
                  className={`w-full text-left px-3 py-2 text-sm border rounded-lg transition-all duration-200 ${
                    status === 'unavailable'
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : selectedFramework === framework.name
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{framework.name}</span>
                    {status === 'available' && (
                      <span className="text-green-500 text-xs">● Available</span>
                    )}
                    {status === 'unavailable' && (
                      <span className="text-gray-400 text-xs">○ Coming Soon</span>
                    )}
                  </div>
                </button>

                {hoveredFramework === framework.name && (
                  <div className="absolute left-0 right-0 bottom-full mb-1 z-10 bg-gray-800 text-white p-3 rounded-lg shadow-lg">
                    <p className="text-xs leading-relaxed">{framework.description}</p>
                    {status === 'unavailable' && (
                      <p className="text-xs text-red-300 mt-1">Framework implementation coming soon</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
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
                    ? `Analyzing with ${selectedFramework}${enableGrounding && (selectedFramework === 'SWOT Analysis' || selectedFramework === 'McKinsey 7S Framework') ? ' + real-time data' : ''}...`
                    : apiStatus.connected ? 'Thinking...' : 'Connecting...'
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
              selectedFramework 
                ? `Ask about ${selectedFramework} analysis...`
                : placeholder
            }
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[44px] max-h-32"
            rows={1}
            disabled={actualIsLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={actualIsLoading || !inputText.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors min-w-[44px] flex items-center justify-center"
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
          {actualIsLoading ? (
            selectedFramework 
              ? `Processing with ${selectedFramework}...`
              : apiStatus.connected ? 'Sending message...' : 'Connecting...'
          ) : (
            <>
              {apiStatus.connected 
                ? `Ready to chat${selectedFramework ? ` • ${selectedFramework} active` : ''}`
                : 'Click Test to check connection'
              }
              {enableGrounding && (selectedFramework === 'SWOT Analysis' || selectedFramework === 'McKinsey 7S Framework') && ' • Real-time data enabled'}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsultingChat;