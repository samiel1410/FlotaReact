import { Outlet } from 'react-router-dom';
import { GlobalHeader } from './GlobalHeader';
import { Sidebar } from './Sidebar';

export const AppMain = () => {
  return (
    <div className="flex h-screen w-full bg-slate-50 font-outfit">
      {/* Barra Lateral Izquierda */}
      <Sidebar />

      {/* Contenedor Principal (Header + Contenido) */}
      <div className="flex flex-col flex-1">
        {/* Header Superior */}
        <GlobalHeader />

        {/* Área de Contenido Dinámico */}
        <main className="flex-1 overflow-auto p-3 md:p-4 bg-slate-50 relative">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

