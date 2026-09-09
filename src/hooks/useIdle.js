import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

// Tiempo máximo de inactividad: 30 minutos (30 * 60 * 1000 ms)
export const IDLE_TIMEOUT = 30 * 60 * 1000;

export const useIdle = () => {
  const { logout, isAuthenticated } = useAuth();
  const lastThrottleRef = useRef(0);
  const logoutTriggeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    logoutTriggeredRef.current = false;

    // Actualizar timestamp en storage (throttled a cada 5 segundos para evitar degradar rendimiento)
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastThrottleRef.current > 5000) {
        lastThrottleRef.current = now;
        try {
          localStorage.setItem('last_activity_time', String(now));
          sessionStorage.setItem('last_activity_time', String(now));
        } catch (e) {}
      }
    };

    // Verificar si ya expiró el tiempo de inactividad
    const checkIdleTimeout = () => {
      if (logoutTriggeredRef.current) return;

      const stored = localStorage.getItem('last_activity_time') || sessionStorage.getItem('last_activity_time');
      const lastTime = stored ? parseInt(stored, 10) : lastThrottleRef.current;
      const now = Date.now();

      if (now - lastTime >= IDLE_TIMEOUT) {
        logoutTriggeredRef.current = true;
        toast('Su sesión ha expirado por inactividad', { icon: '💤', id: 'idle-logout-toast' });
        logout();
      }
    };

    // Registrar marca inicial de actividad
    updateActivity();
    checkIdleTimeout();

    // Eventos de interacción del usuario
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleUserInteraction = () => {
      updateActivity();
    };

    events.forEach(event => window.addEventListener(event, handleUserInteraction, { passive: true }));

    // Detectar cuando la pestaña vuelve al primer plano o la ventana gana foco
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkIdleTimeout();
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Chequeo periódico cada 15 segundos
    const intervalId = setInterval(checkIdleTimeout, 15000);

    return () => {
      clearInterval(intervalId);
      events.forEach(event => window.removeEventListener(event, handleUserInteraction));
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [logout, isAuthenticated]);
};

