import { useState, useEffect, useRef } from 'react';

export const PdfPreviewModal = ({ url, title, onClose }) => {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '90vh' }}>
        <div className="bg-slate-800 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
              <i className="fas fa-file-pdf text-sm" />
            </span>
            <h3 className="text-white font-bold text-sm">{title || 'Vista previa del documento'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(url, '_blank')}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
              title="Abrir en nueva pestaña"
            >
              <i className="fas fa-external-link-alt" />
              <span>Nueva pestaña</span>
            </button>
            <button
              onClick={() => {
                if (iframeRef.current) {
                  iframeRef.current.contentWindow?.print();
                } else {
                  window.open(url, '_blank');
                }
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
              title="Imprimir"
            >
              <i className="fas fa-print" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>
        <div className="flex-1 relative bg-slate-100">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <i className="fas fa-spinner fa-spin text-3xl mb-3 block text-blue-500" />
                <p className="text-sm font-medium">Cargando documento...</p>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={url}
            title={title || 'PDF'}
            className="w-full h-full border-0"
            style={{ display: loaded ? 'block' : 'none' }}
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>
    </div>
  );
};
