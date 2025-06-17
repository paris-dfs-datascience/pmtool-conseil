// src/components/UnauthorizedPage.tsx
import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { AlertTriangle, LogOut } from 'lucide-react';

interface UnauthorizedPageProps {
  userEmail?: string;
}

const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({ userEmail }) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 border border-red-200">
        <div className="text-center mb-6">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-red-700 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            Your account is not authorized to access this application.
          </p>
          {userEmail && (
            <div className="bg-gray-100 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-700">
                Signed in as: <strong>{userEmail}</strong>
              </p>
            </div>
          )}
          <p className="text-sm text-gray-500">
            Please contact the administrator if you believe this is an error.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;