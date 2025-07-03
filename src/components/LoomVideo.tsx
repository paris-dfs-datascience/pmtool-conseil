import React from 'react';

interface LoomVideoProps {
  videoId: string;
  sid?: string;
  width?: string | number;
  height?: string | number;
}

const LoomVideo: React.FC<LoomVideoProps> = ({ 
  videoId, 
  sid,
  width = "100%",
  height = "500px"
}) => {
  const embedUrl = `https://www.loom.com/embed/${videoId}${sid ? `?sid=${sid}` : ''}`;
  
  return (
    <div style={{
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px 0'
    }}>
      <div style={{
        width: '90%',
        maxWidth: '1200px',
        position: 'relative',
        paddingBottom: '56.25%', // 16:9 aspect ratio
        height: 0,
        overflow: 'hidden'
      }}>
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