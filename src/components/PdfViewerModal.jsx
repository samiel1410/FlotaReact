import React, { useRef, useState, useEffect } from 'react';
import { buildPdfUrl } from '../utils/pdfUrlUtils';

export const PdfViewerModal = ({
  open,
  onClose,
  url: rawUrl,
  title = 'Documento PDF',
  showPrintButton = false,
}) => {
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  const url = open && rawUrl ? buildPdfUrl(rawUrl) : null;

  useEffect(() => {
    if (open) {
      setIsLoading(true);
    }
  }, [open, rawUrl]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handlePrint = () => {
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else {
        if (url) window.open(url, '_blank');
      }
    } catch (e) {
      console.error('Error al imprimir desde iframe', e);
      if (url) window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-5xl h-[92vh] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
            <h3 className="font-semibold text-slate-800 text-sm truncate max-w-md">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {showPrintButton && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
                onClick={handlePrint}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-xs transition-colors cursor-pointer"
              onClick={() => url && window.open(url, '_blank')}
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Nueva pestaña
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
              onClick={onClose}
              title="Cerrar (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 bg-slate-100 relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-xs gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-3 border-blue-200 border-t-blue-600 animate-spin"></div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">Generando documento...</p>
                <p className="text-xs text-slate-400 mt-0.5">Preparando vista previa en alta resolución</p>
              </div>
            </div>
          )}

          {url && (
            <iframe
              ref={iframeRef}
              src={url}
              title={title}
              onLoad={() => setIsLoading(false)}
              className="w-full h-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
};
