import { useState, useEffect, useRef } from 'react';
import { api, clienteApi } from '../../../config/axios';
import toast from 'react-hot-toast';

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
        
        // Si cambia destino, usar el valor del nuevo destino
        if (campo === 'id_destino') {
          const destino = destinosViaje?.find(d => String(d.id_sub_rutas) === String(valor));
          const nuevoPrecioBase = destino ? parseFloat(destino.valor_sub_rutas || 0) : (parseFloat(p.valor || 0) + parseFloat(p.descuento || 0));
          const pActualizado = recalcularValor(updated, nuevoPrecioBase);
          recalcularTotal([...pasajeros.map(pp => pp.asiento === asiento ? pActualizado : pp)]);
          return pActualizado;
        }

        // Si cambia tarifa, recalcular valor con el precio base actual
        if (campo === 'tarifa') {
          const precioBase = parseFloat(p.valor || 0) + parseFloat(p.descuento || 0);
          const pActualizado = recalcularValor(updated, precioBase);
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

  const ultimaBusquedaRef = useRef({});

  const buscarClientePorCI = async (asiento, cedula) => {
    if (!cedula || cedula.length < 10) return;
    // Evitar búsqueda duplicada para el mismo asiento/misma cédula (solo si ya fue exitosa)
    const key = `${asiento}-${cedula}`;
    if (ultimaBusquedaRef.current[key]) return;

    const toastId = toast.loading(`Buscando cliente para asiento ${asiento}...`);
    const aplicarClienteEncontrado = (c) => {
      const nuevos = pasajeros.map(p => {
        if (p.asiento === asiento) {
          return { ...p, cedula: c.identificacion_cliente, nombres: c.nombre_cliente };
        }
        return p;
      });
      onChange(nuevos);
      // Marcar como exitosa para evitar re-búsquedas innecesarias
      ultimaBusquedaRef.current[key] = true;
    };

    try {
      const res = await clienteApi.get('/cliente/clientebusquedaIdentificacion', {
        params: { identificacion_busqueda: cedula }
      });
      if (res.data?.success && res.data?.total > 0) {
        const c = res.data.data[0];
        aplicarClienteEncontrado(c);
        toast.success(`Cliente encontrado: ${c.nombre_cliente}`, { id: toastId });
        return;
      }
      // Fallback: intentar con backend local
      try {
        const res2 = await api.get('/cliente/clientebusquedaIdentificacion', {
          params: { identificacion_busqueda: cedula }
        });
        if (res2.data?.success && res2.data?.total > 0) {
          const c = res2.data.data[0];
          aplicarClienteEncontrado(c);
          toast.success(`Cliente encontrado: ${c.nombre_cliente} (local)`, { id: toastId });
          return;
        }
        toast.error('Cliente no encontrado con esa identificación', { id: toastId });
      } catch {
        toast.error('Error al buscar cliente - servidor no disponible', { id: toastId });
      }
    } catch {
      // Fallback: intentar con backend local
      try {
        const res2 = await api.get('/cliente/clientebusquedaIdentificacion', {
          params: { identificacion_busqueda: cedula }
        });
        if (res2.data?.success && res2.data?.total > 0) {
          const c = res2.data.data[0];
          aplicarClienteEncontrado(c);
          toast.success(`Cliente encontrado: ${c.nombre_cliente} (local)`, { id: toastId });
          return;
        }
        toast.error('Cliente no encontrado', { id: toastId });
      } catch {
        toast.error('Error al buscar cliente - servidor no disponible', { id: toastId });
      }
    }
  };

  const handleBuscarCliente = (asiento, cedula) => {
    buscarClientePorCI(asiento, cedula);
  };

  // Recalcular total cuando cambian los pasajeros (nuevo asiento, eliminar, etc.)
  useEffect(() => {
    if (pasajeros.length > 0) {
      recalcularTotal(pasajeros);
    } else {
      if (onTotalesChange) onTotalesChange(0);
    }
  }, [pasajeros]); // eslint-disable-line react-hooks/exhaustive-deps



  return (
    <div className="table-responsive" style={{ width: '100%' }}>
      <table className="guias-table" style={{ border: '1px solid #cbd5e1', fontSize: '12px', width: '100%', tableLayout: 'auto' }}>
        <thead>
          <tr>
            <th style={{ width: '12%', minWidth: '90px' }}>Destino</th>
            <th style={{ width: '7%', minWidth: '50px' }}>Asiento</th>
            <th style={{ width: '15%', minWidth: '100px' }}>Cédula / RUC</th>
            <th style={{ width: '22%', minWidth: '120px' }}>Nombre</th>
            <th style={{ width: '10%', minWidth: '70px' }} className="text-right">Valor</th>
            <th style={{ width: '10%', minWidth: '70px' }} className="text-right">Dcto</th>
            <th style={{ width: '14%', minWidth: '100px' }}>Tarifa</th>
            <th style={{ width: '5%', minWidth: '30px' }}></th>
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
                    onBlur={e => {
                      const val = e.target.value;
                      if (val && val.length >= 10) {
                        handleBuscarCliente(p.asiento, val);
                      }
                    }}
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
