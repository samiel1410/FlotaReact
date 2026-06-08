import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';
import { GuiaService } from '../../../services/guia.service';

/**
 * Modal para ver el historial de seguimiento (Tracking) de una guía.
 * Recrea la funcionalidad de SeguimientoModal de ExtJS.
 */
export const SeguimientoGuiaModal = ({ guia, onClose }) => {
  const [seguimientos, setSeguimientos] = useState([]);
  const [guiaInfo, setGuiaInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Evitar doble petición en StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const load = async () => {
      setLoading(true);
      setLoadingInfo(true);
      try {
        // 1. Obtener Info general de la guía
        const infoRes = await GuiaService.informacionGuia(guia.id_guia);
        if (infoRes) {
          setGuiaInfo(infoRes.data || infoRes);
        }

        // 2. Obtener Historial de Seguimiento
        const segRes = await api.get(`/seguimiento/seguimientosxguiaselect?id=${guia.id_guia}&limit=100&page=1`);
        if (segRes && segRes.data && segRes.data.success) {
          setSeguimientos(Array.isArray(segRes.data.data) ? segRes.data.data : []);
        } else {
          setSeguimientos([]);
        }
      } catch (err) {
        console.error(err);
        toast.error('No se pudo cargar la información de seguimiento');
        setSeguimientos([]);
      } finally {
        setLoading(false);
        setLoadingInfo(false);
      }
    };
    load();
  }, [guia.id_guia]);

  const getEstadoBadge = (value) => {
    // ExtJS render: 1: EN OFICINA, 2: POR ENTREGAR, 3: PENDIENTE ANULAR, 8: EN BUS, 7: VIAJANDO, 4: ANULADO, 9: CANCELADO, 10: ENTREGADO
    const val = String(value);
    if (val === '1') return { label: 'EN OFICINA', color: 'bg-slate-100 text-slate-700' };
    if (val === '2') return { label: 'POR ENTREGAR', color: 'bg-yellow-100 text-yellow-700' };
    if (val === '3') return { label: 'PEND. ANULAR', color: 'bg-orange-100 text-orange-700' };
    if (val === '8') return { label: 'EN BUS', color: 'bg-indigo-100 text-indigo-700' };
    if (val === '7') return { label: 'VIAJANDO', color: 'bg-blue-100 text-blue-700' };
    if (val === '4') return { label: 'ANULADO', color: 'bg-red-100 text-red-700' };
    if (val === '9') return { label: 'CANCELADO', color: 'bg-red-100 text-red-700' };
    if (val === '10') return { label: 'ENTREGADO', color: 'bg-emerald-100 text-emerald-700' };
    return { label: value || '-', color: 'bg-slate-100 text-slate-600' };
  };

  const getSemaforoGuia = (val) => {
    if (val === 0) return { label: 'VIAJANDO', color: 'bg-blue-100 text-blue-800' };
    if (val === 1) return { label: 'LLEGÓ', color: 'bg-emerald-100 text-emerald-800' };
    return { label: 'PENDIENTE', color: 'bg-yellow-100 text-yellow-800' };
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try {
      const d = new Date(fecha);
      return d.toLocaleDateString('es-EC') + ' ' + d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return fecha;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white text-lg font-bold flex items-center gap-2">
              <i className="fas fa-route text-blue-400"></i> SEGUIMIENTO DE GUÍA
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Guía <strong className="text-slate-300">#{guia.numero_guia_final || guia.numero_guia || guia.id_guia}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {loadingInfo ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <i className="fas fa-spinner fa-spin text-2xl mr-3 text-blue-500"></i>
              <span className="font-medium">Cargando información...</span>
            </div>
          ) : (
            <>
              {/* Información General de la Guía */}
              {guiaInfo && (
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex-shrink-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Estado Actual</p>
                      <p className="mt-1">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${getSemaforoGuia(guiaInfo.estado_guia_seguimiento).color}`}>
                          {getSemaforoGuia(guiaInfo.estado_guia_seguimiento).label}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Origen</p>
                      <p className="mt-1 font-medium text-slate-700">{guiaInfo.origen_guia || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Destino</p>
                      <p className="mt-1 font-medium text-slate-700">{guiaInfo.destino_guia || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Total</p>
                      <p className="mt-1 font-mono font-bold text-slate-800">${parseFloat(guiaInfo.total_guia || 0).toFixed(2)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Remitente</p>
                      <p className="mt-1 font-medium text-slate-700">{guiaInfo.nombre_cliente_remitente || '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Destinatario</p>
                      <p className="mt-1 font-medium text-slate-700">{guiaInfo.nombre_cliente_receptor || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Historial de Seguimientos */}
              <div className="p-6 flex-1">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <i className="fas fa-history text-slate-400"></i> Historial de Movimientos
                </h3>

                {loading ? (
                  <div className="text-center py-8 text-slate-500"><i className="fas fa-spinner fa-spin"></i> Cargando historial...</div>
                ) : seguimientos.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <i className="fas fa-truck-loading text-3xl mb-2 text-slate-300"></i>
                    <p>No hay historial de seguimiento para esta guía.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Fecha</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Estado</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Oficina</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Bus</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Usuario</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Observación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {seguimientos.map((s, i) => {
                          const badge = getEstadoBadge(s.estado_seguimiento);
                          return (
                            <tr key={s.id_seguimiento || i} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                                {formatFecha(s.fecha_creacion_seguimiento)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${badge.color}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-700 font-medium">{s.ubicacion_seguimiento || '-'}</td>
                              <td className="px-4 py-3 text-slate-600">{s.bus_seguimiento || '-'}</td>
                              <td className="px-4 py-3 text-slate-600 text-xs">{s.usuario || '-'}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs italic">{s.observacion_seguimiento || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-100 px-6 py-3 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-md font-medium transition-colors text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
