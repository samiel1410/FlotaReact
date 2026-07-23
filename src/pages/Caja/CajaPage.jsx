import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import cajaService from '../../services/caja.service';
import { CajaGrid } from './CajaGrid';
import Modal from '../../components/common/Modal';
import { CajaForm } from './components/CajaForm';
import { AperturaCajaForm } from '../CajaBoleteria/components/AperturaCajaForm';
import { CierreCajaForm } from '../CajaBoleteria/components/CierreCajaForm';
import InfoComprobanteModal from '../../components/common/InfoComprobanteModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import IngresoEgresoModal from '../../components/common/IngresoEgresoModal';

export const CajaPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [openCaja, setOpenCaja] = useState(null);

  // Modales React
  const [showModal, setShowModal] = useState(false);
  const [showApertura, setShowApertura] = useState(false);
  const [showCierre, setShowCierre] = useState(false);
  const [cajaParaCierre, setCajaParaCierre] = useState(null);
  const [showDetalle, setShowDetalle] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [detalleData, setDetalleData] = useState([]);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleCajaId, setDetalleCajaId] = useState(null);
  const [detalleCajaNum, setDetalleCajaNum] = useState('');

  // Modales de Acción (Info Comprobante, Aprobar Solicitud, Ingreso/Egreso)
  const [infoCompModalOpen, setInfoCompModalOpen] = useState(false);
  const [selectedRowForInfo, setSelectedRowForInfo] = useState(null);

  const [confirmAprobarOpen, setConfirmAprobarOpen] = useState(false);
  const [selectedRowForAprobar, setSelectedRowForAprobar] = useState(null);

  const [ingresoEgresoModalOpen, setIngresoEgresoModalOpen] = useState(false);
  const [cajaIdForMovimiento, setCajaIdForMovimiento] = useState(null);

  const [filterFecha, setFilterFecha] = useState(new Date());

  // Filtros y paginación
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  // ─── LISTADO ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, page: pagination.pageIndex + 1, limit: pagination.pageSize };
      const res = await cajaService.listadoCaja(params);
      if (res.success) {
        setData(res.data || []);
        setTotalRecords(res.total || 0);
      }
    } catch (err) { toast.error('Error al cargar cajas'); }
    finally { setLoading(false); }
  }, [filters, pagination]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── VALIDAR CAJA ABIERTA ──────────────────────────────────────────────
  useEffect(() => {
    cajaService.validarCaja().then(res => {
      if (res.success) setOpenCaja(res.data);
      else setOpenCaja(null);
    }).catch(() => setOpenCaja(null));
  }, []);

  // ─── MODAL APERTURA ────────────────────────────────────────────────────
  const handleApertura = async (formData) => {
    const res = await cajaService.insertarAperturaCaja(formData);
    if (res.success) { toast.success('Caja aperturada correctamente'); loadData(); setShowApertura(false); }
    else toast.error(res.message || 'Error al aperturar');
  };

  // ─── MODAL CIERRE ──────────────────────────────────────────────────────
  const openCierreModal = (caja) => {
    if (!caja || caja.estado_caja === 'CERRADA') { toast.error('La caja ya está cerrada'); return; }
    setCajaParaCierre(caja);
    setShowCierre(true);
  };

  const handleCierre = async (formData) => {
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

  // ─── MODAL INFO COMPROBANTE ────────────────────────────────────────────
  const handleConfirmInfoComprobante = async (formValues) => {
    if (!selectedRowForInfo) return;
    const res = await cajaService.guardarInfoComprobante({
      id_caja: selectedRowForInfo.id_caja,
      ...formValues
    });
    if (res.success) {
      toast.success('Comprobante guardado');
      loadData();
    } else {
      toast.error(res.message || 'Error');
    }
    setInfoCompModalOpen(false);
    setSelectedRowForInfo(null);
  };

  // ─── MODAL DETALLE / EDITAR ────────────────────────────────────────────
  const loadDetalle = async (idCaja) => {
    setDetalleLoading(true);
    try {
      const [detRes, infoRes] = await Promise.all([
        cajaService.listadoDetalleCaja(idCaja),
        cajaService.informacionCaja(idCaja)
      ]);
      setDetalleData(detRes.data || []);
      if (infoRes.success && infoRes.data?.[0]) {
        setDetalleCajaId(infoRes.data[0].id_caja);
        setDetalleCajaNum(infoRes.data[0].numero_caja || '');
      }
    } catch { setDetalleData([]); }
    finally { setDetalleLoading(false); }
  };

  const openModalDetalle = async (row) => {
    setShowDetalle(true);
    await loadDetalle(row.id_caja);
  };

  // ─── ACCIONES DE FILA ─────────────────────────────────────────────────
  const handleAction = useCallback(async (action, row) => {
    switch (action) {
      case 'info-comprobante':
        setSelectedRowForInfo(row);
        setInfoCompModalOpen(true);
        break;
      case 'arqueo':
        try {
          const res = await cajaService.arqueoCajaPdf(row.id_caja);
          if (res.success && res.url) window.open(res.url, '_blank');
          else toast.error('No se pudo generar el arqueo');
        } catch { toast.error('Error al generar arqueo'); }
        break;
      case 'comprobantes':
        window.open(`/caja/reportecomprobantefacturasxcaja?idcaja=${row.id_caja}`, '_blank');
        break;
      case 'editar': await openModalDetalle(row); break;
      case 'cerrar': openCierreModal(row); break;
      case 'solicitud':
        if (row.estado_solicitud == 0) { toast('Sin solicitud de edición'); return; }
        if (row.estado_solicitud == 1) {
          setSelectedRowForAprobar(row);
          setConfirmAprobarOpen(true);
        } else toast('Ya aprobada para editar');
        break;
      case 'impresion-rapida':
        window.open(`/php/pdfCajaImpresion.php?id_caja=${row.id_caja}`, '_blank');
        break;
    }
  }, []);

  const handleEjecutarAprobar = async () => {
    if (!selectedRowForAprobar) return;
    const res = await cajaService.aprobarSolicitud(selectedRowForAprobar.id_caja);
    if (res.success) {
      toast.success('Solicitud aprobada');
      loadData();
    } else toast.error(res.message || 'Error');
    setConfirmAprobarOpen(false);
    setSelectedRowForAprobar(null);
  };

  // ─── MODAL INGRESO/EGRESO ─────────────────────────────────────────────
  const openModalIngresoEgreso = (idCaja) => {
    setCajaIdForMovimiento(idCaja);
    setIngresoEgresoModalOpen(true);
  };

  const handleConfirmIngresoEgreso = async (formData) => {
    if (!cajaIdForMovimiento) return;
    const res = await cajaService.detalleCaja({
      id_fkcaja: cajaIdForMovimiento,
      ...formData
    });
    if (res.success) {
      toast.success('Movimiento registrado');
      if (showDetalle) await loadDetalle(cajaIdForMovimiento);
    } else toast.error(res.message || 'Error');
    setIngresoEgresoModalOpen(false);
    setCajaIdForMovimiento(null);
  };

  return (
    <div className="flex flex-col h-full gap-2 p-0 bg-slate-100/50">
      {/* ─── CABECERA ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
              <i className="fas fa-money-bill-wave text-sm"></i>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Caja y Finanzas</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {openCaja
                  ? <span className="text-emerald-600">● ABIERTA — ID: {openCaja.id_caja}</span>
                  : <span className="text-rose-500">● SIN CAJA ABIERTA</span>
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {openCaja && (
              <>
                <button onClick={() => openCierreModal(openCaja)}
                  className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-sm flex items-center gap-2">
                  <i className="fas fa-door-closed"></i><span>CERRAR</span>
                </button>
                <button onClick={() => { setShowEditar(true); loadDetalle(openCaja.id_caja); }}
                  className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg transition-all shadow-sm flex items-center gap-2">
                  <i className="fas fa-edit"></i><span>EDITAR</span>
                </button>
              </>
            )}
            <button onClick={() => setShowApertura(true)}
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-sm flex items-center gap-2 border border-emerald-700/50">
              <i className="fas fa-plus"></i><span>NUEVA APERTURA</span>
            </button>
            <button onClick={loadData}
              className="h-8 w-8 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-all shadow-sm flex items-center justify-center"
              disabled={loading} title="Actualizar">
              <i className={`fas fa-sync-alt text-[11px] ${loading ? 'fa-spin text-blue-500' : ''}`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* ─── BARRA DE FILTROS ARRIBA ────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-44">
            <DatePicker
              selected={filterFecha}
              onChange={date => setFilterFecha(date)}
              dateFormat="yyyy-MM-dd"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
            <i className="fas fa-calendar-alt absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          </div>
          <button onClick={() => {
              const offset = filterFecha.getTimezoneOffset();
              const localDate = new Date(filterFecha.getTime() - offset * 60 * 1000);
              setFilters({ fecha: localDate.toISOString().split('T')[0] });
              setPagination(p => ({ ...p, pageIndex: 0 }));
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            disabled={loading}>
            <i className="fas fa-search"></i><span>Buscar</span>
          </button>
          <button onClick={() => {
              setFilters(prev => ({ ...prev, apertura: '1' }));
              setPagination(p => ({ ...p, pageIndex: 0 }));
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            disabled={loading}>
            <i className="fas fa-door-open"></i><span>Buscar Mi Caja Abierta</span>
          </button>
          <button onClick={() => {
              setFilters({});
              setFilterFecha(new Date());
              setPagination(p => ({ ...p, pageIndex: 0 }));
            }}
            className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            disabled={loading}>
            <i className="fas fa-eraser"></i><span>Limpiar</span>
          </button>
          {openCaja && (
            <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-2">
              <i className="fas fa-circle text-[6px]"></i>
              ● Caja Aperturada: #{openCaja.id_caja}
            </span>
          )}
          <span className="text-xs text-slate-500 ml-auto">{totalRecords} registros</span>
        </div>
      </div>

      {/* ─── GRILLA ──────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
        <CajaGrid
          data={data}
          loading={loading}
          pagination={pagination}
          setPagination={setPagination}
          totalRecords={totalRecords}
          onAction={handleAction}
        />
      </div>

      {/* ─── MODAL APERTURA ────────────────────────────────────────── */}
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

      {/* ─── MODAL CIERRE ──────────────────────────────────────────── */}
      {showCierre && cajaParaCierre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex-1 overflow-y-auto p-6">
              <CierreCajaForm
                cajaActual={cajaParaCierre}
                onSubmit={handleCierre}
                onCancel={() => setShowCierre(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL EDITAR/VER DETALLE (con apertura/cierre + grid) ─── */}
      <Modal isOpen={showDetalle || showEditar}
        onClose={() => { setShowDetalle(false); setShowEditar(false); }}
        title={showEditar ? `Editar Caja #${detalleCajaNum}` : `Detalle Caja #${detalleCajaNum}`}
        size="lg">
        <div className="p-4 space-y-4">
          {/* Resumen cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-emerald-50 p-3 rounded-lg"><span className="block text-xs text-emerald-600 font-bold uppercase">Apertura</span>
              <span className="text-lg font-bold text-emerald-700">${/* Usar informacionCaja via props */'$0.00'}</span></div>
            <div className="bg-blue-50 p-3 rounded-lg"><span className="block text-xs text-blue-600 font-bold uppercase">Cierre</span>
              <span className="text-lg font-bold text-blue-700">$0.00</span></div>
            <div className="bg-amber-50 p-3 rounded-lg"><span className="block text-xs text-amber-600 font-bold uppercase">Total Mov.</span>
              <span className="text-lg font-bold text-amber-700">${detalleData.reduce((s, d) => s + parseFloat(d.monto_caja_detalle || 0), 0).toFixed(2)}</span></div>
            <div className="bg-purple-50 p-3 rounded-lg"><span className="block text-xs text-purple-600 font-bold uppercase">Registros</span>
              <span className="text-lg font-bold text-purple-700">{detalleData.length}</span></div>
          </div>

          {/* Botón Agregar Ingreso/Egreso */}
          <button onClick={() => openModalIngresoEgreso(detalleCajaId)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2">
            <i className="fas fa-plus-circle"></i> Agregar Ingreso/Egreso
          </button>

          {/* Grid Detalle */}
          <div className="overflow-auto max-h-96 border rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="p-2 font-bold text-slate-500 uppercase">N°</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Fecha</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Tipo</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Monto</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Socio</th>
                  <th className="p-2 font-bold text-slate-500 uppercase"># Doc</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Estado</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Obs.</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detalleLoading ? (
                  <tr><td colSpan={9} className="p-4 text-center text-slate-400"><i className="fas fa-spinner fa-spin"></i> Cargando...</td></tr>
                ) : detalleData.length > 0 ? detalleData.map((d, i) => (
                  <tr key={d.id_caja_detalle || i} className="hover:bg-slate-50">
                    <td className="p-2 font-medium">{d.numero_detalle_caja || i + 1}</td>
                    <td className="p-2 text-slate-500">{d.fecha_caja_detalle || '-'}</td>
                    <td className="p-2"><span className={`font-bold ${d.tipo_caja_detalle === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'}`}>{d.tipo_caja_detalle || '-'}</span></td>
                    <td className="p-2 font-mono font-bold">${parseFloat(d.monto_caja_detalle || 0).toFixed(2)}</td>
                    <td className="p-2">{d.nombre_socio_caja_detalle || '-'}</td>
                    <td className="p-2">{d.numero_documento_caja_detalle || '-'}</td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        d.estado_caja_detalle === 'EMITIDO' ? 'bg-emerald-100 text-emerald-700' :
                        d.estado_caja_detalle === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' :
                        d.estado_caja_detalle === 'ANULADO' || d.estado_caja_detalle === 'CANCELADO' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{d.estado_caja_detalle || '-'}</span>
                    </td>
                    <td className="p-2 max-w-[150px] truncate">{d.observacion_caja_detalle || '-'}</td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <button onClick={() => window.open(`/caja/mostarCajaDetallePdf?id_caja_detalle=${d.id_caja_detalle}`, '_blank')}
                          className="w-6 h-6 rounded text-red-500 hover:bg-red-50 flex items-center justify-center" title="PDF">
                          <i className="fas fa-file-pdf text-[10px]"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={9} className="p-4 text-center text-slate-400">Sin movimientos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* MODALES REACT EN LUGAR DE SWAL */}
      <InfoComprobanteModal
        isOpen={infoCompModalOpen}
        onClose={() => { setInfoCompModalOpen(false); setSelectedRowForInfo(null); }}
        onConfirm={handleConfirmInfoComprobante}
        initialNumero={selectedRowForInfo?.numero_comprobante || ''}
        initialBanco={selectedRowForInfo?.banco || ''}
      />

      <ConfirmationModal
        isOpen={confirmAprobarOpen}
        onClose={() => { setConfirmAprobarOpen(false); setSelectedRowForAprobar(null); }}
        onConfirm={handleEjecutarAprobar}
        title="¿Aprobar solicitud?"
        message="¿Desea aprobar la solicitud de edición para esta caja?"
        confirmText="Aprobar"
        type="info"
      />

      <IngresoEgresoModal
        isOpen={ingresoEgresoModalOpen}
        onClose={() => { setIngresoEgresoModalOpen(false); setCajaIdForMovimiento(null); }}
        onConfirm={handleConfirmIngresoEgreso}
      />
    </div>
  );
};
