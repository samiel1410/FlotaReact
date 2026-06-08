import { useState } from 'react';
import toast from 'react-hot-toast';

const TIPOS_IDENTIFICACION = [
  { value: 'Cedula', label: 'Cédula' },
  { value: 'RUC', label: 'RUC' },
  { value: 'Pasaporte', label: 'Pasaporte' },
];

const verificarCedula = (cedula) => {
  if (!cedula || cedula.length !== 10) return false;
  const digito = parseInt(cedula[9], 10);
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedula[i], 10);
    if (i % 2 === 0) {
      valor *= 2;
      if (valor > 9) valor -= 9;
    }
    suma += valor;
  }
  const decenaSuperior = Math.ceil(suma / 10) * 10;
  const digitoValidador = decenaSuperior - suma;
  return digitoValidador === digito;
};

export const NuevoClienteModal = ({ isOpen, onClose, onClienteCreado }) => {
  const [tipoIdentificacion, setTipoIdentificacion] = useState('Cedula');
  const [identificacion, setIdentificacion] = useState('');
  const [nombres, setNombres] = useState('');
  const [direccion, setDireccion] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTipoIdentificacion('Cedula');
    setIdentificacion('');
    setNombres('');
    setDireccion('');
    setCelular('');
    setCorreo('');
    setFechaNacimiento('');
  };

  const handleGuardar = async () => {
    if (!identificacion) { toast.error('Ingrese la identificación'); return; }
    if (tipoIdentificacion === 'Cedula' && !verificarCedula(identificacion)) {
      toast.error('Cédula inválida');
      return;
    }
    if (!nombres) { toast.error('Ingrese los nombres'); return; }

    setSaving(true);
    try {
      const clienteUrl = window.CONFIG?.CLIENTE_URL || 'https://clientesfp.easysplus.com';
      const body = {
        tipoIdentificacion,
        identificacion,
        nombres,
        direccion,
        celular,
        correo,
        fechaNacimiento,
      };
      const response = await fetch(`${clienteUrl}/cliente/ingresarActualizarCliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Cliente creado correctamente');
        const nuevoCliente = {
          id_cliente: data.data?.id_cliente || data.id_cliente,
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
    } catch {
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
              onChange={e => setTipoIdentificacion(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}>
              {TIPOS_IDENTIFICACION.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, width: 120 }}>Identificación:</label>
            <input type="text" value={identificacion}
              onChange={e => setIdentificacion(e.target.value)}
              maxLength={15}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }} />
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
              onChange={e => setCelular(e.target.value)}
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
