import React, { useState, useEffect } from 'react';
import { FileText, Database, BarChart3, Cog, Users, Lightbulb, TrendingUp, DollarSign, Map, CheckCircle } from 'lucide-react';

const InteractiveLMADiagram = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const steps = [
    'Mix of Models Exploratory Data Analysis',
    'LLM Powered Assessments',
    'Gap Analysis',
    'Recommendations'
  ];

  const descriptions: Record<string, string> = {
    'Mix of Models Exploratory Data Analysis': 'Combines multiple AI models to analyze diverse data sources and identify patterns, trends, and anomalies across your organizational data.',
    'LLM Powered Assessments': 'Uses Large Language Models to conduct intelligent evaluations, automated analysis, and extract meaningful insights from unstructured data.',
    'Gap Analysis': 'Identifies discrepancies between current state and desired outcomes, highlighting areas needing improvement or optimization.',
    'Recommendations': 'Generates actionable strategic recommendations based on comprehensive analysis and expert knowledge integration.',
    'Documents': 'Processes various document types including reports, policies, procedures, and other textual content for comprehensive analysis.',
    'Transactions': 'Analyzes transactional data to identify patterns, anomalies, and business intelligence insights.',
    'Reports': 'Reviews existing reports and analytics to extract key performance indicators and trend analysis.',
    'Process and Technical Maps': 'Examines workflow diagrams, technical architectures, and process documentation for optimization opportunities.',
    'Human Analysis': 'Expert human review ensures accuracy, context, and nuanced understanding that complements AI analysis.',
    'NLP and Predictive Analytics': 'Natural Language Processing and machine learning models predict future trends and extract insights from text data.',
    'Expert and Past Experience Input': 'Incorporates domain expertise and historical knowledge to provide context and validate findings.',
    'Strategy': 'Develops comprehensive strategic plans based on data-driven insights and expert recommendations.',
    'Roadmap': 'Creates detailed implementation timelines and milestone tracking for strategic initiatives.',
    'Cost': 'Provides cost-benefit analysis and resource allocation recommendations for optimal ROI.'
  };

  // Auto-advance steps
  useEffect(() => {
    const interval = setInterval(() => {
      if (!hoveredElement) {
        setActiveStep(prev => (prev + 1) % steps.length);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [hoveredElement]);

  // Handle step click with error boundary
  const handleStepClick = (index: number) => {
    try {
      if (typeof index === 'number' && index >= 0 && index < steps.length) {
        setActiveStep(index);
        setIsAnimating(true);
        setTimeout(() => {
          setIsAnimating(false);
        }, 500);
      }
    } catch (error) {
      console.error('Error in handleStepClick:', error);
    }
  };

  // Handle mouse enter with safety checks
  const handleMouseEnter = (element: string, event: React.MouseEvent) => {
    try {
      setHoveredElement(element);
      if (event?.currentTarget?.getBoundingClientRect) {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
      }
    } catch (error) {
      console.error('Error in handleMouseEnter:', error);
    }
  };

  const handleMouseLeave = () => {
    setHoveredElement(null);
  };

  const FlowArrow = () => (
    <div className="flex items-center mx-2">
      <div className="w-8 h-0.5 bg-blue-400 transition-all duration-300" />
      <div className="w-0 h-0 border-l-4 border-l-blue-400 border-t-2 border-b-2 border-t-transparent border-b-transparent ml-1" />
    </div>
  );

  const ProcessStep = ({ title, icon: Icon, index, isActive }: {
    title: string;
    icon: React.ComponentType<{ size: number; className?: string }>;
    index: number;
    isActive: boolean;
  }) => (
    <div
      className={`relative px-6 py-4 rounded-lg cursor-pointer transition-all duration-300 transform ${
        isActive
          ? 'bg-blue-600 text-white scale-105 shadow-lg ring-2 ring-blue-300'
          : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
      } ${isAnimating && isActive ? 'animate-pulse' : ''}`}
      onClick={() => handleStepClick(index)}
      onMouseEnter={(e) => handleMouseEnter(title, e)}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center space-x-3">
        <Icon size={20} className={isActive ? 'text-white' : 'text-blue-400'} />
        <span className="font-medium text-sm">{title}</span>
      </div>

      {isActive && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
        </div>
      )}
    </div>
  );

  const DataSource = ({ icon: Icon, label }: {
    icon: React.ComponentType<{ size: number; className?: string }>;
    label: string;
  }) => (
    <div
      className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
      onMouseEnter={(e) => handleMouseEnter(label, e)}
      onMouseLeave={handleMouseLeave}
    >
      <Icon size={32} className="text-gray-600 mb-2" />
      <span className="text-xs font-medium text-gray-700 text-center">{label}</span>
    </div>
  );

  const InsightCard = ({ icon: Icon, title }: {
    icon: React.ComponentType<{ size: number; className?: string }>;
    title: string;
  }) => (
    <div
      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-105"
      onMouseEnter={(e) => handleMouseEnter(title, e)}
      onMouseLeave={handleMouseLeave}
    >
      <Icon size={24} className="text-blue-600" />
      <span className="text-sm font-medium text-gray-700">{title}</span>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl shadow-xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Leveraging AI to drive data driven insights and opportunties
        </h1>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - Data Sources */}
        <div className="col-span-2">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Data Sources</h3>
          <div className="space-y-4">
            <DataSource icon={FileText} label="Documents" />
            <DataSource icon={Database} label="Transactions" />
            <DataSource icon={BarChart3} label="Reports" />
            <DataSource icon={Map} label="Process and Technical Maps" />
          </div>
        </div>

        {/* Main Flow */}
          <div className="col-span-8">
            {/* Google Cloud Header */}
            <div className="bg-white rounded-lg p-2 mb-2 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <img
                      src="/images/gcp.png"
                      alt="Google Cloud"
                      className="w-40 h-40 object-contain"
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center justify-center">
                  <img
                    src="/images/conseil_logo.png"
                    alt="Conseil Logo"
                    className="w-40 h-40 object-contain"
                  />
                </div>
              </div>
            </div>

          {/* AI Assisted Process Flow */}
          <div className="bg-gray-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">AI Assisted Process Flow</h2>
              <div className="flex items-center space-x-2">
                <div className="h-14 w-14 relative mb-6">
                  <img
                    src="/images/Gemini-Logo.png"
                    alt="Gemini"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="h-14 w-14 relative mb-6">
                  <img
                    src="/images/claude_ai.png"
                    alt="Anthropic"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="h-14 w-14 relative mb-6">
                  <img
                    src="/images/mistral-color.png"
                    alt="Mistral"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Process Steps */}
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={index}>
                  <ProcessStep
                    title={step}
                    icon={index === 0 ? Cog : index === 1 ? Users : index === 2 ? BarChart3 : Lightbulb}
                    index={index}
                    isActive={activeStep === index}
                  />
                  {index < steps.length - 1 && <FlowArrow />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Analysis Components */}
          <div className="grid grid-cols-3 gap-4">
            <div
              className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              onMouseEnter={(e) => handleMouseEnter('Human Analysis', e)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Users size={20} className="text-blue-600" />
                <span className="font-medium text-gray-800">Human Analysis</span>
              </div>
              <div className="text-sm text-gray-600">Expert review and validation</div>
            </div>

            <div
              className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              onMouseEnter={(e) => handleMouseEnter('NLP and Predictive Analytics', e)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Cog size={20} className="text-green-600" />
                <span className="font-medium text-gray-800">NLP and Predictive Analytics</span>
              </div>
              <div className="text-sm text-gray-600">AI-powered insights</div>
            </div>

            <div
              className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              onMouseEnter={(e) => handleMouseEnter('Expert and Past Experience Input', e)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle size={20} className="text-purple-600" />
                <span className="font-medium text-gray-800">Expert and Past Experience Input</span>
              </div>
              <div className="text-sm text-gray-600">Historical context and expertise</div>
            </div>
          </div>

          {/* Key Message */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <p className="text-sm text-blue-800 font-medium">
              AI + Human Analysis to diagnose the biggest challenges and areas with highest impact.
            </p>
          </div>
        </div>

        {/* Right Sidebar - Insights */}
        <div className="col-span-2">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            <Lightbulb className="inline mr-2" size={20} />
            Insights
          </h3>
          <div className="space-y-3">
            <InsightCard icon={TrendingUp} title="Strategy" />
            <InsightCard icon={Map} title="Roadmap" />
            <InsightCard icon={DollarSign} title="Cost" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-right">
        <span className="text-sm text-gray-500">Le Marais Advisory</span>
      </div>

      {/* Tooltip */}
      {hoveredElement && descriptions[hoveredElement] && (
        <div
          className="fixed z-50 max-w-xs p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-opacity duration-200"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`
          }}
        >
          <div className="font-medium mb-1">{hoveredElement}</div>
          <div className="text-gray-300 text-xs leading-relaxed">
            {descriptions[hoveredElement]}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      )}

      {/* Debug info */}
      {hoveredElement && (
        <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-40">
          <span className="text-sm">Hovering: {hoveredElement}</span>
        </div>
      )}
    </div>
  );
};

export default InteractiveLMADiagram;