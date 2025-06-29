import React from 'react';

const Bio: React.FC = () => {
  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <img src="/images/pic.jpg" alt="Profile" className="w-14 h-14 rounded-full" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Matthew Paris</h2>
        <p className="text-gray-600">
          Principal AI Consultant | Expert in both strategy and hands on keyboard development
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">About Me</h3>
          <p className="text-gray-600">
            Hello! I'm Matt Paris, a Principal AI Consultant with 19+ years experience in AI, Data, Automation, ML and Data Science
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Brief Summary</h3>
          <ul className="list-disc list-inside text-gray-600">
            <li>MBA, Data Scientist, Consultant</li>
            <li>Strategy and Implemmentation Expert</li>
            <li>CoEs, Use Cases, Executive Workshops</li>
            <li>GenAI, RAG, Automation, Agents, Co-Pilots</li>
            <li>Ask me about Conseil</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Me</h3>
          <p className="text-gray-600">
            matthew.paris@lemaraisadvisory.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default Bio;