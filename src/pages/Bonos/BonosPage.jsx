import { useState, useEffect } from 'react';
import { api } from '../../config/axios';
import Swal from 'sweetalert2';
import Modal from '../../components/common/Modal';
import MotivoModal from '../../components/common/MotivoModal';
import SocioBusSelector from '../../components/common/SocioBusSelector';
import AperturaCajaCobrosModal from '../../components/common/AperturaCajaCobrosModal';
import { cobrosService } from '../../services/cobros.service';
import { cajaCobrosService } from '../../services/cajaCobros.service';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import toast from 'react-hot-toast';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
const formatFecha = (f) => f ? f.split('T')[0] || f.split(' ')[0] : '-';
const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

// ─── QZ Tray helpers ──────────────────────────────────────────────
const loadQZ = () => new Promise((resolve, reject) => {
  if (window.qz) return resolve();
  const s = document.createElement('script');
  s.src = '/qz.js';
  s.onload = () => resolve();
  s.onerror = () => reject(new Error('No se pudo cargar qz.js'));
  document.head.appendChild(s);
});

const configurarQZ = () => {
  if (!window.qz) return;
  qz.security.setSignatureAlgorithm('SHA256');
  qz.security.setCertificatePromise((resolve) => {
    fetch('/digital-certificate.crt', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
      .then(r => r.ok ? r.text() : null).then(resolve).catch(() => resolve(null));
  });
  qz.security.setSignaturePromise((toSign) => (resolve) => {
    api.get('/configuracion/sign-message', { params: { request: toSign } })
      .then(res => resolve(res.data))
      .catch(err => resolve(null));
  });
};

const conectarQZ = () => {
  if (!window.qz) return Promise.reject('Librería no cargada');
  if (qz.websocket.isActive()) return Promise.resolve();
  const TIMEOUT_MS = 3000;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS);
  });
  return Promise.race([
    qz.websocket.connect({ retries: 0, delay: 0, usingSecure: false }),
    timeoutPromise
  ]).finally(() => clearTimeout(timeoutId));
};

// ─── Generar HTML del ticket ───────────────────────────────────────
const generarHtmlTicket = (ticket) => {
  const coop = ticket.cooperativa || 'COOPERATIVA DE TRANSPORTES';
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Bono N° ${ticket.numero}</title>
<style>
  @page { margin: 10mm; }
  body { font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; margin: 0; padding: 20px; }
  .ticket { max-width: 360px; margin: 0 auto; text-align: center; }
  h2 { font-size: 18px; margin: 0 0 12px; padding-bottom: 10px; border-bottom: 2px solid #1e293b; }
  .info { padding: 16px 0; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .label { font-weight: bold; color: #475569; }
  .value { font-weight: 600; }
  .valor { font-size: 20px; font-weight: bold; color: #059669; }
  .firma { border-top: 1px solid #cbd5e1; margin-top: 16px; padding-top: 16px; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>
<div class="ticket">
  <h2>${coop}</h2>
  <div class="info">
    <div class="row"><span class="label">Bono N°:</span><span class="value">${ticket.numero}</span></div>
    <div class="row"><span class="label">Bus:</span><span class="value">${ticket.bus || ''}</span></div>
    <div class="row"><span class="label">Socio:</span><span class="value">${ticket.socio || ''}</span></div>
    <div class="row"><span class="label">Valor:</span><span class="valor">${formatCurrency(ticket.valor)}</span></div>
    <div class="row"><span class="label">Motivo:</span><span class="value">${ticket.motivo || ''}</span></div>
    ${ticket.observacion ? `<div class="row"><span class="label">Observación:</span><span class="value">${ticket.observacion}</span></div>` : ''}
    <div class="row"><span class="label">Fecha:</span><span class="value">${formatFecha(ticket.fecha)}</span></div>
  </div>
  <div class="firma">
    <p>_________________________</p>
    <p style="font-weight:bold;color:#475569;">Firma Responsable</p>
  </div>
</div>
</body>
</html>`;
};

const crearBlobUrlTicket = (ticket) => {
  const html = generarHtmlTicket(ticket);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return URL.createObjectURL(blob);
};

// ─── Nuevo Bono Modal ──────────────────────────────────────────────
const NuevoBonoModal = ({ onClose, onSuccess, onNoCaja }) => {
  const [form, setForm] = useState({ id_socio: '', id_bus: '', valor: '50', motivo: '', observacion: '', fecha: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    const { id_socio, id_bus, valor, motivo } = form;
    if (!id_socio || !id_bus || !valor || !motivo) { Swal.fire('Validación', 'Complete todos los campos requeridos', 'warning'); return; }
    setLoading(true);
    try {
      const res = await cobrosService.agregarBono(form);
      if (res.success) {
        if (res.notificacion) {
          api.post('/whatsapp/enviar', { number: res.notificacion.telefono, message: res.notificacion.mensaje }).catch(() => {});
        }
        onSuccess(res.data?.ticket || res.ticket);
      } else {
        // Si el error es por caja no aperturada, abrir modal de apertura
        const msg = res.message || '';
        if (msg.toLowerCase().includes('caja')) {
          onClose();
          onNoCaja();
        } else {
          Swal.fire({ icon: 'error', title: 'No se pudo registrar el bono', text: msg || 'Error desconocido', confirmButtonColor: '#dc2626' });
        }
      }
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Nuevo Bono" width="max-w-md">
      <div className="space-y-4">
        <SocioBusSelector
          idSocio={form.id_socio} idBus={form.id_bus}
          onSocioChange={v => handleChange('id_socio', v)}
          onBusChange={v => handleChange('id_bus', v)}
        />
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Valor ($)</label>
          <input type="number" step="0.01" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" value={form.valor} onChange={e => handleChange('valor', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Motivo</label>
          <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Ej: Bono por encomiendas" value={form.motivo} onChange={e => handleChange('motivo', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Observación</label>
          <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows={3} placeholder="Ej: Lleva guías a Milagro" value={form.observacion} onChange={e => handleChange('observacion', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha</label>
          <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" value={form.fecha} onChange={e => handleChange('fecha', e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2">
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-save"></i> Guardar</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── BonosPage ─────────────────────────────────────────────────────
export const BonosPage = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showApertura, setShowApertura] = useState(false);
  const [anularBono, setAnularBono] = useState(null);
  const hoyStr = new Date().toISOString().split('T')[0];
  const [filtros, setFiltros] = useState({ id_socio: '', id_bus: '', estado: '', numero_ticket: '', fecha_desde: '', fecha_hasta: '', socio_busqueda: '', bus_busqueda: '' });

  // Estado para PdfViewerModal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfModalUrl, setPdfModalUrl] = useState('');
  const [pdfModalTitle, setPdfModalTitle] = useState('');

  const handleNuevoBonoClick = async () => {
    const res = await cajaCobrosService.validarCaja();
    if (res.success && res.data) {
      setShowModal(true);
    } else {
      setShowApertura(true);
    }
  };

  // Método de impresión desde localStorage
  const [metodoImpresion, setMetodoImpresion] = useState('manual');
  const [printerBono, setPrinterBono] = useState('');

  useEffect(() => {
    const metodo = localStorage.getItem('metodo_impresion') || 'manual';
    setMetodoImpresion(metodo);
    // También cargar desde la API la impresora configurada
    const printBono = localStorage.getItem('printer_bonos') || localStorage.getItem('printer_boletos') || '';
    setPrinterBono(printBono);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { limit: pageSize, page, ...Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)) };
      const res = await cobrosService.listarBonos(params);
      if (res.success) { setData(res.data); setTotal(res.total); }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [page, filtros]);

  // ─── Manejar impresión del ticket ──────────────────────────────
  const imprimirTicket = async (ticket) => {
    // Generar blob URL con el HTML del ticket
    const url = crearBlobUrlTicket(ticket);
    setPdfModalUrl(url);
    setPdfModalTitle(`Bono N° ${ticket.numero}`);

    if (metodoImpresion === 'directa') {
      try {
        if (!printerBono) {
          toast.error('No hay impresora configurada para bonos. Mostrando vista previa...');
          setShowPdfModal(true);
          return;
        }

        await loadQZ();
        configurarQZ();
        await conectarQZ();

        // Imprimir vía QZ Tray usando el blob URL del HTML
        const config = window.qz.configs.create(printerBono, {
          scaleContent: true,
          units: 'mm',
          margins: { top: 0, bottom: 0, left: 8, right: 2 }
        });

        const data = [{
          type: 'html',
          format: 'plain',
          data: generarHtmlTicket(ticket)
        }];

        await window.qz.print(config, data);
        toast.success('Bono impreso en ' + printerBono);
        return; // No mostrar modal si QZ funcionó
      } catch (e) {
        console.error('[QZ] Error al imprimir bono:', e);
        toast.error('Error al imprimir vía QZ Tray. Mostrando vista previa...');
        // Fallback al modal
        setShowPdfModal(true);
      }
    } else {
      // Método manual: mostrar modal con iframe
      setShowPdfModal(true);
    }
  };

  // ─── Ver ticket desde la tabla ─────────────────────────────────
  const handleVerTicket = async (row) => {
    const ticket = {
      cooperativa: row.nombre_empresa || 'COOPERATIVA DE TRANSPORTES',
      bus: row.disco_buses,
      socio: row.socio_nombre,
      valor: row.valor,
      motivo: row.motivo,
      observacion: row.observacion,
      fecha: row.fecha,
      numero: row.numero_ticket
    };
    await imprimirTicket(ticket);
  };

  // ─── Después de crear bono - onSuccess ─────────────────────────
  const handleBonoCreado = async (ticket) => {
    setShowModal(false);
    loadData();
    if (ticket) {
      Swal.fire({
        icon: 'success',
        title: 'Bono registrado',
        text: `Ticket N° ${ticket.numero}`,
        showCancelButton: true,
        confirmButtonText: 'Imprimir',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#059669',
      }).then(result => {
        if (result.isConfirmed) {
          imprimirTicket(ticket);
        }
      });
    }
  };

  // ─── Anular bono ───────────────────────────────────────────────
  const handleAnularConfirm = async (motivo) => {
    if (!anularBono) return;
    const res = await cobrosService.anularBono({ id_bono: anularBono.id_bono, motivo });
    if (res.success) { Swal.fire('Éxito', 'Bono anulado', 'success'); loadData(); }
    else Swal.fire('Error', res.message, 'error');
    setAnularBono(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* PdfViewerModal */}
      <PdfViewerModal
        open={showPdfModal}
        onClose={() => {
          setShowPdfModal(false);
          if (pdfModalUrl) URL.revokeObjectURL(pdfModalUrl);
        }}
        url={pdfModalUrl}
        title={pdfModalTitle}
        showPrintButton
      />

      {showModal && <NuevoBonoModal onClose={() => setShowModal(false)} onSuccess={handleBonoCreado} onNoCaja={() => setShowApertura(true)} />}
      {anularBono && <MotivoModal isOpen={true} onClose={() => setAnularBono(null)} onConfirm={handleAnularConfirm} title="Anular Bono" confirmText="Anular" />}
      <AperturaCajaCobrosModal
        isOpen={showApertura}
        onClose={() => setShowApertura(false)}
        onSuccess={() => { setShowApertura(false); setShowModal(true); }}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <i className="fas fa-gift text-emerald-600"></i> Bonos
        </h1>
        <button onClick={handleNuevoBonoClick} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-2">
          <i className="fas fa-plus-circle"></i> Nuevo Bono
        </button>
      </div>

      {/* ═══ FILTROS ═══ */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Fecha desde */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              <i className="fas fa-calendar-alt mr-1 text-emerald-500"></i>Fecha Desde
            </label>
            <input type="date" className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
              value={filtros.fecha_desde} max={hoyStr}
              onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))} />
          </div>
          {/* Fecha hasta */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              <i className="fas fa-calendar-alt mr-1 text-emerald-500"></i>Fecha Hasta
            </label>
            <input type="date" className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
              value={filtros.fecha_hasta} max={hoyStr}
              onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))} />
          </div>
          {/* N° Ticket */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              <i className="fas fa-ticket-alt mr-1 text-emerald-500"></i>N° Ticket
            </label>
            <input type="text" className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
              placeholder="Buscar ticket..." value={filtros.numero_ticket}
              onChange={e => setFiltros(f => ({ ...f, numero_ticket: e.target.value }))} />
          </div>
          {/* Socio */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              <i className="fas fa-user mr-1 text-emerald-500"></i>Socio (Cédula/Nombre)
            </label>
            <input type="text" className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
              placeholder="Buscar socio..." value={filtros.socio_busqueda}
              onChange={e => setFiltros(f => ({ ...f, socio_busqueda: e.target.value }))} />
          </div>
          {/* Bus */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              <i className="fas fa-bus mr-1 text-emerald-500"></i>Bus (Disco/Placa)
            </label>
            <input type="text" className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
              placeholder="Buscar bus..." value={filtros.bus_busqueda}
              onChange={e => setFiltros(f => ({ ...f, bus_busqueda: e.target.value }))} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {/* Estado */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <i className="fas fa-flag mr-1"></i>Estado:
              </label>
              <select className="text-xs border border-slate-300 rounded-lg px-2 py-1.5"
                value={filtros.estado}
                onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}>
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="anulado">Anulado</option>
              </select>
            </div>
            {/* Registros encontrados */}
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
              <i className="fas fa-list mr-1"></i>{total} registro(s)
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setPage(1); setFiltros({ id_socio: '', id_bus: '', estado: '', numero_ticket: '', fecha_desde: '', fecha_hasta: '', socio_busqueda: '', bus_busqueda: '' }); }}
              className="px-3 py-1.5 bg-slate-400 hover:bg-slate-500 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1">
              <i className="fas fa-eraser"></i> Limpiar
            </button>
            <button onClick={() => setPage(1)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1">
              <i className="fas fa-search"></i> Buscar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">N° Ticket</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Socio</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Bus</th>
                <th className="px-3 py-2.5 text-right font-bold text-slate-600">Valor</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Motivo</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Observación</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Fecha</th>
                <th className="px-3 py-2.5 text-center font-bold text-slate-600">Estado</th>
                <th className="px-3 py-2.5 text-center font-bold text-slate-600">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8"><i className="fas fa-spinner fa-spin"></i> Cargando...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400"><i className="fas fa-inbox text-2xl mb-2 block"></i> No hay bonos registrados</td></tr>
              ) : data.map(d => (
                <tr key={d.id_bono} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-bold text-blue-600">{d.numero_ticket}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{d.socio_nombre}</div>
                    {d.socio_cedula && <div className="text-[10px] text-slate-400 font-mono">{d.socio_cedula}</div>}
                  </td>
                  <td className="px-3 py-2 font-bold">{d.disco_buses}</td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-600">{formatCurrency(d.valor)}</td>
                  <td className="px-3 py-2">{d.motivo}</td>
                  <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate">{d.observacion}</td>
                  <td className="px-3 py-2">{formatFecha(d.fecha)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : d.estado === 'anulado' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                      {capitalize(d.estado)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => handleVerTicket(d)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Ver Ticket">
                        <i className="fas fa-ticket-alt text-sm"></i>
                      </button>
                      {d.estado === 'activo' && (
                        <button onClick={() => setAnularBono(d)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Anular">
                          <i className="fas fa-ban text-sm"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t">
          <span className="text-xs text-slate-600">Total: {total} registro(s)</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 text-xs border rounded hover:bg-slate-100 disabled:opacity-30">Anterior</button>
            <span className="px-3 py-1 text-xs font-bold">Pág. {page}</span>
            <button disabled={page * pageSize >= total} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-xs border rounded hover:bg-slate-100 disabled:opacity-30">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
};
