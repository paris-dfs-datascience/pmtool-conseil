import React from 'react';
import HeroSection from '../components/HomePageComponents/HeroSection';
import ConseilSection from '../components/HomePageComponents/ConseilSection';
import VideoPlayer from '../components/VideoPlayer';
import InteractiveLMADiagram from '../components/HomePageComponents/ConseilInteractiveDiagram';
import DemoSignup from '../components/HomePageComponents/demo';
import Bio from '../components/HomePageComponents/bio';

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
  const youtubeUrl = 'https://youtu.be/Yi9sYqIrLNk'; // Example URL
  return (
    
    <div>
      <HeroSection user={user} />
      <div className="h-12"></div> {/* Adds 3rem (48px) of space */}
      <ConseilSection />
      <div className="h-12"></div> {/* Adds 3rem (48px) of space */}
      <VideoPlayer url={youtubeUrl} />    
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
      </div>
  );
};

export default HomePage;