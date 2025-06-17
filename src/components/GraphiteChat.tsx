import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, Briefcase, User, Bot, Copy, Check, FileText, MessageSquare, Wifi, WifiOff } from 'lucide-react';

interface PitchResponse {
  id: string;
  type: 'pitch' | 'custom';
  jobDescription?: string;
  customQuestion?: string;
  response: string;
  timestamp: Date;
  characterCount?: number;
  wordCount?: number;
  generationTimeMs?: number;
  status?: string;
}

interface APIResponse {
  id: string;
  type: string;
  response: string;
  character_count?: number;
  word_count?: number;
  timestamp: string;
  generation_time_ms: number;
  status: string;
}

interface ErrorResponse {
  error: string;
  status: string;
  timestamp: string;
}

const ConsultingPitchGenerator = () => {
  const [pitchResponses, setPitchResponses] = useState<PitchResponse[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [activeSection, setActiveSection] = useState<'pitch' | 'custom'>('pitch');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API configuration - matching your existing pattern
  const baseUrl = process.env.REACT_APP_API_URL || 'https://lma-chat-api-443545551926.us-central1.run.app';
  const statusEndpoint = `${baseUrl}/consulting/status`;
  const pitchEndpoint = `${baseUrl}/consulting/generate-pitch`;
  const customEndpoint = `${baseUrl}/consulting/generate-custom`;

  // Auto-scroll to bottom when new responses arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [pitchResponses]);

  // Check API health on component mount
  useEffect(() => {
    checkAPIHealth();
  }, []);

  // Clear error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const checkAPIHealth = async () => {
    setApiStatus('checking');
    try {
      const response = await fetch(statusEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApiStatus(data.status === 'healthy' ? 'connected' : 'disconnected');
      } else {
        setApiStatus('disconnected');
      }
    } catch (error) {
      console.error('API health check failed:', error);
      setApiStatus('disconnected');
    }
  };

  const handleAPIError = (error: any, context: string) => {
    console.error(`${context} error:`, error);
    let errorMsg = `Failed to ${context.toLowerCase()}`;
    
    if (error.message) {
      errorMsg += `: ${error.message}`;
    } else if (typeof error === 'string') {
      errorMsg += `: ${error}`;
    }
    
    setErrorMessage(errorMsg);
    
    // Check if it's a network error
    if (error.name === 'TypeError' || error.message?.includes('fetch')) {
      setApiStatus('disconnected');
    }
  };

  const generatePitchResponse = async () => {
    if (!jobDescription.trim() || isGeneratingPitch) return;

    setIsGeneratingPitch(true);
    setErrorMessage(null);

    try {
      const response = await fetch(pitchEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_description: jobDescription,
          max_characters: 2000
        })
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = `HTTP ${response.status}`;
        try {
          const errorData: ErrorResponse = await response.json();
          errorDetails = errorData.error || errorDetails;
        } catch {
          errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorDetails);
      }

      const data: APIResponse = await response.json();

      const newResponse: PitchResponse = {
        id: data.id,
        type: 'pitch',
        jobDescription: jobDescription,
        response: data.response,
        timestamp: new Date(data.timestamp),
        characterCount: data.character_count,
        generationTimeMs: data.generation_time_ms,
        status: data.status
      };

      setPitchResponses(prev => [...prev, newResponse]);
      setJobDescription('');
      setApiStatus('connected'); // Update status on successful call

    } catch (error) {
      handleAPIError(error, 'Generate pitch');
      
      // Create error response to show in UI
      const errorResponse: PitchResponse = {
        id: Date.now().toString(),
        type: 'pitch',
        jobDescription: jobDescription,
        response: `❌ Error generating pitch: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check your connection.`,
        timestamp: new Date(),
        characterCount: 0,
        status: 'error'
      };
      
      setPitchResponses(prev => [...prev, errorResponse]);
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const generateCustomResponse = async () => {
    if (!customQuestion.trim() || isGeneratingCustom) return;

    setIsGeneratingCustom(true);
    setErrorMessage(null);

    try {
      const response = await fetch(customEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: customQuestion,
          max_words: 500
        })
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = `HTTP ${response.status}`;
        try {
          const errorData: ErrorResponse = await response.json();
          errorDetails = errorData.error || errorDetails;
        } catch {
          errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorDetails);
      }

      const data: APIResponse = await response.json();

      const newResponse: PitchResponse = {
        id: data.id,
        type: 'custom',
        customQuestion: customQuestion,
        response: data.response,
        timestamp: new Date(data.timestamp),
        wordCount: data.word_count,
        generationTimeMs: data.generation_time_ms,
        status: data.status
      };

      setPitchResponses(prev => [...prev, newResponse]);
      setCustomQuestion('');
      setApiStatus('connected'); // Update status on successful call

    } catch (error) {
      handleAPIError(error, 'Generate custom response');
      
      // Create error response to show in UI
      const errorResponse: PitchResponse = {
        id: Date.now().toString(),
        type: 'custom',
        customQuestion: customQuestion,
        response: `❌ Error generating response: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check your connection.`,
        timestamp: new Date(),
        wordCount: 0,
        status: 'error'
      };
      
      setPitchResponses(prev => [...prev, errorResponse]);
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setErrorMessage('Failed to copy text to clipboard');
    }
  };

  const clearHistory = () => {
    setPitchResponses([]);
    setErrorMessage(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'pitch' | 'custom') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (type === 'pitch') {
        generatePitchResponse();
      } else {
        generateCustomResponse();
      }
    }
  };

  const retryConnection = () => {
    checkAPIHealth();
  };

  const getStatusIcon = () => {
    switch (apiStatus) {
      case 'connected':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'disconnected':
        return <WifiOff size={16} className="text-red-600" />;
      case 'checking':
        return <Loader2 size={16} className="animate-spin text-yellow-600" />;
      default:
        return <AlertCircle size={16} className="text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (apiStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Briefcase size={20} className="mr-2 text-blue-600" />
              LMA Consulting Opportunities
            </h2>
            <p className="text-sm text-gray-500 flex items-center">
              <Bot size={14} className="mr-1" />
              Generate professional responses for consulting opportunities
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* API Status */}
            <div className="flex items-center space-x-1">
              {getStatusIcon()}
              <span className="text-xs">{getStatusText()}</span>
              {apiStatus === 'disconnected' && (
                <button
                  onClick={retryConnection}
                  className="text-xs text-blue-600 hover:text-blue-800 ml-1 underline"
                >
                  Retry
                </button>
              )}
            </div>
            
            <button
              onClick={clearHistory}
              className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <AlertCircle size={16} className="text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-600 hover:text-red-800 ml-2"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Section Toggle */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveSection('pitch')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center ${
                activeSection === 'pitch'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText size={14} className="mr-1" />
              Standard Pitch
            </button>
            <button
              onClick={() => setActiveSection('custom')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center ${
                activeSection === 'custom'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <MessageSquare size={14} className="mr-1" />
              Custom Question
            </button>
          </div>
        </div>

        {/* Section Description */}
        <div className="mt-2 text-sm text-gray-600">
          {activeSection === 'pitch' ? (
            <p>📝 <strong>Standard Pitch:</strong> Generate a 2000-character max response to "Why you're interested and what relevant skills you bring"</p>
          ) : (
            <p>❓ <strong>Custom Question:</strong> Get a 500-word max response to your specific question</p>
          )}
        </div>
      </div>

      {/* Messages/Responses Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {pitchResponses.length === 0 && (
          <div className="flex justify-center items-center h-full text-gray-500">
            <div className="text-center">
              <Briefcase size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Ready to generate your consulting pitches</p>
              <p className="text-sm">Enter a job description or custom question below to get started</p>
              {apiStatus === 'disconnected' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ API connection failed. Responses will show errors until connection is restored.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {pitchResponses.map((response) => (
          <div key={response.id} className="space-y-3">
            {/* Input Display */}
            <div className="flex justify-end">
              <div className="max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg bg-blue-500 text-white">
                <div className="flex items-start space-x-2">
                  <User size={16} className="text-white mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium mb-1">
                      {response.type === 'pitch' ? 'Job Description:' : 'Custom Question:'}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {response.type === 'pitch' ? response.jobDescription : response.customQuestion}
                    </p>
                    <p className="text-xs mt-2 text-blue-100">
                      {response.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Response Display */}
            <div className="flex justify-start">
              <div className={`max-w-xs lg:max-w-4xl px-4 py-3 rounded-lg ${
                response.status === 'error' 
                  ? 'bg-red-50 border border-red-200 text-red-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <div className="flex items-start space-x-2">
                  <Bot size={16} className={`mt-0.5 flex-shrink-0 ${
                    response.status === 'error' ? 'text-red-600' : 'text-blue-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-medium text-gray-600">
                          {response.type === 'pitch' ? 'Standard Pitch Response' : 'Custom Response'}
                        </p>
                        {response.generationTimeMs && response.status !== 'error' && (
                          <span className="text-xs text-gray-400">
                            ({response.generationTimeMs}ms)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {response.status !== 'error' && (
                          <span className="text-xs text-gray-500">
                            {response.type === 'pitch' 
                              ? `${response.characterCount}/2000 chars`
                              : `${response.wordCount}/500 words`
                            }
                          </span>
                        )}
                        <button
                          onClick={() => copyToClipboard(response.response, response.id)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {copiedId === response.id ? (
                            <Check size={14} className="text-green-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{response.response}</p>
                    <p className="text-xs mt-2 text-gray-500">
                      {response.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicators */}
        {(isGeneratingPitch || isGeneratingCustom) && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-lg max-w-xs lg:max-w-md">
              <div className="flex items-center space-x-2">
                <Bot size={16} className="text-blue-600" />
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <p className="text-sm">
                  {isGeneratingPitch ? 'Crafting your pitch...' : 'Generating custom response...'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        {activeSection === 'pitch' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Job Description (for standard pitch generation):
            </label>
            <div className="flex space-x-2">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'pitch')}
                placeholder="Paste the job description here... (Press Enter to generate, Shift+Enter for new line)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[100px] max-h-48"
                rows={4}
                disabled={isGeneratingPitch}
              />
              <button
                onClick={generatePitchResponse}
                disabled={isGeneratingPitch || !jobDescription.trim() || apiStatus === 'disconnected'}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors min-w-[120px] flex items-center justify-center"
              >
                {isGeneratingPitch ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <FileText size={16} className="mr-1" />
                    Generate Pitch
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Will generate a response to: "Please provide a short pitch detailing why you're interested in this project and the specific relevant skills & experience you would bring to it." (Max 2000 characters)
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Custom Question:
            </label>
            <div className="flex space-x-2">
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'custom')}
                placeholder="Enter your specific question here... (Press Enter to generate, Shift+Enter for new line)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none min-h-[100px] max-h-48"
                rows={4}
                disabled={isGeneratingCustom}
              />
              <button
                onClick={generateCustomResponse}
                disabled={isGeneratingCustom || !customQuestion.trim() || apiStatus === 'disconnected'}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors min-w-[120px] flex items-center justify-center"
              >
                {isGeneratingCustom ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <MessageSquare size={16} className="mr-1" />
                    Generate Response
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Will generate a detailed response to your specific question (Max 500 words)
            </p>
          </div>
        )}
        
        {/* Status */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            {isGeneratingPitch || isGeneratingCustom ? 
              'Generating response...' : 
              'Ready to generate consulting responses'
            }
          </span>
          {apiStatus === 'disconnected' && (
            <span className="text-red-600">⚠️ API offline - responses will show errors</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsultingPitchGenerator;