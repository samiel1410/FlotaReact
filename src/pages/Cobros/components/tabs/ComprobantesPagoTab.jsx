import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../../config/axios';
import toast from 'react-hot-toast';
import { buildPdfUrl } from '../../../../utils/pdfUrlUtils';

import { PdfPreviewModal } from '../modals/PdfPreviewModal';
import { DetalleGrupoComprobantesModal } from '../modals/DetalleGrupoComprobantesModal';
import { AnularComprobanteModal } from '../modals/AnularComprobanteModal';

export const ComprobantesPagoTab = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    numero_comprobante: '',
    bus_busqueda: '',
    estado: '',
    forma_pago: '',
    fecha_desde: '',
    fecha_hasta: ''
  });
  const [buses, setBuses] = useState([]);
  const [formasPago, setFormasPago] = useState([]);

  // Modales React
  const [detalleGrupoModal, setDetalleGrupoModal] = useState(null);
  const [anularIdModal, setAnularIdModal] = useState(null);
  const [pdfModal, setPdfModal] = useState(null);

  const loadData = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/cobro/listadoComprobanteCobros', { params });
      if (res.data?.success) {
        setData(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar comprobantes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    api.get('/buses/seleccionarBuses', { params: { limit: 200 } }).then(r => {
      if (r.data?.success) setBuses(r.data.data || []);
    }).catch(() => {});
    api.get('/formapago/formapagoSeleccionPaginado', { params: { limit: 50 } }).then(r => {
      if (r.data?.success) setFormasPago(r.data.data || []);
    }).catch(() => {});
  }, []);

  const handlePrintGrupo = (grupo) => {
    const url = buildPdfUrl(`/php/cobros/imprimirComprobanteCobro.php?numero_comprobante=${grupo.numero_comprobante_cobro}`);
    setPdfModal({ url, title: `Comprobante N° ${grupo.numero_comprobante_cobro}` });
  };

  return (
    <div className="space-y-4">
      {/* Modal PDF Preview */}
      {pdfModal && (
        <PdfPreviewModal
          url={pdfModal.url}
          title={pdfModal.title}
          onClose={() => setPdfModal(null)}
        />
      )}

      {/* Modal Detalle Comprobantes */}
      {detalleGrupoModal && (
        <DetalleGrupoComprobantesModal
          grupo={detalleGrupoModal}
          onClose={() => setDetalleGrupoModal(null)}
          onPrint={(g) => {
            setDetalleGrupoModal(null);
            handlePrintGrupo(g);
          }}
        />
      )}

      {/* Modal Anular Comprobante */}
      {anularIdModal && (
        <AnularComprobanteModal
          comprobanteId={anularIdModal}
          onClose={() => setAnularIdModal(null)}
          onSuccess={() => loadData(filtros)}
        />
      )}

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
          <i className="fas fa-filter"></i> Filtros de Comprobantes
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">N° Comprobante</label>
            <input type="text" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5"
              value={filtros.numero_comprobante} onChange={e => setFiltros(f => ({ ...f, numero_comprobante: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Bus</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filtros.bus_busqueda}
              onChange={e => setFiltros(f => ({ ...f, bus_busqueda: e.target.value }))}>
              <option value="">Todos</option>
              {buses.map(b => <option key={b.id_buses} value={b.id_buses}>{b.disco_buses}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Estado</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filtros.estado}
              onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}>
              <option value="">Todos</option>
              <option value="COBRADA">Cobrada</option>
              <option value="ANULADA">Anulada</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Forma de Pago</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filtros.forma_pago}
              onChange={e => setFiltros(f => ({ ...f, forma_pago: e.target.value }))}>
              <option value="">Todas</option>
              {formasPago.map(fp => <option key={fp.id_forma_pago} value={fp.id_forma_pago}>{fp.nombre_forma_pago}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha Desde</label>
            <input type="date" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5"
              value={filtros.fecha_desde} onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha Hasta</label>
            <input type="date" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5"
              value={filtros.fecha_hasta} onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))} />
          </div>
          <div className="flex items-end gap-1">
            <button onClick={() => loadData(filtros)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 flex-1 transition">
              <i className="fas fa-search mr-1"></i> Buscar
            </button>
            <button onClick={() => { setFiltros({ numero_comprobante: '', bus_busqueda: '', estado: '', forma_pago: '', fecha_desde: '', fecha_hasta: '' }); loadData(); }}
              className="px-3 py-1.5 bg-slate-400 text-white text-xs font-bold rounded hover:bg-slate-500 transition">
              <i className="fas fa-eraser"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de comprobantes agrupados */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">N° Comprobante</th>
                <th className="px-3 py-2.5 text-center font-bold text-slate-600">Cant. Cobros</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400">
                  <i className="fas fa-spinner fa-spin text-lg text-indigo-500 mb-2 block"></i> Cargando...
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400">
                  <i className="fas fa-receipt text-2xl mb-2 block"></i> No hay comprobantes registrados
                </td></tr>
              ) : data.map((grupo, i) => {
                const primerComp = grupo.comprobantes?.[0];
                return (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-semibold text-slate-700">Comprobante #{grupo.numero_comprobante_cobro}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{grupo.cantidad}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => setDetalleGrupoModal(grupo)}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 transition-colors">
                          <i className="fas fa-eye"></i> Ver Detalles
                        </button>
                        <button onClick={() => handlePrintGrupo(grupo)}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-colors">
                          <i className="fas fa-print"></i> Imprimir
                        </button>
                        {primerComp?.estado_comprobante_cobro === 'COBRADA' && (
                          <button onClick={() => setAnularIdModal(primerComp.id_comprobante_cobro_retenciones)}
                            className="px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded hover:bg-red-100 border border-red-200 flex items-center gap-1 transition-colors">
                            <i className="fas fa-ban"></i> Anular
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
