import React from 'react';

interface LoomVideoProps {
  videoId: string;
  sid?: string;
  width?: string | number;
  height?: string | number;
  aspectRatio?: 'ultra-wide' | 'wide' | 'standard' | 'compact' | 'fixed';
  maxHeight?: string;
}

const LoomVideo: React.FC<LoomVideoProps> = ({ 
  videoId, 
  sid,
  width = "100%",
  height = "300px",
  aspectRatio = 'wide',
  maxHeight = '70vh' // Limit to 70% of viewport height
}) => {
  const embedUrl = `https://www.loom.com/embed/${videoId}${sid ? `?sid=${sid}` : ''}`;
  
  // Different aspect ratios for better screen fitting
  const getAspectRatio = () => {
    switch (aspectRatio) {
      case 'ultra-wide':
        return '35%'; // ~21:9 aspect ratio
      case 'wide':
        return '42%'; // ~21:10 aspect ratio
      case 'standard':
        return '56.25%'; // 16:9 aspect ratio (original)
      case 'compact':
        return '50%'; // 2:1 aspect ratio
      case 'fixed':
        return 'auto'; // Use fixed height instead
      default:
        return '42%';
    }
  };

  const containerStyle = aspectRatio === 'fixed' 
    ? {
        width: '100%',
        maxWidth: '960px',
        height: height,
        maxHeight: maxHeight,
        position: 'relative' as const
      }
    : {
        width: '100%',
        maxWidth: '960px',
        position: 'relative' as const,
        paddingBottom: getAspectRatio(),
        height: 0,
        overflow: 'hidden' as const,
        maxHeight: maxHeight
      };
  
  return (
    <div style={{
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '5px 0'
    }}>
      <div style={containerStyle}>
        <iframe
          src={embedUrl}
          frameBorder={0}
          allowFullScreen
          allow="autoplay; encrypted-media"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '8px'
          }}
          title="Loom Video"
        />
      </div>
    </div>
  );
};

export default LoomVideo;