import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';
import ViajesService from '../../../services/viajes.service';

export const DespachoViajeModal = ({ trip, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [buses, setBuses] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [detalle, setDetalle] = useState(null);

  const [form, setForm] = useState({
    id_viaje: trip?.id_viajes || '',
    codigo_viaje: trip?.id_viajes || '',
    nombre_ruta: trip?.nombre_ruta || '',
    id_ruta: trip?.id_ruta || '',
    fecha_salida: trip?.fecha_viaje || new Date().toISOString().split('T')[0],
    hora_salida: trip?.hora_salida || '',
    bus_disco: '',
    nombre_chofer: '',
    nombre_auxiliar: '',
    tarifa: '',
    recorrido: '',
    motivo: '',
    aprobado: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bRes, pRes, uRes] = await Promise.all([
          ViajesService.getBuses(),
          ViajesService.getPersonal({ limit: 9999 }),
          ViajesService.getUsuarios(),
        ]);
        if (bRes.success) setBuses(bRes.data);
        if (pRes.success) setPersonal(pRes.data);
        if (uRes.success) setUsuarios(uRes.data);

        // Cargar detalle del viaje si está disponible
        if (trip?.id_viajes) {
          const detailRes = await ViajesService.getTripDetail(trip.id_viajes);
          if (detailRes.success) {
            setDetalle(detailRes.data);
            setForm(f => ({
              ...f,
              bus_disco: detailRes.data?.unidad?.id || '',
              nombre_chofer: detailRes.data?.conductor?.id || '',
              nombre_auxiliar: detailRes.data?.auxiliar?.id || '',
              tarifa: detailRes.data?.valores?.entrega || '',
            }));
          }
        }
      } catch (e) { console.error('Error loading combos:', e); }
    };
    loadData();
  }, [trip]);

  const handleActualizarBus = async () => {
    if (!form.bus_disco || !form.nombre_chofer || !form.nombre_auxiliar) {
      toast.error('Debe seleccionar bus, chofer y auxiliar');
      return;
    }
    setLoading(true);
    try {
      const res = await ViajesService.changeBusTrip({
        id_viaje: form.id_viaje,
        id_bus: form.bus_disco,
        id_chofer: form.nombre_chofer,
        id_auxiliar: form.nombre_auxiliar,
      });
      if (res.success) toast.success('Bus actualizado correctamente');
      else toast.error(res.message);
    } catch (e) { toast.error('Error al actualizar bus'); }
    finally { setLoading(false); }
  };

  const handleDespachar = async () => {
    setLoading(true);
    try {
      // Usar el endpoint v1 (POST /viajes/despacharViajes) que soporta tarifa, motivo, aprobado, etc.
      const res = await api.post('/viajes/despacharViajes', {
        codigo_viaje: form.id_viaje,
        bus_disco: form.bus_disco,
        nombre_chofer: form.nombre_chofer,
        nombre_auxiliar: form.nombre_auxiliar,
        tarifa: form.tarifa || '0',
        motivo: form.motivo || '',
        aprobado: form.aprobado || '',
        id_ruta: form.id_ruta,
        fecha_salida: form.fecha_salida,
        hora_salida: form.hora_salida,
        recorrido: form.recorrido || '',
      });
      if (res.data?.success) {
        toast.success('Viaje despachado exitosamente');
        // Abrir PDF de despacho y PDF de listado de pasajeros
        const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
        window.open(`${baseUrl}/php/despachoViajePdf.php?id_viajes=${form.id_viaje}`, '_blank');
        window.open(`${baseUrl}/php/imprimirPasajeros.php?id_viaje=${form.id_viaje}`, '_blank');
        onClose(true);
      } else {
        toast.error(res.data?.message || 'Error al despachar');
      }
    } catch (e) { toast.error('Error al despachar viaje'); }
    finally { setLoading(false); }
  };

  const inputCls = 'w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white transition-all';
  const labelCls = 'block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <style>{fadeInKeyframes}</style>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
              <i className="fas fa-shipping-fast"></i>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Despacho Viaje #{trip?.id_viajes}</h2>
              <p className="text-[10px] font-bold text-slate-400">{trip?.nombre_ruta || ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Info del viaje */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <div>
              <span className={labelCls}>Código</span>
              <p className="text-sm font-black text-indigo-700">{form.id_viaje}</p>
            </div>
            <div>
              <span className={labelCls}>Ruta</span>
              <p className="text-sm font-semibold text-slate-700 truncate">{form.nombre_ruta}</p>
            </div>
            <div>
              <span className={labelCls}>Fecha</span>
              <input type="date" value={form.fecha_salida}
                onChange={e => setForm(f => ({ ...f, fecha_salida: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <span className={labelCls}>Hora</span>
              <input type="time" value={form.hora_salida}
                onChange={e => setForm(f => ({ ...f, hora_salida: e.target.value }))}
                className={inputCls} />
            </div>
          </div>

          {/* Bus + Actualizar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Bus Disco</label>
              <select value={form.bus_disco} onChange={e => setForm(f => ({ ...f, bus_disco: e.target.value }))}
                className={inputCls}>
                <option value="">Seleccionar...</option>
                {buses.map(b => (
                  <option key={b.id_buses || b.bus_id} value={b.id_buses || b.bus_id}>
                    {b.disco_buses || b.codigo_buses} - {b.placa_buses || ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Chofer</label>
              <select value={form.nombre_chofer} onChange={e => setForm(f => ({ ...f, nombre_chofer: e.target.value }))}
                className={inputCls}>
                <option value="">Seleccionar...</option>
                {personal.map(p => (
                  <option key={p.id_personal || p.per_codigo_personal} value={p.id_personal || p.per_codigo_personal}>
                    {p.per_nombres_persona || p.nombre_personal}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className={labelCls}>Auxiliar</label>
                <select value={form.nombre_auxiliar} onChange={e => setForm(f => ({ ...f, nombre_auxiliar: e.target.value }))}
                  className={inputCls}>
                  <option value="">Seleccionar...</option>
                  {personal.map(p => (
                    <option key={p.id_personal || p.per_codigo_personal} value={p.id_personal || p.per_codigo_personal}>
                      {p.per_nombres_persona || p.nombre_personal}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={handleActualizarBus} disabled={loading}
                className="h-9 px-3 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black rounded-lg transition-all flex items-center gap-1 uppercase tracking-wider whitespace-nowrap shadow-sm">
                <i className="fas fa-sync-alt text-[10px]"></i> ACTUALIZAR
              </button>
            </div>
          </div>

          {/* Resumen de valores (desde detalle) */}
          {detalle && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Boletos</span>
                <p className="text-lg font-black text-emerald-700">${parseFloat(detalle.valores?.boletos || 0).toFixed(2)}</p>
                <span className="text-[10px] text-slate-500">{detalle.cantidad_boletos || 0} pasajeros</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Retención</span>
                <p className="text-lg font-black text-amber-600">${parseFloat(detalle.valores?.retencion || 0).toFixed(2)}</p>
                <span className="text-[10px] text-slate-500">CxC + % sucursal</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">A Entregar</span>
                <p className="text-lg font-black text-blue-700">${parseFloat(detalle.valores?.entrega || 0).toFixed(2)}</p>
                <span className="text-[10px] text-slate-500">Neto conductor</span>
              </div>
            </div>
          )}

          {/* Tarifa + Recorrido + Motivo + Aprobado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tarifa</label>
              <input type="number" step="0.01" value={form.tarifa}
                onChange={e => setForm(f => ({ ...f, tarifa: e.target.value }))}
                className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Aprueba</label>
              <select value={form.aprobado} onChange={e => setForm(f => ({ ...f, aprobado: e.target.value }))}
                className={inputCls}>
                <option value="">Seleccionar...</option>
                {usuarios.map(u => (
                  <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_usuario}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Recorrido</label>
            <textarea value={form.recorrido} rows={2} placeholder="Describa el recorrido..."
              onChange={e => setForm(f => ({ ...f, recorrido: e.target.value }))}
              className={`${inputCls} resize-none h-16 pt-2`} />
          </div>
          <div>
            <label className={labelCls}>Motivo del Cambio</label>
            <input type="text" value={form.motivo} placeholder="Escriba el motivo del cambio..."
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
              className={inputCls} />
          </div>

          {/* Asientos del viaje */}
          {detalle?.asientos && detalle.asientos.length > 0 && (
            <div>
              <label className={labelCls}>Pasajeros ({detalle.asientos.length})</label>
              <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {detalle.asientos.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 text-[10px]">
                    <span className="font-bold text-slate-600 w-8">#{a.numero}</span>
                    <span className="font-semibold text-slate-700 flex-1">{a.pasajero?.nombre || '—'}</span>
                    <span className="text-slate-400 w-20">{a.pasajero?.destino || ''}</span>
                    <span className="font-bold text-emerald-600 w-16 text-right">${parseFloat(a.pasajero?.precio || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose}
            className="h-9 px-5 text-[10px] font-black text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all uppercase tracking-widest">
            Cancelar
          </button>
          <button onClick={handleDespachar} disabled={loading || !form.bus_disco}
            className="h-9 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest shadow-sm">
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
            {loading ? 'Despachando...' : 'Despachar Viaje'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DespachoViajeModal;
