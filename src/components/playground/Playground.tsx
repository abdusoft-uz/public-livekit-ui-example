"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { PlaygroundProvider, usePlayground } from '@/contexts/PlaygroundContext';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { MediaPermissionPrompt } from '@/components/MediaPermissionPrompt';
import { ConnectionStatusIndicator } from '@/components/connection/ConnectionStatusIndicator';
import {
  useLocalParticipant,
  useConnectionState,
  useVoiceAssistant,
  useParticipants,
  useRoomContext
} from '@livekit/components-react';
import { ConnectionState, RoomEvent } from 'livekit-client';
import { startAgentWorker } from '@/utils/livekitJobClient';
import { debug } from "@/utils/logger";

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
 * Loading screen with progress bar and particle effects
 */
const LoadingScreen = ({ progress }: { progress: number }) => {
  // Random positions are computed once, not on every progress tick
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${3 + Math.random() * 2}s`,
      })),
    []
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#070b16]">
      <div className="absolute inset-0" aria-hidden>
        {particles.map((style, i) => (
          <div key={i} className="animate-float absolute h-1 w-1 rounded-full bg-blue-400/30" style={style} />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-6" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30">
            <span className="text-base font-bold text-white">AU</span>
          </div>
          <span className="text-lg font-semibold text-white/90">Abdusoft uz</span>
        </div>

        <div className="relative h-1.5 w-72 max-w-[80vw] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-white/60">Suhbat xonasiga ulanmoqda...</p>
      </div>
    </div>
  );
};

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const MicrophoneIcon = ({ enabled }: { enabled: boolean }) => (
  <svg {...iconProps}>
    {!enabled && <line x1="1" y1="1" x2="23" y2="23"/>}
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const AudioIcon = ({ enabled }: { enabled: boolean }) => (
  <svg {...iconProps}>
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

/** One toggle button of the audio control bar */
function ControlButton({
  active,
  onClick,
  label,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-all duration-200 active:scale-95 sm:px-6 ${
        active
          ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
          : 'border-red-400/30 bg-red-500/15 text-red-200 hover:bg-red-500/25'
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

/**
 * PlaygroundPresenter component handles the UI rendering with context-provided state
 */
const PlaygroundPresenter = () => {
  const { isMicEnabled, isAudioMuted, toggleMicrophone, toggleAudio } = usePlayground();

  const roomState = useConnectionState();
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const voiceAssistant = useVoiceAssistant();

  // Track if the media permission prompt has been handled, and whether it was denied
  const [hasMediaPermission, setHasMediaPermission] = useState(false);
  const [micDenied, setMicDenied] = useState(false);

  // Enable microphone after permission is granted
  const handlePermissionGranted = async () => {
    setHasMediaPermission(true);
    setMicDenied(false);
    if (localParticipant && !localParticipant.isMicrophoneEnabled) {
      try {
        debug('[Playground] Enabling microphone after permission granted');
        await localParticipant.setMicrophoneEnabled(true);
      } catch (error) {
        console.error('[Playground] Failed to enable microphone:', error);
      }
    }
  };

  const handlePermissionDenied = () => {
    setHasMediaPermission(true); // Mark as handled, even if denied
    setMicDenied(true);
    console.warn('[Playground] Media permission denied by user');
  };

  // Ask the server to dispatch the agent worker each time the frontend joins a room.
  // The agent name must match `agent_name` configured in the worker.
  useEffect(() => {
    if (!room || roomState !== ConnectionState.Connected) return;

    const roomName = room.name;
    if (!roomName || roomName === 'unknown') {
      console.warn('[Playground] Room name is unknown, skipping agent job submission');
      return;
    }

    const startAgent = async () => {
      try {
        const agentName = process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME || 'my-telephony-agent';
        debug('[Playground] Submitting agent worker job for room:', roomName);
        const result = await startAgentWorker(roomName, agentName);
        if (result.success) {
          debug('[Playground] Agent worker job submitted:', String(result.result?.message || 'Job submitted'));
        } else {
          console.warn('[Playground] Failed to submit agent worker job:', result.error,
            '(the agent may still connect automatically; check the worker logs)');
        }
      } catch (error) {
        console.error('[Playground] Error submitting agent worker job:', error instanceof Error ? error.message : 'Unknown error');
      }
    };

    // Small delay to ensure the room is fully connected before submitting the job
    const timer = setTimeout(startAgent, 500);
    return () => clearTimeout(timer);
  }, [room, roomState]);

  // Is any remote participant (the agent) currently speaking?
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  useEffect(() => {
    if (!room) return;
    const onSpeakers = (speakers: Array<{ isLocal: boolean }>) => {
      setRemoteSpeaking(speakers.some((s) => !s.isLocal));
    };
    room.on(RoomEvent.ActiveSpeakersChanged, onSpeakers);
    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, onSpeakers);
    };
  }, [room]);

  // The agent is recognised by the voice assistant hook, or by the identity/metadata, or as the only remote participant
  const agentConnected = useMemo(() => {
    if (voiceAssistant?.agent) return true;
    const remote = participants.filter((p) => !p.isLocal);
    if (remote.some((p) =>
      p.identity.toLowerCase().includes('agent') ||
      p.name?.toLowerCase().includes('agent') ||
      p.metadata?.toLowerCase().includes('agent')
    )) return true;
    return remote.length === 1;
  }, [voiceAssistant?.agent, participants]);

  const agentSpeaking = agentConnected && (voiceAssistant?.state === 'speaking' || remoteSpeaking);

  // Loading state and progress
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (roomState === ConnectionState.Connected) {
      // Complete the progress and hide loading after a short delay
      setLoadingProgress(100);
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
    } else if (roomState === ConnectionState.Connecting) {
      // Simulated progress while connecting; stops at 90% until actually connected
      const interval = setInterval(() => {
        setLoadingProgress((prev) => (prev >= 90 ? prev : prev + 2));
      }, 200);
      return () => clearInterval(interval);
    }
  }, [roomState]);

  if (isLoading) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  const speakerOn = !isAudioMuted;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#070b16] text-white">
      {/* Media permission prompt: shown once connected, until handled */}
      {roomState === ConnectionState.Connected && !hasMediaPermission && (
        <MediaPermissionPrompt
          onPermissionGranted={handlePermissionGranted}
          onPermissionDenied={handlePermissionDenied}
        />
      )}

      {/* Header: brand, connection and agent status */}
      <header className="flex-shrink-0 border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <a
            href="https://github.com/abdusoft-uz/public-livekit-ui-example"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
              <span className="text-sm font-bold text-white">AU</span>
            </div>
            <span className="text-sm font-medium text-white/70">Abdusoft uz</span>
          </a>

          <div className="flex items-center gap-2">
            {roomState === ConnectionState.Connected && (
              <div
                className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 backdrop-blur-xl"
                role="status"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${agentConnected ? 'bg-green-400' : 'animate-pulse bg-yellow-400'}`}
                  aria-hidden
                />
                <span className="text-xs font-medium text-white/80">
                  {agentConnected ? 'Agent ulangan' : 'Agent kutilmoqda...'}
                </span>
              </div>
            )}
            <ConnectionStatusIndicator />
          </div>
        </div>
      </header>

      {/* Chat window: full height */}
      <main className="min-h-0 flex-1 overflow-hidden px-3 py-3 sm:px-6 sm:py-6">
        <ChatWindow
          className="mx-auto h-full max-w-7xl"
          agentConnected={agentConnected}
          agentSpeaking={agentSpeaking}
        />
      </main>

      {/* Audio control bar */}
      <footer className="flex-shrink-0 border-t border-white/10 bg-black/40 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <ControlButton
              active={isMicEnabled}
              onClick={toggleMicrophone}
              label={isMicEnabled ? 'Mikrofon' : 'Mikrofon o‘chiq'}
              title={isMicEnabled ? 'Mikrofonni o‘chirish' : 'Mikrofonni yoqish'}
            >
              <MicrophoneIcon enabled={isMicEnabled} />
            </ControlButton>
            <ControlButton
              active={speakerOn}
              onClick={toggleAudio}
              label={speakerOn ? 'Karnay' : 'Karnay o‘chiq'}
              title={speakerOn ? 'Ovozni o‘chirish' : 'Ovozni yoqish'}
            >
              <AudioIcon enabled={speakerOn} />
            </ControlButton>
          </div>
          {micDenied && !isMicEnabled && (
            <p className="text-center text-xs text-amber-200/80" role="alert">
              Mikrofonga ruxsat berilmagan. Brauzer manzil satridagi qulf belgisi orqali ruxsat bering.
            </p>
          )}
        </div>
      </footer>
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
