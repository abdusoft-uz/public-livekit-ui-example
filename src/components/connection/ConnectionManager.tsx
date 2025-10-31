import React, { useEffect, useCallback, useState } from 'react';
import { useToast } from '@/components/toast/ToasterProvider';
import { 
  DisconnectReason, 
  RoomEvent 
} from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';

interface ConnectionManagerProps {
  children: React.ReactNode;
}

interface ReconnectionState {
  isReconnecting: boolean;
}

export function ConnectionManager({ children }: ConnectionManagerProps) {
  const { setToastMessage } = useToast();
  const room = useRoomContext();
  
  // Simplified reconnection state
  const [reconnectionState, setReconnectionState] = useState<ReconnectionState>({
    isReconnecting: false
  });

  // Handle disconnection and show message (LiveKit handles reconnection internally)
  const handleDisconnection = useCallback(() => {
    setReconnectionState(prev => {
      // Prevent duplicate calls if already reconnecting
      if (prev.isReconnecting) {
        return prev;
      }

      console.log('[ConnectionManager] Connection lost');
      setToastMessage({
        message: 'Connection lost. Attempting to reconnect...',
        type: 'error'
      });

      return {
        isReconnecting: true
      };
    });
  }, [setToastMessage]);

  // Handle room events
  useEffect(() => {
    if (!room) return;

    const handleDisconnected = (reason?: DisconnectReason) => {
      console.log('[ConnectionManager] Room disconnected:', reason);
      
      // Only show error message for unexpected disconnections
      if (reason !== DisconnectReason.CLIENT_INITIATED) {
        setToastMessage({
          message: 'Connection lost. Attempting to reconnect...',
          type: 'error'
        });
        handleDisconnection();
      } else {
        console.log('[ConnectionManager] Client initiated disconnect - no reconnection needed');
      }
    };

    const handleReconnecting = () => {
      console.log('[ConnectionManager] Room reconnecting...');
      setReconnectionState({
        isReconnecting: true
      });
      
      setToastMessage({
        message: 'Reconnecting...',
        type: 'error'
      });
    };

    const handleReconnected = () => {
      console.log('[ConnectionManager] Room reconnected');
      setReconnectionState({
        isReconnecting: false
      });

      setToastMessage({
        message: 'Reconnected successfully',
        type: 'success'
      });
    };

    const handleConnected = () => {
      console.log('[ConnectionManager] Room connected');
      // Reset reconnection state on successful connection
      setReconnectionState({
        isReconnecting: false
      });
    };

    // Subscribe to room events
    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);
    room.on(RoomEvent.Connected, handleConnected);

    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
      room.off(RoomEvent.Connected, handleConnected);
    };
  }, [room, setToastMessage, handleDisconnection]);

  return <>{children}</>;
}; 