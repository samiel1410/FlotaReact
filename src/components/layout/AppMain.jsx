import React, { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GlobalHeader } from './GlobalHeader';
import { Sidebar } from './Sidebar';
import { RouteProgressBar, PageContentLoader } from '../common/RouteTransitionLoader';
import { cargarApariencia } from '../../services/apariencia.service';

export const AppMain = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    cargarApariencia();
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen h-dvh w-full overflow-hidden bg-slate-50 font-outfit relative">
      {/* Barra de progreso de transición de rutas */}
      <RouteProgressBar />

      {/* Barra Lateral Izquierda */}
      <Sidebar isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 cursor-default bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Contenedor Principal (Header + Contenido) */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header Superior */}
        <GlobalHeader onMenuToggle={() => setSidebarOpen(open => !open)} />

        {/* Área de Contenido Dinámico con fallback Suspense suave */}
        <main className="flex-1 min-h-0 min-w-0 overflow-auto p-2 sm:p-3 md:p-4 bg-slate-50 relative">
          <div className="w-full min-w-0">
            <Suspense fallback={<PageContentLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};
