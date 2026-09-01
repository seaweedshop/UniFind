import { io } from 'socket.io-client';
import { API_ORIGIN } from './api';

let socketClient = null;

export const getMessagingSocket = () => {
  const token = localStorage.getItem('lost_found_token');

  if (!token) {
    return null;
  }

  if (socketClient) {
    return socketClient;
  }

  socketClient = io(API_ORIGIN, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    auth: {
      token: `Bearer ${token}`,
    },
  });

  return socketClient;
};

export const disconnectMessagingSocket = () => {
  if (socketClient) {
    socketClient.disconnect();
    socketClient = null;
  }
};
