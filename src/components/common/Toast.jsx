import { Toaster, toast as hotToast } from 'react-hot-toast';

// Tiempos de auto-dismiss por tipo (ms)
const DURATIONS = {
  success: 4000,
  error: 6000,
  loading: Infinity,
  blank: 5000,
  custom: Infinity,
};

// Estilos base
const typeStyles = {
  success: { bg: '#ecfdf5', border: '#bbf7d0', icon: '#10b981', text: '#065f46' },
  error: { bg: '#fef2f2', border: '#fecaca', icon: '#ef4444', text: '#991b1b' },
  loading: { bg: '#eff6ff', border: '#bfdbfe', icon: '#3b82f6', text: '#1e40af' },
  blank: { bg: '#f8fafc', border: '#e2e8f0', icon: '#64748b', text: '#334155' },
};

const ToastContent = ({ t }) => {
  const type = t.type || 'blank';
  const s = typeStyles[type] || typeStyles.blank;

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
      <div className="flex-1 min-w-0">
        <div style={{ color: s.text }} className="text-sm font-medium break-words">
          {t.message}
        </div>
      </div>
      <button
        onClick={() => hotToast.dismiss(t.id)}
        className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full transition-colors hover:opacity-70"
        style={{ color: s.text, background: 'transparent' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};

export const ToastContainer = () => (
  <Toaster
    position="top-right"
    gutter={8}
    toastOptions={{
      duration: 4000,
      style: {
        fontFamily: 'Outfit, sans-serif',
        borderRadius: '12px',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: 500,
      },
      success: {
        style: {
          background: '#ecfdf5',
          color: '#065f46',
          border: '1px solid #bbf7d0',
        },
      },
      error: {
        style: {
          background: '#fef2f2',
          color: '#991b1b',
          border: '1px solid #fecaca',
        },
      },
    }}
  />
);

export { hotToast as toast };
