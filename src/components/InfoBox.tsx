import React from 'react';
import { Copy } from 'lucide-react';

interface InfoBoxProps {
  text: string;
}

const InfoBox: React.FC<InfoBoxProps> = ({ text }) => {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Text copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy text to clipboard');
    }
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-md relative">
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Copy size={16} />
      </button>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>
    </div>
  );
};

export default InfoBox;