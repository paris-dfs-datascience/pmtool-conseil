// Main tracking exports
export { useEssentialTracking } from './useEssentialTracking';
export { withPageTracking, ClickTracker, RouteTracker } from './components';

// Hook for React Router integration
export const useRouteTracking = () => {
  const { useEssentialTracking } = require('./useEssentialTracking');
  const { trackPageView } = useEssentialTracking();

  const handleRouteChange = (newPath: string, newTitle?: string) => {
    trackPageView(newPath, newTitle);
  };

  return { handleRouteChange };
};