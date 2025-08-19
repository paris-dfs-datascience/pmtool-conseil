import React from 'react';
import { MapPin, Handshake, Cpu, NotebookPen } from 'lucide-react'; // Import Lucide icons

const ConsultingSection: React.FC = () => {
  return (
    <div className="conseil-section p-4 bg-white-100">
      <div className="conseil-content flex flex-col max-w-6xl mx-auto">
        {/* Left side (100%) */}
        <div className="conseil-left w-full">
          <h1 className="conseil-title text-6xl mb-6">AI Strategy Consulting</h1>
          <p className="conseil-description text-2xl mb-16">
            Le Marais Advisory is the company you call when the big firms couldn't deliver. 
          </p>
          <div className="icon-container flex flex-wrap justify-between space-x-4">
            <div className="icon-item text-center mb-4 md:mb-0">
              <MapPin size={64} className="mx-auto" />
              <p className="mt-2 text-xl">Roadmaps</p>
            </div>
            <div className="icon-item text-center mb-4 md:mb-0">
              <Handshake size={64} className="mx-auto" />
              <p className="mt-2 text-xl">Operating Model</p>
            </div>
            <div className="icon-item text-center mb-4 md:mb-0">
              <Cpu size={64} className="mx-auto" />
              <p className="mt-2 text-xl">Technology</p>
            </div>
            <div className="icon-item text-center mb-4 md:mb-0">
              <NotebookPen size={64} className="mx-auto" />
              <p className="mt-2 text-xl">Adoption</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultingSection;