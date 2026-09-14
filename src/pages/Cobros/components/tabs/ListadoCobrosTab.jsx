import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../../config/axios';
import toast from 'react-hot-toast';
import { buildPdfUrl } from '../../../../utils/pdfUrlUtils';
import { formatCurrency, getYears, MONTHS } from '../../utils/cobrosHelpers';

import { PdfPreviewModal } from '../modals/PdfPreviewModal';
import { CobrosRealizadosModal } from '../modals/CobrosRealizadosModal';
import { CobrarModal } from '../modals/CobrarModal';
import { NuevoCobroModal } from '../modals/NuevoCobroModal';
import { CobrarMasivoModal } from '../modals/CobrarMasivoModal';
import { RetencionesMasivasModal } from '../modals/RetencionesMasivasModal';
import { EntregarCobroModal } from '../modals/EntregarCobroModal';

export const ListadoCobrosTab = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [buses, setBuses] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  // Modales React
  const [pdfModal, setPdfModal] = useState(null);
  const [cobrosRealizadosRow, setCobrosRealizadosRow] = useState(null);
  const [cobrarRow, setCobrarRow] = useState(null);
  const [nuevoCobroOpen, setNuevoCobroOpen] = useState(false);
  const [cobrarMasivoOpen, setCobrarMasivoOpen] = useState(false);
  const [retencionesMasivasOpen, setRetencionesMasivasOpen] = useState(false);
  const [entregarRow, setEntregarRow] = useState(null);

  // Filtros
  const [filters, setFilters] = useState({
    bus_busqueda: '',
    estado_busqueda: 'all',
    mes_busqueda: '',
    anio_busqueda: '',
    fecha_desde: '',
    fecha_hasta: '',
    sucursal_busqueda: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: pageSize,
        page,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
      };
      const res = await api.get('/cobro/listadoCobros', { params });
      if (res.data?.success) {
        setData(res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar listado de cobros');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  // Cargar buses y sucursales para filtros
  useEffect(() => {
    api.get('/buses/seleccionarBuses', { params: { limit: 200 } }).then(r => {
      if (r.data?.success) setBuses(r.data.data || []);
    }).catch(() => {});
    api.get('/sucursal/sucursalselect', { params: { limit: 100 } }).then(r => {
      if (r.data?.success) setSucursales(r.data.data || []);
    }).catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  // ─── ACCIONES ────────────────────────────────────────────
  const handleCobrar = async (row) => {
    if (row.estado_cobros == 1) {
      toast('El cobro ya está pagado', { icon: 'ℹ️' });
      return;
    }
    // Validar caja aperturada
    try {
      const cajaRes = await api.post('/cajaretenciones/validarcaja');
      if (cajaRes.data?.message != 1) {
        toast.error('No hay una caja aperturada. Abra una caja primero.');
        return;
      }
    } catch { /* si no existe el endpoint, continuar */ }

    setCobrarRow(row);
  };

  const handlePdfRetencion = (row) => {
    const url = buildPdfUrl(`/php/pdfRetencion.php?id_cobros=${row.id_cobros}`);
    setPdfModal({ url, title: `Retención #${row.id_cobros} — Bus ${row.disco_buses || ''}` });
  };

  const handleImprimir = (row) => {
    const url = buildPdfUrl(`/php/pdfCobroEntregadoA4.php?id_cobros=${row.id_cobros}`);
    setPdfModal({ url, title: `Comprobante A4 #${row.id_cobros} — Bus ${row.disco_buses || ''}` });
  };

  const handleEntregar = (row) => {
    if (row.estado_cobros != 1) {
      toast.error('El cobro debe estar pagado para poder entregarlo');
      return;
    }
    setEntregarRow(row);
  };

  return (
    <div className="space-y-4">
      {/* Modal PDF Preview */}
      {pdfModal && (
        <PdfPreviewModal
          url={pdfModal.url}
          title={pdfModal.title}
          onClose={() => setPdfModal(null)}
        />
      )}

      {/* Modal Cobros Realizados */}
      {cobrosRealizadosRow && (
        <CobrosRealizadosModal
          cobro={cobrosRealizadosRow}
          onClose={() => setCobrosRealizadosRow(null)}
          onPrint={(c) => {
            setCobrosRealizadosRow(null);
            handleImprimir(c);
          }}
        />
      )}

      {/* Modal Cobrar */}
      {cobrarRow && (
        <CobrarModal
          cobro={cobrarRow}
          onClose={() => setCobrarRow(null)}
          onSuccess={loadData}
        />
      )}

      {/* Modal Nuevo Cobro */}
      {nuevoCobroOpen && (
        <NuevoCobroModal
          buses={buses}
          onClose={() => setNuevoCobroOpen(false)}
          onSuccess={loadData}
        />
      )}

      {/* Modal Cobro Masivo */}
      {cobrarMasivoOpen && (
        <CobrarMasivoModal
          seleccionados={data.filter(d => selectedRows.includes(d.id_cobros))}
          onClose={() => setCobrarMasivoOpen(false)}
          onSuccess={() => {
            setSelectedRows([]);
            loadData();
          }}
        />
      )}

      {/* Modal Retenciones Masivas */}
      {retencionesMasivasOpen && (
        <RetencionesMasivasModal
          onClose={() => setRetencionesMasivasOpen(false)}
          onSuccess={loadData}
        />
      )}

      {/* Modal Entregar Cobro */}
      {entregarRow && (
        <EntregarCobroModal
          cobro={entregarRow}
          onClose={() => setEntregarRow(null)}
          onSuccess={loadData}
        />
      )}

      {/* Barra de acciones superior */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-700 p-3 rounded-lg shadow">
        <div className="flex gap-2">
          <button
            onClick={() => setNuevoCobroOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm"
          >
            <i className="fas fa-plus-circle"></i> Nuevo Cobro
          </button>
          <button
            onClick={() => {
              if (selectedRows.length === 0) {
                toast.error('Seleccione al menos un cobro');
                return;
              }
              setCobrarMasivoOpen(true);
            }}
            disabled={selectedRows.length === 0}
            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-700 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
          >
            <i className="fas fa-money-bill-wave"></i> Cobrar Masivo ({selectedRows.length})
          </button>
          <button
            onClick={() => setRetencionesMasivasOpen(true)}
            className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded hover:bg-amber-600 transition flex items-center gap-1.5 shadow-sm"
          >
            <i className="fas fa-file-invoice-dollar"></i> Retenciones Masivas
          </button>
        </div>
        <span className="text-white font-bold text-sm"><i className="fas fa-hand-holding-usd mr-2"></i>Gestión de Cobros</span>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
          <i className="fas fa-filter"></i> Búsqueda de Cobros
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Bus</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.bus_busqueda}
              onChange={e => setFilters(f => ({ ...f, bus_busqueda: e.target.value }))}>
              <option value="">Todos</option>
              {buses.map(b => <option key={b.id_buses} value={b.id_buses}>{b.disco_buses}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Estado</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.estado_busqueda}
              onChange={e => setFilters(f => ({ ...f, estado_busqueda: e.target.value }))}>
              <option value="all">Todos</option>
              <option value="cobrado">Cobrado</option>
              <option value="por_cobrar">Por Cobrar</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Mes</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.mes_busqueda}
              onChange={e => setFilters(f => ({ ...f, mes_busqueda: e.target.value }))}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Año</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.anio_busqueda}
              onChange={e => setFilters(f => ({ ...f, anio_busqueda: e.target.value }))}>
              {getYears().map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha Desde</label>
            <input type="date" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.fecha_desde}
              onChange={e => setFilters(f => ({ ...f, fecha_desde: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha Hasta</label>
            <input type="date" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.fecha_hasta}
              onChange={e => setFilters(f => ({ ...f, fecha_hasta: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Sucursal</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.sucursal_busqueda}
              onChange={e => setFilters(f => ({ ...f, sucursal_busqueda: e.target.value }))}>
              <option value="">Todas</option>
              {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre_sucursal}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-1">
            <button onClick={loadData} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition flex-1">
              <i className="fas fa-search mr-1"></i> Buscar
            </button>
            <button onClick={() => {
              setFilters({ bus_busqueda: '', estado_busqueda: 'all', mes_busqueda: '', anio_busqueda: '', fecha_desde: '', fecha_hasta: '', sucursal_busqueda: '' });
              setPage(1);
            }} className="px-3 py-1.5 bg-slate-400 text-white text-xs font-bold rounded hover:bg-slate-500 transition">
              <i className="fas fa-eraser"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 text-left w-8">
                  <input type="checkbox" onChange={e => {
                    if (e.target.checked) setSelectedRows(data.map(d => d.id_cobros));
                    else setSelectedRows([]);
                  }} checked={selectedRows.length === data.length && data.length > 0} />
                </th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">ID</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Tipo</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Bus</th>
                <th className="px-3 py-2.5 text-right font-bold text-slate-600">Monto</th>
                <th className="px-3 py-2.5 text-right font-bold text-slate-600">Cobrado</th>
                <th className="px-3 py-2.5 text-right font-bold text-slate-600">Por Cobrar</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Usuario</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Sucursal</th>
                <th className="px-3 py-2.5 text-center font-bold text-slate-600">Estado</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Fecha</th>
                <th className="px-3 py-2.5 text-center w-24 font-bold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-8 text-slate-400">
                  <i className="fas fa-spinner fa-spin text-lg text-emerald-600 mb-2 block"></i> Cargando...
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-slate-400">
                  <i className="fas fa-inbox text-2xl mb-2 block"></i> No hay cobros registrados
                </td></tr>
              ) : data.map(row => (
                <tr key={row.id_cobros} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selectedRows.includes(row.id_cobros)}
                      onChange={e => {
                        if (e.target.checked) setSelectedRows(p => [...p, row.id_cobros]);
                        else setSelectedRows(p => p.filter(id => id !== row.id_cobros));
                      }} />
                  </td>
                  <td className="px-3 py-2 font-medium">#{row.id_cobros}</td>
                  <td className="px-3 py-2">{row.nombre_tipo_cobros}</td>
                  <td className="px-3 py-2 font-bold">{row.disco_buses}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.monto_cobros)}</td>
                  <td className="px-3 py-2 text-right text-emerald-600 font-medium">{formatCurrency(row.total_pagado)}</td>
                  <td className="px-3 py-2 text-right text-amber-600 font-bold">{formatCurrency(row.saldo_pendiente)}</td>
                  <td className="px-3 py-2">{row.nombre_usuario}</td>
                  <td className="px-3 py-2">{row.nombre_sucursal}</td>
                  <td className="px-3 py-2 text-center">
                    {row.estado_cobros == 1
                      ? <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Pagado</span>
                      : row.estado_cobros == 3
                        ? <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">Anulado</span>
                        : <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">No Pagado</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-slate-500">{row.fecha_cobros?.split(' ')[0] || row.fecha_cobros}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handlePdfRetencion(row)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="PDF Retención">
                        <i className="fas fa-file-pdf text-sm"></i>
                      </button>
                      <button onClick={() => handleImprimir(row)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Imprimir Comprobante A4">
                        <i className="fas fa-print text-sm"></i>
                      </button>
                      <button onClick={() => handleCobrar(row)} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded" title="Cobrar">
                        <i className="fas fa-hand-holding-usd text-sm"></i>
                      </button>
                      <button onClick={() => setCobrosRealizadosRow(row)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded" title="Cobros Realizados">
                        <i className="fas fa-receipt text-sm"></i>
                      </button>
                      <button onClick={() => handleEntregar(row)} className="p-1 text-amber-500 hover:bg-amber-50 rounded" title="Entregar">
                        <i className="fas fa-money-bill-wave text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Mostrar:</span>
            <select className="border border-slate-300 rounded px-2 py-1 text-xs" value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>| Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} de {total} registros</span>
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-30">Anterior</button>
            <span className="px-3 py-1 text-xs font-bold text-slate-600">Pág. {page} de {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-30">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
};
