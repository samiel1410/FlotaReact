import { useState, useEffect } from 'react';

export const BoletoTotalesPanel = ({ cantidadAsientos, precioUnitario, totales, onTotalesChange, onPrecioChange, compact }) => {
  const [precioLocal, setPrecioLocal] = useState(precioUnitario || 0);

  useEffect(() => {
    if (precioUnitario > 0) {
      setPrecioLocal(precioUnitario);
    }
  }, [precioUnitario]);

  // El total se calcula desde el grid (suma de valores individuales con descuentos aplicados)
  // Solo reseteamos a 0 si no hay asientos
  useEffect(() => {
    if (cantidadAsientos === 0) {
      if (totales.total !== 0) {
        onTotalesChange({ subtotal: 0, total: 0 });
      }
    }
  }, [cantidadAsientos]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrecioChange = (e) => {
    const val = parseFloat(e.target.value) || 0;
    setPrecioLocal(val);
    if (onPrecioChange) onPrecioChange(val);
  };

  const isCompact = compact === true;

  const boxStyle = {
    background: 'white',
    borderRadius: isCompact ? '4px' : '6px',
    border: '1px solid #e0e0e0',
    padding: isCompact ? '4px' : '10px',
    textAlign: 'center',
    boxShadow: isCompact ? '0 1px 2px rgba(0,0,0,0.04)' : '0 2px 5px rgba(0,0,0,0.05)'
  };

  const totalBoxStyle = {
    ...boxStyle,
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
  };

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: isCompact ? 4 : 6, padding: isCompact ? 3 : 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isCompact ? '4px' : '15px' }}>
        {/* CANTIDAD */}
        <div style={boxStyle}>
          <div style={{ fontSize: isCompact ? '8px' : '11px', color: '#64748b', fontWeight: 'bold', marginBottom: isCompact ? '1px' : '5px' }}>CANTIDAD</div>
          <div style={{ fontSize: isCompact ? '18px' : '36px', color: '#34495e', fontWeight: 800, fontFamily: 'monospace' }}>
            {cantidadAsientos}
          </div>
        </div>

        {/* PRECIO UNITARIO */}
        <div style={boxStyle}>
          <div style={{ fontSize: isCompact ? '8px' : '11px', color: '#64748b', fontWeight: 'bold', marginBottom: isCompact ? '1px' : '5px', textAlign: 'center' }}>PRECIO UNITARIO</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: isCompact ? '12px' : '20px', color: '#e67e22', fontWeight: 'bold' }}>$</span>
            <input
              type="text"
              value={precioLocal}
              onChange={handlePrecioChange}
              style={{
                fontSize: isCompact ? '16px' : '28px',
                fontWeight: 'bold',
                color: '#e67e22',
                width: '100%',
                textAlign: 'center',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontFamily: 'monospace',
                height: isCompact ? '24px' : 'auto'
              }}
            />
          </div>
        </div>

        {/* TOTAL */}
        <div style={totalBoxStyle}>
          <div style={{ fontSize: isCompact ? '8px' : '11px', color: '#16a085', fontWeight: 'bold', marginBottom: isCompact ? '1px' : '5px' }}>TOTAL A PAGAR</div>
          <div style={{ fontSize: isCompact ? '18px' : '36px', color: '#16a085', fontWeight: 800, fontFamily: 'monospace' }}>
            ${totales.total.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
