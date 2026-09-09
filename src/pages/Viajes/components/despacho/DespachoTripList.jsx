import React from 'react';
import DespachoTripCard from './DespachoTripCard';

export const DespachoTripList = ({
  searchTerm,
  onSearchChange,
  onSearchKeyDown,
  onClearSearch,
  loading,
  viajesPorRuta,
  selectedTrip,
  onSelectTrip,
}) => {
  return (
    <aside className="w-80 md:w-96 shrink-0 bg-slate-50/50 border-r border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Barra de búsqueda rápida */}
      <div className="p-3 bg-white border-b border-slate-200 shrink-0">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="N° Viaje (Enter), ruta, bus..."
            className="w-full h-9 pl-9 pr-14 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={onClearSearch}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Limpiar búsqueda"
              >
                <i className="fas fa-times-circle text-xs" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded select-none">
              ↵
            </kbd>
          </div>
        </div>
      </div>

      {/* Listado de viajes con scroll */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <i className="fas fa-circle-notch fa-spin text-2xl text-blue-500" />
            <span className="text-xs font-semibold">Cargando viajes programados...</span>
          </div>
        ) : viajesPorRuta.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 shadow-sm mb-3">
              <i className="fas fa-bus text-2xl" />
            </div>
            <p className="text-sm font-bold text-slate-600">No se encontraron viajes</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
              No hay viajes pendientes para los filtros seleccionados. Pruebe ampliando el rango de fechas.
            </p>
          </div>
        ) : (
          viajesPorRuta.map(([ruta, grupo]) => (
            <div key={ruta} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Cabecera de la ruta */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border-b border-blue-100 text-slate-800 text-xs font-extrabold">
                <div className="flex items-center gap-2 truncate pr-2">
                  <i className="fas fa-route text-blue-600 text-xs" />
                  <span className="truncate tracking-tight text-blue-950">{ruta}</span>
                </div>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 border border-blue-200">
                  {grupo.length}
                </span>
              </div>

              {/* Tarjetas de Viaje */}
              <div className="divide-y divide-slate-100">
                {grupo.map((trip) => {
                  const tripId = trip.id_viajes || trip.id_viaje;
                  const isSelected = (selectedTrip?.id_viajes || selectedTrip?.id_viaje) === tripId;
                  return (
                    <DespachoTripCard
                      key={tripId}
                      trip={trip}
                      isSelected={isSelected}
                      onSelect={onSelectTrip}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default DespachoTripList;
