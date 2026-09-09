import React, { useState, useMemo } from 'react';

export const DespachoCambiarUnidadModal = ({
  buses,
  currentId,
  onChange,
  cambiando,
  onClose,
  viajeDesc,
}) => {
  const [selectedBus, setSelectedBus] = useState(currentId);
  const [busSearch, setBusSearch] = useState('');

  const filteredBuses = useMemo(() => {
    if (!busSearch.trim()) return buses;
    const s = busSearch.toLowerCase();
    return buses.filter((b) =>
      (b.disco_buses || '').toLowerCase().includes(s) ||
      (b.placa_buses || '').toLowerCase().includes(s) ||
      (b.codigo_buses || '').toLowerCase().includes(s)
    );
  }, [buses, busSearch]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <i className="fas fa-bus text-sm" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Cambiar Unidad Asignada</h3>
              <p className="text-[11px] text-slate-500 font-medium">Reasignar bus operativo para este viaje</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times text-xs" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Viaje Operativo</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{viajeDesc}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Buscar Bus / Disco
            </label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                value={busSearch}
                onChange={(e) => setBusSearch(e.target.value)}
                placeholder="Escriba número de disco o placa..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Seleccione la nueva unidad ({filteredBuses.length} disponibles)
            </label>
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {filteredBuses.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No se encontraron buses con "{busSearch}"
                </div>
              ) : (
                filteredBuses.map((b) => {
                  const bId = b.id_buses || b.bus_id;
                  const isCur = String(bId) === String(selectedBus);
                  return (
                    <div
                      key={bId}
                      onClick={() => setSelectedBus(bId)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isCur ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <i className={`fas fa-bus ${isCur ? 'text-blue-600' : 'text-slate-400'} text-xs`} />
                        <div>
                          <p className="text-xs font-bold leading-none">
                            Bus {b.disco_buses || b.codigo_buses || '-'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            Placa: {b.placa_buses || '-'} {b.capacidad_buses ? `• ${b.capacidad_buses} asientos` : ''}
                          </p>
                        </div>
                      </div>
                      {isCur && (
                        <i className="fas fa-check-circle text-blue-600 text-sm" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onChange(selectedBus)}
              disabled={cambiando || !selectedBus}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
            >
              {cambiando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}
              <span>Asignar Unidad</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DespachoCambiarUnidadModal;
