import React, { useState, useEffect } from 'react';
import { BookOpen, MessageSquare, TrendingUp, Activity, Globe, AlertCircle, CheckCircle, Clock } from 'lucide-react';

// Types matching backend models
interface FrameworkInfo {
  name: string;
  description: string;
  status: string;
  prefix: string;
  tags: string[];
  features: string[];
  version: string;
  error?: string;
}

interface FrameworkStatus {
  total_frameworks: number;
  available_frameworks: number;
  unavailable_frameworks: number;
  frameworks: Record<string, {
    name: string;
    status: string;
    prefix: string;
    features_count: number;
    error?: string;
  }>;
}

interface SWOTAnalysisRequest {
  business_context: string;
  company_description?: string;
  industry?: string;
  specific_focus?: string;
  enable_grounding: boolean;
  competitor_analysis: boolean;
  market_research: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ConsultingFrameworksProps {
  messageCount?: number;
  selectedFramework?: string;
  onFrameworkSelect?: (framework: string) => void;
  onAnalysisRequest?: (analysis: any) => void;
}

const ConsultingFrameworks: React.FC<ConsultingFrameworksProps> = ({
  messageCount = 0,
  selectedFramework = '',
  onFrameworkSelect,
  onAnalysisRequest
}) => {
  // State management
  const [frameworks, setFrameworks] = useState<FrameworkInfo[]>([]);
  const [frameworkStatus, setFrameworkStatus] = useState<FrameworkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisForm, setAnalysisForm] = useState({
    business_context: '',
    company_description: '',
    industry: '',
    specific_focus: '',
    enable_grounding: true,
    competitor_analysis: false,
    market_research: false
  });
  const [showAnalysisForm, setShowAnalysisForm] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Fixed API base URL configuration - Updated to match your BACKEND_API variable
  const API_BASE = process.env.REACT_APP_BACKEND_API || 'https://lma-chat-api-443545551926.us-central1.run.app';
  
  // Debug environment variables
  console.log('ConsultingFrameworks Environment Debug:', {
    REACT_APP_BACKEND_API: process.env.REACT_APP_BACKEND_API,
    BACKEND_API: process.env.BACKEND_API,
    NODE_ENV: process.env.NODE_ENV,
    API_BASE_RESOLVED: API_BASE
  });

  // Fetch framework status on component mount
  useEffect(() => {
    fetchFrameworkStatus();
    fetchFrameworksList();
  }, []);

  const fetchFrameworkStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/frameworks/frameworks/status`);
      if (response.ok) {
        const status = await response.json();
        setFrameworkStatus(status);
      } else {
        throw new Error('Failed to fetch framework status');
      }
    } catch (err) {
      console.error('Error fetching framework status:', err);
      setError('Failed to load framework status');
    }
  };

  const fetchFrameworksList = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/frameworks/frameworks/list`);
      if (response.ok) {
        const data = await response.json();
        const frameworksArray = Object.values(data.available_frameworks || {}) as FrameworkInfo[];
        setFrameworks(frameworksArray);
      } else {
        throw new Error('Failed to fetch frameworks list');
      }
    } catch (err) {
      console.error('Error fetching frameworks:', err);
      setError('Failed to load frameworks');
    } finally {
      setLoading(false);
    }
  };

  const handleFrameworkSelect = (frameworkName: string) => {
    if (onFrameworkSelect) {
      onFrameworkSelect(frameworkName);
    }
    
    // Show analysis form for SWOT
    if (frameworkName === 'SWOT Analysis') {
      setShowAnalysisForm(true);
    }
  };

  const handleSWOTAnalysis = async () => {
    if (!analysisForm.business_context.trim()) {
      alert('Please provide business context for the analysis');
      return;
    }

    try {
      setAnalysisLoading(true);
      const response = await fetch(`${API_BASE}/frameworks/swot/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisForm)
      });

      if (response.ok) {
        const analysis = await response.json();
        if (onAnalysisRequest) {
          onAnalysisRequest(analysis);
        }
        setShowAnalysisForm(false);
        // Reset form
        setAnalysisForm({
          business_context: '',
          company_description: '',
          industry: '',
          specific_focus: '',
          enable_grounding: true,
          competitor_analysis: false,
          market_research: false
        });
      } else {
        throw new Error('Failed to perform SWOT analysis');
      }
    } catch (err) {
      console.error('Error performing SWOT analysis:', err);
      alert('Failed to perform SWOT analysis. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getFrameworkStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'unavailable':
        return <Clock size={14} className="text-yellow-500" />;
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />;
      default:
        return <Activity size={14} className="text-gray-500" />;
    }
  };

  const selectedFrameworkData = frameworks.find(
    framework => framework.name === selectedFramework
  );

  if (loading) {
    return (
      <div className="h-full bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <Activity className="animate-spin mx-auto mb-2" size={24} />
          <p className="text-gray-600">Loading frameworks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 p-4 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Framework Assistant
        </h2>
        <div className="flex items-center justify-between">
          {messageCount > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <MessageSquare size={16} className="mr-2" />
              <span>{messageCount} messages</span>
            </div>
          )}
          {frameworkStatus && (
            <div className="flex items-center text-sm text-gray-600">
              <Globe size={16} className="mr-2" />
              <span>{frameworkStatus.available_frameworks}/{frameworkStatus.total_frameworks} available</span>
            </div>
          )}
        </div>
        
        {/* API Debug Info */}
        <div className="mt-2 text-xs text-gray-500">
          API Base: {API_BASE}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle size={18} className="text-red-600 mr-2" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Selected Framework Section */}
      {selectedFramework ? (
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center mb-3">
              <TrendingUp size={18} className="text-blue-600 mr-2" />
              <h3 className="font-semibold text-gray-800">Active Framework</h3>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <h4 className="font-medium text-blue-800 mb-2">
                {selectedFramework}
              </h4>
              {selectedFrameworkData && (
                <>
                  <p className="text-sm text-blue-700 leading-relaxed mb-3">
                    {selectedFrameworkData.description}
                  </p>
                  {selectedFrameworkData.features && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-blue-800 mb-1">Features:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedFrameworkData.features.slice(0, 3).map((feature, idx) => (
                          <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {selectedFramework === 'SWOT Analysis' && (
                <button
                  onClick={() => setShowAnalysisForm(!showAnalysisForm)}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  {showAnalysisForm ? 'Hide Analysis Form' : 'Start SWOT Analysis'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center mb-3">
              <BookOpen size={18} className="text-gray-600 mr-2" />
              <h3 className="font-semibold text-gray-800">Getting Started</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Select a consulting framework below to begin your analysis.
            </p>
            <div className="text-xs text-gray-500">
              AI-powered frameworks with real-time market data and grounding.
            </div>
          </div>
        </div>
      )}

      {/* SWOT Analysis Form */}
      {showAnalysisForm && selectedFramework === 'SWOT Analysis' && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">SWOT Analysis Setup</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Context *
              </label>
              <textarea
                value={analysisForm.business_context}
                onChange={(e) => setAnalysisForm(prev => ({ ...prev, business_context: e.target.value }))}
                placeholder="Describe your business, situation, or challenge..."
                className="w-full p-2 border border-gray-300 rounded text-sm"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <input
                type="text"
                value={analysisForm.industry}
                onChange={(e) => setAnalysisForm(prev => ({ ...prev, industry: e.target.value }))}
                placeholder="e.g., Technology, Healthcare, Finance"
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Description
              </label>
              <input
                type="text"
                value={analysisForm.company_description}
                onChange={(e) => setAnalysisForm(prev => ({ ...prev, company_description: e.target.value }))}
                placeholder="Brief company description"
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            
            <div className="flex flex-col space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={analysisForm.enable_grounding}
                  onChange={(e) => setAnalysisForm(prev => ({ ...prev, enable_grounding: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Enable real-time market grounding</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={analysisForm.competitor_analysis}
                  onChange={(e) => setAnalysisForm(prev => ({ ...prev, competitor_analysis: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Include competitor analysis</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={analysisForm.market_research}
                  onChange={(e) => setAnalysisForm(prev => ({ ...prev, market_research: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Include market research</span>
              </label>
            </div>
            
            <button
              onClick={handleSWOTAnalysis}
              disabled={analysisLoading || !analysisForm.business_context.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {analysisLoading ? 'Analyzing...' : 'Generate SWOT Analysis'}
            </button>
          </div>
        </div>
      )}

      {/* All Frameworks List */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <BookOpen size={18} className="mr-2" />
          Available Frameworks
        </h3>
        
        {frameworks.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <p className="text-sm">No frameworks available</p>
            <p className="text-xs">Check your backend connection</p>
          </div>
        ) : (
          <div className="space-y-2">
            {frameworks.map((framework, index) => (
              <div
                key={index}
                onClick={() => handleFrameworkSelect(framework.name)}
                className={`p-3 rounded-lg border transition-colors cursor-pointer hover:border-blue-300 ${
                  selectedFramework === framework.name
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-sm text-gray-800">
                    {framework.name}
                  </div>
                  {getFrameworkStatusIcon(framework.status)}
                </div>
                <div className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {framework.description.split('.')[0]}.
                </div>
                
                {framework.features && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {framework.features.slice(0, 2).map((feature, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))}
                    {framework.features.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{framework.features.length - 2} more
                      </span>
                    )}
                  </div>
                )}
                
                {selectedFramework === framework.name && (
                  <div className="mt-2 text-xs text-blue-600 font-medium">
                    ✓ Currently Active
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">💡 Tips</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• Select a framework to access specialized analysis tools</li>
          <li>• Real-time grounding provides current market insights</li>
          <li>• Each framework offers unique analytical perspectives</li>
          <li>• Framework context enhances chat conversations</li>
          {frameworkStatus?.available_frameworks === 0 && (
            <li className="text-red-600">• Check backend connection if no frameworks load</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ConsultingFrameworks;