import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';
import ViajesService from '../../../services/viajes.service';

export const ItinerarioViajeModal = ({ trip, onClose }) => {
  const [paradas, setParadas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [ituRes, sucRes] = await Promise.all([
          ViajesService.getItinerario(trip?.id_viajes),
          api.get('/sucursal/comboSucursal'),
        ]);
        const sucs = sucRes.data?.data || [];
        setSucursales(sucs);

        if (ituRes.success && ituRes.data?.length > 0) {
          setParadas(ituRes.data.map(p => ({
            id_fksucursal: p.id_fksucursal || '',
            hora_llegada: p.hora_llegada ? p.hora_llegada.slice(0, 5) : '',
            hora_salida: p.hora_salida ? p.hora_salida.slice(0, 5) : '',
            orden: p.orden || 0,
          })));
        } else {
          setParadas([{ id_fksucursal: '', hora_llegada: '', hora_salida: '', orden: 0 }]);
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, [trip]);

  const addParada = () => setParadas(p => [...p, { id_fksucursal: '', hora_llegada: '', hora_salida: '', orden: p.length }]);
  const removeParada = (idx) => setParadas(p => p.filter((_, i) => i !== idx));
  const updateParada = (idx, field, value) => setParadas(p => p.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const handleGuardar = async () => {
    setLoading(true);
    try {
      const res = await ViajesService.saveItinerario(trip?.id_viajes, paradas.filter(p => p.id_fksucursal));
      if (res.success) { toast.success('Itinerario guardado'); onClose(); }
      else toast.error(res.message || 'Error al guardar');
    } catch (e) { toast.error('Error al guardar itinerario'); }
    finally { setLoading(false); }
  };

  const inputCls = 'w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white transition-all';
  const labelCls = 'block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
              <i className="fas fa-route"></i>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Itinerario Viaje #{trip?.id_viajes}</h2>
              <p className="text-[10px] font-bold text-slate-400">{trip?.nombre_ruta || ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-3">
          <p className="text-[10px] font-bold text-slate-500">Configure las paradas del itinerario:</p>
          {paradas.map((p, idx) => (
            <div key={idx} className="flex gap-2 items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex-1 space-y-2">
                <div>
                  <label className={labelCls}>Sucursal / Parada</label>
                  <select value={p.id_fksucursal} onChange={e => updateParada(idx, 'id_fksucursal', e.target.value)}
                    className={inputCls}>
                    <option value="">Seleccionar...</option>
                    {sucursales.map(s => (
                      <option key={s.id_sucursal || s.suc_codigo_sucursal} value={s.id_sucursal || s.suc_codigo_sucursal}>
                        {s.nombre_sucursal}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Llegada</label>
                    <input type="time" value={p.hora_llegada}
                      onChange={e => updateParada(idx, 'hora_llegada', e.target.value)}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Salida</label>
                    <input type="time" value={p.hora_salida}
                      onChange={e => updateParada(idx, 'hora_salida', e.target.value)}
                      className={inputCls} />
                  </div>
                </div>
              </div>
              {paradas.length > 1 && (
                <button onClick={() => removeParada(idx)}
                  className="h-8 w-8 mt-5 rounded-lg bg-rose-100 text-rose-500 hover:bg-rose-200 transition-colors flex items-center justify-center shrink-0">
                  <i className="fas fa-times text-xs"></i>
                </button>
              )}
            </div>
          ))}
          <button onClick={addParada}
            className="w-full h-9 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:border-purple-300 hover:text-purple-500 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
            <i className="fas fa-plus"></i> Agregar Parada
          </button>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose}
            className="h-9 px-5 text-[10px] font-black text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all uppercase tracking-widest">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={loading}
            className="h-9 px-6 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest shadow-sm">
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
            {loading ? 'Guardando...' : 'Guardar Itinerario'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItinerarioViajeModal;
