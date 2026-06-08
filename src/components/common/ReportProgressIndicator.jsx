import React from 'react';

/**
 * ReportProgressIndicator
 * Barra de progreso animada que se muestra mientras se genera un reporte en la cola.
 * 
 * Props:
 *   - percent: number (0-100)
 *   - message: string
 *   - visible: boolean
 */
export default function ReportProgressIndicator({ percent = 0, message = '', visible = false }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        {/* Spinner animado */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <svg className="animate-spin h-16 w-16 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {/* Porcentaje central */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-700">{Math.round(percent)}%</span>
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(percent, 100)}%` }}
          ></div>
        </div>

        {/* Mensaje */}
        <p className="text-sm text-gray-600 font-medium">
          {message || 'Generando reporte...'}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Por favor espere, este proceso puede tardar unos segundos.
        </p>
      </div>
    </div>
  );
}