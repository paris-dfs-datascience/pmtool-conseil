import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Brain, AlertTriangle, CheckCircle, Info, 
  TrendingUp, Zap, Database, Activity, Target, 
  FileText, Download, RefreshCw, Loader2 
} from 'lucide-react';

interface File {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size: number;
  modified: string;
  contentType: string;
}

interface EDAProps {
  selectedFile: File | null;
  bucketName: string;
}

interface Insight {
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
}

interface CorrelationMatrix {
  matrix?: Record<string, Record<string, number>>;
  high_correlations: Array<{
    var1: string;
    var2: string;
    correlation: number;
  }>;
  numeric_columns: string[];
  message?: string;
}

interface EDAResults {
  dataset_info: {
    shape: [number, number];
    columns: string[];
    dtypes: Record<string, string>;
    memory_usage: number;
  };
  data_quality: {
    missing_values: Record<string, { count: number; percentage: number }>;
    completeness: number;
  };
  statistical_summary: Record<string, {
    count: number;
    mean: number;
    std: number;
    min: number;
    max: number;
    median: number;
    q25: number;
    q75: number;
    skewness: number;
    kurtosis: number;
  }>;
  correlation: CorrelationMatrix;
  outliers: Record<string, {
    count: number;
    percentage: number;
    lower_bound: number;
    upper_bound: number;
    outlier_values: number[];
  }>;
  distributions: Record<string, {
    is_normal: boolean;
    shapiro_p_value: number;
    unique_values: number;
    unique_ratio: number;
  }>;
  clustering: {
    optimal_clusters?: number;
    cluster_counts?: Record<string, number>;
    inertias?: number[];
    k_range?: number[];
    message?: string;
  };
  insights: Insight[];
}

const EDAComponent: React.FC<EDAProps> = ({ selectedFile, bucketName }) => {
  const [results, setResults] = useState<EDAResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const analyzeFile = async () => {
    if (!selectedFile || selectedFile.type === 'folder') return;
    
    setLoading(true);
    setError(null);
    
    try {
      const filePath = selectedFile.path || selectedFile.name;
      const response = await fetch(
        `https://automl-443545551926.us-central1.run.app/api/eda/analyze-file/?bucket_name=${encodeURIComponent(bucketName)}&file_path=${encodeURIComponent(filePath)}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('EDA Error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFile && selectedFile.type === 'file' && bucketName) {
      analyzeFile();
    }
  }, [selectedFile, bucketName]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return AlertTriangle;
      case 'medium': return Info;
      case 'low': return CheckCircle;
      default: return Info;
    }
  };

  const renderOverview = () => {
    if (!results) return null;
    
    const { dataset_info, data_quality } = results;
    
    return (
      <div className="space-y-6">
        {/* Dataset Overview */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Database className="mr-2 text-blue-500" size={20} />
            Dataset Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{dataset_info.shape[0].toLocaleString()}</div>
              <div className="text-sm text-gray-600">Rows</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{dataset_info.shape[1]}</div>
              <div className="text-sm text-gray-600">Columns</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{data_quality.completeness.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{dataset_info.memory_usage.toFixed(1)} MB</div>
              <div className="text-sm text-gray-600">Memory</div>
            </div>
          </div>
        </div>

        {/* Smart Insights */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Brain className="mr-2 text-purple-500" size={20} />
            Smart Insights
          </h3>
          <div className="space-y-3">
            {results.insights && results.insights.length > 0 ? (
              results.insights.map((insight, index) => {
                const Icon = getPriorityIcon(insight.priority);
                return (
                  <div key={index} className={`p-4 rounded-lg border ${getPriorityColor(insight.priority)}`}>
                    <div className="flex items-start space-x-3">
                      <Icon size={20} className="mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <p className="text-sm mt-1">{insight.description}</p>
                        <p className="text-sm mt-2 font-medium">Recommendation: {insight.recommendation}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-600">No specific insights generated for this dataset.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDataQuality = () => {
    if (!results) return null;
    
    return (
      <div className="space-y-6">
        {/* Missing Values */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="mr-2 text-red-500" size={20} />
            Missing Values Analysis
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3">Column</th>
                  <th className="text-left p-3">Data Type</th>
                  <th className="text-right p-3">Missing Count</th>
                  <th className="text-right p-3">Missing %</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(results.data_quality.missing_values).map(([col, info]) => (
                  <tr key={col} className="border-b border-gray-100">
                    <td className="p-3 font-medium">{col}</td>
                    <td className="p-3 text-gray-600">{results.dataset_info.dtypes[col] || 'unknown'}</td>
                    <td className="p-3 text-right">{info.count.toLocaleString()}</td>
                    <td className="p-3 text-right">{info.percentage.toFixed(1)}%</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        info.percentage === 0 ? 'bg-green-100 text-green-700' :
                        info.percentage < 5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {info.percentage === 0 ? 'Complete' :
                         info.percentage < 5 ? 'Good' : 'Needs Attention'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderStatistics = () => {
    if (!results || !results.statistical_summary) return null;
    
    const hasStats = Object.keys(results.statistical_summary).length > 0;
    
    return (
      <div className="space-y-6">
        {/* Statistical Summary */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="mr-2 text-green-500" size={20} />
            Statistical Summary
          </h3>
          {!hasStats ? (
            <p className="text-gray-600">No numeric columns found for statistical analysis.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3">Column</th>
                    <th className="text-right p-3">Count</th>
                    <th className="text-right p-3">Mean</th>
                    <th className="text-right p-3">Std Dev</th>
                    <th className="text-right p-3">Min</th>
                    <th className="text-right p-3">Median</th>
                    <th className="text-right p-3">Max</th>
                    <th className="text-right p-3">Skewness</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(results.statistical_summary).map(([col, stats]) => (
                    <tr key={col} className="border-b border-gray-100">
                      <td className="p-3 font-medium">{col}</td>
                      <td className="p-3 text-right">{stats.count.toLocaleString()}</td>
                      <td className="p-3 text-right">{stats.mean.toFixed(2)}</td>
                      <td className="p-3 text-right">{stats.std.toFixed(2)}</td>
                      <td className="p-3 text-right">{stats.min.toFixed(2)}</td>
                      <td className="p-3 text-right">{stats.median.toFixed(2)}</td>
                      <td className="p-3 text-right">{stats.max.toFixed(2)}</td>
                      <td className="p-3 text-right">{stats.skewness.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCorrelations = () => {
    if (!results || !results.correlation) return null;
    
    return (
      <div className="space-y-6">
        {/* High Correlations */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="mr-2 text-blue-500" size={20} />
            High Correlations (|r| &gt; 0.8)
          </h3>
          {results.correlation.message ? (
            <p className="text-gray-600">{results.correlation.message}</p>
          ) : results.correlation.high_correlations.length === 0 ? (
            <p className="text-gray-600">No high correlations detected.</p>
          ) : (
            <div className="space-y-3">
              {results.correlation.high_correlations.map((corr, index) => (
                <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{corr.var1} ↔ {corr.var2}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      Math.abs(corr.correlation) > 0.9 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      r = {corr.correlation.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderOutliers = () => {
    if (!results || !results.outliers) return null;
    
    const hasOutliers = Object.keys(results.outliers).length > 0;
    
    return (
      <div className="space-y-6">
        {/* Outlier Analysis */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Target className="mr-2 text-orange-500" size={20} />
            Outlier Detection (IQR Method)
          </h3>
          {!hasOutliers ? (
            <p className="text-gray-600">No numeric columns available for outlier analysis.</p>
          ) : (
            <div className="grid gap-4">
              {Object.entries(results.outliers).map(([col, outlier_info]) => (
                <div key={col} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{col}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      outlier_info.percentage < 1 ? 'bg-green-100 text-green-700' :
                      outlier_info.percentage < 5 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {outlier_info.count} outliers ({outlier_info.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Range: [{outlier_info.lower_bound.toFixed(2)}, {outlier_info.upper_bound.toFixed(2)}]</p>
                    {outlier_info.outlier_values && outlier_info.outlier_values.length > 0 && (
                      <p>Sample values: {outlier_info.outlier_values.slice(0, 5).map(v => v.toFixed(2)).join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderClustering = () => {
    if (!results || !results.clustering) return null;
    
    return (
      <div className="space-y-6">
        {/* Clustering Analysis */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Zap className="mr-2 text-purple-500" size={20} />
            Automatic Clustering Analysis
          </h3>
          {results.clustering.message ? (
            <p className="text-gray-600">{results.clustering.message}</p>
          ) : results.clustering.optimal_clusters ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Optimal Clusters: {results.clustering.optimal_clusters}</h4>
                <div className="space-y-2">
                  {results.clustering.cluster_counts && Object.entries(results.clustering.cluster_counts).map(([cluster, count]) => (
                    <div key={cluster} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{cluster}</span>
                      <span className="font-medium">{count} points</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Elbow Method Results</h4>
                <div className="text-sm text-gray-600">
                  <p>Analyzed {results.clustering.k_range?.length || 0} different cluster configurations</p>
                  <p>Optimal k selected based on inertia reduction</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No clustering analysis available.</p>
          )}
        </div>
      </div>
    );
  };

  if (!selectedFile) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
        <FileText className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-lg font-medium text-gray-600 mb-2">No File Selected</h3>
        <p className="text-gray-500">Select a CSV or Excel file to start exploratory data analysis</p>
      </div>
    );
  }

  if (selectedFile.type === 'folder') {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
        <Database className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Folder Selected</h3>
        <p className="text-gray-500">Please select a data file (CSV or Excel) for analysis</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <Activity className="mr-2 text-blue-500" size={24} />
              Exploratory Data Analysis
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Analyzing: <span className="font-medium">{selectedFile.name}</span>
            </p>
          </div>
          <button
            onClick={analyzeFile}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" size={16} />
            ) : (
              <RefreshCw className="mr-2" size={16} />
            )}
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 bg-red-50 border-l-4 border-red-400">
          <div className="flex items-center">
            <AlertTriangle className="text-red-400 mr-3" size={20} />
            <div>
              <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center">
          <Loader2 className="mx-auto mb-4 animate-spin text-blue-500" size={32} />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Analyzing Data...</h3>
          <p className="text-gray-500">This may take a few moments for large datasets</p>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'quality', label: 'Data Quality', icon: CheckCircle },
                { id: 'statistics', label: 'Statistics', icon: BarChart3 },
                { id: 'correlations', label: 'Correlations', icon: TrendingUp },
                { id: 'outliers', label: 'Outliers', icon: Target },
                { id: 'clustering', label: 'Clustering', icon: Zap }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={16} className="mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'quality' && renderDataQuality()}
            {activeTab === 'statistics' && renderStatistics()}
            {activeTab === 'correlations' && renderCorrelations()}
            {activeTab === 'outliers' && renderOutliers()}
            {activeTab === 'clustering' && renderClustering()}
          </div>

          {/* Download Report Button */}
          <div className="px-6 pb-6">
            <button
              onClick={() => {
                const dataStr = JSON.stringify(results, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `eda_report_${selectedFile.name}_${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <Download className="mr-2" size={16} />
              Download Full Report (JSON)
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EDAComponent;