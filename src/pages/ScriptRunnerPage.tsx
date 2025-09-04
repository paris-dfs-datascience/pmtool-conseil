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
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setError(null);
    setResult(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
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

  const runScript = async (): Promise<void> => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      // Create FormData to send the file
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Replace with your actual cloud function URL
      const response = await fetch('YOUR_CLOUD_FUNCTION_URL', {
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to run script. Please try again.';
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
    a.download = `script_result_${new Date().toISOString().split('T')[0]}.txt`;
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
          Upload a file and run the processing script
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
                accept=".csv,.txt,.json,.xlsx,.xls" // Customize based on what your script accepts
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
                          Supports CSV, TXT, JSON, Excel files
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Run Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={runScript}
              disabled={!selectedFile || isUploading}
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
                  <span>Run Script</span>
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
                    Script Completed Successfully
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
              <li>Select or drag & drop your file into the upload area</li>
              <li>Click "Run Script" to process your file</li>
              <li>Wait for the processing to complete</li>
              <li>View results and download the processed output</li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Make sure your file is in the correct format. 
                Processing time depends on file size and complexity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptRunnerPage;