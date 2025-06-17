// src/pages/HomePage.tsx
import React from 'react';

// Define the User type to match your App.tsx
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
    <div className="h-full relative">
      <img
        src="/images/hero_ai.png"
        alt="Hero"
        className="w-full h-full object-cover"
      />
      {/* Optional: You can add conditional content based on user/isAuthorized here */}
      {/* 
      {user && (
        <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 p-2 rounded">
          Welcome back, {user.displayName || 'User'}!
        </div>
      )}
      */}
    </div>
  );
};

export default HomePage;