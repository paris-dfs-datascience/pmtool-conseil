// src/hooks/useAuth.ts (Updated with authorization check)
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';
import { isAuthorizedUser } from '../config/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthorized: boolean;
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthorized(user ? isAuthorizedUser(user.email) : false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, isAuthorized };
};