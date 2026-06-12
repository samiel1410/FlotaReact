import { useState, useEffect } from 'react';
import { BoleteriaService } from '../../../services/boleteria.service';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

export const CambiarFechaViajeModal = ({ isOpen, onClose, boleto, onCambioExitoso }) => {
  const [fecha, setFecha] = useState('');
  const [viajes, setViajes] = useState([]);
  const [loadingViajes, setLoadingViajes] = useState(false);
  const [idViajeSeleccionado, setIdViajeSeleccionado] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Inicializar fecha con la fecha actual
  useEffect(() => {
    if (isOpen) {
      const hoy = new Date();
      setFecha(`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`);
      setIdViajeSeleccionado('');
      setViajes([]);
    }
  }, [isOpen]);

  // Buscar viajes disponibles al cambiar la fecha
  const buscarViajes = async () => {
    if (!fecha) {
      toast.error('Seleccione una fecha');
      return;
    }
    setLoadingViajes(true);
    try {
      const res = await BoleteriaService.getViajesDisponibles({ fecha });
      if (res.success && res.data) {
        // Filtrar viajes que NO sean el mismo viaje actual del boleto
        const viajesFiltrados = res.data.filter(v => String(v.id_viajes) !== String(boleto?.id_fkviaje_boleto));
        setViajes(viajesFiltrados);
        if (viajesFiltrados.length === 0) {
          toast('No hay viajes disponibles diferentes al actual en esta fecha');
        }
      } else {
        setViajes([]);
      }
    } catch (e) {
      console.error('Error buscando viajes:', e);
      toast.error('Error al buscar viajes');
    } finally {
      setLoadingViajes(false);
    }
  };

  const handleConfirmar = async () => {
    if (!idViajeSeleccionado) {
      toast.error('Seleccione un viaje');
      return;
    }
    if (!boleto?.id_boleto) {
      toast.error('Boleto no válido');
      return;
    }

    const viajeSel = viajes.find(v => String(v.id_viajes) === idViajeSeleccionado);
    const confirm = await Swal.fire({
      title: '¿Cambiar fecha de viaje?',
      html: `
        <div style="text-align:left;font-size:13px">
          <p><strong>Boleto #:</strong> ${boleto.numero_boleto || boleto.id_boleto}</p>
          <p><strong>Pasajero:</strong> ${boleto.nombres_boleto || ''}</p>
          <hr style="margin:8px 0"/>
          <p><strong>Nuevo Viaje:</strong></p>
          <p>📅 ${fecha}</p>
          <p>⏰ ${viajeSel?.hora_origen_salida?.substring(0,5) || viajeSel?.hora || ''}</p>
          <p>🚌 Bus: ${viajeSel?.bus_disco || viajeSel?.bus_codigo || ''}</p>
          <p>🛣️ ${viajeSel?.nombre_rutas || viajeSel?.nombre_aux || ''}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar fecha',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#035f2c',
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await BoleteriaService.cambiarFechaViaje(boleto.id_boleto, idViajeSeleccionado);
      if (res.success) {
        toast.success('Fecha de viaje actualizada correctamente');
        onCambioExitoso?.(res.data);
        onClose();
      } else {
        toast.error(res.message || 'Error al cambiar la fecha');
      }
    } catch (e) {
      console.error('Error cambiando fecha:', e);
      const msg = e.response?.data?.message || e.message || 'Error al cambiar la fecha';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', borderRadius: 8, width: 500, maxWidth: '90%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: '#0a365d', color: 'white', padding: '12px 16px',
          fontSize: 15, fontWeight: 'bold',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>
            <i className="fas fa-calendar-alt" style={{ marginRight: 8 }}></i>
            Cambiar Fecha de Viaje
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'white',
            cursor: 'pointer', fontSize: 18
          }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Info del boleto */}
          {boleto && (
            <div style={{
              background: '#f8fafc', borderRadius: 6, padding: 10,
              border: '1px solid #e2e8f0', fontSize: 12
            }}>
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                <i className="fas fa-ticket-alt" style={{ marginRight: 6, color: '#0a365d' }}></i>
                Boleto #{boleto.numero_boleto || boleto.id_boleto}
              </div>
              <div style={{ color: '#475569', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span><strong>Pasajero:</strong> {boleto.nombres_boleto || '-'}</span>
                <span><strong>Bus:</strong> {boleto.disco_buses || '-'}</span>
                <span><strong>Ruta:</strong> {boleto.nombre_rutas || '-'}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#e67e22', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: 4 }}>
                <i className="fas fa-info-circle" style={{ marginRight: 4 }}></i>
                Seleccione un viaje de la <strong>misma ruta</strong> para cambiar la fecha.
                Solo el usuario que vendió este boleto puede realizar este cambio.
              </div>
            </div>
          )}

          {/* Busqueda de nueva fecha */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{
                fontSize: 11, fontWeight: 600, color: '#475569',
                display: 'block', marginBottom: 4
              }}>
                Nueva Fecha de Viaje:
              </label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                style={{
                  width: '100%', padding: '6px 8px',
                  border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12
                }}
              />
            </div>
            <button
              onClick={buscarViajes}
              disabled={loadingViajes}
              style={{
                background: '#0a365d', color: 'white', fontWeight: 'bold',
                border: 'none', borderRadius: 4, padding: '7px 14px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, whiteSpace: 'nowrap', height: 32
              }}
            >
              {loadingViajes ? (
                <><i className="fas fa-spinner fa-spin"></i> Buscando...</>
              ) : (
                <><i className="fas fa-search"></i> Buscar Viajes</>
              )}
            </button>
          </div>

          {/* Lista de viajes disponibles */}
          <div style={{
            border: '1px solid #e2e8f0', borderRadius: 6,
            minHeight: 80, maxHeight: 250, overflowY: 'auto',
            background: '#f8fafc'
          }}>
            {viajes.length === 0 ? (
              <div style={{
                padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12
              }}>
                <i className="fas fa-bus" style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}></i>
                <p>Seleccione una fecha y busque viajes disponibles</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {viajes.map((v, idx) => (
                  <label
                    key={v.id_viajes || idx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      cursor: 'pointer', fontSize: 12,
                      background: idViajeSeleccionado === String(v.id_viajes) ? '#dbeafe' : (idx % 2 === 0 ? 'white' : '#f8fafc'),
                      borderBottom: idx < viajes.length - 1 ? '1px solid #e2e8f0' : 'none',
                      transition: 'background 0.2s'
                    }}
                  >
                    <input
                      type="radio"
                      name="viaje"
                      value={v.id_viajes}
                      checked={idViajeSeleccionado === String(v.id_viajes)}
                      onChange={e => setIdViajeSeleccionado(e.target.value)}
                      style={{ margin: 0, width: 14, height: 14 }}
                    />
                    <div style={{ flex: 1, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600, color: '#0a365d' }}>
                        {v.hora_origen_salida?.substring(0,5) || v.hora || v.hora_salida}
                      </span>
                      <span style={{ color: '#475569', marginLeft: 8 }}>
                        {v.nombre_rutas || v.nombre_aux || ''}
                      </span>
                      <span style={{
                        marginLeft: 8, background: '#e2e8f0',
                        padding: '1px 6px', borderRadius: 3, fontSize: 10,
                        fontWeight: 600, color: '#475569'
                      }}>
                        Bus {v.bus_disco || v.bus_codigo || ''}
                      </span>
                      <span style={{
                        marginLeft: 4, fontSize: 10, fontWeight: 600,
                        color: v.asientos_libres > 0 ? '#059669' : '#dc2626'
                      }}>
                        {v.asientos_libres || 0} libres
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '10px 16px', borderTop: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px', border: '1px solid #cbd5e1',
              borderRadius: 4, background: 'white', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: '#475569'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={submitting || !idViajeSeleccionado}
            style={{
              padding: '7px 16px', border: 'none', borderRadius: 4,
              background: submitting || !idViajeSeleccionado ? '#94a3b8' : '#035f2c',
              color: 'white', cursor: submitting || !idViajeSeleccionado ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 'bold',
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            {submitting ? (
              <><i className="fas fa-spinner fa-spin"></i> Cambiando...</>
            ) : (
              <><i className="fas fa-check"></i> Cambiar Fecha</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
