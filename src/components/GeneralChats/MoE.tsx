// src/components/MOEChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, Cloud, X, Paperclip, FileText, Trash2, Lock, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface UploadedFile {
  file: File;
  content: string;
  id: string;
  isPDF: boolean;
}

interface MOEChatInterfaceProps {
  onNewMessage?: (message: Message) => void;
  apiEndpoint?: string;
  placeholder?: string;
  welcomeMessage?: string;
  isLoading?: boolean;
  selectedPrompt?: string;
  onPromptSent?: () => void;
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

const MOEChatInterface: React.FC<MOEChatInterfaceProps> = ({
  onNewMessage,
  placeholder = 'Type your message... (Press Enter to send, Shift+Enter for new line)',
  welcomeMessage = 'Hello! I\'m your Mix of Experts Model by Mistral from Huggingface. How can I help you today?',
  isLoading: externalLoading = false,
  selectedPrompt = '',
  onPromptSent,
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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [authStatus, setAuthStatus] = useState<{ verified: boolean; error?: string }>({ verified: false });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actualIsLoading = externalLoading || isLoading;

  const baseUrl = 'https://lma-chat-api-443545551926.us-central1.run.app';
  const statusEndpoint = `${baseUrl}/health`;
  const authStatusEndpoint = `${baseUrl}/auth/status`;
  const authVerifyEndpoint = `${baseUrl}/auth/verify`;
  const chatEndpoint = `${baseUrl}/moe_chat/chat`;
  const filesChatEndpoint = `${baseUrl}/moe_chat/chat/with-files`;

  // Update input text when selectedPrompt changes
  useEffect(() => {
    if (selectedPrompt) {
      setInputText(selectedPrompt);
      // Focus the textarea after setting the text
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(selectedPrompt.length, selectedPrompt.length);
      }, 0);
    }
  }, [selectedPrompt]);

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

  const getAuthHeadersForFormData = () => {
    const headers: Record<string, string> = {};
    
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

  // File upload functions
  const triggerFileUpload = () => {
    if (!firebaseToken && apiStatus.authRequired) {
      onAuthRequired?.();
      return;
    }
    fileInputRef.current?.click();
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      let content = '';
      let uploadedFile: UploadedFile;
      const isPDF = file.type === 'application/pdf';
      
      if (isPDF) {
        // For PDFs, we'll send the file directly to backend
        uploadedFile = {
          file,
          content: '[PDF FILE - Content will be processed by AI]',
          id: Date.now().toString(),
          isPDF: true
        };
      } else {
        // Handle text files as before
        content = await readFileContent(file);
        uploadedFile = {
          file,
          content,
          id: Date.now().toString(),
          isPDF: false
        };
      }
      
      setUploadedFiles(prev => [...prev, uploadedFile]);
      
      // Clear the file input so the same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file. Please try again with a supported file type.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && uploadedFiles.length === 0) || actualIsLoading) return;

    // Check authentication for protected endpoints
    if (!firebaseToken && apiStatus.authRequired) {
      onAuthRequired?.();
      return;
    }

    // Check if we have any files (PDF or text)
    const hasFiles = uploadedFiles.length > 0;
    const hasPDFs = uploadedFiles.some(f => f.isPDF);
    
    let messageText = inputText;
    
    // Display message for user
    if (hasFiles && !hasPDFs) {
      // For text files, include content in the display message
      const fileContents = uploadedFiles
        .filter(f => !f.isPDF)
        .map(file => `**UPLOADED FILE: ${file.file.name}**\n\n${file.content}`)
        .join('\n\n---\n\n');
      
      if (messageText.trim()) {
        messageText = `${messageText}\n\n**ATTACHED DOCUMENTS:**\n\n${fileContents}`;
      } else {
        messageText = `Please analyze the following document(s):\n\n${fileContents}`;
      }
    } else if (hasPDFs) {
      // For PDFs, just show filenames in display message
      const fileNames = uploadedFiles.map(f => f.file.name).join(', ');
      if (messageText.trim()) {
        messageText = `${messageText}\n\n**ATTACHED FILES:** ${fileNames}`;
      } else {
        messageText = `Please analyze the attached file(s): ${fileNames}`;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (onNewMessage) {
      onNewMessage(userMessage);
    }

    // If this message was sent from a selected prompt, notify parent
    if (selectedPrompt && onPromptSent) {
      onPromptSent();
    }

    // Store current input and files before clearing
    const currentInput = inputText;
    const currentFiles = uploadedFiles;
    
    // Clear input and files after sending
    setInputText('');
    setUploadedFiles([]);
    setIsLoading(true);

    try {
      let response;
      
      if (hasFiles) {
        // Use multipart form data for files
        const formData = new FormData();
        formData.append('message', currentInput || ''); // Ensure message is not empty
        formData.append('temperature', '0.7');
        formData.append('max_tokens', '4096');
        
        // Append each file individually
        currentFiles.forEach(fileData => {
          formData.append('files', fileData.file);
        });
        
        console.log('Sending files request with:', {
          message: currentInput,
          fileCount: currentFiles.length,
          fileNames: currentFiles.map(f => f.file.name)
        });
        
        response = await fetch(filesChatEndpoint, {
          method: 'POST',
          headers: getAuthHeadersForFormData(),
          body: formData,
        });
      } else {
        // Use existing text-based approach for no files
        const conversationHistory = [...messages, userMessage].map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

        response = await fetch(chatEndpoint, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            messages: conversationHistory,
            temperature: 0.7,
            max_tokens: 4096
          }),
        });
      }

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

  const clearPrompt = () => {
    setInputText('');
    if (onPromptSent) {
      onPromptSent();
    }
  };

  const isUsingPrompt = selectedPrompt && inputText === selectedPrompt;
  const needsAuth = apiStatus.authRequired && !firebaseToken;
  const authVerified = firebaseToken && authStatus.verified;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Mix of Experts Chat Assistant</h2>
            <p className="text-sm text-gray-500 flex items-center">
              <Cloud size={14} className="mr-1" />
              Powered by Mistral Mix of Experts AI on Cloud Run
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

        {/* Model Display */}
        <div className="mt-2 text-xs text-gray-500">
          Mode: Mix of Experts | Model: Mistral Mix of Experts
          {apiStatus.authRequired && (
            <span className="ml-2 text-orange-600">🔐 Auth Required</span>
          )}
        </div>

        {/* Prompt Indicator */}
        {isUsingPrompt && (
          <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded p-2">
            <span className="text-xs text-blue-700 font-medium">
              Using consultant prompt template
            </span>
            <button
              onClick={clearPrompt}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

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

        {/* Uploaded Files Indicator */}
        {uploadedFiles.length > 0 && (
          <div className="mt-2 bg-green-50 border border-green-200 rounded p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-green-700 font-medium">
                {uploadedFiles.length} file(s) attached
              </span>
            </div>
            <div className="space-y-1">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-white rounded px-2 py-1">
                  <div className="flex items-center">
                    <FileText size={12} className={`mr-1 ${file.isPDF ? 'text-red-600' : 'text-green-600'}`} />
                    <span className="text-xs text-gray-700">{file.file.name}</span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({(file.file.size / 1024).toFixed(1)} KB)
                    </span>
                    {file.isPDF && (
                      <span className="text-xs text-red-600 ml-1 font-medium">PDF</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
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
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              needsAuth ? "Please sign in to start chatting..." :
              uploadedFiles.length > 0 ? "Add instructions for the attached files..." : placeholder
            }
            className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none min-h-[44px] max-h-32 ${
              needsAuth
                ? 'border-orange-300 focus:ring-orange-500 bg-orange-50'
                : isUsingPrompt
                ? 'border-blue-300 focus:ring-blue-500 bg-blue-50'
                : uploadedFiles.length > 0
                ? 'border-green-300 focus:ring-green-500 bg-green-50'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            rows={1}
            disabled={actualIsLoading || needsAuth}
            style={{ overflowY: 'hidden' }}
            onInput={(e) => {
              const textarea = e.target as HTMLTextAreaElement;
              textarea.style.height = 'auto';
              textarea.style.height = `${textarea.scrollHeight}px`;
            }}
          />
          
          {/* File Upload Button */}
          <button
            onClick={triggerFileUpload}
            disabled={actualIsLoading || isUploading || needsAuth}
            className={`${
              needsAuth 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gray-500 hover:bg-gray-600'
            } disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors min-w-[44px] flex items-center justify-center`}
            title={needsAuth ? "Sign in to upload files" : "Upload file (PDF, text files supported)"}
          >
            {isUploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Paperclip size={20} />
            )}
          </button>
          
          <button
            onClick={handleSendMessage}
            disabled={actualIsLoading || (!inputText.trim() && uploadedFiles.length === 0) || needsAuth}
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

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept=".txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.c,.h,.sql,.yaml,.yml,.log,.pdf"
        />

        {/* Connection status */}
        <div className="mt-2 text-xs text-gray-500">
          {needsAuth ? (
            'Authentication required - Please sign in to continue'
          ) : actualIsLoading ? (
            apiStatus.connected ? 'Sending message...' : 'Waking up service...'
          ) : isUploading ? (
            'Reading file...'
          ) : (
            apiStatus.connected ? 'Ready to chat (PDF & text files supported)' : 'Click Test to check connection'
          )}
        </div>
      </div>
    </div>
  );
};

export default MOEChatInterface;