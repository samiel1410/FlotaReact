import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export const ViajesSelector = ({
  fechaViaje,
  onFechaChange,
  onBuscarViajes,
  loadingViajes,
  viajesDisponibles = [],
  idViajeSeleccionado,
  onSelectViaje
}) => {
  const [hoveredViaje, setHoveredViaje] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (v, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6
    });
    setHoveredViaje(v);
  };

  const handleMouseLeave = () => {
    setHoveredViaje(null);
  };

  return (
    <>
      {/* DATE FILTER SECTION */}
      <div style={{
        background: 'white', borderRadius: 4, padding: '5px 8px',
        border: '1px solid #ddd', marginBottom: 5,
        display: 'flex', alignItems: 'center', gap: 6
      }}>
        <i className="fas fa-calendar-alt" style={{ fontSize: 14, color: '#0a365d' }}></i>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Fecha de Viaje:
          </label>
          <input
            type="date"
            value={fechaViaje}
            onChange={e => onFechaChange(e.target.value)}
            style={{
              flex: 1, padding: '4px 6px', border: '1px solid #cbd5e1',
              borderRadius: 4, fontSize: 11
            }}
          />
          <button
            onClick={() => onBuscarViajes && onBuscarViajes()}
            disabled={loadingViajes}
            style={{
              background: '#0a365d', color: 'white', fontWeight: 'bold',
              border: 'none', borderRadius: 4, padding: '5px 12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13
            }}
          >
            {loadingViajes ? (
              <><i className="fas fa-spinner fa-spin"></i> Buscando...</>
            ) : (
              <><i className="fas fa-search"></i> Buscar Viajes</>
            )}
          </button>
        </div>
      </div>

      {/* DYNAMIC BUTTONS AREA (viajes disponibles) */}
      <div style={{
        background: '#ececec', borderRadius: 4, padding: '4px',
        marginBottom: 5, minHeight: 36,
        display: 'flex', gap: 4, overflowX: 'auto', flexWrap: 'nowrap'
      }}>
        {viajesDisponibles.length === 0 ? (
          <div style={{ padding: '8px', color: '#94a3b8', fontSize: 13, width: '100%', textAlign: 'center' }}>
            <i className="fas fa-bus"></i> Seleccione fecha y busque viajes disponibles
          </div>
        ) : (
          viajesDisponibles.map((v, idx) => (
            <button
              key={v?.id_viajes ?? `viaje-btn-${idx}`}
              onClick={() => onSelectViaje(v)}
              onMouseEnter={(e) => handleMouseEnter(v, e)}
              onMouseLeave={handleMouseLeave}
              style={{
                flex: '0 0 auto', padding: '4px 10px', border: 'none', borderRadius: 3,
                cursor: 'pointer', fontWeight: 'bold', fontSize: 13, whiteSpace: 'nowrap',
                background: String(idViajeSeleccionado) === String(v.id_viajes)
                  ? (v.es_viaje_extra === 1 ? '#d97706' : '#0a365d')
                  : (v.es_viaje_extra === 1 ? '#fef3c7' : 'white'),
                color: String(idViajeSeleccionado) === String(v.id_viajes)
                  ? 'white'
                  : (v.es_viaje_extra === 1 ? '#92400e' : '#475569'),
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                borderLeft: v.es_viaje_extra === 1 ? '3px solid #f59e0b' : '3px solid transparent',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                transition: 'all 0.15s ease'
              }}
            >
              {v.es_viaje_extra === 1 && (
                <span title="Viaje Extra" style={{ marginRight: 2 }}>
                  <i className="fas fa-star" style={{ fontSize: 9, color: String(idViajeSeleccionado) === String(v.id_viajes) ? '#fde68a' : '#f59e0b' }}></i>
                </span>
              )}
              {v.es_despachado_origen && (
                <span
                  style={{
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: String(idViajeSeleccionado) === String(v.id_viajes) ? '#22c55e' : '#16a34a',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <i className="fas fa-paper-plane" style={{ fontSize: 8 }}></i>
                  En ruta
                </span>
              )}
              <i className="fas fa-clock" style={{ fontSize: 12 }}></i>
              <span>
                {v.hora_salida_parada ? v.hora_salida_parada.substring(0, 5) : (v.hora_origen_salida ? v.hora_origen_salida.substring(0, 5) : (v.hora || v.hora_salida || ''))}
              </span>
              {v.es_despachado_origen && v.minutos_aplicados > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.85,
                    color: String(idViajeSeleccionado) === String(v.id_viajes) ? '#a7f3d0' : '#059669',
                    fontWeight: 600
                  }}
                >
                  (+{v.minutos_aplicados}m)
                </span>
              )}
              <span style={{ opacity: 0.75, fontWeight: 500 }}>
                {v.nombre_rutas || v.nombre_aux}
              </span>
              <span style={{ opacity: 0.75, fontWeight: 600 }}>
                {v.bus_disco || v.bus_codigo}
              </span>
              <span style={{
                padding: '1px 5px', borderRadius: 2,
                background: String(idViajeSeleccionado) === String(v.id_viajes) ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                fontSize: 11
              }}>
                {v.asientos_libres || 0} libres
              </span>
            </button>
          ))
        )}
      </div>

      {/* RICH FLOATING TOOLTIP (LIGHT THEME) */}
      {hoveredViaje && createPortal(
        <div
          style={{
            position: 'fixed',
            top: tooltipPos.y,
            left: Math.max(160, Math.min(window.innerWidth - 170, tooltipPos.x)),
            transform: 'translateX(-50%)',
            zIndex: 99999,
            pointerEvents: 'none',
            background: '#ffffff',
            color: '#1e293b',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08)',
            border: '1px solid #cbd5e1',
            minWidth: 280,
            maxWidth: 350
          }}
        >
          {/* TOOLTIP HEADER */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: '#0a365d' }}>
                N° VIAJE #{hoveredViaje.id_viajes}
              </span>
              {hoveredViaje.es_viaje_extra === 1 && (
                <span style={{
                  background: '#fef3c7', color: '#92400e', fontSize: 10,
                  padding: '1px 6px', borderRadius: 3, fontWeight: 700,
                  border: '1px solid #fde68a'
                }}>
                  ★ Extra
                </span>
              )}
            </div>
            <div>
              {hoveredViaje.es_despachado_origen ? (
                <span style={{
                  background: '#dcfce7', color: '#166534', fontSize: 10,
                  padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                  border: '1px solid #bbf7d0',
                  display: 'inline-flex', alignItems: 'center', gap: 4
                }}>
                  <i className="fas fa-check-circle"></i> Despachado
                </span>
              ) : (
                <span style={{
                  background: '#f1f5f9', color: '#475569', fontSize: 10,
                  padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                  border: '1px solid #e2e8f0',
                  display: 'inline-flex', alignItems: 'center', gap: 4
                }}>
                  <i className="fas fa-clock"></i> Pendiente salida
                </span>
              )}
            </div>
          </div>

          {/* TOOLTIP BODY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: '#64748b' }}>🗺️ Ruta:</span>
              <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                {hoveredViaje.nombre_rutas || hoveredViaje.nombre_aux || 'N/A'}
              </span>
            </div>

            {hoveredViaje.lugar_destino && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>📍 Destino:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {hoveredViaje.lugar_destino}
                </span>
              </div>
            )}

            <div style={{
              background: '#f8fafc', borderRadius: 6, padding: '7px 9px',
              marginTop: 3, display: 'flex', flexDirection: 'column', gap: 4,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Salida Programada Origen:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {hoveredViaje.hora_origen_salida ? hoveredViaje.hora_origen_salida.substring(0, 5) : (hoveredViaje.hora || 'N/A')}
                </span>
              </div>

              {hoveredViaje.minutos_offset_parada > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Tiempo a esta parada:</span>
                  <span style={{ fontWeight: 700, color: hoveredViaje.es_despachado_origen ? '#16a34a' : '#d97706' }}>
                    +{hoveredViaje.minutos_offset_parada} min ({hoveredViaje.es_despachado_origen ? 'Sumado' : 'Al despachar'})
                  </span>
                </div>
              )}

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderTop: '1px dashed #cbd5e1', paddingTop: 4, marginTop: 2
              }}>
                <span style={{ color: '#0a365d', fontWeight: 600 }}>Hora en esta Parada:</span>
                <span style={{ fontWeight: 800, color: '#0a365d', fontSize: 13 }}>
                  {hoveredViaje.hora_salida_parada ? hoveredViaje.hora_salida_parada.substring(0, 5) : (hoveredViaje.hora_origen_salida ? hoveredViaje.hora_origen_salida.substring(0, 5) : 'N/A')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: '#64748b' }}>🚍 Unidad / Bus:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                Disco {hoveredViaje.bus_disco || hoveredViaje.bus_codigo || 'S/N'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>💺 Disponibilidad:</span>
              <span style={{ fontWeight: 700, color: (hoveredViaje.asientos_libres || 0) > 0 ? '#16a34a' : '#dc2626' }}>
                {hoveredViaje.asientos_libres || 0} Libres / {hoveredViaje.ocupados || 0} Ocupados
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
