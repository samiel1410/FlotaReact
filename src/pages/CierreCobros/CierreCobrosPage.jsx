import { useState } from 'react';
import Swal from 'sweetalert2';
import { cobrosService } from '../../services/cobros.service';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;

export const CierreCobrosPage = () => {
  const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reporte, setReporte] = useState(null);

  const buscar = async () => {
    if (!fechaDesde || !fechaHasta) { Swal.fire('Aviso', 'Seleccione ambas fechas', 'warning'); return; }
    setLoading(true);
    setReporte(null);
    try {
      const res = await cobrosService.cierrePorConcepto({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta });
      if (res.success) setReporte(res.data);
      else Swal.fire('Error', res.message, 'error');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
    finally { setLoading(false); }
  };

  const conceptoColor = {
    'MULTA': 'bg-red-50 border-red-200 text-red-800',
    'CREDITO_ADMIN': 'bg-purple-50 border-purple-200 text-purple-800',
    'CUOTA_ADMIN': 'bg-blue-50 border-blue-200 text-blue-800',
    'FONDO_ACCIDENTES': 'bg-orange-50 border-orange-200 text-orange-800',
    'OFICINA_TUMURAHUA': 'bg-teal-50 border-teal-200 text-teal-800',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
        <i className="fas fa-file-invoice text-indigo-600"></i> Cierre de Caja por Concepto
      </h1>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Desde</label>
            <input type="date" className="px-3 py-2 border border-slate-300 rounded-lg text-sm" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Hasta</label>
            <input type="date" className="px-3 py-2 border border-slate-300 rounded-lg text-sm" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
          <button onClick={buscar} disabled={loading}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Consultando...</> : <><i className="fas fa-search"></i> Consultar</>}
          </button>
        </div>
      </div>

      {reporte && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center">
              <span className="font-bold text-slate-700"><i className="fas fa-chart-pie mr-2"></i>Resumen por Concepto</span>
              <span className="text-xs text-slate-500">{fechaDesde} al {fechaHasta}</span>
            </div>

            {reporte.por_deudas?.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-blue-50 text-xs font-bold text-blue-700 uppercase">Deudas Cobradas</div>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-slate-600">Concepto</th>
                      <th className="px-3 py-2 text-center font-bold text-slate-600">Cantidad</th>
                      <th className="px-3 py-2 text-right font-bold text-slate-600">Total Cobrado</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-600">Buses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.por_deudas.map(r => (
                      <tr key={r.id_tipo_deuda} className={`border-b border-slate-100 ${conceptoColor[r.tipo_nombre] || ''}`}>
                        <td className="px-3 py-2 font-bold">{r.tipo_nombre}</td>
                        <td className="px-3 py-2 text-center">{r.cantidad}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">{formatCurrency(r.total_cobrado)}</td>
                        <td className="px-3 py-2 text-slate-500 text-[10px]">{r.buses || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reporte.por_despachos?.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-green-50 text-xs font-bold text-green-700 uppercase border-t">Retenciones por Despacho</div>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-slate-600">Tipo</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-600">Concepto</th>
                      <th className="px-3 py-2 text-center font-bold text-slate-600">Cantidad</th>
                      <th className="px-3 py-2 text-right font-bold text-slate-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.por_despachos.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.tipo === 'accidentes' ? 'bg-orange-100 text-orange-700' : r.tipo === 'tumurahua' ? 'bg-teal-100 text-teal-700' : r.tipo === 'remanente' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'}`}>
                            {r.tipo}
                          </span>
                        </td>
                        <td className="px-3 py-2">{r.tipo_nombre || r.tipo}</td>
                        <td className="px-3 py-2 text-center">{r.cantidad}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">{formatCurrency(r.total_cobrado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {reporte.retenciones_comprobantes && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-bold text-slate-600 uppercase mb-2">Comprobantes de Retención</p>
              <p className="text-sm">Total cobrado en comprobantes: <span className="font-bold text-emerald-600">{formatCurrency(reporte.retenciones_comprobantes.total_retenciones)}</span> ({reporte.retenciones_comprobantes.cantidad} comprobantes)</p>
            </div>
          )}

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 text-center">
            <p className="text-sm text-indigo-700 font-bold uppercase">Total General Cobrado</p>
            <p className="text-3xl font-bold text-indigo-900">{formatCurrency(reporte.total_general)}</p>
          </div>
        </>
      )}
    </div>
  );
};
