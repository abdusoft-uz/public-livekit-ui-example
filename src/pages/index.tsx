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
import React, { useEffect, useState, useCallback } from "react";
import { ConnectionManager } from "@/components/connection/ConnectionManager";
import { ConnectionStatusIndicator } from "@/components/connection/ConnectionStatusIndicator";
import Head from "next/head";

// Theme color for connect screen
const themeColor = "FF5A5F";

export default function Home() {
  return (
    <>
      <Head>
        <title>Abdusoft uz - LiveKit UI</title>
        <meta name="description" content="Simple video chat interface" />
        <meta name="theme-color" content={`#${themeColor}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/bitHuman.png" />
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
        console.warn('[index] ⚠️ NEXT_PUBLIC_LIVEKIT_URL is not set. Please set it in .env.local file.');
        setToastMessage({
          message: 'LiveKit URL is not configured. Please set NEXT_PUBLIC_LIVEKIT_URL in .env.local',
          type: 'error'
        });
        return;
      }
      
      // Start connecting immediately when component is ready
      const timer = setTimeout(() => {
        console.log('Auto-connecting with mode: env');
        connect("env").catch((error) => {
          console.error('Auto-connect failed:', error);
          setToastMessage({ 
            message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
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
  const isConnecting = !showPlayground && isClient;

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
          <div className="text-white/60">Yuklanmoqda...</div>
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
            <ConnectionStatusIndicator />
            <RoomAudioRenderer />
            {/* StartAudio - user gesture bilan audio ni yoqish */}
            <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
              <StartAudio 
                label="Click to enable audio playback" 
                className="px-6 py-3 rounded-xl bg-blue-500/80 hover:bg-blue-500 text-white font-medium shadow-lg backdrop-blur-md border border-blue-300/30 transition-all duration-300 hover:scale-105 active:scale-95"
              />
            </div>
          </ConnectionManager>
        </LiveKitRoom>
      ) : isConnecting ? (
        // Connecting state - show loading screen with progress
        <div className="w-full h-full bg-black flex flex-col items-center justify-center relative overflow-hidden">
          {/* Particle effects background */}
          <div className="absolute inset-0">
            {[...Array(30)].map((_, i) => (
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
          
          {/* Loading content */}
          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl opacity-60 animate-pulse"></div>
                <div className="absolute inset-[2px] bg-black rounded-lg flex items-center justify-center">
                  <span className="text-lg font-bold text-white/80">AU</span>
                </div>
              </div>
              <span className="text-xl font-semibold text-white/90">Abdusoft uz</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-96 h-1 bg-gray-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 transition-all duration-1000 ease-out shadow-lg animate-pulse"
                style={{ width: '60%' }}
              />
            </div>
            
            {/* Status text */}
            <p className="text-white/70 text-sm">LiveKit server&apos;ga ulanmoqda...</p>
            
            {/* Instructions */}
            {!process.env.NEXT_PUBLIC_LIVEKIT_URL && (
              <div className="mt-4 px-6 py-3 rounded-xl bg-yellow-500/20 border border-yellow-400/30 max-w-md">
                <p className="text-yellow-100 text-sm text-center">
                  <strong>Eslatma:</strong> <code className="bg-black/30 px-2 py-1 rounded">NEXT_PUBLIC_LIVEKIT_URL</code> environment variable&apos;ni <code className="bg-black/30 px-2 py-1 rounded">.env.local</code> faylida sozlang.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Not connecting - show error or setup screen
        <div className="w-full h-full bg-black flex flex-col items-center justify-center gap-6 px-6">
          <div className="text-center max-w-2xl">
            <h1 className="text-3xl font-bold text-white mb-4">Abdusoft uz - LiveKit UI</h1>
            <p className="text-white/60 mb-6">
              LiveKit server&apos;ga ulanish uchun <code className="bg-black/50 px-2 py-1 rounded text-yellow-300">.env.local</code> faylida quyidagi o&apos;zgaruvchilarni sozlang:
            </p>
            <div className="bg-black/50 border border-white/10 rounded-xl p-6 text-left font-mono text-sm">
              <pre className="text-white/80 whitespace-pre-wrap">
{`NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret`}
              </pre>
            </div>
            <p className="text-white/40 text-sm mt-6">
              Sozlashdan keyin sahifani yangilang (F5 yoki Ctrl+R)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}