// src/components/Sidebar.tsx
import React, { useState, useRef } from 'react';
import { Home, MessageCircle, FerrisWheel, PenTool, Briefcase, Bug, LogIn, Map, LogOut, User, Code, Brain, LayoutList, ScanSearch, ChartScatter, Beaker} from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useEssentialTracking } from '../tracking'; // Import tracking

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  isAuthorized: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, isAuthorized }) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize tracking
  const { trackClick, trackTimeOnPage } = useEssentialTracking();

  const signInWithGoogle = async () => {
    try {
      // Track sign-in attempt from sidebar
      trackClick('Sidebar - Sign In with Google', 'auth_button', {
        location: 'sidebar',
        auth_method: 'google'
      });
      
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      // Track sign-out with session time
      trackClick('Sidebar - Sign Out', 'auth_button', {
        location: 'sidebar',
        session_duration: trackTimeOnPage()
      });
      
      await signOut(auth);
      setActiveTab('home'); // Redirect to home after sign out
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Enhanced navigation handler with tracking
  const handleNavClick = (itemId: string, itemLabel: string, alwaysEnabled: boolean = false) => {
    // Track navigation click
    trackClick(`Sidebar Navigation - ${itemLabel}`, 'nav_item', {
      tab_id: itemId,
      tab_label: itemLabel,
      from_tab: activeTab,
      user_authenticated: !!user,
      user_authorized: isAuthorized,
      always_enabled: alwaysEnabled,
      sidebar_expanded: isHovered
    });

    // Check if user needs authentication for protected pages
    if (!alwaysEnabled && !user && itemId !== 'home') {
      trackClick(`Sidebar - Auth Required for ${itemLabel}`, 'auth_required', {
        attempted_page: itemId,
        location: 'sidebar'
      });
    }

    setActiveTab(itemId);
  };

  const handleMouseEnter = () => {
    // Track sidebar hover intent
    trackClick('Sidebar - Hover Intent', 'ui_interaction', {
      action: 'mouse_enter',
      current_tab: activeTab
    });

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set a new timeout for 1 seconds
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
      
      // Track sidebar expansion
      trackClick('Sidebar - Expanded', 'ui_interaction', {
        action: 'expand',
        current_tab: activeTab,
        user_authenticated: !!user
      });
    }, 1000);
  };

  const handleMouseLeave = () => {
    // Clear the timeout if mouse leaves before 1 second
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Track sidebar collapse if it was expanded
    if (isHovered) {
      trackClick('Sidebar - Collapsed', 'ui_interaction', {
        action: 'collapse',
        current_tab: activeTab
      });
    }
    
    // Immediately close the sidebar
    setIsHovered(false);
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', alwaysEnabled: true },
    { id: 'blueprint', icon: Map, label: '2-Week BluePrint', alwaysEnabled: true },
    { id: 'chat', icon: MessageCircle, label: 'Gemini AI Chat' },
    { id: 'claude', icon: Brain, label: 'Claude AI' },
    { id: 'framework', icon: LayoutList, label: 'Framework Assistant' },
    { id: 'lma', icon: FerrisWheel, label: 'LMA Assistant' },
    { id: 'automl', icon: ChartScatter, label: 'AutoML' },
    { id: 'code', icon: Code, label: 'Code Assistant' },
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex flex-col px-2">
        {/* Navigation Items */}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id, item.label, item.alwaysEnabled)}
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
              {/* User Avatar - Track profile clicks */}
              <div 
                className="flex items-center p-2 rounded-lg mb-2 cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  trackClick('Sidebar - Profile Click', 'profile_interaction', {
                    user_name: user.displayName,
                    user_email: user.email,
                    location: 'sidebar'
                  });
                }}
              >
                <div className="flex-shrink-0">
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