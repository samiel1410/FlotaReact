import React from 'react';

export const DetallesViajePanel = ({
  idViaje,
  viajesDisponibles = [],
  onViajeChange,
  onRefrescarViajes,
  subrutaSeleccionada,
  destinosViaje = [],
  onDestinoChange,
  onRefrescarDestinos,
  alimentoInfo
}) => {
  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    width: 54,
    minWidth: 54,
    textAlign: 'right',
    whiteSpace: 'nowrap'
  };

  const selectStyle = {
    flex: 1,
    padding: '3px 7px',
    border: '1px solid #cbd5e1',
    borderRadius: 3,
    fontSize: 12,
    height: 28,
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div style={{
      background: 'white', borderRadius: 4, border: '1px solid #e0e0e0',
      padding: '6px 8px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6,
        borderBottom: '1px solid #e2e8f0', paddingBottom: 3
      }}>
        <i className="fas fa-route" style={{ marginRight: 5, color: '#e67e22', fontSize: 13 }}></i>
        Detalles del Viaje
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
        {/* Viaje combo + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={labelStyle}>
            Viaje:
          </label>
          <select
            value={idViaje}
            onChange={e => onViajeChange(e.target.value)}
            style={selectStyle}
          >
            <option value="">Seleccione...</option>
            {viajesDisponibles.map((v, idx) => (
              <option key={v?.id_viajes ?? `viaje-opt-${idx}`} value={v.id_viajes}>
                {`${v.nombre_rutas || v.nombre_aux || `Viaje ${v.id_viajes}`} - ${v.hora_origen_salida ? v.hora_origen_salida.substring(0, 5) : v.hora || v.hora_salida} - Bus ${v.bus_disco || v.bus_codigo}${v.es_viaje_extra === 1 ? ' ⭐ EXTRA' : ''}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onRefrescarViajes}
            title="Refrescar viajes"
            style={{
              background: '#035f2c', color: 'white', border: 'none',
              borderRadius: 3, width: 26, height: 26, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}
          >
            <i className="fas fa-sync-alt" style={{ fontSize: 11 }}></i>
          </button>
        </div>

        {/* Destino combo + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={labelStyle}>
            Destino:
          </label>
          <select
            value={subrutaSeleccionada}
            onChange={e => onDestinoChange(e.target.value)}
            style={selectStyle}
          >
            <option value="">Seleccione...</option>
            {destinosViaje.map((d, idx) => (
              <option key={d?.id_sub_rutas ?? `dest-opt-${idx}`} value={d.id_sub_rutas}>
                {d.nombre_sub_rutas} - ${parseFloat(d.valor_sub_rutas || 0).toFixed(2)}
              </option>
            ))}
          </select>
          <button
            type="button"
            title="Refrescar destinos"
            style={{
              background: '#035f2c', color: 'white', border: 'none',
              borderRadius: 3, width: 26, height: 26, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}
            onClick={onRefrescarDestinos}
          >
            <i className="fas fa-sync-alt" style={{ fontSize: 11 }}></i>
          </button>
        </div>

        {/* Alimento label */}
        {alimentoInfo?.incluye_alimentos && (
          <div style={{ gridColumn: 'span 2', fontSize: 12, color: '#d35400', fontWeight: 'bold', fontStyle: 'italic' }}>
            <i className="fas fa-utensils" style={{ fontSize: 12 }}></i> Incluye: {alimentoInfo.nombre_alimentos} ($<span className="precio-alimento">{parseFloat(alimentoInfo.precio_alimentos || 0).toFixed(2)}</span>)
          </div>
        )}
      </div>
    </div>
  );
};
