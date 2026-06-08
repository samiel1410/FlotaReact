import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';

export const CambiarBusModal = ({ isOpen, onClose, viajeId, currentBusId, currentChoferId, onCambioExitoso }) => {
  const [buses, setBuses] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [auxiliares, setAuxiliares] = useState([]);
  const [selectedBus, setSelectedBus] = useState(currentBusId || '');
  const [selectedChofer, setSelectedChofer] = useState(currentChoferId || '');
  const [selectedAuxiliar, setSelectedAuxiliar] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      try {
        const [busesRes, choferesRes, auxiliaresRes] = await Promise.all([
          api.get('/buses/seleccionarBusesCombo'),
          api.get('/personal/personalSelectCombo'),
          api.get('/personal/auxiliarSelectCombo'),
        ]);
        if (busesRes.data?.success && busesRes.data?.data) setBuses(busesRes.data.data);
        if (choferesRes.data?.success && choferesRes.data?.data) setChoferes(choferesRes.data.data);
        if (auxiliaresRes.data?.success && auxiliaresRes.data?.data) setAuxiliares(auxiliaresRes.data.data);
      } catch (e) {
        console.error('Error cargando datos para cambio:', e);
      }
    };
    fetchData();
  }, [isOpen]);

  const handleGuardar = async () => {
    if (!selectedBus) { toast.error('Seleccione un bus'); return; }
    setLoading(true);
    try {
      const response = await api.post('/viajes/cambiarBusPersonal', {
        id_viaje: viajeId,
        id_bus: selectedBus,
        id_chofer: selectedChofer,
        id_auxiliar: selectedAuxiliar,
      });
      if (response.data?.success) {
        toast.success('Bus y personal actualizados correctamente');
        if (onCambioExitoso) onCambioExitoso({ id_bus: selectedBus, id_chofer: selectedChofer });
        onClose();
      } else {
        toast.error(response.data?.message || 'Error al actualizar');
      }
    } catch {
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
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
        background: 'white', borderRadius: 8, width: 450, maxWidth: '90%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)', overflow: 'hidden'
      }}>
        <div style={{
          background: '#0a365d', color: 'white', padding: '12px 16px',
          fontSize: 15, fontWeight: 'bold', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span><i className="fas fa-bus" style={{ marginRight: 8 }}></i>Cambiar Bus / Personal</span>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, width: 100 }}>Bus:</label>
            <select value={selectedBus}
              onChange={e => setSelectedBus(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}>
              <option value="">Seleccione...</option>
              {buses.map((b, idx) => (
                <option key={b?.id_buses || b?.id || `bus-${idx}`} value={b.id_buses || b.id}>
                  {b.disco_buses || b.codigo_buses || b.nombre} - {b.placa_buses || ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, width: 100 }}>Chofer:</label>
            <select value={selectedChofer}
              onChange={e => setSelectedChofer(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}>
              <option value="">Seleccione...</option>
              {choferes.map((c, idx) => (
                <option key={c?.id_personal || c?.id || `chofer-${idx}`} value={c.id_personal || c.id}>
                  {c.per_nombres_persona || c.nombres} - {c.per_cedula_personal || c.cedula}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, width: 100 }}>Auxiliar:</label>
            <select value={selectedAuxiliar}
              onChange={e => setSelectedAuxiliar(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}>
              <option value="">Sin auxiliar</option>
              {auxiliares.map((a, idx) => (
                <option key={a?.id_personal || a?.id || `aux-${idx}`} value={a.id_personal || a.id}>
                  {a.per_nombres_persona || a.nombres} - {a.per_cedula_personal || a.cedula}
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
          <button onClick={handleGuardar} disabled={loading}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 4,
              background: '#0a365d', color: 'white', cursor: 'pointer',
              fontSize: 12, fontWeight: 'bold', opacity: loading ? 0.7 : 1
            }}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};
