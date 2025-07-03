import React from 'react';
import OCRMistral from '../components/OCRTool/OCRMistral';
import { AuthContext } from '../types/auth';

interface OCRToolPageProps {
  authContext?: AuthContext;
}

const OCRTool: React.FC<OCRToolPageProps> = ({ authContext }) => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Document Processing with AI</h1>
      <OCRMistral authContext={authContext} />
    </div>
  );
};

export default OCRTool;