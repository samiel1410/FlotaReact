import { NotificacionForm } from './NotificacionForm';

export const NotificacionModal = ({ show, onClose, onSuccess }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <i className="fas fa-paper-plane text-blue-500"></i>
            Enviar Notificación Push
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <NotificacionForm 
            onSuccess={onSuccess} 
            onCancel={onClose} 
          />
        </div>
      </div>
    </div>
  );
};
