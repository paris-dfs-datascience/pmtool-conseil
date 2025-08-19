import React from 'react';
import { useEssentialTracking } from '../../tracking';

interface HeroSectionProps {
  user?: {
    displayName?: string | null;
    email?: string | null;
    uid: string;
  };
}

const HeroSection: React.FC<HeroSectionProps> = ({ user }) => {
  const { trackClick } = useEssentialTracking();

  const handlePrimaryCTA = () => {
    trackClick('Hero - Schedule Assessment CTA', 'cta_button', {
      location: 'hero_primary',
      button_text: 'Schedule Your AI Assessment',
      user_authenticated: !!user,
      cta_position: 'hero_overlay'
    });
    
    // Scroll to demo form
    const demoSection = document.querySelector('[data-section="demo_and_bio"]');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSecondaryCTA = () => {
    trackClick('Hero - Learn More CTA', 'cta_button', {
      location: 'hero_secondary',
      button_text: 'Learn More',
      user_authenticated: !!user,
      cta_position: 'hero_overlay'
    });
    
    // Scroll to next section
    const conseilSection = document.querySelector('[data-section="conseil"]');
    if (conseilSection) {
      conseilSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleWelcomeClick = () => {
    if (user) {
      trackClick('Hero - Welcome Message Click', 'welcome_interaction', {
        user_name: user.displayName,
        user_email: user.email,
        location: 'hero_welcome'
      });
    }
  };

  return (
    <div className="h-screen relative">
      {/* Hero Image */}
      <img
        src="/images/hero_ai.png"
        alt="AI Advisory Services Hero"
        className="w-full h-full object-cover"
      />
      
      {/* CTA Buttons Overlay */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handlePrimaryCTA}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-xl"
          >
            Schedule Your AI Assessment
          </button>
          <button
            onClick={handleSecondaryCTA}
            className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-gray-900 transition-all transform hover:scale-105"
          >
            Learn More About Our Services
          </button>
        </div>
      </div>

      {/* Welcome Message (if user is logged in) */}
      {user && (
        <div 
          className="absolute bottom-6 left-6 bg-black bg-opacity-70 backdrop-blur-sm text-white p-4 rounded-lg cursor-pointer hover:bg-opacity-80 transition-all"
          onClick={handleWelcomeClick}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {user.displayName?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <p className="font-semibold">Welcome back, {user.displayName || 'User'}!</p>
              <p className="text-sm text-gray-300">Ready to explore AI solutions?</p>
            </div>
          </div>
        </div>
      )}

      {/* Scroll Indicator */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div 
          className="animate-bounce cursor-pointer"
          onClick={() => {
            trackClick('Hero - Scroll Indicator', 'navigation_hint', {
              location: 'hero_bottom'
            });
            const conseilSection = document.querySelector('[data-section="conseil"]');
            if (conseilSection) {
              conseilSection.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          <svg 
            className="w-6 h-6 text-white opacity-75 hover:opacity-100 transition-opacity" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;