import { useState, useEffect } from 'react';

/**
 * InfoComprobanteForm - Versión sin overlay para usar dentro de openCustomModal.
 * Recibe onConfirm, onClose (o onCancel), initialNumero, initialBanco.
 */
export function InfoComprobanteForm({ onConfirm, onClose, onCancel, initialNumero = '', initialBanco = '' }) {
  const [numeroComprobante, setNumeroComprobante] = useState(initialNumero);
  const [banco, setBanco] = useState(initialBanco);
  const handleClose = onClose || onCancel || (() => {});

  useEffect(() => {
    setNumeroComprobante(initialNumero);
    setBanco(initialBanco);
  }, [initialNumero, initialBanco]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onConfirm) onConfirm({ numero_comprobante: numeroComprobante, banco });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">N° Comprobante</label>
        <input
          type="text"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          value={numeroComprobante}
          onChange={(e) => setNumeroComprobante(e.target.value)}
          placeholder="Ej: 123456"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">Banco</label>
        <input
          type="text"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          value={banco}
          onChange={(e) => setBanco(e.target.value)}
          placeholder="Ej: Banco Pichincha"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}

/**
 * InfoComprobanteModal - Versión standalone con overlay propio.
 * Para usar directamente en componentes React con estado.
 */
export default function InfoComprobanteModal({ isOpen, onClose, onConfirm, initialNumero = '', initialBanco = '' }) {
  const [numeroComprobante, setNumeroComprobante] = useState(initialNumero);
  const [banco, setBanco] = useState(initialBanco);

  useEffect(() => {
    if (isOpen) {
      setNumeroComprobante(initialNumero);
      setBanco(initialBanco);
    }
  }, [isOpen, initialNumero, initialBanco]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ numero_comprobante: numeroComprobante, banco });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Información de Comprobante</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">N° Comprobante</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={numeroComprobante}
              onChange={(e) => setNumeroComprobante(e.target.value)}
              placeholder="Ej: 123456"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Banco</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              placeholder="Ej: Banco Pichincha"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
