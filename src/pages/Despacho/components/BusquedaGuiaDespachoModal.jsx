import { useState } from 'react';
import toast from 'react-hot-toast';
import { despachoService } from '../../../services/despacho.service';

/**
 * Modal de búsqueda de guías para agregar a un despacho
 * Recrea BusquedaGuiaDespacho del ExtJS
 */
export const BusquedaGuiaDespachoModal = ({ idDespachoMaestro, bus, onClose, onSelect }) => {
  const [guias, setGuias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [numeroGuia, setNumeroGuia] = useState('');
  const [selectedGuia, setSelectedGuia] = useState(null);

  const buscarGuias = async (page = 1) => {
    setLoading(true);
    try {
      // Buscar guías disponibles para despacho
      const { api } = await import('../../../config/axios');
      const guiasRes = await api.get('/guia/guialistadoDespacho', {
        params: { page, limit: 50 }
      });

      if (guiasRes.data?.success) {
        setGuias(guiasRes.data.data || []);
      } else {
        setGuias([]);
      }
    } catch (err) {
      console.error('Error buscando guías:', err);
      toast.error('Error al buscar guías');
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarGuia = async (guia) => {
    try {
      const res = await despachoService.crear({
        id_guia: guia.id_guia,
        id_despacho_maestro: idDespachoMaestro,
        destino_guia: guia.destino_guia || '',
        bus: bus || '',
        nombre_oficina: guia.nombre_oficina || ''
      });

      if (res?.success) {
        if (res.tipo === 1) {
          toast.success('Guía agregada al despacho');
          if (onSelect) onSelect(guia);
        } else {
          toast.error('Esta guía ya está agregada a este despacho');
        }
        buscarGuias();
      } else {
        toast.error(res?.mensaje || 'Error al agregar guía');
      }
    } catch (err) {
      console.error('Error agregando guía:', err);
      toast.error('Error al agregar guía');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-white font-bold flex items-center gap-2">
            <i className="fas fa-search text-blue-400"></i>
            DESPACHO N# {idDespachoMaestro} — Agregar Guías
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">N° Guía</label>
              <input
                type="text"
                value={numeroGuia}
                onChange={e => setNumeroGuia(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarGuias()}
                placeholder="Buscar por número de guía..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button onClick={() => buscarGuias()} disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
              Buscar
            </button>
          </div>

          {/* Resultados */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">N° Guía</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Remitente</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Destinatario</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Destino</th>
                  <th className="px-3 py-2 text-right text-[11px] font-bold uppercase text-slate-500">Total</th>
                  <th className="px-3 py-2 text-center w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guias.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      {loading ? (
                        <><i className="fas fa-spinner fa-spin mr-2"></i>Buscando...</>
                      ) : (
                        'Presione "Buscar" para ver guías disponibles'
                      )}
                    </td>
                  </tr>
                ) : (
                  guias.map((g, idx) => (
                    <tr key={g.id_guia || idx} className="hover:bg-blue-50 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs font-medium text-slate-700">
                        {g.numero_guia_final || g.gui_numero || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-xs">
                        {g.nombre_cliente_remitente || g.remitente || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-xs">
                        {g.nombre_cliente_receptor || g.destinatario || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-xs">{g.destino_guia || g.destino || '-'}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-700">
                        ${parseFloat(g.total_guia || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleAgregarGuia(g)}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <i className="fas fa-plus mr-1"></i>Agregar
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
