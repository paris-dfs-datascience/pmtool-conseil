// src/components/ConsultingFrameworks.tsx
import React from 'react';
import { BookOpen, MessageSquare, TrendingUp } from 'lucide-react';

export interface ConsultingFramework {
  name: string;
  description: string;
}

export const consultingFrameworks: ConsultingFramework[] = [
  {
    name: 'McKinsey 7-S Framework',
    description: 'A holistic model for analyzing organizational effectiveness through seven interconnected elements. It examines both hard elements (Strategy, Structure, Systems) and soft elements (Shared Values, Style, Staff, Skills). This framework helps identify alignment issues and guide organizational change initiatives.'
  },
  {
    name: 'Porter\'s Five Forces',
    description: 'A framework for analyzing industry competitiveness and profitability potential. It evaluates five key forces: competitive rivalry, supplier power, buyer power, threat of substitutes, and barriers to entry. This analysis helps companies understand their competitive position and develop strategic responses.'
  },
  {
    name: 'BCG Growth-Share Matrix',
    description: 'A portfolio management tool that categorizes business units based on market growth rate and relative market share. It classifies units as Stars, Cash Cows, Question Marks, or Dogs to guide resource allocation decisions. This matrix helps companies balance their portfolio and optimize investment strategies.'
  },
  {
    name: 'SWOT Analysis',
    description: 'A strategic planning technique that evaluates internal Strengths and Weaknesses alongside external Opportunities and Threats. It provides a comprehensive view of an organization\'s strategic position in the market. This framework helps identify strategic options and develop action plans.'
  },
  {
    name: 'Value Chain Analysis',
    description: 'A method for analyzing business activities to identify sources of competitive advantage and cost optimization opportunities. It breaks down operations into primary activities (production, marketing, delivery) and support activities (HR, technology, procurement). This framework helps companies understand where value is created and how to improve profitability.'
  },
  {
    name: 'PESTLE Analysis',
    description: 'A macro-environmental analysis tool that examines Political, Economic, Social, Technological, Legal, and Environmental factors. It helps organizations understand external forces that could impact their business strategy and operations. This framework is essential for strategic planning and risk assessment.'
  },
  {
    name: 'Ansoff Matrix',
    description: 'A strategic planning tool that maps growth strategies across four categories based on products and markets. It evaluates Market Penetration, Market Development, Product Development, and Diversification options. This matrix helps companies assess growth opportunities and associated risks.'
  },
  {
    name: 'Balanced Scorecard',
    description: 'A performance measurement framework that tracks organizational success across four perspectives: Financial, Customer, Internal Business Processes, and Learning & Growth. It translates strategy into measurable objectives and key performance indicators. This approach ensures balanced focus on both short-term and long-term success factors.'
  },
  {
    name: 'Root Cause Analysis (5 Whys)',
    description: 'A problem-solving technique that identifies the underlying cause of issues by repeatedly asking "why" until the root cause is discovered. It prevents addressing symptoms rather than actual problems and promotes systematic thinking. This method is particularly effective for operational problems and process improvements.'
  },
  {
    name: 'Issue Tree/Logic Tree',
    description: 'A structured problem-solving approach that breaks complex problems into smaller, manageable components. It organizes issues in a hierarchical tree structure with mutually exclusive and collectively exhaustive branches. This framework ensures comprehensive problem analysis and systematic solution development.'
  }
];

interface ConsultingFrameworksProps {
  messageCount?: number;
  selectedFramework?: string;
}

const ConsultingFrameworks: React.FC<ConsultingFrameworksProps> = ({
  messageCount = 0,
  selectedFramework = ''
}) => {
  const selectedFrameworkData = consultingFrameworks.find(
    framework => framework.name === selectedFramework
  );

  return (
    <div className="h-full bg-gray-50 p-4 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Framework Assistant
        </h2>
        {messageCount > 0 && (
          <div className="flex items-center text-sm text-gray-600">
            <MessageSquare size={16} className="mr-2" />
            <span>{messageCount} messages</span>
          </div>
        )}
      </div>

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
                <p className="text-sm text-blue-700 leading-relaxed">
                  {selectedFrameworkData.description}
                </p>
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
              Select a consulting framework from the chat interface to begin your analysis.
            </p>
            <div className="text-xs text-gray-500">
              Choose from frameworks like SWOT, Porter's Five Forces, McKinsey 7-S, and more.
            </div>
          </div>
        </div>
      )}

      {/* All Frameworks List */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <BookOpen size={18} className="mr-2" />
          Available Frameworks
        </h3>
        
        <div className="space-y-2">
          {consultingFrameworks.map((framework, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border transition-colors ${
                selectedFramework === framework.name
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="font-medium text-sm text-gray-800 mb-1">
                {framework.name}
              </div>
              <div className="text-xs text-gray-600 line-clamp-2">
                {framework.description.split('.')[0]}.
              </div>
              {selectedFramework === framework.name && (
                <div className="mt-2 text-xs text-blue-600 font-medium">
                  ✓ Currently Active
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">💡 Tips</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• Select a framework before asking questions for better analysis</li>
          <li>• Each framework provides different analytical perspectives</li>
          <li>• You can switch frameworks during your conversation</li>
          <li>• Framework context is maintained throughout your chat</li>
        </ul>
      </div>
    </div>
  );
};

export default ConsultingFrameworks;