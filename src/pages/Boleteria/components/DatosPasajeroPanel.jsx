import React from 'react';

export const DatosPasajeroPanel = ({
  formData,
  onFieldChange,
  onBuscarCI,
  onLimpiarPasajero,
  onConsumidorFinal,
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
        Datos del Pasajero
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
        {/* FILA 1 - IZQUIERDA: CI / RUC + Botones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={labelStyle}>
            Num CI:
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
            placeholder="Nombre completo"
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

        {/* FILA 2 - DERECHA: Dirección */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={labelStyle}>
            Dir:
          </label>
          <input
            type="text"
            value={formData.direccion}
            onChange={e => onFieldChange('direccion', e.target.value)}
            placeholder="Dirección del pasajero"
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
            onChange={e => onFieldChange('celular', e.target.value.replace(/\D/g, ''))}
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
        </div>
      </div>
    </div>
  );
};
