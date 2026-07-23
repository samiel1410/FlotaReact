import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cajaCobrosService } from '../../services/cajaCobros.service';
import Modal from '../../components/common/Modal';
import AperturaCajaCobrosModal from '../../components/common/AperturaCajaCobrosModal';
import { CajaGrid } from '../Caja/CajaGrid';
import InfoComprobanteModal from '../../components/common/InfoComprobanteModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import IngresoEgresoModal from '../../components/common/IngresoEgresoModal';
import { CierreCajaForm } from '../CajaBoleteria/components/CierreCajaForm';

export const CajaCobrosPage = () => {
  const [data, setData] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [filterFecha, setFilterFecha] = useState(new Date());
  const [filters, setFilters] = useState({});
  const [openCaja, setOpenCaja] = useState(null);

  // Modales React
  const [showDetalle, setShowDetalle] = useState(false);
  const [detalleData, setDetalleData] = useState([]);
  const [detalleId, setDetalleId] = useState(null);
  const [showApertura, setShowApertura] = useState(false);
  const [showCierre, setShowCierre] = useState(false);
  const [cajaParaCierre, setCajaParaCierre] = useState(null);

  const [infoCompModalOpen, setInfoCompModalOpen] = useState(false);
  const [selectedRowForInfo, setSelectedRowForInfo] = useState(null);

  const [confirmAprobarOpen, setConfirmAprobarOpen] = useState(false);
  const [selectedRowForAprobar, setSelectedRowForAprobar] = useState(null);

  const [ingresoEgresoModalOpen, setIngresoEgresoModalOpen] = useState(false);
  const [cajaIdForMovimiento, setCajaIdForMovimiento] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: pagination.pageSize, page: pagination.pageIndex + 1, ...filters };
      const res = await cajaCobrosService.listadoCaja(params);
      if (res.success) { setData(res.data || []); setTotalRecords(res.total || 0); }
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  }, [pagination, filters]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { cajaCobrosService.validarCaja().then(r=>{if(r.success)setOpenCaja(r.data);else setOpenCaja(null);}).catch(()=>setOpenCaja(null)); }, []);

  const handleAperturaSuccess = () => {
    setShowApertura(false);
    cajaCobrosService.validarCaja().then(r => { if (r.success) setOpenCaja(r.data); else setOpenCaja(null); });
    loadData();
  };

  const abrirCierre = (caja) => {
    if (!caja || caja.estado_caja === 'CERRADA') { toast.error('Ya está cerrada'); return; }
    setCajaParaCierre(caja);
    setShowCierre(true);
  };

  const handleCierreSubmit = async (formData) => {
    if (!cajaParaCierre) return;
    const res = await cajaCobrosService.cerrarCaja({ ...formData, id_caja: cajaParaCierre.id_caja_retenciones || cajaParaCierre.id_caja });
    if (res.success) {
      let msg = 'Caja cerrada';
      if (res.estado_cuadre === 'CUADRADO') msg += ' ✅';
      else if (res.estado_cuadre === 'FALTANTE') msg += `. Faltante $${res.valor_diferencia}`;
      else if (res.estado_cuadre === 'SOBRANTE') msg += `. Sobrante $${res.valor_diferencia}`;
      toast.success(msg);
      loadData();
      setShowCierre(false);
    } else toast.error(res.message || 'Error');
  };

  const handleAction = useCallback(async (action, row) => {
    switch (action) {
      case 'info-comprobante':
        setSelectedRowForInfo(row);
        setInfoCompModalOpen(true);
        break;
      case 'arqueo': window.open(`/php/pdfCajaRetencionImpresion.php?id_caja=${row.id_caja_retenciones}`, '_blank'); break;
      case 'comprobantes': window.open(`/cajaretenciones/reportecomprobantefacturasxcaja?idcaja=${row.id_caja_retenciones}`, '_blank'); break;
      case 'editar':
        setShowDetalle(true);
        setDetalleId(row.id_caja_retenciones);
        try { const d = await cajaCobrosService.listadoDetalleCaja(row.id_caja_retenciones); setDetalleData(d.data || []); }
        catch { setDetalleData([]); }
        break;
      case 'ingreso-egreso':
        setCajaIdForMovimiento(row.id_caja_retenciones);
        setIngresoEgresoModalOpen(true);
        break;
      case 'cerrar': abrirCierre(row); break;
      case 'solicitud':
        if (row.estado_solicitud == 0) { toast('Sin solicitud'); return; }
        if (row.estado_solicitud == 1) {
          setSelectedRowForAprobar(row);
          setConfirmAprobarOpen(true);
        } else toast('Ya aprobada');
        break;
      case 'impresion-rapida': window.open(`/php/pdfCajaRetencionImpresion.php?id_caja=${row.id_caja_retenciones}`, '_blank'); break;
    }
  }, []);

  const handleConfirmInfo = async (formValues) => {
    if (!selectedRowForInfo) return;
    const r = await cajaCobrosService.guardarInfoComprobante({
      id_caja: selectedRowForInfo.id_caja_retenciones,
      ...formValues
    });
    if (r.success) { toast.success('Guardado'); loadData(); } else toast.error(r.message || 'Error');
    setInfoCompModalOpen(false);
    setSelectedRowForInfo(null);
  };

  const handleConfirmAprobar = async () => {
    if (!selectedRowForAprobar) return;
    const r = await cajaCobrosService.aprobarSolicitud(selectedRowForAprobar.id_caja_retenciones);
    if (r.success) { toast.success('Aprobada'); loadData(); } else toast.error('Error');
    setConfirmAprobarOpen(false);
    setSelectedRowForAprobar(null);
  };

  const handleConfirmMovimiento = async (formData) => {
    if (!cajaIdForMovimiento) return;
    const r = await cajaCobrosService.detalleCaja({
      id_fkcaja: cajaIdForMovimiento,
      ...formData
    });
    if (r.success) {
      toast.success('Registrado');
      if (showDetalle && detalleId) {
        const d = await cajaCobrosService.listadoDetalleCaja(detalleId);
        setDetalleData(d.data || []);
      }
    } else toast.error(r.message || 'Error');
    setIngresoEgresoModalOpen(false);
    setCajaIdForMovimiento(null);
  };

  const fmt = (v) => `$${parseFloat(v||0).toFixed(2)}`;

  return (
    <div className="flex flex-col h-full gap-2 p-0 bg-slate-100/50">
      <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
              <i className="fas fa-cash-register text-sm"></i>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Caja de Cobros</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {openCaja ? <span className="text-emerald-600">● ABIERTA — ID: {openCaja.id_caja_retenciones}</span> : <span className="text-rose-500">● SIN CAJA ABIERTA</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {openCaja && (
              <button onClick={() => abrirCierre(openCaja)} className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-2">
                <i className="fas fa-door-closed"></i><span>CERRAR</span>
              </button>
            )}
            <button onClick={() => setShowApertura(true)} className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-2 border border-emerald-700/50">
              <i className="fas fa-plus"></i><span>NUEVA APERTURA</span>
            </button>
            <button onClick={loadData} className="h-8 w-8 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center" disabled={loading} title="Actualizar">
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
              ● Caja Aperturada: #{openCaja.id_caja_retenciones}
            </span>
          )}
          <span className="text-xs text-slate-500 ml-auto">{totalRecords} registros</span>
        </div>
      </div>

      {/* ─── GRILLA HOMOLOGADA ─────────────────────────────────────────────── */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
        <CajaGrid
          data={data}
          loading={loading}
          pagination={pagination}
          setPagination={setPagination}
          totalRecords={totalRecords}
          onAction={handleAction}
          idKey="id_caja_retenciones"
          showIngresoEgreso={true}
        />
      </div>

      <AperturaCajaCobrosModal isOpen={showApertura} onClose={() => setShowApertura(false)} onSuccess={handleAperturaSuccess} />

      <Modal isOpen={showCierre} onClose={() => { setShowCierre(false); setCajaParaCierre(null); }} title={`Cierre de Caja #${cajaParaCierre?.numero_caja || ''}`} size="lg">
        {cajaParaCierre && (
          <CierreCajaForm
            caja={cajaParaCierre}
            onSubmit={handleCierreSubmit}
            onCancel={() => { setShowCierre(false); setCajaParaCierre(null); }}
          />
        )}
      </Modal>

      <Modal isOpen={showDetalle} onClose={() => setShowDetalle(false)} title="Detalle de Caja" size="lg">
        <div className="p-4 space-y-4">
          <button
            onClick={() => {
              setCajaIdForMovimiento(detalleId);
              setIngresoEgresoModalOpen(true);
            }}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-2"
          >
            <i className="fas fa-plus-circle"></i> Agregar Ingreso/Egreso
          </button>
          <div className="overflow-auto max-h-96 border rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr><th className="p-2 font-bold text-slate-500 uppercase">N°</th><th className="p-2 font-bold text-slate-500 uppercase">Fecha</th><th className="p-2 font-bold text-slate-500 uppercase">Tipo</th><th className="p-2 font-bold text-slate-500 uppercase">Monto</th><th className="p-2 font-bold text-slate-500 uppercase">Socio</th><th className="p-2 font-bold text-slate-500 uppercase">Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detalleData.length > 0 ? detalleData.map((d,i) => (
                  <tr key={d.id_caja_detalle||i} className="hover:bg-slate-50">
                    <td className="p-2 font-medium">{d.numero_detalle_caja||i+1}</td>
                    <td className="p-2 text-slate-500">{d.fecha_caja_detalle||'-'}</td>
                    <td className="p-2"><span className={`font-bold ${d.tipo_caja_detalle==='INGRESO'?'text-emerald-600':'text-red-600'}`}>{d.tipo_caja_detalle||'-'}</span></td>
                    <td className="p-2 font-mono font-bold">{fmt(d.monto_caja_detalle)}</td>
                    <td className="p-2">{d.nombre_socio_caja_detalle||'-'}</td>
                    <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${d.estado_caja_detalle==='EMITIDO'?'bg-emerald-100 text-emerald-700':d.estado_caja_detalle==='PENDIENTE'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}`}>{d.estado_caja_detalle||'-'}</span></td>
                  </tr>
                )) : (<tr><td colSpan={6} className="p-4 text-center text-slate-400">Sin movimientos</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <InfoComprobanteModal
        isOpen={infoCompModalOpen}
        onClose={() => { setInfoCompModalOpen(false); setSelectedRowForInfo(null); }}
        onConfirm={handleConfirmInfo}
        initialNumero={selectedRowForInfo?.numero_comprobante || ''}
        initialBanco={selectedRowForInfo?.banco || ''}
      />

      <ConfirmationModal
        isOpen={confirmAprobarOpen}
        onClose={() => { setConfirmAprobarOpen(false); setSelectedRowForAprobar(null); }}
        onConfirm={handleConfirmAprobar}
        title="¿Aprobar solicitud?"
        message="¿Desea aprobar la solicitud de edición para esta caja?"
        confirmText="Aprobar"
        type="info"
      />

      <IngresoEgresoModal
        isOpen={ingresoEgresoModalOpen}
        onClose={() => { setIngresoEgresoModalOpen(false); setCajaIdForMovimiento(null); }}
        onConfirm={handleConfirmMovimiento}
      />
    </div>
  );
};
