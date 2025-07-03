import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Eye, Download, Lock, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth'; // Use the main app's useAuth hook

interface OCRResult {
  id: string;
  filename: string;
  status: 'processing' | 'completed' | 'error';
  text?: string;
  confidence?: number;
  error?: string;
  processedAt?: string;
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
}

export interface AuthContext {
  firebaseToken: string | null;
  firebaseUser: any;
  onSignOut: () => void;
  onAuthRequired: () => void;
}

interface OCRToolPageProps {
  authContext?: AuthContext;
}

const OCRToolPage: React.FC<OCRToolPageProps> = ({ authContext }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [results, setResults] = useState<OCRResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedResult, setSelectedResult] = useState<OCRResult | null>(null);
  const [apiStatus, setApiStatus] = useState({ 
    connected: false, 
    authRequired: false,
    error: undefined as string | undefined 
  });
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  
  const API_BASE = 'https://ocr-tool-443545551926.us-central1.run.app';
  const API_ENDPOINT = `${API_BASE}/api/ocr`;

  // Use the main app's useAuth hook
  const { user, loading: authLoading, isAuthorized } = useAuth();

  // Destructure authContext with fallbacks
  const firebaseToken = authContext?.firebaseToken || null;
  const firebaseUser = authContext?.firebaseUser || null;
  const onSignOut = authContext?.onSignOut || (() => {});
  const onAuthRequired = authContext?.onAuthRequired || (() => {});

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {};
    
    if (firebaseToken) {
      headers['Authorization'] = `Bearer ${firebaseToken}`;
    }
    
    return headers;
  };

  // Check API status on component mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    setIsCheckingStatus(true);
    try {
      // Check health endpoint
      const healthResponse = await fetch(`${API_BASE}/health`);
      const healthData = await healthResponse.json();
      
      // Check auth status
      const authResponse = await fetch(`${API_BASE}/auth/status`);
      const authData = await authResponse.json();
      
      setApiStatus({
        connected: healthResponse.ok && healthData.status === 'healthy',
        authRequired: authData.authentication_enabled || false,
        error: undefined
      });
    } catch (error) {
      console.error('Error checking API status:', error);
      setApiStatus({
        connected: false,
        authRequired: false,
        error: 'Cannot connect to OCR service'
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    selectedFiles.forEach(file => {
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const id = Math.random().toString(36).substr(2, 9);
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const preview = file.type.startsWith('image/') ? e.target?.result as string : undefined;
          setFiles(prev => [...prev, { file, id, preview }]);
        };
        
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    
    droppedFiles.forEach(file => {
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const id = Math.random().toString(36).substr(2, 9);
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const preview = file.type.startsWith('image/') ? e.target?.result as string : undefined;
          setFiles(prev => [...prev, { file, id, preview }]);
        };
        
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    // Check authentication for protected endpoints
    if (!firebaseToken && apiStatus.authRequired) {
      onAuthRequired();
      return;
    }

    setIsProcessing(true);
    
    for (const uploadedFile of files) {
      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      
      // Add initial processing status
      const initialResult: OCRResult = {
        id: uploadedFile.id,
        filename: uploadedFile.file.name,
        status: 'processing'
      };
      
      setResults(prev => [...prev.filter(r => r.id !== uploadedFile.id), initialResult]);

      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
        });

        if (response.status === 401) {
          onAuthRequired();
          throw new Error('Authentication required');
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('API Response:', result); // Debug log
        
        const completedResult: OCRResult = {
          id: uploadedFile.id,
          filename: uploadedFile.file.name,
          status: 'completed',
          text: result.text || result.extracted_text || '',
          confidence: result.confidence,
          processedAt: result.processed_at || new Date().toISOString()
        };

        console.log('Completed Result:', completedResult); // Debug log

        setResults(prev => prev.map(r => r.id === uploadedFile.id ? completedResult : r));
        
      } catch (error) {
        const errorResult: OCRResult = {
          id: uploadedFile.id,
          filename: uploadedFile.file.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };

        setResults(prev => prev.map(r => r.id === uploadedFile.id ? errorResult : r));
      }
    }

    setIsProcessing(false);
  };

  const clearAll = () => {
    setFiles([]);
    setResults([]);
    setSelectedResult(null);
  };

  const downloadResult = (result: OCRResult) => {
    if (!result.text) return;
    
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.filename}_ocr.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const StatusIcon = ({ status }: { status: OCRResult['status'] }) => {
    switch (status) {
      case 'processing':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const needsAuth = apiStatus.authRequired && !firebaseToken;
  const userIsAuthenticated = user && isAuthorized && firebaseToken;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {/* Header with Auth Status */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Mistral OCR Document Processor</h1>
              <p className="text-gray-600">Upload images or PDF documents to extract text using Mistral's OCR capabilities</p>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center space-x-4">
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
                onClick={checkApiStatus}
                disabled={isCheckingStatus}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                {isCheckingStatus ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  'Test'
                )}
              </button>
            </div>
          </div>

          {/* User Info */}
          {firebaseUser && (
            <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded p-2">
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

          {/* Auth Required Warning */}
          {needsAuth && (
            <div className="mb-4 bg-orange-50 border border-orange-200 rounded p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-orange-700 font-medium">
                  🔐 Authentication required to use OCR service
                </span>
                <button
                  onClick={onAuthRequired}
                  className="text-xs px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* Auth Error */}
          {firebaseToken && user && !isAuthorized && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded p-2">
              <span className="text-xs text-red-700">
                Access Denied: Your account is not authorized for this application
              </span>
            </div>
          )}

          {/* Connection Error */}
          {!apiStatus.connected && apiStatus.error && (
            <div className="mb-4 text-xs text-red-600 bg-red-50 p-2 rounded">
              Error: {apiStatus.error}
              <div className="mt-1 text-gray-600">
                Make sure the OCR service is running and accessible.
              </div>
            </div>
          )}

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
              needsAuth 
                ? 'border-orange-300 bg-orange-50'
                : 'border-gray-300 hover:border-blue-400'
            }`}
            onDrop={needsAuth ? undefined : handleDrop}
            onDragOver={needsAuth ? undefined : handleDragOver}
          >
            <Upload className={`mx-auto h-12 w-12 mb-4 ${needsAuth ? 'text-orange-400' : 'text-gray-400'}`} />
            <p className={`text-lg font-medium mb-2 ${needsAuth ? 'text-orange-700' : 'text-gray-700'}`}>
              {needsAuth ? 'Please sign in to upload files' : 'Drop files here or click to upload'}
            </p>
            <p className={`text-sm mb-4 ${needsAuth ? 'text-orange-600' : 'text-gray-500'}`}>
              Supports images (PNG, JPG, JPEG) and PDF files
            </p>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              disabled={needsAuth}
            />
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
                needsAuth
                  ? 'bg-orange-400 text-orange-700 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
              }`}
            >
              {needsAuth ? 'Sign In Required' : 'Select Files'}
            </label>
          </div>

          {/* Uploaded Files */}
          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Uploaded Files ({files.length})
                </h3>
                <div className="space-x-2">
                  <button
                    onClick={processFiles}
                    disabled={isProcessing || needsAuth}
                    className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                      needsAuth || isProcessing
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isProcessing ? 'Processing...' : needsAuth ? 'Sign In Required' : 'Process All'}
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((uploadedFile) => (
                  <div key={uploadedFile.id} className="border rounded-lg p-4 bg-gray-50">
                    {uploadedFile.preview && (
                      <img
                        src={uploadedFile.preview}
                        alt={uploadedFile.file.name}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {uploadedFile.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(uploadedFile.id)}
                        className="ml-2 p-1 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">OCR Results</h2>
            
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <span className="font-medium text-gray-900">{result.filename}</span>
                      <StatusIcon status={result.status} />
                    </div>
                    
                    {result.status === 'completed' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedResult(result)}
                          className="p-2 text-blue-600 hover:text-blue-800"
                          title="View full text"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => downloadResult(result)}
                          className="p-2 text-green-600 hover:text-green-800"
                          title="Download text"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {result.status === 'completed' && (
                    <div className="mt-2">
                      {result.confidence && (
                        <p className="text-sm text-gray-600 mb-2">
                          Confidence: {(result.confidence * 100).toFixed(1)}%
                        </p>
                      )}
                      <div className="bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                          {result.text?.substring(0, 200)}
                          {result.text && result.text.length > 200 && '...'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {result.status === 'error' && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm text-red-700">{result.error}</p>
                    </div>
                  )}
                  
                  {result.processedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Processed: {new Date(result.processedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Text Modal */}
        {selectedResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedResult.filename}
                </h3>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {selectedResult.text}
                </pre>
              </div>
              <div className="p-6 border-t bg-gray-50">
                <button
                  onClick={() => downloadResult(selectedResult)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  Download Text
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OCRToolPage;