import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from './assets';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (socketInstance) {
    return socketInstance;
  }

  const token = localStorage.getItem('token');

  socketInstance = io(BACKEND_URL, {
    auth: {
      token: token || '',
    },
    transports: ['websocket', 'polling'],
  });

  return socketInstance;
};

type SessionPresenceCallbacks = {
  onChat: (msg: any) => void;
  onPresenceUpdate: (participants: any[]) => void;
  onSessionEnded?: (payload: { sessionId: string; reason?: string }) => void;
  onParticipantLeft?: (payload: { sessionId: string; userId: string }) => void;
};

export const attachSessionPresenceListeners = (
  sessionId: string,
  cb: SessionPresenceCallbacks
): (() => void) => {
  const socket = getSocket();

  const chatEventHandler = (data: any) => {
    if (data?.sessionId === sessionId) {
      cb.onChat(data?.message || data);
    }
  };

  const chatNewFlatHandler = (msg: any) => {
    cb.onChat(msg);
  };

  const presenceEventHandler = (data: any) => {
    if (data?.sessionId === sessionId) {
      cb.onPresenceUpdate(data?.participants || []);
    }
  };

  const sessionEndedHandler = (data: any) => {
    if (data?.sessionId === sessionId) {
      cb.onSessionEnded?.(data);
    }
  };

  const participantLeftHandler = (data: any) => {
    if (data?.sessionId === sessionId) {
      cb.onParticipantLeft?.(data);
    }
  };

  socket.on(`live-study:chat:${sessionId}`, chatEventHandler);
  socket.on(`live-study:chat`, chatEventHandler);
  socket.on(`chat:new`, chatNewFlatHandler);
  socket.on(`live-study:presence:${sessionId}`, presenceEventHandler);
  socket.on(`live-study:presence`, presenceEventHandler);
  socket.on('session:ended', sessionEndedHandler);
  socket.on('session:closed', sessionEndedHandler);
  socket.on(`live-study:session:ended:${sessionId}`, sessionEndedHandler);
  socket.on(`live-study:session:closed:${sessionId}`, sessionEndedHandler);
  socket.on('participant:left', participantLeftHandler);
  socket.on('live-study:participant:left', participantLeftHandler);

  const unsubscribe = () => {
    socket.off(`live-study:chat:${sessionId}`, chatEventHandler);
    socket.off(`live-study:chat`, chatEventHandler);
    socket.off(`chat:new`, chatNewFlatHandler);
    socket.off(`live-study:presence:${sessionId}`, presenceEventHandler);
    socket.off(`live-study:presence`, presenceEventHandler);
    socket.off('session:ended', sessionEndedHandler);
    socket.off('session:closed', sessionEndedHandler);
    socket.off(`live-study:session:ended:${sessionId}`, sessionEndedHandler);
    socket.off(`live-study:session:closed:${sessionId}`, sessionEndedHandler);
    socket.off('participant:left', participantLeftHandler);
    socket.off('live-study:participant:left', participantLeftHandler);
  };

  return unsubscribe;
};

type ListUpdateCb = (ev: { type: string; sessionId: string }) => void;

export const attachListUpdateListeners = (cb: ListUpdateCb): (() => void) => {
  const socket = getSocket();
  const handler = (ev: any) => cb(ev);
  socket.on('live-study:list:update', handler);
  socket.on('admin:live-study:update', handler);
  return () => {
    socket.off('live-study:list:update', handler);
    socket.off('admin:live-study:update', handler);
  };
};

export type SignalingCallbacks = {
  onOffer: (ev: { from: string; to: string; sessionId: string; sdp: any }) => void;
  onAnswer: (ev: { from: string; to: string; sessionId: string; sdp: any }) => void;
  onIce: (ev: { from: string; to: string; sessionId: string; candidate: any }) => void;
  onBye: (ev: { from: string; to: string; sessionId: string }) => void;
  onPeerLeft: (ev: { userId: string; sessionId: string }) => void;
};

export const attachSignalingListeners = (
  userId: string,
  sessionId: string,
  cb: SignalingCallbacks
): (() => void) => {
  const socket = getSocket();

  const offerHandler = (ev: any) => {
    if (ev?.sessionId === sessionId && ev?.to === userId) {
      cb.onOffer(ev);
    }
  };
  const answerHandler = (ev: any) => {
    if (ev?.sessionId === sessionId && ev?.to === userId) {
      cb.onAnswer(ev);
    }
  };
  const iceHandler = (ev: any) => {
    if (ev?.sessionId === sessionId && ev?.to === userId) {
      cb.onIce(ev);
    }
  };
  const byeHandler = (ev: any) => {
    if (ev?.sessionId === sessionId && (ev?.to === userId || ev?.from === userId)) {
      cb.onBye(ev);
    }
  };
  const peerLeftHandler = (ev: any) => {
    if (ev?.sessionId === sessionId) {
      cb.onPeerLeft(ev);
    }
  };

  socket.on('webrtc:offer', offerHandler);
  socket.on('webrtc:answer', answerHandler);
  socket.on('webrtc:ice', iceHandler);
  socket.on('webrtc:bye', byeHandler);
  socket.on(`webrtc:peer-left:${sessionId}`, peerLeftHandler);

  return () => {
    socket.off('webrtc:offer', offerHandler);
    socket.off('webrtc:answer', answerHandler);
    socket.off('webrtc:ice', iceHandler);
    socket.off('webrtc:bye', byeHandler);
    socket.off(`webrtc:peer-left:${sessionId}`, peerLeftHandler);
  };
};

export const sendSignaling = (event: 'webrtc:offer' | 'webrtc:answer' | 'webrtc:ice' | 'webrtc:bye' | 'webrtc:hello', payload: any): void => {
  getSocket().emit(event, payload);
};

export const detachAll = (): void => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
