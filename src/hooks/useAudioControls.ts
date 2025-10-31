import { useState, useCallback } from 'react';
import { VoiceAssistant } from '@livekit/components-react';

/**
 * Custom hook to manage audio controls (muting/unmuting audio output only)
 * This controls the audio playback volume, not the microphone input
 */
export function useAudioControls(
  voiceAssistant: VoiceAssistant | null
) {
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  
  // Function to toggle audio muting (output only - controls what you hear)
  const toggleAudio = useCallback(() => {
    const newMuteState = !isAudioMuted;
    setIsAudioMuted(newMuteState);
    
    try {
      // Set all audio elements to muted state (output)
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.muted = newMuteState;
      });
      
      // If we have the voice assistant's audio track, control that too
      if (
        voiceAssistant && 
        voiceAssistant.audioTrack && 
        voiceAssistant.audioTrack.track
      ) {
        // Some tracks have a mute() method
        if (
          typeof voiceAssistant.audioTrack.track.mute === 'function' && 
          typeof voiceAssistant.audioTrack.track.unmute === 'function'
        ) {
          if (newMuteState) {
            voiceAssistant.audioTrack.track.mute();
          } else {
            voiceAssistant.audioTrack.track.unmute();
          }
        }
      }
      
      console.log(`Audio output ${newMuteState ? 'muted' : 'unmuted'}`);
    } catch (error) {
      console.error('Error toggling audio state:', error);
      // Revert state if there was an error
      setIsAudioMuted(!newMuteState);
    }
  }, [isAudioMuted, voiceAssistant]);
  
  return { isAudioMuted, toggleAudio };
} 