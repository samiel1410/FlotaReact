import { useState, useEffect } from 'react';
import { api } from '../../../../config/axios';
import { formatCurrency } from '../../utils/cobrosHelpers';

export const CobrosRealizadosModal = ({ cobro, onClose, onPrint }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cobro) return;
    setLoading(true);
    api.get('/cobro/listadoComprobantesCobro', { params: { id_cobros: cobro.id_cobros } })
      .then(res => setItems(res.data?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [cobro]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!cobro) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        <div className="bg-slate-800 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <i className="fas fa-receipt text-sm" />
            </span>
            <div>
              <h3 className="text-white font-bold text-sm">Cobros Realizados — Cobro #{cobro.id_cobros}</h3>
              <p className="text-xs text-slate-400">Bus {cobro.disco_buses || '-'} &bull; {cobro.nombre_tipo_cobros || 'Cobro'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-600">
          <div><b>Tipo:</b> <span className="text-slate-800 font-semibold">{cobro.nombre_tipo_cobros || '-'}</span></div>
          <div><b>Monto Total:</b> <span className="font-bold text-slate-800">{formatCurrency(cobro.monto_cobros)}</span></div>
          <div><b>Total Cobrado:</b> <span className="font-bold text-emerald-600">{formatCurrency(cobro.total_pagado)}</span></div>
          <div><b>Saldo:</b> <span className="font-bold text-amber-600">{formatCurrency(cobro.saldo_pendiente)}</span></div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-10 text-slate-400">
              <i className="fas fa-spinner fa-spin text-2xl mb-2 block text-indigo-500" />
              <p className="text-xs font-medium">Cargando comprobantes...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <i className="fas fa-receipt text-3xl mb-2 block text-slate-300" />
              <p className="text-sm font-medium">No se encontraron comprobantes para este cobro</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5 text-left">N°</th>
                    <th className="px-3 py-2.5 text-left">Fecha</th>
                    <th className="px-3 py-2.5 text-right">Monto</th>
                    <th className="px-3 py-2.5 text-left">Forma Pago</th>
                    <th className="px-3 py-2.5 text-left">Detalle</th>
                    <th className="px-3 py-2.5 text-left">Usuario</th>
                    <th className="px-3 py-2.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-semibold text-slate-700">#{c.id_comprobante_cobro_retenciones || c.numero_comprobante_cobro || cobro.id_cobros}</td>
                      <td className="px-3 py-2.5 text-slate-500">{c.fecha_emision_comprobante_cobro?.split('T')[0]?.split(' ')[0] || '-'}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{formatCurrency(c.monto_comprobante_cobro || cobro.monto_cobros)}</td>
                      <td className="px-3 py-2.5 text-slate-700">{c.nombre_forma_pago || 'EFECTIVO'}</td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">{c.concepto_detalle_comprobante_cobro || cobro.observacion_cobros || '-'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{c.nombre_usuario || ''} {c.apellido_usuario || ''}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.estado_comprobante_cobro === 'COBRADA' || c.estado_comprobante_cobro === 'PAGADO' || cobro.estado_cobros == 1
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {c.estado_comprobante_cobro || (cobro.estado_cobros == 1 ? 'PAGADO' : 'NO PAGADO')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={() => onPrint(cobro)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <i className="fas fa-print" />
            <span>Imprimir Comprobante</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
