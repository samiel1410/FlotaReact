import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { CONFIG } from '../config/env';
import { useAuth } from './useAuth';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Conectar usando la baseURL asignada
    const backendUrl = CONFIG.API_URL;
    if (!backendUrl) return;

    const token = sessionStorage.getItem('auth_token');

    const newSocket = io(backendUrl, {
      auth: token ? { token } : undefined,
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 3000
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket conectado:', newSocket.id);
      
      // Registrar al usuario en el socket
      newSocket.emit('register_user', {
        id_usuario: user.id_usuario,
        id_rol: user.id_rol,
        id_sucursal: user.id_sucursal,
        id_terminal: user.id_terminal || 1 // O de donde venga en React
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket desconectado');
    });

    newSocket.on('connect_error', (err) => {
      setIsConnected(false);
      console.error('Socket connect_error:', err?.message || err);
    });

    // Evento legacy de force logout
    newSocket.on('force_logout', (data) => {
       console.log('Force logout via socket:', data);
       logout();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user, logout]);

  return { socket, isConnected };
};
