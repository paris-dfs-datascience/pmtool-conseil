import React, { useState, useEffect } from 'react';
import { Cloud, Database, Search, RefreshCw, X, Folder, FileText, Loader2 } from 'lucide-react';

// Import your existing components
import FileBrowser from './FileBrowser';
import EDAComponent from './EDAComponent';

interface File {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size: number;
  modified: string;
  contentType: string;
}

interface Bucket {
  name: string;
  region: string;
}

const AutoMLDashboard: React.FC = () => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [currentBucket, setCurrentBucket] = useState<Bucket | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(true);

  // Fetch buckets on component mount
  useEffect(() => {
    fetchBuckets();
  }, []);

  const fetchBuckets = async () => {
    try {
      const response = await fetch('https://automl-443545551926.us-central1.run.app/api/buckets/');
      if (response.ok) {
        const data = await response.json();
        setBuckets(data);
        if (data.length > 0) {
          setCurrentBucket(data[0]); // Auto-select first bucket
        }
      }
    } catch (error) {
      console.error('Error fetching buckets:', error);
    }
  };

  const fetchFiles = async () => {
    if (!currentBucket) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://automl-443545551926.us-central1.run.app/api/list-files/?bucket_name=${currentBucket.name}`
      );
      if (response.ok) {
        const data = await response.json();
        const transformedFiles: File[] = data.files.map((file: any) => ({
          name: file.name,
          path: file.name,
          type: file.type,
          size: file.size || 0,
          modified: file.modified || '',
          contentType: file.contentType
        }));
        setFiles(transformedFiles);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBucket) {
      fetchFiles();
    }
  }, [currentBucket]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleBucketChange = (bucket: Bucket) => {
    setCurrentBucket(bucket);
    setSelectedFile(null); // Clear selected file when bucket changes
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AutoML Data Analysis Platform</h1>
          <p className="text-gray-600">Upload, explore, and analyze your data with automated machine learning insights</p>
        </div>

        <div className="flex gap-6">
          {/* File Browser Sidebar */}
          {showFileBrowser && (
            <FileBrowser
              buckets={buckets}
              files={files}
              currentBucket={currentBucket}
              selectedFile={selectedFile}
              searchTerm={searchTerm}
              loading={loading}
              onBucketChange={handleBucketChange}
              onFileSelect={handleFileSelect}
              onSearchChange={setSearchTerm}
              onRefresh={fetchFiles}
              onClose={() => setShowFileBrowser(false)}
            />
          )}

          {/* Main Content Area */}
          <div className="flex-1">
            {!showFileBrowser && (
              <button
                onClick={() => setShowFileBrowser(true)}
                className="mb-4 flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Cloud className="mr-2" size={16} />
                Show File Browser
              </button>
            )}

            {/* EDA Component */}
            {selectedFile ? (
              <EDAComponent selectedFile={selectedFile} bucketName={currentBucket?.name || ''} />
            ) : (
              <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
                <Database className="mx-auto mb-4 text-gray-400" size={64} />
                <h3 className="text-xl font-medium text-gray-600 mb-2">Welcome to AutoML Analytics</h3>
                <p className="text-gray-500 mb-6">
                  Select a data file from the sidebar to begin exploratory data analysis
                </p>
                
                {/* Feature Highlights */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-blue-600 font-medium">Data Quality</div>
                    <div className="text-sm text-blue-500 mt-1">Missing values, completeness analysis</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-green-600 font-medium">Statistics</div>
                    <div className="text-sm text-green-500 mt-1">Descriptive stats, distributions</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-purple-600 font-medium">Correlations</div>
                    <div className="text-sm text-purple-500 mt-1">Feature relationships, patterns</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-orange-600 font-medium">Smart Insights</div>
                    <div className="text-sm text-orange-500 mt-1">AI-powered recommendations</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoMLDashboard;