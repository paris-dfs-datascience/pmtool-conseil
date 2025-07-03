import React, { useState, useEffect } from 'react';
import { LogIn } from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import GitHubCodeAssistantPage from './pages/GitHubCodeAssistantPage';
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage';
import ConsultingPage from './pages/ConsultingPage';
import LMAPage from './pages/LMAPage';
import OCRToolPage from './pages/OCRPage';
import UnauthorizedPage from './components/UnauthorizedPage';
import ClaudePage from './pages/ClaudePage';
import MOEChatPage from './pages/MOEChatPage';
import Sidebar from './components/Sidebar';
import { useAuth } from './hooks/useAuth';
import { AuthContext } from './types/auth';
import './index.css'; // Import the Tailwind CSS file

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

  // Get Firebase ID token when user changes
  useEffect(() => {
    const getToken = async () => {
      if (user && isAuthorized) {
        setTokenLoading(true);
        try {
          // Get the Firebase ID token (this is what your backend needs)
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

  // Refresh token periodically (Firebase tokens expire after 1 hour)
  useEffect(() => {
    if (user && isAuthorized && firebaseToken) {
      const refreshToken = async () => {
        try {
          const token = await (user as any).getIdToken(true); // Force refresh
          setFirebaseToken(token);
          console.log('Firebase token refreshed');
        } catch (error) {
          console.error('Error refreshing Firebase token:', error);
        }
      };

      // Refresh token every 50 minutes (before 1-hour expiry)
      const interval = setInterval(refreshToken, 50 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, isAuthorized, firebaseToken]);

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
      setFirebaseToken(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAuthRequired = () => {
    // This gets called if a chat component detects auth is needed
    console.log('Authentication required');
    if (!user) {
      signInWithGoogle();
    }
  };

  // Create auth context object to pass to chat components
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
            onClick={signInWithGoogle}
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
    // Always allow access to pages for demo purposes except LMA
    // Authentication is handled at the API level
    switch (activeTab) {
      case 'home':
        return <HomePage user={user || undefined} isAuthorized={isAuthorized} />;
      case 'lma':
        // LMA requires authentication - show preview if not authenticated
        if (!user || !isAuthorized) {
          return renderLMAPreviewPage();
        }
        return <LMAPage authContext={authContext} />;
      case 'chat':
        return <ChatPage authContext={authContext} />;
      case 'claude':
        return <ClaudePage authContext={authContext} />;
      case 'moechat':
        return <MOEChatPage authContext={authContext} />;
      case 'framework':
        return <ConsultingPage authContext={authContext} />;
      case 'code':
        return <GitHubCodeAssistantPage authContext={authContext} />;
      case 'ocr':
        return <OCRToolPage authContext={authContext} />;
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
            />
            <h1 className="text-xl font-semibold text-gray-800" style={{ fontFamily: 'Crimson Text, serif' }}>
              Le Marais Advisory
            </h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <>
              <span className="text-sm text-gray-600">
                Welcome, {user.displayName || 'User'}
              </span>
              {/* Show token status for debugging */}
              {firebaseToken && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  🔐 Authenticated
                </span>
              )}
            </>
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