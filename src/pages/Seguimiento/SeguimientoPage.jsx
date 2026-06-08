import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { SeguimientoService } from '../../services/seguimiento.service';

const PAGE_SIZE = 15;

/** Mapa de estado_seguimiento a etiqueta legible (fiel al ExtJS) */
const ESTADO_MAP = {
  '1': { label: 'EN OFICINA', color: 'bg-slate-100 text-slate-700' },
  '2': { label: 'POR ENTREGAR', color: 'bg-yellow-100 text-yellow-700' },
  '3': { label: 'PENDIENTE ANULAR', color: 'bg-orange-100 text-orange-700' },
  '8': { label: 'EN BUS', color: 'bg-indigo-100 text-indigo-700' },
  '7': { label: 'VIAJANDO', color: 'bg-blue-100 text-blue-700' },
  '4': { label: 'ANULADO', color: 'bg-red-100 text-red-700' },
  '9': { label: 'CANCELADO', color: 'bg-red-100 text-red-700' },
  '10': { label: 'ENTREGADO', color: 'bg-emerald-100 text-emerald-700' },
};

const getEstadoBadge = (value) => {
  const v = String(value);
  return ESTADO_MAP[v] || { label: v || '-', color: 'bg-slate-100 text-slate-600' };
};

/** Formatea número de guía con guiones automáticos: XXX-XXX-XXXXXXXXX (3-3-9) */
const formatNumeroGuia = (value) => {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 15)}`;
};

const formatFecha = (fecha) => {
  if (!fecha) return '-';
  try {
    const d = new Date(fecha);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}`;
  } catch {
    return fecha;
  }
};

export const SeguimientoPage = () => {
  const [numeroGuia, setNumeroGuia] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [pagina, setPagina] = useState(1);

  /** Resultados paginados localmente */
  const resultadosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * PAGE_SIZE;
    return resultados.slice(inicio, inicio + PAGE_SIZE);
  }, [resultados, pagina]);

  const totalPaginas = Math.max(1, Math.ceil(resultados.length / PAGE_SIZE));

  const handleBuscar = async () => {
    const guia = numeroGuia.trim();
    if (!guia) {
      toast.error('Ingrese un número de guía para buscar');
      return;
    }

    setLoading(true);
    setBuscado(true);
    setPagina(1);
    try {
      const res = await SeguimientoService.buscarGuiaSeguimineto(guia);
      // La respuesta puede ser { success: true, data: [...] } o directamente un array
      const datos = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.resultados)
            ? res.resultados
            : [];

      setResultados(datos);

      if (datos.length === 0) {
        toast('No se encontraron resultados para esta guía', { icon: 'ℹ️' });
      }
    } catch (err) {
      console.error('[Seguimiento] Error al buscar:', err);
      toast.error('Error al buscar seguimientos');
      setResultados([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBuscar();
    }
  };

  const handleLimpiar = () => {
    setNumeroGuia('');
    setResultados([]);
    setBuscado(false);
    setPagina(1);
  };

  const handleEliminar = async (record) => {
    const estadoVal = String(record.estado_seguimiento);

    if (estadoVal !== '10') {
      toast.error('Solo se pueden eliminar los seguimientos con estado ENTREGADO');
      return;
    }

    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: 'Esta acción eliminará el seguimiento seleccionado',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await SeguimientoService.eliminarSeguimientoEntregado(record.id_seguimiento);
      if (res?.success !== false) {
        toast.success('Seguimiento eliminado');
        // Re-buscar para refrescar la lista
        handleBuscar();
      } else {
        toast.error(res?.message || 'Error al eliminar seguimiento');
      }
    } catch (err) {
      console.error('[Seguimiento] Error al eliminar:', err);
      toast.error('Error al eliminar seguimiento');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <i className="fas fa-box-open text-blue-600 text-lg"></i>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">SEGUIMIENTOS</h1>
          <p className="text-xs text-slate-500">Búsqueda y gestión de seguimientos de guías</p>
        </div>
      </div>

      {/* Filtro de búsqueda */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Número de Guía
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
              placeholder="001-0001-0000001"
              value={numeroGuia}
              onChange={(e) => setNumeroGuia(formatNumeroGuia(e.target.value))}
              onKeyDown={handleKeyDown}
              maxLength={17}
            />
          </div>
          <button
            onClick={handleBuscar}
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
          >
            <i className="fas fa-search"></i>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
          <button
            onClick={handleLimpiar}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
          >
            <i className="fas fa-eraser"></i>
            Limpiar
          </button>
        </div>
      </div>

      {/* Grid de resultados */}
      {buscado && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <i className="fas fa-spinner fa-spin text-2xl mr-3 text-blue-500"></i>
              <span className="font-medium">Buscando seguimientos...</span>
            </div>
          ) : resultados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <i className="fas fa-inbox text-4xl mb-3 text-slate-300"></i>
              <p className="font-medium">No se encontraron resultados</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">GUÍA</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">OFICINA</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">OBSERVACIÓN</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">FECHA Y HORA</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">BUS</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">USUARIO</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ESTADO</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-16">ACCIÓN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultadosPaginados.map((r, idx) => {
                      const badge = getEstadoBadge(r.estado_seguimiento);
                      const puedeEliminar = String(r.estado_seguimiento) === '10';
                      return (
                        <tr key={r.id_seguimiento || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-700 font-medium text-xs">
                            {r.numeroguia || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {r.ubicacion_seguimiento || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs italic max-w-[200px] truncate">
                            {r.observacion_seguimiento || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                            {formatFecha(r.fecha_creacion_seguimiento)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {r.bus_seguimiento || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {r.usuario || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${badge.color}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleEliminar(r)}
                              disabled={!puedeEliminar}
                              title={puedeEliminar ? 'Eliminar seguimiento' : 'Solo se puede eliminar en estado ENTREGADO'}
                              className={`p-1.5 rounded-md transition-colors ${
                                puedeEliminar
                                  ? 'text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer'
                                  : 'text-slate-300 cursor-not-allowed'
                              }`}
                            >
                              <i className="fas fa-minus-circle text-lg"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación local */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-500">
                  Mostrando {((pagina - 1) * PAGE_SIZE) + 1} - {Math.min(pagina * PAGE_SIZE, resultados.length)} de {resultados.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                    disabled={pagina <= 1}
                    className="px-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
                    const pageNum = start + i;
                    if (pageNum > totalPaginas) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPagina(pageNum)}
                        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                          pagina === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                    disabled={pagina >= totalPaginas}
                    className="px-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SeguimientoPage;
