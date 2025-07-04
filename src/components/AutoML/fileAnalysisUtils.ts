// fileAnalysisUtils.ts - Utilities for file analysis and processing

import { CloudFile } from './mockData';
import { mockAnalysisResults } from './mockData';

export interface FileAnalysisInfo {
  file: CloudFile;
  targetColumn?: string;
  suggestedTargets: string[];
  dataQuality: {
    completeness: number;
    nullPercentage: number;
    duplicates: number;
  };
  columnTypes: Record<string, 'numeric' | 'categorical' | 'datetime' | 'text'>;
  insights: string[];
}

export type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'text';

// ==============================
// FILE TYPE DETECTION
// ==============================

export const getFileIcon = (file: CloudFile) => {
  if (file.type === 'folder') return 'Folder';
  if (file.contentType?.includes('csv') || file.name.endsWith('.csv')) return 'Database';
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) return 'FileText';
  if (file.contentType?.includes('json') || file.name.endsWith('.json')) return 'Code';
  if (file.contentType?.includes('parquet') || file.name.endsWith('.parquet')) return 'Database';
  return 'FileText';
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const isAnalyzableFile = (file: CloudFile): boolean => {
  if (file.type === 'folder') return false;
  
  const analyzableExtensions = ['csv', 'xlsx', 'xls', 'json', 'parquet'];
  const extension = getFileExtension(file.name);
  
  return analyzableExtensions.includes(extension);
};

// ==============================
// DATA TYPE INFERENCE
// ==============================

export const inferColumnType = (
  columnName: string, 
  sampleValues: string[] = []
): ColumnType => {
  const name = columnName.toLowerCase();
  
  // Date/time patterns
  if (name.includes('date') || name.includes('time') || name.includes('timestamp') || 
      name.includes('created') || name.includes('updated') || name.includes('modified')) {
    return 'datetime';
  }
  
  // Numeric patterns
  const numericPatterns = [
    'age', 'income', 'amount', 'price', 'cost', 'revenue', 'margin', 'score', 
    'rate', 'ratio', 'percentage', 'count', 'quantity', 'number', 'value',
    'balance', 'limit', 'duration', 'weight', 'height', 'size', 'length'
  ];
  
  if (numericPatterns.some(pattern => name.includes(pattern))) {
    return 'numeric';
  }
  
  // Categorical patterns
  const categoricalPatterns = [
    'category', 'type', 'status', 'region', 'segment', 'class', 'group',
    'department', 'division', 'team', 'role', 'level', 'grade', 'tier'
  ];
  
  if (categoricalPatterns.some(pattern => name.includes(pattern))) {
    return 'categorical';
  }
  
  // ID patterns (usually text)
  if (name.includes('id') || name.includes('key') || name.includes('code')) {
    return 'text';
  }
  
  // Analyze sample values if available
  if (sampleValues.length > 0) {
    const nonEmptyValues = sampleValues.filter(val => val && val.trim() !== '');
    
    if (nonEmptyValues.length === 0) return 'text';
    
    // Check if all values are numeric
    const numericValues = nonEmptyValues.filter(val => !isNaN(Number(val)));
    if (numericValues.length / nonEmptyValues.length > 0.8) {
      return 'numeric';
    }
    
    // Check for date patterns
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ // ISO datetime
    ];
    
    const dateValues = nonEmptyValues.filter(val => 
      datePatterns.some(pattern => pattern.test(val))
    );
    
    if (dateValues.length / nonEmptyValues.length > 0.7) {
      return 'datetime';
    }
    
    // Check for categorical (limited unique values)
    const uniqueValues = new Set(nonEmptyValues);
    if (uniqueValues.size <= Math.min(10, nonEmptyValues.length / 2)) {
      return 'categorical';
    }
  }
  
  return 'text';
};

// ==============================
// TARGET COLUMN SUGGESTIONS
// ==============================

export const suggestTargetColumns = (headers: string[]): string[] => {
  const targetPatterns = [
    // Classification targets
    'churn', 'fraud', 'default', 'conversion', 'click', 'purchase', 'signup',
    'approved', 'rejected', 'success', 'failure', 'win', 'loss', 'status',
    'class', 'category', 'type', 'segment', 'label', 'outcome', 'result',
    
    // Regression targets
    'price', 'amount', 'revenue', 'sales', 'profit', 'margin', 'value',
    'score', 'rating', 'satisfaction', 'performance', 'efficiency',
    'duration', 'time', 'count', 'quantity', 'rate', 'percentage'
  ];
  
  return headers.filter(header => {
    const lowerHeader = header.toLowerCase();
    return targetPatterns.some(pattern => lowerHeader.includes(pattern));
  }).slice(0, 5); // Return top 5 suggestions
};

// ==============================
// DATA QUALITY ASSESSMENT
// ==============================

export const assessDataQuality = (file: CloudFile): {
  completeness: number;
  nullPercentage: number;
  duplicates: number;
} => {
  // For mock data, return predefined quality metrics
  const fileName = file.name;
  
  if (mockAnalysisResults[fileName as keyof typeof mockAnalysisResults]) {
    return mockAnalysisResults[fileName as keyof typeof mockAnalysisResults].dataQuality;
  }
  
  // Default quality metrics for unknown files
  const baseQuality = 85 + Math.random() * 15; // 85-100%
  return {
    completeness: Math.round(baseQuality * 100) / 100,
    nullPercentage: Math.round((100 - baseQuality) * 100) / 100,
    duplicates: Math.floor(Math.random() * 20)
  };
};

// ==============================
// INSIGHTS GENERATION
// ==============================

export const generateFileInsights = (file: CloudFile): string[] => {
  const insights: string[] = [];
  
  if (file.metadata) {
    // Row and column insights
    if (file.metadata.rows) {
      insights.push(`Dataset contains ${file.metadata.rows.toLocaleString()} rows and ${file.metadata.columns || 'unknown'} columns`);
      
      if (file.metadata.rows > 100000) {
        insights.push('Large dataset - suitable for deep learning approaches');
      } else if (file.metadata.rows > 10000) {
        insights.push('Medium-sized dataset - good for most ML algorithms');
      } else if (file.metadata.rows > 1000) {
        insights.push('Small dataset - consider simple models and cross-validation');
      } else {
        insights.push('Very small dataset - statistical analysis recommended');
      }
    }
    
    // File type specific insights
    if (file.contentType?.includes('csv')) {
      insights.push('CSV format enables fast processing and analysis');
    } else if (file.name.endsWith('.xlsx')) {
      insights.push(`Excel file with ${file.metadata.sheets || 1} sheet(s) - structured business data`);
    } else if (file.contentType?.includes('json')) {
      insights.push('JSON format - suitable for semi-structured data analysis');
    }
    
    // Target suggestions insight
    if (file.metadata.headers) {
      const targets = suggestTargetColumns(file.metadata.headers);
      if (targets.length > 0) {
        insights.push(`${targets.length} potential target variable(s) identified`);
      }
      
      // Column type distribution
      const columnTypes = file.metadata.headers.map(header => 
        inferColumnType(header, file.metadata?.sampleData?.[0] || [])
      );
      
      const numericCount = columnTypes.filter(type => type === 'numeric').length;
      const categoricalCount = columnTypes.filter(type => type === 'categorical').length;
      const datetimeCount = columnTypes.filter(type => type === 'datetime').length;
      
      if (numericCount > 0) {
        insights.push(`${numericCount} numeric column(s) available for ML analysis`);
      }
      
      if (categoricalCount > 0) {
        insights.push(`${categoricalCount} categorical feature(s) for segmentation analysis`);
      }
      
      if (datetimeCount > 0) {
        insights.push(`${datetimeCount} datetime column(s) - time series analysis possible`);
      }
    }
  }
  
  // Data quality insight
  const quality = assessDataQuality(file);
  if (quality.completeness > 95) {
    insights.push('Excellent data quality - ready for immediate analysis');
  } else if (quality.completeness > 85) {
    insights.push('Good data quality - minimal preprocessing required');
  } else {
    insights.push('Data quality issues detected - preprocessing recommended');
  }
  
  return insights;
};

// ==============================
// FILE ANALYSIS ORCHESTRATION
// ==============================

export const analyzeFile = async (file: CloudFile): Promise<FileAnalysisInfo | null> => {
  if (!isAnalyzableFile(file)) {
    return null;
  }
  
  // Check if we have mock analysis results
  const fileName = file.name;
  const mockResult = mockAnalysisResults[fileName as keyof typeof mockAnalysisResults];
  
  if (mockResult) {
    return {
      file,
      suggestedTargets: mockResult.suggestedTargets,
      dataQuality: mockResult.dataQuality,
      columnTypes: mockResult.columnTypes,
      insights: mockResult.insights
    };
  }
  
  // Generate analysis for unknown files
  const headers = file.metadata?.headers || [];
  const suggestedTargets = suggestTargetColumns(headers);
  const dataQuality = assessDataQuality(file);
  
  // Infer column types
  const columnTypes: Record<string, ColumnType> = {};
  headers.forEach((header, index) => {
    const sampleColumn = file.metadata?.sampleData?.map(row => row[index]) || [];
    columnTypes[header] = inferColumnType(header, sampleColumn);
  });
  
  const insights = generateFileInsights(file);
  
  return {
    file,
    suggestedTargets,
    dataQuality,
    columnTypes,
    insights
  };
};

// ==============================
// UTILITY FUNCTIONS
// ==============================

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getColumnTypeColor = (type: ColumnType): string => {
  switch (type) {
    case 'numeric': return 'green';
    case 'categorical': return 'blue';
    case 'datetime': return 'purple';
    case 'text': return 'gray';
    default: return 'gray';
  }
};

export const getColumnTypeIcon = (type: ColumnType): string => {
  switch (type) {
    case 'numeric': return 'Calculator';
    case 'categorical': return 'Tag';
    case 'datetime': return 'Clock';
    case 'text': return 'Type';
    default: return 'HelpCircle';
  }
};

export const getMlSuitabilityMessage = (type: ColumnType): string => {
  switch (type) {
    case 'numeric': return '✓ Excellent for ML';
    case 'categorical': return '✓ Good for features';
    case 'datetime': return '✓ Time series ready';
    case 'text': return '⚠ Needs processing';
    default: return '? Unknown type';
  }
};

// ==============================
// VALIDATION FUNCTIONS
// ==============================

export const validateFileForAnalysis = (
  file: CloudFile, 
  analysisId: string
): { isValid: boolean; message?: string } => {
  if (!isAnalyzableFile(file)) {
    return { 
      isValid: false, 
      message: 'File type not supported for analysis' 
    };
  }
  
  if (!file.metadata?.headers || file.metadata.headers.length === 0) {
    return { 
      isValid: false, 
      message: 'No column headers detected in file' 
    };
  }
  
  if (file.metadata.rows && file.metadata.rows < 10) {
    return { 
      isValid: false, 
      message: 'Insufficient data rows for reliable analysis' 
    };
  }
  
  // Analysis-specific validations could be added here
  
  return { isValid: true };
};

export const canRunAnalysis = (
  file: CloudFile | null, 
  analysisAction: { requiresTarget: boolean; fileTypes: string[] },
  targetColumn?: string
): boolean => {
  if (!file) return false;
  if (file.type === 'folder') return false;
  
  const fileExtension = getFileExtension(file.name);
  if (!analysisAction.fileTypes.includes(fileExtension)) return false;
  
  if (analysisAction.requiresTarget && !targetColumn) return false;
  
  const validation = validateFileForAnalysis(file, 'generic');
  return validation.isValid;
};