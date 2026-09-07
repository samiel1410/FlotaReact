import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FacturasService } from '../services/facturas.service';
import { reportesService } from '../../../services/reportes.service';
import { CONFIG } from '../../../config/env';

export const ReporteFacturacionGeneralModal = ({ isOpen, onClose }) => {
  const getToday = () => new Date().toISOString().split('T')[0];
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };

  const [filtros, setFiltros] = useState({
    desde: getFirstDayOfMonth(),
    hasta: getToday(),
    id_socio: '',
    id_bus: '',
    tipo_doc: 'BOLETOS'
  });

  const [socios, setSocios] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [progreso, setProgreso] = useState({ percent: 0, message: '' });
  const [previewHtml, setPreviewHtml] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const cargarCombos = async () => {
      setLoading(true);
      try {
        const [resSocios, resBuses] = await Promise.all([
          FacturasService.getSociosCombo(),
          FacturasService.getBusesCombo()
        ]);
        setSocios(resSocios || []);
        setBuses(resBuses || []);
      } catch (err) {
        console.error('Error cargando combos:', err);
      } finally {
        setLoading(false);
      }
    };
    cargarCombos();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const handlePreset = (tipo) => {
    const today = new Date();
    if (tipo === 'hoy') {
      const d = today.toISOString().split('T')[0];
      setFiltros(prev => ({ ...prev, desde: d, hasta: d }));
    } else if (tipo === 'este_mes') {
      const d1 = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const d2 = today.toISOString().split('T')[0];
      setFiltros(prev => ({ ...prev, desde: d1, hasta: d2 }));
    } else if (tipo === 'mes_anterior') {
      const d1 = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const d2 = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      setFiltros(prev => ({ ...prev, desde: d1, hasta: d2 }));
    } else if (tipo === 'anio') {
      const d1 = `${today.getFullYear()}-01-01`;
      const d2 = today.toISOString().split('T')[0];
      setFiltros(prev => ({ ...prev, desde: d1, hasta: d2 }));
    }
  };

  const handleGenerarPdf = async () => {
    setGenerando(true);
    setProgreso({ percent: 5, message: 'Encolando reporte en segundo plano...' });
    const toastId = toast.loading('Encolando reporte PDF...');
    try {
      const result = await reportesService.enqueueAndWait(
        'facturas_boleto_pdf',
        filtros,
        (percent, message) => {
          setProgreso({ percent, message });
          toast.loading(`${message || 'Generando PDF...'} ${percent}%`, { id: toastId });
        },
        1200,
        600000
      );

      if (result?.html) {
        toast.success(`Reporte generado con éxito (${(result.total || 0).toLocaleString('es-EC')} registros)`, { id: toastId });
        // Abrir en nueva ventana para imprimir directamente
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(result.html);
          win.document.close();
        } else {
          setPreviewHtml(result.html);
        }
      } else {
        toast.error('No se pudo obtener el HTML del reporte', { id: toastId });
      }
    } catch (err) {
      console.error('Error generando PDF en cola:', err);
      toast.error('Error al procesar reporte: ' + (err.message || 'Error desconocido'), { id: toastId });
    } finally {
      setGenerando(false);
      setProgreso({ percent: 0, message: '' });
    }
  };

  const handleDescargarExcel = async () => {
    setGenerando(true);
    setProgreso({ percent: 5, message: 'Encolando exportación Excel en segundo plano...' });
    const toastId = toast.loading('Encolando reporte Excel...');
    try {
      const result = await reportesService.enqueueAndWait(
        'facturas_boleto_excel',
        filtros,
        (percent, message) => {
          setProgreso({ percent, message });
          toast.loading(`${message || 'Construyendo Excel...'} ${percent}%`, { id: toastId });
        },
        1200,
        600000
      );

      if (result?.downloadUrl) {
        toast.success(`Excel generado con éxito (${(result.total || 0).toLocaleString('es-EC')} registros)`, { id: toastId });
        
        // Descarga directa nativa por streaming (0 consumo de RAM en React)
        const baseApi = CONFIG.API_URL || '';
        const downloadEndpoint = result.downloadUrl.startsWith('/api')
          ? `${baseApi}${result.downloadUrl}`
          : `${baseApi}/api${result.downloadUrl}`;

        const a = document.createElement('a');
        a.href = downloadEndpoint;
        a.download = `${result.fileName || 'Facturas_Boleto'}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (result?.base64) {
        toast.success(`Excel generado con éxito (${(result.total || 0).toLocaleString('es-EC')} registros)`, { id: toastId });
        
        // Decodificar Base64 a Blob de forma eficiente
        const byteCharacters = atob(result.base64);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.fileName || 'Facturas_Boleto'}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('No se recibió el resultado del reporte', { id: toastId });
      }
    } catch (err) {
      console.error('Error descargando Excel en cola:', err);
      toast.error('Error al procesar Excel: ' + (err.message || 'Error desconocido'), { id: toastId });
    } finally {
      setGenerando(false);
      setProgreso({ percent: 0, message: '' });
    }
  };

  const inputClass = "w-full h-9 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white text-slate-800";
  const labelClass = "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-600 text-white rounded-xl flex items-center justify-center text-lg shadow-md">
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Facturas Boleto
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <i className="fas fa-bolt text-[9px]"></i> Procesamiento en Cola
                </span>
              </h2>
              <p className="text-xs text-slate-300">Listado general de facturación agrupado por socios en PDF y Excel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={generando}
            className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all flex items-center justify-center text-sm disabled:opacity-30"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Barra de Progreso en Segundo Plano */}
          {generando && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-2.5 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span className="flex items-center gap-2">
                  <i className="fas fa-cog fa-spin text-blue-600"></i>
                  {progreso.message || 'Procesando en la cola del servidor...'}
                </span>
                <span className="bg-blue-600 text-white text-[11px] px-2 py-0.5 rounded-full">
                  {progreso.percent}%
                </span>
              </div>
              <div className="w-full bg-blue-200/70 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, progreso.percent)}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-blue-700 font-medium">
                ⚡ Procesamiento en segundo plano de alto rendimiento: maneja miles de comprobantes sin congelar el sistema ni saturar la memoria.
              </p>
            </div>
          )}

          {/* Presets de Fecha */}
          <div>
            <label className={labelClass}>Período de Facturación</label>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => handlePreset('hoy')}
                disabled={generando}
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => handlePreset('este_mes')}
                disabled={generando}
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                Este Mes
              </button>
              <button
                type="button"
                onClick={() => handlePreset('mes_anterior')}
                disabled={generando}
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Mes Anterior
              </button>
              <button
                type="button"
                onClick={() => handlePreset('anio')}
                disabled={generando}
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Año en Curso
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha Desde</label>
                <input
                  type="date"
                  name="desde"
                  value={filtros.desde}
                  onChange={handleChange}
                  disabled={generando}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha Hasta</label>
                <input
                  type="date"
                  name="hasta"
                  value={filtros.hasta}
                  onChange={handleChange}
                  min={filtros.desde}
                  disabled={generando}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Filtros por Socio y Unidad */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className={labelClass}>Socio / Vendedor</label>
              <select
                name="id_socio"
                value={filtros.id_socio}
                onChange={handleChange}
                className={inputClass}
                disabled={loading || generando}
              >
                <option value="">-- Todos los Socios --</option>
                {socios.map(s => {
                  const id = s.id_personal || s.id_socio || s.id;
                  const nombre = s.nombre_socios || `${s.per_nombres_persona || ''} ${s.per_apellidos_personal || ''}`.trim() || s.nombre || `Socio #${id}`;
                  return (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className={labelClass}>Bus / Unidad</label>
              <select
                name="id_bus"
                value={filtros.id_bus}
                onChange={handleChange}
                className={inputClass}
                disabled={loading || generando}
              >
                <option value="">-- Todos los Buses --</option>
                {buses.map(b => (
                  <option key={b.id_buses || b.disco_buses} value={b.id_buses || b.disco_buses}>
                    Disco {b.disco_buses} {b.placa_buses ? `(${b.placa_buses})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Origen de los documentos */}
          <div className="pt-2 border-t border-slate-100">
            <label className={labelClass}>Tipo de Documento</label>
            <div className="grid grid-cols-3 gap-3">
              <label className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                filtros.tipo_doc === 'BOLETOS'
                  ? 'border-blue-500 bg-blue-50/50 text-blue-700 ring-2 ring-blue-500/20'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="tipo_doc"
                  value="BOLETOS"
                  checked={filtros.tipo_doc === 'BOLETOS'}
                  onChange={handleChange}
                  disabled={generando}
                  className="text-blue-600"
                />
                Boletos (Socios)
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                filtros.tipo_doc === 'TODOS'
                  ? 'border-blue-500 bg-blue-50/50 text-blue-700 ring-2 ring-blue-500/20'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="tipo_doc"
                  value="TODOS"
                  checked={filtros.tipo_doc === 'TODOS'}
                  onChange={handleChange}
                  disabled={generando}
                  className="text-blue-600"
                />
                Todos
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                filtros.tipo_doc === 'FACTURAS'
                  ? 'border-blue-500 bg-blue-50/50 text-blue-700 ring-2 ring-blue-500/20'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="tipo_doc"
                  value="FACTURAS"
                  checked={filtros.tipo_doc === 'FACTURAS'}
                  onChange={handleChange}
                  disabled={generando}
                  className="text-blue-600"
                />
                Facturas Oficina
              </label>
            </div>
          </div>

          {/* Cuadro de información del formato */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <i className="fas fa-info-circle text-blue-600"></i>
              Optimización en Colas de Segundo Plano:
            </div>
            <p>• Los reportes pesados se procesan en segundo plano con control de memoria para evitar saturar el servidor y el navegador.</p>
            <p>• Puedes descargar el <b>Excel (.xlsx)</b> o ver e imprimir el <b>PDF</b> con subtotales por socio y resumen de formas de pago.</p>
          </div>
        </div>

        {/* Modal de Previsualización Embebida (en caso de que el navegador bloquee popups) */}
        {previewHtml && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50">
                <span className="font-bold text-sm text-slate-800">Previsualización - Facturas Boleto</span>
                <button onClick={() => setPreviewHtml(null)} className="text-slate-500 hover:text-slate-800">
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>
              <iframe
                srcDoc={previewHtml}
                title="Vista Previa Reporte"
                className="flex-1 w-full h-full border-none"
              />
            </div>
          </div>
        )}

        {/* Botones de Pie */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={generando}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDescargarExcel}
              disabled={generando}
              className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <i className="fas fa-file-excel text-sm text-emerald-600"></i>
              Descargar Excel
            </button>

            <button
              type="button"
              onClick={handleGenerarPdf}
              disabled={generando}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {generando ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Procesando en cola...
                </>
              ) : (
                <>
                  <i className="fas fa-print"></i>
                  Ver / Imprimir PDF
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
