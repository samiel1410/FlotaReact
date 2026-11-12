import React from 'react';
import { validarCorreo, describirCorreo } from '../../../utils/emailValidation';

export const DatosPasajeroPanel = ({
  formData,
  onFieldChange,
  onBuscarCI,
  onLimpiarPasajero,
  onConsumidorFinal,
  mostrarConsumidorFinal = true,
  onOpenCrearCliente,
  onOpenEditarCliente,
  onFechaNacimientoChange
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

  const validacionCorreo = validarCorreo(formData.correo, { permitirVacio: true });

  const inputStyle = {
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
        <i className="fas fa-user" style={{ marginRight: 5, color: '#0a365d', fontSize: 13 }}></i>
        Datos del Cliente (Factura)
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: -3, marginBottom: 5 }}>
        Se usan para la factura y para precargar cada asiento nuevo. El pasajero de cada asiento se edita en la Lista de Asientos.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
        {/* FILA 1 - IZQUIERDA: CI / RUC + Botones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={labelStyle}>
            CI/RUC:
          </label>
          <input
            type="text"
            value={formData.identificacion}
            onChange={e => onFieldChange('identificacion', e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onBuscarCI(formData.identificacion);
              }
            }}
            maxLength={15}
            placeholder="Cédula"
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button
              type="button"
              title="Buscar cliente"
              onClick={() => onBuscarCI(formData.identificacion)}
              style={{
                background: '#0a365d', color: 'white', border: 'none',
                borderRadius: 3, width: 26, height: 26, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <i className="fas fa-search" style={{ fontSize: 11 }}></i>
            </button>
            {mostrarConsumidorFinal && (
            <button
              type="button"
              title="Consumidor Final"
              onClick={onConsumidorFinal}
              style={{
                background: '#035f2c', color: 'white', border: 'none',
                borderRadius: 3, padding: '0 6px', height: 26, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 'bold', gap: 3
              }}
            >
              <i className="fas fa-user-tag" style={{ fontSize: 10 }}></i> CF
            </button>
            )}
            <button
              type="button"
              title="Limpiar datos"
              style={{
                background: '#FF9800', color: 'white', border: 'none',
                borderRadius: 3, width: 26, height: 26, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onClick={onLimpiarPasajero}
            >
              <i className="fas fa-redo" style={{ fontSize: 11 }}></i>
            </button>
            <button
              type="button"
              title="Crear nuevo cliente"
              onClick={onOpenCrearCliente}
              style={{
                background: '#0a365d', color: 'white', border: 'none',
                borderRadius: 3, width: 26, height: 26, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <i className="fas fa-user-plus" style={{ fontSize: 11 }}></i>
            </button>
            {formData.idCliente && (
              <button
                type="button"
                title="Actualizar datos del cliente"
                onClick={onOpenEditarCliente}
                style={{
                  background: '#FF9800', color: 'white', border: 'none',
                  borderRadius: 3, width: 26, height: 26, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <i className="fas fa-pen" style={{ fontSize: 11 }}></i>
              </button>
            )}
          </div>
        </div>

        {/* FILA 1 - DERECHA: Nombres */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={labelStyle}>
            Nombres:
          </label>
          <input
            type="text"
            value={formData.nombres}
            onChange={e => onFieldChange('nombres', e.target.value)}
            placeholder="Nombre o razón social"
            style={inputStyle}
          />
        </div>

        {/* FILA 2 - IZQUIERDA: Fecha Nacimiento */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={labelStyle}>
            F. Nac:
          </label>
          <input
            type="date"
            value={formData.fechaNacimiento}
            onChange={e => onFechaNacimientoChange(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* FILA 3 - IZQUIERDA: Celular */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={labelStyle}>
            Celular:
          </label>
          <input
            type="text"
            value={formData.celular}
            onChange={e => onFieldChange('celular', e.target.value.replace(/\D/g, '').slice(0, 10))}
            maxLength={10}
            placeholder="099..."
            style={inputStyle}
          />
        </div>

        {/* FILA 3 - DERECHA: Correo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={labelStyle}>
            Correo:
          </label>
          <input
            type="email"
            value={formData.correo}
            onChange={e => onFieldChange('correo', e.target.value)}
            placeholder="usuario@correo.com"
            style={inputStyle}
          />
          {validacionCorreo.tieneCorreo && !validacionCorreo.valido && (
            <span
              title={describirCorreo(validacionCorreo)}
              style={{ color: '#c0392b', fontSize: 10, fontWeight: 'bold', cursor: 'help', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-exclamation-triangle"></i> Inválido
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
