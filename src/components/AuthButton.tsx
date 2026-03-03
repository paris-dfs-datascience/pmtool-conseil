// src/components/AuthButton.tsx
import React from 'react';
import { signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { User, LogIn, LogOut } from 'lucide-react';

interface AuthButtonProps {
  user: any;
}

const AuthButton: React.FC<AuthButtonProps> = ({ user }) => {
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Handle specific errors gracefully
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('Sign-in cancelled by user');
        // Don't show error - user intentionally closed it
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log('Another sign-in popup is already open');
      } else {
        console.error('Error signing in with Google:', error);
        // Only show actual errors to user
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (user) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {(user.providerData?.[0]?.photoURL || user.photoURL) ? (
              <img
                src={user.providerData[0].photoURL || user.photoURL}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-gray-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
            )}
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-700">{user.displayName}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center space-x-1 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
    >
      <LogIn size={16} />
      <span>Sign in with Google</span>
    </button>
  );
};

export default AuthButton;