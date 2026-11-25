import { useConnection, ConnectionProvider, ConnectionMode } from "@/hooks/useConnection";
import { ConfigProvider } from "@/hooks/useConfig";
import Playground from "@/components/playground/Playground";
import { ToastProvider } from "@/components/toast/ToasterProvider";
import { useToast } from "@/components/toast/ToasterProvider";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
} from "@livekit/components-react";
import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ConnectionManager } from "@/components/connection/ConnectionManager";
import Head from "next/head";
import { debug } from "@/utils/logger";

// Theme color for connect screen
const themeColor = "070b16";

export default function Home() {
  return (
    <>
      <Head>
        <title>Abdusoft uz - LiveKit UI</title>
        <meta name="description" content="LiveKit ovozli AI agent uchun veb interfeys" />
        <meta name="theme-color" content={`#${themeColor}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23007bff'/><text x='50' y='70' font-size='60' text-anchor='middle' fill='white' font-weight='bold'>AU</text></svg>" />
      </Head>
      <main className="h-screen w-full">
        <ToastProvider>
          <ConfigProvider>
            <ConnectionProvider>
              <HomeInner />
            </ConnectionProvider>
          </ConfigProvider>
        </ToastProvider>
      </main>
    </>
  );
}

export function HomeInner() {
  const { shouldConnect, wsUrl, token, mode, connect, disconnect } = useConnection();
  const { toastMessage, setToastMessage } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [connectError, setConnectError] = useState(false);

  // Safe access to browser APIs after component mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleConnect = useCallback(
    async (c: boolean, mode: ConnectionMode) => {
      if (c) {
        connect(mode);
      } else {
        disconnect();
      }
    },
    [connect, disconnect]
  );

  // Auto-connect when component mounts (only once)
  // MUHIM: Faqat "env" mode'da auto-connect qilish kerak
  useEffect(() => {
    if (isClient && !shouldConnect) {
      // Faqat NEXT_PUBLIC_LIVEKIT_URL bo'lsa auto-connect qilish
      if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) {
        console.warn('[index] NEXT_PUBLIC_LIVEKIT_URL is not set. Please set it in .env.local file.');
        setToastMessage({
          message: "LiveKit manzili sozlanmagan. NEXT_PUBLIC_LIVEKIT_URL ni .env.local faylida kiriting.",
          type: 'error'
        });
        return;
      }
      
      // Start connecting immediately when component is ready
      const timer = setTimeout(() => {
        debug('Auto-connecting with mode: env');
        connect("env").catch((error) => {
          console.error('Auto-connect failed:', error);
          setConnectError(true);
          setToastMessage({ 
            message: `Ulanib bo‘lmadi: ${error instanceof Error ? error.message : 'Noma’lum xato'}`, 
            type: "error" 
          });
        });
      }, 500); // Increased delay for stability
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]); // Only depend on isClient to prevent multiple auto-connects

  // Auto-dismiss toast messages after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [toastMessage, setToastMessage]);

  // Show playground when connected
  const showPlayground = Boolean(wsUrl && token);

  return (
    <div className="bg-black flex flex-col w-full h-full relative overflow-hidden">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
          >
            <div className={`
              px-6 py-4 rounded-xl font-medium shadow-lg backdrop-blur-md border transition-all duration-300
              ${toastMessage.type === 'error' 
                ? 'bg-red-500/20 border-red-300/30 text-red-100' 
                : 'bg-blue-500/20 border-blue-300/30 text-blue-100'
              }
            `}>
              {toastMessage.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isClient ? (
        // Server-side rendering placeholder - show loading screen
        <div className="w-full h-full bg-black flex items-center justify-center">
          <div className="text-white/60" role="status">Yuklanmoqda...</div>
        </div>
      ) : showPlayground ? (
        // Connected view
        <LiveKitRoom
          className="flex flex-col h-full w-full"
          serverUrl={wsUrl}
          token={token}
          connect={shouldConnect}
          options={{
            // Connection stability settings
            adaptiveStream: true,
            dynacast: true,
            // Reconnection settings
            reconnectPolicy: {
              nextRetryDelayInMs: (context) => {
                // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
                return Math.min(1000 * Math.pow(2, context.retryCount), 10000);
              },
            },
          }}
          onError={(e) => {
            const errorMessage = e instanceof Error ? e.message : String(e);
            setToastMessage({ message: errorMessage, type: "error" });
            console.error('LiveKitRoom error:', e);
          }}
          key={`livekit-room-${token?.substring(0, 8) || 'no-token'}`}
        >
          <ConnectionManager>
            <Playground
              autoConnect={false}
              onConnect={(c) => {
                const m = process.env.NEXT_PUBLIC_LIVEKIT_URL ? "env" : mode;
                handleConnect(c, m);
              }}
            />
            <RoomAudioRenderer />
            {/* StartAudio - user gesture bilan audio ni yoqish */}
            <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2">
              <StartAudio 
                label="Ovozni yoqish uchun bosing" 
                className="px-6 py-3 rounded-xl bg-blue-500/80 hover:bg-blue-500 text-white font-medium shadow-lg backdrop-blur-md border border-blue-300/30 transition-all duration-300 hover:scale-105 active:scale-95"
              />
            </div>
          </ConnectionManager>
        </LiveKitRoom>
      ) : !process.env.NEXT_PUBLIC_LIVEKIT_URL ? (
        <SetupScreen />
      ) : connectError ? (
        <ErrorScreen
          onRetry={() => {
            setConnectError(false);
            connect("env").catch((error) => {
              console.error('Retry failed:', error);
              setConnectError(true);
            });
          }}
        />
      ) : (
        <ConnectingScreen />
      )}
    </div>
  );
}

/** Centered brand header used on the pre-connection screens */
function Brand() {
  return (
    <div className="mb-2 flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30">
        <span className="text-lg font-bold text-white">AU</span>
      </div>
      <span className="text-xl font-semibold text-white/90">Abdusoft uz</span>
    </div>
  );
}

function ConnectingScreen() {
  // Particle positions are generated once
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${3 + Math.random() * 2}s`,
      })),
    []
  );

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#070b16]">
      <div className="absolute inset-0" aria-hidden>
        {particles.map((style, i) => (
          <div key={i} className="animate-float absolute h-1 w-1 rounded-full bg-blue-400/30" style={style} />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6 px-6" role="status" aria-live="polite">
        <Brand />
        <div className="h-1.5 w-72 max-w-[80vw] overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-3/5 animate-pulse rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400" />
        </div>
        <p className="text-sm text-white/70">LiveKit serveriga ulanmoqda...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-[#070b16] px-6 text-center">
      <Brand />
      <p className="max-w-sm text-sm text-white/70" role="alert">
        Serverga ulanib bo&#8216;lmadi. Server ishlayotganini tekshiring va qayta urinib ko&#8216;ring.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-6 py-3 font-semibold text-white shadow-lg transition-transform active:scale-95"
      >
        Qayta urinish
      </button>
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-[#070b16] px-6">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-2xl font-bold text-white sm:text-3xl">Abdusoft uz - LiveKit UI</h1>
        <p className="mb-6 text-white/60">
          LiveKit serveriga ulanish uchun <code className="rounded bg-black/50 px-2 py-1 text-yellow-300">.env.local</code> faylida quyidagi o&#8216;zgaruvchilarni kiriting:
        </p>
        <div className="rounded-xl border border-white/10 bg-black/50 p-4 text-left font-mono text-xs sm:p-6 sm:text-sm">
          <pre className="whitespace-pre-wrap break-all text-white/80">
{`NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret`}
          </pre>
        </div>
        <p className="mt-6 text-sm text-white/40">
          Sozlagandan so&#8216;ng serverni qayta ishga tushiring va sahifani yangilang.
        </p>
      </div>
    </div>
  );
}
