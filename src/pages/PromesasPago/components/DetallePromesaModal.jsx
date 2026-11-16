import { useCallback, useEffect, useState } from 'react';
import Modal from '../../../components/common/Modal';
import { promesaPagoService } from '../../../services/promesaPago.service';
import { PagoPromesaModal } from './PagoPromesaModal';
import toast from 'react-hot-toast';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
const formatoFecha = (f) => {
  if (!f) return '-';
  const solo = String(f).slice(0, 10);
  const [y, m, d] = solo.split('-');
  return `${d}/${m}/${y}`;
};
const hoyISO = () => new Date().toISOString().slice(0, 10);

const estadoCuota = (c) => {
  if (c.estado === 'PAGADA') return { label: 'Pagada', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (c.estado === 'ANULADA') return { label: 'Anulada', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  const fecha = String(c.fecha_promesa || '').slice(0, 10);
  if (fecha && fecha < hoyISO()) return { label: 'Vencida', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (fecha === hoyISO()) return { label: 'Vence hoy', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Pendiente', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
};

export const DetallePromesaModal = ({ idPromesa, onClose, onSuccess }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cuotaPago, setCuotaPago] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const res = await promesaPagoService.detalle(idPromesa);
    if (res.success) setData(res.data);
    else toast.error(res.message || 'No se pudo cargar la promesa');
    setLoading(false);
  }, [idPromesa]);

  useEffect(() => { cargar(); }, [cargar]);

  const cuotas = data?.cuotas || [];
  const total = parseFloat(data?.monto_total || 0);
  const pagado = cuotas.reduce((s, c) => s + parseFloat(c.monto_pagado || 0), 0);
  const saldo = Math.max(0, total - pagado);

  return (
    <>
      <Modal isOpen onClose={onClose} title="Detalle de promesa de pago" width="max-w-3xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <i className="fas fa-circle-notch fa-spin text-2xl" />
            <p className="text-xs font-semibold mt-2">Cargando promesa...</p>
          </div>
        ) : !data ? (
          <div className="py-16 text-center text-slate-500 text-sm">No se encontró la promesa.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Socio / Bus</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{data.socio_nombre || 'Socio sin asignar'}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {data.disco_buses ? `Bus ${data.disco_buses}` : 'Sin bus'}
                  {data.per_cedula_personal ? ` · CI ${data.per_cedula_personal}` : ''}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Concepto</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{data.concepto}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Creada el {formatoFecha(data.fecha_creacion)} · Origen {data.origen}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Monto</p>
                <p className="text-lg font-black font-mono text-blue-800">{formatCurrency(total)}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Pagado</p>
                <p className="text-lg font-black font-mono text-emerald-800">{formatCurrency(pagado)}</p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Saldo</p>
                <p className="text-lg font-black font-mono text-rose-800">{formatCurrency(saldo)}</p>
              </div>
            </div>

            {data.observacion && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <b>Observación:</b> {data.observacion}
              </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <th className="px-3 py-2 text-center w-10">#</th>
                    <th className="px-3 py-2 text-center w-24">Fecha</th>
                    <th className="px-3 py-2 text-right w-24">Monto</th>
                    <th className="px-3 py-2 text-right w-24">Pagado</th>
                    <th className="px-3 py-2 text-right w-24">Saldo</th>
                    <th className="px-3 py-2 text-center w-28">Estado</th>
                    <th className="px-3 py-2 text-left">Pago</th>
                    <th className="px-3 py-2 text-center w-24">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cuotas.map((c) => {
                    const st = estadoCuota(c);
                    const saldoCuota = parseFloat(c.saldo ?? (c.monto - c.monto_pagado));
                    return (
                      <tr key={c.id_promesa_pago_cuota} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2 text-center text-slate-400 font-mono">{c.numero_cuota}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-600">{formatoFecha(c.fecha_promesa)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">{formatCurrency(c.monto)}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-600 font-bold">{formatCurrency(c.monto_pagado)}</td>
                        <td className="px-3 py-2 text-right font-mono text-rose-600 font-bold">{formatCurrency(saldoCuota)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {c.estado === 'PAGADA' ? (
                            <span>
                              {c.nombre_forma_pago || 'Pago'}
                              {c.nombre_banco ? ` · ${c.nombre_banco}` : ''}
                              {c.referencia_pago ? ` · Ref. ${c.referencia_pago}` : ''}
                              {c.numero_comprobante_cobro ? ` · Comp. #${c.numero_comprobante_cobro}` : ''}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {c.estado !== 'PAGADA' && c.estado !== 'ANULADA' && saldoCuota > 0 ? (
                            <button
                              type="button"
                              onClick={() => setCuotaPago({ ...c, concepto: data.concepto, disco_buses: data.disco_buses, socio_nombre: data.socio_nombre })}
                              className="h-7 px-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg"
                            >
                              <i className="fas fa-hand-holding-usd mr-1" />Cobrar
                            </button>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {cuotaPago && (
        <PagoPromesaModal
          cuota={cuotaPago}
          onClose={() => setCuotaPago(null)}
          onSuccess={() => {
            setCuotaPago(null);
            cargar();
            onSuccess?.();
          }}
        />
      )}
    </>
  );
};

export default DetallePromesaModal;
