import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { GuiaService } from '../../../services/guia.service';
import { api } from '../../../config/axios';
import { useAuth } from '../../../hooks/useAuth';

/**
 * Modal de cobros realizados por guía.
 * Incluye anulación de comprobantes, replicando CobrosRealizados + AnularComprobanteCobro de ExtJS.
 */
export const CobrosRealizadosModal = ({ guia, onClose, onUpdate, isNotaVenta = false }) => {
  const [cobros, setCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const [anularModal, setAnularModal] = useState({ open: false, cobro: null });
  const [anularGuiaModal, setAnularGuiaModal] = useState({ open: false });
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);
  const anulandoRef = useRef(false);
  
  const { user } = useAuth();

  const cargarCobros = async () => {
    setLoading(true);
    try {
      let res;
      if (isNotaVenta) {
        const { GuiaNotaVentaService } = await import('../../../services/guiaNotaVenta.service');
        res = await GuiaNotaVentaService.getComprobantesPorCaja(guia.id_guia);
      } else {
        res = await GuiaService.getComprobantesPorCaja(guia.id_guia);
      }
      
      if (res && res.success) {
        setCobros(Array.isArray(res.data) ? res.data : []);
      } else {
        setCobros([]);
      }
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar los cobros');
      setCobros([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    cargarCobros();
  }, [guia.id_guia]);

  const totalCobrado = cobros.reduce((sum, c) => {
    if (c.estado_comprobante_cobro === 'COBRADA') {
      return sum + parseFloat(c.monto_comprobante_cobro || 0);
    }
    return sum;
  }, 0);

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try {
      return new Date(fecha).toLocaleDateString('es-EC', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch {
      return fecha;
    }
  };

  const abrirAnulacion = (cobro) => {
    if (cobro.estado_comprobante_cobro === 'ANULADA') {
      toast.error('Este comprobante ya se encuentra anulado');
      return;
    }
    setMotivoAnulacion('');
    setAnularModal({ open: true, cobro });
  };

  const confirmarAnulacion = async () => {
    if (anulandoRef.current) return;
    if (!motivoAnulacion.trim()) {
      toast.error('Debe ingresar el motivo de anulación');
      return;
    }
    anulandoRef.current = true;
    setAnulando(true);
    try {
      let res;
      if (isNotaVenta) {
        const { GuiaNotaVentaService } = await import('../../../services/guiaNotaVenta.service');
        res = await GuiaNotaVentaService.anularComprobante(anularModal.cobro.id_comprobante_cobro, motivoAnulacion.toUpperCase());
      } else {
        res = await api.post('/comprobantecobro/anularComprobante', {
          id: anularModal.cobro.id_comprobante_cobro,
          motivoAnulacion: motivoAnulacion.toUpperCase()
        });
      }
      
      const respuesta = isNotaVenta ? res : (res?.data || res);

      if (respuesta && respuesta.success) {
        toast.success('Comprobante anulado correctamente');
        setAnularModal({ open: false, cobro: null });
        // Reload cobros
        fetchedRef.current = false;
        await cargarCobros();
        fetchedRef.current = true;
        if (onUpdate) onUpdate();
      } else {
        toast.error(respuesta?.message || 'No se pudo anular el comprobante');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al anular el comprobante');
    } finally {
      anulandoRef.current = false;
      setAnulando(false);
    }
  };

  const confirmarAnulacionGuia = async () => {
    if (anulandoRef.current) return;
    if (!motivoAnulacion.trim()) {
      toast.error('Debe ingresar el motivo de anulación de la guía');
      return;
    }
    anulandoRef.current = true;
    setAnulando(true);
    try {
      const idUsuario = user?.id_usuario || 0;
      // Replicando onanularTodoGuia -> Anulacion -> anularadministrador
      let res;
      if (isNotaVenta) {
        const { GuiaNotaVentaService } = await import('../../../services/guiaNotaVenta.service');
        res = await GuiaNotaVentaService.anularAdministrador(guia.id_guia, idUsuario, motivoAnulacion.toUpperCase());
      } else {
        res = await GuiaService.anularAdministrador(guia.id_guia, idUsuario, motivoAnulacion.toUpperCase());
      }
      
      if (res && res.success) {
        toast.success('Guía anulada correctamente');
        setAnularGuiaModal({ open: false });
        if (onUpdate) onUpdate();
        onClose(); // Cerrar el modal principal porque la guía ya fue anulada
      } else {
        toast.error(res?.message || 'No se pudo anular la guía');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al anular la guía completa');
    } finally {
      anulandoRef.current = false;
      setAnulando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white text-lg font-bold flex items-center gap-2">
              <i className="fas fa-receipt text-blue-400"></i> COBROS REALIZADOS
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Guía <strong className="text-slate-300">
                #{guia.numero_guia_final || guia.numero_guia || guia.id_guia}
              </strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setMotivoAnulacion(''); setAnularGuiaModal({ open: true }); }}
              className="px-4 py-1.5 bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-2 border border-red-500/30"
              title="Anular Toda la Guía"
            >
              <i className="fas fa-ban"></i> Anular Guía
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors ml-2">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <i className="fas fa-spinner fa-spin text-2xl mr-3 text-blue-500"></i>
              <span className="font-medium">Cargando cobros...</span>
            </div>
          )}

          {!loading && cobros.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <i className="fas fa-inbox text-4xl mb-3"></i>
              <p className="font-medium">No se encontraron cobros para esta guía.</p>
            </div>
          )}

          {!loading && cobros.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Fecha</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Forma de Pago</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Observación</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cobros.map((c, i) => {
                    const esAnulada = c.estado_comprobante_cobro === 'ANULADA';
                    return (
                      <tr key={c.id_comprobante_cobro || i}
                        className={`transition-colors ${esAnulada ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{i + 1}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatFecha(c.fecha_emision_comprobante_cobro)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${esAnulada ? 'text-slate-400 line-through' : 'text-green-700'}`}>
                          ${parseFloat(c.monto_comprobante_cobro || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{c.nombre_forma_pago || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            esAnulada
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {c.estado_comprobante_cobro || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                          {c.observacion_comprobante_cobro || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {!esAnulada && (
                            <button
                              onClick={() => abrirAnulacion(c)}
                              title="Anular comprobante"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
                            >
                              <i className="fas fa-ban"></i> Anular
                            </button>
                          )}
                          {esAnulada && (
                            <span className="text-xs text-slate-400 italic">Anulado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer con totales */}
        {!loading && cobros.length > 0 && (
          <div className="flex-shrink-0 border-t border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500">{cobros.length} cobro(s) registrado(s)</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600">Total cobrado (vigente):</span>
              <span className="text-lg font-bold text-green-700">${totalCobrado.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex-shrink-0 border-t border-slate-100 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-md font-medium transition-colors text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Sub-modal de Anulación — idéntico a AnularComprobanteCobro.js de ExtJS */}
      {anularModal.open && anularModal.cobro && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-700 px-5 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <i className="fas fa-ban"></i> ANULAR COMPROBANTE
              </h3>
              <button
                onClick={() => setAnularModal({ open: false, cobro: null })}
                className="text-red-200 hover:text-white transition-colors"
                disabled={anulando}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <p>Está por anular el comprobante de cobro por:</p>
                <p className="font-bold text-base mt-1">
                  ${parseFloat(anularModal.cobro.monto_comprobante_cobro || 0).toFixed(2)} — {anularModal.cobro.nombre_forma_pago}
                </p>
                <p className="text-xs mt-1 text-red-500">Esta acción no se puede deshacer.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Motivo de Anulación <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-400 uppercase resize-none"
                  placeholder="Ingrese el motivo de la anulación..."
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  disabled={anulando}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAnularModal({ open: false, cobro: null })}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md font-medium text-sm transition-colors"
                  disabled={anulando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarAnulacion}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium text-sm shadow-sm transition-colors flex items-center gap-2"
                  disabled={anulando}
                >
                  {anulando ? (
                    <><i className="fas fa-spinner fa-spin"></i> Anulando...</>
                  ) : (
                    <><i className="fas fa-ban"></i> Confirmar Anulación</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal de Anulación de TODA LA GUIA */}
      {anularGuiaModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-800 px-5 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <i className="fas fa-radiation"></i> ANULAR GUÍA COMPLETA
              </h3>
              <button
                onClick={() => setAnularGuiaModal({ open: false })}
                className="text-red-200 hover:text-white transition-colors"
                disabled={anulando}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <p>Está a punto de anular la guía completa:</p>
                <p className="font-bold text-base mt-1">
                  Guía #{guia.numero_guia_final || guia.numero_guia || guia.id_guia}
                </p>
                <p className="text-xs mt-2 font-bold text-red-600 bg-red-100 p-2 rounded">
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  Esta acción anulará la guía y todos los registros asociados definitivamente.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Motivo de Anulación de la Guía <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-400 uppercase resize-none"
                  placeholder="Ingrese el motivo por el cual anula la guía..."
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  disabled={anulando}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAnularGuiaModal({ open: false })}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md font-medium text-sm transition-colors"
                  disabled={anulando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarAnulacionGuia}
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
                  disabled={anulando}
                >
                  {anulando ? (
                    <><i className="fas fa-spinner fa-spin"></i> Anulando...</>
                  ) : (
                    <><i className="fas fa-skull-crossbones"></i> Confirmar</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
