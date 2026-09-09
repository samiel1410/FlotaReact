import React from 'react';

const formatFecha = (f) => {
  if (!f) return '--/--/----';
  const d = new Date(f);
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const DespachoTripCard = ({ trip, isSelected, onSelect }) => {
  const tripId = trip.id_viajes || trip.id_viaje;
  const boletosCount = trip.asientos_ocupados || trip.cantidad_boletos || 0;

  return (
    <div
      onClick={() => onSelect(trip)}
      className={`p-3.5 transition-all cursor-pointer relative ${
        isSelected
          ? 'bg-blue-50/80 border-l-4 border-blue-600 shadow-sm'
          : 'hover:bg-slate-50/90 border-l-4 border-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-slate-900 leading-none font-mono">
              {trip.hora_salida || '--:--'}
            </span>
            <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md border border-slate-200">
              N° VIAJE #{tripId}
            </span>
            {Number(trip.estado || trip.estado_viajes) === 2 ? (
              <span className="bg-blue-50 text-blue-700 font-bold text-[9px] px-2 py-0.5 rounded-md border border-blue-200">
                DESPACHADO
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 font-bold text-[9px] px-2 py-0.5 rounded-md border border-amber-200">
                PENDIENTE
              </span>
            )}
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
            <i className="far fa-calendar-alt text-slate-400" />
            {formatFecha(trip.fecha_viaje)}
          </p>
        </div>

        {/* Badge Ocupación */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
            boletosCount > 0
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-400 border border-slate-200'
          }`}
        >
          <i className="fas fa-users text-[10px]" />
          <span>{boletosCount} pax</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
        <div className="text-slate-600 font-semibold flex items-center gap-1.5 truncate">
          <i className="fas fa-bus text-blue-500 text-xs" />
          <span className="truncate">
            {trip.disco_buses || trip.numero_unidad
              ? `Bus ${trip.disco_buses || trip.numero_unidad}`
              : trip.codigo_viaje
              ? `Frec: ${trip.codigo_viaje}`
              : 'Sin bus asignado'}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(trip);
          }}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            isSelected
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white border border-slate-200 hover:border-blue-600'
          }`}
        >
          <span>{isSelected ? 'Seleccionado' : 'Seleccionar'}</span>
          <i className="fas fa-chevron-right text-[9px]" />
        </button>
      </div>
    </div>
  );
};

export default DespachoTripCard;
