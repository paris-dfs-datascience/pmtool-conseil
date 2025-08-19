import React from 'react';
import HeroSection from '../components/HomePageComponents/HeroSection';
import ConseilSection from '../components/HomePageComponents/ConseilSection';
import ConsultingSection from '../components/HomePageComponents/ConsultingSection';
import LoomVideo from '../components/LoomVideo'; // Updated import
import InteractiveLMADiagram from '../components/HomePageComponents/ConseilInteractiveDiagram';
import DemoSignup from '../components/HomePageComponents/demo';
import Bio from '../components/HomePageComponents/bio';
import ConsultingOverview from '../components/HomePageComponents/summary';

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
  return (
    <div>
      <HeroSection user={user} />
      <div className="h-12"></div> {/* Adds 3rem (48px) of space */}
      <div className="h-12"></div> {/* Adds 3rem (48px) of space */}
      <ConseilSection />
      <div className="h-12"></div> {/* Adds 3rem (48px) of space */}
      <LoomVideo 
        videoId="861f3ab8f7be41b592900fb0487f5746"
        sid="eed6c455-c340-4152-855c-c595cd3d2294"
      />
      <div className="h-12"></div> {/* Adds 3rem (48px) of space */}
      <InteractiveLMADiagram />
      <div className="h-12"></div> {/* Adds 3rem (48px) of space */}
      <div className="flex">
        <div className="w-1/2 p-4">
          <DemoSignup />
        </div>
        <div className="w-1/2 p-4">
          <Bio />
        </div>
      </div>
      <div className="h-12"></div> {/* Adds 3rem (48px) of space */}
      <ConsultingOverview />
    </div>
  );
};

export default HomePage;