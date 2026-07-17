import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cajaBoleteriaService } from '../../services/cajaBoleteria.service';
import Modal from '../../components/common/Modal';
import { AperturaCajaForm } from './components/AperturaCajaForm';
import { CierreCajaForm } from './components/CierreCajaForm';

const DENOMINACIONES = [
  { key: '100', label: 'Billetes $100', field: '100' },
  { key: '50', label: 'Billetes $50', field: '50' },
  { key: '20', label: 'Billetes $20', field: '20' },
  { key: '10', label: 'Billetes $10', field: '10' },
  { key: '5', label: 'Billetes $5', field: '5' },
  { key: '1', label: 'Billetes $1', field: '1' },
  { key: 'moneda_1d', label: 'Monedas $1', field: 'moneda_caja' },
  { key: 'moneda_50', label: 'Monedas $0.50', field: 'moneda_50' },
  { key: 'moneda_25', label: 'Monedas $0.25', field: 'moneda_25' },
  { key: 'moneda_10', label: 'Monedas $0.10', field: 'moneda_10' },
  { key: 'moneda_5', label: 'Monedas $0.05', field: 'moneda_5' },
  { key: 'moneda_01', label: 'Monedas $0.01', field: 'moneda_1' },
];

const multipliers = {
  '100': 100, '50': 50, '20': 20, '10': 10, '5': 5, '1': 1,
  'moneda_1d': 1, 'moneda_50': 0.50, 'moneda_25': 0.25,
  'moneda_10': 0.10, 'moneda_5': 0.05, 'moneda_01': 0.01
};

const denomToHtml = (prefix) => DENOMINACIONES.map(d => `
  <div style="flex:0 0 calc(50% - 4px)">
    <label style="display:block;font-weight:bold;font-size:11px;margin-bottom:2px;color:#374151">${d.label}</label>
    <input id="${prefix}-${d.key}" class="swal2-input" type="number" min="0" step="0.01" value="0"
      style="width:100%;padding:6px 10px;font-size:13px;text-align:right" />
  </div>`).join('');

const denomPreConfirm = (prefix) => {
  const formData = {};
  DENOMINACIONES.forEach(d => {
    formData[`${prefix}_${d.field}`] = parseFloat(document.getElementById(`${prefix}-${d.key}`)?.value || '0') || 0;
  });
  return formData;
};

const denomCalcular = (prefix) => {
  let total = 0;
  DENOMINACIONES.forEach(d => {
    const el = document.getElementById(`${prefix}-${d.key}`);
    if (el) total += (parseFloat(el.value) || 0) * (multipliers[d.key] || 1);
  });
  const totalEl = document.getElementById(`${prefix}-total`);
  if (totalEl) totalEl.value = total.toFixed(2);
};

const denomDidOpen = (prefix) => {
  const recalcular = () => denomCalcular(prefix);
  DENOMINACIONES.forEach(d => {
    const el = document.getElementById(`${prefix}-${d.key}`);
    if (el) { el.addEventListener('input', recalcular); el.addEventListener('change', recalcular); }
  });
  recalcular();
};

export const CajaBoleteriaPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [openCaja, setOpenCaja] = useState(null);

  const [showApertura, setShowApertura] = useState(false);
  const [showCierre, setShowCierre] = useState(false);
  const [cajaParaCierre, setCajaParaCierre] = useState(null);
  const [showDetalle, setShowDetalle] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [detalleData, setDetalleData] = useState([]);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleCajaId, setDetalleCajaId] = useState(null);

  const [filterFecha, setFilterFecha] = useState(new Date());

  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  // ─── LISTADO ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, page: pagination.pageIndex + 1, limit: pagination.pageSize };
      const res = await cajaBoleteriaService.listadoCaja(params);
      if (res.success) {
        setData(res.data || []);
        setTotalRecords(res.total || 0);
      }
    } catch { toast.error('Error al cargar cajas'); }
    finally { setLoading(false); }
  }, [filters, pagination]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    cajaBoleteriaService.validarCaja().then(res => {
      if (res.success) setOpenCaja(res.data);
      else setOpenCaja(null);
    }).catch(() => setOpenCaja(null));
  }, []);

  // ─── MODAL APERTURA ────────────────────────────────────────────────────
  const handleApertura = async (formData) => {
    const res = await cajaBoleteriaService.insertarAperturaCaja(formData);
    if (res.success) { toast.success('Caja aperturada'); loadData(); setShowApertura(false); }
    else toast.error(res.message || 'Error');
  };

  // ─── MODAL CIERRE ──────────────────────────────────────────────────────
  const openCierreModal = (caja) => {
    if (!caja || caja.estado_caja === 'CERRADA') { toast.error('Ya está cerrada'); return; }
    setCajaParaCierre(caja);
    setShowCierre(true);
  };

  const handleCierre = async (formData) => {
    const res = await cajaBoleteriaService.cerrarCaja({ ...formData, id_caja: cajaParaCierre.id_caja });
    if (res.success) {
      const estado = res.estado_cuadre;
      const diff = res.valor_diferencia;
      let msg = 'Caja cerrada';
      if (estado === 'CUADRADO') msg += ' ✅';
      else if (estado === 'FALTANTE') msg += `. Faltante $${diff}`;
      else if (estado === 'SOBRANTE') msg += `. Sobrante $${diff}`;
      toast.success(msg);
      loadData();
      setShowCierre(false);
    } else toast.error(res.message || 'Error');
  };

  // ─── ACCIONES ──────────────────────────────────────────────────────────
  const handleAction = useCallback(async (action, row) => {
    switch (action) {
      case 'info-comprobante': {
        const { value } = await Swal.fire({
          title: 'Info Comprobante', showCancelButton: true, confirmButtonText: 'Guardar',
          html: `<div style="text-align:left">
            <label style="display:block;font-weight:bold;font-size:12px;margin-bottom:4px">N° Comprobante</label>
            <input id="sw-num" class="swal2-input" style="width:100%" />
            <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Banco</label>
            <input id="sw-banco" class="swal2-input" style="width:100%" />
          </div>`,
          preConfirm: () => ({ id_caja: row.id_caja, numero_comprobante: document.getElementById('sw-num')?.value || '', banco: document.getElementById('sw-banco')?.value || '' })
        });
        if (!value) return;
        const res = await cajaBoleteriaService.guardarInfoComprobante(value);
        if (res.success) { toast.success('Guardado'); loadData(); } else toast.error(res.message || 'Error');
        break;
      }
      case 'arqueo':
        window.open(`/caja_boleteria/arqueoCajaPdf?id_caja=${row.id_caja}`, '_blank');
        break;
      case 'comprobantes':
        window.open(`/caja_boleteria/reportecomprobantefacturasxcaja?idcaja=${row.id_caja}`, '_blank');
        break;
      case 'editar': {
        setShowDetalle(true);
        setDetalleCajaId(row.id_caja);
        try {
          const det = await cajaBoleteriaService.listadoDetalleCaja({ id_caja: row.id_caja, limit: 200 });
          setDetalleData(det.data || []);
        } catch { setDetalleData([]); }
        break;
      }
      case 'cerrar': openCierreModal(row); break;
      case 'solicitud':
        if (row.estado_solicitud == 0) { toast('Sin solicitud'); return; }
        if (row.estado_solicitud == 1) {
          const { isConfirmed } = await Swal.fire({ title: 'Aprobar?', text: '¿Aprobar solicitud?', icon: 'question', showCancelButton: true });
          if (!isConfirmed) return;
          const r = await cajaBoleteriaService.aprobarSolicitud(row.id_caja);
          if (r.success) { toast.success('Aprobada'); loadData(); } else toast.error(r.message || 'Error');
        } else toast('Ya aprobada');
        break;
      case 'impresion-rapida':
        window.open(`/php/pdfCajaBoleteriaImpresion.php?id_caja=${row.id_caja}`, '_blank');
        break;
    }
  }, [loadData]);

  // ─── MODAL INGRESO/EGRESO ─────────────────────────────────────────────
  const openModalIngresoEgreso = async (idCaja) => {
    const { value: form, isDismissed } = await Swal.fire({
      title: 'Agregar Ingreso/Egreso', showCancelButton: true, confirmButtonText: 'Guardar',
      html: `<div style="text-align:left">
        <label style="display:block;font-weight:bold;font-size:12px;margin-bottom:4px">Tipo</label>
        <select id="ie-tipo" class="swal2-input" style="width:100%"><option value="INGRESO">INGRESO</option><option value="EGRESO">EGRESO</option></select>
        <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Monto ($)</label>
        <input id="ie-monto" class="swal2-input" type="number" step="0.01" min="0" value="0" style="width:100%" />
        <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Socio</label>
        <input id="ie-socio" class="swal2-input" style="width:100%" />
        <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Observación</label>
        <textarea id="ie-obs" class="swal2-textarea" style="width:100%;min-height:60px"></textarea>
      </div>`,
      preConfirm: () => ({ id_fkcaja: idCaja, tipo_caja_detalle: document.getElementById('ie-tipo')?.value, monto_caja_detalle: document.getElementById('ie-monto')?.value, nombre_socio: document.getElementById('ie-socio')?.value, observacion_caja_detalle: document.getElementById('ie-obs')?.value, numero_documento: '' })
    });
    if (!form || isDismissed) return;
    const res = await cajaBoleteriaService.insertarDetalleCaja(form);
    if (res.success) { toast.success('Registrado'); loadData(); }
    else toast.error(res.message || 'Error');
  };

  const fmt = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC') : '-';

  const columns = [
    { header: '#', accessorKey: 'numero_caja', cell: (v) => <span className="font-semibold text-slate-800">{v ?? '-'}</span> },
    { header: 'FECHA', accessorKey: 'fecha_caja', cell: (v) => <span className="text-slate-600 font-mono text-sm">{fmtDate(v)}</span> },
    { header: 'F. CIERRE', accessorKey: 'fecha_hora_cierre', cell: (v) => <span className="text-slate-600 font-mono text-sm">{fmtDate(v) || '-'}</span> },
    { header: 'SUCURSAL', accessorKey: 'nombre_sucursal', cell: (v) => <span className="text-slate-700">{v || '-'}</span> },
    { header: 'APERTURA', accessorKey: 'apertura_total_caja', cell: (v) => <span className="text-emerald-600 font-bold font-mono">{fmt(v)}</span> },
    { header: 'CIERRE', accessorKey: 'cierre_total_caja', cell: (v) => <span className="text-blue-600 font-bold font-mono">{fmt(v)}</span> },
    { header: 'CUADRE', accessorKey: 'cuadre_caja', cell: (v) => <span className="text-slate-600 font-mono text-sm">{v || '-'}</span> },
    { header: 'USUARIO', accessorKey: 'usuario', cell: (v) => <span className="text-slate-600">{v || '-'}</span> },
    {
      header: 'EST', accessorKey: 'estado_caja', cell: (v) => {
        const open = v === 'APERTURADA' || v === '1';
        return <i className={`fas fa-circle ${open ? 'text-emerald-500' : 'text-red-500'}`} style={{ fontSize: 10 }}
          title={open ? 'APERTURADA' : 'CERRADA'}></i>;
      }
    },
    {
      header: 'SOL', accessorKey: 'estado_solicitud', cell: (v) => {
        let color = 'text-slate-400'; let title = 'NINGUNA';
        if (v == 1) { color = 'text-orange-400'; title = 'ENVIADA'; } else if (v == 2) { color = 'text-emerald-500'; title = 'APROBADA'; }
        return <i className={`fas fa-info-circle ${color}`} style={{ fontSize: 12 }} title={title}></i>;
      }
    },
    {
      header: 'ACCIONES', cell: (_, row) => (
        <div className="flex gap-1">
          {[
            { a: 'info-comprobante', i: 'fa-vote-yea', c: 'text-indigo-500 hover:bg-indigo-50', t: 'Info Comprobante' },
            { a: 'arqueo', i: 'fa-file-pdf', c: 'text-red-500 hover:bg-red-50', t: 'Arqueo' },
            { a: 'comprobantes', i: 'fa-file-invoice', c: 'text-red-500 hover:bg-red-50', t: 'Comprobantes' },
            { a: 'editar', i: 'fa-edit', c: 'text-amber-500 hover:bg-amber-50', t: 'Detalle' },
            { a: 'cerrar', i: 'fa-sign-out-alt', c: 'text-blue-500 hover:bg-blue-50', t: 'Cerrar' },
            { a: 'solicitud', i: 'fa-share-square', c: 'text-purple-500 hover:bg-purple-50', t: 'Solicitud' },
            { a: 'impresion-rapida', i: 'fa-print', c: 'text-slate-500 hover:bg-slate-50', t: 'Imprimir' },
          ].map(b => (
            <button key={b.a} onClick={() => handleAction(b.a, row)} title={b.t}
              className={`w-7 h-7 rounded ${b.c} flex items-center justify-center transition-colors`}>
              <i className={`fas ${b.i} text-[10px]`}></i>
            </button>
          ))}
        </div>
      )
    },
  ];

  return (
    <div className="flex flex-col h-full gap-2 p-0 bg-slate-100/50">
      <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
              <i className="fas fa-ticket-alt text-sm"></i>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Caja Boletería</h1>
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
                  className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-2">
                  <i className="fas fa-door-closed"></i><span>CERRAR</span>
                </button>
                <button onClick={() => { setShowEditar(true); setDetalleCajaId(openCaja.id_caja); }}
                  className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-2">
                  <i className="fas fa-edit"></i><span>EDITAR</span>
                </button>
              </>
            )}
            <button onClick={() => setShowApertura(true)}
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-2 border border-emerald-700/50">
              <i className="fas fa-plus"></i><span>NUEVA APERTURA</span>
            </button>
            <button onClick={loadData}
              className="h-8 w-8 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center"
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
          <div className="flex flex-col h-full overflow-hidden relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3">
                  <i className="fas fa-circle-notch fa-spin text-blue-600 text-2xl"></i>
                  <span className="font-semibold text-slate-700">Cargando...</span>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-slate-50 sticky top-0 z-0 border-b border-slate-200">
                  <tr>
                    {columns.map(col => (
                      <th key={col.id || col.accessorKey} className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.length > 0 ? data.map(row => (
                    <tr key={row.id_caja} className="hover:bg-blue-50/50 transition-colors group">
                      {columns.map(col => (
                        <td key={col.id || col.accessorKey} className="p-2.5 text-xs">
                          {col.cell ? col.cell(row[col.accessorKey], row) : (row[col.accessorKey] || '-')}
                        </td>
                      ))}
                    </tr>
                  )) : (
                    <tr><td colSpan={columns.length} className="p-8 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <i className="fas fa-ticket-alt text-4xl text-slate-300"></i>
                        <p>No se encontraron registros</p>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between shrink-0">
              <span className="text-sm text-slate-600 font-medium">
                Mostrando {data.length > 0 ? pagination.pageIndex * pagination.pageSize + 1 : 0} a {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRecords)} de {totalRecords} registros
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPagination(p => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
                  disabled={pagination.pageIndex === 0}
                  className="w-8 h-8 rounded flex items-center justify-center border border-slate-300 text-slate-600 hover:bg-white hover:text-blue-600 disabled:opacity-50 transition-colors">
                  <i className="fas fa-chevron-left"></i>
                </button>
                <span className="text-sm font-semibold text-slate-700 px-2">Pág. {pagination.pageIndex + 1}</span>
                <button onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                  disabled={data.length < pagination.pageSize}
                  className="w-8 h-8 rounded flex items-center justify-center border border-slate-300 text-slate-600 hover:bg-white hover:text-blue-600 disabled:opacity-50 transition-colors">
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
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

      <Modal isOpen={showDetalle || showEditar}
        onClose={() => { setShowDetalle(false); setShowEditar(false); }}
        title="Detalle de Caja" size="lg">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 p-3 rounded-lg">
              <span className="block text-xs text-emerald-600 font-bold uppercase">Total Mov.</span>
              <span className="text-lg font-bold text-emerald-700">${detalleData.reduce((s, d) => s + parseFloat(d.monto_caja_detalle || 0), 0).toFixed(2)}</span>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <span className="block text-xs text-blue-600 font-bold uppercase">Registros</span>
              <span className="text-lg font-bold text-blue-700">{detalleData.length}</span>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <span className="block text-xs text-purple-600 font-bold uppercase">Caja #</span>
              <span className="text-lg font-bold text-purple-700">{detalleCajaId || '-'}</span>
            </div>
          </div>
          <button onClick={() => openModalIngresoEgreso(detalleCajaId)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-2">
            <i className="fas fa-plus-circle"></i> Agregar Ingreso/Egreso
          </button>
          <div className="overflow-auto max-h-96 border rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="p-2 font-bold text-slate-500 uppercase">N°</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Fecha</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Tipo</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Monto</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Socio</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Estado</th>
                  <th className="p-2 font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detalleData.length > 0 ? detalleData.map((d, i) => (
                  <tr key={d.id_caja_detalle || i} className="hover:bg-slate-50">
                    <td className="p-2 font-medium">{d.numero_detalle_caja || i + 1}</td>
                    <td className="p-2 text-slate-500">{d.fecha_caja_detalle || '-'}</td>
                    <td className="p-2"><span className={`font-bold ${d.tipo_caja_detalle === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'}`}>{d.tipo_caja_detalle || '-'}</span></td>
                    <td className="p-2 font-mono font-bold">${parseFloat(d.monto_caja_detalle || 0).toFixed(2)}</td>
                    <td className="p-2">{d.nombre_socio_caja_detalle || '-'}</td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        d.estado_caja_detalle === 'EMITIDO' ? 'bg-emerald-100 text-emerald-700' :
                        d.estado_caja_detalle === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>{d.estado_caja_detalle || '-'}</span>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        {d.estado_caja_detalle !== 'ANULADO' && d.estado_caja_detalle !== 'CANCELADO' && (
                          <>
                            <button onClick={async () => {
                              const { isConfirmed } = await Swal.fire({title:'Eliminar?',text:'¿Eliminar este detalle?',icon:'question',showCancelButton:true});
                              if(isConfirmed){const r=await cajaBoleteriaService.eliminarDetalleCaja(d.id_caja_detalle);if(r.success){toast.success('Eliminado');}else toast.error(r.message||'Error');}
                            }} className="w-6 h-6 rounded text-red-500 hover:bg-red-50 flex items-center justify-center" title="Eliminar">
                              <i className="fas fa-times-circle text-[10px]"></i>
                            </button>
                            <button onClick={async () => {
                              const {value}=await Swal.fire({title:'Anular?',text:'Motivo',input:'textarea',showCancelButton:true});
                              if(value){const r=await cajaBoleteriaService.solicitudAnulacion(d.id_caja_detalle,value);if(r.success)toast.success('Solicitud enviada');else toast.error(r.message||'Error');}
                            }} className="w-6 h-6 rounded text-amber-500 hover:bg-amber-50 flex items-center justify-center" title="Anular">
                              <i className="fas fa-ban text-[10px]"></i>
                            </button>
                          </>
                        )}
                        <button onClick={() => window.open(`/caja_boleteria/mostarCajaDetallePdf?id_caja_detalle=${d.id_caja_detalle}`,'_blank')}
                          className="w-6 h-6 rounded text-red-500 hover:bg-red-50 flex items-center justify-center" title="PDF">
                          <i className="fas fa-file-pdf text-[10px]"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="p-4 text-center text-slate-400">Sin movimientos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CajaBoleteriaPage;
