import { useState, useEffect, useCallback } from 'react';
import { LocalParticipant, Track } from 'livekit-client';

/**
 * Custom hook to manage camera and microphone state
 */
export function useMediaDevices(localParticipant: LocalParticipant | null) {
  // Track if camera and microphone are enabled - set microphone to true by default
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  
  // Flag to track if we've already attempted to enable the microphone
  const [initialMicEnabledSet, setInitialMicEnabledSet] = useState(false);

  // Monitor for local camera track changes
  useEffect(() => {
    if (!localParticipant) return;

    // Get initial camera state from participant when available
    if (localParticipant.isCameraEnabled !== isCameraEnabled) {
      setIsCameraEnabled(localParticipant.isCameraEnabled);
    }
    
    // Force enable microphone by default (if not already enabled)
    if (!initialMicEnabledSet) {
      // Check if microphone is not already enabled
      if (!localParticipant.isMicrophoneEnabled) {
        console.log('Forcing microphone to be enabled on init');
        localParticipant.setMicrophoneEnabled(true)
          .then(() => {
            setIsMicEnabled(true);
            setInitialMicEnabledSet(true);
          })
          .catch(err => {
            console.error('Failed to enable microphone:', err);
          });
      } else {
        // Microphone is already enabled, just mark as initialized
        setInitialMicEnabledSet(true);
      }
    }
    
    // Set up listeners for track published/unpublished events
    const handleTrackPublished = (track: any) => {
      if (track.source === Track.Source.Camera) {
        setIsCameraEnabled(true);
      }
      if (track.source === Track.Source.Microphone) {
        setIsMicEnabled(true);
      }
    };
    
    const handleTrackUnpublished = (track: any) => {
      if (track.source === Track.Source.Camera) {
        setIsCameraEnabled(false);
      }
      // Don't automatically disable microphone on unpublish
    };
    
    // Also track mute/unmute events
    const handleTrackMuted = (track: any) => {
      if (track.source === Track.Source.Camera) {
        setIsCameraEnabled(false);
      }
      // Don't automatically disable microphone on mute
    };
    
    const handleTrackUnmuted = (track: any) => {
      if (track.source === Track.Source.Camera) {
        setIsCameraEnabled(true);
      }
      if (track.source === Track.Source.Microphone) {
        setIsMicEnabled(true);
      }
    };
    
    // Add event listeners
    localParticipant.on('trackPublished', handleTrackPublished);
    localParticipant.on('trackUnpublished', handleTrackUnpublished);
    localParticipant.on('trackMuted', handleTrackMuted);
    localParticipant.on('trackUnmuted', handleTrackUnmuted);
    
    // Set up a periodic check for camera state only
    const stateCheckInterval = setInterval(() => {
      if (localParticipant.isCameraEnabled !== isCameraEnabled) {
        setIsCameraEnabled(localParticipant.isCameraEnabled);
      }
      
      // Make sure microphone state doesn't get out of sync with our enabled state
      if (isMicEnabled && !localParticipant.isMicrophoneEnabled) {
        localParticipant.setMicrophoneEnabled(true).catch(err => {
          console.error('Failed to re-enable microphone:', err);
        });
      }
    }, 1000);
    
    return () => {
      // Remove event listeners
      localParticipant.off('trackPublished', handleTrackPublished);
      localParticipant.off('trackUnpublished', handleTrackUnpublished);
      localParticipant.off('trackMuted', handleTrackMuted);
      localParticipant.off('trackUnmuted', handleTrackUnmuted);
      
      // Clear interval
      clearInterval(stateCheckInterval);
    };
  }, [localParticipant, isCameraEnabled, isMicEnabled, initialMicEnabledSet]);

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
      console.log(`Microphone ${newState ? 'enabled' : 'disabled'}`);
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