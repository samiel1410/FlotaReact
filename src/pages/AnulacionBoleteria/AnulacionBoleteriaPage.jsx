import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { api } from '../../config/axios';
import { useListado } from '../../hooks/useListado';

const PAGE_SIZE = 25;

export const AnulacionBoleteriaPage = () => {
  const [numeroFactura, setNumeroFactura] = useState('');
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const buildCustomParams = useCallback(
    (page, size) => ({
      factura: filters.numero_factura || '',
      page: page + 1,
      limit: size,
    }),
    [filters]
  );

  const { data, loading, total, fetch: fetchData } = useListado('/factura/facturalistado', {}, buildCustomParams);

  useEffect(() => {
    fetchData({}, 0);
  }, []); // eslint-disable-line

  const totalPages = Math.ceil((total || 0) / PAGE_SIZE);

  const handleSearch = () => {
    const f = { numero_factura: numeroFactura };
    setFilters(f);
    setCurrentPage(1);
    fetchData(f, 0);
  };

  const handleClear = () => {
    setNumeroFactura('');
    setFilters({});
    setCurrentPage(1);
    fetchData({}, 0);
  };

  const handleAnular = async (row) => {
    const { value: motivo } = await Swal.fire({
      title: 'Motivo de Anulación',
      text: `¿Anular factura ${row.secuencial_factura || row.numero_factura || ''}?`,
      input: 'textarea',
      inputPlaceholder: 'Ingrese el motivo de la anulación...',
      showCancelButton: true,
      confirmButtonText: 'ANULAR',
      confirmButtonColor: '#e11d48',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => !v?.trim() && 'Debe ingresar un motivo',
    });
    if (!motivo) return;
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await api.post('/boleteria/anularBoletos', {
        id_factura: row.id_factura,
        motivo_anulacion: motivo,
        numero_factura: row.secuencial_factura || row.numero_factura || '',
        ruc_cliente: row.ruc_cliente_factura || '',
        nombre_cliente: row.nombre_cliente_factura || '',
        total: row.total_factura || 0,
        id_usuario: user?.id_usuario || user?.id || '',
      });
      if (res.data?.success) {
        Swal.fire('Éxito', 'Factura anulada correctamente', 'success');
        handleClear();
      } else {
        Swal.fire('Error', res.data?.msg || 'No se pudo anular la factura', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error al anular la factura', 'error');
    }
  };

  const handleVerMotivo = (row) => {
    Swal.fire({
      title: 'Motivo de Anulación',
      text: row.motivo_anulacion_factura || 'Sin motivo registrado',
      icon: 'info',
      confirmButtonText: 'Cerrar',
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <i className="fas fa-ban text-red-600 text-lg"></i>
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-800">Anulación Boletería</h1>
          <p className="text-[11px] text-slate-500">Buscar facturas y anular boletos emitidos</p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          <i className="fas fa-search mr-1.5"></i> Búsqueda de Factura
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-sm">
            <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5 block">#FACTURA</label>
            <input
              type="text"
              value={numeroFactura}
              onChange={(e) => {
                let val = e.target.value.replace(/[^0-9-]/g, '');
                // Auto-formato: 001-001-XXXXXXXXX
                if (val.length === 3 || val.length === 7) {
                  val = val + '-';
                }
                setNumeroFactura(val);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="001-001-000000001"
              maxLength={17}
              className="border border-slate-300 rounded-lg px-3 py-2 text-[12px] w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none font-mono"
            />
          </div>
          <button onClick={handleSearch} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors">
            <i className="fas fa-search"></i> Buscar
          </button>
          <button onClick={handleClear} className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-300 transition-colors">
            <i className="fas fa-eraser"></i> Limpiar
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">#FACTURA</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">FECHA</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">CLIENTE</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">TOTAL</th>
                  <th className="px-3 py-2 text-center font-bold text-slate-500 uppercase tracking-wider w-24">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">Sin datos para mostrar</td></tr>
                ) : (
                  (data || []).map((row, idx) => (
                    <tr key={row.id_factura || idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-bold">{row.secuencial_factura || row.numero_factura || '-'}</td>
                      <td className="px-3 py-2">{row.fecha_factura ? row.fecha_factura.split(' ')[0] : '-'}</td>
                      <td className="px-3 py-2">
                        <div className="text-[9px] leading-tight">
                          <div className="text-slate-400"><b>RUC:</b> {row.ruc_cliente_factura || '-'}</div>
                          <div><b>Razón Social:</b> {row.nombre_cliente_factura || '-'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-bold">${parseFloat(row.total_factura || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleAnular(row)}
                            title="Anular"
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                          >
                            <i className="fas fa-ban text-xs"></i>
                          </button>
                          <button
                            onClick={() => handleVerMotivo(row)}
                            title="Ver Motivo"
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                          >
                            <i className="fas fa-eye text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px]">
            <span className="text-slate-500">
              Mostrando {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, total || 0)} de {total || 0}
            </span>
            <div className="flex gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => { setCurrentPage(p => p - 1); fetchData(filters, currentPage - 2); }}
                className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100 transition-colors"
              ><i className="fas fa-chevron-left text-[9px]"></i></button>
              <span className="px-2 py-1 font-bold text-slate-600">{currentPage}</span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => { setCurrentPage(p => p + 1); fetchData(filters, currentPage); }}
                className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100 transition-colors"
              ><i className="fas fa-chevron-right text-[9px]"></i></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
