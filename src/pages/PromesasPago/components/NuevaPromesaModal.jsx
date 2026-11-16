import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/common/Modal';
import { dialog } from '../../../components/common/dialog/dialog';
import { promesaPagoService } from '../../../services/promesaPago.service';
import toast from 'react-hot-toast';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
const pad = (n) => String(n).padStart(2, '0');
const fechaLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoyISO = () => fechaLocal(new Date());
const sumarDias = (dias) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return fechaLocal(d);
};
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const conceptoPorDefecto = () => {
  const d = new Date();
  return `Cuota administrativa ${MESES[d.getMonth()]} ${d.getFullYear()}`;
};

const nuevaCuota = (fecha, monto = '') => ({ fecha_promesa: fecha, monto });

/**
 * Creación individual o masiva de promesas de pago con varias fechas.
 */
export const NuevaPromesaModal = ({ onClose, onSuccess, initialItem = null, modoInicial = 'individual' }) => {
  const saldoInicial = initialItem
    ? parseFloat(initialItem.saldo_pendiente ?? initialItem.monto_cobros ?? initialItem.monto ?? 0)
    : 0;

  const [modo, setModo] = useState(modoInicial === 'masiva' && !initialItem ? 'masiva' : 'individual');
  const [concepto, setConcepto] = useState(initialItem?.concepto || conceptoPorDefecto());
  const [montoTotal, setMontoTotal] = useState(saldoInicial ? String(saldoInicial) : '');
  const [cuotas, setCuotas] = useState(() => {
    if (!(saldoInicial > 0)) {
      return [nuevaCuota(sumarDias(7), ''), nuevaCuota(sumarDias(15), '')];
    }
    const base = Math.floor((saldoInicial / 2) * 100) / 100;
    return [
      nuevaCuota(sumarDias(7), base.toFixed(2)),
      nuevaCuota(sumarDias(15), (saldoInicial - base).toFixed(2)),
    ];
  });
  const [observacion, setObservacion] = useState('');
  const [config, setConfig] = useState(null);
  const [buses, setBuses] = useState([]);
  const [seleccionados, setSeleccionados] = useState(() => (initialItem?.id_bus ? [Number(initialItem.id_bus)] : []));
  const [textoBus, setTextoBus] = useState('');
  const [cargandoBuses, setCargandoBuses] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargarBuses = useCallback(async (texto = '') => {
    setCargandoBuses(true);
    try {
      const res = await promesaPagoService.busesDisponibles({ texto });
      if (res.success) {
        setBuses(res.data || []);
        if (res.config) setConfig(res.config);
      }
    } finally {
      setCargandoBuses(false);
    }
  }, []);

  useEffect(() => {
    cargarBuses();
  }, [cargarBuses]);

  useEffect(() => {
    const t = setTimeout(() => cargarBuses(textoBus), 350);
    return () => clearTimeout(t);
  }, [textoBus, cargarBuses]);

  const maxCuotas = config?.max_cuotas || 12;
  const diaCorte = config?.dia_corte || 25;

  const totalCuotas = useMemo(
    () => cuotas.reduce((s, c) => s + (parseFloat(c.monto) || 0), 0),
    [cuotas]
  );

  const agregarCuota = () => {
    if (cuotas.length >= maxCuotas) {
      toast.error(`Máximo ${maxCuotas} fechas por promesa`);
      return;
    }
    const ultima = cuotas[cuotas.length - 1]?.fecha_promesa || hoyISO();
    const d = new Date(`${ultima}T12:00:00`);
    d.setDate(d.getDate() + 15);
    setCuotas((prev) => [...prev, nuevaCuota(fechaLocal(d), '')]);
  };

  const quitarCuota = (idx) => {
    setCuotas((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const actualizarCuota = (idx, campo, valor) => {
    setCuotas((prev) => prev.map((c, i) => (i === idx ? { ...c, [campo]: valor } : c)));
  };

  const distribuir = () => {
    const total = parseFloat(montoTotal);
    if (!total || total <= 0) {
      toast.error('Ingrese primero el monto total');
      return;
    }
    const n = cuotas.length;
    const base = Math.floor((total / n) * 100) / 100;
    setCuotas((prev) => prev.map((c, i) => ({
      ...c,
      monto: i === n - 1 ? (total - base * (n - 1)).toFixed(2) : base.toFixed(2),
    })));
  };

  const toggleBus = (id) => {
    setSeleccionados((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const disponibles = useMemo(
    () => buses.filter((b) => Number(b.promesas_activas) === 0).map((b) => Number(b.id_buses)),
    [buses]
  );
  const todosSeleccionados = disponibles.length > 0 && disponibles.every((id) => seleccionados.includes(id));

  const seleccionarTodos = () => {
    setSeleccionados(todosSeleccionados ? [] : disponibles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const total = parseFloat(montoTotal);
    if (!total || total <= 0) {
      toast.error('Ingrese el monto total de la promesa');
      return;
    }
    if (cuotas.length === 0) {
      toast.error('Agregue al menos una fecha');
      return;
    }
    if (cuotas.length > maxCuotas) {
      toast.error(`Máximo ${maxCuotas} fechas por promesa`);
      return;
    }
    const fechas = new Set();
    for (const [idx, c] of cuotas.entries()) {
      if (!c.fecha_promesa) {
        toast.error(`Seleccione la fecha de la cuota ${idx + 1}`);
        return;
      }
      if (fechas.has(c.fecha_promesa)) {
        toast.error('No se puede repetir la misma fecha');
        return;
      }
      fechas.add(c.fecha_promesa);
      if (!(parseFloat(c.monto) > 0)) {
        toast.error(`Ingrese el monto de la cuota ${idx + 1}`);
        return;
      }
    }
    if (Math.abs(totalCuotas - total) > 0.01) {
      toast.error(`La suma de las cuotas (${formatCurrency(totalCuotas)}) no coincide con el total (${formatCurrency(total)})`);
      return;
    }
    if (modo === 'masiva' && seleccionados.length === 0) {
      toast.error('Seleccione al menos un bus');
      return;
    }

    const payload = {
      concepto: concepto.trim() || conceptoPorDefecto(),
      monto_total: total,
      cuotas: cuotas.map((c) => ({ fecha_promesa: c.fecha_promesa, monto: parseFloat(c.monto) })),
      observacion: observacion.trim(),
    };

    if (modo === 'masiva') {
      payload.ids_buses = seleccionados;
    } else if (initialItem) {
      payload.id_bus = initialItem.id_bus || undefined;
      payload.id_socio = initialItem.id_socio || undefined;
      if (initialItem.fuente === 'cobro') payload.id_cobro = initialItem.id_deuda;
      else payload.id_deuda = initialItem.id_deuda;
    } else {
      payload.id_bus = seleccionados[0] || undefined;
    }

    setGuardando(true);
    try {
      const res = await promesaPagoService.crear(payload);
      if (!res.success) {
        toast.error(res.message || 'No se pudo crear la promesa');
        return;
      }

      if (modo === 'masiva') {
        const d = res.data || {};
        const creadas = d.creadas?.length || 0;
        const omitidas = d.omitidas || [];
        const errores = d.errores || [];
        await dialog.fire({
          title: 'Promesas creadas',
          html: `
            <div style="text-align:left;font-size:13px;line-height:1.7">
              <p><b>${creadas}</b> promesa(s) creada(s) con ${cuotas.length} fecha(s).</p>
              ${omitidas.length ? `<p style="color:#b45309"><b>${omitidas.length}</b> omitida(s): ${omitidas.slice(0, 6).map((o) => `bus ${o.id_bus} (${o.motivo})`).join(', ')}</p>` : ''}
              ${errores.length ? `<p style="color:#b91c1c"><b>${errores.length}</b> con error: ${errores.slice(0, 6).map((o) => `bus ${o.id_bus} (${o.error})`).join(', ')}</p>` : ''}
            </div>`,
          icon: creadas > 0 ? 'success' : 'warning',
        });
      } else {
        toast.success('Promesa de pago creada correctamente');
      }

      onSuccess?.();
      onClose?.();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Nueva promesa de pago" width="max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
          <i className="fas fa-info-circle text-blue-600 mt-0.5" />
          <div>
            Mientras la promesa esté vigente y no pase el día <b>{diaCorte}</b>, la cuota administrativa
            <b> no se retiene</b> en el despacho. Desde el día siguiente al corte la retención vuelve a aplicar
            aunque la fecha prometida sea posterior.
          </div>
        </div>

        {!initialItem && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModo('individual')}
              className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${modo === 'individual' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              <i className="fas fa-user mr-1.5" /> Un bus / socio
            </button>
            <button
              type="button"
              onClick={() => setModo('masiva')}
              className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${modo === 'masiva' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              <i className="fas fa-bus mr-1.5" /> Masiva (varios buses)
            </button>
          </div>
        )}

        {initialItem && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Cuota a prometer</p>
            <p className="text-sm font-bold text-slate-800 mt-1">{initialItem.concepto || 'Cuota administrativa'}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
              <span><i className="fas fa-bus mr-1 text-slate-400" />Bus {initialItem.disco_buses || '-'}</span>
              <span><i className="fas fa-user mr-1 text-slate-400" />{initialItem.socio_nombre || '-'}</span>
              <span>Saldo: <b className="text-rose-600">{formatCurrency(saldoInicial)}</b></span>
            </div>
          </div>
        )}

        {modo === 'masiva' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-700">Buses para la promesa</p>
                <p className="text-[10px] text-slate-500">
                  {seleccionados.length} seleccionado(s). Se crea una promesa por socio.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                  <input
                    type="text"
                    value={textoBus}
                    onChange={(e) => setTextoBus(e.target.value)}
                    placeholder="Buscar bus, placa o socio..."
                    className="h-8 pl-8 pr-3 w-56 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={seleccionarTodos}
                  className="h-8 px-3 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
                >
                  {todosSeleccionados ? 'Quitar todos' : 'Seleccionar todos'}
                </button>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {cargandoBuses ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  <i className="fas fa-circle-notch fa-spin mr-1" /> Cargando buses...
                </div>
              ) : buses.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">No se encontraron buses.</div>
              ) : (
                buses.map((b) => {
                  const conPromesa = Number(b.promesas_activas) > 0;
                  const marcado = seleccionados.includes(Number(b.id_buses));
                  return (
                    <label
                      key={b.id_buses}
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${conPromesa ? 'opacity-60' : 'hover:bg-slate-50'}`}
                      title={conPromesa ? 'Este bus/socio ya tiene una promesa activa' : ''}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        disabled={conPromesa}
                        onChange={() => toggleBus(Number(b.id_buses))}
                        className="accent-blue-600"
                      />
                      <span className="w-14 text-center bg-blue-50 text-blue-700 font-black font-mono text-[11px] px-2 py-0.5 rounded-md border border-blue-200">
                        {b.disco_buses || '-'}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 flex-1 truncate">
                        {b.socio_nombre || 'Socio sin asignar'}
                        {b.per_cedula_personal ? ` · ${b.per_cedula_personal}` : ''}
                      </span>
                      {conPromesa ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Ya tiene promesa
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">{b.placa_buses || ''}</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {modo === 'individual' && !initialItem && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Bus / socio *</label>
            <select
              value={seleccionados[0] || ''}
              onChange={(e) => setSeleccionados(e.target.value ? [Number(e.target.value)] : [])}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              <option value="">Seleccione un bus...</option>
              {buses.map((b) => (
                <option key={b.id_buses} value={b.id_buses} disabled={Number(b.promesas_activas) > 0}>
                  Bus {b.disco_buses} · {b.socio_nombre || 'Sin socio'}
                  {Number(b.promesas_activas) > 0 ? ' (ya tiene promesa)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Concepto *</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ej. Cuota administrativa Noviembre 2026"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Monto total *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={montoTotal}
              onChange={(e) => setMontoTotal(e.target.value)}
              className="w-full text-sm font-bold text-slate-800 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-700">Fechas de pago</p>
              <p className="text-[10px] text-slate-500">
                {cuotas.length} de {maxCuotas} fechas · suma {formatCurrency(totalCuotas)} de {formatCurrency(montoTotal || 0)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={distribuir}
                className="h-7 px-2.5 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg"
                title="Repartir el monto total en partes iguales"
              >
                <i className="fas fa-divide mr-1" /> Distribuir
              </button>
              <button
                type="button"
                onClick={agregarCuota}
                className="h-7 px-2.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
              >
                <i className="fas fa-plus mr-1" /> Agregar fecha
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {cuotas.map((c, idx) => (
              <div key={idx} className="flex items-center gap-3 px-4 py-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Fecha</label>
                    <input
                      type="date"
                      value={c.fecha_promesa}
                      min={hoyISO()}
                      onChange={(e) => actualizarCuota(idx, 'fecha_promesa', e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Monto</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={c.monto}
                      onChange={(e) => actualizarCuota(idx, 'monto', e.target.value)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => quitarCuota(idx)}
                  disabled={cuotas.length <= 1}
                  className="w-7 h-7 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg disabled:opacity-30"
                  title="Quitar fecha"
                >
                  <i className="fas fa-times text-[10px]" />
                </button>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {cuotas.length > 0 && Math.abs(totalCuotas - (parseFloat(montoTotal) || 0)) > 0.01
                ? <span className="text-amber-700 font-semibold"><i className="fas fa-exclamation-triangle mr-1" />La suma no coincide con el total</span>
                : <span className="text-emerald-700 font-semibold"><i className="fas fa-check mr-1" />Montos cuadrados</span>}
            </span>
            <span className="font-mono font-bold text-slate-700">{formatCurrency(totalCuotas)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Observación</label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={2}
            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Motivo o detalle de la promesa (opcional)"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {guardando ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-calendar-check" />}
            {modo === 'masiva' ? `Crear ${seleccionados.length || 0} promesa(s)` : 'Crear promesa'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NuevaPromesaModal;
