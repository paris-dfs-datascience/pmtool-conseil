import React, { useState, useEffect } from 'react';
import { LogIn } from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, analytics } from './firebase';
import GitHubCodeAssistantPage from './pages/GitHubCodeAssistantPage';
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage';
import ConsultingPage from './pages/ConsultingPage';
import LMAPage from './pages/LMAPage';
import AutoMLPage from './pages/AutoMLpage';
import UnauthorizedPage from './components/UnauthorizedPage';
import ClaudePage from './pages/ClaudePage';
import Sidebar from './components/Sidebar';
import { useAuth } from './hooks/useAuth';
import { AuthContext } from './types/auth';
import AuthButton from './components/AuthButton';
import './index.css'; 
import { logEvent } from 'firebase/analytics';
import { useEssentialTracking } from './tracking';
import ScriptRunnerPage from './pages/ScriptRunnerPage';
import SPRtest from './pages/SRPtest';
import LandingPage from './pages/BluePrintLanding';
import GoogleMapsCompetitiveIntel from './bluepeakdemo/map_data';
import DQEMap from './components/dqe-maps/dqe-map'
import LeadsDashboard from './components/LMA_Leads/LMA_Leads';
import FileUploader from './components/ben_upload'
import DQEPasswordGate from './components/dqe-maps/dqepassword';

interface User {
  displayName?: string | null;
  email?: string | null;
  uid: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const { user, loading, isAuthorized } = useAuth();
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  
  // Initialize tracking
  const { trackPageView, trackClick, trackTimeOnPage } = useEssentialTracking();

  // Get Firebase ID token when user changes
  useEffect(() => {
    const getToken = async () => {
      if (user && isAuthorized) {
        setTokenLoading(true);
        try {
          const token = await (user as any).getIdToken();
          setFirebaseToken(token);
          console.log('Firebase ID token obtained');
        } catch (error) {
          console.error('Error getting Firebase ID token:', error);
          setFirebaseToken(null);
        } finally {
          setTokenLoading(false);
        }
      } else {
        setFirebaseToken(null);
      }
    };
    getToken();
  }, [user, isAuthorized]);

  // Enhanced page view tracking combining Firebase Analytics + Google Analytics
  useEffect(() => {
    try {
      // Your existing Firebase Analytics tracking
      logEvent(analytics, 'page_view', {
        page_title: activeTab,
        page_location: window.location.href,
        user_authenticated: !!user,
        user_authorized: isAuthorized
      });
      console.log(`Firebase Analytics: Page view tracked for ${activeTab}`);

      // New Google Analytics tracking via gtag
      trackPageView(`/${activeTab}`, activeTab);
      
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }, [activeTab, user, isAuthorized, trackPageView]);

  // Add URL parameter detection for hidden routes
  useEffect(() => {
    const checkUrlParams = () => {
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const page = urlParams.get('page');
      
      if (page === 'docprocessor') {
        setActiveTab('docprocessor');
        return;
      }
      if (page === 'bpmap') {
        setActiveTab('bpmap');
        return;
      }
      if (page === 'dqemap') {
        setActiveTab('dqemap');
        return;
      }
      if (page === 'lead') {
        setActiveTab('lead');
        return;
      }
      if (page === 'blueprint') {
        setActiveTab('blueprint');
        return;
      }
      if (page === 'ben') {
        setActiveTab('ben');
        return;
      }
      
      // Check hash routing as backup
      const hash = window.location.hash.replace('#', '');
      if (hash === 'docprocessor') {
        setActiveTab('docprocessor');
        return;
      }
      if (hash === 'bpmap') {
        setActiveTab('bpmap');
        return;
      }
      if (hash === 'dqemap') {
        setActiveTab('dqemap');
        return;
      }
      if (hash === 'lead') {
        setActiveTab('lead');
        return;
      }
      if (hash === 'blueprint') {
        setActiveTab('blueprint');
        return;
      }
      if (hash === 'ben') {
        setActiveTab('ben');
        return;
      }
      
      // Check direct path (if you're using something like /docprocessor)
      const path = window.location.pathname.replace('/', '');
      if (path === 'docprocessor') {
        setActiveTab('docprocessor');
        return;
      }
      if (path === 'bpmap') {
        setActiveTab('bpmap');
        return;
      }
      if (path === 'dqemap') {
        setActiveTab('dqemap');
        return;
      }
      if (path === 'lead') {
        setActiveTab('lead');
        return;
      }
      if (path === 'blueprint') {
        setActiveTab('blueprint');
        return;
      }
      if (path === 'ben') {
        setActiveTab('ben');
        return;
      }
    };

    // Check on initial load
    checkUrlParams();

    // Listen for URL changes (back/forward buttons)
    const handlePopState = () => checkUrlParams();
    window.addEventListener('popstate', handlePopState);
    
    // Listen for hash changes
    const handleHashChange = () => checkUrlParams();
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []); // Empty dependency array so it only runs once on mount

  // Refresh token periodically
  useEffect(() => {
    if (user && isAuthorized && firebaseToken) {
      const refreshToken = async () => {
        try {
          const token = await (user as any).getIdToken(true);
          setFirebaseToken(token);
          console.log('Firebase token refreshed');
        } catch (error) {
          console.error('Error refreshing Firebase token:', error);
        }
      };

      const interval = setInterval(refreshToken, 50 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, isAuthorized, firebaseToken]);

  const signInWithGoogle = async () => {
    try {
      // Track sign-in attempt
      trackClick('Sign In with Google', 'auth_button', {
        location: 'header',
        auth_method: 'google'
      });
      
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      // Track sign-out
      trackClick('Sign Out', 'auth_button', {
        location: 'header',
        time_spent_total: trackTimeOnPage()
      });
      
      await signOut(auth);
      setFirebaseToken(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAuthRequired = () => {
    console.log('Authentication required');
    if (!user) {
      signInWithGoogle();
    }
  };

  // Enhanced tab change with tracking (now handled in Sidebar, but keep for direct calls)
  const handleTabChange = (tabName: string) => {
    // Track navigation clicks (for cases where setActiveTab is called directly)
    trackClick(`Direct Navigation - ${tabName}`, 'nav_direct', {
      from_tab: activeTab,
      to_tab: tabName,
      user_authenticated: !!user,
      user_authorized: isAuthorized
    });
    
    setActiveTab(tabName);
  };

  const authContext: AuthContext = {
    firebaseToken,
    firebaseUser: user,
    onSignOut: handleSignOut,
    onAuthRequired: handleAuthRequired
  };

  if (loading || tokenLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const renderLMAPreviewPage = () => {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🎡 LMA Knowledge Assistant
          </h1>
          <p className="text-gray-600 mb-6">
            AI-powered knowledge base with RAG technology for instant access to LMA policies, procedures, and consulting resources.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              🤖 AI Apps for LMA Consultants
            </h3>
            <p className="text-blue-700 text-sm">
              This is a private AI-powered application suite designed specifically for LMA consultants.
              Access requires authorization from the administrator.
            </p>
          </div>
          <button
            onClick={() => {
              trackClick('LMA Preview - Sign In', 'cta_button', {
                location: 'lma_preview',
                page: 'lma'
              });
              signInWithGoogle();
            }}
            className="flex items-center justify-center space-x-2 mx-auto px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <LogIn size={16} />
            <span>Sign in to Access</span>
          </button>
        </div>
      </div>
    );
  };

  const renderAutoMLPreviewPage = () => {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Auto ML
          </h1>
          <p className="text-gray-600 mb-6">
            AI and ML solutions for Exploratory Data Analysis (EDA).
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              🤖 AI Apps for LMA Consultants
            </h3>
            <p className="text-blue-700 text-sm">
              This is a private AI-powered application suite designed specifically for LMA consultants.
              Access requires authorization from the administrator.
            </p>
          </div>
          <button
            onClick={() => {
              trackClick('AutoML Preview - Sign In', 'cta_button', {
                location: 'automl_preview',
                page: 'automl'
              });
              signInWithGoogle();
            }}
            className="flex items-center justify-center space-x-2 mx-auto px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <LogIn size={16} />
            <span>Sign in to Access</span>
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage user={user || undefined} isAuthorized={isAuthorized} />;
      case 'lma':
        if (!user || !isAuthorized) {
          return renderLMAPreviewPage();
        }
        return <LMAPage authContext={authContext} />;
      case 'chat':
        return <ChatPage authContext={authContext} />;
      case 'claude':
        return <ClaudePage authContext={authContext} />;
      case 'framework':
        return <ConsultingPage authContext={authContext} />;
      case 'code':
        return <GitHubCodeAssistantPage authContext={authContext} />;
      case 'automl':
        if (!user || !isAuthorized) {
          return renderAutoMLPreviewPage();
        }
        return <AutoMLPage />;
      case 'docprocessor':
        return <ScriptRunnerPage />;
      case 'bpmap':
        return <GoogleMapsCompetitiveIntel />;
      case 'dqemap':
        return (
          <DQEPasswordGate>
            <DQEMap />
          </DQEPasswordGate>
        );
      case 'lead':
        return <LeadsDashboard />;
      case 'ben':
        return <FileUploader />;
      case 'blueprint':
        return <LandingPage />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl text-gray-500">Select a page</h1>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center space-x-3">
            <img
              src="/images/logo.png"
              alt="Le Marais Advisory Logo"
              className="w-8 h-8 rounded-lg"
              onClick={() => {
                trackClick('Logo Click', 'logo', { location: 'header' });
                handleTabChange('home');
              }}
              style={{ cursor: 'pointer' }}
            />
            <h1 
              className="text-xl font-semibold text-gray-800 cursor-pointer" 
              style={{ fontFamily: 'Crimson Text, serif' }}
              onClick={() => {
                trackClick('Company Name Click', 'brand_text', { location: 'header' });
                handleTabChange('home');
              }}
            >
              Le Marais Advisory
            </h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <AuthButton user={user} />
          {firebaseToken && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              🔐 Authenticated
            </span>
          )}
        </div>
      </header>
      <div className="flex flex-1">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          isAuthorized={isAuthorized}
        />
        <div className="flex-1 bg-white">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;