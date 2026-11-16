import { useCallback, useEffect, useMemo, useState } from 'react';
import { promesaPagoService } from '../../../services/promesaPago.service';
import { PagoPromesaModal } from './PagoPromesaModal';
import { DetallePromesaModal } from './DetallePromesaModal';
import toast from 'react-hot-toast';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
const hoyISO = () => new Date().toISOString().slice(0, 10);
const formatoFecha = (f) => {
  if (!f) return '-';
  const solo = String(f).slice(0, 10);
  const [y, m, d] = solo.split('-');
  return `${d}/${m}/${y}`;
};

const estadoRow = (fila) => {
  const fecha = String(fila?.fecha_promesa || '').slice(0, 10);
  if (fecha && fecha < hoyISO()) return { label: 'Vencida', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'fa-exclamation-circle' };
  if (fecha === hoyISO()) return { label: 'Vence hoy', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'fa-bell' };
  return { label: 'Próxima', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'fa-clock' };
};

/**
 * Bandeja de promesas por cobrar para la caja de cobros. Muestra las cuotas
 * vencidas y las que vencen dentro del plazo de aviso configurado.
 */
export const PromesasPorCobrarPanel = ({ onResumenChange, onNuevaPromesa }) => {
  const [filas, setFilas] = useState([]);
  const [resumen, setResumen] = useState({ vencidas: 0, hoy: 0, proximas: 0, total_cobrar: 0, cantidad: 0 });
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [texto, setTexto] = useState('');
  const [incluirTodas, setIncluirTodas] = useState(false);
  const [cuotaPago, setCuotaPago] = useState(null);
  const [verPromesa, setVerPromesa] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await promesaPagoService.porCobrar({ incluir_todas: incluirTodas ? 1 : 0 });
      if (res.success) {
        setFilas(res.data || []);
        setResumen(res.resumen || { vencidas: 0, hoy: 0, proximas: 0, total_cobrar: 0, cantidad: 0 });
        setConfig(res.config || null);
        onResumenChange?.(res.resumen || {});
      } else {
        toast.error(res.message || 'Error al cargar promesas por cobrar');
      }
    } finally {
      setLoading(false);
    }
  }, [incluirTodas, onResumenChange]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = useMemo(() => {
    const t = texto.trim().toLowerCase();
    if (!t) return filas;
    return filas.filter((f) => (
      String(f.disco_buses || '').toLowerCase().includes(t)
      || String(f.placa_buses || '').toLowerCase().includes(t)
      || String(f.socio_nombre || '').toLowerCase().includes(t)
      || String(f.per_cedula_personal || '').toLowerCase().includes(t)
      || String(f.concepto || '').toLowerCase().includes(t)
    ));
  }, [filas, texto]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Vencidas</p>
          <p className="text-2xl font-black font-mono text-rose-600 mt-1">{resumen.vencidas || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Cuotas pasadas de fecha</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Vencen hoy</p>
          <p className="text-2xl font-black font-mono text-amber-600 mt-1">{resumen.hoy || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Para cobrar en caja</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Próximas</p>
          <p className="text-2xl font-black font-mono text-blue-600 mt-1">{resumen.proximas || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Dentro de {config?.dias_aviso ?? 5} día(s) de aviso
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total por cobrar</p>
          <p className="text-2xl font-black font-mono text-emerald-600 mt-1">{formatCurrency(resumen.total_cobrar)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{resumen.cantidad || 0} cuota(s) en bandeja</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <i className="fas fa-hand-holding-usd text-sm" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Promesas por cobrar</h3>
              <p className="text-[10px] text-slate-500">
                Corte el día {config?.dia_corte ?? 25} · desde el día siguiente vuelve la retención
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirTodas}
                onChange={(e) => setIncluirTodas(e.target.checked)}
                className="accent-emerald-600"
              />
              Ver todas las fechas
            </label>
            <div className="relative">
              <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
              <input
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Buscar bus, socio, concepto..."
                className="h-8 pl-8 pr-3 w-56 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={cargar}
              disabled={loading}
              className="h-8 px-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200"
              title="Actualizar bandeja"
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
            </button>
            {onNuevaPromesa && (
              <button
                type="button"
                onClick={onNuevaPromesa}
                className="h-8 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5"
              >
                <i className="fas fa-plus" /> Nueva promesa
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                <th className="px-4 py-2.5 text-center w-24">Fecha</th>
                <th className="px-4 py-2.5 text-center w-28">Estado</th>
                <th className="px-4 py-2.5 text-center w-24">Bus</th>
                <th className="px-4 py-2.5 text-left">Socio</th>
                <th className="px-4 py-2.5 text-left">Concepto</th>
                <th className="px-4 py-2.5 text-center w-20">Cuota</th>
                <th className="px-4 py-2.5 text-right w-24">Saldo</th>
                <th className="px-4 py-2.5 text-center w-36">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <i className="fas fa-circle-notch fa-spin text-2xl text-emerald-500" />
                    <p className="text-xs font-semibold mt-2">Cargando promesas...</p>
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 mx-auto mb-3">
                      <i className="fas fa-calendar-check text-2xl" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">No hay promesas por cobrar</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No hay cuotas vencidas ni próximas dentro del plazo de aviso.
                    </p>
                  </td>
                </tr>
              ) : (
                filtradas.map((f) => {
                  const st = estadoRow(f);
                  const dias = Number(f.dias || 0);
                  return (
                    <tr key={f.id_promesa_pago_cuota} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 text-center">
                        <div className="font-mono font-bold text-slate-700">{formatoFecha(f.fecha_promesa)}</div>
                        <div className="text-[10px] text-slate-400">
                          {dias < 0 ? `hace ${Math.abs(dias)} día(s)` : dias === 0 ? 'hoy' : `en ${dias} día(s)`}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.cls}`}>
                          <i className={`fas ${st.icon}`} />{st.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="bg-blue-50 text-blue-700 font-black font-mono text-[11px] px-2 py-0.5 rounded-md border border-blue-200">
                          {f.disco_buses || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-slate-800 truncate max-w-[220px]" title={f.socio_nombre}>
                          {f.socio_nombre || 'Socio sin asignar'}
                        </div>
                        <div className="text-[10px] text-slate-400">{f.per_cedula_personal || ''}</div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 truncate max-w-[230px]" title={f.concepto}>
                        {f.concepto}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-slate-600">
                        {f.numero_cuota}/{f.total_cuotas}
                      </td>
                      <td className="px-4 py-2.5 text-right font-black font-mono text-rose-600">
                        {formatCurrency(f.saldo)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCuotaPago(f)}
                            className="h-7 px-2.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1"
                            title="Registrar cheque/transferencia en la caja"
                          >
                            <i className="fas fa-hand-holding-usd text-[10px]" /> Cobrar
                          </button>
                          <button
                            type="button"
                            onClick={() => setVerPromesa(f.id_promesa_pago)}
                            className="h-7 w-7 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center justify-center"
                            title="Ver promesa completa"
                          >
                            <i className="fas fa-eye text-[10px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cuotaPago && (
        <PagoPromesaModal
          cuota={cuotaPago}
          onClose={() => setCuotaPago(null)}
          onSuccess={() => {
            setCuotaPago(null);
            cargar();
          }}
        />
      )}

      {verPromesa && (
        <DetallePromesaModal
          idPromesa={verPromesa}
          onClose={() => setVerPromesa(null)}
          onSuccess={cargar}
        />
      )}
    </div>
  );
};

export default PromesasPorCobrarPanel;
