import { useState, useEffect, useRef } from 'react';
import { api } from '../../config/axios';
import Swal from 'sweetalert2';
import Modal from '../../components/common/Modal';
import MotivoModal from '../../components/common/MotivoModal';
import SocioBusSelector from '../../components/common/SocioBusSelector';
import { cobrosService } from '../../services/cobros.service';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;

const TicketBono = ({ ticket, onClose }) => {
  const printRef = useRef();
  const handlePrint = () => { const win = window.open('', '_blank'); win.document.write(printRef.current.innerHTML); win.print(); };

  if (!ticket) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div ref={printRef} className="p-6 text-center">
          <h2 className="text-lg font-bold text-slate-800 border-b pb-3">{ticket.cooperativa}</h2>
          <div className="py-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="font-bold text-slate-600">Bono N°:</span><span>{ticket.numero}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-600">Bus:</span><span>{ticket.bus}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-600">Socio:</span><span>{ticket.socio}</span></div>
            <div className="flex justify-between text-lg font-bold text-emerald-600"><span>Valor:</span><span>{formatCurrency(ticket.valor)}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-600">Motivo:</span><span>{ticket.motivo}</span></div>
            {ticket.observacion && <div className="flex justify-between"><span className="font-bold text-slate-600">Observación:</span><span>{ticket.observacion}</span></div>}
            <div className="flex justify-between"><span className="font-bold text-slate-600">Fecha:</span><span>{ticket.fecha}</span></div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-slate-400 mb-1">_________________________</p>
            <p className="text-xs font-bold text-slate-600">Firma Responsable</p>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t bg-slate-50 rounded-b-xl">
          <button onClick={handlePrint} className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700"><i className="fas fa-print mr-2"></i>Imprimir</button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-300"><i className="fas fa-times"></i></button>
        </div>
      </div>
    </div>
  );
};

const NuevoBonoModal = ({ onClose, onSuccess }) => {
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
        Swal.fire('Éxito', 'Bono registrado', 'success');
        if (res.notificacion) {
          api.post('/whatsapp/enviar', { number: res.notificacion.telefono, message: res.notificacion.mensaje }).catch(() => {});
        }
        onSuccess(res.ticket);
      } else Swal.fire('Error', res.message, 'error');
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

export const BonosPage = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [ticketPreview, setTicketPreview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [anularBono, setAnularBono] = useState(null);
  const [filtros, setFiltros] = useState({ id_socio: '', id_bus: '', estado: 'activo' });

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { limit: pageSize, page, ...Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)) };
      const res = await cobrosService.listarBonos(params);
      if (res.success) { setData(res.data); setTotal(res.total); }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [page, filtros]);

  const handleVerTicket = (row) => {
    setTicketPreview({
      cooperativa: row.nombre_empresa || 'COOPERATIVA DE TRANSPORTES',
      bus: row.disco_buses,
      socio: row.socio_nombre,
      valor: row.valor,
      motivo: row.motivo,
      observacion: row.observacion,
      fecha: row.fecha,
      numero: row.numero_ticket
    });
  };

  const handleAnularConfirm = async (motivo) => {
    if (!anularBono) return;
    const res = await cobrosService.anularBono({ id_bono: anularBono.id_bono, motivo });
    if (res.success) { Swal.fire('Éxito', 'Bono anulado', 'success'); loadData(); }
    else Swal.fire('Error', res.message, 'error');
    setAnularBono(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {ticketPreview && <TicketBono ticket={ticketPreview} onClose={() => setTicketPreview(null)} />}
      {showModal && <NuevoBonoModal onClose={() => setShowModal(false)} onSuccess={(ticket) => { setShowModal(false); if (ticket) setTicketPreview(ticket); loadData(); }} />}
      {anularBono && <MotivoModal isOpen={true} onClose={() => setAnularBono(null)} onConfirm={handleAnularConfirm} title="Anular Bono" confirmText="Anular" />}

      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
        <i className="fas fa-gift text-emerald-600"></i> Bonos
      </h1>

      <div className="flex items-center gap-2">
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-2">
          <i className="fas fa-plus-circle"></i> Nuevo Bono
        </button>
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
                  <td className="px-3 py-2">{d.socio_nombre}</td>
                  <td className="px-3 py-2 font-bold">{d.disco_buses}</td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-600">{formatCurrency(d.valor)}</td>
                  <td className="px-3 py-2">{d.motivo}</td>
                  <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate">{d.observacion}</td>
                  <td className="px-3 py-2">{d.fecha}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {d.estado}
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