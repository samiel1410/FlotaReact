import React from 'react';
import Modal from '../../../components/common/Modal';
import { formatCurrency, formatFecha } from '../utils/multasConstants';

export const ComprobanteMultaModal = ({ multa, onClose }) => {
  const empresaData = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('empresa_data') || '{}');
    } catch {
      return {};
    }
  })();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Comprobante de Multa" width="max-w-lg">
      <div className="space-y-4">
        {/* Printable Voucher Area */}
        <div id="comprobante-multa-print" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-800 space-y-4 print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-0.5">
            <h2 className="text-sm font-black tracking-wider uppercase text-slate-900">{empresaData.nombre || 'Comprobante de Multa'}</h2>
            {(empresaData.ruc || empresaData.direccion) && (
              <p className="text-[10px] text-slate-500 font-medium">
                {empresaData.ruc ? `RUC: ${empresaData.ruc}` : ''} {empresaData.direccion ? `— ${empresaData.direccion}` : ''}
              </p>
            )}
            <div className="inline-block bg-slate-100 px-3 py-1 rounded-full mt-1 border border-slate-200">
              <span className="text-[11px] font-black uppercase text-slate-800">
                COMPROBANTE DE MULTA #{multa.id || multa.id_deuda}
              </span>
            </div>
          </div>

          {/* Datos del Socio y Bus */}
          <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-100 pb-3">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">SOCIO</span>
              <span className="font-bold text-slate-800">{multa.socio_nombre || '-'}</span>
              <span className="block text-[11px] text-slate-500 font-mono">CI: {multa.socio_cedula || '-'}</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">UNIDAD / BUS</span>
              <span className="font-bold text-slate-800 text-sm">Disco #{multa.disco_buses || '-'}</span>
              {multa.placa_buses && <span className="block text-[11px] text-slate-500 font-mono">Placa: {multa.placa_buses}</span>}
            </div>
          </div>

          {/* Concepto y Fechas */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Concepto:</span>
              <span className="font-bold text-slate-800 text-right">{multa.concepto || multa.tipo_nombre || 'Multa'}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Fecha Emisión:</span>
              <span className="font-mono text-slate-700">{formatFecha(multa.fecha_creacion)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Estado Actual:</span>
              <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                multa.estado === 'pagado' ? 'bg-emerald-100 text-emerald-800' :
                multa.estado === 'parcial' ? 'bg-amber-100 text-amber-800' :
                multa.estado === 'anulado' ? 'bg-rose-100 text-rose-800' : 'bg-rose-100 text-rose-700'
              }`}>
                {multa.estado}
              </span>
            </div>
          </div>

          {/* Desglose de Valores */}
          <div className="space-y-1.5 border-t border-b border-slate-200 py-3 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-slate-600">Valor Original Multa:</span>
              <span className="font-mono font-bold text-slate-800">{formatCurrency(multa.valor_original)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>(-) Total Deducido / Pagado:</span>
              <span className="font-mono font-bold">-{formatCurrency(multa.valor_pagado)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-100 text-slate-900">
              <span>SALDO RESTANTE:</span>
              <span className={`font-mono ${parseFloat(multa.saldo_pendiente || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(multa.saldo_pendiente)}
              </span>
            </div>
          </div>

          {/* Observaciones */}
          {multa.observacion && (
            <div className="text-[10px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-200">
              <strong>Observación:</strong> {multa.observacion}
            </div>
          )}

          {/* Footer Voucher */}
          <div className="text-center text-[10px] text-slate-400 border-t border-dashed border-slate-300 pt-3">
            <p>Comprobante generado por Sistema de Control de Flota</p>
            <p className="font-mono text-[9px] mt-0.5">Fecha Impresión: {new Date().toLocaleString('es-EC')}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <i className="fas fa-print"></i> Imprimir Recibo
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ComprobanteMultaModal;
