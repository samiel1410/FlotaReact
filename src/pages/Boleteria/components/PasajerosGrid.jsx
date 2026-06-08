import { useState, useEffect } from 'react';

const TARIFAS = [
  { value: 'Normal', text: 'Normal' },
  { value: '50% 3ra Edad', text: '50% 3ra Edad' },
  { value: '50% Menor', text: '50% Menor' },
  { value: '50% Discap.', text: '50% Discap.' },
  { value: '50% Estudiante', text: '50% Estudiante' },
  { value: 'Gratis Cortesía', text: 'Gratis Cortesía' },
];

export const PasajerosGrid = ({ pasajeros, onChange, destinosViaje, precioUnitario, onTotalesChange }) => {
  const [editingField, setEditingField] = useState(null);

  const handleInputChange = (asiento, campo, valor) => {
    const nuevos = pasajeros.map(p => {
      if (p.asiento === asiento) {
        const updated = { ...p, [campo]: valor };
        // Si cambia tarifa, recalcular valor
        if (campo === 'tarifa') {
          const pActualizado = recalcularValor(updated, precioUnitario);
          // Propagar cambio de total
          recalcularTotal([...pasajeros.map(pp => pp.asiento === asiento ? pActualizado : pp)]);
          return pActualizado;
        }
        return updated;
      }
      return p;
    });
    onChange(nuevos);
  };

  const recalcularValor = (pasajero, precio) => {
    const p = precio || 0;
    let valorFinal = 0;
    let descuento = 0;

    switch (pasajero.tarifa) {
      case 'Normal':
        valorFinal = p;
        descuento = 0;
        break;
      case '50% 3ra Edad':
      case '50% Menor':
      case '50% Discap.':
      case '50% Estudiante':
        valorFinal = p / 2;
        descuento = p / 2;
        break;
      case 'Gratis Cortesía':
        valorFinal = 0;
        descuento = p;
        break;
      default:
        valorFinal = p;
        descuento = 0;
    }

    return { ...pasajero, valor: valorFinal, descuento };
  };

  const recalcularTotal = (lista) => {
    const total = lista.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
    if (onTotalesChange) onTotalesChange(total);
  };

  const handleEliminar = (asiento) => {
    const nuevos = pasajeros.filter(p => p.asiento !== asiento);
    onChange(nuevos);
    recalcularTotal(nuevos);
  };

  const handleBuscarCliente = (asiento, cedula) => {
    if (!cedula || cedula.length < 10) return;
    // Simular búsqueda - se podría conectar a /cliente/clientebusquedaIdentificacion
    handleInputChange(asiento, 'nombres', `Cliente ${cedula}`);
  };

  // Recalcular total cuando cambian los pasajeros (nuevo asiento, eliminar, etc.)
  useEffect(() => {
    if (pasajeros.length > 0) {
      recalcularTotal(pasajeros);
    } else {
      if (onTotalesChange) onTotalesChange(0);
    }
  }, [pasajeros]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalcular tarifas cuando cambia precioUnitario
  useEffect(() => {
    if (precioUnitario > 0 && pasajeros.length > 0) {
      const necesitaRecalculo = pasajeros.some(p => {
        const tarifa = p.tarifa || 'Normal';
        if (tarifa === 'Normal') return Math.abs(parseFloat(p.valor || 0) - precioUnitario) > 0.01;
        if (tarifa.includes('50%')) return Math.abs(parseFloat(p.valor || 0) - precioUnitario / 2) > 0.01;
        return false;
      });
      if (necesitaRecalculo) {
        const recalculados = pasajeros.map(p => recalcularValor(p, precioUnitario));
        onChange(recalculados);
        recalcularTotal(recalculados);
      }
    }
  }, [precioUnitario]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="table-responsive">
      <table className="guias-table" style={{ border: '1px solid #cbd5e1', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ width: '50px' }}>Destino</th>
            <th style={{ width: '50px' }}>Asiento</th>
            <th>Cédula / RUC</th>
            <th>Nombre</th>
            <th style={{ width: '80px' }} className="text-right">Valor</th>
            <th style={{ width: '80px' }} className="text-right">Dcto</th>
            <th style={{ width: '100px' }}>Tarifa</th>
            <th style={{ width: '30px' }}></th>
          </tr>
        </thead>
        <tbody>
          {pasajeros.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center" style={{ padding: '30px', color: '#94a3b8' }}>
                <i className="fas fa-hand-pointer" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
                Seleccione asientos en el visualizador del bus.
              </td>
            </tr>
          ) : (
            pasajeros.map(p => (
              <tr key={p.asiento}>
                <td className="text-center">
                  <select
                    value={p.id_destino || ''}
                    onChange={e => handleInputChange(p.asiento, 'id_destino', e.target.value)}
                    style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px' }}
                  >
                    <option value="">-</option>
                    {destinosViaje && destinosViaje.map(d => (
                      <option key={d.id_sub_rutas} value={d.id_sub_rutas}>{d.nombre_sub_rutas}</option>
                    ))}
                  </select>
                </td>
                <td className="text-center font-mono font-bold" style={{ color: '#3b82f6' }}>
                  {p.asiento}
                </td>
                <td>
                  <input
                    type="text"
                    value={p.cedula || ''}
                    onChange={e => handleInputChange(p.asiento, 'cedula', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleBuscarCliente(p.asiento, p.cedula)}
                    placeholder="C.I."
                    style={{ width: '100%', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px' }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={p.nombres || ''}
                    onChange={e => handleInputChange(p.asiento, 'nombres', e.target.value)}
                    placeholder="Nombre completo"
                    style={{ width: '100%', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px' }}
                  />
                </td>
                <td className="text-right font-mono" style={{ fontWeight: 600, color: '#059669' }}>
                  ${parseFloat(p.valor || 0).toFixed(2)}
                </td>
                <td className="text-right font-mono" style={{ fontWeight: 600, color: '#dc2626' }}>
                  {parseFloat(p.descuento || 0) > 0 ? `-$${parseFloat(p.descuento).toFixed(2)}` : '-'}
                </td>
                <td>
                  <select
                    value={p.tarifa || 'Normal'}
                    onChange={e => handleInputChange(p.asiento, 'tarifa', e.target.value)}
                    style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px' }}
                  >
                    {TARIFAS.map(t => (
                      <option key={t.value} value={t.value}>{t.text}</option>
                    ))}
                  </select>
                </td>
                <td className="text-center">
                  <button
                    onClick={() => handleEliminar(p.asiento)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                    title="Eliminar"
                  >
                    <i className="fas fa-minus-circle"></i>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
