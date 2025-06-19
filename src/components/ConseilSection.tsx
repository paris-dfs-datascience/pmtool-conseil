import React from 'react';
import VideoPlayer from './VideoPlayer';
import { Brain, Code, BarChart, Settings } from 'lucide-react'; // Import Lucide icons

const ConseilSection: React.FC = () => {
  const videoUrl = 'https://youtu.be/Yi9sYqIrLNk';

  return (
    <div className="conseil-section p-4 bg-white-100">
      <div className="conseil-content flex flex-col md:flex-row justify-between max-w-6xl mx-auto">
        {/* Left side (50%) */}
        <div className="conseil-left w-full md:w-1/2 pr-4 md:pr-8">
          <h1 className="conseil-title text-4xl mb-4">Conseil- AI Agent Platform</h1>
          <p className="conseil-description text-base mb-8">
            Le Marais Advisory expands beyond traditional consulting to build custom AI tools that automate and enhance professional workflows. Our goal is 
            create context aware custom solutions to automate your day to day.
          </p>
          <div className="icon-container flex flex-wrap justify-between space-x-4">
            <div className="icon-item text-center mb-4 md:mb-0">
              <Brain size={48} className="mx-auto" />
              <p className="mt-2">AI Development</p>
            </div>
            <div className="icon-item text-center mb-4 md:mb-0">
              <Code size={48} className="mx-auto" />
              <p className="mt-2">Custom Software</p>
            </div>
            <div className="icon-item text-center mb-4 md:mb-0">
              <BarChart size={48} className="mx-auto" />
              <p className="mt-2">Data Analysis</p>
            </div>
            <div className="icon-item text-center mb-4 md:mb-0">
              <Settings size={48} className="mx-auto" />
              <p className="mt-2">Workflow Automation</p>
            </div>
          </div>
        </div>
        {/* Right side (50%) */}
        <div className="conseil-right w-full md:w-1/2 mt-8 md:mt-0">
          <VideoPlayer url={videoUrl} />
        </div>
      </div>
    </div>
  );
};

export default ConseilSection;