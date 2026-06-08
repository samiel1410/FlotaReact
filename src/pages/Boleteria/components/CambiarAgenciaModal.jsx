import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';

export const CambiarAgenciaModal = ({ isOpen, onClose, currentIdCaja, onAgenciaCambiada }) => {
  const [agencias, setAgencias] = useState([]);
  const [selectedAgencia, setSelectedAgencia] = useState(currentIdCaja || '');

  useEffect(() => {
    setSelectedAgencia(currentIdCaja || '');
  }, [currentIdCaja]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchAgencias = async () => {
      try {
        const res = await api.get('/sucursal/comboSucursal');
        if (res.data?.success && res.data?.data) {
          const filtered = res.data.data.filter(a => a.id_sucursal > 0);
          setAgencias(filtered);
        }
      } catch (e) {
        console.error('Error cargando agencias:', e);
      }
    };
    fetchAgencias();
  }, [isOpen]);

  const handleGuardar = () => {
    if (!selectedAgencia) { toast.error('Seleccione una agencia'); return; }
    const record = agencias.find(a => String(a.id_sucursal) === String(selectedAgencia));
    if (onAgenciaCambiada) onAgenciaCambiada(record || { id_sucursal: selectedAgencia });
    toast.success('Agencia cambiada correctamente');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', borderRadius: 8, width: 400, maxWidth: '90%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)', overflow: 'hidden'
      }}>
        <div style={{
          background: '#0a365d', color: 'white', padding: '12px 16px',
          fontSize: 15, fontWeight: 'bold', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span><i className="fas fa-building" style={{ marginRight: 8 }}></i>Cambio de Agencia</span>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, width: 80 }}>Agencia:</label>
            <select value={selectedAgencia}
              onChange={e => setSelectedAgencia(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}>
              <option value="">Seleccione...</option>
              {agencias.map((a, idx) => (
                <option key={a?.id_sucursal ?? `agencia-${idx}`} value={a.id_sucursal}>
                  {a.nombre_sucursal || `Sucursal ${a.id_sucursal}`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}
            style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: 4, background: 'white', cursor: 'pointer', fontSize: 12 }}>
            Cancelar
          </button>
          <button onClick={handleGuardar}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 4,
              background: '#0a365d', color: 'white', cursor: 'pointer',
              fontSize: 12, fontWeight: 'bold'
            }}>
            Cambiar Agencia
          </button>
        </div>
      </div>
    </div>
  );
};
