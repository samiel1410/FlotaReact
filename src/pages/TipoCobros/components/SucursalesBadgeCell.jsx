import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export const SucursalesBadgeCell = ({ value, row }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const aplicaTodas = Number(row?.aplica_todas_sucursales ?? 1) === 1 || !value;
  const list = value ? value.split(', ').map(s => s.trim()).filter(Boolean) : [];

  const filteredList = list.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {aplicaTodas ? (
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-200 shadow-xs">
          <i className="fas fa-globe text-[9px]"></i> Todas las oficinas
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex flex-wrap items-center gap-1 max-w-[240px] text-left p-1 -m-1 rounded-lg hover:bg-indigo-50/60 transition-all cursor-pointer border border-transparent hover:border-indigo-200"
          title="Clic para ver el listado completo de oficinas"
        >
          {list.slice(0, 2).map((s, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-indigo-200 group-hover:border-indigo-300 group-hover:bg-indigo-100/70 transition-all"
            >
              <i className="fas fa-building text-[7px]"></i> {s}
            </span>
          ))}
          {list.length > 2 && (
            <span className="inline-flex items-center bg-indigo-600 text-white px-1.5 py-0.5 rounded text-[9px] font-black shadow-xs group-hover:scale-105 transition-all">
              +{list.length - 2}
            </span>
          )}
          <span className="text-[8px] text-indigo-400 group-hover:text-indigo-600 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <i className="fas fa-search-plus"></i>
          </span>
        </button>
      )}

      {/* Modal React Nativo */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
            <div
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                    <i className="fas fa-building text-sm"></i>
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-tight text-white">
                      Oficinas Asignadas
                    </h3>
                    <p className="text-[9px] text-indigo-200 font-medium">
                      {row?.nombre_tipo_cobros || 'Tipo de Cobro'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all text-xs"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Subheader / Buscador */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="relative flex-1">
                  <i className="fas fa-search absolute left-3 top-2.5 text-slate-400 text-[10px]"></i>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filtrar oficina en la lista..."
                    autoFocus
                    className="w-full h-8 pl-8 pr-3 text-[11px] border border-slate-200 rounded-lg bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200 shrink-0">
                  {list.length} oficina(s)
                </div>
              </div>

              {/* Body: Lista de Oficinas */}
              <div className="p-4 overflow-y-auto flex-1 space-y-2">
                {filteredList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    No se encontraron oficinas que coincidan con la búsqueda
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredList.map((sucNombre, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 transition-all shadow-2xs"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-slate-800 truncate leading-tight">
                            {sucNombre}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[9px] text-indigo-600 font-bold mt-0.5">
                            <i className="fas fa-check-circle text-[8px]"></i> Cobro habilitado
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[9px] text-slate-400 font-medium">
                  Este rubro sólo se deduce en despachos de las oficinas listadas.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="h-8 px-4 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-all"
                >
                  CERRAR
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default SucursalesBadgeCell;
