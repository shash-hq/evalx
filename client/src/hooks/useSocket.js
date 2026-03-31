import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/runtime.js';

export const useSocket = (accessToken) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!accessToken) {
      setSocket((currentSocket) => {
        currentSocket?.disconnect();
        return null;
      });
      return undefined;
    }

    const nextSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      withCredentials: true,
      auth: {
        token: accessToken,
      },
    });
    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
    };
  }, [accessToken]);

  return socket;
};
