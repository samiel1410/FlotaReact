import React from 'react';

/**
 * PrintSelectorModal
 * Modal para seleccionar entre imprimir la Guía (PDF) o el QR de la Guía.
 */
export const PrintSelectorModal = ({ isOpen, onClose, item, onPrintGuia, onPrintQR, onPrintTicket }) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-56 flex flex-col gap-3">
        <div className="text-center font-bold text-slate-700 text-sm border-b pb-3">
          <i className="fas fa-print mr-2 text-blue-500"></i>
          IMPRIMIR GUÍA
        </div>
        <p className="text-xs text-slate-500 text-center">
          Guía: <strong>{item.numero_guia_final || item.id_guia}</strong>
        </p>
        <button
          onClick={onPrintGuia}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
        >
          <i className="fas fa-file-alt"></i> GUIA
        </button>
        <button
          onClick={onPrintQR}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
        >
          <i className="fas fa-qrcode"></i> QR
        </button>
        <button
          onClick={onPrintTicket}
          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
        >
          <i className="fas fa-ticket-alt"></i> TICKET
        </button>
        <button
          onClick={onClose}
          className="w-full py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg text-xs transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default PrintSelectorModal;
