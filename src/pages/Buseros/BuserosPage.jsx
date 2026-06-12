import { useState, useEffect, useCallback } from 'react';
import { api } from '../../config/axios';
import toast from 'react-hot-toast';
import { BusquedaPersonalModal } from './components/BusquedaPersonalModal';
import { BusquedaRutaModal } from './components/BusquedaRutaModal';
import { BusquedaBusModal } from '../Despacho/components/BusquedaBusModal';

const PAGE_SIZE = 40;

const MESES = [
  { value: '0', label: 'Todos' },
  { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' }, { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

const ANIOS = [
  { value: '0', label: 'Todos' },
  { value: '2019', label: '2019' }, { value: '2020', label: '2020' },
  { value: '2021', label: '2021' }, { value: '2022', label: '2022' },
  { value: '2023', label: '2023' }, { value: '2024', label: '2024' },
  { value: '2025', label: '2025' }, { value: '2026', label: '2026' },
];

export const BuserosPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTrigger, setSearchTrigger] = useState(0);

  // Totales del toolbar
  const [totales, setTotales] = useState({ cantidad_boletos: 0, vendido: 0, retenido: 0 });

  // Labels de selección
  const [selectedLabels, setSelectedLabels] = useState({
    socio: 'Socio:Ninguno',
    ruta: 'Ruta:Ninguna',
    bus: 'Bus:Ninguno',
  });

  // Modales de búsqueda
  const [modalBusqueda, setModalBusqueda] = useState(null); // 'socio' | 'ruta' | 'bus'

  // Filtros
  const [filters, setFilters] = useState({
    personal_busqueda: '',
    id_personal: '',
    rutas_busqueda: '',
    id_ruta_busqueda: '',
    bus_busqueda: '',
    id_bus_busqueda: '',
    comboMes: '0',
    comboAnioFactura: '0',
    buscarPorFechaDesde: '',
  });

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const getParams = useCallback(() => ({
    per_codigo: filters.id_personal || '',
    bus_codigo: filters.id_bus_busqueda || '',
    ruta_codigo: filters.id_ruta_busqueda || '',
    per_nombre: filters.personal_busqueda || '',
    bus_placa: filters.bus_busqueda || '',
    ruta_nombre: filters.rutas_busqueda || '',
    fecha: filters.buscarPorFechaDesde || '',
    mes: filters.comboMes || '0',
    anio: filters.comboAnioFactura || '0',
    limit: PAGE_SIZE,
    page: page,
  }), [filters, page]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = getParams();
      const [listRes, totalsRes] = await Promise.all([
        api.get('/boleteria/facturaRetenidoEmitido', { params }),
        api.get('/boleteria/facturaRetenidoEmitidoTotales', { params }),
      ]);
      if (listRes.data?.success) {
        setData(listRes.data.data || []);
        setTotal(listRes.data.total || 0);
      }
      if (totalsRes.data?.success) {
        setTotales(totalsRes.data.data || { cantidad_boletos: 0, vendido: 0, retenido: 0 });
      }
    } catch (err) {
      toast.error('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getParams]);

  useEffect(() => {
    loadData();
  }, [loadData, searchTrigger]);

  const handleSearch = () => {
    setPage(1);
    setSearchTrigger(t => t + 1);
  };

  const handleClear = () => {
    setFilters({
      personal_busqueda: '',
      id_personal: '',
      rutas_busqueda: '',
      id_ruta_busqueda: '',
      bus_busqueda: '',
      id_bus_busqueda: '',
      comboMes: '0',
      comboAnioFactura: '0',
      buscarPorFechaDesde: '',
    });
    setSelectedLabels({ socio: 'Socio:Ninguno', ruta: 'Ruta:Ninguna', bus: 'Bus:Ninguno' });
    setPage(1);
    setSearchTrigger(t => t + 1);
    setData([]);
    setTotal(0);
    setTotales({ cantidad_boletos: 0, vendido: 0, retenido: 0 });
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const inputCls = "border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none w-full";
  const labelCls = "text-[9px] font-semibold text-slate-400 uppercase mb-0.5";

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <i className="fas fa-id-card text-indigo-600 text-lg"></i>
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-800">Buseros</h1>
          <p className="text-[11px] text-slate-500">Reporte de ventas y retenido por busero</p>
        </div>
      </div>

      {/* Toolbar de totales */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex items-center justify-end gap-6">
        <span className="text-xs font-bold text-emerald-700">
          <i className="fas fa-file-invoice mr-1"></i> Facturas: <span className="text-lg">{totales.cantidad_boletos || 0}</span>
        </span>
        <span className="text-xs font-bold text-emerald-700">
          <i className="fas fa-dollar-sign mr-1"></i> Venta: <span className="text-lg">${parseFloat(totales.vendido || 0).toFixed(2)}</span>
        </span>
        <span className="text-xs font-bold text-rose-600">
          <i className="fas fa-hand-holding-usd mr-1"></i> Retenido: <span className="text-lg">${parseFloat(totales.retenido || 0).toFixed(2)}</span>
        </span>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          <i className="fas fa-filter mr-1.5"></i> Búsqueda
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Socio */}
          <div className="flex flex-col">
            <label className={labelCls}>Socio</label>
            <div className="flex gap-1">
              <input type="text" value={filters.personal_busqueda} onChange={e => updateFilter('personal_busqueda', e.target.value)}
                className={inputCls} placeholder="Nombre socio..." />
              <button onClick={() => setModalBusqueda('socio')}
                className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] hover:bg-emerald-700"
                title="Buscar Socio">
                <i className="fas fa-share-square"></i>
              </button>
            </div>
          </div>

          {/* Rutas */}
          <div className="flex flex-col">
            <label className={labelCls}>Rutas</label>
            <div className="flex gap-1">
              <input type="text" value={filters.rutas_busqueda} onChange={e => updateFilter('rutas_busqueda', e.target.value)}
                className={inputCls} placeholder="Nombre ruta..." />
              <button onClick={() => setModalBusqueda('ruta')}
                className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] hover:bg-emerald-700"
                title="Buscar Ruta">
                <i className="fas fa-share-square"></i>
              </button>
            </div>
          </div>

          {/* Bus */}
          <div className="flex flex-col">
            <label className={labelCls}>Bus</label>
            <div className="flex gap-1">
              <input type="text" value={filters.bus_busqueda} onChange={e => updateFilter('bus_busqueda', e.target.value)}
                className={inputCls} placeholder="Placa..." />
              <button onClick={() => setModalBusqueda('bus')}
                className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] hover:bg-emerald-700"
                title="Buscar Bus">
                <i className="fas fa-share-square"></i>
              </button>
            </div>
          </div>

          {/* Mes */}
          <div className="flex flex-col">
            <label className={labelCls}>Mes</label>
            <select value={filters.comboMes} onChange={e => updateFilter('comboMes', e.target.value)}
              className={inputCls}>
              {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Año */}
          <div className="flex flex-col">
            <label className={labelCls}>Año</label>
            <select value={filters.comboAnioFactura} onChange={e => updateFilter('comboAnioFactura', e.target.value)}
              className={inputCls}>
              {ANIOS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          {/* Fecha */}
          <div className="flex flex-col">
            <label className={labelCls}>Fecha Salida</label>
            <input type="date" value={filters.buscarPorFechaDesde} onChange={e => updateFilter('buscarPorFechaDesde', e.target.value)}
              className={inputCls} />
          </div>
        </div>

        {/* Labels de selección + botones */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-4 text-[11px] font-bold text-slate-600">
            <span className={selectedLabels.socio.includes('Ninguno') ? 'text-slate-400' : 'text-blue-600'}>{selectedLabels.socio}</span>
            <span className={selectedLabels.ruta.includes('Ninguna') ? 'text-slate-400' : 'text-blue-600'}>{selectedLabels.ruta}</span>
            <span className={selectedLabels.bus.includes('Ninguno') ? 'text-slate-400' : 'text-blue-600'}>{selectedLabels.bus}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSearch}
              className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors">
              <i className="fas fa-search"></i> Buscar
            </button>
            <button onClick={handleClear}
              className="flex items-center gap-1 px-4 py-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600 transition-colors">
              <i className="fas fa-eraser"></i> Limpiar
            </button>
          </div>
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
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">SOCIO</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">DISCO</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">VIAJE</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">RUTA</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">FECHA</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider"># FACTURAS</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">VENTA</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">RETENIDO</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400">Sin datos para mostrar</td></tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={row.viaje || idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-bold">{row.socio || '-'}</td>
                      <td className="px-3 py-2 font-mono font-bold text-blue-600">{row.disco || '-'}</td>
                      <td className="px-3 py-2">#{row.viaje || '-'}</td>
                      <td className="px-3 py-2">{row.nombre_rutas || '-'}</td>
                      <td className="px-3 py-2">{row.fecha ? row.fecha.split(' ')[0] : '-'}</td>
                      <td className="px-3 py-2 text-right font-bold">{row.cantidad_boletos || 0}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">${parseFloat(row.vendido || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-bold text-rose-600">${parseFloat(row.retenido || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px]">
            <span className="text-slate-500">
              Mostrando {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, total)} de {total}
            </span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(1)}
                className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100">
                <i className="fas fa-angle-double-left text-[9px]"></i>
              </button>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100">
                <i className="fas fa-chevron-left text-[9px]"></i>
              </button>
              <span className="px-2 py-1 font-bold text-slate-600">Pág. {page}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100">
                <i className="fas fa-chevron-right text-[9px]"></i>
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100">
                <i className="fas fa-angle-double-right text-[9px]"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Búsqueda Socio */}
      {modalBusqueda === 'socio' && (
        <BusquedaPersonalModal
          onSelect={(id, nombre) => {
            setFilters(prev => ({ ...prev, id_personal: String(id), personal_busqueda: nombre }));
            setSelectedLabels(prev => ({ ...prev, socio: `Socio:${nombre}` }));
            setModalBusqueda(null);
          }}
          onClose={() => setModalBusqueda(null)}
        />
      )}

      {/* Modal Búsqueda Ruta */}
      {modalBusqueda === 'ruta' && (
        <BusquedaRutaModal
          onSelect={(id, nombre) => {
            setFilters(prev => ({ ...prev, id_ruta_busqueda: String(id), rutas_busqueda: nombre }));
            setSelectedLabels(prev => ({ ...prev, ruta: `Ruta:${nombre}` }));
            setModalBusqueda(null);
          }}
          onClose={() => setModalBusqueda(null)}
        />
      )}

      {/* Modal Búsqueda Bus */}
      {modalBusqueda === 'bus' && (
        <BusquedaBusModal
          filterMode={true}
          onSelect={(busId, placa) => {
            setFilters(prev => ({ ...prev, id_bus_busqueda: String(busId), bus_busqueda: placa }));
            setSelectedLabels(prev => ({ ...prev, bus: `Bus:${placa}` }));
            setModalBusqueda(null);
          }}
          onClose={() => setModalBusqueda(null)}
        />
      )}
    </div>
  );
};
