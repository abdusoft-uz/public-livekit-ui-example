import { useState, useEffect, useCallback } from 'react';
import { LocalParticipant } from 'livekit-client';
import { debug } from "@/utils/logger";

/**
 * Custom hook to manage camera and microphone state
 */
export function useMediaDevices(localParticipant: LocalParticipant | null) {
  // Track if camera and microphone are enabled - microphone starts as disabled until user grants permission
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  
  // Mirror the participant's camera/microphone state into React state
  useEffect(() => {
    if (!localParticipant) return;

    const sync = () => {
      setIsCameraEnabled(localParticipant.isCameraEnabled);
      setIsMicEnabled(localParticipant.isMicrophoneEnabled);
    };
    sync();

    // Local publish/unpublish and mute/unmute events replace the old 1s polling interval
    const events = ['localTrackPublished', 'localTrackUnpublished', 'trackMuted', 'trackUnmuted'] as const;
    events.forEach((e) => localParticipant.on(e, sync));

    return () => {
      events.forEach((e) => localParticipant.off(e, sync));
    };
  }, [localParticipant]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    if (!localParticipant) return;
    
    // Toggle camera state immediately in the UI
    const newState = !isCameraEnabled;
    setIsCameraEnabled(newState);
    
    // Apply the change to the participant
    await localParticipant.setCameraEnabled(newState);
  }, [localParticipant, isCameraEnabled]);

  // Toggle microphone
  const toggleMicrophone = useCallback(async () => {
    if (!localParticipant) return;
    
    // Toggle based on our current state, not participant's
    const newState = !isMicEnabled;
    
    // Update UI immediately for responsive feel
    setIsMicEnabled(newState);
    
    try {
      // Update actual microphone state
      await localParticipant.setMicrophoneEnabled(newState);
      debug(`Microphone ${newState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      // If there was an error, revert UI state
      console.error("Error toggling microphone:", error);
      setIsMicEnabled(!newState);
    }
  }, [localParticipant, isMicEnabled]);

  return {
    isCameraEnabled,
    isMicEnabled,
    setIsCameraEnabled,
    setIsMicEnabled,
    toggleCamera,
    toggleMicrophone
  };
} 