import React from 'react';

const DestinoList = ({
  destinos = [],
  loading = false,
  onEdit,
  onDelete,
  onPageChange,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Listado de Destinos</h2>
          <p className="text-[11px] text-slate-400 font-medium">Visualización de agencias y destinos registrados</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
            <i className="fas fa-spinner fa-spin text-xs" />
            <span>Actualizando datos...</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Destino / Punto
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Lugar / Ciudad
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Compañía
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Dirección / Contacto
              </th>
              <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && destinos.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                  <i className="fas fa-circle-notch fa-spin text-2xl text-indigo-500 mb-2" />
                  <p className="text-xs font-medium">Cargando destinos...</p>
                </td>
              </tr>
            ) : destinos.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-map-marked-alt text-lg" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">No se encontraron destinos</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Intenta ajustar los filtros de búsqueda</p>
                </td>
              </tr>
            ) : (
              destinos.map((destino) => {
                const isActivo = String(destino.estado_destino) === '1';
                return (
                  <tr key={destino.id_destino} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <i className="fas fa-map-pin text-[11px]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 tracking-tight">
                            {destino.nombre_destino || 'Sin nombre'}
                          </p>
                          {destino.nombre_sucursal && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Sucursal: {destino.nombre_sucursal}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100/80">
                        <i className="fas fa-city text-[10px] text-blue-500" />
                        {destino.lugar_destino || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <i className="fas fa-building text-[10px] text-slate-400" />
                        {destino.nombre_compania_asociada || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-xs font-medium text-slate-700 max-w-xs truncate" title={destino.direccion_exacta || ''}>
                          {destino.direccion_exacta || 'Sin dirección'}
                        </p>
                        {destino.numero_contacto && (
                          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <i className="fas fa-phone-alt text-[9px]" />
                            {destino.numero_contacto}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isActivo
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActivo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {isActivo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEdit(destino)}
                          className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors"
                          title="Editar destino"
                        >
                          <i className="fas fa-pencil-alt text-xs" />
                        </button>
                        <button
                          onClick={() => onDelete(destino.id_destino)}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                          title="Eliminar destino"
                        >
                          <i className="fas fa-trash-alt text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100 gap-3">
        <span className="text-xs text-slate-500 font-medium">
          Página <span className="font-bold text-slate-700">{currentPage}</span> de{' '}
          <span className="font-bold text-slate-700">{totalPages}</span> ({totalCount} registros)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="h-8 px-3 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition-all flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
          >
            <i className="fas fa-chevron-left text-[10px]" />
            <span>Anterior</span>
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="h-8 px-3 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition-all flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
          >
            <span>Siguiente</span>
            <i className="fas fa-chevron-right text-[10px]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DestinoList;
