import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Barra de progreso superior que se activa en cada cambio de ruta
 */
export const RouteProgressBar = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(true);
    setProgress(30);

    const timer1 = setTimeout(() => {
      setProgress(75);
    }, 100);

    const timer2 = setTimeout(() => {
      setProgress(100);
    }, 280);

    const timer3 = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location.pathname, location.search]);

  if (!loading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none h-1 bg-transparent overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 transition-all duration-200 ease-out shadow-sm shadow-blue-500/50"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: 'width, opacity',
        }}
      />
    </div>
  );
};

/**
 * Fallback de carga elegante para Suspense dentro del área de contenido
 */
export const PageContentLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full p-8 animate-fadeIn">
      <div className="relative flex items-center justify-center mb-4">
        {/* Anillo exterior pulsante */}
        <div className="w-14 h-14 rounded-2xl bg-blue-100/70 border border-blue-200 animate-pulse flex items-center justify-center">
          <i className="fas fa-bus text-blue-600 text-xl animate-bounce"></i>
        </div>
        {/* Spinner orbital */}
        <div className="absolute -inset-1.5 border-2 border-transparent border-t-blue-600 border-r-blue-400 rounded-2xl animate-spin"></div>
      </div>
      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
        Cargando módulo...
      </p>
      <p className="text-[11px] text-slate-400">
        Preparando información de pantalla
      </p>
    </div>
  );
};
