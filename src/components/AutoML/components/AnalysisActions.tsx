// components/AnalysisActions.tsx
import React from 'react';
import type { AnalysisActionsProps, AnalysisAction } from '../types';
import { getActionsByCategory, analysisCategories } from '../analysisActions';

interface AnalysisActionsPropsExtended extends AnalysisActionsProps {
  canRunAction: (action: AnalysisAction) => boolean;
}

const AnalysisActions: React.FC<AnalysisActionsPropsExtended> = ({
  selectedFile,
  fileAnalysis,
  onRunAnalysis,
  canRunAction
}) => {
  const categories = ['eda', 'ml', 'advanced'] as const;

  return (
    <div className="space-y-4">
      {categories.map(categoryKey => {
        const category = analysisCategories[categoryKey];
        const actions = getActionsByCategory(categoryKey);
        
        return (
          <div key={categoryKey}>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {category.label}
            </h3>
            <div className="flex flex-wrap gap-2">
              {actions.map(action => {
                const Icon = action.icon;
                const canRun = canRunAction(action) && 
                  (!action.requiresTarget || fileAnalysis?.targetColumn);
                
                const colorClasses = {
                  eda: canRun ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-400',
                  ml: canRun ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400',
                  advanced: canRun ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-gray-100 text-gray-400'
                };
                
                return (
                  <button
                    key={action.id}
                    onClick={() => canRun && onRunAnalysis(action.id)}
                    disabled={!canRun}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      colorClasses[action.category]
                    } ${!canRun ? 'cursor-not-allowed' : ''}`}
                    title={action.description}
                  >
                    <Icon size={16} className="mr-2" />
                    {action.label}
                    {action.requiresTarget && <span className="ml-1 text-xs">*</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {fileAnalysis && (
        <p className="text-xs text-gray-500">
          * Requires target column selection
        </p>
      )}
    </div>
  );
};

export default AnalysisActions;