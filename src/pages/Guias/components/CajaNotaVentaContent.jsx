import { useState, useEffect, useCallback } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Modal from '../../../components/common/Modal';
import toast from 'react-hot-toast';
import cajaService from '../../../services/cajaNotaVenta.service';
import { useAuth } from '../../../hooks/useAuth';
import { AperturaCajaForm } from '../../CajaBoleteria/components/AperturaCajaForm';
import { CierreCajaForm } from '../../CajaBoleteria/components/CierreCajaForm';
import InfoComprobanteModal from '../../../components/common/InfoComprobanteModal';
import ConfirmationModal from '../../../components/common/ConfirmationModal';

/**
 * Módulo de Cajas para Notas de Venta.
 * Replica CajaPage.jsx con las mismas funciones:
 * listado, apertura, cierre, comprobante, detalle, editar, arqueo, solicitudes.
 */
export const CajaNotaVentaContent = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [openCaja, setOpenCaja] = useState(null);

  // Modales
  const [showApertura, setShowApertura] = useState(false);
  const [showCierre, setShowCierre] = useState(false);
  const [cajaParaCierre, setCajaParaCierre] = useState(null);
  const [showDetalle, setShowDetalle] = useState(false);
  const [detalleData, setDetalleData] = useState([]);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleCajaId, setDetalleCajaId] = useState(null);
  const [detalleCajaNum, setDetalleCajaNum] = useState('');

  // Modales React propios
  const [infoCompOpen, setInfoCompOpen] = useState(false);
  const [infoCompRow, setInfoCompRow] = useState(null);
  const [confirmSolicitudOpen, setConfirmSolicitudOpen] = useState(false);
  const [solicitudRow, setSolicitudRow] = useState(null);
  const [confirmAprobarOpen, setConfirmAprobarOpen] = useState(false);
  const [aprobarRow, setAprobarRow] = useState(null);

  // Filtros y paginación
  const [filters, setFilters] = useState({ desde: '', hasta: '', estado: '' });
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  // ─── LISTADO ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, page: pagination.pageIndex + 1, limit: pagination.pageSize };
      const res = await cajaService.listadoCaja(params);
      if (res.success) {
        setData(Array.isArray(res.data) ? res.data : []);
        setTotalRecords(res.total || 0);
      } else {
        setData([]);
      }
    } catch (err) {
      setData([]);
      toast.error('Error al cargar cajas');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── VALIDAR CAJA ABIERTA ──────────────────────────────────────────────
  useEffect(() => {
    cajaService.validarCaja().then(res => {
      if (res.success) setOpenCaja(res.data);
      else setOpenCaja(null);
    }).catch(() => setOpenCaja(null));
  }, []);

  // ─── APERTURA DE CAJA ────────────────────────────────────────────────
  const handleApertura = async (formData) => {
    const res = await cajaService.insertarAperturaCaja(formData);
    if (res.success) { toast.success('Caja aperturada correctamente'); loadData(); setShowApertura(false); }
    else toast.error(res.message || 'Error al aperturar');
  };

  // ─── CIERRE DE CAJA ────────────────────────────────────────────────────
  const openCierreModal = (caja) => {
    if (!caja || caja.estado_caja === 'CERRADA') { toast.error('La caja ya está cerrada'); return; }
    setCajaParaCierre(caja);
    setShowCierre(true);
  };

  const handleCierreSubmit = async (formData) => {
    const res = await cajaService.cerrarCaja({ ...formData, id_caja: cajaParaCierre.id_caja });
    if (res.success) {
      let msg = 'Caja cerrada correctamente';
      if (res.estado_cuadre === 'CUADRADO') msg += '. Caja cuadrada.';
      else if (res.estado_cuadre === 'FALTANTE') msg += `. Faltante de $${res.valor_diferencia}`;
      else if (res.estado_cuadre === 'SOBRANTE') msg += `. Sobrante de $${res.valor_diferencia}`;
      toast.success(msg);
      loadData();
      setShowCierre(false);
    } else toast.error(res.message || 'Error al cerrar');
  };

  // ─── INFO COMPROBANTE ──────────────────────────────────────────────────
  const handleInfoComprobante = (row) => {
    setInfoCompRow(row);
    setInfoCompOpen(true);
  };

  const handleConfirmInfoComp = async (formValues) => {
    if (!infoCompRow) return;
    const res = await cajaService.guardarInfoComprobante({ id_caja: infoCompRow.id_caja, ...formValues });
    if (res.success) { toast.success('Comprobante guardado'); loadData(); }
    else toast.error(res.message || 'Error');
    setInfoCompOpen(false);
    setInfoCompRow(null);
  };

  // ─── DETALLE DE CAJA ───────────────────────────────────────────────────
  const handleVerDetalle = async (row) => {
    setDetalleCajaId(row.id_caja);
    setDetalleCajaNum(row.numero_caja);
    setShowDetalle(true);
    setDetalleLoading(true);
    try {
      const res = await cajaService.listadoDetalleCaja(row.id_caja);
      setDetalleData(res.data || []);
    } catch {
      toast.error('Error al cargar detalle');
      setDetalleData([]);
    } finally {
      setDetalleLoading(false);
    }
  };

  // ─── EDITAR CAJA (simplificado, redirige al detalle) ───────────────────
  const handleEditar = (row) => {
    if (row.estado_caja === 'CERRADA') {
      toast.error('No se puede editar una caja cerrada');
      return;
    }
    handleVerDetalle(row);
  };

  // ─── ARQUEO PDF ────────────────────────────────────────────────────────
  const handleArqueo = async (row) => {
    try {
      const res = await cajaService.arqueoCajaPdf(row.id_caja);
      if (res.success && res.url) {
        window.open(res.url, '_blank');
      } else {
        toast.error(res.message || 'No se pudo generar el arqueo');
      }
    } catch {
      toast.error('Error al generar arqueo');
    }
  };

  // ─── COMPROBANTES ─────────────────────────────────────────────────────
  const handleComprobantes = (row) => {
    window.open(`/caja_nota_venta/reportecomprobantefacturasxcaja?idcaja=${row.id_caja}`, '_blank');
  };

  // ─── SOLICITUD EDICIÓN ─────────────────────────────────────────────────
  const handleSolicitudEdicion = (row) => {
    setSolicitudRow(row);
    setConfirmSolicitudOpen(true);
  };

  const handleConfirmSolicitud = async () => {
    if (!solicitudRow) return;
    const res = await cajaService.enviarSolicitudEdicion(solicitudRow.id_caja);
    if (res.success) toast.success('Solicitud enviada correctamente');
    else toast.error(res.message || 'Error al enviar solicitud');
    setConfirmSolicitudOpen(false);
    setSolicitudRow(null);
  };

  // ─── APROBAR SOLICITUD ─────────────────────────────────────────────────
  const handleAprobarSolicitud = (row) => {
    setAprobarRow(row);
    setConfirmAprobarOpen(true);
  };

  const handleConfirmAprobar = async () => {
    if (!aprobarRow) return;
    const res = await cajaService.aprobarSolicitud(aprobarRow.id_caja);
    if (res.success) { toast.success('Solicitud aprobada'); loadData(); }
    else toast.error(res.message || 'Error al aprobar');
    setConfirmAprobarOpen(false);
    setAprobarRow(null);
  };

  // ─── IMPRESIÓN RÁPIDA ────────────────────────────────────────────────
  const handleImpresionRapida = (row) => {
    const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
    window.open(`${baseUrl}/php/pdfCajaImpresion.php?id_caja=${row.id_caja}`, '_blank');
  };

  // ─── BUSCAR MI CAJA ABIERTA ──────────────────────────────────────────
  const handleBuscarMiCaja = () => {
    setFilters(p => ({ ...p, apertura: '1', estado: '', desde: '', hasta: '' }));
    setPagination(p => ({ ...p, pageIndex: 0 }));
    toast.success('Buscando tu caja abierta...', { duration: 1500 });
  };

  // ─── PAGINACIÓN ────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalRecords / pagination.pageSize));
  const canPrev = pagination.pageIndex > 0;
  const canNext = pagination.pageIndex < totalPages - 1;

  const handlePrev = () => setPagination(p => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }));
  const handleNext = () => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }));

  // ─── ESTADO BADGE ──────────────────────────────────────────────────────
  const renderEstado = (val) => {
    const ap = val === 'APERTURADA';
    return (
      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${ap ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
        {val || 'CERRADA'}
      </span>
    );
  };

  const renderSolicitud = (val) => {
    if (val == 0 || val == null) return <span title="Sin solicitud"><i className="fas fa-info-circle text-slate-300 text-xs"></i></span>;
    if (val == 1 || val === 'PENDIENTE') return <span title="Solicitud Enviada"><i className="fas fa-info-circle text-amber-500 text-xs"></i></span>;
    if (val == 2 || val === 'APROBADA') return <span title="Solicitud Aprobada"><i className="fas fa-info-circle text-emerald-500 text-xs"></i></span>;
    return '-';
  };

  const renderCuadre = (val) => {
    if (!val) return <span className="text-slate-400">-</span>;
    let cls = 'text-slate-600';
    if (val === 'CUADRADO') cls = 'text-emerald-600 font-bold';
    else if (val?.includes('FALTANTE')) cls = 'text-red-600 font-bold';
    else if (val?.includes('SOBRANTE')) cls = 'text-amber-600 font-bold';
    return <span className={`${cls} text-[10px] font-mono`}>{val}</span>;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── FILTROS ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-white">
        <div className="flex items-center gap-1.5 text-slate-400">
          <i className="fas fa-filter text-[10px]"></i>
          <span className="text-[9px] font-black uppercase tracking-tighter">Filtros:</span>
        </div>
        <input type="date" value={filters.desde}
          onChange={e => setFilters(p => ({ ...p, desde: e.target.value }))}
          className="h-8 px-2 text-[10px] border border-slate-200 rounded-lg font-bold text-slate-700 w-[160px]" />
        <input type="date" value={filters.hasta}
          onChange={e => setFilters(p => ({ ...p, hasta: e.target.value }))}
          className="h-8 px-2 text-[10px] border border-slate-200 rounded-lg font-bold text-slate-700 w-[160px]" />
        <select value={filters.estado}
          onChange={e => setFilters(p => ({ ...p, estado: e.target.value }))}
          className="h-8 px-2 text-[10px] border border-slate-200 rounded-lg font-bold text-slate-700 w-[150px]">
          <option value="">Estado: TODOS</option>
          <option value="APERTURADA">APERTURADA</option>
          <option value="CERRADA">CERRADA</option>
        </select>
        <button onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))} disabled={loading}
          className="h-8 px-4 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black rounded-lg flex items-center gap-2 active:scale-95 disabled:opacity-70 uppercase tracking-widest">
          <i className="fas fa-search"></i> BUSCAR
        </button>
        <button onClick={handleBuscarMiCaja} disabled={loading}
          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg flex items-center gap-2 active:scale-95 uppercase tracking-wider">
          <i className="fas fa-door-open"></i> BUSCAR MI CAJA ABIERTA
        </button>
        <button onClick={() => { setFilters({ desde: '', hasta: '', estado: '' }); setPagination(p => ({ ...p, pageIndex: 0 })); }}
          className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg" title="Limpiar">
          <i className="fas fa-eraser text-xs"></i>
        </button>
        {openCaja && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
              <i className="fas fa-lock-open mr-1"></i> Caja Abierta: #{openCaja.numero_caja || openCaja.id_caja}
            </span>
          </div>
        )}
        <button onClick={() => setShowApertura(true)}
            className="h-8 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-black rounded-lg flex items-center gap-2 active:scale-95 uppercase ml-auto">
            <i className="fas fa-cash-register"></i> Nueva Apertura
          </button>
      </div>

      {/* ── GRID ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-white flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-[1] border-b border-slate-200">
              <tr>
                <th className="py-2 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-10 text-center">#</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">N° CAJA</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">FECHA</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">FECHA CIERRE</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">SUCURSAL</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">USUARIO</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">ESTADO</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">($)APERTURA</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">($)CIERRE</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">($)MONTO A TENER</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">CUADRE</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">SOLICITUD</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">COMPROBANTE</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">BANCO</th>
                <th className="py-2 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(15).fill(0).map((_, j) => <td key={j} className="py-2 px-3"><Skeleton height={12} /></td>)}
                  </tr>
                ))
              ) : (Array.isArray(data) && data.length > 0) ? (
                data.map((row, i) => (
                  <tr key={row.id_caja || i} className="group hover:bg-indigo-50/30 transition-all">
                    <td className="py-2 px-4 text-slate-400 font-mono text-[9px] text-center">{pagination.pageIndex * pagination.pageSize + i + 1}</td>
                    <td className="py-2 px-3 text-blue-600 font-bold text-[11px] font-mono">{row.numero_caja || '-'}</td>
                    <td className="py-2 px-3 text-slate-600 text-[10px]">{row.fecha_caja ? row.fecha_caja.split(' ')[0] : '-'}</td>
                    <td className="py-2 px-3 text-slate-600 text-[10px]">{row.fecha_hora_cierre ? row.fecha_hora_cierre.split(' ')[0] : '-'}</td>
                    <td className="py-2 px-3 text-slate-600 text-[10px]">{row.nombre_sucursal || '-'}</td>
                    <td className="py-2 px-3 text-slate-600 text-[10px]">{row.usuario || '-'}</td>
                    <td className="py-2 px-3 text-center">{renderEstado(row.estado_caja)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-[11px] text-slate-800">
                      ${parseFloat(row.apertura_total_caja || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-[11px] text-slate-800">
                      {row.cierre_total_caja ? `$${parseFloat(row.cierre_total_caja).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[11px] text-emerald-600">
                      ${parseFloat(row.monto_a_tener ?? row.apertura_total_caja ?? 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-3">{renderCuadre(row.cuadre_caja)}</td>
                    <td className="py-2 px-3 text-center">{renderSolicitud(row.estado_solicitud)}</td>
                    <td className="py-2 px-3 text-slate-600 text-[10px]">{row.numero_comprobante_cierre || '-'}</td>
                    <td className="py-2 px-3 text-slate-600 text-[10px]">{row.banco_cierre || '-'}</td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {[
                          {a:() => handleInfoComprobante(row), i:'fa-vote-yea', c:'text-indigo-500 hover:bg-indigo-50', t:'Info Comprobante'},
                          {a:() => handleVerDetalle(row), i:'fa-list', c:'text-blue-500 hover:bg-blue-50', t:'Ver Detalle Movimientos'},
                          {a:() => handleImpresionRapida(row), i:'fa-print', c:'text-slate-600 hover:bg-slate-100', t:'Impresión Rápida'},
                          {a:() => handleArqueo(row), i:'fa-file-pdf', c:'text-red-500 hover:bg-red-50', t:'Arqueo PDF'},
                          {a:() => handleComprobantes(row), i:'fa-file-invoice', c:'text-red-500 hover:bg-red-50', t:'Reporte Comprobantes'},
                          {a:() => handleEditar(row), i:'fa-edit', c:'text-amber-500 hover:bg-amber-50', t:'Editar Caja'},
                          row.estado_caja === 'APERTURADA' ? {a:() => openCierreModal(row), i:'fa-sign-out-alt', c:'text-rose-500 hover:bg-rose-50', t:'Cerrar Caja'} : null,
                          row.estado_caja === 'CERRADA' && row.estado_solicitud != 1 ? {a:() => handleSolicitudEdicion(row), i:'fa-share-square', c:'text-purple-500 hover:bg-purple-50', t:'Solicitud Edición'} : null,
                          row.estado_solicitud == 1 || row.estado_solicitud === 'PENDIENTE' ? {a:() => handleAprobarSolicitud(row), i:'fa-check-circle', c:'text-emerald-600 hover:bg-emerald-50', t:'Aprobar Solicitud'} : null,
                        ].filter(Boolean).map((b, idx) => (
                          <button key={idx} onClick={b.a} title={b.t}
                            className={`w-7 h-7 rounded ${b.c} flex items-center justify-center transition-colors`}>
                            <i className={`fas ${b.i} text-[10px]`}></i>
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={14} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fas fa-folder-open text-xl text-slate-200"></i>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin registros de cajas</p>
                    </div>
                  </td>
                </tr>

              )}
            </tbody>
          </table>
        </div>

        {/* Paginador */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {totalRecords > 0
              ? `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRecords)} DE ${totalRecords}`
              : '0 REGISTROS'}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={handlePrev} disabled={!canPrev || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 transition-all active:scale-90">
              <i className="fas fa-chevron-left text-[8px]"></i>
            </button>
            <div className="px-3 h-7 flex items-center justify-center bg-white rounded-lg border border-slate-200 text-[9px] font-black text-slate-700 min-w-[80px] uppercase tracking-tighter">
              PÁG {pagination.pageIndex + 1} / {totalPages || 1}
            </div>
            <button onClick={handleNext} disabled={!canNext || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 transition-all active:scale-90">
              <i className="fas fa-chevron-right text-[8px]"></i>
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: Apertura de Caja ──────────────────────────────── */}
      {showApertura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex-1 overflow-y-auto p-6">
              <AperturaCajaForm
                onSubmit={handleApertura}
                onCancel={() => setShowApertura(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Cierre de Caja ──────────────────────────────── */}
      {showCierre && cajaParaCierre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex-1 overflow-y-auto p-6">
              <CierreCajaForm
                cajaActual={cajaParaCierre}
                onSubmit={handleCierreSubmit}
                onCancel={() => setShowCierre(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Detalle de Caja ──────────────────────────────── */}
      {showDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-white text-lg font-bold flex items-center gap-2">
                <i className="fas fa-list text-blue-400"></i> DETALLE DE CAJA #{detalleCajaNum}
              </h2>
              <button onClick={() => { setShowDetalle(false); setDetalleData([]); }}
                className="text-slate-400 hover:text-white transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {detalleLoading ? (
                <div className="flex items-center justify-center py-12">
                  <i className="fas fa-spinner fa-spin text-2xl text-blue-500 mr-3"></i>
                  <span className="text-slate-500 font-medium">Cargando detalle...</span>
                </div>
              ) : detalleData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <i className="fas fa-inbox text-4xl mb-3"></i>
                  <p className="font-medium">No hay movimientos en esta caja.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">TIPO</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">MONTO</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">OBSERVACIÓN</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">SOCIO</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">DOCUMENTO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detalleData.map((d, i) => (
                        <tr key={d.id_caja_detalle || i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{i + 1}</td>
                          <td className="px-4 py-3 text-xs">
                            <span className={`px-2 py-0.5 rounded-full font-medium ${
                              d.tipo_caja_detalle === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {d.tipo_caja_detalle === 1 ? 'INGRESO' : 'EGRESO'}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-semibold text-xs ${
                            d.tipo_caja_detalle === 1 ? 'text-green-700' : 'text-red-700'
                          }`}>
                            ${parseFloat(d.monto_caja_detalle || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{d.observacion_caja_detalle || '-'}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{d.nombre_socio || '-'}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{d.numero_documento || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 border-t border-slate-100 px-6 py-3 flex justify-end">
              <button onClick={() => { setShowDetalle(false); setDetalleData([]); }}
                className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-md font-medium transition-colors text-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALES REACT ──────────────────────────────────────────── */}
      <InfoComprobanteModal
        isOpen={infoCompOpen}
        onClose={() => { setInfoCompOpen(false); setInfoCompRow(null); }}
        onConfirm={handleConfirmInfoComp}
        initialNumero={infoCompRow?.numero_comprobante_cierre || ''}
        initialBanco={infoCompRow?.banco_cierre || ''}
      />

      <ConfirmationModal
        isOpen={confirmSolicitudOpen}
        onClose={() => { setConfirmSolicitudOpen(false); setSolicitudRow(null); }}
        onConfirm={handleConfirmSolicitud}
        title="¿Enviar solicitud de edición?"
        message={`Se enviará una solicitud para editar la caja #${solicitudRow?.numero_caja || ''}`}
        confirmText="Sí, enviar"
        type="info"
      />

      <ConfirmationModal
        isOpen={confirmAprobarOpen}
        onClose={() => { setConfirmAprobarOpen(false); setAprobarRow(null); }}
        onConfirm={handleConfirmAprobar}
        title="¿Aprobar solicitud?"
        message={`Se aprobará la solicitud de edición de la caja #${aprobarRow?.numero_caja || ''}`}
        confirmText="Sí, aprobar"
        type="info"
      />
    </div>
  );
};
