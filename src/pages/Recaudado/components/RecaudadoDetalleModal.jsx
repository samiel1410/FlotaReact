import { useEffect, useState } from 'react';
import Modal from '../../../components/common/Modal';
import { RecaudadoService } from '../../../services/recaudado.service';

const money = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

const origenLabel = (origen) => {
  if (origen === 'COBRO') return 'Cobro';
  if (origen === 'SISTEMA') return 'Sistema';
  return 'Deuda';
};

const origenClase = (origen) => {
  if (origen === 'COBRO') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (origen === 'SISTEMA') return 'bg-purple-50 text-purple-700 border-purple-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

export const RecaudadoDetalleModal = ({ isOpen, onClose, idViaje }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    if (!isOpen || !idViaje) return;
    let cancelado = false;
    setLoading(true);
    setError('');
    setDetalle(null);

    RecaudadoService.getDetalleRetenciones(idViaje)
      .then((res) => {
        if (cancelado) return;
        if (res?.success && res.data) {
          setDetalle(res.data);
        } else {
          setError(res?.error || 'No se pudo cargar el detalle de retenciones');
        }
      })
      .catch((err) => {
        if (cancelado) return;
        setError(err.response?.data?.error || err.message || 'Error al cargar el detalle');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => { cancelado = true; };
  }, [isOpen, idViaje]);

  if (!isOpen) return null;

  const viaje = detalle?.viaje || {};

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de Retenciones — Viaje #${idViaje}`} width="max-w-3xl">
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
            <i className="fas fa-spinner fa-spin mr-2"></i> Cargando desglose...
          </div>
        )}

        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-semibold">
            <i className="fas fa-exclamation-triangle mr-1.5"></i> {error}
          </div>
        )}

        {!loading && !error && detalle && (
          <>
            {/* Datos del viaje */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <p><strong className="text-slate-500">Socio/Chofer:</strong> <span className="font-semibold text-slate-800">{viaje.socio || '-'}</span></p>
                <p><strong className="text-slate-500">Bus:</strong> <span className="font-bold text-slate-800">{viaje.disco_buses || '-'}</span> {viaje.placa_buses ? `(${viaje.placa_buses})` : ''}</p>
                <p className="md:col-span-2"><strong className="text-slate-500">Ruta:</strong> <span className="font-semibold text-slate-800">{viaje.ruta || '-'}</span></p>
                <p><strong className="text-slate-500">Fecha:</strong> <span className="font-mono">{viaje.fecha || '-'} {viaje.hora || ''}</span></p>
                <p><strong className="text-slate-500">Boletos:</strong> <span className="font-bold">{detalle.boletos}</span></p>
              </div>
            </div>

            {/* Resumen financiero */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Venta</p>
                <p className="text-base font-black text-emerald-800 font-mono">{money(detalle.venta)}</p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Retenido</p>
                <p className="text-base font-black text-rose-700 font-mono">{money(detalle.retenido)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Neto</p>
                <p className="text-base font-black text-slate-800 font-mono">{money(detalle.neto)}</p>
              </div>
            </div>

            {/* Consolidado por concepto */}
            <div>
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <i className="fas fa-list-ul text-indigo-600"></i> Detalle por concepto
              </h4>
              {detalle.conceptos?.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-[10px] uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Concepto</th>
                        <th className="px-3 py-2 text-center w-24">Origen</th>
                        <th className="px-3 py-2 text-right w-28">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detalle.conceptos.map((c, i) => (
                        <tr key={`${c.concepto}-${i}`} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold text-slate-800">{c.concepto}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black border ${origenClase(c.origen)}`}>
                              {origenLabel(c.origen)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-rose-600">{money(c.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td className="px-3 py-2 font-black text-slate-700" colSpan={2}>TOTAL RETENIDO</td>
                        <td className="px-3 py-2 text-right font-mono font-black text-rose-700">{money(detalle.retenido)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded-xl p-3">
                  Este viaje no tiene retenciones registradas.
                </p>
              )}
            </div>

            {/* Desglose por despacho */}
            {detalle.despachos?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fas fa-file-invoice-dollar text-indigo-600"></i> Desglose por despacho
                </h4>
                {detalle.despachos.map((d) => (
                  <div key={d.id_despacho_viaje} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-800 text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-black">Despacho #{d.id_despacho_viaje}</span>
                      <span className="text-slate-300">
                        {d.sucursal || 'Oficina'} · {d.oficinista || 'Sistema'}
                        {d.fecha ? ` · ${String(d.fecha).replace('T', ' ').slice(0, 16)}` : ''}
                      </span>
                    </div>
                    {d.conceptos.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-500 italic">Sin retenciones en este despacho.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-slate-100">
                          {d.conceptos.map((c, i) => (
                            <tr key={`${d.id_despacho_viaje}-${i}`} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-semibold text-slate-800">{c.concepto}</td>
                              <td className="px-3 py-2 text-center w-24">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black border ${origenClase(c.origen)}`}>
                                  {origenLabel(c.origen)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-rose-600 w-28">{money(c.monto)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                          <tr>
                            <td className="px-3 py-2 font-bold text-slate-700" colSpan={2}>Total despacho</td>
                            <td className="px-3 py-2 text-right font-mono font-black text-rose-700">{money(d.total)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Cobros del viaje sin despacho */}
            {detalle.cobros_sin_despacho?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                <p className="font-black text-amber-800 mb-1">
                  <i className="fas fa-info-circle mr-1"></i> Cobros del viaje aún sin despacho
                </p>
                <ul className="space-y-0.5 text-amber-900">
                  {detalle.cobros_sin_despacho.map((c, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{c.concepto}</span>
                      <span className="font-mono font-bold">{money(c.monto)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
