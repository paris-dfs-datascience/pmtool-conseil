// src/components/DQEPasswordGate.tsx
import React, { useState } from 'react';
import { Lock } from 'lucide-react';

const DQE_PASSWORD = 'dqeicptool'; // change this to whatever you want

interface Props {
  children: React.ReactNode;
}

export default function DQEPasswordGate({ children }: Props) {
  const [input, setInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === DQE_PASSWORD) {
      setUnlocked(true);
    } else {
      setError(true);
      setInput('');
      setTimeout(() => setError(false), 2000);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 rounded-full p-3">
            <Lock size={28} className="text-blue-600" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">DQE Map</h2>
        <p className="text-gray-500 text-sm mb-6">Enter the password to access this page.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Password"
            autoFocus
            className={`w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
              error
                ? 'border-red-400 focus:ring-red-200'
                : 'border-gray-300 focus:ring-blue-200'
            }`}
          />
          {error && (
            <p className="text-red-500 text-xs">Incorrect password. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}