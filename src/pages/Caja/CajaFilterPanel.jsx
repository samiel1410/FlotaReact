import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export const CajaFilterPanel = ({ onFilter, isLoading, onBuscarAperturada, onLimpiar, openCaja }) => {
  const [fecha, setFecha] = useState(new Date());

  const handleApplyFilters = () => {
    const offset = fecha.getTimezoneOffset();
    const localDate = new Date(fecha.getTime() - (offset * 60 * 1000));
    const fechaFormatted = localDate.toISOString().split('T')[0];
    onFilter({ fecha: fechaFormatted });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Búsqueda de Cajas</h2>
        <i className="fas fa-filter text-slate-400"></i>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Filtro Fecha */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Fecha de Caja</label>
          <div className="relative">
            <DatePicker
              selected={fecha}
              onChange={date => setFecha(date)}
              dateFormat="yyyy-MM-dd"
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
            <i className="fas fa-calendar-alt absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          </div>
        </div>

        {/* Botón Buscar */}
        <button
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          onClick={handleApplyFilters}
          disabled={isLoading}
        >
          {isLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-search"></i>}
          <span>Buscar</span>
        </button>

        {/* Botón Buscar Caja Aperturada */}
        <button
          onClick={() => onBuscarAperturada?.()}
          disabled={isLoading}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
        >
          <i className="fas fa-door-open"></i>
          <span>Buscar Caja Aperturada</span>
        </button>

        {/* Botón Limpiar */}
        <button
          onClick={() => onLimpiar?.()}
          disabled={isLoading}
          className="w-full py-2.5 bg-slate-500 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
        >
          <i className="fas fa-eraser"></i>
          <span>Limpiar</span>
        </button>

        {/* Indicador caja abierta */}
        {openCaja && (
          <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs font-bold text-emerald-700 flex items-center gap-2">
              <i className="fas fa-circle text-[6px]"></i>
              Caja Aperturada: #{openCaja.id_caja}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
