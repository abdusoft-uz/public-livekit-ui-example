import React, { createContext, useContext, useEffect } from 'react';
import { LocalParticipant, ConnectionState } from 'livekit-client';
import { VoiceAssistant } from '@livekit/components-react';
import { useMediaDevices } from '@/hooks/useMediaDevices';
import { useAudioControls } from '@/hooks/useAudioControls';

interface PlaygroundContextType {
  // Media device state
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
  isAudioMuted: boolean;
  
  // Actions
  toggleCamera: () => Promise<void>;
  toggleMicrophone: () => Promise<void>;
  toggleAudio: () => void;
}

const PlaygroundContext = createContext<PlaygroundContextType | undefined>(undefined);

export const PlaygroundProvider: React.FC<{
  children: React.ReactNode;
  localParticipant: LocalParticipant | null;
  voiceAssistant: VoiceAssistant | null;
  roomState: ConnectionState;
}> = ({ children, localParticipant, voiceAssistant, roomState }) => {
  const mediaDevices = useMediaDevices(localParticipant);
  const audioControls = useAudioControls(voiceAssistant);

  // When room state changes to connected, initialize state
  useEffect(() => {
    if (roomState === ConnectionState.Connected && localParticipant) {
      // Ensure camera is disabled by default for privacy
      localParticipant.setCameraEnabled(false);
      
      // Add a small delay to ensure everything is properly initialized
      const timer = setTimeout(() => {
        if (localParticipant && !localParticipant.isMicrophoneEnabled) {
          console.log('Initializing microphone after connection');
          localParticipant.setMicrophoneEnabled(true)
            .catch(err => {
              console.error('Failed to initialize microphone:', err);
            });
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [roomState, localParticipant]);
  
  const value = {
    // Media device state
    isCameraEnabled: mediaDevices.isCameraEnabled,
    isMicEnabled: mediaDevices.isMicEnabled,
    isAudioMuted: audioControls.isAudioMuted,
    
    // Actions
    toggleCamera: mediaDevices.toggleCamera,
    toggleMicrophone: mediaDevices.toggleMicrophone,
    toggleAudio: audioControls.toggleAudio,
  };

  return (
    <PlaygroundContext.Provider value={value}>
      {children}
    </PlaygroundContext.Provider>
  );
};

export const usePlayground = () => {
  const context = useContext(PlaygroundContext);
  if (context === undefined) {
    throw new Error('usePlayground must be used within a PlaygroundProvider');
  }
  return context;
}; 