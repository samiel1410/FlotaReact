import React, { useEffect } from 'react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  width = 'max-w-2xl'
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal panel */}
      <div
        className={`relative w-full ${width} bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header - estilo unificado bg-slate-800 como los modales de despacho */}
        {title && (
          <div className="bg-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-xl">
            <h3 className="text-white text-lg font-bold flex items-center gap-2">
              <i className="fas fa-cog text-blue-400 text-sm"></i>
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-700"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        )}

        {/* Body (scrollable) */}
        <div className={`flex-1 overflow-y-auto ${title ? 'p-6' : 'p-0'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
