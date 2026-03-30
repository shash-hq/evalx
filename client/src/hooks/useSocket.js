import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://api.evalx.in';

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      withCredentials: true,
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return socketRef;
};
