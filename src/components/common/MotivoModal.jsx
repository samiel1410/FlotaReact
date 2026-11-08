import { useState } from 'react';
import toast from 'react-hot-toast';

export default function MotivoModal({ isOpen, onClose, onConfirm, title, subtitle, confirmText = 'Confirmar' }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (enviando) return;
    if (!motivo.trim()) {
      toast.error('Debe ingresar un motivo');
      return;
    }
    setEnviando(true);
    try {
      await onConfirm(motivo);
      setMotivo('');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mb-3">{subtitle}</p>}
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-red-500"
          rows={3}
          placeholder="Ingrese el motivo..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={() => { setMotivo(''); onClose(); }}
            disabled={enviando}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={enviando}
            className="px-4 py-2 text-sm text-white rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {enviando && <i className="fas fa-spinner fa-spin"></i>}
            {enviando ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}