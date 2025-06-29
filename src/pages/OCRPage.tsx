import React from 'react';
import OCRMistral from '../components/OCRTool/OCRMistral'

const OCRTool: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Document Processing with AI</h1>
      < OCRMistral/>
    </div>
  );
};

export default OCRTool;