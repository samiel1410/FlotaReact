import React from 'react';

export const BoletoTopBar = ({
  onOpenCambiarBus,
  onOpenCambiarAgencia,
  onOpenListadoPasajeros,
  idViaje,
  currentAgencia,
  tiempoRestante,
  horaViaje
}) => {
  return (
    <>
      {/* TOP TOOLBAR */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
        <button
          onClick={onOpenCambiarBus}
          style={{
            flex: 1, background: '#0a365d', color: 'white', fontWeight: 'bold',
            border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13
          }}
        >
          <i className="fas fa-bus"></i> Cambiar Bus
        </button>
        <button
          onClick={onOpenCambiarAgencia}
          style={{
            flex: 1, background: '#0a365d', color: 'white', fontWeight: 'bold',
            border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13
          }}
        >
          <i className="fas fa-building"></i> Cambio Agencia
        </button>
        <button
          onClick={onOpenListadoPasajeros}
          disabled={!idViaje}
          style={{
            flex: 1, background: !idViaje ? '#94a3b8' : '#0a365d', color: 'white', fontWeight: 'bold',
            border: 'none', borderRadius: 4, padding: '4px 8px', cursor: !idViaje ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13,
            opacity: !idViaje ? 0.7 : 1
          }}
          title={!idViaje ? 'Seleccione un viaje primero' : ''}
        >
          <i className="fas fa-list"></i> Listado Pasajeros
        </button>
      </div>

      {/* INDICADOR DE AGENCIA ACTUAL + TIMER VIAJE */}
      <div style={{
        background: '#e0f2fe', borderRadius: 4, padding: '6px 10px',
        border: '1px solid #bae6fd', marginBottom: 5,
        display: 'flex', alignItems: 'center', gap: 6, color: '#0369a1', fontWeight: 600, fontSize: 11
      }}>
        <i className="fas fa-map-marker-alt"></i>
        <span style={{ flex: 1 }}>Agencia actual: {currentAgencia}</span>

        {/* TIMER */}
        {idViaje && tiempoRestante && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: tiempoRestante.pasado ? '#fef2f2' : tiempoRestante.totalSeg < 600 ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${tiempoRestante.pasado ? '#fca5a5' : tiempoRestante.totalSeg < 600 ? '#fcd34d' : '#86efac'}`,
            borderRadius: 4, padding: '3px 8px',
          }}>
            <i
              className={`fas ${tiempoRestante.pasado ? 'fa-flag-checkered' : 'fa-clock'}`}
              style={{ fontSize: 11, color: tiempoRestante.pasado ? '#dc2626' : tiempoRestante.totalSeg < 600 ? '#d97706' : '#16a34a' }}
            />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                {tiempoRestante.pasado ? 'En curso' : 'Para despacho'}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 900, fontFamily: 'monospace',
                color: tiempoRestante.pasado ? '#dc2626' : tiempoRestante.totalSeg < 600 ? '#d97706' : '#16a34a',
              }}>
                {tiempoRestante.pasado ? '-' : ''}{String(tiempoRestante.horas).padStart(2, '0')}:{String(tiempoRestante.minutos).padStart(2, '0')}:{String(tiempoRestante.segundos).padStart(2, '0')}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: 6, lineHeight: 1.2 }}>
              <div style={{ fontSize: 7, color: '#94a3b8', fontWeight: 600 }}>SALIDA</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', fontFamily: 'monospace' }}>{horaViaje?.substring(0, 5)}</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
