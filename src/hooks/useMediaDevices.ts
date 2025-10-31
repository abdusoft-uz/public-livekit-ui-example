import { useState, useEffect, useCallback } from 'react';
import { LocalParticipant, Track, TrackPublication } from 'livekit-client';

/**
 * Custom hook to manage camera and microphone state
 */
export function useMediaDevices(localParticipant: LocalParticipant | null) {
  // Track if camera and microphone are enabled - microphone starts as disabled until user grants permission
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  
  // Flag to track if we've already attempted to enable the microphone
  const [initialMicEnabledSet, setInitialMicEnabledSet] = useState(false);

  // Monitor for local camera track changes
  useEffect(() => {
    if (!localParticipant) return;

    // Get initial camera state from participant when available
    if (localParticipant.isCameraEnabled !== isCameraEnabled) {
      setIsCameraEnabled(localParticipant.isCameraEnabled);
    }
    
    // Sync microphone state from participant (but don't auto-enable)
    if (localParticipant.isMicrophoneEnabled !== isMicEnabled) {
      setIsMicEnabled(localParticipant.isMicrophoneEnabled);
    }
    
    // Mark as initialized (we don't auto-enable microphone anymore)
    if (!initialMicEnabledSet) {
      setInitialMicEnabledSet(true);
    }
    
    // Set up listeners for track published/unpublished events
    const handleTrackPublished = (track: TrackPublication) => {
      if (track.source === Track.Source.Camera) {
        setIsCameraEnabled(true);
      }
      if (track.source === Track.Source.Microphone) {
        setIsMicEnabled(true);
      }
    };
    
    const handleTrackUnpublished = (track: TrackPublication) => {
      if (track.source === Track.Source.Camera) {
        setIsCameraEnabled(false);
      }
      // Don't automatically disable microphone on unpublish
    };
    
    // Also track mute/unmute events
    const handleTrackMuted = (track: TrackPublication) => {
      if (track.source === Track.Source.Camera) {
        setIsCameraEnabled(false);
      }
      // Don't automatically disable microphone on mute
    };
    
    const handleTrackUnmuted = (track: TrackPublication) => {
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
      // Sync camera state from participant
      setIsCameraEnabled(prev => {
        if (localParticipant.isCameraEnabled !== prev) {
          return localParticipant.isCameraEnabled;
        }
        return prev;
      });
      
      // Sync microphone state from participant (don't force enable)
      setIsMicEnabled(prev => {
        const currentState = localParticipant.isMicrophoneEnabled;
        if (prev !== currentState) {
          return currentState;
        }
        return prev;
      });
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
  }, [localParticipant, initialMicEnabledSet]);

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