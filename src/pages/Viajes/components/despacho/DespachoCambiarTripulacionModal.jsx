import React, { useState } from 'react';

export const DespachoCambiarTripulacionModal = ({
  personal,
  currentChoferId,
  currentAuxiliarId,
  onSave,
  cambiando,
  onClose,
  viajeDesc,
}) => {
  const [choferId, setChoferId] = useState(currentChoferId || '');
  const [auxiliarId, setAuxiliarId] = useState(currentAuxiliarId || '');

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
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i className="fas fa-users-cog text-sm" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Gestionar Tripulación</h3>
              <p className="text-[11px] text-slate-500 font-medium">Asignar conductor y auxiliar del viaje</p>
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
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Viaje Operativo</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{viajeDesc}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Conductor Principal <span className="text-rose-500">*</span>
            </label>
            <select
              value={choferId}
              onChange={(e) => setChoferId(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium"
            >
              <option value="">Seleccionar Conductor...</option>
              {personal.map((p) => (
                <option key={p.id_personal || p.per_codigo_personal} value={p.id_personal || p.per_codigo_personal}>
                  {p.per_nombres_persona || p.nombre_personal} ({p.per_cedula_persona || p.cedula || 'S/N'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Auxiliar / Ayudante (Opcional)
            </label>
            <select
              value={auxiliarId}
              onChange={(e) => setAuxiliarId(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium"
            >
              <option value="">Ninguno / Sin Auxiliar</option>
              {personal.map((p) => (
                <option key={p.id_personal || p.per_codigo_personal} value={p.id_personal || p.per_codigo_personal}>
                  {p.per_nombres_persona || p.nombre_personal} ({p.per_cedula_persona || p.cedula || 'S/N'})
                </option>
              ))}
            </select>
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
              onClick={() => onSave(choferId, auxiliarId)}
              disabled={cambiando || !choferId}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
            >
              {cambiando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}
              <span>Guardar Tripulación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DespachoCambiarTripulacionModal;
