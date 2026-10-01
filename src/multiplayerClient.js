import { io } from 'socket.io-client';
const defaultUrl = typeof location !== 'undefined' && location.protocol !== 'file:' ? (['5173','5174'].includes(location.port) ? `${location.protocol}//${location.hostname}:3001` : location.origin) : 'http://localhost:3001';
export const MULTIPLAYER_SERVER_URL = import.meta.env.VITE_MULTIPLAYER_SERVER_URL || defaultUrl;
export function createMultiplayerClient() { return io(MULTIPLAYER_SERVER_URL, { autoConnect: false, reconnection: true, reconnectionDelay: 500, reconnectionDelayMax: 5000, timeout: 5000 }); }
