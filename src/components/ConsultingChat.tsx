// src/components/ConsultingChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, Cloud, Settings } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { consultingFrameworks } from './ConsultingFrameworks';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  framework?: string; // Added framework tracking
}

interface ConsultingChatProps {
  onNewMessage?: (message: Message) => void;
  apiEndpoint?: string;
  placeholder?: string;
  welcomeMessage?: string;
  isLoading?: boolean;
}

interface ApiStatus {
  connected: boolean;
  error?: string;
}

const ConsultingChat: React.FC<ConsultingChatProps> = ({
  onNewMessage,
  apiEndpoint = 'https://lma-chat-api-443545551926.us-central1.run.app/basic/chat',
  placeholder = 'Type your message... (Press Enter to send, Shift+Enter for new line)',
  welcomeMessage = 'Hello! I\'m your AI assistant powered by Gemini AI running on Google Cloud Run. Select a consulting framework and ask me anything!',
  isLoading: externalLoading = false
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
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [hoveredFramework, setHoveredFramework] = useState<string>('');
  const [showFrameworkSelector, setShowFrameworkSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const actualIsLoading = externalLoading || isLoading;

  const baseUrl = 'https://lma-chat-api-443545551926.us-central1.run.app';
  const statusEndpoint = `${baseUrl}/basic/status`;
  const chatEndpoint = apiEndpoint;

  useEffect(() => {
    checkApiStatus();
  }, [statusEndpoint]);

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

  const handleScroll = () => {
    setHoveredFramework('');
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
      const conversationHistory = [...messages, userMessage].map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Prepare the request payload with framework context
      const requestPayload = {
        messages: conversationHistory,
        temperature: 0.7,
        max_tokens: 4096,
        framework: selectedFramework || undefined, // Include selected framework
        prompt: currentInput // Include the current prompt
      };

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || 'Sorry, I couldn\'t generate a response.',
        sender: 'assistant',
        timestamp: new Date(),
        framework: selectedFramework || undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (onNewMessage) {
        onNewMessage(assistantMessage);
      }

      setApiStatus({ connected: true });

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I\'m having trouble connecting to the API. The service might be starting up (this can take a few seconds on first use). Please try again.',
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
    setIsLoading(false);
  };

  const handleFrameworkSelect = (frameworkName: string) => {
    setSelectedFramework(frameworkName);
    setShowFrameworkSelector(false);
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
              Powered by Gemini AI on Cloud Run
            </p>
          </div>

          {/* API Status Indicator */}
          <div className="flex items-center space-x-2">
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
              <button
                onClick={() => setSelectedFramework('')}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* API URL Display */}
        <div className="mt-2 text-xs text-gray-500">
          Mode: BASIC | API: {chatEndpoint}
          {selectedFramework && ` | Framework: ${selectedFramework}`}
        </div>

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

      {/* Framework Selector Panel */}
      {showFrameworkSelector && (
        <div className="border-b border-gray-200 bg-gray-50 p-4 max-h-64 overflow-y-auto" onScroll={handleScroll}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Choose a Consulting Framework:</h3>
          <div className="space-y-2">
            {consultingFrameworks.map((framework, index) => (
              <div key={index} className="relative">
                <button
                  onClick={() => handleFrameworkSelect(framework.name)}
                  onMouseEnter={() => setHoveredFramework(framework.name)}
                  onMouseLeave={() => setHoveredFramework('')}
                  className={`w-full text-left px-3 py-2 text-sm border rounded-lg transition-all duration-200 ${
                    selectedFramework === framework.name
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400'
                  }`}
                >
                  {framework.name}
                </button>
                
                {hoveredFramework === framework.name && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-gray-800 text-white p-3 rounded-lg shadow-lg">
                    <p className="text-xs leading-relaxed">{framework.description}</p>
                  </div>
                )}
              </div>
            ))}
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
                <div className={`text-xs mb-2 px-2 py-1 rounded ${
                  message.sender === 'user' 
                    ? 'bg-blue-400 text-blue-100' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  📊 {message.framework}
                </div>
              )}
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
                  {apiStatus.connected ? 'Analyzing with framework...' : 'Starting service...'}
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
            placeholder={selectedFramework ? `Ask about ${selectedFramework}...` : placeholder}
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
            apiStatus.connected ? 'Sending message...' : 'Waking up service...'
          ) : (
            <>
              {apiStatus.connected ? 'Ready to chat' : 'Click Test to check connection'}
              {selectedFramework && ` • Using ${selectedFramework}`}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsultingChat;