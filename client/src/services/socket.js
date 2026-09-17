import { io } from 'socket.io-client';

/**
 * Socket.IO Singleton Manager.
 * Configured with withCredentials: true so that the browser transmits
 * the HTTP-only JWT authentication cookie during the WebSocket handshake.
 */

let socketInstance = null;

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || '';

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_SERVER_URL, {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });
  }
  return socketInstance;
}

export function connectSocket() {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
