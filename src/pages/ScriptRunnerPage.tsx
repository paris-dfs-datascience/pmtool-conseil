import React, { useState } from 'react';
import { Upload, Play, FileText, AlertCircle, CheckCircle, Loader, Download } from 'lucide-react';

interface ScriptResult {
  success?: boolean;
  output?: string;
  stats?: Record<string, string | number>;
  downloadUrl?: string;
  message?: string;
}

interface ScriptRunnerPageProps {
  // Add any props here if needed in the future
}

const ScriptRunnerPage: React.FC<ScriptRunnerPageProps> = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [email, setEmail] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] || null;
    
    if (file && !file.name.toLowerCase().endsWith('.docx')) {
      setError('Please select a .docx file only');
      setSelectedFile(null);
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    setResult(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.docx')) {
        setError('Please select a .docx file only');
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      setResult(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragOver(false);
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const runScript = async (): Promise<void> => {
    if (!selectedFile) {
      setError('Please select a .docx file first');
      return;
    }

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      // Create FormData to send the file and email
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('email', email.trim());
      
      // Call your Cloud Run API
      const response = await fetch('https://document-processor-443545551926.us-central1.run.app/process', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ScriptResult = await response.json();
      setResult(data);
      
    } catch (err) {
      console.error('Error running script:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process document. Please try again.';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadResult = (): void => {
    if (!result?.output) return;
    
    const blob = new Blob([result.output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processed_document_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    return (bytes / 1024 / 1024).toFixed(2);
  };

  const formatOutput = (output: unknown): string => {
    if (typeof output === 'string') {
      return output.slice(0, 1000) + (output.length > 1000 ? '\n\n... (truncated)' : '');
    }
    const jsonString = JSON.stringify(output, null, 2);
    return jsonString.slice(0, 1000) + (jsonString.length > 1000 ? '\n\n... (truncated)' : '');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Script Runner</h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload a .docx file and process it via email
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          
          {/* File Upload Area */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : selectedFile 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                accept=".docx"
              />
              
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center space-y-4">
                  {selectedFile ? (
                    <>
                      <FileText className="w-12 h-12 text-green-500" />
                      <div>
                        <p className="text-lg font-medium text-green-700">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-green-600">
                          {formatFileSize(selectedFile.size)} MB
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400" />
                      <div>
                        <p className="text-lg font-medium text-gray-700">
                          Drop your file here or click to browse
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Supports .docx files only
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Email Input */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email to receive processed document"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Run Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={runScript}
              disabled={!selectedFile || !email.trim() || isUploading}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Process & Email Document</span>
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 font-medium">Error</p>
              </div>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h3 className="text-lg font-medium text-green-800">
                    Document Processed Successfully
                  </h3>
                </div>
                {result.output && (
                  <button
                    onClick={downloadResult}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                )}
              </div>
              <p className="text-sm text-green-700 mb-4">
                Results have been sent to: <strong>{email}</strong>
              </p>
              
              {/* Processing Stats */}
              {result.stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {Object.entries(result.stats).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <p className="text-2xl font-bold text-green-700">{value}</p>
                      <p className="text-sm text-green-600 capitalize">{key.replace('_', ' ')}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Output Preview */}
              {result.output && (
                <div>
                  <h4 className="font-medium text-green-800 mb-2">Output Preview:</h4>
                  <div className="bg-white border border-green-200 rounded p-4 max-h-64 overflow-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {formatOutput(result.output)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Download Link for processed file */}
              {result.downloadUrl && (
                <div className="mt-4">
                  <a
                    href={result.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Processed File</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Usage Instructions */}
          <div className="mt-12 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Use</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Select or drag & drop your .docx file into the upload area</li>
              <li>Enter the email address where you want to receive the processed document</li>
              <li>Click "Process & Email Document" to start processing</li>
              <li>Wait for the processing to complete</li>
              <li>Check your email for the processed document</li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Only .docx files are supported. 
                Processing time depends on document size and complexity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptRunnerPage;