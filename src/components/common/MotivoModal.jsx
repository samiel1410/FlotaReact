import { useState } from 'react';

export default function MotivoModal({ isOpen, onClose, onConfirm, title, confirmText = 'Confirmar' }) {
  const [motivo, setMotivo] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!motivo.trim()) {
      alert('Debe ingresar un motivo');
      return;
    }
    onConfirm(motivo);
    setMotivo('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-red-500"
          rows={3}
          placeholder="Ingrese el motivo..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <button onClick={() => { setMotivo(''); onClose(); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="px-4 py-2 text-sm text-white rounded-lg bg-red-600 hover:bg-red-700">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}