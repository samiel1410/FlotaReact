import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cajaCobrosService } from '../../services/cajaCobros.service';
import Modal from '../../components/common/Modal';

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

const MULTS = { '100':100,'50':50,'20':20,'10':10,'5':5,'1':1,'moneda_1d':1,'moneda_50':0.5,'moneda_25':0.25,'moneda_10':0.1,'moneda_5':0.05,'moneda_01':0.01 };

const denomHtml = (pfx) => DENOMINACIONES.map(d => `<div style="flex:0 0 calc(50% - 4px)"><label style="display:block;font-weight:bold;font-size:11px;color:#374151">${d.label}</label><input id="${pfx}-${d.key}" class="swal2-input" type="number" min="0" step="0.01" value="0" style="width:100%;padding:6px 10px;font-size:13px;text-align:right" /></div>`).join('');

const denomPre = (pfx) => { const o={}; DENOMINACIONES.forEach(d => { o[`${pfx}_${d.field}`] = parseFloat(document.getElementById(`${pfx}-${d.key}`)?.value||'0')||0; }); return o; };

const calcTotal = (pfx) => { let t=0; DENOMINACIONES.forEach(d => { const e=document.getElementById(`${pfx}-${d.key}`); if(e) t+=(parseFloat(e.value)||0)*(MULTS[d.key]||1); }); const te=document.getElementById(`${pfx}-total`); if(te) te.value=t.toFixed(2); };

const didOpenDenom = (pfx) => { const r=()=>calcTotal(pfx); DENOMINACIONES.forEach(d => { const e=document.getElementById(`${pfx}-${d.key}`); if(e){e.addEventListener('input',r);e.addEventListener('change',r);}}); r(); };

export const CajaCobrosPage = () => {
  const [data, setData] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [filterFecha, setFilterFecha] = useState(new Date());
  const [filters, setFilters] = useState({});
  const [openCaja, setOpenCaja] = useState(null);
  const [showDetalle, setShowDetalle] = useState(false);
  const [detalleData, setDetalleData] = useState([]);
  const [detalleId, setDetalleId] = useState(null);

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

  // ─── MODAL APERTURA ────────────────────────────────────────
  const abrirApertura = async () => {
    const { value: form, isDismissed } = await Swal.fire({
      title: 'Nueva Apertura', width: 600,
      html: `<div style="text-align:left"><div style="display:flex;gap:8px;flex-wrap:wrap">${denomHtml('ap')}</div><hr/><div style="display:flex;align-items:center;gap:12px"><div style="flex:1"><label style="display:block;font-weight:bold;font-size:12px">Total ($)</label><input id="ap-total" class="swal2-input" type="text" readonly value="0.00" style="width:100%;padding:8px;font-size:14px;font-weight:bold;text-align:right;background:#f3f4f6"/></div><div style="flex:0 0 auto;padding-top:18px"><label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="ap-cero"/> $0.00</label></div></div></div>`,
      showCancelButton: true, confirmButtonText: 'Guardar Apertura', confirmButtonColor: '#4f9d40',
      didOpen: () => { didOpenDenom('ap'); document.getElementById('ap-cero')?.addEventListener('change',function(){DENOMINACIONES.forEach(d=>{const e=document.getElementById(`ap-${d.key}`);if(e){e.value='0';e.readOnly=this.checked;e.style.background=this.checked?'#f3f4f6':'';}});document.getElementById('ap-total').value='0.00';if(!this.checked)calcTotal('ap');}); },
      preConfirm: () => ({ apertura_total_caja: parseFloat(document.getElementById('ap-total')?.value||'0')||0, ...denomPre('ap') })
    });
    if (!form || isDismissed) return;
    const res = await cajaCobrosService.insertarAperturaCaja(form);
    if (res.success) { toast.success('Caja aperturada'); loadData(); } else toast.error(res.message || 'Error');
  };

  // ─── MODAL CIERRE ──────────────────────────────────────────
  const abrirCierre = async (caja) => {
    if (!caja || caja.estado_caja === 'CERRADA') { toast.error('Ya está cerrada'); return; }
    const { value: form, isDismissed } = await Swal.fire({
      title: `Cierre #${caja.numero_caja}`, width: 650,
      html: `<div style="text-align:left"><div style="display:flex;gap:8px;flex-wrap:wrap">${denomHtml('ci')}</div><hr/><div style="flex:1"><label style="display:block;font-weight:bold;font-size:12px">Total Cierre ($)</label><input id="ci-total" class="swal2-input" type="text" readonly value="0.00" style="width:100%;padding:8px;font-size:14px;font-weight:bold;text-align:right;background:#f3f4f6"/></div><hr/><div style="display:flex;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:200px"><label style="display:block;font-weight:bold;font-size:11px">N° Comprobante</label><input id="ci-num" class="swal2-input" style="width:100%;padding:6px 10px;font-size:13px"/></div><div style="flex:1;min-width:200px"><label style="display:block;font-weight:bold;font-size:11px">Banco</label><input id="ci-banco" class="swal2-input" style="width:100%;padding:6px 10px;font-size:13px"/></div></div></div>`,
      showCancelButton: true, confirmButtonText: 'Cerrar', confirmButtonColor: '#dc2626',
      didOpen: () => didOpenDenom('ci'),
      preConfirm: () => ({ id_caja: caja.id_caja_retenciones, cierre_total_caja: parseFloat(document.getElementById('ci-total')?.value||'0')||0, numero_comprobante_cierre: document.getElementById('ci-num')?.value||'', banco_cierre: document.getElementById('ci-banco')?.value||'', ...denomPre('ci') })
    });
    if (!form || isDismissed) return;
    const res = await cajaCobrosService.cerrarCaja(form);
    if (res.success) {
      let msg = 'Caja cerrada';
      if (res.estado_cuadre === 'CUADRADO') msg += ' ✅';
      else if (res.estado_cuadre === 'FALTANTE') msg += `. Faltante $${res.valor_diferencia}`;
      else if (res.estado_cuadre === 'SOBRANTE') msg += `. Sobrante $${res.valor_diferencia}`;
      toast.success(msg); loadData();
    } else toast.error(res.message || 'Error');
  };

  // ─── ACCIONES ──────────────────────────────────────────────
  const handleAction = useCallback(async (action, row) => {
    switch (action) {
      case 'info-comprobante': {
        const { value } = await Swal.fire({
          title: 'Info Comprobante', showCancelButton: true, confirmButtonText: 'Guardar',
          html: `<div style="text-align:left"><label style="display:block;font-weight:bold;font-size:12px;margin-bottom:4px">N° Comprobante</label><input id="sn" class="swal2-input" style="width:100%"/><label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Banco</label><input id="sb" class="swal2-input" style="width:100%"/></div>`,
          preConfirm: () => ({ id_caja: row.id_caja_retenciones, numero_comprobante: document.getElementById('sn')?.value||'', banco: document.getElementById('sb')?.value||'' })
        });
        if (!value) return;
        const r = await cajaCobrosService.guardarInfoComprobante(value);
        if (r.success) { toast.success('Guardado'); loadData(); } else toast.error(r.message||'Error'); break;
      }
      case 'arqueo': window.open(`/php/pdfCajaRetencionImpresion.php?id_caja=${row.id_caja_retenciones}`, '_blank'); break;
      case 'comprobantes': window.open(`/cajaretenciones/reportecomprobantefacturasxcaja?idcaja=${row.id_caja_retenciones}`, '_blank'); break;
      case 'editar': setShowDetalle(true); setDetalleId(row.id_caja_retenciones); try{const d=await cajaCobrosService.listadoDetalleCaja(row.id_caja_retenciones);setDetalleData(d.data||[]);}catch{setDetalleData([]);} break;
      case 'ingreso-egreso': {
        const { value: f, isDismissed: d } = await Swal.fire({
          title: 'Agregar Ingreso/Egreso', showCancelButton: true, confirmButtonText: 'Guardar',
          html: `<div style="text-align:left"><label style="display:block;font-weight:bold;font-size:12px">Tipo</label><select id="it" class="swal2-input" style="width:100%"><option value="INGRESO">INGRESO</option><option value="EGRESO">EGRESO</option></select><label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Monto ($)</label><input id="im" class="swal2-input" type="number" step="0.01" min="0" value="0" style="width:100%"/><label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Socio</label><input id="is" class="swal2-input" style="width:100%"/><label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Obs.</label><textarea id="io" class="swal2-textarea" style="width:100%;min-height:60px"></textarea></div>`,
          preConfirm: () => ({ id_fkcaja: row.id_caja_retenciones, tipo_caja_detalle: document.getElementById('it')?.value, monto_caja_detalle: document.getElementById('im')?.value, nombre_socio: document.getElementById('is')?.value, observacion_caja_detalle: document.getElementById('io')?.value, numero_documento: '' })
        });
        if (!f || d) return;
        const r2 = await cajaCobrosService.detalleCaja(f);
        if (r2.success) { toast.success('Registrado'); loadData(); } else toast.error(r2.message||'Error'); break;
      }
      case 'cerrar': await abrirCierre(row); break;
      case 'solicitud':
        if (row.estado_solicitud == 0) { toast('Sin solicitud'); return; }
        if (row.estado_solicitud == 1) {
          const { isConfirmed } = await Swal.fire({title:'Aprobar?',text:'¿Aprobar solicitud?',icon:'question',showCancelButton:true});
          if (!isConfirmed) return;
          const r3 = await cajaCobrosService.aprobarSolicitud(row.id_caja_retenciones);
          if (r3.success) { toast.success('Aprobada'); loadData(); } else toast.error('Error');
        } else toast('Ya aprobada');
        break;
      case 'impresion-rapida': window.open(`/php/pdfCajaRetencionImpresion.php?id_caja=${row.id_caja_retenciones}`, '_blank'); break;
    }
  }, []);

  const fmt = (v) => `$${parseFloat(v||0).toFixed(2)}`;
  const fmtDate = (d) => d ? d.split(' ')[0] : '-';

  const columns = [
    { h: '#', k: 'numero_caja', c: (v) => <span className="font-semibold text-slate-800">{v??'-'}</span> },
    { h: 'FECHA', k: 'fecha_caja', c: (v) => <span className="text-slate-600 font-mono text-sm">{fmtDate(v)}</span> },
    { h: 'F. CIERRE', k: 'fecha_hora_cierre', c: (v) => <span className="text-slate-600 font-mono text-sm">{fmtDate(v)||'-'}</span> },
    { h: 'SUCURSAL', k: 'nombre_sucursal', c: (v) => <span className="text-slate-700">{v||'-'}</span> },
    { h: 'APERTURA', k: 'apertura_total_caja', c: (v) => <span className="text-emerald-600 font-bold font-mono">{fmt(v)}</span> },
    { h: 'CIERRE', k: 'cierre_total_caja', c: (v) => <span className="text-blue-600 font-bold font-mono">{fmt(v)}</span> },
    { h: 'CUADRE', k: 'cuadre_caja', c: (v) => <span className={`text-sm font-mono ${v==='CUADRADO'?'text-emerald-600 font-bold':v?.includes('FALTANTE')?'text-red-600 font-bold':v?.includes('SOBRANTE')?'text-amber-600 font-bold':'text-slate-600'}`}>{v||'-'}</span> },
    { h: 'USUARIO', k: 'usuario', c: (v) => <span className="text-slate-600">{v||'-'}</span> },
    { h: '', k: 'estado_caja', w: 30, c: (v) => { const o=v==='APERTURADA'; return <i className={`fas fa-circle ${o?'text-emerald-500':'text-red-500'}`} style={{fontSize:10}} title={o?'APERTURADA':'CERRADA'}></i>; } },
    { h: '', k: 'estado_solicitud', w: 30, c: (v) => { let cl='text-slate-400',tl='NINGUNA'; if(v==1){cl='text-orange-400';tl='ENVIADA';} else if(v==2){cl='text-emerald-500';tl='APROBADA';} return <i className={`fas fa-info-circle ${cl}`} style={{fontSize:12}} title={tl}></i>; } },
    { h: 'ACCIONES', c: (_,row) => (
      <div className="flex gap-1">
        {[
          {a:'info-comprobante',i:'fa-vote-yea',c:'text-indigo-500 hover:bg-indigo-50',t:'Info Comprobante'},
          {a:'arqueo',i:'fa-file-pdf',c:'text-red-500 hover:bg-red-50',t:'Arqueo'},
          {a:'comprobantes',i:'fa-file-invoice',c:'text-red-500 hover:bg-red-50',t:'Comprobantes'},
          {a:'editar',i:'fa-edit',c:'text-amber-500 hover:bg-amber-50',t:'Detalle'},
          {a:'ingreso-egreso',i:'fa-exchange-alt',c:'text-emerald-500 hover:bg-emerald-50',t:'Ing/Egr'},
          {a:'cerrar',i:'fa-sign-out-alt',c:'text-blue-500 hover:bg-blue-50',t:'Cerrar'},
          {a:'solicitud',i:'fa-share-square',c:'text-purple-500 hover:bg-purple-50',t:'Solicitud'},
          {a:'impresion-rapida',i:'fa-print',c:'text-slate-500 hover:bg-slate-50',t:'Imprimir'},
        ].map(b => (
          <button key={b.a} onClick={() => handleAction(b.a, row)} title={b.t}
            className={`w-7 h-7 rounded ${b.c} flex items-center justify-center transition-colors`}>
            <i className={`fas ${b.i} text-[10px]`}></i>
          </button>
        ))}
      </div>
    )},
  ];

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
            {openCaja ? (
              <button onClick={() => abrirCierre(openCaja)} className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-2">
                <i className="fas fa-door-closed"></i><span>CERRAR</span>
              </button>
            ) : (
              <button onClick={abrirApertura} className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-2 border border-emerald-700/50">
                <i className="fas fa-plus"></i><span>NUEVA APERTURA</span>
              </button>
            )}
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
            <i className="fas fa-door-open"></i><span>Buscar Caja Aperturada</span>
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

      {/* ─── GRILLA ──────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex flex-col h-full overflow-hidden relative">
            {loading && (<div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center"><div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3"><i className="fas fa-circle-notch fa-spin text-blue-600 text-2xl"></i><span className="font-semibold text-slate-700">Cargando...</span></div></div>)}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-slate-50 sticky top-0 z-0 border-b border-slate-200">
                  <tr>{columns.map(col => (<th key={col.k||col.h} className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{col.h}</th>))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.length > 0 ? data.map(row => (
                    <tr key={row.id_caja_retenciones} className="hover:bg-blue-50/50 transition-colors group">
                      {columns.map(col => (<td key={col.k||col.h} className="p-2.5 text-xs">{col.c ? col.c(row[col.k], row) : (row[col.k]||'-')}</td>))}
                    </tr>
                  )) : (
                    <tr><td colSpan={columns.length} className="p-8 text-center text-slate-500"><div className="flex flex-col items-center gap-2"><i className="fas fa-cash-register text-4xl text-slate-300"></i><p>No se encontraron cajas</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between shrink-0">
              <span className="text-sm text-slate-600 font-medium">Mostrando {data.length>0?pagination.pageIndex*pagination.pageSize+1:0} a {Math.min((pagination.pageIndex+1)*pagination.pageSize,totalRecords)} de {totalRecords}</span>
              <div className="flex items-center gap-2">
                <button onClick={()=>setPagination(p=>({...p,pageIndex:Math.max(0,p.pageIndex-1)}))} disabled={pagination.pageIndex===0} className="w-8 h-8 rounded flex items-center justify-center border border-slate-300 text-slate-600 hover:bg-white hover:text-blue-600 disabled:opacity-50 transition-colors"><i className="fas fa-chevron-left"></i></button>
                <span className="text-sm font-semibold text-slate-700 px-2">Pág. {pagination.pageIndex+1}</span>
                <button onClick={()=>setPagination(p=>({...p,pageIndex:p.pageIndex+1}))} disabled={data.length<pagination.pageSize} className="w-8 h-8 rounded flex items-center justify-center border border-slate-300 text-slate-600 hover:bg-white hover:text-blue-600 disabled:opacity-50 transition-colors"><i className="fas fa-chevron-right"></i></button>
              </div>
            </div>
          </div>
      </div>

      <Modal isOpen={showDetalle} onClose={() => setShowDetalle(false)} title="Detalle de Caja" size="lg">
        <div className="p-4 space-y-4">
          <button onClick={async () => { const {value: f, isDismissed: d} = await Swal.fire({title:'Agregar Ingreso/Egreso',showCancelButton:true,confirmButtonText:'Guardar',
            html:`<div style="text-align:left"><label style="display:block;font-weight:bold;font-size:12px">Tipo</label><select id="dit" class="swal2-input" style="width:100%"><option value="INGRESO">INGRESO</option><option value="EGRESO">EGRESO</option></select><label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Monto</label><input id="dim" class="swal2-input" type="number" step="0.01" min="0" value="0" style="width:100%"/><label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Socio</label><input id="dis" class="swal2-input" style="width:100%"/><label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Obs.</label><textarea id="dio" class="swal2-textarea" style="width:100%;min-height:60px"></textarea></div>`,
            preConfirm:()=>({id_fkcaja:detalleId,tipo_caja_detalle:document.getElementById('dit')?.value,monto_caja_detalle:document.getElementById('dim')?.value,nombre_socio:document.getElementById('dis')?.value,observacion_caja_detalle:document.getElementById('dio')?.value,numero_documento:''})});
            if(!f||d)return;const r=await cajaCobrosService.detalleCaja(f);if(r.success){toast.success('Registrado');const d2=await cajaCobrosService.listadoDetalleCaja(detalleId);setDetalleData(d2.data||[]);}else toast.error(r.message||'Error');
          }} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-2">
            <i className="fas fa-plus-circle"></i> Agregar Ingreso/Egreso
          </button>
          <div className="overflow-auto max-h-96 border rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr><th className="p-2 font-bold text-slate-500 uppercase">N°</th><th className="p-2 font-bold text-slate-500 uppercase">Fecha</th><th className="p-2 font-bold text-slate-500 uppercase">Tipo</th><th className="p-2 font-bold text-slate-500 uppercase">Monto</th><th className="p-2 font-bold text-slate-500 uppercase">Socio</th><th className="p-2 font-bold text-slate-500 uppercase">Estado</th><th className="p-2 font-bold text-slate-500 uppercase">Acciones</th></tr>
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
                    <td className="p-2">
                      <div className="flex gap-1">
                        {d.estado_caja_detalle!=='ANULADO'&&d.estado_caja_detalle!=='CANCELADO'&&(<>
                          <button onClick={async()=>{const{isConfirmed}=await Swal.fire({title:'Eliminar?',text:'¿Eliminar?',icon:'question',showCancelButton:true});if(isConfirmed){const r=await cajaCobrosService.eliminarDetalleCaja(d.id_caja_detalle);if(r.success){toast.success('Eliminado');const d2=await cajaCobrosService.listadoDetalleCaja(detalleId);setDetalleData(d2.data||[]);}}}}
                            className="w-6 h-6 rounded text-red-500 hover:bg-red-50 flex items-center justify-center" title="Eliminar"><i className="fas fa-times-circle text-[10px]"></i></button>
                          <button onClick={async()=>{const{value}=await Swal.fire({title:'Anular?',text:'Motivo',input:'textarea',showCancelButton:true});if(value){const r=await cajaCobrosService.solicitudAnulacion({id_egreso:d.id_caja_detalle,motivoAnulacion:value});if(r.success)toast.success('Solicitud enviada');}}}
                            className="w-6 h-6 rounded text-amber-500 hover:bg-amber-50 flex items-center justify-center" title="Anular"><i className="fas fa-ban text-[10px]"></i></button>
                        </>)}
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan={7} className="p-4 text-center text-slate-400">Sin movimientos</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};
