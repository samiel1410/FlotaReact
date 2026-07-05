import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';

export const ConfigurarAlimentosModal = ({ trip, onClose }) => {
  const [alimentos, setAlimentos] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/alimentos/listar');
        const items = res.data?.data || [];
        setAlimentos(items);
        // Intentar cargar alimentos del viaje
        try {
          const viajeRes = await api.get('/viajes/obtenerAlimentosViaje', { params: { id_viaje: trip?.id_viajes } });
          if (viajeRes.data?.success && viajeRes.data?.data) {
            const ids = String(viajeRes.data.data).split(',').map(s => s.trim());
            setSelected(ids);
          }
        } catch (e) { /* endpoint puede no existir */ }
      } catch (e) { toast.error('Error al cargar alimentos'); }
    };
    load();
  }, [trip]);

  const toggleItem = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const handleGuardar = async () => {
    setLoading(true);
    try {
      const res = await api.post('/viajes/guardarAlimentosViaje', {
        id_viaje: trip?.id_viajes,
        id_alimentos: selected.join(','),
      });
      if (res.data?.success) { toast.success('Alimentos actualizados'); onClose(); }
      else toast.error(res.data?.message || 'Error al guardar');
    } catch (e) { toast.error('Error al guardar alimentos'); }
    finally { setLoading(false); }
  };

  const filtered = alimentos.filter(a =>
    (a.nombre_alimentos || '').toLowerCase().includes(search.toLowerCase())
  );
  const total = selected.reduce((sum, id) => {
    const item = alimentos.find(a => String(a.id_alimentos) === id);
    return sum + parseFloat(item?.precio_alimentos || 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
              <i className="fas fa-utensils"></i>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Alimentos — Viaje #{trip?.id_viajes}</h2>
              <p className="text-[10px] font-bold text-slate-400">{trip?.nombre_bus || trip?.nombre_ruta || ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          {/* Grid de alimentos */}
          <div className="flex-1 flex flex-col p-4">
            <input type="text" placeholder="🔎 Buscar alimentos..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 px-3 mb-3 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" />
            <div className="flex-1 overflow-auto space-y-1">
              {filtered.length === 0 ? (
                <p className="text-center py-8 text-xs font-bold text-slate-400">No hay alimentos disponibles</p>
              ) : filtered.map(a => {
                const isSel = selected.includes(String(a.id_alimentos));
                return (
                  <div key={a.id_alimentos}
                    onClick={() => toggleItem(String(a.id_alimentos))}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all text-xs font-bold ${isSel ? 'bg-orange-50 border border-orange-200 text-orange-700' : 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100'
                      }`}>
                    <span>{a.nombre_alimentos}</span>
                    <span className="font-black">${parseFloat(a.precio_alimentos || 0).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Resumen lateral */}
          <div className="w-48 bg-slate-50 border-l border-slate-200 p-4 flex flex-col">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">SELECCIONADOS</p>
            <div className="flex-1 overflow-auto space-y-1.5">
              {selected.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">Ninguno</p>
              ) : selected.map(id => {
                const item = alimentos.find(a => String(a.id_alimentos) === id);
                return item ? (
                  <div key={id} className="flex justify-between text-[10px] font-semibold text-slate-600">
                    <span className="truncate">{item.nombre_alimentos}</span>
                    <span className="font-bold ml-1">${parseFloat(item.precio_alimentos).toFixed(2)}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="pt-3 mt-3 border-t border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">TOTAL</p>
              <p className="text-lg font-black text-emerald-600">${total.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose}
            className="h-9 px-5 text-[10px] font-black text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all uppercase tracking-widest">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={loading}
            className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest shadow-sm">
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
            {loading ? 'Guardando...' : 'Confirmar Selección'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurarAlimentosModal;
