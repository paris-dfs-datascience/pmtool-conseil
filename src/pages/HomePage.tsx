import React from 'react';
import HeroSection from '../components/HeroSection';
import ConseilSection from '../components/ConseilSection';

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
      <ConseilSection />
    </div>
  );
};

export default HomePage;