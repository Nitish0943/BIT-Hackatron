import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const WS_BASE = 'ws://10.252.111.61:8000/ws/calling';

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected';

interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'hangup';
  targetId: string;
  senderId: string;
  data?: any;
}

export function useCalling(userId: string) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [remoteUser, setRemoteUser] = useState<string | null>(null);
  const [remoteId, setRemoteId] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const connect = () => {
      console.log(`[WS-CALL] Connecting as ${userId}...`);
      const socket = new WebSocket(`${WS_BASE}/${userId}`);
      
      socket.onmessage = (event) => {
        const msg: SignalMessage = JSON.parse(event.data);
        console.log(`[WS-CALL] SIGNAL RECV: ${msg.type} from ${msg.senderId}`);
        handleSignal(msg);
      };

      socket.onopen = () => console.log(`[WS-CALL] Socket Open for ${userId}`);
      socket.onclose = (e) => {
        console.log(`[WS-CALL] Socket Closed for ${userId}:`, e.code, e.reason);
        setTimeout(connect, 3000);
      };

      socket.onerror = (e) => console.log(`[WS-CALL] Error:`, e);

      ws.current = socket;
    };

    connect();

    return () => {
      ws.current?.close();
    };
  }, [userId]);

  const handleSignal = (msg: SignalMessage) => {
    switch (msg.type) {
      case 'offer':
        setRemoteId(msg.senderId);
        setCallState('incoming');
        break;
      case 'answer':
        setCallState('connected');
        break;
      case 'hangup':
        resetCall();
        break;
      default:
        break;
    }
  };

  const initiateCall = (targetId: string, targetName: string) => {
    setRemoteId(targetId);
    setRemoteUser(targetName);
    setCallState('calling');
    
    ws.current?.send(JSON.stringify({
      type: 'offer',
      targetId,
      senderId: userId,
      data: { name: 'User' } // Simulation data
    }));
  };

  const acceptCall = () => {
    if (!remoteId) return;
    setCallState('connected');
    ws.current?.send(JSON.stringify({
      type: 'answer',
      targetId: remoteId,
      senderId: userId,
    }));
  };

  const hangup = () => {
    if (remoteId) {
      ws.current?.send(JSON.stringify({
        type: 'hangup',
        targetId: remoteId,
        senderId: userId,
      }));
    }
    resetCall();
  };

  const resetCall = () => {
    setCallState('idle');
    setRemoteId(null);
    setRemoteUser(null);
  };

  return {
    callState,
    remoteUser,
    initiateCall,
    acceptCall,
    hangup,
  };
}
