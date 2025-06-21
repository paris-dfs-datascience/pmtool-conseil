import React from 'react';
import { Brain, Code, BarChart, Settings } from 'lucide-react'; // Import Lucide icons

const ConseilSection: React.FC = () => {
  return (
    <div className="conseil-section p-4 bg-white-100">
      <div className="conseil-content flex flex-col max-w-6xl mx-auto">
        {/* Left side (100%) */}
        <div className="conseil-left w-full">
          <h1 className="conseil-title text-6xl mb-6">Conseil- Advisory Assistant</h1>
          <p className="conseil-description text-2xl mb-16">
            Le Marais Advisory expands beyond traditional consulting to build custom AI tools that automate and enhance professional workflows. We empower our consultants
            with an AI platform for data driven recommendations. 
          </p>
          <div className="icon-container flex flex-wrap justify-between space-x-4">
            <div className="icon-item text-center mb-4 md:mb-0">
              <Brain size={64} className="mx-auto" />
              <p className="mt-2 text-xl">AI Development</p>
            </div>
            <div className="icon-item text-center mb-4 md:mb-0">
              <Code size={64} className="mx-auto" />
              <p className="mt-2 text-xl">Custom Software</p>
            </div>
            <div className="icon-item text-center mb-4 md:mb-0">
              <BarChart size={64} className="mx-auto" />
              <p className="mt-2 text-xl">Data Analysis</p>
            </div>
            <div className="icon-item text-center mb-4 md:mb-0">
              <Settings size={64} className="mx-auto" />
              <p className="mt-2 text-xl">Workflow Automation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConseilSection;