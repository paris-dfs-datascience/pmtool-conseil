import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle, TrendingUp, Database, Brain, 
  Target, Clock, Users, Shield, Lightbulb, FileText, Download,
  RefreshCw, Play, Settings, Info, Loader2, Activity
} from 'lucide-react';

interface File {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size: number;
  modified: string;
  contentType: string;
}

interface AdvancedEDAProps {
  selectedFile: File | null;
  bucketName: string;
}

interface AnalysisResult {
  dataset_profile?: any;
  data_quality?: any;
  statistical_tests?: any;
  advanced_clustering?: any;
  dimensionality_analysis?: any;
  advanced_analytics?: any;
  anomalies?: any;
  time_series?: any;
  business_insights?: any[];
  model_readiness?: any;
  executive_summary?: any;
}

interface ModelReadinessResult {
  overall_score?: number;
  max_score?: number;
  readiness_percentage?: number;
  status?: string;
  assessment_details?: any;
  recommendations?: string[];
  suggested_next_steps?: string[];
  feature_analysis?: any;
}

interface BusinessSummary {
  key_statistics?: any;
  critical_findings?: any[];
  opportunities?: any[];
  strategic_recommendations?: any[];
  business_context?: string;
  overall_assessment?: any;
  dataset_overview?: any;
}

const API_BASE_URL = 'https://automl-443545551926.us-central1.run.app';

const AdvancedEDAComponent: React.FC<AdvancedEDAProps> = ({ selectedFile, bucketName }) => {
  const [targetColumn, setTargetColumn] = useState('');
  const [dateColumn, setDateColumn] = useState('');
  const [businessContext, setBusinessContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [modelReadiness, setModelReadiness] = useState<ModelReadinessResult | null>(null);
  const [businessSummary, setBusinessSummary] = useState<BusinessSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  const runFullAnalysis = async () => {
    if (!selectedFile || selectedFile.type === 'folder') return;

    setLoading(true);
    setError(null);
    
    try {
      const filePath = selectedFile.path || selectedFile.name;
      const params = new URLSearchParams({
        bucket_name: bucketName,
        file_path: filePath,
        ...(targetColumn && { target_column: targetColumn }),
        ...(dateColumn && { date_column: dateColumn }),
        ...(businessContext && { business_context: businessContext })
      });

      const response = await fetch(`${API_BASE_URL}/api/advanced-analyze/?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      setAnalysisResult(data);
      
      // Extract available columns for dropdowns
      if (data.dataset_profile?.columns) {
        setAvailableColumns(data.dataset_profile.columns);
      }
    } catch (err) {
      console.error('Advanced Analysis Error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const runModelReadiness = async () => {
    if (!selectedFile || selectedFile.type === 'folder' || !targetColumn) return;

    setLoading(true);
    setError(null);
    
    try {
      const filePath = selectedFile.path || selectedFile.name;
      const params = new URLSearchParams({
        bucket_name: bucketName,
        file_path: filePath,
        target_column: targetColumn
      });

      const response = await fetch(`${API_BASE_URL}/api/model-readiness/?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Model readiness assessment failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      setModelReadiness(data);
    } catch (err) {
      console.error('Model Readiness Error:', err);
      setError(err instanceof Error ? err.message : 'Model readiness assessment failed');
    } finally {
      setLoading(false);
    }
  };

  const runBusinessSummary = async () => {
    if (!selectedFile || selectedFile.type === 'folder') return;

    setLoading(true);
    setError(null);
    
    try {
      const filePath = selectedFile.path || selectedFile.name;
      const params = new URLSearchParams({
        bucket_name: bucketName,
        file_path: filePath,
        ...(businessContext && { business_context: businessContext })
      });

      const response = await fetch(`${API_BASE_URL}/api/business-summary/?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Business summary generation failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      setBusinessSummary(data);
    } catch (err) {
      console.error('Business Summary Error:', err);
      setError(err instanceof Error ? err.message : 'Business summary generation failed');
    } finally {
      setLoading(false);
    }
  };

  // Auto-run full analysis when file is selected
  useEffect(() => {
    if (selectedFile && selectedFile.type === 'file' && bucketName) {
      runFullAnalysis();
    }
  }, [selectedFile, bucketName]);

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'strategic': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'opportunity': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'excellent': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'good': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderExecutiveSummary = () => {
    if (!businessSummary) return null;

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Executive Summary</h2>
          {businessSummary.key_statistics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{businessSummary.key_statistics.total_records?.toLocaleString()}</div>
                <div className="text-sm opacity-90">Total Records</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{businessSummary.key_statistics.total_features}</div>
                <div className="text-sm opacity-90">Features</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{businessSummary.key_statistics.data_completeness?.toFixed(1)}%</div>
                <div className="text-sm opacity-90">Data Completeness</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{businessSummary.overall_assessment?.data_maturity || 'N/A'}</div>
                <div className="text-sm opacity-90">Data Maturity</div>
              </div>
            </div>
          )}
        </div>

        {businessSummary.critical_findings && businessSummary.critical_findings.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Critical Findings
            </h3>
            <div className="space-y-3">
              {businessSummary.critical_findings.map((finding, index) => (
                <div key={index} className={`p-3 rounded border ${getPriorityColor(finding.impact)}`}>
                  <div className="font-medium">{finding.area}</div>
                  <div className="text-sm mt-1">{finding.finding}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {businessSummary.opportunities && businessSummary.opportunities.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
              Strategic Opportunities
            </h3>
            <div className="space-y-3">
              {businessSummary.opportunities.map((opportunity, index) => (
                <div key={index} className="p-4 bg-green-50 border border-green-200 rounded">
                  <div className="font-medium text-green-800">{opportunity.area}</div>
                  <div className="text-sm text-green-700 mt-1">{opportunity.description}</div>
                  <div className="text-xs text-green-600 mt-2 font-medium">{opportunity.potential_value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {businessSummary.strategic_recommendations && businessSummary.strategic_recommendations.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-500" />
              Strategic Recommendations
            </h3>
            <div className="space-y-4">
              {businessSummary.strategic_recommendations.map((rec, index) => (
                <div key={index} className={`p-4 rounded border ${getPriorityColor(rec.priority)}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">{rec.recommendation}</div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100">{rec.timeline}</span>
                  </div>
                  <div className="text-sm opacity-90">{rec.rationale}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderModelReadiness = () => {
    if (!modelReadiness) return null;

    const readinessPercentage = modelReadiness.readiness_percentage || 0;
    const readinessColor = readinessPercentage >= 80 ? 'text-green-600' :
                          readinessPercentage >= 60 ? 'text-yellow-600' : 'text-red-600';

    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-500" />
            Model Readiness Assessment
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className={`text-4xl font-bold ${readinessColor}`}>
                {readinessPercentage.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Overall Readiness</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {modelReadiness.overall_score}/{modelReadiness.max_score}
              </div>
              <div className="text-sm text-gray-600">Readiness Score</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-semibold ${readinessColor}`}>
                {modelReadiness.status}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>

          {modelReadiness.assessment_details && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {Object.entries(modelReadiness.assessment_details).map(([key, details]: [string, any]) => (
                <div key={key} className="p-4 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                    {getStatusIcon(details.status)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Score: {details.score} | {details.status || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {modelReadiness.recommendations && modelReadiness.recommendations.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Recommendations</h4>
              <ul className="space-y-2">
                {modelReadiness.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {modelReadiness.suggested_next_steps && modelReadiness.suggested_next_steps.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Suggested Next Steps</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modelReadiness.suggested_next_steps.map((step, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdvancedAnalytics = () => {
    if (!analysisResult) return null;

    return (
      <div className="space-y-6">
        {/* Data Quality Overview */}
        {analysisResult.data_quality && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Database className="h-5 w-5 mr-2 text-blue-500" />
              Data Quality Assessment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {analysisResult.data_quality.completeness_score?.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Data Completeness</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {analysisResult.data_quality.duplicate_percentage?.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Duplicates</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">
                  {analysisResult.dataset_profile?.shape?.[1] || 0}
                </div>
                <div className="text-sm text-gray-600">Features</div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Clustering */}
        {analysisResult.advanced_clustering && analysisResult.advanced_clustering.algorithms && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-500" />
              Advanced Clustering Analysis
            </h3>
            
            {analysisResult.advanced_clustering.algorithms.kmeans && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">K-Means Clustering</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold">{analysisResult.advanced_clustering.algorithms.kmeans.optimal_k_silhouette}</div>
                    <div className="text-xs text-gray-600">Optimal K (Silhouette)</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold">{analysisResult.advanced_clustering.algorithms.kmeans.optimal_k_calinski}</div>
                    <div className="text-xs text-gray-600">Optimal K (Calinski)</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold">
                      {Math.max(...(analysisResult.advanced_clustering.algorithms.kmeans.silhouette_scores || [])).toFixed(3)}
                    </div>
                    <div className="text-xs text-gray-600">Best Silhouette</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold">
                      {Math.max(...(analysisResult.advanced_clustering.algorithms.kmeans.calinski_scores || [])).toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-600">Best Calinski</div>
                  </div>
                </div>
              </div>
            )}

            {analysisResult.advanced_clustering.algorithms.dbscan && (
              <div>
                <h4 className="font-medium mb-2">DBSCAN Results</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold">{analysisResult.advanced_clustering.algorithms.dbscan.n_clusters}</div>
                    <div className="text-xs text-gray-600">Clusters Found</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold">{analysisResult.advanced_clustering.algorithms.dbscan.n_noise_points}</div>
                    <div className="text-xs text-gray-600">Noise Points</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold">{(analysisResult.advanced_clustering.algorithms.dbscan.noise_ratio * 100).toFixed(1)}%</div>
                    <div className="text-xs text-gray-600">Noise Ratio</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold">{analysisResult.advanced_clustering.algorithms.dbscan.silhouette_score.toFixed(3)}</div>
                    <div className="text-xs text-gray-600">Silhouette Score</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Anomaly Detection */}
        {analysisResult.anomalies && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-red-500" />
              Anomaly Detection
            </h3>
            
            {analysisResult.anomalies.isolation_forest && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-50 rounded">
                  <div className="text-2xl font-bold text-red-600">
                    {analysisResult.anomalies.isolation_forest.n_anomalies}
                  </div>
                  <div className="text-sm text-gray-600">Anomalies Detected</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded">
                  <div className="text-2xl font-bold text-orange-600">
                    {analysisResult.anomalies.isolation_forest.anomaly_percentage.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-600">Anomaly Rate</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">
                    Isolation Forest
                  </div>
                  <div className="text-sm text-gray-600">Detection Method</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Business Insights */}
        {analysisResult.business_insights && analysisResult.business_insights.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
              Business Insights
            </h3>
            <div className="space-y-4">
              {analysisResult.business_insights.map((insight, index) => (
                <div key={index} className={`p-4 rounded border ${getPriorityColor(insight.priority)}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{insight.category}</span>
                    <span className="text-xs px-2 py-1 rounded bg-white bg-opacity-50">
                      {insight.priority}
                    </span>
                  </div>
                  <div className="text-sm font-medium mb-1">{insight.finding}</div>
                  <div className="text-sm opacity-90 mb-2">{insight.business_impact}</div>
                  <div className="text-sm font-medium">{insight.recommendation}</div>
                  {insight.action_items && insight.action_items.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium mb-1">Action Items:</div>
                      <ul className="text-xs space-y-1">
                        {insight.action_items.map((item: string, itemIndex: number) => (
                          <li key={itemIndex} className="flex items-start">
                            <span className="inline-block w-1 h-1 bg-current rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStatisticalTests = () => {
    if (!analysisResult?.statistical_tests) return null;

    return (
      <div className="space-y-6">
        {/* Normality Tests */}
        {analysisResult.statistical_tests.normality_tests && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
              Normality Tests
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variable
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shapiro-Wilk p-value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jarque-Bera p-value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Is Normal?
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(analysisResult.statistical_tests.normality_tests).map(([variable, test]: [string, any]) => (
                    <tr key={variable}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {variable}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {test.shapiro_wilk?.p_value?.toFixed(4) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {test.jarque_bera?.p_value?.toFixed(4) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          test.is_normal_consensus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {test.is_normal_consensus ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Independence Tests */}
        {analysisResult.statistical_tests.independence_tests && Object.keys(analysisResult.statistical_tests.independence_tests).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-500" />
              Independence Tests (Chi-Square)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variable Pair
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chi-Square p-value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cramér's V
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Independent?
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(analysisResult.statistical_tests.independence_tests).map(([pair, test]: [string, any]) => (
                    <tr key={pair}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {pair.replace('_vs_', ' vs ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {test.chi_square?.p_value?.toFixed(4) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {test.cramers_v?.toFixed(3) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          test.is_independent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {test.is_independent ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTimeSeriesAnalysis = () => {
    if (!analysisResult?.time_series) return null;

    const timeSeriesData = analysisResult.time_series;

    return (
      <div className="space-y-6">
        {/* Date Range Overview */}
        {timeSeriesData.date_range && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-indigo-500" />
              Time Series Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-indigo-50 rounded">
                <div className="text-sm text-gray-600 mb-1">Date Column</div>
                <div className="text-lg font-semibold text-indigo-600">
                  {timeSeriesData.date_column}
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded">
                <div className="text-sm text-gray-600 mb-1">Start Date</div>
                <div className="text-lg font-semibold text-blue-600">
                  {new Date(timeSeriesData.date_range.start).toLocaleDateString()}
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-sm text-gray-600 mb-1">End Date</div>
                <div className="text-lg font-semibold text-green-600">
                  {new Date(timeSeriesData.date_range.end).toLocaleDateString()}
                </div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded">
                <div className="text-sm text-gray-600 mb-1">Total Days</div>
                <div className="text-lg font-semibold text-purple-600">
                  {timeSeriesData.date_range.total_days?.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Frequency Analysis */}
        {timeSeriesData.frequency_analysis && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Frequency Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-800">
                  {timeSeriesData.frequency_analysis.total_records?.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Records</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-800">
                  {timeSeriesData.frequency_analysis.unique_dates?.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Unique Dates</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-800">
                  {timeSeriesData.frequency_analysis.avg_records_per_day?.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Avg Records/Day</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-800">
                  {timeSeriesData.frequency_analysis.date_gaps || 0}
                </div>
                <div className="text-sm text-gray-600">Date Gaps</div>
              </div>
            </div>
          </div>
        )}

        {/* Trend Analysis */}
        {timeSeriesData.trend_analysis && Object.keys(timeSeriesData.trend_analysis).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Trend Analysis</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variable
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trend Direction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slope
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      R²
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Significant?
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(timeSeriesData.trend_analysis).map(([variable, trend]: [string, any]) => (
                    <tr key={variable}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {variable}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          trend.trend_direction === 'increasing' ? 'bg-green-100 text-green-800' :
                          trend.trend_direction === 'decreasing' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {trend.trend_direction}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trend.linear_trend_slope?.toFixed(6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trend.r_squared?.toFixed(3)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          trend.is_trending ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {trend.is_trending ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!selectedFile) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
        <FileText className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-lg font-medium text-gray-600 mb-2">No File Selected</h3>
        <p className="text-gray-500">Select a CSV or Excel file to start advanced EDA analysis</p>
      </div>
    );
  }

  if (selectedFile.type === 'folder') {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
        <Database className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Folder Selected</h3>
        <p className="text-gray-500">Please select a data file (CSV or Excel) for advanced analysis</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <Brain className="mr-2 text-purple-500" size={24} />
              Advanced EDA Analysis
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Analyzing: <span className="font-medium">{selectedFile.name}</span>
            </p>
          </div>
          <button
            onClick={runFullAnalysis}
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

        {/* Configuration Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Column (for ML readiness)
            </label>
            <select
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Select target column...</option>
              {availableColumns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Column (for time series)
            </label>
            <select
              value={dateColumn}
              onChange={(e) => setDateColumn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Select date column...</option>
              {availableColumns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Context
            </label>
            <input
              type="text"
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="E-commerce analytics project"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={runModelReadiness}
            disabled={loading || !targetColumn}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            <Brain className="h-4 w-4 mr-2" />
            Model Readiness
          </button>

          <button
            onClick={runBusinessSummary}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            Business Summary
          </button>
        </div>
      </div>

      {/* Error Display */}
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
          <h3 className="text-lg font-medium text-gray-600 mb-2">Running Advanced Analysis...</h3>
          <p className="text-gray-500">This may take a few moments for complex datasets</p>
        </div>
      )}

      {/* Results */}
      {(analysisResult || modelReadiness || businessSummary) && !loading && (
        <>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {businessSummary && (
                <button
                  onClick={() => setActiveTab('executive')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'executive'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FileText className="inline mr-2" size={16} />
                  Executive Summary
                </button>
              )}

              {modelReadiness && (
                <button
                  onClick={() => setActiveTab('readiness')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'readiness'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Brain className="inline mr-2" size={16} />
                  Model Readiness
                </button>
              )}

              {analysisResult && (
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'analytics'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Activity className="inline mr-2" size={16} />
                  Advanced Analytics
                </button>
              )}

              {analysisResult?.statistical_tests && (
                <button
                  onClick={() => setActiveTab('statistical')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'statistical'
                      ? 'border-yellow-500 text-yellow-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <TrendingUp className="inline mr-2" size={16} />
                  Statistical Tests
                </button>
              )}

              {analysisResult?.time_series && (
                <button
                  onClick={() => setActiveTab('timeseries')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'timeseries'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Clock className="inline mr-2" size={16} />
                  Time Series
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'executive' && renderExecutiveSummary()}
            {activeTab === 'readiness' && renderModelReadiness()}
            {activeTab === 'analytics' && renderAdvancedAnalytics()}
            {activeTab === 'statistical' && renderStatisticalTests()}
            {activeTab === 'timeseries' && renderTimeSeriesAnalysis()}
          </div>

          {/* Download Report Button */}
          <div className="px-6 pb-6">
            <button
              onClick={() => {
                const reportData = {
                  file: selectedFile.name,
                  timestamp: new Date().toISOString(),
                  analysis_result: analysisResult,
                  model_readiness: modelReadiness,
                  business_summary: businessSummary
                };
                const dataStr = JSON.stringify(reportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `advanced_eda_report_${selectedFile.name}_${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <Download className="mr-2" size={16} />
              Download Advanced Report (JSON)
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancedEDAComponent;