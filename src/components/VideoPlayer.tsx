import React from 'react';
import './VideoPlayer.css'; // Import the CSS file

interface VideoPlayerProps {
  url: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url }) => {
  // Extract the video ID from the YouTube URL
  const videoId = url.split('v=')[1] || url.split('be/')[1];
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <div className="video-player">
      <iframe
        width="100%"
        height="100%"
        src={embedUrl}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default VideoPlayer;