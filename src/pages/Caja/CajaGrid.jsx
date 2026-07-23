import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';

export const CajaGrid = ({ data, loading, pagination, setPagination, totalRecords, onAction, idKey = 'id_caja', showIngresoEgreso = false }) => {
  const columns = useMemo(() => [
    { header: '#', accessorKey: 'numero_caja', cell: info => <span className="font-semibold text-slate-800">{info.getValue() ?? '-'}</span> },
    { header: 'FECHA', accessorKey: 'fecha_caja', cell: info => {
      const v = info.getValue();
      if (!v) return <span className="text-slate-400">-</span>;
      const d = new Date(v);
      return <span className="text-slate-600 font-mono text-sm">{d.toLocaleDateString('es-EC', { year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit' })}</span>;
    }},
    { header: 'F. CIERRE', accessorKey: 'fecha_hora_cierre', cell: info => {
      const v = info.getValue();
      if (!v) return <span className="text-slate-400">-</span>;
      const d = new Date(v);
      return <span className="text-slate-600 font-mono text-sm">{d.toLocaleDateString('es-EC', { year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit' })}</span>;
    }},
    { header: 'SUCURSAL', accessorKey: 'nombre_sucursal', cell: info => <span className="text-slate-700 text-sm">{info.getValue() ?? '-'}</span> },
    { header: '($)APERTURA', accessorKey: 'apertura_total_caja', cell: info => <span className="text-emerald-600 font-bold font-mono">${parseFloat(info.getValue() || 0).toFixed(2)}</span> },
    { header: '($)CIERRE', accessorKey: 'cierre_total_caja', cell: info => <span className="text-blue-600 font-bold font-mono">${parseFloat(info.getValue() || 0).toFixed(2)}</span> },
    {
      header: '($)MONTO A TENER',
      id: 'monto_a_tener',
      cell: ({ row }) => {
        const r = row.original;
        const val = r.monto_a_tener ?? (r.cierre_total_caja && parseFloat(r.cierre_total_caja) > 0 ? r.cierre_total_caja : r.apertura_total_caja);
        return <span className="font-mono font-bold text-emerald-600">${parseFloat(val || 0).toFixed(2)}</span>;
      }
    },
    { header: 'CUADRE', accessorKey: 'cuadre_caja', cell: info => {
      const v = info.getValue()?.toString() || '';
      let cls = 'text-slate-600';
      if (v === 'CUADRADO') cls = 'text-emerald-600 font-bold';
      else if (v?.includes('FALTANTE')) cls = 'text-red-600 font-bold';
      else if (v?.includes('SOBRANTE')) cls = 'text-amber-600 font-bold';
      return <span className={`${cls} text-sm font-mono`}>{v || '-'}</span>;
    }},
    { header: 'USUARIO', accessorKey: 'usuario', cell: info => <span className="text-slate-600 text-sm font-medium">{info.getValue() ?? '-'}</span> },
    {
      header: '', accessorKey: 'estado_caja', width: 30,
      cell: info => {
        const v = info.getValue()?.toString();
        const open = v === 'APERTURADA' || v === '1';
        return <i className={`fas fa-circle ${open ? 'text-emerald-500' : 'text-red-500'}`} style={{ fontSize: 10 }}
          title={open ? 'APERTURADA' : 'CERRADA'}></i>;
      }
    },
    {
      header: '', accessorKey: 'estado_solicitud', width: 30,
      cell: info => {
        const v = info.getValue();
        let color = 'text-slate-400';
        let title = 'NINGUNA SOLICITUD';
        if (v == 1) { color = 'text-orange-400'; title = 'SOLICITUD ENVIADA'; }
        else if (v == 2) { color = 'text-emerald-500'; title = 'SOLICITUD APROBADA'; }
        return <i className={`fas fa-info-circle ${color}`} style={{ fontSize: 12 }} title={title}></i>;
      }
    },
    {
      header: 'ACCIONES', id: 'actions',
      cell: ({ row }) => {
        const r = row.original;
        const buttons = [
          { action: 'info-comprobante', icon: 'fa-vote-yea', cls: 'text-indigo-500 hover:bg-indigo-50', title: 'Info Comprobante' },
          { action: 'arqueo', icon: 'fa-file-pdf', cls: 'text-red-500 hover:bg-red-50', title: 'Arqueo PDF' },
          { action: 'comprobantes', icon: 'fa-file-invoice', cls: 'text-red-500 hover:bg-red-50', title: 'Comprobantes' },
          { action: 'editar', icon: 'fa-edit', cls: 'text-amber-500 hover:bg-amber-50', title: 'Editar / Detalle' },
          ...(showIngresoEgreso ? [{ action: 'ingreso-egreso', icon: 'fa-exchange-alt', cls: 'text-emerald-500 hover:bg-emerald-50', title: 'Ingreso/Egreso' }] : []),
          { action: 'cerrar', icon: 'fa-sign-out-alt', cls: 'text-blue-500 hover:bg-blue-50', title: 'Cerrar Caja' },
          { action: 'solicitud', icon: 'fa-share-square', cls: 'text-purple-500 hover:bg-purple-50', title: 'Solicitud' },
          { action: 'impresion-rapida', icon: 'fa-print', cls: 'text-slate-500 hover:bg-slate-50', title: 'Impresión Rápida' },
        ];
        return (
          <div className="flex gap-1">
            {buttons.map(b => (
              <button key={b.action} onClick={() => onAction(b.action, r)} title={b.title}
                className={`w-7 h-7 rounded ${b.cls} flex items-center justify-center transition-colors`}>
                <i className={`fas ${b.icon} text-[10px]`}></i>
              </button>
            ))}
          </div>
        );
      }
    },
  ], [onAction, showIngresoEgreso]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalRecords / pagination.pageSize),
    state: { pagination },
    onPaginationChange: setPagination,
  });

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3">
            <i className="fas fa-circle-notch fa-spin text-blue-600 text-2xl"></i>
            <span className="font-semibold text-slate-700">Cargando registros...</span>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-slate-50 sticky top-0 z-0 border-b border-slate-200">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-blue-50/50 transition-colors group">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-money-bill-wave text-4xl text-slate-300"></i>
                    <p>No se encontraron registros de caja</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between shrink-0">
        <span className="text-sm text-slate-600 font-medium">
          Mostrando {data.length > 0 ? (pagination.pageIndex * pagination.pageSize) + 1 : 0} a {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRecords)} de {totalRecords} registros
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
            className="w-8 h-8 rounded flex items-center justify-center border border-slate-300 text-slate-600 hover:bg-white hover:text-blue-600 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="text-sm font-semibold text-slate-700 px-2">Pág. {table.getState().pagination.pageIndex + 1}</span>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
            className="w-8 h-8 rounded flex items-center justify-center border border-slate-300 text-slate-600 hover:bg-white hover:text-blue-600 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
};
