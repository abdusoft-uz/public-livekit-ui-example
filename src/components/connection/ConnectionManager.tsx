import React, { useEffect } from 'react';
import { useToast } from '@/components/toast/ToasterProvider';
import { 
  DisconnectReason, 
  RoomEvent 
} from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { debug } from "@/utils/logger";

interface ConnectionManagerProps {
  children: React.ReactNode;
}

/**
 * Shows connection toasts for room events. LiveKit handles the actual
 * reconnection internally.
 */
export function ConnectionManager({ children }: ConnectionManagerProps) {
  const { setToastMessage } = useToast();
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const handleDisconnected = (reason?: DisconnectReason) => {
      debug('[ConnectionManager] Room disconnected:', reason);
      // Only show an error for unexpected disconnections
      if (reason !== DisconnectReason.CLIENT_INITIATED) {
        setToastMessage({
          message: "Aloqa uzildi. Qayta ulanilmoqda...",
          type: 'error'
        });
      }
    };

    const handleReconnecting = () => {
      debug('[ConnectionManager] Room reconnecting...');
      setToastMessage({ message: "Qayta ulanilmoqda...", type: 'error' });
    };

    const handleReconnected = () => {
      debug('[ConnectionManager] Room reconnected');
      setToastMessage({ message: "Aloqa tiklandi", type: 'success' });
    };

    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);

    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
    };
  }, [room, setToastMessage]);

  return <>{children}</>;
}
