import React, { useState, useEffect } from 'react';
import { Cloud, Search, RefreshCw, X, Folder, Database, FileText, Loader2 } from 'lucide-react';

// Import your types
import type { FileBrowserProps, File, Bucket } from './types';

// Define the API response structure (back to original)
interface ApiFile {
  name: string;
  type: 'file' | 'folder';
  size: number;
  modified: string | null;
  contentType: string;
}

interface ApiResponse {
  files: ApiFile[];
}

interface FileBrowserPropsExtended extends FileBrowserProps {
  onClose: () => void;
}

const FileBrowser: React.FC<FileBrowserPropsExtended> = ({
  buckets,
  files: propFiles,
  currentBucket,
  selectedFile,
  searchTerm,
  loading: propLoading,
  onBucketChange,
  onFileSelect,
  onSearchChange,
  onRefresh,
  onClose
}) => {
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  // Use files from props if provided, otherwise use local state
  const files = propFiles && propFiles.length > 0 ? propFiles : localFiles;
  const loading = propLoading !== undefined ? propLoading : localLoading;

  console.log('State debug:', {
    propFiles: propFiles?.length || 0,
    localFiles: localFiles.length,
    finalFiles: files.length,
    propLoading,
    localLoading,
    finalLoading: loading
  });

  useEffect(() => {
    console.log('useEffect triggered:', { currentBucket, propFiles });
    if (currentBucket && (!propFiles || propFiles.length === 0)) {
      console.log('Fetching files for bucket:', currentBucket.name);
      // Reset path when bucket changes
      setCurrentPath('');
      setPathHistory([]);
      fetchFiles('');
    }
  }, [currentBucket, propFiles]);

  const fetchFiles = async (folderPrefix: string = '') => {
    if (!currentBucket) return;
    
    setLocalLoading(true);
    try {
      const url = `https://automl-443545551926.us-central1.run.app/api/list-files/?prefix=${encodeURIComponent(folderPrefix)}`;
      console.log('Fetching from:', url);
      
      const response = await fetch(url);
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      console.log('Response data:', data);
      
      // Transform the data to match expected format (with path property)
      const transformedFiles: File[] = data.files.map((file: ApiFile) => ({
        name: file.name,
        path: file.name, // Use name as path for now
        type: file.type,
        size: file.size || 0,
        modified: file.modified || '',
        contentType: file.contentType
      }));
      
      console.log('Setting local files:', transformedFiles);
      setLocalFiles(transformedFiles);
      
    } catch (error) {
      console.error('Error fetching files:', error);
      setLocalFiles([]);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleFolderClick = (folderName: string) => {
    // For simple folder navigation, we'll use the folder name as prefix
    const newPrefix = currentPath ? `${currentPath}/${folderName}` : folderName;
    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(newPrefix);
    fetchFiles(newPrefix);
  };

  const handleBackClick = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1];
      setPathHistory(pathHistory.slice(0, -1));
      fetchFiles(previousPath);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'folder') return Folder;
    if (file.contentType?.includes('csv') || file.name.endsWith('.csv')) return Database;
    return FileText;
  };

  // Filter files based on search term
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('Render debug:', {
    files: files.length,
    filteredFiles: filteredFiles.length,
    currentBucket,
    loading,
    searchTerm
  });

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Cloud className="mr-2 text-blue-500" size={20} />
            Cloud Storage
          </h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => fetchFiles(currentPath)} 
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Bucket Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Storage Bucket
          </label>
          <select
            value={currentBucket?.name || ''}
            onChange={(e) => {
              const bucket = buckets.find(b => b.name === e.target.value);
              if (bucket) onBucketChange(bucket);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a bucket...</option>
            {buckets.map(bucket => (
              <option key={bucket.name} value={bucket.name}>
                {bucket.name} {bucket.region && `(${bucket.region})`}
              </option>
            ))}
          </select>
        </div>

        {/* Breadcrumb Navigation */}
        {currentPath && (
          <div className="mb-4 p-2 bg-gray-100 rounded-md">
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium text-blue-600">{currentBucket?.name}</span>
              <span className="mx-2">/</span>
              <span>{currentPath}</span>
            </div>
          </div>
        )}

        {/* Back Button */}
        {pathHistory.length > 0 && (
          <button
            onClick={handleBackClick}
            className="mb-4 flex items-center px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            ← Back
          </button>
        )}

        {/* Manual Fetch Button for debugging */}
        <button
          onClick={() => fetchFiles('')}
          className="mb-4 w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Load Files (Debug)
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <Loader2 className="mx-auto mb-2 animate-spin text-gray-400" size={24} />
            <p className="text-sm text-gray-600">Loading files...</p>
          </div>
        ) : !currentBucket ? (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">Select a bucket to view files</p>
          </div>
        ) : filteredFiles.length === 0 && files.length > 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">No files match your search "{searchTerm}"</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">No files found in this bucket</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredFiles.map((file, index) => {
              const Icon = getFileIcon(file);
              const isSelected = selectedFile?.name === file.name;

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (file.type === 'folder') {
                      // Use name for folder navigation, strip trailing slash if present
                      const folderName = file.name.endsWith('/') ? file.name.slice(0, -1) : file.name;
                      handleFolderClick(folderName);
                    } else {
                      onFileSelect(file);
                    }
                  }}
                  className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      size={20}
                      className={file.type === 'folder' ? 'text-blue-500' : 'text-gray-500'}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>{formatDate(file.modified)}</div>
                        {file.type === 'file' && file.size && (
                          <div>{formatFileSize(file.size)}</div>
                        )}
                        {file.metadata && (
                          <div className="text-blue-600">
                            {file.metadata.rows && `${file.metadata.rows.toLocaleString()} rows`}
                            {file.metadata.columns && ` • ${file.metadata.columns} cols`}
                            {file.metadata.records && `${file.metadata.records.toLocaleString()} records`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileBrowser;