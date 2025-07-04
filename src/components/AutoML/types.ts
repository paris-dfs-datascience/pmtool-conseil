// types.ts - Centralized TypeScript interface definitions

// ==============================
// CLOUD STORAGE TYPES
// ==============================

export interface CloudFile {
    name: string;
    path: string;
    type: 'file' | 'folder';
    size: number;
    modified: string;
    contentType: string;
    metadata?: FileMetadata;
  }
  
  export interface FileMetadata {
    rows?: number;
    columns?: number;
    records?: number;
    sheets?: number;
    headers?: string[];
    sampleData?: string[][];
  }
  
  export interface CloudBucket {
    name: string;
    region: string;
    storageClass: string;
    created: string;
    size: number;
  }
  
  // ==============================
  // ANALYSIS TYPES
  // ==============================
  
  export interface AnalysisAction {
    id: string;
    label: string;
    icon: any;
    description: string;
    requiresTarget: boolean;
    fileTypes: string[];
    category: 'eda' | 'ml' | 'advanced';
    estimatedTime?: string;
    computeIntensity: 'low' | 'medium' | 'high';
    outputs: string[];
    prerequisites?: string[];
  }
  
  export interface FileAnalysisInfo {
    file: CloudFile;
    targetColumn?: string;
    suggestedTargets: string[];
    dataQuality: DataQuality;
    columnTypes: Record<string, ColumnType>;
    insights: string[];
  }
  
  export interface DataQuality {
    completeness: number;
    nullPercentage: number;
    duplicates: number;
  }
  
  export type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'text';
  
  export type AnalysisCategory = 'eda' | 'ml' | 'advanced';
  
  export type ComputeIntensity = 'low' | 'medium' | 'high';
  
  // ==============================
  // ANALYSIS RESULTS TYPES
  // ==============================
  
  export interface AnalysisResult {
    id: string;
    analysisId: string;
    fileName: string;
    targetColumn?: string;
    status: 'running' | 'completed' | 'failed' | 'queued';
    startTime: string;
    endTime?: string;
    duration?: number;
    results?: AnalysisOutput;
    error?: string;
    progress?: number;
  }
  
  export interface AnalysisOutput {
    type: 'eda' | 'ml' | 'advanced';
    visualizations?: Visualization[];
    metrics?: Record<string, any>;
    insights?: string[];
    recommendations?: string[];
    downloadUrls?: Record<string, string>;
    modelInfo?: ModelInfo;
  }
  
  export interface Visualization {
    id: string;
    type: 'chart' | 'table' | 'heatmap' | 'scatter' | 'histogram' | 'boxplot';
    title: string;
    description?: string;
    data: any;
    config?: Record<string, any>;
  }
  
  export interface ModelInfo {
    algorithm: string;
    accuracy?: number;
    metrics: Record<string, number>;
    featureImportance?: FeatureImportance[];
    hyperparameters?: Record<string, any>;
    trainingTime?: number;
    deploymentUrl?: string;
  }
  
  export interface FeatureImportance {
    feature: string;
    importance: number;
    rank: number;
  }
  
  // ==============================
  // UI STATE TYPES
  // ==============================
  
  export interface UIState {
    showFilePanel: boolean;
    selectedFile: CloudFile | null;
    currentBucket: CloudBucket | null;
    currentPath: string;
    searchTerm: string;
    loading: boolean;
    analysisLoading: boolean;
    expandedSections: Record<string, boolean>;
  }
  
  export interface AnalysisState {
    fileAnalysis: FileAnalysisInfo | null;
    runningAnalyses: AnalysisResult[];
    completedAnalyses: AnalysisResult[];
    selectedTargetColumn?: string;
  }
  
  // ==============================
  // API TYPES
  // ==============================
  
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }
  
  export interface BucketsResponse {
    buckets: CloudBucket[];
  }
  
  export interface FilesResponse {
    files: CloudFile[];
    path: string;
    bucket: string;
  }
  
  export interface AnalysisRequest {
    bucketName: string;
    filePath: string;
    analysisId: string;
    targetColumn?: string;
    parameters?: Record<string, any>;
  }
  
  export interface AnalysisResponse {
    analysisId: string;
    jobId: string;
    estimatedTime: string;
    status: 'queued' | 'running';
  }
  
  // ==============================
  // CONFIGURATION TYPES
  // ==============================
  
  export interface AnalysisConfig {
    maxFileSize: number;
    supportedFormats: string[];
    maxAnalysisTime: number;
    autoRefreshInterval: number;
    defaultBudget: number;
  }
  
  export interface CloudConfig {
    projectId: string;
    region: string;
    authRequired: boolean;
    maxBuckets: number;
    maxFilesPerBucket: number;
  }
  
  // ==============================
  // ERROR TYPES
  // ==============================
  
  export interface AnalysisError {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  }
  
  export interface ValidationError {
    field: string;
    message: string;
    value?: any;
  }
  
  // ==============================
  // HOOK TYPES
  // ==============================
  
  export interface UseCloudStorageReturn {
    buckets: CloudBucket[];
    files: CloudFile[];
    currentBucket: CloudBucket | null;
    currentPath: string;
    loading: boolean;
    error: string | null;
    setBucket: (bucket: CloudBucket) => void;
    setPath: (path: string) => void;
    refreshFiles: () => Promise<void>;
    refreshBuckets: () => Promise<void>;
  }
  
  export interface UseFileAnalysisReturn {
    analysis: FileAnalysisInfo | null;
    loading: boolean;
    error: string | null;
    analyzeFile: (file: CloudFile) => Promise<void>;
    setTargetColumn: (column: string) => void;
    clearAnalysis: () => void;
  }
  
  export interface UseAnalysisJobsReturn {
    jobs: AnalysisResult[];
    runningJobs: AnalysisResult[];
    completedJobs: AnalysisResult[];
    loading: boolean;
    error: string | null;
    startAnalysis: (request: AnalysisRequest) => Promise<string>;
    getJobStatus: (jobId: string) => Promise<AnalysisResult>;
    cancelJob: (jobId: string) => Promise<void>;
    clearJobs: () => void;
  }
  
  // ==============================
  // COMPONENT PROPS TYPES
  // ==============================
  
  export interface FileAnalysisPanelProps {
    analysis: FileAnalysisInfo | null;
    loading: boolean;
    onTargetColumnChange: (column: string) => void;
    expandedSections: Record<string, boolean>;
    onToggleSection: (section: string) => void;
  }
  
  export interface AnalysisActionsProps {
    selectedFile: CloudFile | null;
    fileAnalysis: FileAnalysisInfo | null;
    onRunAnalysis: (actionId: string) => void;
  }
  
  export interface FileBrowserProps {
    buckets: CloudBucket[];
    files: CloudFile[];
    currentBucket: CloudBucket | null;
    selectedFile: CloudFile | null;
    searchTerm: string;
    loading: boolean;
    onBucketChange: (bucket: CloudBucket) => void;
    onFileSelect: (file: CloudFile) => void;
    onSearchChange: (term: string) => void;
    onRefresh: () => void;
  }
  
  // ==============================
  // UTILITY TYPES
  // ==============================
  
  export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
  };
  
  export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
  
  export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
  
  // ==============================
  // CONSTANTS TYPES
  // ==============================
  
  export interface ColorTheme {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  }
  
  export interface AnalysisConstants {
    MAX_FILE_SIZE: number;
    MAX_ANALYSIS_TIME: number;
    SUPPORTED_FORMATS: readonly string[];
    DEFAULT_SAMPLE_SIZE: number;
  }
  
  // ==============================
  // EVENT TYPES
  // ==============================
  
  export interface AnalysisEvent {
    type: 'analysis_started' | 'analysis_completed' | 'analysis_failed' | 'analysis_progress';
    payload: {
      jobId: string;
      analysisId: string;
      fileName: string;
      progress?: number;
      result?: AnalysisOutput;
      error?: string;
    };
    timestamp: string;
  }
  
  export interface FileEvent {
    type: 'file_selected' | 'file_analyzed' | 'target_changed';
    payload: {
      file?: CloudFile;
      analysis?: FileAnalysisInfo;
      targetColumn?: string;
    };
    timestamp: string;
  }