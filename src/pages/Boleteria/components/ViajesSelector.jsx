import React from 'react';

export const ViajesSelector = ({
  fechaViaje,
  onFechaChange,
  onBuscarViajes,
  loadingViajes,
  viajesDisponibles = [],
  idViajeSeleccionado,
  onSelectViaje
}) => {
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
            onClick={onBuscarViajes}
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
                borderLeft: v.es_viaje_extra === 1 ? '3px solid #f59e0b' : '3px solid transparent'
              }}
            >
              {v.es_viaje_extra === 1 && (
                <span title="Viaje Extra" style={{ marginRight: 3 }}>
                  <i className="fas fa-star" style={{ fontSize: 7, color: String(idViajeSeleccionado) === String(v.id_viajes) ? '#fde68a' : '#f59e0b' }}></i>
                </span>
              )}
              <i className="fas fa-clock" style={{ marginRight: 3, fontSize: 12 }}></i>
              {v.hora_origen_salida ? v.hora_origen_salida.substring(0, 5) : v.hora || v.hora_salida}
              <span style={{ marginLeft: 4, opacity: 0.7 }}>
                {v.nombre_rutas || v.nombre_aux}
              </span>
              <span style={{ marginLeft: 4, opacity: 0.7 }}>
                {v.bus_disco || v.bus_codigo}
              </span>
              <span style={{
                marginLeft: 3, padding: '1px 4px', borderRadius: 2,
                background: String(idViajeSeleccionado) === String(v.id_viajes) ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                fontSize: 12
              }}>
                {v.asientos_libres || 0} libres
              </span>
            </button>
          ))
        )}
      </div>
    </>
  );
};
