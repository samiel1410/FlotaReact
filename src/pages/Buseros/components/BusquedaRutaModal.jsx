import { useState, useEffect } from 'react';
import { api } from '../../../config/axios';

export const BusquedaRutaModal = ({ onSelect, onClose }) => {
  const [busqueda, setBusqueda] = useState('');
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(false);

  const buscar = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rutas/rutasSeleccionCombo');
      const data = res.data?.data || res.data || [];
      const todas = Array.isArray(data) ? data : [];
      // Filtrar localmente por nombre si hay texto de búsqueda
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        setRutas(todas.filter(r => (r.nombre_rutas || r.nombre || '').toLowerCase().includes(q)));
      } else {
        setRutas(todas);
      }
    } catch (err) {
      console.error('Error buscando rutas:', err);
      setRutas([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-cargar al abrir el modal
  useEffect(() => {
    buscar();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') buscar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-white font-bold flex items-center gap-2">
            <i className="fas fa-route text-amber-400"></i> Búsqueda de Ruta
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre de Ruta</label>
              <input
                type="text" value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej: Ambato - Baños..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={buscar} disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
              Buscar
            </button>
          </div>

          {/* Resultados */}
          <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Ruta</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Código</th>
                  <th className="px-3 py-2 text-center w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rutas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-slate-400">
                      {loading ? (
                        <><i className="fas fa-spinner fa-spin mr-2"></i>Buscando...</>
                      ) : (
                        'No se encontraron resultados'
                      )}
                    </td>
                  </tr>
                ) : (
                  rutas.map((r, idx) => (
                    <tr key={r.id_rutas || r.id_ruta || idx} className="hover:bg-blue-50 transition-colors">
                      <td className="px-3 py-2 font-medium text-slate-700">{r.nombre_rutas || r.nombre || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{r.codigo_rutas || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => {
                            const id = r.id_rutas || r.id_ruta;
                            const nombre = r.nombre_rutas || r.nombre || 'S/N';
                            onSelect(id, nombre);
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
