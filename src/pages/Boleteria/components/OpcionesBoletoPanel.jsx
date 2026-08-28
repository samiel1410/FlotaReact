import React from 'react';
import { TARIFAS } from '../utils/boletoUtils';

export const OpcionesBoletoPanel = ({
  tarifa,
  onTarifaChange,
  esReserva,
  onToggleReserva,
  observacion,
  onObservacionChange
}) => {
  return (
    <div style={{
      background: 'white', borderRadius: 4, border: '1px solid #e0e0e0',
      padding: 5, boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4,
        borderBottom: '1px solid #e2e8f0', paddingBottom: 2
      }}>
        <i className="fas fa-cog" style={{ marginRight: 4, color: '#e67e22', fontSize: 13 }}></i>
        Opciones de Boleto
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        {/* Tarifa radio group */}
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 2 }}>
            Tarifa:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
            {TARIFAS.map(t => (
              <label key={t.value} style={{
                display: 'flex', alignItems: 'center', gap: 2,
                fontSize: 12, cursor: 'pointer', padding: '1px 3px',
                borderRadius: 2, background: tarifa === t.value ? '#dbeafe' : 'transparent'
              }}>
                <input
                  type="radio"
                  name="tarifa"
                  checked={tarifa === t.value}
                  onChange={() => onTarifaChange(t.value)}
                  style={{ margin: 0, width: 11, height: 11 }}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        {/* ES RESERVA toggle */}
        <div style={{ flexShrink: 0 }}>
          <button
            onClick={onToggleReserva}
            style={{
              padding: '4px 10px', border: '2px solid', borderRadius: 3,
              fontWeight: 'bold', fontSize: 12, cursor: 'pointer',
              background: esReserva ? '#FF9800' : 'linear-gradient(to bottom, #f0f0f0, #e8e8e8)',
              borderColor: esReserva ? '#F57C00' : '#ddd',
              color: esReserva ? 'white' : 'gray',
              boxShadow: esReserva ? '0 3px 8px rgba(255,152,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)'
            }}
          >
            {esReserva ? '✓ ES RESERVA' : 'NO es Reserva'}
          </button>
        </div>
      </div>

      {/* Observación */}
      <div style={{ marginTop: 4 }}>
        <textarea
          value={observacion}
          onChange={e => onObservacionChange(e.target.value)}
          placeholder="Observación..."
          rows={1}
          style={{
            width: '100%', padding: '3px 6px', border: '1px solid #cbd5e1',
            borderRadius: 3, fontSize: 13, resize: 'none', height: 22
          }}
        />
      </div>
    </div>
  );
};
