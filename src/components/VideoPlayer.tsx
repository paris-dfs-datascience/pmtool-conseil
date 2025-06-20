import React from 'react';
import ReactPlayer from 'react-player';

interface VideoPlayerProps {
  url: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url }) => {
  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: '80%', height: '80%' }}>
        <ReactPlayer url={url} controls={true} width="100%" height="100%" />
      </div>
    </div>
  );
};

export default VideoPlayer;