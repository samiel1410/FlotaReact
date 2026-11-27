import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';
import ViajesService from '../../../services/viajes.service';
import { buildPdfUrl } from '../../../utils/pdfUrlUtils';
import { useAuth } from '../../../context/AuthContext';

// Margen para centavos de redondeo (venta por cabecera vs. suma de detalles).
// Debe coincidir con el que valida el backend en despacharViajesClases.
const TOLERANCIA_ENTREGA = 0.05;
const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

export const DespachoViajeModal = ({ trip, onClose }) => {
  const { user } = useAuth();
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

  // Neto que debe entregar la oficina en este turno. Es el mínimo permitido:
  // el oficinista puede entregar más, pero nunca menos.
  const entregaEsperada = useMemo(() => {
    const misValores = detalle?.valores?.sucursal_usuario || {};
    const pendiente = detalle?.despacho_pendiente;
    const valor = (pendiente?.hay_pendientes ? pendiente.entrega : null)
      ?? misValores.entrega
      ?? detalle?.valores?.entrega
      ?? 0;
    return round2(Math.max(0, parseFloat(valor) || 0));
  }, [detalle]);

  const montoEntrega = parseFloat(form.tarifa);
  const montoIngresado = Number.isFinite(montoEntrega) && montoEntrega >= 0;
  const idOperador = String(user?.id_usuario ?? user?.id ?? '');
  const entregaIncompleta = Boolean(detalle) && montoIngresado && montoEntrega + TOLERANCIA_ENTREGA < entregaEsperada;
  const entregaExtra = Boolean(detalle) && montoIngresado && montoEntrega - TOLERANCIA_ENTREGA > entregaEsperada;
  const autorizacionValida = Boolean(form.aprobado) && String(form.aprobado) !== idOperador;
  const faltaAutorizacion = entregaExtra && !autorizacionValida;

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
              tarifa: detailRes.data?.valores?.sucursal_usuario?.entrega ?? detailRes.data?.valores?.entrega ?? '',
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
    const monto = parseFloat(form.tarifa);
    if (!Number.isFinite(monto) || monto < 0) {
      toast.error('Ingrese el dinero que entrega el oficinista');
      return;
    }
    // Mismas reglas que valida el backend: nunca menos que el neto del turno
    // y, si entrega más, autorización de otro usuario.
    if (detalle && monto + TOLERANCIA_ENTREGA < entregaEsperada) {
      toast.error(`No puede entregar menos de $${entregaEsperada.toFixed(2)} (neto del turno)`);
      return;
    }
    if (detalle && monto - TOLERANCIA_ENTREGA > entregaEsperada) {
      if (!form.aprobado) {
        toast.error(`Para entregar más de $${entregaEsperada.toFixed(2)} seleccione quién autoriza`);
        return;
      }
      if (String(form.aprobado) === idOperador) {
        toast.error('La autorización debe ser de otro usuario, no del que despacha');
        return;
      }
    }
    setLoading(true);
    try {
      // Usar el endpoint v1 (POST /viajes/despacharViajes) que soporta tarifa, motivo, aprobado, etc.
      const res = await api.post('/viajes/despacharViajes', {
        codigo_viaje: form.id_viaje,
        // El <select> usa id_buses como valor; se envía también como id_bus
        // para que el backend no lo confunda con un número de disco.
        id_bus: form.bus_disco,
        bus_disco: form.bus_disco,
        nombre_chofer: form.nombre_chofer,
        nombre_auxiliar: form.nombre_auxiliar,
        tarifa: monto.toFixed(2),
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
        const nombreUsuario = user?.nombre_usuario || user?.nombre || user?.username || '';
        const idDespachoNuevo = res.data?.data?.idDespacho || res.data?.data?.id_despacho;
        const paramsDespacho = idDespachoNuevo
          ? `id_despacho=${idDespachoNuevo}&id_viajes=${form.id_viaje}`
          : `id_viajes=${form.id_viaje}`;
        const idUsuario = user?.id_usuario ? `&id_usuario=${user.id_usuario}` : '';
        window.open(baseUrl + buildPdfUrl(`/php/despachoViajePdf.php?${paramsDespacho}&usuario=${encodeURIComponent(nombreUsuario)}${idUsuario}`), '_blank');
        // La lista se imprime con el mismo despacho/corte: si no, mostraba toda
        // la venta del viaje (otras oficinas y turnos) y no cuadraba con la hoja.
        const paramsPasajeros = idDespachoNuevo
          ? `id_despacho=${idDespachoNuevo}&id_viaje=${form.id_viaje}`
          : `id_viaje=${form.id_viaje}`;
        window.open(baseUrl + buildPdfUrl(`/php/imprimirPasajeros.php?${paramsPasajeros}&usuario=${encodeURIComponent(nombreUsuario)}${idUsuario}`), '_blank');
        onClose(true);
      } else {
        toast.error(res.data?.message || 'Error al despachar');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al despachar viaje');
    }
    finally { setLoading(false); }
  };

  const inputCls = 'w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white transition-all';
  const labelCls = 'block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
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

          {/* Resumen de valores (desde detalle). Se usa la sucursal del usuario:
              el despacho entrega solo la venta de MI oficina posterior a su
              último corte (turno), no la venta completa del viaje. */}
          {detalle && (
            (() => {
              const misValores = detalle.valores?.sucursal_usuario || {};
              const boletos = parseFloat(misValores.boletos ?? detalle.valores?.boletos ?? 0);
              const retencion = parseFloat(misValores.retencion_aplicada ?? misValores.retencion ?? detalle.valores?.retencion ?? 0);
              const entrega = parseFloat(misValores.entrega ?? detalle.valores?.entrega ?? 0);
              const pasajeros = detalle.despacho_pendiente?.pasajeros?.length
                ?? misValores.cantidad_boletos
                ?? detalle.cantidad_boletos
                ?? 0;
              return (
                <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Boletos</span>
                    <p className="text-lg font-black text-emerald-700">${boletos.toFixed(2)}</p>
                    <span className="text-[10px] text-slate-500">{pasajeros} pasajeros</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Retención</span>
                    <p className="text-lg font-black text-amber-600">${retencion.toFixed(2)}</p>
                    <span className="text-[10px] text-slate-500">CxC + % sucursal</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">A Entregar</span>
                    <p className="text-lg font-black text-blue-700">${entrega.toFixed(2)}</p>
                    <span className="text-[10px] text-slate-500">Neto conductor</span>
                  </div>
                </div>
              );
            })()
          )}

          {/* Aviso de despacho por turno: ya existe una entrega previa de mi
              oficina y este despacho cubre solo las ventas nuevas. */}
          {detalle?.despachado_en_mi_sucursal && detalle?.despacho_pendiente?.hay_pendientes && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-semibold text-amber-900 flex items-start gap-2">
              <i className="fas fa-layer-group text-amber-600 mt-0.5" />
              <span>
                Su oficina ya tiene el despacho #{detalle.despacho_pendiente.desde_despacho_id || ''}.
                Este despacho entregará solo las <b>{detalle.despacho_pendiente.cantidad_boletos} venta(s) nueva(s)</b>
                {' '}por <b>${detalle.despacho_pendiente.entrega}</b>.
              </span>
            </div>
          )}

          {/* Dinero a entregar + autorización.
              El oficinista entrega lo que físicamente tiene: no puede ser
              menor al neto del turno; si entrega más, otro usuario autoriza. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Dinero a entregar</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black pointer-events-none">$</span>
                <input type="number" inputMode="decimal" min="0" step="0.01" value={form.tarifa}
                  onChange={e => setForm(f => ({ ...f, tarifa: e.target.value }))}
                  className={`${inputCls} pl-6 ${entregaIncompleta ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : ''}`}
                  placeholder="0.00" />
              </div>
              <p className="mt-1 text-[9px] font-semibold text-slate-400">
                Neto del turno: <span className="text-slate-600">${entregaEsperada.toFixed(2)}</span>
                {' '}· puede entregar igual o más, nunca menos
              </p>
              {entregaIncompleta && (
                <p className="mt-1 text-[10px] font-bold text-rose-600">
                  <i className="fas fa-ban mr-1" />No puede entregar menos de ${entregaEsperada.toFixed(2)}
                </p>
              )}
              {entregaExtra && (
                <p className="mt-1 text-[10px] font-bold text-amber-700">
                  <i className="fas fa-shield-halved mr-1" />
                  Entrega extra de ${(montoEntrega - entregaEsperada).toFixed(2)}: requiere autorización
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>
                {entregaExtra ? 'Autoriza la entrega extra *' : 'Autoriza (solo si entrega más)'}
              </label>
              <select value={form.aprobado} onChange={e => setForm(f => ({ ...f, aprobado: e.target.value }))}
                className={`${inputCls} ${faltaAutorizacion ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : ''}`}>
                <option value="">{entregaExtra ? 'Seleccione quién autoriza...' : 'Sin autorización requerida'}</option>
                {usuarios.map(u => {
                  const esOperador = String(u.id_usuario) === idOperador;
                  return (
                    <option key={u.id_usuario} value={u.id_usuario} disabled={esOperador}>
                      {u.nombre_usuario}{esOperador ? ' (usted)' : ''}
                    </option>
                  );
                })}
              </select>
              {faltaAutorizacion && (
                <p className="mt-1 text-[10px] font-bold text-rose-600">
                  <i className="fas fa-user-shield mr-1" />Seleccione otro usuario para autorizar el excedente
                </p>
              )}
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

          {/* Pasajeros que cubre ESTE despacho: si la oficina ya despachó un
              turno, solo se listan las ventas posteriores a ese corte. */}
          {(() => {
            const pasajerosLista = detalle?.despacho_pendiente?.hay_pendientes
              ? detalle.despacho_pendiente.pasajeros
              : (detalle?.asientos || []);
            if (!pasajerosLista || pasajerosLista.length === 0) return null;
            return (
              <div>
                <label className={labelCls}>Pasajeros ({pasajerosLista.length})</label>
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {pasajerosLista.map((a, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 text-[10px]">
                      <span className="font-bold text-slate-600 w-8">#{a.numero}</span>
                      <span className="font-semibold text-slate-700 flex-1">{a.pasajero?.nombre || '—'}</span>
                      <span className="text-slate-400 w-20">{a.pasajero?.destino || ''}</span>
                      <span className="font-bold text-emerald-600 w-16 text-right">${parseFloat(a.pasajero?.precio || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose}
            className="h-9 px-5 text-[10px] font-black text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all uppercase tracking-widest">
            Cancelar
          </button>
          <button onClick={handleDespachar}
            disabled={loading || !form.bus_disco || entregaIncompleta || faltaAutorizacion}
            title={entregaIncompleta
              ? `No puede entregar menos de $${entregaEsperada.toFixed(2)}`
              : (faltaAutorizacion ? 'Seleccione quién autoriza la entrega extra' : '')}
            className="h-9 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 uppercase tracking-widest shadow-sm">
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
            {loading ? 'Despachando...' : `Despachar ${montoIngresado ? `$${montoEntrega.toFixed(2)}` : 'Viaje'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DespachoViajeModal;
