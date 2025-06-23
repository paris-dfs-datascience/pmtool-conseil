// src/components/Sidebar.tsx
import React from 'react';
import { Home, MessageCircle, FerrisWheel, PenTool, Briefcase, LogIn, LogOut, User, Code, Brain, LayoutList } from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  isAuthorized: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, isAuthorized }) => {
  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setActiveTab('home'); // Redirect to home after sign out
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="w-16 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4">
      {/* Home Icon - Always visible */}
      <button
        onClick={() => setActiveTab('home')}
        className={`p-3 rounded-lg transition-colors mb-2 ${
          activeTab === 'home'
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}
        title="Home"
      >
        <Home size={24} />
      </button>

      {/* Navigation Icons - Always visible regardless of auth status */}
      <button
        onClick={() => setActiveTab('chat')}
        className={`p-3 rounded-lg transition-colors mb-2 ${
          activeTab === 'chat'
            ? 'bg-blue-100 text-blue-600'
            : !user
            ? 'text-gray-400 hover:bg-blue-50 hover:text-blue-500'
            : isAuthorized
            ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
        }`}
        title={!user ? 'AI Chat Assistant (Preview)' : isAuthorized ? 'Chat' : 'Requires authorization'}
      >
        <MessageCircle size={24} />
      </button>

      <button
        onClick={() => setActiveTab('claude')}
        className={`p-3 rounded-lg transition-colors mb-2 ${
          activeTab === 'chat'
            ? 'bg-blue-100 text-blue-600'
            : !user
            ? 'text-gray-400 hover:bg-blue-50 hover:text-blue-500'
            : isAuthorized
            ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
        }`}
        title={!user ? 'Claude AI Chat Assistant (Preview)' : isAuthorized ? 'Claude Chat' : 'Requires authorization'}
      >
        <Brain size={24} />
      </button>

      <button
        onClick={() => setActiveTab('framework')}
        className={`p-3 rounded-lg transition-colors mb-2 ${
          activeTab === 'graphite'
            ? 'bg-blue-100 text-blue-600'
            : !user
            ? 'text-gray-400 hover:bg-blue-50 hover:text-blue-500'
            : isAuthorized
            ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
        }`}
        title={!user ? 'Consulting Framework (Preview)' : isAuthorized ? 'Consulting Framework' : 'Requires authorization'}
      >
        <LayoutList size={24} />
      </button>

      <button
        onClick={() => setActiveTab('lma')}
        className={`p-3 rounded-lg transition-colors mb-2 ${
          activeTab === 'lma'
            ? 'bg-blue-100 text-blue-600'
            : !user
            ? 'text-gray-400 hover:bg-blue-50 hover:text-blue-500'
            : isAuthorized
            ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
        }`}
        title={!user ? 'LMA Section (Preview)' : isAuthorized ? 'LMA' : 'Requires authorization'}
      >
        <FerrisWheel size={24} />
      </button>

      <button
        onClick={() => setActiveTab('graphite')}
        className={`p-3 rounded-lg transition-colors mb-2 ${
          activeTab === 'graphite'
            ? 'bg-blue-100 text-blue-600'
            : !user
            ? 'text-gray-400 hover:bg-blue-50 hover:text-blue-500'
            : isAuthorized
            ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
        }`}
        title={!user ? 'Graphite (Preview)' : isAuthorized ? 'Graphite' : 'Requires authorization'}
      >
        <PenTool size={24} />
      </button>

      <button
        onClick={() => setActiveTab('catalant')}
        className={`p-3 rounded-lg transition-colors mb-2 ${
          activeTab === 'catalant'
            ? 'bg-blue-100 text-blue-600'
            : !user
            ? 'text-gray-400 hover:bg-blue-50 hover:text-blue-500'
            : isAuthorized
            ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
        }`}
        title={!user ? 'Catalant (Preview)' : isAuthorized ? 'Catalant' : 'Requires authorization'}
      >
        <Briefcase size={24} />
      </button>

      <button
        onClick={() => setActiveTab('code')}
        className={`p-3 rounded-lg transition-colors mb-2 ${
          activeTab === 'code'
            ? 'bg-blue-100 text-blue-600'
            : !user
            ? 'text-gray-400 hover:bg-blue-50 hover:text-blue-500'
            : isAuthorized
            ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
        }`}
        title={!user ? 'Code Assistant (Preview)' : isAuthorized ? 'Code' : 'Requires authorization'}
      >
        <Code size={24} />
      </button>

      {/* Spacer to push auth section to bottom */}
      <div className="flex-1"></div>

      {/* Auth Section at Bottom of Sidebar */}
      <div className="flex flex-col items-center space-y-2">
        {user ? (
          <>
            {/* User Avatar */}
            <div className="relative group">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
              )}
              
              {/* Tooltip with user info */}
              <div className="absolute left-full ml-2 bottom-0 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                <div>{user.displayName}</div>
                <div className="text-gray-300">{user.email}</div>
              </div>
            </div>
            
            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </>
        ) : (
          /* Sign In Button */
          <button
            onClick={signInWithGoogle}
            className="p-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            title="Sign in with Google"
          >
            <LogIn size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;