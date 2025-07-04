// components/FileBrowser.tsx
import React from 'react';
import { Cloud, Search, RefreshCw, X, Folder, Database, FileText, Loader2 } from 'lucide-react';
import type { FileBrowserProps } from '../types';
import { formatFileSize, formatDate } from '../fileAnalysisUtils';

interface FileBrowserPropsExtended extends FileBrowserProps {
  onClose: () => void;
}

const FileBrowser: React.FC<FileBrowserPropsExtended> = ({
  buckets,
  files,
  currentBucket,
  selectedFile,
  searchTerm,
  loading,
  onBucketChange,
  onFileSelect,
  onSearchChange,
  onRefresh,
  onClose
}) => {
  const getFileIcon = (file: any) => {
    if (file.type === 'folder') return Folder;
    if (file.contentType?.includes('csv') || file.name.endsWith('.csv')) return Database;
    return FileText;
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Cloud className="mr-2 text-blue-500" size={20} />
            Cloud Storage
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
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
            {buckets.map(bucket => (
              <option key={bucket.name} value={bucket.name}>
                {bucket.name} ({bucket.region})
              </option>
            ))}
          </select>
        </div>

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
        ) : (
          <div className="divide-y divide-gray-100">
            {files.map((file, index) => {
              const Icon = getFileIcon(file);
              const isSelected = selectedFile?.path === file.path;
              
              return (
                <div
                  key={index}
                  onClick={() => onFileSelect(file)}
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
                        {file.type === 'file' && (
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