import React from 'react';

interface HeroSectionProps {
  user?: {
    displayName?: string | null;
    email?: string | null;
    uid: string;
  };
}

const HeroSection: React.FC<HeroSectionProps> = ({ user }) => {
  return (
    <div className="h-full relative">
      <img
        src="/images/hero_ai.png"
        alt="Hero"
        className="w-full h-full object-cover"
      />
      {user && (
        <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 p-2 rounded">
          Welcome back, {user.displayName || 'User'}!
        </div>
      )}
    </div>
  );
};

export default HeroSection;