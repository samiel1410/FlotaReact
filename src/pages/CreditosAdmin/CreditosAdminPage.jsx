import { useState, useEffect } from 'react';
import { api } from '../../config/axios';
import Swal from 'sweetalert2';
import Modal from '../../components/common/Modal';
import SocioBusSelector from '../../components/common/SocioBusSelector';
import { cobrosService } from '../../services/cobros.service';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
const formatFecha = (f) => f ? (f.split('T')[0] || f.split(' ')[0]) : '-';
const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const NuevoCreditoModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ id_socio: '', id_bus: '', concepto: '', valor: '100', observacion: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    const { id_socio, id_bus, concepto, valor } = form;
    if (!id_socio || !id_bus || !concepto || !valor) { Swal.fire('Validación', 'Complete todos los campos', 'warning'); return; }
    setLoading(true);
    try {
      const res = await cobrosService.agregarCredito(form);
      if (res.success) {
        Swal.fire('Éxito', 'Crédito registrado', 'success');
        if (res.notificacion?.telefono) {
          api.post('/whatsapp/enviar', { number: res.notificacion.telefono, message: res.notificacion.mensaje }).catch(() => {});
        }
        onSuccess();
      } else Swal.fire('Error', res.message, 'error');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Nuevo Crédito Administrativo" width="max-w-md">
      <div className="space-y-4">
        <SocioBusSelector
          idSocio={form.id_socio} idBus={form.id_bus}
          onSocioChange={v => handleChange('id_socio', v)}
          onBusChange={v => handleChange('id_bus', v)}
        />
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Motivo / Concepto</label>
          <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Ej: Llantas, Préstamo, Descuento..." value={form.concepto} onChange={e => handleChange('concepto', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Valor ($)</label>
          <input type="number" step="0.01" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" value={form.valor} onChange={e => handleChange('valor', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Observación</label>
          <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows={3} value={form.observacion} onChange={e => handleChange('observacion', e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2">
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-save"></i> Guardar</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const CreditosAdminPage = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ id_socio: '', id_bus: '', estado: '', fecha_desde: '', fecha_hasta: '' });
  const [showModal, setShowModal] = useState(false);

  const hoyStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { limit: pageSize, page, ...Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)) };
      const res = await cobrosService.listarCreditos(params);
      if (res.success) { setData(res.data); setTotal(res.total); }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [page, filtros]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {showModal && <NuevoCreditoModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); loadData(); }} />}

      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
        <i className="fas fa-hand-holding-usd text-purple-600"></i> Créditos Administrativos
      </h1>

      <div className="flex items-center gap-2">
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 flex items-center gap-2">
          <i className="fas fa-plus-circle"></i> Nuevo Crédito
        </button>
      </div>

      {/* ─── FILTROS ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha Desde</label>
            <input type="date" className="border border-slate-300 rounded px-2 py-1.5 text-xs w-[140px]"
              value={filtros.fecha_desde} max={hoyStr}
              onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha Hasta</label>
            <input type="date" className="border border-slate-300 rounded px-2 py-1.5 text-xs w-[140px]"
              value={filtros.fecha_hasta} max={hoyStr}
              onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Estado</label>
            <select className="border border-slate-300 rounded px-2 py-1.5 text-xs w-[120px]"
              value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}>
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Parcial</option>
              <option value="pagado">Pagado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
          <button onClick={() => { setFiltros({ id_socio: '', id_bus: '', estado: '', fecha_desde: '', fecha_hasta: '' }); setPage(1); }}
            className="px-3 py-1.5 bg-slate-400 text-white text-xs font-bold rounded hover:bg-slate-500">
            <i className="fas fa-eraser"></i> Limpiar
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">ID</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Socio</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Bus</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Concepto</th>
                <th className="px-3 py-2.5 text-right font-bold text-slate-600">Valor</th>
                <th className="px-3 py-2.5 text-right font-bold text-slate-600">Pagado</th>
                <th className="px-3 py-2.5 text-right font-bold text-slate-600">Saldo</th>
                <th className="px-3 py-2.5 text-center font-bold text-slate-600">Estado</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400"><i className="fas fa-spinner fa-spin"></i> Cargando...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400"><i className="fas fa-inbox text-2xl mb-2 block"></i> No hay créditos registrados</td></tr>
              ) : data.map(d => (
                <tr key={d.id_deuda} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{d.id_deuda}</td>
                  <td className="px-3 py-2">{d.socio_nombre}</td>
                  <td className="px-3 py-2 font-bold">{d.disco_buses}</td>
                  <td className="px-3 py-2">{d.concepto}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(d.valor_original)}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(d.valor_pagado)}</td>
                  <td className="px-3 py-2 text-right text-amber-600 font-bold">{formatCurrency(d.saldo_pendiente)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      d.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' :
                      d.estado === 'parcial' ? 'bg-amber-100 text-amber-700' :
                      d.estado === 'anulado' ? 'bg-red-100 text-red-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {d.estado === 'pagado' ? 'Pagado' :
                       d.estado === 'parcial' ? 'Parcial' :
                       d.estado === 'anulado' ? 'Anulado' :
                       capitalize(d.estado)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{formatFecha(d.fecha_creacion)}</td>
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
