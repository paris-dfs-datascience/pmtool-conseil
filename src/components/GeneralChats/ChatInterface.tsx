// src/components/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, Cloud, X, Paperclip, FileText, Trash2 } from 'lucide-react';
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

interface ChatInterfaceProps {
  onNewMessage?: (message: Message) => void;
  apiEndpoint?: string;
  placeholder?: string;
  welcomeMessage?: string;
  isLoading?: boolean;
  selectedPrompt?: string;
  onPromptSent?: () => void;
}

interface ApiStatus {
  connected: boolean;
  error?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onNewMessage,
  apiEndpoint = 'https://lma-chat-api-443545551926.us-central1.run.app/basic/chat',
  placeholder = 'Type your message... (Press Enter to send, Shift+Enter for new line)',
  welcomeMessage = 'Hello! I\'m your AI assistant powered by Gemini AI running on Google Cloud Run. How can I help you today?',
  isLoading: externalLoading = false,
  selectedPrompt = '',
  onPromptSent
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actualIsLoading = externalLoading || isLoading;

  const baseUrl = 'https://lma-chat-api-443545551926.us-central1.run.app';
  const statusEndpoint = `${baseUrl}/basic/status`;
  const chatEndpoint = apiEndpoint;
  const filesChatEndpoint = `${baseUrl}/basic/chat/with-files`;

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

  // File upload functions
  const triggerFileUpload = () => {
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
          body: formData,
          // Don't set Content-Type header - let browser set it with boundary
        });
      } else {
        // Use existing text-based approach for no files
        const conversationHistory = [...messages, userMessage].map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

        response = await fetch(chatEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: conversationHistory,
            temperature: 0.7,
            max_tokens: 4096
          }),
        });
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

  const clearPrompt = () => {
    setInputText('');
    if (onPromptSent) {
      onPromptSent();
    }
  };

  const isUsingPrompt = selectedPrompt && inputText === selectedPrompt;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Basic Chat Assistant</h2>
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

        {/* Model Display */}
        <div className="mt-2 text-xs text-gray-500">
          Mode: BASIC CHAT | Model: Gemini Pro 2.0
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
            placeholder={uploadedFiles.length > 0 ? "Add instructions for the attached files..." : placeholder}
            className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none min-h-[44px] max-h-32 ${
              isUsingPrompt 
                ? 'border-blue-300 focus:ring-blue-500 bg-blue-50' 
                : uploadedFiles.length > 0
                ? 'border-green-300 focus:ring-green-500 bg-green-50'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            rows={1}
            disabled={actualIsLoading}
          />
          
          {/* File Upload Button */}
          <button
            onClick={triggerFileUpload}
            disabled={actualIsLoading || isUploading}
            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors min-w-[44px] flex items-center justify-center"
            title="Upload file (PDF, text files supported)"
          >
            {isUploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Paperclip size={20} />
            )}
          </button>
          
          <button
            onClick={handleSendMessage}
            disabled={actualIsLoading || (!inputText.trim() && uploadedFiles.length === 0)}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors min-w-[44px] flex items-center justify-center"
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
          {actualIsLoading ? (
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

export default ChatInterface;