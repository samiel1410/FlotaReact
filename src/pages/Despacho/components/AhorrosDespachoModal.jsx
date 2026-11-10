import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { despachoService } from '../../../services/despacho.service';
import { DateRangePicker } from '../../../components/common/DateRangePicker';

const PAGE_SIZE = 25;
const money = (valor) => `$${(Number(valor) || 0).toFixed(2)}`;
const inputCls = 'w-full h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none bg-white';
const labelCls = 'block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1';

const formatFecha = (fecha) => {
  if (!fecha) return '-';
  const texto = String(fecha);
  return texto.includes('T') ? texto.slice(0, 10) : texto.split(' ')[0];
};

const renderEstadoCaja = (estado) => {
  const valor = String(estado || '').toUpperCase();
  if (valor === 'EMITIDA' || valor === 'APROBADA') {
    return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">{valor}</span>;
  }
  if (valor === 'PENDIENTE') {
    return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800">{valor}</span>;
  }
  if (valor === 'ANULADA' || valor === 'ANULADO' || valor === 'CANCELADO') {
    return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-700">{valor}</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-500">SIN CAJA</span>;
};

/**
 * Listado de los ahorros registrados al finalizar despachos.
 * Cada fila corresponde al egreso generado en la caja del usuario.
 */
export const AhorrosDespachoModal = ({ onClose }) => {
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalAhorro, setTotalAhorro] = useState(0);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', numero: '' });

  const cargar = useCallback(async (pageNum = 1, filtrosActuales = null) => {
    setLoading(true);
    try {
      const f = filtrosActuales || filtros;
      const res = await despachoService.listarAhorros({
        limit: PAGE_SIZE,
        page: pageNum,
        desde: f.desde || '',
        hasta: f.hasta || '',
        numero: f.numero || ''
      });
      if (res?.success) {
        setFilas(res.data || []);
        setTotal(res.total || 0);
        setTotalAhorro(res.total_ahorro || 0);
        setPage(pageNum);
      } else {
        setFilas([]);
        setTotal(0);
        setTotalAhorro(0);
      }
    } catch (err) {
      console.error('Error cargando ahorros:', err);
      toast.error('Error al cargar el listado de ahorros');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(1); }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleLimpiar = () => {
    const limpio = { desde: '', hasta: '', numero: '' };
    setFiltros(limpio);
    cargar(1, limpio);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-white font-bold flex items-center gap-2">
            <i className="fas fa-piggy-bank text-emerald-400"></i>
            AHORROS DE DESPACHOS
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {/* Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Despachos con ahorro</div>
              <div className="text-lg font-black text-slate-800">{total}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Total ahorrado</div>
              <div className="text-lg font-black text-emerald-700">{money(totalAhorro)}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registros visibles</div>
              <div className="text-lg font-black text-slate-800">{filas.length}</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-4">
              <label className={labelCls}>Rango de fechas de finalización</label>
              <DateRangePicker
                startDate={filtros.desde}
                endDate={filtros.hasta}
                onChange={({ startDateStr, endDateStr }) => {
                  setFiltros(f => ({ ...f, desde: startDateStr, hasta: endDateStr }));
                }}
              />
            </div>
            <div className="lg:col-span-5">
              <label className={labelCls}>N° Despacho</label>
              <input
                type="text"
                value={filtros.numero}
                placeholder="Buscar por número de despacho..."
                onChange={e => setFiltros(f => ({ ...f, numero: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') cargar(1, filtros); }}
                className={inputCls}
              />
            </div>
            <div className="lg:col-span-3 flex gap-2">
              <button
                onClick={() => cargar(1, filtros)}
                className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest shadow-sm"
              >
                <i className="fas fa-search text-xs"></i> Buscar
              </button>
              <button
                onClick={handleLimpiar}
                className="h-9 px-3 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest"
              >
                <i className="fas fa-eraser text-xs"></i>
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                    <th className="px-3 py-2.5 text-center w-20">Despacho</th>
                    <th className="px-3 py-2.5 text-center w-24">Finalizado</th>
                    <th className="px-3 py-2.5 text-left">Usuario que finalizó</th>
                    <th className="px-3 py-2.5 text-left">Transporte / Destino</th>
                    <th className="px-3 py-2.5 text-right w-24">Base guías</th>
                    <th className="px-3 py-2.5 text-center w-28">Tipo / Valor</th>
                    <th className="px-3 py-2.5 text-right w-24">Ahorro</th>
                    <th className="px-3 py-2.5 text-center w-24">Estado caja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-slate-400">
                        <i className="fas fa-spinner fa-spin text-indigo-600 text-lg"></i>
                        <div className="font-semibold mt-2 text-xs">Cargando ahorros...</div>
                      </td>
                    </tr>
                  ) : filas.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-slate-400">
                        <i className="fas fa-piggy-bank text-3xl block mb-2 text-slate-300"></i>
                        <p className="font-bold text-slate-600 text-sm">No hay ahorros registrados</p>
                        <p className="text-xs text-slate-400 mt-0.5">Los ahorros se registran al finalizar un despacho</p>
                      </td>
                    </tr>
                  ) : (
                    filas.map((fila) => (
                      <tr key={`${fila.id_despacho_maestro}-${fila.id_caja_detalle || 0}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 text-center font-bold text-slate-700 font-mono">
                          #{fila.numero_despacho_maestro || fila.id_despacho_maestro}
                        </td>
                        <td className="px-3 py-2.5 text-center text-slate-600 whitespace-nowrap">
                          {formatFecha(fila.fecha_finalizacion_despacho)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {fila.usuario_finaliza || fila.nombre_oficinista || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          <div className="font-semibold text-slate-700">{fila.nombre_bus || fila.tipo_despacho || '-'}</div>
                          <div className="text-[10px] text-slate-400">{fila.nombre_destino || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{money(fila.base_ahorro_despacho_maestro)}</td>
                        <td className="px-3 py-2.5 text-center text-slate-600">
                          {fila.tipo_ahorro_despacho_maestro === 'PORCENTAJE'
                            ? `${fila.valor_ahorro_despacho_maestro ?? 0} %`
                            : money(fila.valor_ahorro_despacho_maestro)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-emerald-700">
                          {money(fila.ahorro_despacho_maestro)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {renderEstadoCaja(fila.estado_caja_detalle)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-3 py-2 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
                <span className="text-[11px] text-slate-500 font-medium">
                  Página <span className="font-bold text-slate-700">{page}</span> de <span className="font-bold text-slate-700">{totalPages}</span>
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => page > 1 && cargar(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <i className="fas fa-chevron-left mr-1"></i> Anterior
                  </button>
                  <button
                    onClick={() => page < totalPages && cargar(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Siguiente <i className="fas fa-chevron-right ml-1"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-[10px] text-slate-500 font-semibold">
            El ahorro genera un EGRESO en la caja de encomiendas del usuario.
          </span>
          <button
            onClick={onClose}
            className="h-9 px-4 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AhorrosDespachoModal;
