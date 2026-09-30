import React from 'react';
import DateRangePicker from '../../../components/common/DateRangePicker';
import SearchableSelect from '../../../components/common/SearchableSelect';
import { ESTADOS_OPTIONS } from '../utils/multasConstants';

export const MultasFiltros = ({ filtros, onFiltrosChange, onLimpiar }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        {/* Rango de Fechas Unificado */}
        <div className="md:col-span-4">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
            Rango de Fechas
          </label>
          <DateRangePicker
            startDate={filtros.fecha_desde}
            endDate={filtros.fecha_hasta}
            onChange={({ startDateStr, endDateStr }) => {
              onFiltrosChange({
                ...filtros,
                fecha_desde: startDateStr,
                fecha_hasta: endDateStr
              });
            }}
            placeholder="Filtrar por rango de fechas..."
          />
        </div>

        {/* Estado con SearchableSelect */}
        <div className="md:col-span-3">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
            Estado
          </label>
          <SearchableSelect
            options={ESTADOS_OPTIONS}
            value={filtros.estado}
            onChange={(val) => {
              onFiltrosChange({
                ...filtros,
                estado: val || 'todos'
              });
            }}
            placeholder="Estado..."
          />
        </div>

        {/* Buscador de texto */}
        <div className="md:col-span-3">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
            Buscar Socio / Bus / Concepto
          </label>
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-2.5 text-slate-400 text-xs pointer-events-none"></i>
            <input
              type="text"
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
              placeholder="Nombre, disco, concepto..."
              value={filtros.search}
              onChange={e => onFiltrosChange({ ...filtros, search: e.target.value })}
            />
          </div>
        </div>

        {/* Botón Limpiar */}
        <div className="md:col-span-2 flex justify-end">
          <button
            onClick={onLimpiar}
            className="w-full h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <i className="fas fa-eraser text-slate-500"></i>
            <span>Limpiar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultasFiltros;
