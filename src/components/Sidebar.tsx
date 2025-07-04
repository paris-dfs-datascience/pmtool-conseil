// src/components/Sidebar.tsx
import React, { useState } from 'react';
import { Home, MessageCircle, FerrisWheel, PenTool, Briefcase, LogIn, LogOut, User, Code, Brain, LayoutList, ScanSearch, ChartScatter, Beaker} from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  isAuthorized: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, isAuthorized }) => {
  const [isHovered, setIsHovered] = useState(false);

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

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', alwaysEnabled: true },
    { id: 'chat', icon: MessageCircle, label: 'Gemini AI Chat' },
    { id: 'claude', icon: Brain, label: 'Claude AI' },
    { id: 'moechat', icon: Beaker, label: 'MoE AI Chat' },
    { id: 'framework', icon: LayoutList, label: 'Framework Assistant' },
    { id: 'lma', icon: FerrisWheel, label: 'LMA Assistant' },
    { id: 'automl', icon: ChartScatter, label: 'AutoML' },
    { id: 'code', icon: Code, label: 'Code Assistant' },
    { id: 'ocr', icon: ScanSearch, label: 'OCR-Mistral' },
  ];

  const getButtonClasses = (itemId: string, alwaysEnabled = false) => {
    const isActive = activeTab === itemId;
    const baseClasses = "flex items-center p-3 rounded-lg transition-all duration-200 mb-2 w-full";
    
    if (isActive) {
      return `${baseClasses} bg-blue-100 text-blue-600`;
    }
    
    if (alwaysEnabled || !user) {
      return `${baseClasses} text-gray-500 hover:bg-gray-100 hover:text-gray-700`;
    }
    
    if (isAuthorized) {
      return `${baseClasses} text-gray-500 hover:bg-gray-100 hover:text-gray-700`;
    }
    
    return `${baseClasses} text-gray-400 hover:bg-red-50 hover:text-red-500`;
  };

  return (
    <div 
      className={`bg-gray-50 border-r border-gray-200 flex flex-col py-4 transition-all duration-300 ease-in-out ${
        isHovered ? 'w-52' : 'w-16'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col px-2">
        {/* Navigation Items */}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={getButtonClasses(item.id, item.alwaysEnabled)}
            >
              <div className="flex items-center min-w-0">
                <Icon size={24} className="flex-shrink-0" />
                <span 
                  className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                    isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}

        {/* Auth Section - Now directly after navigation items */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          {user ? (
            <>
              {/* User Avatar */}
              <div className="flex items-center p-2 rounded-lg mb-2">
                <div className="flex-shrink-0">
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
                </div>
                
                <div 
                  className={`ml-3 min-w-0 transition-all duration-300 ${
                    isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.displayName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.email}
                  </div>
                </div>
              </div>
              
              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="flex items-center p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors w-full"
              >
                <LogOut size={20} className="flex-shrink-0" />
                <span 
                  className={`ml-3 text-sm font-medium transition-all duration-300 ${
                    isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                  }`}
                >
                  Sign Out
                </span>
              </button>
            </>
          ) : (
            /* Sign In Button */
            <button
              onClick={signInWithGoogle}
              className="flex items-center p-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors w-full"
            >
              <LogIn size={20} className="flex-shrink-0" />
              <span 
                className={`ml-3 text-sm font-medium transition-all duration-300 ${
                  isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                }`}
              >
                Sign In
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;