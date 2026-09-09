import React, { useMemo } from 'react';

export const DespachoAsientosTable = ({ asientos }) => {
  const ocupados = (asientos || []).filter((a) => a.ocupado || a.ocupado === 1 || a.pasajero);

  const totalValor = useMemo(() => {
    return ocupados.reduce((sum, a) => {
      const val = parseFloat(a.pasajero?.precio ?? a.total_boleto_detalle ?? 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [ocupados]);

  if (ocupados.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 mx-auto mb-2">
          <i className="fas fa-chair text-xl" />
        </div>
        <p className="text-xs font-bold text-slate-600">Sin asientos ocupados</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Aún no se han vendido boletos para este viaje</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
            <th className="px-4 py-2.5 text-center w-12">#</th>
            <th className="px-4 py-2.5 text-center w-20">Asiento</th>
            <th className="px-4 py-2.5 text-left">Pasajero</th>
            <th className="px-4 py-2.5 text-left">Identificación</th>
            <th className="px-4 py-2.5 text-left">Destino</th>
            <th className="px-4 py-2.5 text-right w-24">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ocupados.map((a, i) => {
            const p = a.pasajero || {};
            return (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
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
                <td className="px-4 py-2 text-slate-600 font-medium">
                  {p.destino || <span className="text-slate-300">-</span>}
                </td>
                <td className="px-4 py-2 text-right font-black font-mono text-emerald-600 text-[12px]">
                  ${parseFloat(p.precio || 0).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100/90 border-t-2 border-slate-200 text-slate-800 font-extrabold">
            <td colSpan={5} className="px-4 py-2.5 text-right uppercase tracking-wider text-[11px]">
              <span className="text-slate-500 font-bold mr-2">Total Pasajes ({ocupados.length} pax):</span>
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
