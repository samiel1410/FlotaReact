import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

// Tiempo de inactividad: 30 minutos (30 * 60 * 1000 ms)
const IDLE_TIMEOUT = 30 * 60 * 1000;

export const useIdle = () => {
  const { logout, isAuthenticated } = useAuth();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        toast('Su sesión ha expirado por inactividad', { icon: '💤' });
        logout();
      }, IDLE_TIMEOUT);
    };

    // Eventos a monitorizar
    const events = ['mousemove', 'mousedown', 'keypress', 'DOMMouseScroll', 'mousewheel', 'touchmove', 'MSPointerMove'];
    
    // Inicializar timer
    resetTimer();

    // Agregar listeners
    events.forEach(event => document.addEventListener(event, resetTimer));

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [logout, isAuthenticated]);
};
