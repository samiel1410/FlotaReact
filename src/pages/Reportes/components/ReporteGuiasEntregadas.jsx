import React, { useState, useEffect } from 'react';
import { api } from '../../../config/axios';
import { reportesService } from '../../../services/reportes.service';
import ReportProgressIndicator from '../../../components/common/ReportProgressIndicator';
import toast from 'react-hot-toast';

const ReporteGuiasEntregadas = () => {
  const [filtros, setFiltros] = useState({
    estado: '0',
    desde: '',
    hasta: '',
    oficina: 'TODAS'
  });
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [oficinas, setOficinas] = useState([]);
  const [progress, setProgress] = useState({ percent: 0, message: '' });
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    cargarOficinas();
  }, []);

  const cargarOficinas = async () => {
    try {
      const response = await api.get('/destino/seleccionarDestino');
      if (response.data?.data) {
        setOficinas(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando oficinas:', error);
    }
  };

  const cargarDatos = async () => {
    setCargando(true);
    setDatos([]);
    try {
      const params = {
        estado: filtros.estado,
        desde: filtros.desde || '',
        hasta: filtros.hasta || '',
        oficina: filtros.oficina
      };

      setShowProgress(true);
      setProgress({ percent: 0, message: 'Encolando reporte...' });

      const result = await reportesService.enqueueAndWait(
        'guias_entregadas',
        params,
        (percent, message) => setProgress({ percent, message })
      );

      setShowProgress(false);

      if (result?.data && Array.isArray(result.data)) {
        setDatos(result.data);
        toast.success(`${result.data.length} registros encontrados`);
      } else {
        toast('No se encontraron resultados', { icon: 'ℹ️' });
      }
    } catch (error) {
      console.error('Error cargando reporte:', error);
      toast.error(error.message || 'Error al cargar el reporte');
      setShowProgress(false);
    } finally {
      setCargando(false);
    }
  };

  const generarPDF = async () => {
    setShowProgress(true);
    setProgress({ percent: 0, message: 'Encolando reporte PDF...' });

    try {
      const params = {
        estado: filtros.estado,
        desde: filtros.desde || '',
        hasta: filtros.hasta || '',
        oficina: filtros.oficina
      };

      const result = await reportesService.enqueueAndWait(
        'guias_entregadas_pdf',
        params,
        (percent, message) => setProgress({ percent, message })
      );

      setShowProgress(false);

      if (result?.html) {
        // Abrir en nueva ventana para impresión
        const printWindow = window.open('', '_blank', 'width=1024,height=768');
        if (printWindow) {
          printWindow.document.write(result.html);
          printWindow.document.close();
          toast.success('PDF generado correctamente');
        } else {
          toast.error('El navegador bloqueó la ventana emergente. Permita pop-ups para este sitio.');
        }
      } else {
        toast.error('No se pudo generar el PDF');
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error(error.message || 'Error al generar PDF');
      setShowProgress(false);
    }
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(valor || 0);
  };

  const totalGeneral = datos.reduce((sum, item) => sum + (parseFloat(item.total_guia) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i className="fas fa-filter text-slate-500"></i>
          Filtros de Búsqueda
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Estado</label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="0">TODOS</option>
              <option value="1">NO ENTREGADO</option>
              <option value="2">ENTREGADO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha Desde</label>
            <input
              type="date"
              value={filtros.desde}
              onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={filtros.hasta}
              onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Oficina/Destino</label>
            <select
              value={filtros.oficina}
              onChange={(e) => setFiltros({ ...filtros, oficina: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="TODAS">TODAS</option>
              {oficinas.map((oficina) => (
                <option key={oficina.id_destino} value={oficina.lugar_destino}>
                  {oficina.lugar_destino}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-5">
          <button
            onClick={cargarDatos}
            disabled={cargando}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-lg font-semibold text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {cargando ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-search"></i>
            )}
            Buscar
          </button>
          <button
            onClick={generarPDF}
            disabled={datos.length === 0}
            className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-file-pdf"></i>
            Exportar PDF
          </button>
          <button
            onClick={() => {
              setFiltros({ estado: '0', desde: '', hasta: '', oficina: 'TODAS' });
              setDatos([]);
            }}
            className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-300 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-times"></i>
            Limpiar
          </button>
        </div>
      </div>

      {/* Resultados */}
      {datos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-list text-teal-600"></i>
              Resultados ({datos.length} guías)
            </h3>
            <div className="text-lg font-bold text-teal-700">
              Total: {formatearMoneda(totalGeneral)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">N° Guía</th>
                  <th className="px-4 py-3 text-left font-bold">Fecha</th>
                  <th className="px-4 py-3 text-left font-bold">Sucursal</th>
                  <th className="px-4 py-3 text-left font-bold">Destino</th>
                  <th className="px-4 py-3 text-left font-bold">Remitente</th>
                  <th className="px-4 py-3 text-left font-bold">Destinatario</th>
                  <th className="px-4 py-3 text-right font-bold">Total</th>
                  <th className="px-4 py-3 text-center font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.map((guia, idx) => (
                  <tr key={guia.id_guia || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-800">
                      {guia.numero_guia}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {guia.fecha_guia}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {guia.nombre_sucursal}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {guia.lugar_destino}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {guia.nombre_cliente_remitente || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {guia.nombre_cliente_receptor || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatearMoneda(guia.total_guia)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        guia.estado_entregado_guia === 2 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {guia.estado_entregado_guia === 2 ? 'ENTREGADO' : 'NO ENTREGADO'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {datos.length === 0 && !cargando && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
          <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            <i className="fas fa-box-open"></i>
          </div>
          <h3 className="text-lg font-bold text-slate-600">Sin resultados</h3>
          <p className="text-slate-500 mt-2">Use los filtros para buscar guías entregadas o no entregadas</p>
        </div>
      )}
    </div>
  );
};

export default ReporteGuiasEntregadas;