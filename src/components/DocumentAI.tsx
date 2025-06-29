import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader, Download, Eye } from 'lucide-react';

// Types for Document AI responses
interface ExtractedEntity {
  type: string;
  mentionText: string;
  confidence: number;
  startOffset?: number;
  endOffset?: number;
}

interface ExtractedTable {
  headerRows: string[][];
  bodyRows: string[][];
  confidence: number;
}

interface ProcessedDocument {
  text: string;
  entities: ExtractedEntity[];
  tables: ExtractedTable[];
  confidence: number;
  processorType: string;
  pageCount: number;
}

interface ProcessingStatus {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
}

// Mock API function - replace with your actual backend endpoint
const processDocument = async (file: File, processorType: string): Promise<ProcessedDocument> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock response - replace with actual API integration
  return {
    text: `Sample extracted text from ${file.name}. This would contain the full document text extracted by Document AI.`,
    entities: [
      { type: 'PERSON', mentionText: 'John Doe', confidence: 0.95 },
      { type: 'DATE', mentionText: '2024-01-15', confidence: 0.92 },
      { type: 'MONEY', mentionText: '$1,250.00', confidence: 0.98 }
    ],
    tables: [
      {
        headerRows: [['Item', 'Quantity', 'Price']],
        bodyRows: [
          ['Consulting Services', '10 hours', '$125.00'],
          ['Software License', '1', '$500.00']
        ],
        confidence: 0.89
      }
    ],
    confidence: 0.94,
    processorType,
    pageCount: 1
  };
};

const DocumentAIProcessor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processorType, setProcessorType] = useState<string>('general');
  const [status, setStatus] = useState<ProcessingStatus>({
    status: 'idle',
    progress: 0,
    message: 'Ready to process documents'
  });
  const [processedData, setProcessedData] = useState<ProcessedDocument | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processorTypes = [
    { value: 'general', label: 'General Document' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'contract', label: 'Contract' },
    { value: 'tax_form', label: 'Tax Form' }
  ];

  const acceptedFileTypes = '.pdf,.png,.jpg,.jpeg,.tiff,.gif,.bmp';

  const handleFileSelect = useCallback((file: File) => {
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      setStatus({
        status: 'error',
        progress: 0,
        message: 'File size must be less than 20MB'
      });
      return;
    }

    setSelectedFile(file);
    setProcessedData(null);
    setStatus({
      status: 'idle',
      progress: 0,
      message: `Selected: ${file.name}`
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const processFile = async () => {
    if (!selectedFile) return;

    setStatus({ status: 'uploading', progress: 25, message: 'Uploading file...' });
    
    try {
      setStatus({ status: 'processing', progress: 50, message: 'Processing document...' });
      
      const result = await processDocument(selectedFile, processorType);
      
      setStatus({ status: 'processing', progress: 90, message: 'Finalizing results...' });
      
      setTimeout(() => {
        setProcessedData(result);
        setStatus({ 
          status: 'completed', 
          progress: 100, 
          message: 'Document processed successfully!' 
        });
      }, 500);
      
    } catch (error) {
      setStatus({
        status: 'error',
        progress: 0,
        message: 'Failed to process document. Please try again.'
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'uploading':
      case 'processing':
        return <Loader className="w-5 h-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Document AI Processor</h1>
        
        {/* File Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <select
              value={processorType}
              onChange={(e) => setProcessorType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {processorTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              accept={acceptedFileTypes}
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop your document here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports PDF, PNG, JPG, TIFF (max 20MB)
            </p>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={processFile}
                disabled={status.status === 'uploading' || status.status === 'processing'}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Process Document
              </button>
            </div>
          )}
        </div>

        {/* Status Section */}
        {status.status !== 'idle' && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              {getStatusIcon()}
              <span className="font-medium text-gray-900">{status.message}</span>
            </div>
            {(status.status === 'uploading' || status.status === 'processing') && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Section */}
      {processedData && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Processing Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{processedData.pageCount}</p>
                <p className="text-sm text-gray-600">Pages</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{processedData.entities.length}</p>
                <p className="text-sm text-gray-600">Entities</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{processedData.tables.length}</p>
                <p className="text-sm text-gray-600">Tables</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className={`text-2xl font-bold ${getConfidenceColor(processedData.confidence)}`}>
                  {(processedData.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600">Confidence</p>
              </div>
            </div>
          </div>

          {/* Extracted Text */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Extracted Text</h2>
              <button className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{processedData.text}</pre>
            </div>
          </div>

          {/* Entities */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Detected Entities</h2>
            <div className="space-y-3">
              {processedData.entities.map((entity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full mr-3">
                      {entity.type}
                    </span>
                    <span className="font-medium text-gray-900">{entity.mentionText}</span>
                  </div>
                  <span className={`text-sm font-medium ${getConfidenceColor(entity.confidence)}`}>
                    {(entity.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tables */}
          {processedData.tables.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Extracted Tables</h2>
              {processedData.tables.map((table, index) => (
                <div key={index} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">Table {index + 1}</h3>
                    <span className={`text-sm font-medium ${getConfidenceColor(table.confidence)}`}>
                      Confidence: {(table.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        {table.headerRows.map((headerRow, headerIndex) => (
                          <tr key={headerIndex}>
                            {headerRow.map((header, cellIndex) => (
                              <th key={cellIndex} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {header}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {table.bodyRows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentAIProcessor;