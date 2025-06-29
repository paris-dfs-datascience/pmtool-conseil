import React from 'react';
import DocumentAIProcessor from '../components/DocumentAI';

const DocumentAI: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Document Processing with AI</h1>
      <DocumentAIProcessor />
    </div>
  );
};

export default DocumentAI;