import React, { useState, useEffect } from 'react';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';
import Modal from '../../../components/common/Modal';
import { formatCurrency, formatFecha } from '../utils/multasConstants';

export const VerDetalleMultaModal = ({ idMulta, onClose, onVerComprobante }) => {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/deuda/detallePago', { params: { id: idMulta, fuente: 'deuda' } })
      .then(res => {
        if (active && res.data?.success) {
          setDetalle(res.data.data);
        }
      })
      .catch(() => {
        if (active) toast.error('No se pudo cargar el detalle');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [idMulta]);

  return (
    <Modal isOpen={true} onClose={onClose} title={`Detalle de Multa #${idMulta}`} width="max-w-xl">
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <i className="fas fa-spinner fa-spin text-2xl mb-2 block text-rose-500"></i>
          <p className="text-xs font-medium">Cargando información...</p>
        </div>
      ) : !detalle ? (
        <div className="py-8 text-center text-slate-400">
          <i className="fas fa-inbox text-3xl mb-2 block"></i>
          <p className="text-xs">No se encontró el detalle de la multa</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Resumen Financiero */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Valor Multa</p>
              <p className="text-sm font-black text-slate-800 font-mono">{formatCurrency(detalle.valor_original)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Cobrado / Pagado</p>
              <p className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(detalle.valor_pagado)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-rose-600 uppercase">Saldo Pendiente</p>
              <p className="text-sm font-black text-rose-600 font-mono">{formatCurrency(detalle.saldo_pendiente)}</p>
            </div>
          </div>

          {/* Datos del Socio y Bus */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <p><strong className="text-slate-500">Socio:</strong> <span className="font-semibold text-slate-800">{detalle.socio_nombre || '-'}</span></p>
              <p><strong className="text-slate-500">Cédula:</strong> <span className="font-mono">{detalle.socio_cedula || '-'}</span></p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p><strong className="text-slate-500">Bus / Unidad:</strong> <span className="font-bold text-slate-800">Bus {detalle.disco_buses || '-'} {detalle.placa_buses ? `(${detalle.placa_buses})` : ''}</span></p>
              <p>
                <strong className="text-slate-500">Estado:</strong>{' '}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  detalle.estado === 'pagado' ? 'bg-emerald-100 text-emerald-800' :
                  detalle.estado === 'parcial' ? 'bg-amber-100 text-amber-800' :
                  detalle.estado === 'anulado' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {detalle.estado}
                </span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
              <p><i className="far fa-calendar-plus mr-1"></i><strong>Registro:</strong> {formatFecha(detalle.fecha_creacion)}</p>
              <p><i className="far fa-check-circle mr-1 text-emerald-600"></i><strong>Último Pago:</strong> {formatFecha(detalle.fecha_ultimo_pago)}</p>
            </div>
            {detalle.concepto && (
              <p className="text-[11px] text-slate-700 border-t border-slate-100 pt-1.5 mt-1">
                <strong>Concepto:</strong> {detalle.concepto}
              </p>
            )}
            {detalle.observacion && (
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-600 font-mono text-[11px] whitespace-pre-line">
                {detalle.observacion}
              </div>
            )}
          </div>

          {/* Historial de Retenciones en Despachos */}
          <div>
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <i className="fas fa-file-invoice-dollar text-emerald-600"></i>
              Historial de Retenciones en Despachos
            </h4>

            {detalle.historial_retenciones && detalle.historial_retenciones.length > 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="px-3 py-2">Viaje / Despacho</th>
                      <th className="px-3 py-2">Ruta</th>
                      <th className="px-3 py-2">Fecha Despacho</th>
                      <th className="px-3 py-2 text-right">Monto Retenido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {detalle.historial_retenciones.map((ret, idx) => (
                      <tr key={idx} className="hover:bg-slate-100/60">
                        <td className="px-3 py-2 font-bold text-indigo-700">
                          Viaje #{ret.id_viaje || ret.id_despacho_viaje || '-'}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-700">
                          {ret.ruta || 'Despacho Operativo'}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">
                          {formatFecha(ret.fecha)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(ret.monto_retenido)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-slate-400 text-xs">
                <p>No registra retenciones en despachos aún (o fue pagada en ventanilla).</p>
              </div>
            )}
          </div>

          {/* Acciones del Modal */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onVerComprobante(detalle)}
              className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <i className="fas fa-print"></i> Ver / Imprimir Comprobante
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default VerDetalleMultaModal;
