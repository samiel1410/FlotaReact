import React, { useState, useEffect } from 'react';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const ReporteIngresoEgreso = () => {
  const [filtros, setFiltros] = useState({
    desde: '',
    hasta: '',
    sucursal: 'TODAS'
  });
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [sucursales, setSucursales] = useState([]);

  useEffect(() => {
    cargarSucursales();
  }, []);

  const cargarSucursales = async () => {
    try {
      const response = await api.get('/sucursal/seleccionarSucursal');
      if (response.data?.data) {
        setSucursales(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando sucursales:', error);
    }
  };

  const cargarDatos = async () => {
    setCargando(true);
    setDatos([]);
    try {
      const params = new URLSearchParams();
      params.append('desde', filtros.desde || '');
      params.append('hasta', filtros.hasta || '');
      params.append('sucursal', filtros.sucursal);

      const response = await api.get(`/reportes/ingresosEgresos?${params.toString()}`);
      if (response.data?.data) {
        setDatos(response.data.data);
        toast.success(`${response.data.data.length} registros encontrados`);
      } else {
        toast('No se encontraron resultados', { icon: 'ℹ️' });
      }
    } catch (error) {
      console.error('Error cargando reporte:', error);
      toast.error('Error al cargar el reporte');
    } finally {
      setCargando(false);
    }
  };

  const generarPDF = async () => {
    toast.loading('Generando PDF...', { id: 'pdf-eg' });
    try {
      const params = new URLSearchParams();
      params.append('desde', filtros.desde || '');
      params.append('hasta', filtros.hasta || '');
      params.append('sucursal', filtros.sucursal);

      const response = await api.get(`/reportes/ingresosEgresosPdf?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ingresos_egresos.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF descargado', { id: 'pdf-eg' });
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar PDF', { id: 'pdf-eg' });
    }
  };

  const exportarExcel = async () => {
    toast.loading('Generando Excel...', { id: 'excel-eg' });
    try {
      const params = new URLSearchParams();
      params.append('desde', filtros.desde || '');
      params.append('hasta', filtros.hasta || '');
      params.append('sucursal', filtros.sucursal);

      const response = await api.get(`/reportes/ingresosEgresosExcel?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ingresos_egresos.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel descargado', { id: 'excel-eg' });
    } catch (error) {
      console.error('Error generando Excel:', error);
      toast.error('Error al generar Excel', { id: 'excel-eg' });
    }
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(valor || 0);
  };

  // Calcular totales
  const totalIngresos = datos
    .filter(d => d.tipo === 'Ingreso' || d.tipo_caja_detalle === 'Ingreso')
    .reduce((sum, d) => sum + (parseFloat(d.total || d.monto) || 0), 0);

  const totalEgresos = datos
    .filter(d => d.tipo === 'Egreso' || d.tipo_caja_detalle === 'Egreso')
    .reduce((sum, d) => sum + (parseFloat(d.total || d.monto) || 0), 0);

  const saldoNeto = totalIngresos - totalEgresos;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i className="fas fa-filter text-slate-500"></i>
          Filtros de Búsqueda
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha Desde</label>
            <input
              type="date"
              value={filtros.desde}
              onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={filtros.hasta}
              onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Sucursal</label>
            <select
              value={filtros.sucursal}
              onChange={(e) => setFiltros({ ...filtros, sucursal: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="TODAS">TODAS</option>
              {sucursales.map((s) => (
                <option key={s.id_sucursal || s.suc_codigo_sucursal} value={s.id_sucursal || s.suc_codigo_sucursal}>
                  {s.nombre_sucursal}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-5">
          <button
            onClick={cargarDatos}
            disabled={cargando}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {cargando ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-search"></i>
            )}
            Buscar
          </button>
          <button
            onClick={exportarExcel}
            disabled={datos.length === 0}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-file-excel"></i>
            Exportar Excel
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
              setFiltros({ desde: '', hasta: '', sucursal: 'TODAS' });
              setDatos([]);
            }}
            className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-300 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-times"></i>
            Limpiar
          </button>
        </div>
      </div>

      {/* Resumen */}
      {datos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-green-600 text-sm font-bold mb-1">
              <i className="fas fa-arrow-up mr-1"></i>Total Ingresos
            </div>
            <div className="text-2xl font-black text-green-700">{formatearMoneda(totalIngresos)}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="text-red-600 text-sm font-bold mb-1">
              <i className="fas fa-arrow-down mr-1"></i>Total Egresos
            </div>
            <div className="text-2xl font-black text-red-700">{formatearMoneda(totalEgresos)}</div>
          </div>
          <div className={`border rounded-xl p-4 text-center ${saldoNeto >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className={`text-sm font-bold mb-1 ${saldoNeto >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
              <i className="fas fa-balance-scale mr-1"></i>Saldo Neto
            </div>
            <div className={`text-2xl font-black ${saldoNeto >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
              {formatearMoneda(saldoNeto)}
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {datos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-list text-purple-600"></i>
              Detalle de Movimientos ({datos.length} registros)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Fecha</th>
                  <th className="px-4 py-3 text-left font-bold">Descripción</th>
                  <th className="px-4 py-3 text-left font-bold">Tipo</th>
                  <th className="px-4 py-3 text-left font-bold">Sucursal</th>
                  <th className="px-4 py-3 text-left font-bold">Usuario</th>
                  <th className="px-4 py-3 text-right font-bold">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600">
                      {item.fecha || item.fecha_caja || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {item.descripcion || item.concepto || item.observacion || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        (item.tipo === 'Ingreso' || item.tipo_caja_detalle === 'Ingreso')
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {(item.tipo === 'Ingreso' || item.tipo_caja_detalle === 'Ingreso') ? 'INGRESO' : 'EGRESO'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.nombre_sucursal || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.usuario || item.nombre_usuario || 'N/A'}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      (item.tipo === 'Ingreso' || item.tipo_caja_detalle === 'Ingreso')
                        ? 'text-green-700'
                        : 'text-red-700'
                    }`}>
                      {formatearMoneda(item.total || item.monto)}
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
            <i className="fas fa-chart-line"></i>
          </div>
          <h3 className="text-lg font-bold text-slate-600">Sin resultados</h3>
          <p className="text-slate-500 mt-2">Use los filtros para buscar movimientos de ingresos y egresos</p>
        </div>
      )}
    </div>
  );
};

export default ReporteIngresoEgreso;