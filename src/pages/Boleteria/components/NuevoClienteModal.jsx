import { useState } from 'react';
import toast from 'react-hot-toast';
import { clienteApi } from '../../../config/axios';

const TIPOS_IDENTIFICACION = [
  { value: 'Cedula', label: 'Cédula' },
  { value: 'RUC', label: 'RUC' },
  { value: 'Pasaporte', label: 'Pasaporte' },
];

export const NuevoClienteModal = ({ isOpen, onClose, onClienteCreado }) => {
  const [tipoIdentificacion, setTipoIdentificacion] = useState('Cedula');
  const [identificacion, setIdentificacion] = useState('');
  const [nombres, setNombres] = useState('');
  const [direccion, setDireccion] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [saving, setSaving] = useState(false);
  const [validacionId, setValidacionId] = useState(null); // null | { valido: bool, msg: string }

  const resetForm = () => {
    setTipoIdentificacion('Cedula');
    setIdentificacion('');
    setNombres('');
    setDireccion('');
    setCelular('');
    setCorreo('');
    setFechaNacimiento('');
    setValidacionId(null);
  };

  const validarIdentificacion = (tipo, valor) => {
    if (!valor) return null;
    const soloDigitos = valor.replace(/\D/g, '');
    switch (tipo) {
      case 'Cedula':
        if (soloDigitos.length !== 10) return { valido: false, msg: `La cédula debe tener 10 dígitos (tiene ${soloDigitos.length})` };
        return { valido: true, msg: 'Cédula válida' };
      case 'RUC':
        if (soloDigitos.length !== 13) return { valido: false, msg: `El RUC debe tener 13 dígitos (tiene ${soloDigitos.length})` };
        return { valido: true, msg: 'RUC válido' };
      case 'Pasaporte':
        if (valor.length < 5) return { valido: false, msg: `Debe tener al menos 5 caracteres (tiene ${valor.length})` };
        return { valido: true, msg: 'Pasaporte válido' };
      default:
        return null;
    }
  };

  const getEffectiveTipo = (id, currentTipo) => {
    const soloDigitos = id.replace(/\D/g, '');
    if (soloDigitos.length === 10) return 'Cedula';
    if (soloDigitos.length === 13) return 'RUC';
    return currentTipo;
  };

  const handleIdentificacionChange = (e) => {
    const val = e.target.value;
    setIdentificacion(val);
    const effectiveTipo = getEffectiveTipo(val, tipoIdentificacion);
    if (effectiveTipo !== tipoIdentificacion) setTipoIdentificacion(effectiveTipo);
    setValidacionId(validarIdentificacion(effectiveTipo, val));
  };

  const handleTipoChange = (e) => {
    const nuevoTipo = e.target.value;
    setTipoIdentificacion(nuevoTipo);
    setValidacionId(validarIdentificacion(nuevoTipo, identificacion));
  };

  const getMaxLength = () => {
    if (tipoIdentificacion === 'Cedula') return 10;
    if (tipoIdentificacion === 'RUC') return 13;
    return 20;
  };

  const handleGuardar = async () => {
    console.log('[NuevoClienteModal] Guardar cliente:', { tipoIdentificacion, identificacion, nombres, direccion, celular, correo, fechaNacimiento });
    if (!identificacion) { console.log('[NuevoClienteModal] ⛔ Validación: falta identificación'); toast.error('Ingrese la identificación'); return; }
    if (!nombres) { console.log('[NuevoClienteModal] ⛔ Validación: falta nombre'); toast.error('Ingrese los nombres'); return; }
    console.log('[NuevoClienteModal] ✅ Validación pasó, enviando petición...');

    setSaving(true);
    try {
      const body = {
        tipo_identificacion_cliente: tipoIdentificacion,
        identificacion_cliente: identificacion,
        nombre_cliente: nombres,
        direccion_cliente: direccion,
        telefono_cliente: celular,
        email_cliente: correo,
        fecha_nacimiento: fechaNacimiento,
      };
      const response = await clienteApi.post('/cliente/ingresarActualizarCliente', body);
      const data = response.data;
      if (data.success) {
        // tipo 3 = cliente ya existía, buscar su ID
        if (data.tipo === 3) {
          toast.success('El cliente ya estaba registrado. Cargando datos...');
          const searchRes = await clienteApi.get('/cliente/clientebusquedaIdentificacion', {
            params: { identificacion_busqueda: identificacion }
          });
          const searchData = searchRes.data;
          if (searchData.success && searchData.total > 0) {
            const existing = searchData.data[0];
            const nuevoCliente = {
              id_cliente: existing.id_cliente,
              identificacion_cliente: identificacion,
              nombre_cliente: existing.nombre_cliente,
              direccion_cliente: existing.direccion_cliente,
              telefono_cliente: existing.telefono_cliente,
              email_cliente: existing.email_cliente,
              fecha_nacimiento: existing.fecha_nacimiento,
            };
            onClienteCreado(nuevoCliente);
            resetForm();
            onClose();
            return;
          }
        }
        toast.success('Cliente creado correctamente');
        const clienteData = Array.isArray(data.data) ? data.data[0] : data.data || {};
        const nuevoCliente = {
          id_cliente: clienteData?.id_cliente || data.id_cliente,
          identificacion_cliente: identificacion,
          nombre_cliente: nombres,
          direccion_cliente: direccion,
          telefono_cliente: celular,
          email_cliente: correo,
          fecha_nacimiento: fechaNacimiento,
        };
        onClienteCreado(nuevoCliente);
        resetForm();
        onClose();
      } else {
        toast.error(data.message || 'Error al crear cliente');
      }
    } catch (err) {
      console.error('[NuevoClienteModal] Error:', err);
      toast.error('Error al conectar con el servidor de clientes');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', borderRadius: 8, width: 500, maxWidth: '90%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)', overflow: 'hidden'
      }}>
        <div style={{
          background: '#0a365d', color: 'white', padding: '12px 16px',
          fontSize: 15, fontWeight: 'bold', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span><i className="fas fa-user-plus" style={{ marginRight: 8 }}></i>Nuevo Cliente</span>
          <button onClick={() => { resetForm(); onClose(); }}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, width: 120 }}>Tipo Identificación:</label>
            <select value={tipoIdentificacion}
              onChange={handleTipoChange}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}>
              {TIPOS_IDENTIFICACION.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, width: 120 }}>Identificación:</label>
              <input type="text" value={identificacion}
                onChange={handleIdentificacionChange}
                maxLength={getMaxLength()}
                style={{
                  flex: 1, padding: '6px 8px', borderRadius: 4, fontSize: 12,
                  border: validacionId
                    ? (validacionId.valido ? '2px solid #22c55e' : '2px solid #ef4444')
                    : '1px solid #cbd5e1',
                  outline: 'none',
                  background: validacionId && !validacionId.valido ? '#fef2f2' : 'white'
                }} />
            </div>
            {validacionId && (
              <div style={{
                fontSize: 10, fontWeight: 600, marginTop: 3, marginLeft: 128,
                color: validacionId.valido ? '#16a34a' : '#dc2626'
              }}>
                <i className={`fas ${validacionId.valido ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: 4 }}></i>
                {validacionId.msg}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, width: 120 }}>Nombres:</label>
            <input type="text" value={nombres}
              onChange={e => setNombres(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, width: 120 }}>Dirección:</label>
            <input type="text" value={direccion}
              onChange={e => setDireccion(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, width: 120 }}>Celular:</label>
            <input type="text" value={celular}
              onChange={e => setCelular(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
              placeholder="Solo números"
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, width: 120 }}>Correo:</label>
            <input type="email" value={correo}
              onChange={e => setCorreo(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, width: 120 }}>F. Nacimiento:</label>
            <input type="date" value={fechaNacimiento}
              onChange={e => setFechaNacimiento(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }} />
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => { resetForm(); onClose(); }}
            style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: 4, background: 'white', cursor: 'pointer', fontSize: 12 }}>
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={saving}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 4,
              background: '#0a365d', color: 'white', cursor: 'pointer',
              fontSize: 12, fontWeight: 'bold', opacity: saving ? 0.7 : 1
            }}>
            {saving ? 'Guardando...' : 'Guardar Cliente'}
          </button>
        </div>
      </div>
    </div>
  );
};
