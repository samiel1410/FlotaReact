import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { GlobalHeader } from './GlobalHeader';
import { Sidebar } from './Sidebar';
import { RouteProgressBar, PageContentLoader } from '../common/RouteTransitionLoader';

export const AppMain = () => {
  return (
    <div className="flex h-screen w-full bg-slate-50 font-outfit relative">
      {/* Barra de progreso de transición de rutas */}
      <RouteProgressBar />

      {/* Barra Lateral Izquierda */}
      <Sidebar />

      {/* Contenedor Principal (Header + Contenido) */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header Superior */}
        <GlobalHeader />

        {/* Área de Contenido Dinámico con fallback Suspense suave */}
        <main className="flex-1 overflow-auto p-3 md:p-4 bg-slate-50 relative min-w-0">
          <div className="w-full">
            <Suspense fallback={<PageContentLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};
