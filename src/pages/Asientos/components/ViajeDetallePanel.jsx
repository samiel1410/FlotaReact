export const ViajeDetallePanel = ({ viaje, modo, datos, loading, onClose }) => {

  const renderAsientos = () => {
    const asientosList = datos.length > 0 ? datos : Array.from({ length: 40 }, (_, i) => ({
      asiento: i + 1,
      disponible: Math.random() > 0.5 ? 1 : 0,
      cliente_nombre: 'Ocupado por pasajero'
    }));

    return (
      <div className="p-5 flex justify-center">
        <div className="relative grid grid-cols-4 gap-x-8 gap-y-4 bg-slate-100 p-8 rounded-2xl shadow-inner">
          {/* Pasillo central */}
          <div className="absolute left-1/2 top-0 bottom-0 w-5 -translate-x-1/2 bg-slate-200 rounded opacity-50"></div>

          {asientosList.map((asiento, idx) => (
            <div
              key={idx}
              title={asiento.disponible == 1 ? 'Disponible' : `Ocupado: ${asiento.cliente_nombre}`}
              className={`relative w-[52px] h-[52px] rounded-lg flex items-center justify-center font-bold text-lg shadow-md border-t-4 border-t-white/30 cursor-default ${
                asiento.disponible == 1 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {asiento.asiento}
              {asiento.disponible == 0 && (
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-slate-700 whitespace-nowrap bg-white px-1 py-0.5 rounded shadow-sm z-10">
                  {asiento.cliente_nombre?.substring(0, 9)}..
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPasajeros = () => {
    return (
      <div className="overflow-y-auto" style={{ height: 'calc(100% - 150px)' }}>
        <table className="w-full text-[11px] mt-3">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-center font-bold text-slate-500 uppercase tracking-wider w-16">ASIENTO</th>
              <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">IDENTIFICACIÓN</th>
              <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">NOMBRES</th>
              <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider w-20">TIPO</th>
              <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider w-24">VALOR</th>
            </tr>
          </thead>
          <tbody>
            {datos.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-slate-400">No hay pasajeros registrados.</td></tr>
            ) : (
              datos.filter(d => d.disponible == 0).map((p, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-center font-bold text-red-500">{p.asiento}</td>
                  <td className="px-3 py-2 font-mono">{p.identificacion || p.bol_cedula || '-'}</td>
                  <td className="px-3 py-2 font-semibold">{p.cliente_nombre || p.bol_nombre || '-'}</td>
                  <td className="px-3 py-2">{p.tipo || p.bol_destino || 'NORMAL'}</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-600">${parseFloat(p.valor || p.bol_valor || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const headerBg = modo === 'asientos' ? 'bg-blue-600' : 'bg-slate-600';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`${headerBg} text-white px-5 py-3 flex items-center justify-between shrink-0`}>
        <h3 className="text-base font-bold flex items-center gap-2">
          <i className={modo === 'asientos' ? 'fas fa-bus-alt' : 'fas fa-users'}></i>
          {modo === 'asientos' ? 'Mapa de Asientos' : 'Manifiesto de Pasajeros'}
        </h3>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors text-lg">
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Info del Viaje */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex gap-6 flex-wrap text-[11px] shrink-0">
        <div><span className="text-slate-400 text-[10px] block">Ruta</span><b>{viaje.rut_nombre || '-'}</b></div>
        <div><span className="text-slate-400 text-[10px] block">Disco Bus</span><b className="text-blue-600">{viaje.bus_disco || '-'}</b></div>
        <div><span className="text-slate-400 text-[10px] block">Chofer</span><b>{viaje.per_chofer || '-'}</b></div>
        <div><span className="text-slate-400 text-[10px] block">Fecha Salida</span><b className="text-orange-600">{viaje.via_orgesti || '-'}</b></div>
      </div>

      {/* Contenido Dinámico */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
            <div className="text-center text-slate-500">
              <i className="fas fa-circle-notch fa-spin fa-3x mb-2"></i>
              <p className="text-sm font-medium">Cargando información...</p>
            </div>
          </div>
        )}

        {modo === 'asientos' ? renderAsientos() : renderPasajeros()}
      </div>
    </div>
  );
};
