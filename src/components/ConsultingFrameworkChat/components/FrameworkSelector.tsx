// src/components/ConsultingChat/components/FrameworkSelector.tsx
import React, { useState } from 'react';
import { FrameworkSelectorProps } from '../types';

const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({
  frameworks,
  selectedFramework,
  onFrameworkSelect,
  needsAuth
}) => {
  const [hoveredFramework, setHoveredFramework] = useState<string>('');

  const getFrameworkStatus = (framework: any) => {
    if (framework.isImplemented) {
      return 'available';
    }
    return 'unavailable';
  };

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-4 max-h-64 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Choose a Consulting Framework:</h3>
      <div className="space-y-2">
        {frameworks.map((framework, index) => {
          const status = getFrameworkStatus(framework);
          const requiresAuth = needsAuth && status === 'available';
          return (
            <div key={index} className="relative">
              <button
                onClick={() => onFrameworkSelect(framework.name)}
                onMouseEnter={() => setHoveredFramework(framework.name)}
                onMouseLeave={() => setHoveredFramework('')}
                disabled={status === 'unavailable'}
                className={`w-full text-left px-3 py-2 text-sm border rounded-lg transition-all duration-200 ${
                  status === 'unavailable'
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : requiresAuth
                    ? 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
                    : selectedFramework === framework.name
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{framework.name}</span>
                  {status === 'available' && !requiresAuth && (
                    <span className="text-green-500 text-xs">● Available</span>
                  )}
                  {status === 'available' && requiresAuth && (
                    <span className="text-orange-500 text-xs">🔐 Sign In Required</span>
                  )}
                  {status === 'unavailable' && (
                    <span className="text-gray-400 text-xs">○ Coming Soon</span>
                  )}
                </div>
              </button>

              {hoveredFramework === framework.name && (
                <div className="absolute left-0 right-0 bottom-full mb-1 z-10 bg-gray-800 text-white p-3 rounded-lg shadow-lg">
                  <p className="text-xs leading-relaxed">{framework.description}</p>
                  {status === 'unavailable' && (
                    <p className="text-xs text-red-300 mt-1">Framework implementation coming soon</p>
                  )}
                  {requiresAuth && (
                    <p className="text-xs text-orange-300 mt-1">Authentication required to use this framework</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FrameworkSelector;