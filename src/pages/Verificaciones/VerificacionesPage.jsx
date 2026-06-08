import React, { useState, useEffect, useCallback } from 'react';
import { useListado } from '../../hooks/useListado';

const PAGE_SIZE = 25;

const MESES = [
  { value: '', label: 'Todos' },
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

const ANIOS = [
  { value: '', label: 'Todos' },
  { value: '2019', label: '2019' }, { value: '2020', label: '2020' },
  { value: '2021', label: '2021' }, { value: '2022', label: '2022' },
  { value: '2023', label: '2023' }, { value: '2024', label: '2024' },
  { value: '2025', label: '2025' }, { value: '2026', label: '2026' },
];

// ─── Tab: Boletería (Anulaciones de Boletos) ───
const BoleteriaTab = () => {
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const buildCustomParams = useCallback(
    (page, size) => ({
      factura: filters.factura_busqueda || '',
      rucliente: filters.ruc_busqueda || '',
      mes: filters.comboMes || '',
      anio: filters.comboAnio || '',
      desde: filters.desde || '',
      hasta: filters.hasta || '',
      page: page + 1,
      limit: size,
    }),
    [filters]
  );

  const { data, loading, total, fetch: fetchData } = useListado('/boleteria/boleteriaListado', {}, buildCustomParams);

  useEffect(() => {
    fetchData({}, 0);
  }, []); // eslint-disable-line

  const totalPages = Math.ceil((total || 0) / PAGE_SIZE);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchData(filters, 0);
  };

  const handleClear = () => {
    const reset = { factura_busqueda: '', ruc_busqueda: '', comboMes: '', comboAnio: '', desde: '', hasta: '' };
    setFilters(reset);
    setCurrentPage(1);
    fetchData(reset, 0);
  };

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          <i className="fas fa-filter mr-1.5"></i> Filtros de Búsqueda
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Factura</label>
            <input type="text" value={filters.factura_busqueda ?? ''} onChange={e => setFilters(p => ({ ...p, factura_busqueda: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">RUC</label>
            <input type="text" value={filters.ruc_busqueda ?? ''} onChange={e => setFilters(p => ({ ...p, ruc_busqueda: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Mes</label>
            <select value={filters.comboMes ?? ''} onChange={e => setFilters(p => ({ ...p, comboMes: e.target.value }))}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none">
              {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Año</label>
            <select value={filters.comboAnio ?? ''} onChange={e => setFilters(p => ({ ...p, comboAnio: e.target.value }))}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none">
              {ANIOS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Desde</label>
            <input type="date" value={filters.desde ?? ''} onChange={e => setFilters(p => ({ ...p, desde: e.target.value }))}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Hasta</label>
            <input type="date" value={filters.hasta ?? ''} onChange={e => setFilters(p => ({ ...p, hasta: e.target.value }))}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleSearch} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors">
            <i className="fas fa-search"></i> Buscar
          </button>
          <button onClick={handleClear} className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-300 transition-colors">
            <i className="fas fa-eraser"></i> Limpiar
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">#FACTURA</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">FECHA</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">CLIENTE</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">TOTAL</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">MOTIVO</th>
                  <th className="px-3 py-2 text-center font-bold text-slate-500 uppercase tracking-wider w-20">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">Sin datos para mostrar</td></tr>
                ) : (
                  (data || []).map((row, idx) => (
                    <tr key={row.id_anular_bolteria || idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-bold">{row.numero_anulacion_bolteria || '-'}</td>
                      <td className="px-3 py-2">{row.fecha_factura_anulacion_boleteria ? row.fecha_factura_anulacion_boleteria.split(' ')[0] : '-'}</td>
                      <td className="px-3 py-2">
                        <div className="text-[9px] leading-tight">
                          <div className="text-slate-400"><b>RUC:</b> {row.ruc_anular_bolteria || '-'}</div>
                          <div><b>Razón Social:</b> {row.cliente_anular_bolteria || '-'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-bold">${parseFloat(row.total_anular_boleteria || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={row.motivo_anulacion_boleteria || ''}>{row.motivo_anulacion_boleteria || <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                          row.estado_anular_boleteria == 1 ? 'bg-rose-50 text-rose-700' :
                          row.estado_anular_boleteria == 0 ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {row.estado_anular_boleteria == 1 ? 'ANULADO' :
                           row.estado_anular_boleteria == 0 ? 'PENDIENTE' : '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px]">
            <span className="text-slate-500">Mostrando {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, total || 0)} de {total || 0}</span>
            <div className="flex gap-1">
              <button disabled={currentPage <= 1} onClick={() => { setCurrentPage(p => p - 1); fetchData(filters, currentPage - 2); }}
                className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100"><i className="fas fa-chevron-left text-[9px]"></i></button>
              <span className="px-2 py-1 font-bold text-slate-600">{currentPage}</span>
              <button disabled={currentPage >= totalPages} onClick={() => { setCurrentPage(p => p + 1); fetchData(filters, currentPage); }}
                className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100"><i className="fas fa-chevron-right text-[9px]"></i></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Tab: Encomiendas (Anulaciones de Facturas) ───
const EncomiendasTab = () => {
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const buildCustomParams = useCallback(
    (page, size) => ({
      nombrecliente: filters.nombre_busqueda || '',
      rucliente: filters.ruc_busqueda || '',
      inifecha: filters.inifecha || '',
      lastfecha: filters.lastfecha || '',
      mes: filters.comboMes || '',
      anio: filters.comboAnio || '',
      factura: filters.factura_busqueda || '',
      numeroguia: filters.numero_guia || '',
      page: page + 1,
      limit: size,
    }),
    [filters]
  );

  const { data, loading, total, fetch: fetchData } = useListado('/factura/listadoAnulacionesFactura', {}, buildCustomParams);

  useEffect(() => {
    fetchData({}, 0);
  }, []); // eslint-disable-line

  const totalPages = Math.ceil((total || 0) / PAGE_SIZE);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchData(filters, 0);
  };

  const handleClear = () => {
    const reset = { nombre_busqueda: '', ruc_busqueda: '', inifecha: '', lastfecha: '', comboMes: '', comboAnio: '', factura_busqueda: '', numero_guia: '' };
    setFilters(reset);
    setCurrentPage(1);
    fetchData(reset, 0);
  };

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          <i className="fas fa-filter mr-1.5"></i> Filtros de Búsqueda
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Nombre</label>
            <input type="text" value={filters.nombre_busqueda ?? ''} onChange={e => setFilters(p => ({ ...p, nombre_busqueda: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">RUC</label>
            <input type="text" value={filters.ruc_busqueda ?? ''} onChange={e => setFilters(p => ({ ...p, ruc_busqueda: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Factura</label>
            <input type="text" value={filters.factura_busqueda ?? ''} onChange={e => setFilters(p => ({ ...p, factura_busqueda: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">N° Guía</label>
            <input type="text" value={filters.numero_guia ?? ''} onChange={e => setFilters(p => ({ ...p, numero_guia: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Mes</label>
            <select value={filters.comboMes ?? ''} onChange={e => setFilters(p => ({ ...p, comboMes: e.target.value }))}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none">
              {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Año</label>
            <select value={filters.comboAnio ?? ''} onChange={e => setFilters(p => ({ ...p, comboAnio: e.target.value }))}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none">
              {ANIOS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Desde</label>
            <input type="date" value={filters.inifecha ?? ''} onChange={e => setFilters(p => ({ ...p, inifecha: e.target.value }))}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Hasta</label>
            <input type="date" value={filters.lastfecha ?? ''} onChange={e => setFilters(p => ({ ...p, lastfecha: e.target.value }))}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleSearch} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors">
            <i className="fas fa-search"></i> Buscar
          </button>
          <button onClick={handleClear} className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-300 transition-colors">
            <i className="fas fa-eraser"></i> Limpiar
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">FACTURA</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">USUARIO ANULÓ</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">MOTIVO</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">SUCURSAL</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">TOTAL</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">FECHA ANULACIÓN</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">Sin datos para mostrar</td></tr>
                ) : (
                  (data || []).map((row, idx) => (
                    <tr key={row.id_factura || idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-bold">{row.numero_factura || '-'}</td>
                      <td className="px-3 py-2">{row.usuario_anulo || row.nombre_usuario || '-'}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={row.motivo_anulacion || ''}>{row.motivo_anulacion || row.motivo_anulacion_factura || <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-2">{row.nombre_sucursal || '-'}</td>
                      <td className="px-3 py-2 text-right font-bold">${parseFloat(row.total_factura || 0).toFixed(2)}</td>
                      <td className="px-3 py-2">{row.fecha_anulacion_factura ? row.fecha_anulacion_factura.split(' ')[0] : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px]">
            <span className="text-slate-500">Mostrando {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, total || 0)} de {total || 0}</span>
            <div className="flex gap-1">
              <button disabled={currentPage <= 1} onClick={() => { setCurrentPage(p => p - 1); fetchData(filters, currentPage - 2); }}
                className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100"><i className="fas fa-chevron-left text-[9px]"></i></button>
              <span className="px-2 py-1 font-bold text-slate-600">{currentPage}</span>
              <button disabled={currentPage >= totalPages} onClick={() => { setCurrentPage(p => p + 1); fetchData(filters, currentPage); }}
                className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100"><i className="fas fa-chevron-right text-[9px]"></i></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Página principal ───
export const VerificacionesPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  const TABS = [
    { id: 'boleteria', label: 'Boletería', icon: 'fa-ticket-alt', component: BoleteriaTab },
    { id: 'encomiendas', label: 'Encomiendas', icon: 'fa-box', component: EncomiendasTab },
  ];

  const ActiveComponent = TABS[activeTab].component;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <i className="fas fa-check-circle text-emerald-600 text-lg"></i>
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-800">Verificaciones</h1>
          <p className="text-[11px] text-slate-500">Verificación de anulaciones de boletería y encomiendas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-0">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border-b-2 ${
              activeTab === i
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <i className={`fas ${tab.icon} mr-1.5`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fadeIn">
        <ActiveComponent key={activeTab} />
      </div>
    </div>
  );
};
