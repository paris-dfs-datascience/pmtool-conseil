// src/components/ConsultingChat/hooks/useApiStatus.ts
import { useCallback } from 'react';

interface ApiResult {
  connected: boolean;
  error?: string;
}

export const useApiStatus = () => {
  const API_BASE = process.env.REACT_APP_BACKEND_API || 'https://lma-chat-api-443545551926.us-central1.run.app';
  const statusEndpoint = `${API_BASE}/health`;
  const authStatusEndpoint = `${API_BASE}/auth/status`;

  const checkApiStatus = useCallback(async (): Promise<ApiResult> => {
    try {
      console.log('Checking API status at:', statusEndpoint);
      const response = await fetch(statusEndpoint);
      if (response.ok) {
        const data = await response.json();
        console.log('API Status Response:', data);
        return {
          connected: data.status === 'healthy',
          error: data.status !== 'healthy' ? data.error : undefined
        };
      } else {
        console.error('API Status Error:', response.status, response.statusText);
        return {
          connected: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('API Connection Error:', error);
      return {
        connected: false,
        error: 'Cannot connect to server'
      };
    }
  }, [statusEndpoint]);

  const checkAuthRequired = useCallback(async (): Promise<boolean> => {
    try {
      console.log('Checking auth requirement at:', authStatusEndpoint);
      const response = await fetch(authStatusEndpoint);
      if (response.ok) {
        const data = await response.json();
        console.log('Auth Status Response:', data);
        return data.authentication_enabled || false;
      } else {
        console.warn('Could not check auth status:', response.status, response.statusText);
        return false; // Default to not requiring auth if we can't check
      }
    } catch (error) {
      console.warn('Auth status check failed:', error);
      return false; // Default to not requiring auth if we can't check
    }
  }, [authStatusEndpoint]);

  return {
    checkApiStatus,
    checkAuthRequired
  };
};