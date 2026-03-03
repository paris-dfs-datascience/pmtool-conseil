import React, { useEffect } from 'react';
import HeroSection from '../components/HomePageComponents/HeroSection';
import ConseilSection from '../components/HomePageComponents/ConseilSection';
import ConsultingSection from '../components/HomePageComponents/ConsultingSection';
import LoomVideo from '../components/LoomVideo';
import InteractiveLMADiagram from '../components/HomePageComponents/ConseilInteractiveDiagram';
import DemoSignup from '../components/HomePageComponents/demo';
import Bio from '../components/HomePageComponents/bio';
import ConsultingOverview from '../components/HomePageComponents/summary';
import PEConsulting from '../components/HomePageComponents/PEConsulting';
import { useEssentialTracking } from '../tracking'; // Import tracking

interface User {
  displayName?: string | null;
  email?: string | null;
  uid: string;
}

interface HomePageProps {
  user?: User;
  isAuthorized: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ user, isAuthorized }) => {
  const { trackClick, trackPageView } = useEssentialTracking();

  // Track homepage sections engagement
  useEffect(() => {
    // Track homepage load with user context
    trackClick('Homepage - Loaded', 'page_load', {
      user_authenticated: !!user,
      user_authorized: isAuthorized,
      sections_loaded: [
        'hero',
        'conseil',
        'video',
        'interactive_diagram',
        'demo_form',
        'bio',
        'consulting_overview'
      ]
    });
  }, [user, isAuthorized, trackClick]);

  // Function to track section visibility (intersection observer)
  useEffect(() => {
    const observerOptions = {
      threshold: 0.5, // Trigger when 50% of section is visible
      rootMargin: '0px 0px -100px 0px' // Only count as viewed if well in viewport
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionName = entry.target.getAttribute('data-section');
          if (sectionName) {
            trackClick(`Homepage Section - ${sectionName} Viewed`, 'section_view', {
              section: sectionName,
              user_authenticated: !!user,
              scroll_position: Math.round((window.pageYOffset / document.documentElement.scrollHeight) * 100)
            });
          }
        }
      });
    }, observerOptions);

    // Observe all sections
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach((section) => sectionObserver.observe(section));

    return () => {
      sections.forEach((section) => sectionObserver.unobserve(section));
    };
  }, [trackClick, user]);

  return (
    <div>
      {/* Hero Section with tracking */}
      <div data-section="hero">
        <HeroSection user={user} />
      </div>

      <div className="h-12"></div>
       <div data-section="consulting_section">
        <ConsultingSection />
      </div>

      
      {/* Video Section with tracking */}
      <div data-section="video">
        <LoomVideo 
          videoId="e274be04259b42ef8452371eb0855f44"
          sid="5037f673-4432-46a1-a736-7edf71ca9053"
        />
      </div>

      <div className="h-12"></div>
       <div data-section="consulting_section">
        <PEConsulting />
      </div>

      <div className="h-12"></div>
       {/* Consulting Overview with tracking */}
      <div data-section="consulting_overview">
        <ConsultingOverview />
      </div>
      
      <div className="h-12"></div>
      
      <div className="h-12"></div>
      
      {/* Demo Form and Bio Section */}
      <div className="flex" data-section="demo_and_bio">
        <div className="w-1/2 p-4">
          <DemoSignup />
        </div>
        <div className="w-1/2 p-4">
          <Bio />
        </div>
      </div>

      <div className="h-12"></div>
      <div className="h-12"></div>

      {/* Conseil Section with tracking */}
      <div data-section="conseil">
        <ConseilSection />
      </div>
    
      
      <div className="h-12"></div>
      <div className="h-12"></div>

      {/* Video Section with tracking */}
      <div data-section="video">
        <LoomVideo 
          videoId="861f3ab8f7be41b592900fb0487f5746"
          sid="eed6c455-c340-4152-855c-c595cd3d2294"
        />

        <div className="h-12"></div>
      {/* Interactive Diagram with tracking */}
      <div data-section="interactive_diagram">
        <InteractiveLMADiagram />
      </div>
      </div>

      <div className="h-12"></div>

    </div>
    
  );
};

export default HomePage;