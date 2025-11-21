import { io } from 'socket.io-client';

// Simple socket service that returns a singleton socket per token.
// If token changes, a new socket is created. If no token provided,
// the service will attempt to read token from localStorage.

const socketMap = new Map();

export function getSocket(token) {
  const api = process.env.REACT_APP_API_URL || 'http://localhost:5050';
  const t = token !== undefined ? token : (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
  const key = t || '__anon';
  if (socketMap.has(key)) return socketMap.get(key);

  const socket = io(api, {
    transports: ['websocket', 'polling'],
    auth: { token: t },
  });

  socket.on('connect_error', (err) => {
    console.warn('socket connect_error', err && err.message ? err.message : err);
  });

  socketMap.set(key, socket);
  return socket;
}

export function disconnectAll() {
  for (const s of socketMap.values()) {
    try { s.disconnect(); } catch (e) {}
  }
  socketMap.clear();
}

export default getSocket;
