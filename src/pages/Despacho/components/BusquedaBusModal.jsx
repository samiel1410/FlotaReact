import { useState } from 'react';
import { api } from '../../../config/axios';

/**
 * Modal de búsqueda de buses para filtro y formulario de despacho
 * Recrea BusquedaBusDespacho del ExtJS
 */
export const BusquedaBusModal = ({ onSelect, onClose, filterMode = false }) => {
  const [filtros, setFiltros] = useState({
    bus_chasis: '',
    bus_placa: '',
    per_cedula: '',
    per_nombre: ''
  });
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);

  const buscar = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/buses/seleccionarBuses', {
        params: {
          ...filtros,
          per_apellido: '',
          numero_bloque: page,
          tamanio_bloque: 20
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') buscar(1);
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Chasis</label>
              <input
                type="text" value={filtros.bus_chasis}
                onChange={e => setFiltros(p => ({ ...p, bus_chasis: e.target.value }))}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Placa</label>
              <input
                type="text" value={filtros.bus_placa}
                onChange={e => setFiltros(p => ({ ...p, bus_placa: e.target.value }))}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cédula</label>
              <input
                type="text" value={filtros.per_cedula}
                onChange={e => setFiltros(p => ({ ...p, per_cedula: e.target.value }))}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre</label>
              <input
                type="text" value={filtros.per_nombre}
                onChange={e => setFiltros(p => ({ ...p, per_nombre: e.target.value }))}
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
            <button onClick={() => { setFiltros({ bus_chasis: '', bus_placa: '', per_cedula: '', per_nombre: '' }); setBuses([]); }}
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
                        'Presione "Buscar" para ver resultados'
                      )}
                    </td>
                  </tr>
                ) : (
                  buses.map((bus, idx) => (
                    <tr key={idx} className="hover:bg-blue-50 transition-colors">
                      <td className="px-3 py-2 font-medium text-slate-700">{bus.bus_placa || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{bus.bus_disco || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{bus.bus_chasis || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {`${bus.per_nombre || ''} ${bus.per_apellido || ''}`.trim() || '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => {
                            if (filterMode) {
                              onSelect(bus.bus_codigo, bus.bus_placa);
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
