import { useState, useEffect } from 'react';

/** Convierte el texto escrito a número (acepta coma o punto como decimal). */
const aNumero = (texto) => {
  const n = parseFloat(String(texto ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Convierte un valor numérico a texto editable. */
const aTexto = (valor) =>
  valor === '' || valor === null || valor === undefined ? '' : String(valor);

export const BoletoTotalesPanel = ({ cantidadAsientos, precioUnitario, totales, onTotalesChange, onPrecioChange, compact }) => {
  const [prevPrecio, setPrevPrecio] = useState(precioUnitario);
  // Se guarda como TEXTO para poder escribir decimales ("12." o "12,5")
  // sin que se pierda el separador mientras se digita.
  const [precioTexto, setPrecioTexto] = useState(aTexto(precioUnitario || 0));

  if (precioUnitario !== prevPrecio) {
    setPrevPrecio(precioUnitario);
    // Solo sincronizamos si el valor externo difiere del que ya representa el
    // texto; si no, se borraría el separador decimal recién escrito.
    if (Math.abs(aNumero(precioTexto) - (Number(precioUnitario) || 0)) > 1e-9) {
      setPrecioTexto(aTexto(precioUnitario || 0));
    }
  }

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
    // Solo dígitos y un único separador decimal (coma o punto).
    let raw = e.target.value.replace(/[^0-9.,]/g, '');
    const sep = raw.search(/[.,]/);
    if (sep !== -1) {
      raw = raw.slice(0, sep + 1) + raw.slice(sep + 1).replace(/[.,]/g, '');
    }
    setPrecioTexto(raw);
    if (onPrecioChange) onPrecioChange(aNumero(raw));
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
          <div style={{ fontSize: isCompact ? '12px' : '13px', color: '#64748b', fontWeight: 'bold', marginBottom: isCompact ? '2px' : '5px' }}>CANTIDAD</div>
          <div style={{ fontSize: isCompact ? '28px' : '40px', color: '#34495e', fontWeight: 800, fontFamily: 'monospace' }}>
            {cantidadAsientos}
          </div>
        </div>

        {/* PRECIO UNITARIO */}
        <div style={boxStyle}>
          <div style={{ fontSize: isCompact ? '12px' : '13px', color: '#64748b', fontWeight: 'bold', marginBottom: isCompact ? '2px' : '5px', textAlign: 'center' }}>PRECIO UNITARIO</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: isCompact ? '20px' : '22px', color: '#e67e22', fontWeight: 'bold' }}>$</span>
            <input
              type="text"
              inputMode="decimal"
              value={precioTexto}
              onChange={handlePrecioChange}
              style={{
                fontSize: isCompact ? '28px' : '32px',
                fontWeight: 'bold',
                color: '#e67e22',
                width: '100%',
                textAlign: 'center',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontFamily: 'monospace',
                height: isCompact ? '32px' : 'auto'
              }}
            />
          </div>
        </div>

        {/* TOTAL */}
        <div style={totalBoxStyle}>
          <div style={{ fontSize: isCompact ? '12px' : '13px', color: '#16a085', fontWeight: 'bold', marginBottom: isCompact ? '2px' : '5px' }}>TOTAL A PAGAR</div>
          <div style={{ fontSize: isCompact ? '28px' : '40px', color: '#16a085', fontWeight: 800, fontFamily: 'monospace' }}>
            ${totales.total.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
