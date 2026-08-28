import React from 'react';

export const BoletoFooter = ({
  idViaje,
  discoBus,
  totalRecaudado = 0,
  cantidadAsientos = 0,
  precioUnitario = 0,
  totalVenta = 0,
  isSubmitting = false,
  onGuardar,
  onCancelar
}) => {
  return (
    <div
      className="nb-footer"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderTop: '2px solid #0a365d',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 -4px 15px rgba(0,0,0,0.1)',
        zIndex: 1000,
        minHeight: 56
      }}
    >
      {/* Lado izquierdo: Bus, Total Bus, Cantidad, Precio Unitario, Total a Pagar */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {idViaje && (
          <>
            <span style={{ whiteSpace: 'nowrap', fontSize: 14 }}>
              BUS: <strong style={{ color: '#0a365d', fontSize: 15 }}>{discoBus || '---'}</strong>
            </span>
            <div style={{ width: 1, height: 28, background: '#cbd5e1' }}></div>
            <span style={{ whiteSpace: 'nowrap', fontSize: 14 }}>
              TOTAL BUS: <strong style={{ color: '#035f2c', fontSize: 16 }}>${parseFloat(totalRecaudado || 0).toFixed(2)}</strong>
            </span>
            <div style={{ width: 1, height: 28, background: '#cbd5e1' }}></div>
          </>
        )}
        <span style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
          Cantidad: <strong style={{ color: '#0a365d', fontSize: 22, fontFamily: 'monospace', fontWeight: 800 }}>{cantidadAsientos}</strong>
        </span>
        <div style={{ width: 1, height: 28, background: '#cbd5e1' }}></div>
        <span style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
          P. Unit: <strong style={{ color: '#e67e22', fontSize: 22, fontFamily: 'monospace', fontWeight: 800 }}>${parseFloat(precioUnitario || 0).toFixed(2)}</strong>
        </span>
        <div style={{ width: 1, height: 28, background: '#cbd5e1' }}></div>
        <span style={{ fontSize: 14, whiteSpace: 'nowrap', fontWeight: 600 }}>
          Total a Pagar: <strong style={{ color: '#059669', fontSize: 26, fontFamily: 'monospace', fontWeight: 900 }}>${parseFloat(totalVenta || 0).toFixed(2)}</strong>
        </span>
      </div>

      {/* Lado derecho: botones */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onGuardar}
          disabled={isSubmitting}
          style={{
            background: 'linear-gradient(to right, #035f2c, #0a7f3f)',
            color: 'white', fontWeight: 'bold', fontSize: 14,
            border: 'none', borderRadius: 5, padding: '10px 24px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', gap: 6, opacity: isSubmitting ? 0.7 : 1
          }}
        >
          {isSubmitting ? (
            <><i className="fas fa-spinner fa-spin"></i> PROCESANDO...</>
          ) : (
            <><i className="fas fa-save"></i> GUARDAR</>
          )}
        </button>

        <button
          onClick={onCancelar}
          style={{
            background: 'linear-gradient(to right, #d32f2f, #f44336)',
            color: 'white', fontWeight: 'bold', fontSize: 14,
            border: 'none', borderRadius: 5, padding: '10px 24px',
            cursor: 'pointer', boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <i className="fas fa-times"></i> CANCELAR
        </button>
      </div>
    </div>
  );
};
