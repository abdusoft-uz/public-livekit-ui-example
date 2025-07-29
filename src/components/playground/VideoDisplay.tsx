import React from 'react';
import { VideoTrack } from '@livekit/components-react';

interface VideoDisplayProps {
  agentVideoTrack?: any;
  localVideoTrack?: any;
  isCameraEnabled: boolean;
  roomState: any;
  videoFit: string;
}

export const VideoDisplay = ({
  agentVideoTrack,
  localVideoTrack,
  isCameraEnabled,
  videoFit = 'cover',
}: VideoDisplayProps) => {
  
  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Agent video */}
      {agentVideoTrack && (
        <div className="absolute inset-0">
          <VideoTrack
            trackRef={agentVideoTrack}
            className={`w-full h-full object-${videoFit}`}
          />
        </div>
      )}
      
      {/* Local user video */}
      {localVideoTrack && isCameraEnabled && (
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
          <VideoTrack
            trackRef={localVideoTrack}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}; 