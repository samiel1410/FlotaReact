import React, { useRef } from 'react';

export const PdfViewerModal = ({ open, onClose, url, title = 'Documento PDF', showPrintButton = false }) => {
  const iframeRef = useRef(null);
  if (!open) return null;

  const handlePrint = () => {
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else {
        // Fallback: abrir en nueva pestaña y dejar que el usuario imprima
        window.open(url, '_blank');
      }
    } catch (e) {
      console.error('Error al imprimir desde iframe', e);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white w-[90%] h-[90%] rounded shadow-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-bold text-sm">{title}</div>
          <div className="flex items-center gap-2">
            {showPrintButton && (
              <button className="px-3 py-1 bg-green-500 text-white rounded" onClick={handlePrint}>Imprimir</button>
            )}
            <button className="px-3 py-1 bg-slate-100 rounded" onClick={() => window.open(url, '_blank')}>Abrir en pestaña</button>
            <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={onClose}>Cerrar</button>
          </div>
        </div>

        <div className="flex-1 bg-gray-100">
          <iframe ref={iframeRef} src={url} title={title} className="w-full h-full border-0" />
        </div>
      </div>
    </div>
  );
};
