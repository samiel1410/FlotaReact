import React, { useMemo } from 'react';

export const DespachoAsientosTable = ({ asientos, mostrarSucursalColumna = true }) => {
  const ocupados = (asientos || []).filter((a) => a.ocupado || a.ocupado === 1 || a.pasajero);

  const totalValor = useMemo(() => {
    return ocupados.reduce((sum, a) => {
      const val = parseFloat(a.pasajero?.precio ?? a.total_boleto_detalle ?? 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [ocupados]);

  // Agrupar por oficina cuando se muestra la lista
  const gruposPorSucursal = useMemo(() => {
    const grupos = new Map();
    ocupados.forEach((a) => {
      const p = a.pasajero || {};
      const nom = a.nombre_sucursal || p.nombre_sucursal || 'Oficina Principal';
      if (!grupos.has(nom)) {
        grupos.set(nom, { nombre: nom, items: [], subtotal: 0 });
      }
      const g = grupos.get(nom);
      g.items.push(a);
      g.subtotal += parseFloat(p.precio ?? a.total_boleto_detalle ?? 0);
    });
    return Array.from(grupos.values());
  }, [ocupados]);

  if (ocupados.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 mx-auto mb-2">
          <i className="fas fa-chair text-xl" />
        </div>
        <p className="text-xs font-bold text-slate-600">Sin asientos ocupados en esta vista</p>
        <p className="text-[11px] text-slate-400 mt-0.5">No hay boletos vendidos que coincidan con el filtro seleccionado</p>
      </div>
    );
  }

  const tieneMultiplesOficinas = gruposPorSucursal.length > 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
            <th className="px-4 py-2.5 text-center w-12">#</th>
            <th className="px-4 py-2.5 text-center w-20">Asiento</th>
            <th className="px-4 py-2.5 text-left">Pasajero</th>
            <th className="px-4 py-2.5 text-left">Identificación</th>
            <th className="px-4 py-2.5 text-left">Sucursal / Oficina</th>
            <th className="px-4 py-2.5 text-left">Destino</th>
            <th className="px-4 py-2.5 text-right w-24">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {gruposPorSucursal.map((grupo, gIdx) => {
            let runningIndex = 0;
            for (let i = 0; i < gIdx; i++) {
              runningIndex += gruposPorSucursal[i].items.length;
            }

            return (
              <React.Fragment key={grupo.nombre}>
                {tieneMultiplesOficinas && (
                  <tr className="bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/50 border-y border-blue-100">
                    <td colSpan={7} className="px-4 py-2 text-xs font-extrabold text-blue-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-building text-blue-600 text-xs" />
                          <span className="uppercase tracking-wide">OFICINA DE VENTA: {grupo.nombre}</span>
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.2 rounded-full border border-blue-200">
                            {grupo.items.length} pax
                          </span>
                        </div>
                        <span className="font-mono text-emerald-700 text-xs font-black">
                          Subtotal: ${grupo.subtotal.toFixed(2)}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}

                {grupo.items.map((a, i) => {
                  const p = a.pasajero || {};
                  const sucursalNombre = a.nombre_sucursal || p.nombre_sucursal || 'Oficina Principal';
                  const rowNumber = runningIndex + i + 1;

                  return (
                    <tr key={`${grupo.nombre}-${i}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 text-center text-slate-400 font-mono text-[11px]">{rowNumber}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="bg-blue-600 text-white font-mono font-black px-2.5 py-0.5 rounded-md text-[11px] shadow-sm">
                          {a.numero || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-bold text-slate-900">
                        {p.nombre || <span className="text-slate-400 font-normal">Sin nombre</span>}
                      </td>
                      <td className="px-4 py-2 text-slate-600 font-mono text-[11px]">
                        {p.cedula || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          <i className="fas fa-building text-[9px] text-blue-500" />
                          {sucursalNombre}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-600 font-medium">
                        {p.destino || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-black font-mono text-emerald-600 text-[12px]">
                        ${parseFloat(p.precio || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}

                {tieneMultiplesOficinas && (
                  <tr className="bg-slate-50/70 border-b border-slate-200 font-bold text-[11px] text-slate-700">
                    <td colSpan={6} className="px-4 py-1.5 text-right text-slate-500 uppercase">
                      Total {grupo.nombre} ({grupo.items.length} pax):
                    </td>
                    <td className="px-4 py-1.5 text-right font-black font-mono text-emerald-700">
                      ${grupo.subtotal.toFixed(2)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100/90 border-t-2 border-slate-200 text-slate-800 font-extrabold">
            <td colSpan={6} className="px-4 py-2.5 text-right uppercase tracking-wider text-[11px]">
              <span className="text-slate-500 font-bold mr-2">TOTAL RECAUDADO ({ocupados.length} pax):</span>
            </td>
            <td className="px-4 py-2.5 text-right font-black font-mono text-emerald-700 text-sm">
              ${totalValor.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default DespachoAsientosTable;
