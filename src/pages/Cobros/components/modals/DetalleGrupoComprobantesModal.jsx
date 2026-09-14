import { useEffect } from 'react';
import { formatCurrency } from '../../utils/cobrosHelpers';

export const DetalleGrupoComprobantesModal = ({ grupo, onClose, onPrint }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!grupo) return null;
  const comprobantes = grupo.comprobantes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        <div className="bg-slate-800 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <i className="fas fa-file-invoice-dollar text-sm" />
            </span>
            <h3 className="text-white font-bold text-sm">Comprobante N° {grupo.numero_comprobante_cobro} ({comprobantes.length} cobros)</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5 text-left">ID</th>
                  <th className="px-3 py-2.5 text-left">Fecha</th>
                  <th className="px-3 py-2.5 text-right">Monto</th>
                  <th className="px-3 py-2.5 text-left">Bus</th>
                  <th className="px-3 py-2.5 text-left">Forma Pago</th>
                  <th className="px-3 py-2.5 text-left">Concepto</th>
                  <th className="px-3 py-2.5 text-center">Estado</th>
                  <th className="px-3 py-2.5 text-left">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comprobantes.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2.5 font-semibold text-slate-700">#{c.id_comprobante_cobro_retenciones}</td>
                    <td className="px-3 py-2.5 text-slate-500">{c.fecha_emision_comprobante_cobro?.split(' ')[0] || '-'}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{formatCurrency(c.monto_comprobante_cobro)}</td>
                    <td className="px-3 py-2.5 font-bold">{c.disco_buses || '-'}</td>
                    <td className="px-3 py-2.5 text-slate-700">{c.nombre_forma_pago || '-'}</td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">{c.concepto_detalle_comprobante_cobro || '-'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.estado_comprobante_cobro === 'COBRADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {c.estado_comprobante_cobro}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{c.nombre_usuario || ''} {c.apellido_usuario || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={() => onPrint(grupo)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <i className="fas fa-print" />
            <span>Imprimir Comprobante</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
