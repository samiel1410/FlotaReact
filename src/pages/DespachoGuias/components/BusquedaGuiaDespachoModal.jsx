import { useState, useEffect, useRef } from 'react';
import { despachoConvenioService } from '../../../services/despachoConvenio.service';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

export const BusquedaGuiaDespachoModal = ({ idDespachoMaestro, bus, onClose, onSelect }) => {
  const [guias, setGuias] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [numeroBusqueda, setNumeroBusqueda] = useState('');
  const limit = 15;
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    cargarGuias(1);
  }, []);

  const cargarGuias = async (pageNum, numeroGuia) => {
    setLoading(true);
    try {
      const params = {
        numeroguia: numeroGuia || '',
        limit,
        page: pageNum
      };
      const res = await despachoConvenioService.listarGuiasDisponibles(params);
      if (res.success) {
        setGuias(res.data || []);
        setTotal(res.total || 0);
      } else {
        toast.error(res.mensaje || 'Error al cargar guías');
      }
    } catch (error) {
      console.error('Error cargando guías:', error);
      toast.error('Error al cargar guías disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = () => {
    setPage(1);
    cargarGuias(1, numeroBusqueda);
  };

  const handleSelect = async (guia) => {
    // Confirm before adding
    const confirmAdd = await Swal.fire({ title: '¿Agregar guía?', text: `¿Seguro que desea ingresar esta guía (${guia.numero_guia}) a este despacho?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, agregar', cancelButtonText: 'Cancelar' });
    if (!confirmAdd.isConfirmed) return;

    if (onSelect) {
      onSelect({
        id_guia: guia.id,
        numero_guia: guia.numero_guia,
        destino_guia: guia.nombre_destino || '',
        bus: bus || ''
      });
    }
  };

  const formatCurrency = (value) => {
    return `$ ${parseFloat(value || 0).toFixed(2)}`;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <i className="fas fa-search text-sm"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Búsqueda de Guías</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Seleccione guías para agregar al despacho</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Search filter */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Número de Guía</label>
              <input
                type="text"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 uppercase"
                placeholder="Ingrese número de guía..."
                value={numeroBusqueda}
                onChange={e => setNumeroBusqueda(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleBuscar(); }}
              />
            </div>
            <button
              onClick={handleBuscar}
              className="mt-5 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all"
            >
              <i className="fas fa-search mr-1"></i>Buscar
            </button>
            <button
              onClick={() => { setNumeroBusqueda(''); setPage(1); cargarGuias(1, ''); }}
              className="mt-5 h-9 px-4 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-sm font-bold transition-all"
            >
              <i className="fas fa-eraser mr-1"></i>Limpiar
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="ml-3 text-sm text-slate-500">Cargando guías...</span>
            </div>
          ) : guias.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <i className="fas fa-box-open text-4xl mb-3"></i>
              <p className="text-sm font-medium">No hay guías disponibles</p>
              <p className="text-xs mt-1">Todas las guías disponibles ya están asignadas a un despacho o no hay guías en estado DESPACHADA (1)</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">N° Guía</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Destino</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Compañía</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {guias.map((guia, idx) => (
                    <tr key={guia.id || idx} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {guia.numero_guia || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {guia.nombre_destino || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {guia.nombre_compania_asociada || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800 font-bold text-right">
                        {formatCurrency(guia.valor_neto)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleSelect(guia)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all"
                          title="Seleccionar guía"
                        >
                          <i className="fas fa-arrow-right mr-1"></i>Agregar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-xs text-slate-500">
                Página {page} de {totalPages} ({total} registros)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { const np = page - 1; setPage(np); cargarGuias(np, numeroBusqueda); }}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-left mr-1"></i>Anterior
                </button>
                <button
                  onClick={() => { const np = page + 1; setPage(np); cargarGuias(np, numeroBusqueda); }}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente<i className="fas fa-chevron-right ml-1"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
