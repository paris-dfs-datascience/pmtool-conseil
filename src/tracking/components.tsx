import React, { useEffect } from 'react';
import { useEssentialTracking } from './useEssentialTracking';

// Higher-order component to automatically track page views
export const withPageTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const { trackPageView } = useEssentialTracking();

    useEffect(() => {
      trackPageView();
    }, [trackPageView]);

    return <WrappedComponent {...props} />;
  };
};

// Click tracking component wrapper
interface ClickTrackingProps {
  trackingName: string;
  elementType?: string;
  additionalData?: any;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const ClickTracker: React.FC<ClickTrackingProps> = ({
  trackingName,
  elementType = 'button',
  additionalData,
  children,
  className,
  onClick
}) => {
  const { trackClick } = useEssentialTracking();

  const handleClick = () => {
    trackClick(trackingName, elementType, additionalData);
    if (onClick) onClick();
  };

  return (
    <div className={className} onClick={handleClick}>
      {children}
    </div>
  );
};

// For React Router integration
export const RouteTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { trackPageView } = useEssentialTracking();

  useEffect(() => {
    trackPageView();
  }, [window.location.pathname]); // Track on route changes

  return <>{children}</>;
};