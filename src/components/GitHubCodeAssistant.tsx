import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Cloud,
  Code2,
  FileText,
  Bug,
  Wrench,
  Zap,
  Copy,
  Check,
  Upload,
  Download,
  Settings,
  X,
  Folder,
  Github,
  RefreshCw,
  Plus,
  GitPullRequest,
  BookOpen,
  Search
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  codeBlocks?: CodeBlock[];
  mode?: string;
  githubAction?: GitHubAction;
}

interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
  description?: string;
  id: string;
  path?: string;
}

interface GitHubAction {
  type: 'create_file' | 'update_file' | 'create_pr' | 'create_issue' | 'get_repo_info' | 'list_files';
  status: 'pending' | 'completed' | 'failed' | 'suggested';
  details?: any;
  error?: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
}

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
  content?: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
}

interface CodeAssistantProps {
  onNewMessage?: (message: Message) => void;
  apiEndpoint?: string;
}

const GitHubCodeAssistant: React.FC<CodeAssistantProps> = ({ 
  onNewMessage,
  apiEndpoint = 'https://lma-chat-api-443545551926.us-central1.run.app/github'
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your GitHub-integrated AI Code Assistant powered by Mistral Codestral. I can help you:\n\n• Generate React/Python components\n• Debug and fix code issues\n• Refactor and optimize code\n• Review code for best practices\n• Access and modify your GitHub repositories\n• Create pull requests with generated code\n\nConnect to GitHub to get started with repository-aware assistance!',
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState('general');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [projectContext, setProjectContext] = useState<string>('');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [apiStatus, setApiStatus] = useState({ connected: true });
  
  // GitHub integration state
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [repoFiles, setRepoFiles] = useState<GitHubFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<GitHubFile[]>([]);
  const [showGithubPanel, setShowGithubPanel] = useState(true);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modes = [
    { 
      id: 'general', 
      label: 'General', 
      icon: Code2, 
      color: 'blue', 
      description: 'General coding help and questions',
      prompt: 'I need help with general coding. '
    },
    { 
      id: 'component', 
      label: 'Component', 
      icon: FileText, 
      color: 'green', 
      description: 'Create React/Python components and modules',
      prompt: 'Please create a component/module for '
    },
    { 
      id: 'debug', 
      label: 'Debug', 
      icon: Bug, 
      color: 'red', 
      description: 'Find and fix bugs in code',
      prompt: 'Help me debug this issue: '
    },
    { 
      id: 'refactor', 
      label: 'Refactor', 
      icon: Wrench, 
      color: 'yellow', 
      description: 'Optimize and improve existing code',
      prompt: 'Please refactor and optimize this code: '
    },
    { 
      id: 'review', 
      label: 'Review', 
      icon: CheckCircle, 
      color: 'purple', 
      description: 'Code review and best practices',
      prompt: 'Please review this code for best practices: '
    },
    { 
      id: 'explain', 
      label: 'Explain', 
      icon: Zap, 
      color: 'orange', 
      description: 'Explain code functionality and concepts',
      prompt: 'Please explain how this code works: '
    },
    { 
      id: 'docs', 
      label: 'Docs', 
      icon: BookOpen, 
      color: 'indigo', 
      description: 'Generate documentation',
      prompt: 'Please generate documentation for: '
    }
  ];

  const quickActions = [
    { label: 'React Component', prompt: 'Create a React functional component with TypeScript for a ', icon: FileText },
    { label: 'Python Class', prompt: 'Create a Python class for ', icon: Code2 },
    { label: 'Fix Bug', prompt: 'Help me debug this code issue: ', icon: Bug },
    { label: 'Add Tests', prompt: 'Write unit tests for this code: ', icon: CheckCircle },
    { label: 'Add Error Handling', prompt: 'Add proper error handling to this code: ', icon: AlertCircle },
    { label: 'Convert to TypeScript', prompt: 'Convert this JavaScript code to TypeScript: ', icon: Wrench },
    { label: 'API Integration', prompt: 'Help me integrate this API: ', icon: Cloud },
    { label: 'Performance Optimize', prompt: 'How can I optimize the performance of: ', icon: Zap }
  ];

  const githubActions = [
    { label: 'Create New File', action: 'create_file', icon: Plus },
    { label: 'Update File', action: 'update_file', icon: FileText },
    { label: 'Create PR', action: 'create_pr', icon: GitPullRequest },
    { label: 'Analyze Repo', action: 'analyze_repo', icon: Search },
    { label: 'Generate Tests', action: 'generate_tests', icon: CheckCircle },
    { label: 'Add Docs', action: 'add_docs', icon: BookOpen }
  ];

  // Color classes object to avoid dynamic class names
  const colorClasses = {
    blue: {
      border: 'border-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-700'
    },
    green: {
      border: 'border-green-500',
      bg: 'bg-green-50',
      text: 'text-green-700'
    },
    red: {
      border: 'border-red-500',
      bg: 'bg-red-50',
      text: 'text-red-700'
    },
    yellow: {
      border: 'border-yellow-500',
      bg: 'bg-yellow-50',
      text: 'text-yellow-700'
    },
    purple: {
      border: 'border-purple-500',
      bg: 'bg-purple-50',
      text: 'text-purple-700'
    },
    orange: {
      border: 'border-orange-500',
      bg: 'bg-orange-50',
      text: 'text-orange-700'
    },
    indigo: {
      border: 'border-indigo-500',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700'
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (githubConnected) {
      fetchUser();
      fetchRepositories();
    }
  }, [githubConnected]);

  useEffect(() => {
    if (selectedRepo) {
      fetchRepoFiles('');
      setCurrentPath('');
      setProjectContext(`Repository: ${selectedRepo.full_name}`);
    }
  }, [selectedRepo]);

  // Check API status on component mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  const getCurrentMode = () => modes.find(m => m.id === selectedMode) || modes[0];

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${apiEndpoint}/status`);
      const data = await response.json();
      setApiStatus({ connected: response.ok && data.status === 'operational' });
    } catch (error) {
      setApiStatus({ connected: false });
    }
  };

  // Updated GitHub API functions to use backend endpoints
  const connectGitHub = async () => {
    setIsConnecting(true);
    try {
      // Check if backend has GitHub token configured
      const response = await fetch(`${apiEndpoint}/status`);
      const data = await response.json();
      
      if (data.configuration?.github_integration) {
        setGithubConnected(true);
        // Backend will handle GitHub authentication
      } else {
        alert('GitHub integration is not configured on the server. Please contact the administrator.');
      }
    } catch (error) {
      console.error('Error connecting to GitHub:', error);
      alert('Failed to connect to GitHub. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await fetch(`${apiEndpoint}/user`);
      
      if (response.ok) {
        const user = await response.json();
        setGithubUser(user);
      } else {
        console.error('Error fetching user:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchRepositories = async () => {
    setIsLoadingRepos(true);
    try {
      const response = await fetch(`${apiEndpoint}/repositories`);
      
      if (response.ok) {
        const repos = await response.json();
        setRepositories(repos);
      } else {
        console.error('Error fetching repositories:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching repositories:', error);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const fetchRepoFiles = async (path: string = '') => {
    if (!selectedRepo) return;
    
    try {
      const params = new URLSearchParams({
        repo_full_name: selectedRepo.full_name,
        path: path
      });
      
      const response = await fetch(`${apiEndpoint}/repo-files?${params}`);
      
      if (response.ok) {
        const files = await response.json();
        setRepoFiles(files);
        setCurrentPath(path);
      } else {
        console.error('Error fetching repo files:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching repo files:', error);
    }
  };

  const fetchFileContent = async (file: GitHubFile) => {
    if (!selectedRepo || file.type === 'dir') return null;
    
    try {
      const params = new URLSearchParams({
        repo_full_name: selectedRepo.full_name,
        file_path: file.path
      });
      
      const response = await fetch(`${apiEndpoint}/file-content?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.content;
      } else {
        console.error('Error fetching file content:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching file content:', error);
    }
    return null;
  };

  const toggleFileSelection = async (file: GitHubFile) => {
    if (!file || file.type === 'dir') return;
    
    const isSelected = selectedFiles.some(f => f.path === file.path);
    
    if (isSelected) {
      setSelectedFiles(prev => prev.filter(f => f.path !== file.path));
    } else {
      try {
        const content = await fetchFileContent(file);
        if (content !== null) {
          const fileWithContent = { ...file, content };
          setSelectedFiles(prev => [...prev, fileWithContent]);
        }
      } catch (error) {
        console.error('Error adding file to selection:', error);
      }
    }
  };

  const parseCodeBlocks = (text: string): CodeBlock[] => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        id: `code-${Date.now()}-${blocks.length}`,
        language: match[1] || 'text',
        code: match[2].trim(),
        filename: `code.${match[1] || 'txt'}`
      });
    }
    
    return blocks;
  };

  const formatMessageText = (text: string) => {
    return text.replace(/```[\s\S]*?```/g, '').trim();
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const messageText = customPrompt || inputText;
    if (!messageText.trim() || isLoading) return;

    const currentMode = getCurrentMode();
    let finalPrompt = messageText;
    
    // Add mode context and project context
    if (currentMode.id !== 'general') {
      finalPrompt = `${currentMode.prompt}${messageText}`;
    }
    
    if (projectContext) {
      finalPrompt = `Project Context: ${projectContext}\n\n${finalPrompt}`;
    }

    // Add selected GitHub files context
    if (selectedFiles.length > 0) {
      finalPrompt += '\n\nRepository files for context:\n';
      selectedFiles.forEach(file => {
        if (file.content) {
          finalPrompt += `\n--- ${file.path} ---\n${file.content}\n`;
        }
      });
    }

    // Add uploaded file context
    if (uploadedFiles.length > 0) {
      finalPrompt += '\n\nUploaded files for context: ' + uploadedFiles.map(f => f.name).join(', ');
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      mode: currentMode.label
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Prepare conversation history for the new API format
      const conversationHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
        timestamp: msg.timestamp.toISOString()
      }));

      // Prepare GitHub context
      const githubContext = selectedRepo ? {
        repository: selectedRepo.full_name,
        selectedFiles: selectedFiles.map(f => ({
          path: f.path,
          content: f.content
        })),
        currentPath: currentPath
      } : undefined;

      const requestPayload = {
        message: finalPrompt,
        conversation_history: conversationHistory,
        repository_url: selectedRepo ? `https://github.com/${selectedRepo.full_name}` : undefined,
        github_context: githubContext,
        stream: false // Set to false for now, can be changed to true for streaming
      };

      const response = await fetch(`${apiEndpoint}/chat`, {
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
      const responseText = data.message || 'Sorry, I couldn\'t generate a response.';
      
      // Create code blocks from the response
      let codeBlocks: CodeBlock[] = [];
      if (data.code_blocks && Array.isArray(data.code_blocks)) {
        codeBlocks = data.code_blocks.map((block: any, index: number) => ({
          id: `code-${Date.now()}-${index}`,
          language: block.language || 'text',
          code: block.code || '',
          filename: block.filename || `code.${block.language || 'txt'}`,
          description: block.description
        }));
      } else {
        // Fallback: parse code blocks from text
        codeBlocks = parseCodeBlocks(responseText);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'assistant',
        timestamp: new Date(),
        codeBlocks: codeBlocks,
        mode: currentMode.label,
        githubAction: data.github_action ? {
          type: data.github_action.type,
          status: data.github_action.status,
          details: data.github_action.details,
          error: data.github_action.error
        } : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (onNewMessage) {
        onNewMessage(assistantMessage);
      }

      setApiStatus({ connected: true });

    } catch (error) {
      console.error('Error calling API:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I\'m having trouble connecting to the GitHub Code Assistant API. Please try again.',
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      setApiStatus({ connected: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    setInputText(action.prompt);
    setShowQuickActions(false);
  };

  const handleGithubAction = (action: typeof githubActions[0]) => {
    setInputText(`${action.label}: `);
    setSelectedMode('general');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadCode = (codeBlock: CodeBlock) => {
    const blob = new Blob([codeBlock.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = codeBlock.filename || `code.${codeBlock.language}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const disconnectGitHub = () => {
    setGithubConnected(false);
    setGithubUser(null);
    setSelectedRepo(null);
    setRepositories([]);
    setSelectedFiles([]);
    setRepoFiles([]);
    setCurrentPath('');
    setProjectContext('');
  };

  return (
    <div className="flex h-full bg-white">
      {/* GitHub Sidebar */}
      {showGithubPanel && (
        <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
          {/* GitHub Connection */}
          <div className="p-4 border-b border-gray-200">
            {!githubConnected ? (
              <button
                onClick={connectGitHub}
                disabled={isConnecting}
                className="w-full flex items-center justify-center p-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isConnecting ? (
                  <Loader2 size={20} className="mr-2 animate-spin" />
                ) : (
                  <Github size={20} className="mr-2" />
                )}
                {isConnecting ? 'Connecting...' : 'Connect GitHub'}
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                {githubUser && (
                  <>
                    <img 
                      src={githubUser.avatar_url} 
                      alt={githubUser.name} 
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {githubUser.name || githubUser.login}
                      </p>
                      <p className="text-xs text-green-600">Connected via Server</p>
                    </div>
                    <button
                      onClick={disconnectGitHub}
                      className="text-gray-400 hover:text-gray-600"
                      title="Disconnect"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {githubConnected && (
            <>
              {/* Repository Selection */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Repository
                  </label>
                  <button
                    onClick={fetchRepositories}
                    className="text-gray-400 hover:text-gray-600"
                    title="Refresh repositories"
                    disabled={isLoadingRepos}
                  >
                    <RefreshCw size={14} className={isLoadingRepos ? 'animate-spin' : ''} />
                  </button>
                </div>
                <select
                  value={selectedRepo?.id || ''}
                  onChange={(e) => {
                    const repo = repositories.find(r => r.id === parseInt(e.target.value));
                    setSelectedRepo(repo || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a repository</option>
                  {repositories.map(repo => (
                    <option key={repo.id} value={repo.id}>
                      {repo.name} {repo.private ? '🔒' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* GitHub Actions */}
              {selectedRepo && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">GitHub Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {githubActions.map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={index}
                          onClick={() => handleGithubAction(action)}
                          className="flex items-center p-2 bg-white hover:bg-gray-100 rounded border text-left text-xs transition-colors"
                          title={action.label}
                        >
                          <Icon size={12} className="mr-1 text-gray-600" />
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* File Browser */}
              {selectedRepo && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-700">Files</h3>
                      <button
                        onClick={() => fetchRepoFiles(currentPath)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Refresh files"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Path: /{currentPath || 'root'}
                    </p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    {currentPath && (
                      <button
                        onClick={() => {
                          const parentPath = currentPath.split('/').slice(0, -1).join('/');
                          fetchRepoFiles(parentPath);
                        }}
                        className="w-full p-2 text-left text-sm text-gray-600 hover:bg-gray-100 flex items-center"
                      >
                        <Folder size={14} className="mr-2" />
                        ..
                      </button>
                    )}
                    
                    {repoFiles.map((file, index) => (
                      <div key={index} className="relative">
                        <button
                          onClick={() => {
                            if (file.type === 'dir') {
                              fetchRepoFiles(file.path);
                            } else {
                              toggleFileSelection(file);
                            }
                          }}
                          className={`w-full p-2 text-left text-sm hover:bg-gray-100 flex items-center ${
                            selectedFiles.some(f => f.path === file.path) 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'text-gray-700'
                          }`}
                        >
                          {file.type === 'dir' ? (
                            <Folder size={14} className="mr-2" />
                          ) : (
                            <FileText size={14} className="mr-2" />
                          )}
                          <span className="truncate">{file.name}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {selectedFiles.length > 0 && (
                    <div className="p-4 border-t border-gray-200 bg-blue-50">
                      <p className="text-xs text-blue-700 mb-2">
                        {selectedFiles.length} files selected for context
                      </p>
                      <button
                        onClick={() => setSelectedFiles([])}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {!showGithubPanel && (
                <button
                  onClick={() => setShowGithubPanel(true)}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Show GitHub panel"
                >
                  <Github size={16} />
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-800">AI Code Assistant</h2>
                <p className="text-sm text-gray-600 flex items-center">
                  <Cloud size={14} className="mr-1" />
                  Powered by Mistral Codestral
                  {selectedRepo && (
                    <>
                      <span className="mx-2">•</span>
                      <Github size={14} className="mr-1" />
                      {selectedRepo.name}
                    </>
                  )}
                </p>
              </div>
            </div>
            
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
                onClick={checkApiStatus}
                className="p-2 hover:bg-gray-200 rounded"
                title="Check API status"
              >
                <RefreshCw size={16} />
              </button>
              
              {showGithubPanel && (
                <button
                  onClick={() => setShowGithubPanel(false)}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Hide GitHub panel"
                >
                  <X size={16} />
                </button>
              )}
              
              <button className="p-2 hover:bg-gray-200 rounded" title="Settings">
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mb-4">
            {modes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;
              const colors = colorClasses[mode.color as keyof typeof colorClasses];
              
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    isSelected
                      ? `${colors.border} ${colors.bg} ${colors.text}`
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                  title={mode.description}
                >
                  <Icon size={20} className="mx-auto mb-1" />
                  <div className="text-xs font-medium">{mode.label}</div>
                </button>
              );
            })}
          </div>

          {/* Project Context */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Project context (e.g., 'React TypeScript app with Tailwind')"
              value={projectContext}
              onChange={(e) => setProjectContext(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Selected Files Display */}
          {selectedFiles.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">Selected repository files:</p>
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    <FileText size={12} className="mr-1" />
                    {file.path}
                    <button
                      onClick={() => toggleFileSelection(file)}
                      className="ml-1 hover:text-green-600"
                      title="Remove from context"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">Uploaded files:</p>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    <Folder size={12} className="mr-1" />
                    {file.name}
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-1 hover:text-blue-600"
                      title="Remove file"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {showQuickActions && (
          <div className="border-b border-gray-200 p-4 bg-blue-50">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700">Quick Actions</h3>
              <button 
                onClick={() => setShowQuickActions(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Hide quick actions"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action)}
                    className="flex items-center p-2 bg-white hover:bg-blue-100 rounded border text-left text-sm transition-colors"
                    title={action.prompt}
                  >
                    <Icon size={14} className="mr-2 text-blue-600" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                {/* Message Header */}
                {message.mode && (
                  <div className="text-xs text-gray-500 mb-1">
                    {message.mode} Mode
                  </div>
                )}
                
                {/* Message Content */}
                <div
                  className={`px-4 py-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{formatMessageText(message.text)}</p>
                  <p className={`text-xs mt-2 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {/* GitHub Action Status */}
                {message.githubAction && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <div className="flex items-center text-yellow-800">
                      <Github size={14} className="mr-1" />
                      GitHub Action: {message.githubAction.type}
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        message.githubAction.status === 'completed' ? 'bg-green-100 text-green-800' :
                        message.githubAction.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {message.githubAction.status}
                      </span>
                    </div>
                    {message.githubAction.error && (
                      <p className="text-red-600 text-xs mt-1">{message.githubAction.error}</p>
                    )}
                  </div>
                )}

                {/* Code Blocks */}
                {message.codeBlocks && message.codeBlocks.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {message.codeBlocks.map((codeBlock) => (
                      <div key={codeBlock.id} className="bg-gray-900 rounded-lg overflow-hidden">
                        <div className="flex justify-between items-center px-4 py-2 bg-gray-800 text-gray-300 text-sm">
                          <span className="flex items-center">
                            <Code2 size={14} className="mr-1" />
                            {codeBlock.language}
                            {codeBlock.filename && (
                              <span className="ml-2 text-gray-400">({codeBlock.filename})</span>
                            )}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => copyToClipboard(codeBlock.code, codeBlock.id)}
                              className="flex items-center text-gray-400 hover:text-white transition-colors text-xs"
                              title="Copy code"
                            >
                              {copiedIndex === codeBlock.id ? (
                                <><Check size={14} className="mr-1" /> Copied</>
                              ) : (
                                <><Copy size={14} className="mr-1" /> Copy</>
                              )}
                            </button>
                            <button
                              onClick={() => downloadCode(codeBlock)}
                              className="flex items-center text-gray-400 hover:text-white transition-colors"
                              title="Download code"
                            >
                              <Download size={14} />
                            </button>
                            {selectedRepo && (
                              <button
                                onClick={() => {
                                  const filename = prompt('Enter filename for this code:');
                                  if (filename) {
                                    setInputText(`Create a new file called "${filename}" in the repository with this code:\n\`\`\`${codeBlock.language}\n${codeBlock.code}\n\`\`\``);
                                  }
                                }}
                                className="flex items-center text-gray-400 hover:text-white transition-colors"
                                title="Save to repository"
                              >
                                <Plus size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <pre className="p-4 overflow-x-auto text-sm text-gray-100">
                          <code>{codeBlock.code}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Loader2 size={16} className="animate-spin" />
                  <p className="text-sm">Generating code...</p>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-end space-x-2 mb-2">
            <div className="flex-1">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`${getCurrentMode().description}... (Shift+Enter for new line)`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[60px] max-h-32"
                rows={2}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex flex-col space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept=".js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition-colors"
                title="Upload files for context"
              >
                <Upload size={16} />
              </button>
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputText.trim()}
                className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                title="Send message"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>
              Mode: {getCurrentMode().label}
              {selectedRepo && ` • Repo: ${selectedRepo.name}`}
              {selectedFiles.length > 0 && ` • ${selectedFiles.length} files selected`}
              • Press Enter to send
            </span>
            {!showQuickActions && (
              <button 
                onClick={() => setShowQuickActions(true)}
                className="text-blue-600 hover:text-blue-800"
              >
                Show Quick Actions
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHubCodeAssistant;