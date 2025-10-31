"use client"

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useConfig } from '@/hooks/useConfig';

export type ConnectionMode = "env" | "manual";

type TokenGeneratorData = {
  shouldConnect: boolean;
  wsUrl: string;
  token: string;
  mode: ConnectionMode;
  disconnect: () => Promise<void>;
  connect: (mode: ConnectionMode) => Promise<void>;
};

const ConnectionContext = createContext<TokenGeneratorData | undefined>(undefined);

export const ConnectionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { config } = useConfig();
  const [connectionDetails, setConnectionDetails] = useState<{
    wsUrl: string;
    token: string;
    mode: ConnectionMode;
    shouldConnect: boolean;
  }>({ wsUrl: "", token: "", shouldConnect: false, mode: "manual" });

  const connect = useCallback(
    async (mode: ConnectionMode) => {
      // Prevent duplicate requests
      if (connectionDetails.shouldConnect && connectionDetails.mode === mode) {
        console.log('[connection] Already connected with the same mode, skipping duplicate request');
        return;
      }
      
      // Set connecting state immediately to prevent parallel requests
      setConnectionDetails(prev => ({ ...prev, mode }));
      
      let token = "";
      let url = "";
      
      try {
        if (mode === "env") {
          if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) {
            throw new Error("NEXT_PUBLIC_LIVEKIT_URL is not set");
          }
          url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
          
          // Har safar yangi room name generatsiya qilish
          const newRoomName = `room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          
          // Simple parameter setup
          const params = new URLSearchParams();
          // Har safar yangi room name ishlatish (eski room_name'ni e'tiborsiz qoldirish)
          params.append('roomName', newRoomName);
          if (config.settings.participant_name) {
            params.append('participantName', config.settings.participant_name);
          }
          
          console.log('[connection] Using new room name:', newRoomName);
          
          // Get token from the API
          const tokenUrl = `/api/token?${params.toString()}`;
          console.log('[connection] Fetching token from:', tokenUrl);
          const response = await fetch(tokenUrl);
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Failed to fetch token: ${response.status} - ${errorText}`);
          }
          
          const data = await response.json();
          token = data.accessToken;
          
          if (!token) {
            throw new Error("Failed to get access token");
          }
        }

        const urlPreview = url ? (url.length > 50 ? url.substring(0, 50) + '...' : url) : 'not set';
        console.log('[connection] Connection successful:', { mode, url: urlPreview });

        setConnectionDetails({
          wsUrl: url,
          token: token,
          shouldConnect: true,
          mode,
        });
      } catch (error) {
        console.error('[connection] Connection failed:', error);
        // Reset connection state on error
        setConnectionDetails({
          wsUrl: "",
          token: "",
          shouldConnect: false,
          mode: "manual",
        });
        // Re-throw error so it can be handled by the caller
        throw error;
      }
    },
    [connectionDetails.shouldConnect, connectionDetails.mode, config.settings.room_name, config.settings.participant_name]
  );

  const disconnect = useCallback(async () => {
    console.log('[connection] Disconnecting...');
    // Disconnect qilganda state'ni tozalash
    // Qayta connect qilganda yangi room name generatsiya qilinadi
    setConnectionDetails({
      wsUrl: "",
      token: "",
      shouldConnect: false,
      mode: "manual",
    });
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        wsUrl: connectionDetails.wsUrl,
        token: connectionDetails.token,
        shouldConnect: connectionDetails.shouldConnect,
        mode: connectionDetails.mode,
        connect,
        disconnect,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return context;
};

export const useAppConfig = () => {
  // Simple default config for basic functionality
  return {
    title: "Video Chat",
    description: "Simple video chat interface",
    settings: {
      editable: true,
      theme_color: "blue",
      chat: false,
      inputs: {
        camera: true,
        mic: true,
      },
      outputs: {
        audio: true,
        video: true,
      },
      ws_url: "",
      token: "",
      room_name: "finarum-room",
      participant_name: "user",
    },
  };
};