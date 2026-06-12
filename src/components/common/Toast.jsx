import { Toaster, toast as hotToast } from 'react-hot-toast';

// Estilos base por tipo
const typeStyles = {
  success: { bg: '#ecfdf5', border: '#bbf7d0', icon: '#10b981', text: '#065f46' },
  error: { bg: '#fef2f2', border: '#fecaca', icon: '#ef4444', text: '#991b1b' },
  loading: { bg: '#eff6ff', border: '#bfdbfe', icon: '#3b82f6', text: '#1e40af' },
  blank: { bg: '#f8fafc', border: '#e2e8f0', icon: '#64748b', text: '#334155' },
};

const iconByType = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  ),
  loading: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" className="animate-spin">
      <circle cx="12" cy="12" r="10" strokeDasharray="50" strokeDashoffset="15" />
    </svg>
  ),
};

const ToastContent = ({ t }) => {
  const type = t.type || 'blank';
  const s = typeStyles[type] || typeStyles.blank;
  const icon = iconByType[type];

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all duration-300 ${
        t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
      style={{
        fontFamily: 'Outfit, sans-serif',
        background: s.bg,
        borderColor: s.border,
        minWidth: '280px',
        maxWidth: '420px',
        pointerEvents: 'auto',
      }}
    >
      {/* Icono por tipo */}
      {icon && (
        <div className="shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      {/* Mensaje */}
      <div className="flex-1 min-w-0">
        <div style={{ color: s.text }} className="text-sm font-medium break-words">
          {t.message}
        </div>
      </div>
      {/* Botón X para cerrar */}
      <button
        onClick={() => hotToast.dismiss(t.id)}
        className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full transition-colors hover:bg-black/10"
        style={{ color: s.text }}
        title="Cerrar"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};

export const ToastContainer = () => (
  <Toaster position="top-right" gutter={8}>
    {(t) => <ToastContent t={t} />}
  </Toaster>
);

export { hotToast as toast };
