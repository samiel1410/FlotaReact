import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const MODOS = {
  NORMAL: 'NORMAL',
  AGENCIA: 'AGENCIA',
  SIN_RETENCION: 'SIN_RETENCION',
};

const OPCIONES_MODO = [
  { value: MODOS.NORMAL, label: 'Normal (busero / agencia)' },
  { value: MODOS.AGENCIA, label: '% de la agencia' },
  { value: MODOS.SIN_RETENCION, label: 'Sin retención de %' },
];

const DIAS_CORTOS = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom',
};

const colorModo = (modo) => {
  if (modo === MODOS.SIN_RETENCION) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (modo === MODOS.AGENCIA) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const etiquetaModo = (modo) => {
  if (modo === MODOS.SIN_RETENCION) return 'Sin retención';
  if (modo === MODOS.AGENCIA) return '% Agencia';
  return 'Normal';
};

const selectorClass = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 disabled:bg-slate-100 disabled:text-slate-400';

export const RetencionesFrecuenciaModal = ({ initialData, onClose, onCancel }) => {
  const cerrar = onClose || onCancel;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [habilitado, setHabilitado] = useState(false);
  const [agencia, setAgencia] = useState(null);
  const [rutas, setRutas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [expandidas, setExpandidas] = useState(() => new Set());

  // Claves: `${id_ruta}:${hora}`. La hora vacía representa "toda la ruta".
  // Solo guarda overrides explícitos (lo que difiere del modo normal o del
  // modo general de la ruta).
  const [configs, setConfigs] = useState(() => new Map());

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      setLoading(true);
      try {
        const res = await api.get('/sucursal/retencionesFrecuencia', {
          params: { id_sucursal: initialData?.id_sucursal },
        });
        if (!activo) return;
        if (!res.data?.success) {
          toast.error(res.data?.mensaje || 'No se pudo cargar la configuración');
          setRutas([]);
          return;
        }

        const data = res.data.data || {};
        setHabilitado(Boolean(res.data.habilitado));
        setAgencia(data);

        const nuevos = new Map();
        const abrir = new Set();
        for (const ruta of data.rutas || []) {
          if (ruta.modo_ruta && ruta.modo_ruta !== MODOS.NORMAL) {
            nuevos.set(`${ruta.id_ruta}:`, ruta.modo_ruta);
            abrir.add(ruta.id_ruta);
          }
          for (const f of ruta.frecuencias || []) {
            // Un horario con fila explícita en modo NORMAL sirve para
            // sobreescribir un "toda la ruta" con retención/agencia.
            if (f.configurada && (f.modo !== MODOS.NORMAL || (ruta.modo_ruta && ruta.modo_ruta !== MODOS.NORMAL))) {
              nuevos.set(`${ruta.id_ruta}:${f.hora}`, f.modo);
              abrir.add(ruta.id_ruta);
            }
          }
        }
        setConfigs(nuevos);
        setExpandidas(abrir);
        setRutas(data.rutas || []);
      } catch (error) {
        if (activo) {
          console.error('Error cargando retenciones por frecuencia:', error);
          toast.error('Error de comunicación al cargar la configuración');
        }
      } finally {
        if (activo) setLoading(false);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [initialData?.id_sucursal]);

  const rutasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return rutas;
    return rutas.filter((r) =>
      String(r.nombre_ruta || '').toLowerCase().includes(texto) ||
      String(r.codigo_ruta || '').toLowerCase().includes(texto) ||
      (r.frecuencias || []).some((f) => String(f.hora || '').includes(texto))
    );
  }, [rutas, busqueda]);

  const modoRuta = (idRuta) => configs.get(`${idRuta}:`) || MODOS.NORMAL;

  const cambiarModoRuta = (ruta, valor) => {
    setConfigs((prev) => {
      const next = new Map(prev);
      const routeKey = `${ruta.id_ruta}:`;
      if (valor === MODOS.NORMAL) next.delete(routeKey);
      else next.set(routeKey, valor);

      // Las frecuencias que quedaban heredando el modo anterior se limpian si
      // ahora coinciden con el nuevo modo general de la ruta.
      for (const f of ruta.frecuencias || []) {
        const key = `${ruta.id_ruta}:${f.hora}`;
        if (next.has(key) && next.get(key) === valor) next.delete(key);
      }
      return next;
    });
  };

  const cambiarModoFrecuencia = (ruta, hora, valor) => {
    const routeMode = modoRuta(ruta.id_ruta);
    setConfigs((prev) => {
      const next = new Map(prev);
      const key = `${ruta.id_ruta}:${hora}`;
      if (valor === routeMode) next.delete(key);
      else next.set(key, valor);
      return next;
    });
  };

  const alternarRuta = (idRuta) => {
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(idRuta)) next.delete(idRuta);
      else next.add(idRuta);
      return next;
    });
  };

  const totalOverrides = configs.size;

  const guardar = async () => {
    if (!habilitado) {
      toast.error('Activa "Retenciones por Frecuencias" en Configuración para guardar.');
      return;
    }

    const items = [];
    for (const [key, modo] of configs.entries()) {
      if (!modo) continue;
      const separador = key.indexOf(':');
      const idRuta = Number(key.slice(0, separador));
      const hora = key.slice(separador + 1);
      if (!idRuta) continue;
      items.push({ id_ruta: idRuta, hora, modo });
    }

    setSaving(true);
    try {
      const res = await api.post('/sucursal/retencionesFrecuencia', {
        id_sucursal: agencia?.id_sucursal || initialData?.id_sucursal,
        items,
      });
      if (res.data?.success) {
        toast.success('Configuración de retenciones por frecuencia guardada');
        cerrar?.();
      } else {
        toast.error(res.data?.mensaje || 'No se pudo guardar la configuración');
      }
    } catch (error) {
      console.error('Error guardando retenciones por frecuencia:', error);
      toast.error('Error de comunicación al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Agencia / Sucursal</p>
            <h3 className="text-lg font-black text-slate-800">
              {agencia?.nombre_sucursal || initialData?.nombre_sucursal || 'Agencia'}
            </h3>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              Porcentaje de retención de la agencia: <span className="font-black text-indigo-700">{Number(agencia?.porcentaje_retencion || initialData?.porcentaje_retencion || 0).toFixed(2)}%</span>
            </p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Excepciones configuradas</p>
            <p className="text-xl font-black text-indigo-700">{totalOverrides}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-1.5 text-[10px] font-semibold text-slate-600 sm:grid-cols-3">
          <div className="rounded-lg bg-white/80 px-2.5 py-2 border border-slate-200">
            <span className={`mr-1 inline-block rounded border px-1.5 py-0.5 text-[9px] font-black ${colorModo(MODOS.NORMAL)}`}>Normal</span>
            Usa el % individual del busero; si no tiene, el % de la agencia.
          </div>
          <div className="rounded-lg bg-white/80 px-2.5 py-2 border border-slate-200">
            <span className={`mr-1 inline-block rounded border px-1.5 py-0.5 text-[9px] font-black ${colorModo(MODOS.AGENCIA)}`}>% Agencia</span>
            Ignora el % del busero y retiene con el % de la agencia.
          </div>
          <div className="rounded-lg bg-white/80 px-2.5 py-2 border border-slate-200">
            <span className={`mr-1 inline-block rounded border px-1.5 py-0.5 text-[9px] font-black ${colorModo(MODOS.SIN_RETENCION)}`}>Sin retención</span>
            No retiene el % de comisión. Deudas, multas y cobros fijos siguen aplicando.
          </div>
        </div>
      </div>

      {!loading && !habilitado && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-800">
          <i className="fas fa-lock mr-2" />
          La opción está deshabilitada. Actívala en <strong>Configuración → Boletería → Retenciones por Frecuencias</strong> para poder guardar cambios.
        </div>
      )}

      <div className="relative">
        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar ruta por nombre, código u horario..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
        />
      </div>

      <div className="max-h-[52vh] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400">
            <i className="fas fa-circle-notch fa-spin text-2xl text-indigo-500" />
            <p className="text-xs font-bold">Cargando rutas y frecuencias...</p>
          </div>
        ) : rutasFiltradas.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400">
            No se encontraron rutas con ese criterio.
          </div>
        ) : (
          rutasFiltradas.map((ruta) => {
            const abierta = expandidas.has(ruta.id_ruta) || Boolean(busqueda.trim());
            const modoGeneral = modoRuta(ruta.id_ruta);
            const frecuencias = ruta.frecuencias || [];
            const overridesRuta = frecuencias.filter((f) => {
              const key = `${ruta.id_ruta}:${f.hora}`;
              return configs.has(key) && configs.get(key) !== modoGeneral;
            }).length;

            return (
              <div key={ruta.id_ruta} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => alternarRuta(ruta.id_ruta)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                    title={abierta ? 'Ocultar frecuencias' : 'Ver frecuencias'}
                  >
                    <i className={`fas fa-chevron-${abierta ? 'down' : 'right'} text-[10px]`} />
                  </button>

                  <div className="min-w-[180px] flex-1">
                    <p className="text-xs font-black uppercase tracking-tight text-slate-800">
                      {ruta.nombre_ruta || `Ruta #${ruta.id_ruta}`}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {ruta.codigo_ruta ? `Código ${ruta.codigo_ruta} · ` : ''}
                      {frecuencias.length} frecuencia(s)
                      {overridesRuta > 0 ? ` · ${overridesRuta} excepción(es)` : ''}
                      {Number(ruta.estado_ruta) === 0 ? ' · Inactiva' : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`hidden rounded-md border px-1.5 py-0.5 text-[9px] font-black sm:inline-block ${colorModo(modoGeneral)}`}>
                      Toda la ruta: {etiquetaModo(modoGeneral)}
                    </span>
                    <select
                      value={modoGeneral}
                      disabled={!habilitado}
                      onChange={(e) => cambiarModoRuta(ruta, e.target.value)}
                      className={`${selectorClass} min-w-[190px]`}
                      title="Modo para todas las frecuencias de la ruta"
                    >
                      {OPCIONES_MODO.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {abierta && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2">
                    {frecuencias.length === 0 ? (
                      <p className="py-2 text-[10px] font-bold text-slate-400">
                        Esta ruta no tiene horarios definidos en su itinerario. Se aplicará el modo de "toda la ruta".
                      </p>
                    ) : (
                      <div className="grid gap-1.5 md:grid-cols-2">
                        {frecuencias.map((f) => {
                          const key = `${ruta.id_ruta}:${f.hora}`;
                          const valor = configs.has(key) ? configs.get(key) : modoGeneral;
                          const esOverride = configs.has(key) && valor !== modoGeneral;

                          return (
                            <div
                              key={f.hora}
                              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${esOverride ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200 bg-white'}`}
                            >
                              <div className="min-w-[70px]">
                                <p className="font-mono text-xs font-black text-slate-800">{f.hora}</p>
                                <p className={`text-[8px] font-black uppercase tracking-wider ${f.activo ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {f.activo ? 'Activa' : 'Inactiva'}
                                </p>
                              </div>
                              <div className="hidden flex-1 flex-wrap gap-0.5 sm:flex">
                                {Object.entries(DIAS_CORTOS).map(([dia, corto]) => (
                                  <span
                                    key={dia}
                                    className={`rounded px-1 py-0.5 text-[8px] font-bold ${f.dias?.includes(dia) ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-300'}`}
                                    title={dia}
                                  >
                                    {corto}
                                  </span>
                                ))}
                              </div>
                              <select
                                value={valor}
                                disabled={!habilitado}
                                onChange={(e) => cambiarModoFrecuencia(ruta, f.hora, e.target.value)}
                                className={`${selectorClass} max-w-[190px]`}
                              >
                                {OPCIONES_MODO.map((op) => (
                                  <option key={op.value} value={op.value}>
                                    {op.label}{op.value === modoGeneral ? ' (hereda)' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="max-w-md text-[10px] font-semibold text-slate-400">
          Lo específico de un horario manda sobre "toda la ruta". Solo se guardan las excepciones; los valores heredados usan el modo general.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cerrar}
            className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={saving || loading || !habilitado}
            className="flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <><i className="fas fa-circle-notch fa-spin" /> Guardando...</> : <><i className="fas fa-save" /> Guardar configuración</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RetencionesFrecuenciaModal;
