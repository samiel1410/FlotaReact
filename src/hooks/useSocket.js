import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
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
    // Exponer socket globalmente para que cualquier componente pueda emitir eventos
    window.__socket = newSocket;

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

    // ─── NOTIFICACIÓN: Sucursal cambió de ciudad ──────────────────────────
    newSocket.on('sucursal_ciudad_changed', (data) => {
      console.log('[Socket] Sucursal cambió de ciudad:', data);
      // Solo un toast aunque hayan dos conexiones socket por el id único
      const msg = `🏢 ¡Ciudad de sucursal actualizada!\n${data.nombre_sucursal} cambió de ${data.ciudad_vieja} a ${data.ciudad_nueva}.\n⚠️ Los viajes asociados podrían verse afectados.`;
      toast.error(msg, {
        id: 'sucursal-ciudad-changed',
        duration: 8000,
        style: {
          background: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#92400e',
          borderRadius: '12px',
          padding: '12px 16px',
          fontFamily: 'Outfit, sans-serif',
          fontSize: '13px',
          fontWeight: 500,
          whiteSpace: 'pre-line',
        },
      });
      // Disparar evento para que el header se actualice
      window.dispatchEvent(new CustomEvent('sucursal_ciudad_changed', { detail: data }));
    });

    // ─── SELECCIÓN DE ASIENTOS EN TIEMPO REAL ────────────────────────────
    newSocket.on('asiento_seleccionando', (data) => {
      // Reenviar a NuevoBoletoPage via CustomEvent
      window.dispatchEvent(new CustomEvent('asiento_seleccionando', { detail: data }));
    });

    // ─── NOTIFICACIÓN: Reserva próxima a vencer ──────────────────────────
    newSocket.on('reserva_por_vencer', (data) => {
      console.log('[Socket] Reserva próxima a vencer:', data);
      // Disparar evento para que el header muestre la notificación
      window.dispatchEvent(new CustomEvent('reserva_por_vencer', { detail: data }));
      
      // También mostrar toast
      toast(data.mensaje, {
        id: `reserva-vencer-${data.id_boleto}`,
        duration: 10000,
        icon: '⏰',
        style: {
          background: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#92400e',
          borderRadius: '12px',
          padding: '12px 16px',
          fontFamily: 'Outfit, sans-serif',
          fontSize: '12px',
          fontWeight: 500,
          whiteSpace: 'pre-line',
        },
      });
    });

    // ─── NOTIFICACIÓN: Reserva confirmada ────────────────────────────────
    newSocket.on('reserva_confirmada', (data) => {
      console.log('[Socket] Reserva confirmada:', data);
      window.dispatchEvent(new CustomEvent('reserva_confirmada', { detail: data }));
      
      toast(data.mensaje || `✅ Reserva #${data.id_boleto} confirmada`, {
        id: `reserva-confirmada-${data.id_boleto}`,
        duration: 6000,
        icon: '✅',
        style: {
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          borderRadius: '12px',
          padding: '12px 16px',
          fontFamily: 'Outfit, sans-serif',
          fontSize: '12px',
          fontWeight: 500,
        },
      });
    });

    // ─── BOLETO INSERTADO (en tiempo real) ────────────────────────────────
    newSocket.on('boleto_insertado', (data) => {
      console.log('[Socket] Boleto insertado/anulado:', data);

      if (!data || !data.id_viaje) return;

      // Disparar evento custom para que NuevoBoletoPage actualice los asientos
      window.dispatchEvent(new CustomEvent('boleto_insertado', { detail: data }));

      // Mostrar toast de notificación (solo si no es el propio usuario)
      const getSessionUser = () => {
        try {
          const userData = sessionStorage.getItem('user_data');
          if (userData) return JSON.parse(userData);
        } catch (e) {}
        try {
          const usuario = sessionStorage.getItem('usuario');
          if (usuario) return JSON.parse(usuario);
        } catch (e) {}
        return null;
      };
      const currentUser = getSessionUser();
      const esMismoUsuario = currentUser && data.usuario === currentUser.nombre_usuario;

      if (!esMismoUsuario && data.asientos && data.asientos.length > 0) {
        const asientosStr = data.asientos.map(a => a.asiento_boleto_detalle).join(', ');
        let msg;
        if (data.tipo === 'anulacion_reserva') {
          msg = `🔄 Reserva anulada - Viaje #${data.id_viaje}\nAsiento(s) liberado(s): ${asientosStr}`;
        } else if (data.tipo === 'reserva') {
          msg = `📌 Nueva reserva - Viaje #${data.id_viaje}\nAsiento(s): ${asientosStr}\nPor: ${data.usuario || 'N/A'}`;
        } else {
          msg = `🎫 Nuevo boleto - Viaje #${data.id_viaje}\nAsiento(s): ${asientosStr}\nVendido por: ${data.usuario || 'N/A'}`;
        }
        toast(msg, {
          id: `boleto-${data.id_boleto}-${data.tipo}`,
          duration: 6000,
          icon: data.tipo === 'anulacion_reserva' ? '🔄' : '🎫',
          style: {
            background: data.tipo === 'anulacion_reserva' ? '#f0fdf4' : '#fff7ed',
            border: data.tipo === 'anulacion_reserva' ? '1px solid #bbf7d0' : '1px solid #fed7aa',
            color: data.tipo === 'anulacion_reserva' ? '#166534' : '#9a3412',
            borderRadius: '12px',
            padding: '12px 16px',
            fontFamily: 'Outfit, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'pre-line',
          },
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user, logout]);

  return { socket, isConnected };
};
