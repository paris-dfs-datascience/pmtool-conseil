// CloudStorageEDAInterface.tsx - Main component using modular structure
import React, { useState, useEffect } from 'react';
import { 
  Cloud,
  Settings,
  RefreshCw,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';

// Import types
import type { 
  CloudFile, 
  CloudBucket, 
  FileAnalysisInfo, 
  AnalysisAction,
  UIState 
} from './types';

// Import data and utilities
import { mockBuckets, mockFiles } from './mockData';
import { analyzeFile, formatFileSize, formatDate } from './fileAnalysisUtils';
import { 
  allAnalysisActions, 
  getActionsByCategory, 
  analysisCategories 
} from './analysisActions';

// Import sub-components (these would be separate files)
import { FileBrowser, AnalysisActions, FileAnalysisPanel } from './components';


const CloudStorageEDAInterface: React.FC = () => {
  // ==============================
  // STATE MANAGEMENT
  // ==============================
  
  const [uiState, setUIState] = useState<UIState>({
    showFilePanel: true,
    selectedFile: null,
    currentBucket: null,
    currentPath: '',
    searchTerm: '',
    loading: false,
    analysisLoading: false,
    expandedSections: {
      overview: true,
      columns: true,
      quality: true
    }
  });

  const [analysisState, setAnalysisState] = useState({
    fileAnalysis: null as FileAnalysisInfo | null,
    runningAnalyses: [] as any[],
    completedAnalyses: [] as any[]
  });

  const [buckets, setBuckets] = useState<CloudBucket[]>([]);
  const [files, setFiles] = useState<CloudFile[]>([]);

  // ==============================
  // EFFECTS
  // ==============================

  useEffect(() => {
    // Initialize with mock data
    setBuckets(mockBuckets);
    if (mockBuckets.length > 0) {
      setUIState(prev => ({ ...prev, currentBucket: mockBuckets[0] }));
    }
  }, []);

  useEffect(() => {
    if (uiState.currentBucket) {
      loadFiles();
    }
  }, [uiState.currentBucket, uiState.currentPath]);

  useEffect(() => {
    if (uiState.selectedFile && uiState.selectedFile.type === 'file') {
      handleFileAnalysis(uiState.selectedFile);
    }
  }, [uiState.selectedFile]);

  // ==============================
  // DATA LOADING FUNCTIONS
  // ==============================

  const loadFiles = async () => {
    setUIState(prev => ({ ...prev, loading: true }));
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setFiles(mockFiles);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setUIState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleFileAnalysis = async (file: CloudFile) => {
    setUIState(prev => ({ ...prev, analysisLoading: true }));
    
    try {
      const analysis = await analyzeFile(file);
      setAnalysisState(prev => ({ ...prev, fileAnalysis: analysis }));
    } catch (error) {
      console.error('Error analyzing file:', error);
    } finally {
      setUIState(prev => ({ ...prev, analysisLoading: false }));
    }
  };

  // ==============================
  // EVENT HANDLERS
  // ==============================

  const handleBucketChange = (bucket: CloudBucket) => {
    setUIState(prev => ({
      ...prev,
      currentBucket: bucket,
      selectedFile: null,
      currentPath: ''
    }));
    setAnalysisState(prev => ({ ...prev, fileAnalysis: null }));
  };

  const handleFileSelect = (file: CloudFile) => {
    setUIState(prev => ({ ...prev, selectedFile: file }));
  };

  const handleSearchChange = (term: string) => {
    setUIState(prev => ({ ...prev, searchTerm: term }));
  };

  const handleTargetColumnChange = (column: string) => {
    setAnalysisState(prev => ({
      ...prev,
      fileAnalysis: prev.fileAnalysis ? {
        ...prev.fileAnalysis,
        targetColumn: column
      } : null
    }));
  };

  const handleToggleSection = (section: string) => {
    setUIState(prev => ({
      ...prev,
      expandedSections: {
        ...prev.expandedSections,
        [section]: !prev.expandedSections[section]
      }
    }));
  };

  const handleRunAnalysis = async (actionId: string) => {
    if (!uiState.selectedFile || !analysisState.fileAnalysis || !uiState.currentBucket) {
      return;
    }

    const action = allAnalysisActions.find(a => a.id === actionId);
    if (!action) return;

    if (action.requiresTarget && !analysisState.fileAnalysis.targetColumn) {
      alert('Please select a target column for this analysis');
      return;
    }

    console.log(`Running ${action.label} analysis:`, {
      file: uiState.selectedFile.path,
      bucket: uiState.currentBucket.name,
      targetColumn: analysisState.fileAnalysis.targetColumn,
      action: actionId
    });

    // Here you would call your backend API
    alert(`Starting ${action.label} analysis on ${uiState.selectedFile.name}${
      analysisState.fileAnalysis.targetColumn ? ` with target: ${analysisState.fileAnalysis.targetColumn}` : ''
    }`);
  };

  // ==============================
  // HELPER FUNCTIONS
  // ==============================

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(uiState.searchTerm.toLowerCase())
  );

  const canRunAction = (action: AnalysisAction) => {
    if (!uiState.selectedFile) return false;
    if (uiState.selectedFile.type === 'folder') return false;
    
    const fileExtension = uiState.selectedFile.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !action.fileTypes.includes(fileExtension)) return false;
    
    return true;
  };

  // ==============================
  // RENDER FUNCTIONS
  // ==============================

  const renderEmptyState = () => {
    if (!uiState.selectedFile) {
      return (
        <div className="text-center py-12">
          <Cloud className="mx-auto mb-4 text-gray-400" size={64} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a file to analyze</h3>
          <p className="text-gray-600">Choose a CSV, Excel, or JSON file from your cloud storage to start analysis</p>
        </div>
      );
    }

    if (uiState.selectedFile.type === 'folder') {
      return (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 text-gray-400" style={{ fontSize: '64px' }}>📁</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Folder selected</h3>
          <p className="text-gray-600">Please select a data file for analysis</p>
        </div>
      );
    }

    return null;
  };

  const renderLoadingState = () => (
    <div className="text-center py-12">
      <Loader2 className="mx-auto mb-4 animate-spin text-blue-500" size={48} />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing file...</h3>
      <p className="text-gray-600">Extracting metadata and schema information</p>
    </div>
  );

  const renderErrorState = () => (
    <div className="text-center py-12">
      <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis failed</h3>
      <p className="text-gray-600">Unable to analyze this file. Please try a different file.</p>
    </div>
  );

  // ==============================
  // MAIN RENDER
  // ==============================

  return (
    <div className="flex h-screen bg-gray-50">
      {/* File Browser Sidebar */}
      {uiState.showFilePanel && (
        <FileBrowser
          buckets={buckets}
          files={filteredFiles}
          currentBucket={uiState.currentBucket}
          selectedFile={uiState.selectedFile}
          searchTerm={uiState.searchTerm}
          loading={uiState.loading}
          onBucketChange={handleBucketChange}
          onFileSelect={handleFileSelect}
          onSearchChange={handleSearchChange}
          onRefresh={loadFiles}
          onClose={() => setUIState(prev => ({ ...prev, showFilePanel: false }))}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with Analysis Actions */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {!uiState.showFilePanel && (
                <button
                  onClick={() => setUIState(prev => ({ ...prev, showFilePanel: true }))}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Show file panel"
                >
                  📁
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  {uiState.selectedFile ? `Analysis: ${uiState.selectedFile.name}` : 'Cloud Storage EDA'}
                </h1>
                <p className="text-sm text-gray-600">
                  {uiState.currentBucket ? `${uiState.currentBucket.name} • ${uiState.currentBucket.region}` : 'Select a file to start analysis'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={loadFiles}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Refresh files"
              >
                <RefreshCw size={20} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Settings">
                <Settings size={20} />
              </button>
            </div>
          </div>

          {/* Analysis Actions */}
          {uiState.selectedFile && uiState.selectedFile.type === 'file' && (
            <AnalysisActions
              selectedFile={uiState.selectedFile}
              fileAnalysis={analysisState.fileAnalysis}
              onRunAnalysis={handleRunAnalysis}
              canRunAction={canRunAction}
            />
          )}
        </div>

        {/* File Analysis Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {uiState.analysisLoading ? (
            renderLoadingState()
          ) : analysisState.fileAnalysis ? (
            <FileAnalysisPanel
              analysis={analysisState.fileAnalysis}
              loading={uiState.analysisLoading}
              onTargetColumnChange={handleTargetColumnChange}
              expandedSections={uiState.expandedSections}
              onToggleSection={handleToggleSection}
            />
          ) : (
            renderEmptyState()
          )}
        </div>
      </div>
    </div>
  );
};

export default CloudStorageEDAInterface;