// src/components/ConsultingChat/hooks/useAuth.ts
import { useState, useCallback } from 'react';

interface AuthStatus {
  verified: boolean;
  error?: string;
}

export const useAuth = (firebaseToken?: string | null) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ verified: false });

  const API_BASE = process.env.REACT_APP_BACKEND_API || 'https://lma-chat-api-443545551926.us-central1.run.app';
  const authVerifyEndpoint = `${API_BASE}/auth/verify`;

  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (firebaseToken) {
      headers['Authorization'] = `Bearer ${firebaseToken}`;
    }
    
    return headers;
  }, [firebaseToken]);

  const verifyToken = useCallback(async () => {
    if (!firebaseToken) {
      setAuthStatus({ verified: false, error: 'No token provided' });
      return;
    }

    try {
      const response = await fetch(authVerifyEndpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setAuthStatus({ verified: true });
        console.log('Token verified successfully:', data.user);
      } else {
        const errorData = await response.json();
        setAuthStatus({ 
          verified: false, 
          error: errorData.error || 'Token verification failed' 
        });
      }
    } catch (error) {
      setAuthStatus({ 
        verified: false, 
        error: 'Token verification failed' 
      });
    }
  }, [firebaseToken, authVerifyEndpoint, getAuthHeaders]);

  return {
    authStatus,
    verifyToken,
    getAuthHeaders
  };
};