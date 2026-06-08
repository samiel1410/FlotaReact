export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', type = 'danger' }) {
  if (!isOpen) return null;

  const colorClass = type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm text-white rounded-lg ${colorClass}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}