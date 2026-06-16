import React, { useState } from 'react';
import ReporteModal from './components/ReporteModal';

const REPORTES_CONFIG = {
  // ExtJS reportes_boleteria: Excel → "Boletos Oficina", "Guias Asociados"
  excel: [
    { id: 'boletos_oficina', title: 'Boletos Oficina', icon: 'fas fa-file-excel', color: 'text-emerald-600', bg: 'bg-emerald-100', tipo: 'boletos_oficina', type: 'excel' },
    { id: 'guias_asociados', title: 'Guías Asociados', icon: 'fas fa-file-excel', color: 'text-emerald-600', bg: 'bg-emerald-100', tipo: 'guias_asociados', type: 'excel' },
  ],
  // ExtJS reportes_boleteria: Pdf → "Facturas", "Guias", "Comprobantes", "Guias Despacho", "Guias Entregadas", "Egresos/Ingresos"
  pdf: [
    { id: 'guias', title: 'Guías', icon: 'fas fa-file-pdf', color: 'text-red-600', bg: 'bg-red-100', tipo: 'guias_pdf', type: 'pdf' },
    { id: 'facturas', title: 'Facturas', icon: 'fas fa-file-pdf', color: 'text-red-600', bg: 'bg-red-100', tipo: 'facturas', type: 'pdf' },
    { id: 'comprobantes', title: 'Comprobantes', icon: 'fas fa-file-pdf', color: 'text-red-600', bg: 'bg-red-100', tipo: 'comprobantes', type: 'pdf' },
    { id: 'guias_despacho', title: 'Guías Despacho', icon: 'fas fa-file-pdf', color: 'text-red-600', bg: 'bg-red-100', tipo: 'guias_despacho', type: 'pdf' },
    { id: 'guias_entregadas', title: 'Guías Entregadas', icon: 'fas fa-file-pdf', color: 'text-red-600', bg: 'bg-red-100', tipo: 'guias_entregadas', type: 'pdf' },
    { id: 'guias_por_forma_pago', title: 'Guías por Forma Pago', icon: 'fas fa-file-pdf', color: 'text-red-600', bg: 'bg-red-100', tipo: 'guias_por_forma_pago', type: 'pdf' },
    { id: 'egresos_ingresos', title: 'Reporte Egresos/Ingresos', icon: 'fas fa-file-pdf', color: 'text-red-600', bg: 'bg-red-100', tipo: 'egresos_ingresos', type: 'pdf' },
  ]
};

export const ReportesPage = () => {
  const [activeTab, setActiveTab] = useState('excel');
  const [modalReporte, setModalReporte] = useState(null);

  // Constantes de animación para el modal grande
  const fadeInStyle = {
    animation: 'modalFadeIn 0.25s ease-out forwards',
  };
  const fadeInKeyframes = `
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen space-y-6">
      
      {/* Cabecera del Módulo */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-sm">
              <i className="fas fa-chart-pie"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Centro de Reportes</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Generación y exportación de información del sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenedor Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Navegación de Pestañas */}
        <div className="border-b border-slate-200 bg-slate-50/50 px-6 pt-4">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('excel')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-bold text-sm transition-colors ${
                activeTab === 'excel'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <i className="fas fa-file-excel text-lg"></i>
              Reportes en Excel
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-bold text-sm transition-colors ${
                activeTab === 'pdf'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <i className="fas fa-file-pdf text-lg"></i>
              Documentos PDF
            </button>
          </nav>
        </div>

        {/* Área de Tarjetas de Reportes */}
        <div className="p-6 bg-slate-50/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {REPORTES_CONFIG[activeTab].map((reporte) => (
              <button
                key={reporte.id}
                onClick={() => setModalReporte(reporte)}
                className="group relative flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all duration-200 ease-in-out text-center"
              >
                <div className={`w-14 h-14 ${reporte.bg} ${reporte.color} rounded-full flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <i className={reporte.icon}></i>
                </div>
                <h3 className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                  {reporte.title}
                </h3>
                <span className="text-xs font-semibold mt-1 px-2 py-0.5 rounded-full text-red-600 bg-red-50">
                  <i className="fas fa-sliders-h mr-1"></i>
                  Filtros
                </span>
                <div className="absolute inset-0 bg-indigo-50/0 group-hover:bg-indigo-50/50 rounded-xl pointer-events-none transition-colors duration-200"></div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalReporte && (
        <ReporteModal reporte={modalReporte} onClose={() => setModalReporte(null)} />
      )}
    </div>
  );
};