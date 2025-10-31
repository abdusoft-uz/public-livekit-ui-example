"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { PlaygroundProvider, usePlayground } from '@/contexts/PlaygroundContext';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { 
  useLocalParticipant, 
  useConnectionState, 
  useVoiceAssistant, 
  useParticipants,
  useRoomContext
} from '@livekit/components-react';
import { ConnectionState, RemoteParticipant, TrackPublication } from 'livekit-client';
import { startAgentWorker } from '@/utils/livekitJobClient';

/**
 * Props for the Playground component
 */
export interface PlaygroundProps {
  /** Auto-connect when component loads */
  autoConnect?: boolean;
  /** Callback when connect/disconnect is clicked */
  onConnect: (connect: boolean) => void;
}

/**
 * Loading screen component with progress bar and particle effects
 */
const LoadingScreen = ({ progress }: { progress: number }) => {
  return (
    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Particle effects background */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      
      {/* Progress bar */}
      <div className="w-96 h-1 bg-gray-900 rounded-full overflow-hidden relative z-10">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 transition-all duration-1000 ease-out shadow-lg"
          style={{ width: `${progress}%` }}
        />
        {/* Glowing effect */}
        <div 
          className="absolute top-0 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-1000 ease-out"
          style={{ 
            width: '20%',
            left: `${Math.max(0, progress - 10)}%`,
            opacity: progress > 0 ? 1 : 0
          }}
        />
      </div>
    </div>
  );
};

/**
 * Remote Icon Component (for remote control)
 */
const RemoteIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {!enabled && <line x1="1" y1="1" x2="23" y2="23"/>}
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <line x1="12" y1="7" x2="12" y2="21"/>
    <circle cx="12" cy="14" r="2"/>
  </svg>
);

/**
 * Microphone Icon Component
 */
const MicrophoneIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {!enabled && <line x1="1" y1="1" x2="23" y2="23"/>}
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

/**
 * Audio/Speaker Icon Component
 */
const AudioIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {!enabled && <line x1="23" y1="9" x2="17" y2="15"/>}
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    {enabled && (
      <>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </>
    )}
  </svg>
);

/**
 * PlaygroundPresenter component handles the UI rendering with context-provided state
 */
const PlaygroundPresenter = () => {
  const { 
    // State - only keep essential mic/audio states
    isMicEnabled,
    isAudioMuted,
    
    // Actions - only keep essential actions
    toggleMicrophone,
    toggleAudio,
  } = usePlayground();
  
  const roomState = useConnectionState();
  const room = useRoomContext();
  const participants = useParticipants();
  
  // Start agent worker when room is connected
  // Bu har safar frontend room'ga ulanganda agent workerga job yuboradi
  // Bu agent'ni ishga tushirish uchun kerak bo'lishi mumkin (agar avtomatik ishga tushmasa)
  useEffect(() => {
    if (!room || roomState !== ConnectionState.Connected) return;
    
    const roomName = room.name;
    if (!roomName || roomName === 'unknown') {
      console.warn('[Playground] ⚠️ Room name is unknown, skipping agent job submission');
      return;
    }
    
    // Start agent worker job when frontend connects to room
    // Eslatma: LiveKit'da agent'lar odatda avtomatik ishga tushadi,
    // lekin ba'zi hollarda frontend'dan job yuborish kerak bo'lishi mumkin
    // MUHIM: Agent name'ni to'g'ri belgilash kerak (worker'da sozlangan bo'lishi kerak)
    const startAgent = async () => {
      try {
        // Agent name'ni environment variable'dan yoki default'dan olish
        // MUHIM: Bu name worker'da sozlangan agent_name bilan mos bo'lishi kerak
        const agentName = process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME || 'my-telephony-agent';
        
        console.log('[Playground] 🔄 Submitting agent worker job for room:', {
          roomName,
          agentName,
          note: 'Agent name must match worker configuration',
        });
        
        const result = await startAgentWorker(roomName, agentName);
        
        if (result.success) {
          console.log('[Playground] ✅ Agent worker job submitted successfully:', {
            roomName,
            agentName,
            message: result.result?.message || 'Job submitted',
            note: result.result?.note || 'Agent should connect automatically',
          });
        } else {
          console.warn('[Playground] ⚠️ Failed to submit agent worker job:', {
            roomName,
            agentName,
            error: result.error,
            note: 'Agent may still connect automatically via worker. Check worker logs for "failed to send job request" error.',
          });
        }
      } catch (error) {
        console.error('[Playground] ❌ Error submitting agent worker job:', {
          roomName,
          error: error instanceof Error ? error.message : 'Unknown error',
          note: 'This is non-critical - agent may connect automatically. Check worker configuration.',
        });
      }
    };
    
    // Small delay to ensure room is fully connected before submitting job
    const timer = setTimeout(startAgent, 500);
    return () => clearTimeout(timer);
  }, [room, roomState]);
  
  // Monitor room events for participant connections
  useEffect(() => {
    if (!room) return;
    
    // Log room information (only once when room changes)
    const roomName = room.name || 'unknown';
    // Only log when room state or name actually changes
    if (room.state === ConnectionState.Connected) {
      console.log('[Playground] Room information:', {
        name: roomName,
        roomNameFromObject: room.name,
        state: room.state,
        numParticipants: room.numParticipants,
      });
    }
    
    const handleParticipantConnected = (participant: RemoteParticipant) => {
      console.log('[Playground] ✅ Participant connected:', {
        identity: participant.identity,
        name: participant.name,
        isLocal: participant.isLocal,
        metadata: participant.metadata,
      });
      
      // Check if this is the agent
      const isAgent = !participant.isLocal && (
        participant.identity.toLowerCase().includes('agent') ||
        participant.name?.toLowerCase().includes('agent') ||
        participant.metadata?.toLowerCase().includes('agent')
      );
      
      if (isAgent) {
        console.log('[Playground] 🎉 Agent detected! Agent participant:', participant.identity);
      }
    };
    
    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      console.log('[Playground] Participant disconnected:', {
        identity: participant.identity,
        name: participant.name,
      });
    };
    
    const handleTrackSubscribed = (track: unknown, publication: TrackPublication, participant: RemoteParticipant) => {
      console.log('[Playground] Track subscribed:', {
        participantIdentity: participant.identity,
        trackKind: publication.kind,
        trackSource: publication.source,
        trackSid: publication.trackSid,
        isLocal: participant.isLocal,
      });
    };
    
    const handleTrackPublished = (publication: TrackPublication, participant: RemoteParticipant) => {
      console.log('[Playground] Track published:', {
        participantIdentity: participant.identity,
        trackKind: publication.kind,
        trackSource: publication.source,
        trackSid: publication.trackSid,
        isLocal: participant.isLocal,
      });
    };
    
    room.on('participantConnected', handleParticipantConnected);
    room.on('participantDisconnected', handleParticipantDisconnected);
    room.on('trackSubscribed', handleTrackSubscribed);
    room.on('trackPublished', handleTrackPublished);
    
    return () => {
      room.off('participantConnected', handleParticipantConnected);
      room.off('participantDisconnected', handleParticipantDisconnected);
      room.off('trackSubscribed', handleTrackSubscribed);
      room.off('trackPublished', handleTrackPublished);
    };
  }, [room]);
  
  // Stabilize participants array to prevent infinite loops
  const participantsIds = React.useMemo(() => 
    participants.map(p => p.identity).join(','), 
    [participants]
  );
  
  // Debug: Log room participants (only when participants change, not on every render)
  useEffect(() => {
    if (roomState === ConnectionState.Connected && room && participants.length > 0) {
      console.log('[Playground] Room connected - Participants:', participants.length);
      const participantList = participants.map(p => ({
        identity: p.identity,
        name: p.name,
        isLocal: p.isLocal,
        metadata: p.metadata,
      }));
      console.log('[Playground] All participants:', participantList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState, room, participantsIds]); // Use participantsIds instead of participants
  
  // Loading state and progress
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get voice assistant state and audio track for visualizer
  const voiceAssistant = useVoiceAssistant();
  
  // Fallback: Find agent participant manually if useVoiceAssistant doesn't work
  // Use participantsIds to prevent infinite loops from participants array reference changes
  const agentParticipant = React.useMemo(() => {
    // Try to find agent in remote participants
    // Agent could have different identities: "agent", "assistant", or any non-local participant
    const remoteParticipants = participants.filter(p => !p.isLocal);
    
    // Only log when participants actually change (not on every render)
    if (remoteParticipants.length > 0 || participants.length > 1) {
      console.log('[Playground] Finding agent participant:', {
        totalParticipants: participants.length,
        remoteParticipants: remoteParticipants.length,
        remoteIdentities: remoteParticipants.map(p => ({ identity: p.identity, name: p.name })),
      });
    }
    
    // First try: find by identity containing "agent"
    let agent = remoteParticipants.find(p => 
      p.identity.toLowerCase().includes('agent') || 
      p.name?.toLowerCase().includes('agent')
    );
    
    // Second try: find by metadata containing "agent"
    if (!agent) {
      agent = remoteParticipants.find(p => 
        p.metadata?.toLowerCase().includes('agent')
      );
    }
    
    // Third try: if only one remote participant, assume it's the agent
    if (!agent && remoteParticipants.length === 1) {
      agent = remoteParticipants[0];
      console.log('[Playground] Assuming single remote participant is agent:', agent.identity);
    }
    
    return agent || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantsIds]); // Use participantsIds instead of participants to prevent infinite loops
  
  // Get agent audio track from agent participant
  const agentAudioTrackFromParticipant = React.useMemo(() => {
    if (!agentParticipant || !agentParticipant.trackPublications) return null;
    try {
      // Convert Map to Array safely using forEach
      const trackPublications: Array<{ kind: string; track?: unknown }> = [];
      agentParticipant.trackPublications.forEach((pub) => {
        trackPublications.push({ 
          kind: pub.kind, 
          track: 'track' in pub ? pub.track : undefined 
        });
      });
      
      const audioPublication = trackPublications.find(
        pub => pub.kind === 'audio' && pub.track
      );
      
      return audioPublication?.track || null;
    } catch (error) {
      console.error('[Playground] Error getting agent audio track:', error);
      return null;
    }
  }, [agentParticipant]);
  
  // Use voiceAssistant if available, otherwise use manual detection
  const effectiveVoiceAssistant = React.useMemo(() => {
    if (voiceAssistant) return voiceAssistant;
    if (agentParticipant) {
      return {
        state: undefined, // Use undefined if no voiceAssistant
        audioTrack: agentAudioTrackFromParticipant,
        videoTrack: null, // No video needed
      };
    }
    return null;
  }, [voiceAssistant, agentParticipant, agentAudioTrackFromParticipant]);
  
  const { state: agentState, audioTrack: agentAudioTrack } = effectiveVoiceAssistant || { state: undefined, audioTrack: null };
  
  // Stabilize agent participant identity for dependency tracking
  const agentParticipantIdentity = agentParticipant?.identity || null;
  
  // Debug: Log agent connection status (only when agent changes, not on every render)
  useEffect(() => {
    // Skip logging if no agent and nothing changed
    if (!agentParticipant && !voiceAssistant) return;
    
    let trackPublicationsCount = 0;
    if (agentParticipant && agentParticipant.trackPublications) {
      try {
        trackPublicationsCount = agentParticipant.trackPublications.size;
      } catch {
        trackPublicationsCount = 0;
      }
    }
      
    console.log('[Playground] Agent detection:', {
      useVoiceAssistant: !!voiceAssistant,
      agentParticipant: agentParticipant ? {
        identity: agentParticipant.identity,
        name: agentParticipant.name,
        trackPublications: trackPublicationsCount,
      } : null,
      effectiveVoiceAssistant: !!effectiveVoiceAssistant,
      hasAudioTrack: !!agentAudioTrack,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentParticipantIdentity, voiceAssistant, !!agentAudioTrack]); // Use stable references
  

  // Handle loading progress
  useEffect(() => {
    if (roomState === ConnectionState.Connected) {
      // Complete the progress and hide loading after a short delay
      setLoadingProgress(100);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    } else if (roomState === ConnectionState.Connecting) {
      // Simulate progress during connection
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev; // Stop at 90% until actually connected
          return prev + 2;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [roomState]);

  // Initialize loading progress
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingProgress(10);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  return (
    <div className="flex flex-col h-full w-full bg-black text-white overflow-hidden">
      {/* Header with logo and agent status */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* bitHuman logo */}
        <a 
          href="https://bithuman.ai" 
          target="_blank" 
          rel="noopener noreferrer"
            className="flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Image 
            src="/bitHuman.png" 
            alt="bitHuman" 
              width={32}
              height={32}
              className="opacity-60 hover:opacity-80 transition-opacity duration-200 cursor-pointer"
            />
            <span className="text-sm font-medium text-white/70">bitHuman</span>
          </a>
          
          {/* Agent status indicator */}
          {roomState === ConnectionState.Connected && (
            <div className="px-3 py-1.5 rounded-full backdrop-blur-xl bg-black/40 border border-white/20">
              <div className="flex items-center gap-2">
                {(effectiveVoiceAssistant || agentParticipant) ? (
                  <>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-white/90">
                      Agent ulanmoqda
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-white/70">Agent kutilyapti...</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Chat Window - Full height */}
      <div className="flex-1 overflow-hidden px-6 py-6">
        <ChatWindow className="h-full max-w-7xl mx-auto" />
      </div>
      
      {/* Control panel - Bottom */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
          {/* Voice activity indicator */}
          {isMicEnabled && agentAudioTrack && agentState && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-400/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-300">Kutilyapti</span>
            </div>
        )}
        
        {/* Control buttons */}
          <div className="flex items-center gap-3">
          <button
              onClick={toggleMicrophone}
            className={`
                px-6 py-3 rounded-full transition-all duration-200 flex items-center gap-2
                ${!isMicEnabled 
                  ? 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/10' 
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:scale-105'
                }
                active:scale-95
              `}
              title={isMicEnabled ? 'Mikrofonni o\'chirish' : 'Mikrofonni yoqish'}
            >
              <MicrophoneIcon enabled={isMicEnabled} />
              <span className="text-sm font-medium">Mikrofon</span>
          </button>
          
          <button
              onClick={() => {
                // Remote control placeholder - can be implemented later
                console.log('Remote control clicked');
              }}
              className="px-6 py-3 rounded-full transition-all duration-200 flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:scale-105 active:scale-95"
              title="Remote control"
            >
              <RemoteIcon enabled={true} />
              <span className="text-sm font-medium">Remote</span>
          </button>
          
          <button
            onClick={toggleAudio}
            className={`
                px-6 py-3 rounded-full transition-all duration-200 flex items-center gap-2
                ${isAudioMuted 
                  ? 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/10' 
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:scale-105'
                }
                active:scale-95
              `}
              title={!isAudioMuted ? 'Ovozni o\'chirish' : 'Ovozni yoqish'}
          >
            <AudioIcon enabled={!isAudioMuted} />
              <span className="text-sm font-medium">Speaker</span>
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Playground component that wraps the presenter in a context provider
 */
export default function Playground({
  autoConnect = false,
  onConnect,
}: PlaygroundProps) {
  const roomState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const voiceAssistant = useVoiceAssistant();

  // Auto connect on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect && roomState === ConnectionState.Disconnected) {
      onConnect(true);
    }
  }, [autoConnect, roomState, onConnect]);
    
  return (
    <PlaygroundProvider
      localParticipant={localParticipant}
      voiceAssistant={voiceAssistant}
      roomState={roomState}
    >
      <PlaygroundPresenter />
    </PlaygroundProvider>
  );
}
