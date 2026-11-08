import { useState } from 'react';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', type = 'danger' }) {
  // Bloquea los botones mientras la acción async está en curso (evita el
  // doble envío de la confirmación).
  const [procesando, setProcesando] = useState(false);

  // Al cerrarse se libera el bloqueo para que el modal pueda reutilizarse.
  const [abiertoAntes, setAbiertoAntes] = useState(isOpen);
  if (isOpen !== abiertoAntes) {
    setAbiertoAntes(isOpen);
    if (!isOpen) setProcesando(false);
  }

  if (!isOpen) return null;

  const colorClass = type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';

  const handleConfirmar = async () => {
    if (procesando) return;
    setProcesando(true);
    try {
      await onConfirm?.();
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={procesando}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={procesando}
            className={`px-4 py-2 text-sm text-white rounded-lg flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${colorClass}`}
          >
            {procesando && <i className="fas fa-spinner fa-spin"></i>}
            {procesando ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
