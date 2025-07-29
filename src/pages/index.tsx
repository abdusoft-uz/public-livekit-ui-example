import { useConnection, ConnectionProvider, ConnectionMode } from "@/hooks/useConnection";
import { ConfigProvider, useConfig } from "@/hooks/useConfig";
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
        <title>bitHuman demo</title>
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
  const { config } = useConfig();
  const { toastMessage, setToastMessage } = useToast();
  const [isClient, setIsClient] = useState(false);

  // Safe access to browser APIs after component mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleConnect = useCallback(
    async (c: boolean, mode: ConnectionMode) => {
      c ? connect(mode) : disconnect()
    },
    [connect, disconnect]
  );

  // Auto-connect when component mounts
  useEffect(() => {
    if (isClient && !shouldConnect) {
      // Start connecting immediately when component is ready
      const timer = setTimeout(() => {
        const connectionMode = process.env.NEXT_PUBLIC_LIVEKIT_URL ? "env" : mode;
        console.log('Auto-connecting with mode:', connectionMode);
        connect(connectionMode);
      }, 100); // Minimal delay for component readiness
      
      return () => clearTimeout(timer);
    }
  }, [isClient, shouldConnect, connect, mode]);

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
        // Server-side rendering placeholder (empty to prevent flash)
        <div></div>
      ) : showPlayground ? (
        // Connected view
        <LiveKitRoom
          className="flex flex-col h-full w-full"
          serverUrl={wsUrl}
          token={token}
          connect={shouldConnect}
          onError={(e) => {
            setToastMessage({ message: e.message, type: "error" });
            console.error(e);
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
            <StartAudio label="Click to enable audio playback" />
          </ConnectionManager>
        </LiveKitRoom>
      ) : (
        // Auto-connecting - no UI needed as Playground will show loading screen
        <div className="w-full h-full bg-black"></div>
      )}
    </div>
  );
}