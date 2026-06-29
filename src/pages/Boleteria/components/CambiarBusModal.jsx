import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';

const inputStyle = { flex: 1, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 };
const smallBtnStyle = { background: '#0a365d', color: 'white', border: 'none', borderRadius: 4, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 };

export const CambiarBusModal = ({ isOpen, onClose, viajeId, currentBusId, currentChoferId, onCambioExitoso }) => {
  const [buses, setBuses] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [auxiliares, setAuxiliares] = useState([]);
  const [selectedBus, setSelectedBus] = useState(currentBusId || '');
  const [selectedChofer, setSelectedChofer] = useState(currentChoferId || '');
  const [selectedAuxiliar, setSelectedAuxiliar] = useState('');
  const [loading, setLoading] = useState(false);
  // Búsqueda por cédula
  const [cedulaChofer, setCedulaChofer] = useState('');
  const [cedulaAuxiliar, setCedulaAuxiliar] = useState('');
  const [buscandoChofer, setBuscandoChofer] = useState(false);
  const [buscandoAuxiliar, setBuscandoAuxiliar] = useState(false);
  const buscandoChoferRef = useRef(false);
  const buscandoAuxiliarRef = useRef(false);
  // Deduplicar por id_personal para evitar keys duplicadas en React
  const deduplicarPersonal = (arr) => {
    if (!arr) return [];
    const seen = new Set();
    return arr.filter(item => {
      const id = item?.id_personal || item?.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  // Cargar combos al abrir
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
        if (choferesRes.data?.success && choferesRes.data?.data) setChoferes(deduplicarPersonal(choferesRes.data.data));
        if (auxiliaresRes.data?.success && auxiliaresRes.data?.data) setAuxiliares(deduplicarPersonal(auxiliaresRes.data.data));
      } catch (e) {
        console.error('Error cargando datos para cambio:', e);
      }
    };
    fetchData();
  }, [isOpen]);

  // Cuando se selecciona un bus, buscar automáticamente el chofer y auxiliar asignados
  useEffect(() => {
    if (!selectedBus || selectedBus === '') return;
    const buscarPersonalDelBus = async () => {
      try {
        const busObj = buses.find(b => String(b.id_buses || b.id) === String(selectedBus));
        const paramValue = busObj ? (busObj.disco_buses || busObj.codigo_buses || selectedBus) : selectedBus;
        const res = await api.get('/personal/buscarPorBus', { params: { id_bus: paramValue } });
        if (res.data?.success && res.data?.data?.length > 0) {
          const data = res.data.data[0];
          if (data.id_fkpersonal_buses) {
            setSelectedChofer(String(data.id_fkpersonal_buses));
            // Auto-completar cédula (la buscamos de la lista de choferes)
            const chofer = choferes.find(c => String(c.id_personal || c.id) === String(data.id_fkpersonal_buses));
            if (chofer) setCedulaChofer(chofer.per_cedula_personal || chofer.cedula || '');
          }
          if (data.id_fkauxiliar_buses) {
            setSelectedAuxiliar(String(data.id_fkauxiliar_buses));
            const aux = auxiliares.find(a => String(a.id_personal || a.id) === String(data.id_fkauxiliar_buses));
            if (aux) setCedulaAuxiliar(aux.per_cedula_personal || aux.cedula || '');
          }
        }
      } catch (e) {
        console.error('Error buscando personal del bus:', e);
      }
    };
    buscarPersonalDelBus();
  }, [selectedBus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Buscar chofer por cédula
  const buscarChoferPorCedula = async (cedula) => {
    const limpia = cedula.replace(/\D/g, '');
    if (limpia.length < 10) { toast.error('Ingrese al menos 10 dígitos'); return; }
    if (buscandoChoferRef.current) return;
    buscandoChoferRef.current = true;
    setBuscandoChofer(true);
    try {
      const res = await api.get('/personal/buscarPorCedula', { params: { cedula: limpia, tipo: '0' } });
      if (res.data?.success && res.data?.data?.length > 0) {
        const p = res.data.data[0];
        setSelectedChofer(String(p.id_personal));
        setCedulaChofer(p.per_cedula_personal);
        toast.success(`Chofer encontrado: ${p.per_nombres_persona} ${p.per_apellidos_personal}`);
      } else {
        toast.error('Chofer no encontrado con esa cédula');
      }
    } catch (e) {
      toast.error('Error al buscar chofer');
    } finally {
      setBuscandoChofer(false);
      buscandoChoferRef.current = false;
    }
  };

  // Buscar auxiliar por cédula
  const buscarAuxiliarPorCedula = async (cedula) => {
    const limpia = cedula.replace(/\D/g, '');
    if (limpia.length < 10) { toast.error('Ingrese al menos 10 dígitos'); return; }
    if (buscandoAuxiliarRef.current) return;
    buscandoAuxiliarRef.current = true;
    setBuscandoAuxiliar(true);
    try {
      const res = await api.get('/personal/buscarPorCedula', { params: { cedula: limpia, tipo: '1' } });
      if (res.data?.success && res.data?.data?.length > 0) {
        const p = res.data.data[0];
        setSelectedAuxiliar(String(p.id_personal));
        setCedulaAuxiliar(p.per_cedula_personal);
        toast.success(`Auxiliar encontrado: ${p.per_nombres_persona} ${p.per_apellidos_personal}`);
      } else {
        toast.error('Auxiliar no encontrado con esa cédula');
      }
    } catch (e) {
      toast.error('Error al buscar auxiliar');
    } finally {
      setBuscandoAuxiliar(false);
      buscandoAuxiliarRef.current = false;
    }
  };

  const handleGuardar = async () => {
    if (!selectedBus) { toast.error('Seleccione un bus'); return; }
    setLoading(true);
    try {
      const response = await api.post('/viajes/cambiarBusViaje', {
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
        const msg = response.data?.error || response.data?.message || 'Error al actualizar';
        toast.error(msg);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Error al conectar con el servidor';
      toast.error(msg);
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
        background: 'white', borderRadius: 8, width: 520, maxWidth: '95%',
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

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ═══ BUS ═══ */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              <i className="fas fa-bus" style={{ marginRight: 4, color: '#0a365d' }}></i>Bus *
            </label>
            <select value={selectedBus}
              onChange={e => setSelectedBus(e.target.value)}
              style={inputStyle}>
              <option value="">Seleccione un bus...</option>
              {buses.map((b, idx) => (
                <option key={b?.id_buses || b?.id || `bus-${idx}`} value={b.id_buses || b.id}>
                  {b.disco_buses || b.codigo_buses || b.nombre} - {b.placa_buses || ''}
                </option>
              ))}
            </select>
          </div>

          {/* ═══ CHOFER (combo + búsqueda por cédula) ═══ */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              <i className="fas fa-user" style={{ marginRight: 4, color: '#0a365d' }}></i>Chofer
            </label>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <input
                type="text"
                value={cedulaChofer}
                onChange={e => setCedulaChofer(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && buscarChoferPorCedula(cedulaChofer)}
                placeholder="Buscar por cédula..."
                maxLength={13}
                style={{ ...inputStyle, width: 140, flex: 'none' }}
              />
              <button
                onClick={() => buscarChoferPorCedula(cedulaChofer)}
                disabled={buscandoChofer}
                style={{ ...smallBtnStyle, background: buscandoChofer ? '#94a3b8' : '#0a365d' }}
                title="Buscar chofer por cédula"
              >
                <i className={`fas ${buscandoChofer ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
              </button>
              <select
                value={selectedChofer}
                onChange={e => {
                  setSelectedChofer(e.target.value);
                  // Al seleccionar del combo, auto-completar cédula
                  const chofer = choferes.find(c => String(c.id_personal || c.id) === e.target.value);
                  if (chofer) setCedulaChofer(chofer.per_cedula_personal || chofer.cedula || '');
                }}
                style={inputStyle}>
                <option value="">Seleccione chofer...</option>
                {choferes.map((c, idx) => (
                  <option key={c?.id_personal || c?.id || `chofer-${idx}`} value={c.id_personal || c.id}>
                    {c.per_nombres_persona || c.nombres} - {c.per_cedula_personal || c.cedula}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ═══ AUXILIAR (combo + búsqueda por cédula) ═══ */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              <i className="fas fa-user-friends" style={{ marginRight: 4, color: '#0a365d' }}></i>Auxiliar
            </label>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <input
                type="text"
                value={cedulaAuxiliar}
                onChange={e => setCedulaAuxiliar(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && buscarAuxiliarPorCedula(cedulaAuxiliar)}
                placeholder="Buscar por cédula..."
                maxLength={13}
                style={{ ...inputStyle, width: 140, flex: 'none' }}
              />
              <button
                onClick={() => buscarAuxiliarPorCedula(cedulaAuxiliar)}
                disabled={buscandoAuxiliar}
                style={{ ...smallBtnStyle, background: buscandoAuxiliar ? '#94a3b8' : '#0a365d' }}
                title="Buscar auxiliar por cédula"
              >
                <i className={`fas ${buscandoAuxiliar ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
              </button>
              <select
                value={selectedAuxiliar}
                onChange={e => {
                  setSelectedAuxiliar(e.target.value);
                  const aux = auxiliares.find(a => String(a.id_personal || a.id) === e.target.value);
                  if (aux) setCedulaAuxiliar(aux.per_cedula_personal || aux.cedula || '');
                }}
                style={inputStyle}>
                <option value="">Sin auxiliar</option>
                {auxiliares.map((a, idx) => (
                  <option key={a?.id_personal || a?.id || `aux-${idx}`} value={a.id_personal || a.id}>
                    {a.per_nombres_persona || a.nombres} - {a.per_cedula_personal || a.cedula}
                  </option>
                ))}
              </select>
            </div>
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
