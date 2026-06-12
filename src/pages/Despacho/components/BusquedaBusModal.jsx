import { useState, useEffect } from 'react';
import { api } from '../../../config/axios';

/**
 * Modal de búsqueda de buses para filtro y formulario de despacho
 * Recrea BusquedaBusDespacho del ExtJS
 */
export const BusquedaBusModal = ({ onSelect, onClose, filterMode = false }) => {
  const [filtros, setFiltros] = useState({
    placa_busqueda: '',
    disco_busqueda: '',
    cedula_busqueda: '',
  });
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);

  const buscar = async (pagina = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/buses/seleccionarBuses', {
        params: {
          placa_busqueda: filtros.placa_busqueda || '',
          disco_busqueda: filtros.disco_busqueda || '',
          cedula_busqueda: filtros.cedula_busqueda || '',
          limit: 50,
          page: pagina
        }
      });
      if (res.data?.success) {
        setBuses(res.data.data || []);
      }
    } catch (err) {
      console.error('Error buscando buses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-cargar al abrir el modal
  useEffect(() => {
    buscar(1);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') buscar(1);
  };

  const limpiar = () => {
    const vacios = { placa_busqueda: '', disco_busqueda: '', cedula_busqueda: '' };
    setFiltros(vacios);
    setLoading(true);
    api.get('/buses/seleccionarBuses', {
      params: { placa_busqueda: '', disco_busqueda: '', cedula_busqueda: '', limit: 50, page: 1 }
    }).then(res => {
      if (res.data?.success) setBuses(res.data.data || []);
    }).catch(err => {
      console.error('Error buscando buses:', err);
    }).finally(() => {
      setLoading(false);
    });
  };

  // El backend retorna a través de destinoConstruir:
  // placa_buses, disco_buses, chasis_buses, codigo_buses, per_nombre_persona
  // (NO usa prefijo bus_, usa sufijo _buses)
  const mostrarNombreChofer = (bus) => {
    if (bus.per_nombre_persona) return bus.per_nombre_persona;
    if (bus.per_nombres_persona) return bus.per_nombres_persona;
    if (bus.per_nombre) return bus.per_nombre;
    return '-';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-white font-bold flex items-center gap-2">
            <i className="fas fa-bus text-blue-400"></i> Búsqueda de Buses
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          {/* Filtros */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Placa</label>
              <input
                type="text" value={filtros.placa_busqueda}
                onChange={e => setFiltros(p => ({ ...p, placa_busqueda: e.target.value }))}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Disco</label>
              <input
                type="text" value={filtros.disco_busqueda}
                onChange={e => setFiltros(p => ({ ...p, disco_busqueda: e.target.value }))}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cédula Conductor</label>
              <input
                type="text" value={filtros.cedula_busqueda}
                onChange={e => setFiltros(p => ({ ...p, cedula_busqueda: e.target.value }))}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => buscar(1)} disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
              Buscar
            </button>
            <button onClick={limpiar}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-sm font-medium transition-colors">
              <i className="fas fa-eraser mr-1"></i>Limpiar
            </button>
          </div>

          {/* Resultados */}
          <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Placa</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Disco</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Chasis</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Chofer</th>
                  <th className="px-3 py-2 text-center w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      {loading ? (
                        <><i className="fas fa-spinner fa-spin mr-2"></i>Buscando...</>
                      ) : (
                        'No se encontraron resultados'
                      )}
                    </td>
                  </tr>
                ) : (
                  buses.map((bus, idx) => (
                    <tr key={bus.id_buses || idx} className="hover:bg-blue-50 transition-colors">
                      <td className="px-3 py-2 font-medium text-slate-700">{bus.placa_buses || bus.placa || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{bus.disco_buses || bus.disco || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{bus.chasis_buses || bus.chasis || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{mostrarNombreChofer(bus)}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => {
                            if (filterMode) {
                              onSelect(bus.codigo_buses || bus.id_buses, bus.placa_buses || bus.placa);
                            } else {
                              onSelect(bus);
                            }
                          }}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <i className="fas fa-check mr-1"></i>Seleccionar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
