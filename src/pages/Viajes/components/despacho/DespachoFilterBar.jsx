import React from 'react';
import { DateRangePicker } from '../../../../components/common/DateRangePicker';
import SearchableSelect from '../../../../components/common/SearchableSelect';

export const DespachoFilterBar = ({
  filteredTripsCount,
  totalPasajerosListados,
  loading,
  fechaInicio,
  fechaFin,
  onDateChange,
  busOptions,
  filtroBus,
  onBusChange,
  filtroOcupacion,
  onOcupacionChange,
  misOrigenes,
  onMisOrigenesChange,
  onClearFilters,
  onRefresh,
}) => {
  return (
    <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm z-20">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-sm">
            <i className="fas fa-shipping-fast text-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-extrabold text-slate-800 tracking-tight">Despacho de Viajes</h1>
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                {filteredTripsCount} viaje{filteredTripsCount !== 1 ? 's' : ''}
              </span>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                {totalPasajerosListados} pasajero{totalPasajerosListados !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Control de salida de unidades, asignación de tripulación y despacho con SRI</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClearFilters}
            className="h-9 px-3 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 active:scale-95"
            title="Restablecer filtros a hoy"
          >
            <i className="fas fa-undo text-[10px] text-slate-400" />
            <span>Limpiar</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* ── BARRA DE FILTROS INTEGRADA (DISEÑO CLARO Y EQUILIBRADO) ── */}
      <div className="bg-slate-50/80 px-6 py-2.5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        
        {/* 1. Rango de Fechas Unificado (25%) */}
        <div className="w-full">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Rango de Fechas
          </label>
          <DateRangePicker
            startDate={fechaInicio}
            endDate={fechaFin}
            onChange={onDateChange}
            placeholder="Filtrar por fechas..."
          />
        </div>

        {/* 2. Filtro por Bus / Unidad (25%) */}
        <div className="w-full">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Filtrar por Bus
          </label>
          <SearchableSelect
            options={busOptions}
            value={filtroBus}
            onChange={onBusChange}
            placeholder="Todos los buses..."
            isClearable
          />
        </div>

        {/* 3. Filtro por Ocupación (25%) */}
        <div className="w-full">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Ocupación
          </label>
          <div className="flex bg-white p-0.5 rounded-xl border border-slate-200 h-9">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'CON_PASAJEROS', label: 'Con Pax' },
              { id: 'VACIOS', label: 'Vacíos' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onOcupacionChange(opt.id)}
                className={`flex-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center ${
                  filtroOcupacion === opt.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Switch "Solo Mi Oficina" (25%) */}
        <div className="w-full flex items-center justify-between h-9 px-3.5 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <i className="fas fa-building text-xs text-blue-600" />
            <span className="text-xs font-bold text-slate-700 select-none">Solo Mi Oficina</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={misOrigenes}
            onClick={() => onMisOrigenesChange(!misOrigenes)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              misOrigenes ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                misOrigenes ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

      </div>
    </header>
  );
};

export default DespachoFilterBar;
