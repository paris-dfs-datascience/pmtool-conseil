// components/FileAnalysisPanel.tsx
import React from 'react';
import { ChevronDown, ChevronRight, Info, CheckCircle, AlertCircle, Play, Target, TrendingUp } from 'lucide-react';
import type { FileAnalysisPanelProps } from '../types';

const FileAnalysisPanel: React.FC<FileAnalysisPanelProps> = ({
  analysis,
  loading,
  onTargetColumnChange,
  expandedSections,
  onToggleSection
}) => {
  if (!analysis) return null;

  const getColumnTypeColor = (type: string) => {
    switch (type) {
      case 'numeric': return 'bg-green-100 text-green-700';
      case 'categorical': return 'bg-blue-100 text-blue-700';
      case 'datetime': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMlSuitabilityMessage = (type: string) => {
    switch (type) {
      case 'numeric': return '✓ Excellent for ML';
      case 'categorical': return '✓ Good for features';
      case 'datetime': return '✓ Time series ready';
      case 'text': return '⚠ Needs processing';
      default: return '? Unknown type';
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* File Overview */}
      <div className="bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => onToggleSection('overview')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <h3 className="text-lg font-semibold text-gray-800">File Overview</h3>
          {expandedSections.overview ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
        
        {expandedSections.overview && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {analysis.file.metadata?.rows?.toLocaleString() || 'N/A'}
                </div>
                <div className="text-sm text-blue-700">Rows</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {analysis.file.metadata?.columns || 'N/A'}
                </div>
                <div className="text-sm text-green-700">Columns</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {(analysis.file.size / (1024 * 1024)).toFixed(1)} MB
                </div>
                <div className="text-sm text-purple-700">File Size</div>
              </div>
            </div>
            
            <div className="space-y-2">
              {analysis.insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <Info className="text-blue-500 mt-0.5" size={16} />
                  <span className="text-sm text-gray-700">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Target Column Selection */}
      {analysis.suggestedTargets.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Target Column Selection</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select target column for ML analysis:
              </label>
              <select
                value={analysis.targetColumn || ''}
                onChange={(e) => onTargetColumnChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose target column...</option>
                {analysis.file.metadata?.headers?.map(header => (
                  <option key={header} value={header}>
                    {header} ({analysis.columnTypes[header] || 'unknown'})
                  </option>
                ))}
              </select>
            </div>
            
            {analysis.suggestedTargets.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Suggested targets:</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.suggestedTargets.map(target => (
                    <button
                      key={target}
                      onClick={() => onTargetColumnChange(target)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        analysis.targetColumn === target
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {target}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Column Information */}
      <div className="bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => onToggleSection('columns')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <h3 className="text-lg font-semibold text-gray-800">Column Information</h3>
          {expandedSections.columns ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
        
        {expandedSections.columns && analysis.file.metadata?.headers && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-2 font-medium text-gray-700">Column Name</th>
                    <th className="text-left p-2 font-medium text-gray-700">Data Type</th>
                    <th className="text-left p-2 font-medium text-gray-700">ML Suitability</th>
                    <th className="text-left p-2 font-medium text-gray-700">Sample Values</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.file.metadata.headers.map((header, index) => {
                    const dataType = analysis.columnTypes[header] || 'unknown';
                    const isTarget = analysis.targetColumn === header;
                    const sampleValues = analysis.file.metadata?.sampleData?.[0]?.[index] || 'N/A';
                    
                    return (
                      <tr key={header} className={`border-b border-gray-100 ${isTarget ? 'bg-blue-50' : ''}`}>
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{header}</span>
                            {isTarget && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                Target
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getColumnTypeColor(dataType)}`}>
                            {dataType}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">
                            {getMlSuitabilityMessage(dataType)}
                          </span>
                        </td>
                        <td className="p-2 text-gray-600 text-xs font-mono">
                          {sampleValues}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Data Quality */}
      <div className="bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => onToggleSection('quality')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <h3 className="text-lg font-semibold text-gray-800">Data Quality Assessment</h3>
          {expandedSections.quality ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
        
        {expandedSections.quality && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {analysis.dataQuality.completeness}%
                </div>
                <div className="text-sm text-gray-700">Data Completeness</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${analysis.dataQuality.completeness}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {analysis.dataQuality.nullPercentage}%
                </div>
                <div className="text-sm text-gray-700">Missing Values</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ width: `${analysis.dataQuality.nullPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {analysis.dataQuality.duplicates}
                </div>
                <div className="text-sm text-gray-700">Duplicate Rows</div>
                <div className="text-xs text-gray-500 mt-1">
                  {((analysis.dataQuality.duplicates / (analysis.file.metadata?.rows || 1)) * 100).toFixed(2)}% of total
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                {analysis.dataQuality.completeness > 90 ? (
                  <CheckCircle className="text-green-500" size={16} />
                ) : (
                  <AlertCircle className="text-orange-500" size={16} />
                )}
                <span className="text-sm text-gray-700">
                  Data quality is {analysis.dataQuality.completeness > 90 ? 'excellent' : 'moderate'} for ML training
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {analysis.dataQuality.duplicates < 50 ? (
                  <CheckCircle className="text-green-500" size={16} />
                ) : (
                  <AlertCircle className="text-orange-500" size={16} />
                )}
                <span className="text-sm text-gray-700">
                  Duplicate level is {analysis.dataQuality.duplicates < 50 ? 'acceptable' : 'concerning'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <CheckCircle className="text-green-500" size={16} />
                <span className="text-sm text-gray-700">
                  File format is compatible with all analysis tools
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sample Data Preview */}
      {analysis.file.metadata?.sampleData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Preview</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  {analysis.file.metadata.headers?.map(header => (
                    <th key={header} className="border-b border-gray-200 p-2 text-left font-medium text-gray-700">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.file.metadata.sampleData.slice(0, 5).map((row, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="p-2 text-gray-700 font-mono text-xs">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Showing first 5 rows of {analysis.file.metadata?.rows?.toLocaleString()} total rows
          </p>
        </div>
      )}

      {/* Quick Start Recommendations */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Start Recommendations</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Play className="text-blue-500" size={16} />
            <span className="text-sm text-gray-700">
              Start with <strong>Data Profiling</strong> to get comprehensive insights
            </span>
          </div>
          
          {analysis.suggestedTargets.length > 0 && (
            <div className="flex items-center space-x-2">
              <Target className="text-green-500" size={16} />
              <span className="text-sm text-gray-700">
                Try <strong>AutoML Classification</strong> with target: {analysis.suggestedTargets[0]}
              </span>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <TrendingUp className="text-purple-500" size={16} />
            <span className="text-sm text-gray-700">
              Run <strong>Correlation Analysis</strong> to find feature relationships
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileAnalysisPanel;