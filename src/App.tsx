import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import GitHubCodeAssistantPage from './pages/GitHubCodeAssistantPage';
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage';
import ConsultingChat from './components/ConsultingFrameworks/ConsultingChat';
import LMAPage from './pages/LMAPage';
import GraphitePage from './pages/GraphitePage';
import CatalantPage from './pages/CatalantPage';
import UnauthorizedPage from './components/UnauthorizedPage';
import ClaudeInterface from './components/GeneralChats/ClaudeChat';
import Sidebar from './components/Sidebar';
import { useAuth } from './hooks/useAuth';
import './index.css'; // Import the Tailwind CSS file

interface User {
  displayName?: string | null;
  email?: string | null;
  uid: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const { user, loading, isAuthorized } = useAuth();

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const renderPreviewPage = (title: string, description: string) => {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            {title}
          </h1>
          <p className="text-gray-600 mb-6">
            {description}
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
    if (activeTab === 'home') {
      return <HomePage user={user || undefined} isAuthorized={isAuthorized} />;
    }

    if (!user) {
      switch (activeTab) {
        case 'chat':
          return renderPreviewPage(
            '💬 AI Chat Assistant',
            'Intelligent conversational AI powered by Google Gemini for LMA consulting workflows.'
          );
          case 'claude':
          return renderPreviewPage(
            'Claude Chat',
            'Intelligent conversational AI powered by Athropic Claude for LMA consulting workflows.'
          );
        case 'lma':
          return renderPreviewPage(
            '🎡 LMA Knowledge Assistant',
            'AI-powered knowledge base with RAG technology for instant access to LMA policies, procedures, and consulting resources.'
          );
        case 'graphite':
          return renderPreviewPage(
            '✏️ Graphite Integration',
            'Streamlined project management and collaboration tools for consulting projects.'
          );
        case 'catalant':
          return renderPreviewPage(
            '💼 Catalant Workspace',
            'Professional consulting platform integration for enhanced productivity.'
          );
        case 'code':
          return renderPreviewPage(
            '⚡ Code Assistant',
            'AI-powered coding companion for technical consulting and development projects.'
          );
        default:
          return renderPreviewPage('🔒 Protected Area', 'This section requires authentication.');
      }
    }

    if (!isAuthorized) {
      return <UnauthorizedPage userEmail={user.email || undefined} />;
    }

    switch (activeTab) {
      case 'chat':
        return <ChatPage />;
      case 'claude':
        return <ClaudeInterface />;
      case 'framework':
        return <ConsultingChat />;
      case 'lma':
        return <LMAPage />;
      case 'graphite':
        return <GraphitePage />;
      case 'catalant':
        return <CatalantPage />;
      case 'code':
        return <GitHubCodeAssistantPage />;
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
            <span className="text-sm text-gray-600">
              Welcome, {user.displayName || 'User'}
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