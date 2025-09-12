import React from 'react';
import { MapPin, Handshake, Cpu, NotebookPen } from 'lucide-react'; // Import Lucide icons

const ConsultingSection: React.FC = () => {
  return (
    <div className="conseil-section p-4 bg-white-100">
  <div className="conseil-content flex flex-col max-w-6xl mx-auto">
    {/* Left side (100%) */}
    <div className="conseil-left w-full text-center">
      <h1 className="conseil-title text-6xl mb-6 font-serif text-slate-800 leading-tight">
        We have a proven approach for delivering measurable results.
      </h1>
      <p className="conseil-description text-2xl mb-16 font-sans text-slate-600 leading-relaxed max-w-4xl mx-auto">
        We're confident in our AI Acceleration framework, which has delivered measurable improvements for 50+ clients. In our first 90 days together, we focus on implementing quick wins while building the foundation for long-term transformation.
      </p>
    </div>
  </div>
</div>
  );
};

export default ConsultingSection;