import React from 'react';
import { formatCurrency, formatFecha } from '../utils/multasConstants';

export const MultasTable = ({
  data,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onPageSizeChange,
  onVerDetalle,
  onVerComprobante,
  onPagar,
  onAnular
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider">
            <tr>
              <th className="px-3.5 py-3 text-center w-14">ID</th>
              <th className="px-3.5 py-3">Socio</th>
              <th className="px-3.5 py-3 text-center">Bus</th>
              <th className="px-3.5 py-3">Concepto / Motivo</th>
              <th className="px-3.5 py-3 text-right">Valor</th>
              <th className="px-3.5 py-3 text-right text-emerald-700">Pagado</th>
              <th className="px-3.5 py-3 text-right text-rose-600">Saldo</th>
              <th className="px-3.5 py-3 text-center">Estado</th>
              <th className="px-3.5 py-3 text-center">Fecha</th>
              <th className="px-3.5 py-3 text-center w-36">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400">
                  <i className="fas fa-spinner fa-spin text-2xl mb-2 block text-rose-500"></i>
                  <span className="font-semibold text-xs">Cargando multas...</span>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400">
                  <i className="fas fa-inbox text-3xl mb-2 block text-slate-300"></i>
                  <p className="font-bold text-xs text-slate-600">No se encontraron multas</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No hay registros con los filtros seleccionados.</p>
                </td>
              </tr>
            ) : (
              data.map((d) => {
                const saldo = parseFloat(d.saldo_pendiente || 0);
                const isPagado = d.estado === 'pagado' || saldo <= 0;
                const isAnulado = d.estado === 'anulado';

                return (
                  <tr key={d.id_deuda} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-3 text-center font-mono font-bold text-slate-500">
                      #{d.id_deuda}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-bold text-slate-800">{d.socio_nombre || 'Socio no asignado'}</div>
                      {d.socio_cedula && <div className="text-[10px] text-slate-400 font-mono">CI: {d.socio_cedula}</div>}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold font-mono text-[11px] border border-slate-200">
                        {d.disco_buses ? `Bus ${d.disco_buses}` : '-'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-semibold text-slate-800">{d.concepto || 'Multa'}</div>
                      {d.observacion && (
                        <div className="text-[10px] text-slate-400 italic truncate max-w-xs" title={d.observacion}>
                          {d.observacion}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-800">
                      {formatCurrency(d.valor_original)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-600">
                      {formatCurrency(d.valor_pagado)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-black text-rose-600">
                      {formatCurrency(d.saldo_pendiente)}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        d.estado === 'pagado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        d.estado === 'parcial' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        d.estado === 'anulado' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {d.estado === 'pagado' ? '✓ Pagado' :
                         d.estado === 'parcial' ? '⏳ Parcial' :
                         d.estado === 'anulado' ? '✕ Anulado' :
                         '● Pendiente'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center font-mono text-slate-500 text-[11px]">
                      {formatFecha(d.fecha_creacion)}
                    </td>

                    {/* Acciones */}
                    <td className="px-3.5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 1. Ver Detalle e Historial */}
                        <button
                          onClick={() => onVerDetalle(d.id_deuda)}
                          className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                          title="Ver desglose e historial de retenciones"
                        >
                          <i className="fas fa-eye text-xs"></i>
                        </button>

                        {/* 2. Ver / Imprimir Comprobante */}
                        <button
                          onClick={() => onVerComprobante(d)}
                          className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                          title="Ver e imprimir comprobante"
                        >
                          <i className="fas fa-receipt text-xs"></i>
                        </button>

                        {/* 3. Pagar en Ventanilla */}
                        {!isPagado && !isAnulado && (
                          <button
                            onClick={() => onPagar(d)}
                            className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                            title="Registrar cobro manual en ventanilla"
                          >
                            <i className="fas fa-dollar-sign text-xs"></i>
                          </button>
                        )}

                        {/* 4. Anular Multa */}
                        {!isAnulado && (
                          <button
                            onClick={() => onAnular(d)}
                            className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                            title="Anular multa"
                          >
                            <i className="fas fa-ban text-xs"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginador */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-semibold">
          <span>Mostrar</span>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>de {total} multas registradas</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 font-bold transition-all"
          >
            <i className="fas fa-chevron-left mr-1"></i> Anterior
          </button>
          <span className="px-3 py-1.5 font-black text-slate-700 bg-white border border-slate-200 rounded-lg">
            Página {page} de {Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <button
            disabled={page * pageSize >= total}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 font-bold transition-all"
          >
            Siguiente <i className="fas fa-chevron-right ml-1"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultasTable;
