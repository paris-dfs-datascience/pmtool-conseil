import React, { useState, useEffect } from 'react';
import FileBrowser from '../components/AutoML/FileBrowser';
import EDAComponent from '../components/AutoML/EDAComponent';
import { Cloud, Database, RefreshCw, BarChart3, Brain } from 'lucide-react';
import type { Bucket, File } from '../components/AutoML/types';

const AutoMLPage: React.FC = () => {
  // State management
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [currentBucket, setCurrentBucket] = useState<Bucket | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showFileBrowser, setShowFileBrowser] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<'files' | 'analysis'>('files');

  // Fetch buckets on component mount
  useEffect(() => {
    fetchBuckets();
  }, []);

  // Fetch files when bucket changes
  useEffect(() => {
    if (currentBucket) {
      fetchFiles();
    }
  }, [currentBucket]);

  const fetchBuckets = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://automl-443545551926.us-central1.run.app/api/buckets/');
      if (response.ok) {
        const data = await response.json();
        setBuckets(data);
        if (data.length > 0) {
          setCurrentBucket(data[0]); // Auto-select first bucket
        }
      } else {
        // Fallback to hardcoded bucket if API fails
        const fallbackBuckets = [{ name: 'table-data-conseil', region: 'us-central1' }];
        setBuckets(fallbackBuckets);
        setCurrentBucket(fallbackBuckets[0]);
      }
    } catch (error) {
      console.error('Error fetching buckets:', error);
      // Fallback to hardcoded bucket
      const fallbackBuckets = [{ name: 'table-data-conseil', region: 'us-central1' }];
      setBuckets(fallbackBuckets);
      setCurrentBucket(fallbackBuckets[0]);
    } finally {
      setLoading(false);
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
          contentType: file.contentType || ''
        }));
        setFiles(transformedFiles);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBucketChange = (bucket: Bucket) => {
    setCurrentBucket(bucket);
    setSelectedFile(null); // Clear selected file when bucket changes
    setActiveSection('files'); // Switch back to files view
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Automatically switch to analysis section when a data file is selected
    if (file.type === 'file' && (file.contentType?.includes('csv') || file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      setActiveSection('analysis');
    }
  };

  const handleSearchChange = (searchTerm: string) => {
    setSearchTerm(searchTerm);
  };

  const handleRefresh = () => {
    fetchFiles();
  };

  const handleClose = () => {
    setShowFileBrowser(false);
  };

  // Statistics for dashboard overview
  const totalFiles = files.filter(f => f.type === 'file').length;
  const totalFolders = files.filter(f => f.type === 'folder').length;
  const dataFiles = files.filter(f => 
    f.type === 'file' && (
      f.contentType?.includes('csv') || 
      f.name.endsWith('.csv') || 
      f.name.endsWith('.xlsx') || 
      f.name.endsWith('.xls')
    )
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            AutoML Data Analysis Platform
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Explore, analyze, and gain insights from your data with automated machine learning
          </p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Database className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Files</p>
                  <p className="text-2xl font-bold text-gray-900">{totalFiles}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Cloud className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Folders</p>
                  <p className="text-2xl font-bold text-gray-900">{totalFolders}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Data Files</p>
                  <p className="text-2xl font-bold text-gray-900">{dataFiles}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Brain className="h-8 w-8 text-orange-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Bucket</p>
                  <p className="text-lg font-bold text-gray-900">{currentBucket?.name || 'None'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveSection('files')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeSection === 'files'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Cloud className="inline-block w-4 h-4 mr-2" />
              File Explorer
            </button>
            <button
              onClick={() => setActiveSection('analysis')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeSection === 'analysis'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              disabled={!selectedFile || selectedFile.type !== 'file'}
            >
              <BarChart3 className="inline-block w-4 h-4 mr-2" />
              Data Analysis
              {selectedFile && selectedFile.type === 'file' && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                  {selectedFile.name}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* File Browser Section */}
          {(activeSection === 'files' || showFileBrowser) && (
            <div className={activeSection === 'files' ? 'flex-1' : 'w-80'}>
              <FileBrowser
                buckets={buckets}
                files={files}
                currentBucket={currentBucket}
                selectedFile={selectedFile}
                searchTerm={searchTerm}
                loading={loading}
                onBucketChange={handleBucketChange}
                onFileSelect={handleFileSelect}
                onSearchChange={handleSearchChange}
                onRefresh={handleRefresh}
                onClose={handleClose}
              />
            </div>
          )}

          {/* Analysis Section */}
          {activeSection === 'analysis' && (
            <div className={showFileBrowser && activeSection === 'analysis' ? 'flex-1' : 'w-full'}>
              {selectedFile ? (
                <EDAComponent
                  selectedFile={selectedFile}
                  bucketName={currentBucket?.name || ''}
                />
              ) : (
                <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
                  <BarChart3 className="mx-auto mb-4 text-gray-400" size={64} />
                  <h3 className="text-xl font-medium text-gray-600 mb-2">No File Selected</h3>
                  <p className="text-gray-500 mb-6">
                    Select a CSV or Excel file from the File Explorer to begin analysis
                  </p>
                  <button
                    onClick={() => setActiveSection('files')}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Go to File Explorer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Show/Hide File Browser Toggle for Analysis View */}
        {activeSection === 'analysis' && (
          <button
            onClick={() => setShowFileBrowser(!showFileBrowser)}
            className="fixed bottom-6 right-6 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors z-50"
          >
            <Cloud size={20} />
          </button>
        )}

        {/* Quick Actions */}
        {selectedFile && (
          <div className="fixed bottom-6 left-6 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-50">
            <p className="text-sm font-medium text-gray-600 mb-2">Selected File:</p>
            <p className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
              {selectedFile.name}
            </p>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => setActiveSection('files')}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Browse
              </button>
              <button
                onClick={() => setActiveSection('analysis')}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                disabled={selectedFile.type !== 'file'}
              >
                Analyze
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoMLPage;