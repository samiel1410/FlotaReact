export const ViajesGrid = ({ data, loading, page, limit, total, onPageChange, onReload, onVerAsientos, onVerPasajeros, viajeSeleccionadoId }) => {
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">RUTA Y VIAJE</th>
              <th className="px-4 py-2.5 text-center font-bold text-slate-500 uppercase tracking-wider w-[120px]">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="2" className="text-center py-12 text-slate-400">
                <i className="fas fa-spinner fa-spin mr-2"></i> Cargando...
              </td></tr>
            ) : !data || data.length === 0 ? (
              <tr><td colSpan="2" className="text-center py-12 text-slate-400">No se encontraron viajes.</td></tr>
            ) : (
              data.map((item, idx) => {
                const isSelected = (item.via_codigo || item.id_viaje) === viajeSeleccionadoId;
                const viajeNum = item.via_codigo || item.id_viaje || '-';
                const fechaStr = item.fecha_salida || (item.via_orgesti ? item.via_orgesti.split(' ')[0] : '-');
                const horaStr = item.hora_salida || (item.via_orgesti && item.via_orgesti.split(' ')[1] ? item.via_orgesti.split(' ')[1] : '-');

                const capacidad = parseInt(item.capacidad_buses) || 40;
                const ocupados = parseInt(item.asientos_ocupados) || 0;
                const libres = Math.max(0, capacidad - ocupados);

                return (
                  <tr key={item.via_codigo || item.id_viaje || idx}
                    className={`border-b border-slate-100 transition-colors ${isSelected ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-black rounded text-[11px] border border-indigo-200 shadow-xs">
                          VIAJE #{viajeNum}
                        </span>
                        <span className="font-bold text-sm text-slate-800">{item.rut_nombre || 'Ruta Desconocida'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1.5 space-x-3">
                        <span><b>DISCO:</b> <span className="text-blue-600 font-bold">{item.bus_disco || '-'}</span></span>
                        <span><b>CHOFER:</b> <span className="text-slate-700">{item.per_chofer || '-'}</span></span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-4 flex-wrap">
                        <span><b>FECHA:</b> <span className="text-slate-700 font-semibold">{fechaStr}</span></span>
                        <span><b>HORA SALIDA:</b> <span className="text-orange-600 font-bold">{horaStr}</span></span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <i className="fas fa-chair text-emerald-500 text-[9px]"></i> Libres: {libres}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <i className="fas fa-user text-rose-500 text-[9px]"></i> Ocupados: {ocupados}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Total: {capacidad}
                        </span>
                      </div>
                    </td>
                    <td className="text-center align-middle">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => onVerPasajeros(item)} title="Ver Pasajeros"
                          className="w-9 h-9 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors flex items-center justify-center text-sm">
                          <i className="fas fa-users"></i>
                        </button>
                        <button onClick={() => onVerAsientos(item)} title="Ver Asientos"
                          className="w-9 h-9 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center text-sm">
                          <i className="fas fa-bus-alt"></i>
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
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px]">
          <span className="text-slate-500">
            Mostrando {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => onPageChange(1)}
              className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100">
              <i className="fas fa-angle-double-left text-[9px]"></i>
            </button>
            <button disabled={page === 1} onClick={() => onPageChange(page - 1)}
              className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100">
              <i className="fas fa-angle-left text-[9px]"></i>
            </button>
            <span className="px-2 py-1 font-bold text-slate-600">Pág. {page} de {totalPages}</span>
            <button disabled={page === totalPages || totalPages === 0} onClick={() => onPageChange(page + 1)}
              className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100">
              <i className="fas fa-angle-right text-[9px]"></i>
            </button>
            <button disabled={page === totalPages || totalPages === 0} onClick={() => onPageChange(totalPages)}
              className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100">
              <i className="fas fa-angle-double-right text-[9px]"></i>
            </button>
            <button onClick={onReload}
              className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-100">
              <i className="fas fa-sync-alt text-[9px]"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
