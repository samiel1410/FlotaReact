import { useState } from 'react';
import { api } from '../../config/axios';
import Swal from 'sweetalert2';

const SocioBusSelector = ({ idSocio, idBus, onSocioChange, onBusChange }) => {
  const [cedula, setCedula] = useState('');
  const [searching, setSearching] = useState(false);
  const [socio, setSocio] = useState(null);
  const [buses, setBuses] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(false);

  const buscarSocio = async () => {
    if (!cedula.trim()) { Swal.fire('Aviso', 'Ingrese un número de cédula', 'warning'); return; }
    setSearching(true);
    setSocio(null);
    setBuses([]);
    onSocioChange('');
    onBusChange('');
    try {
      const res = await api.get('/personal/buscarPorCedula', { params: { cedula: cedula.trim() } });
      if (res.data?.success && res.data?.data?.length > 0) {
        const found = res.data.data[0];
        setSocio(found);
        onSocioChange(found.id_personal);
        cargarBuses(found.id_personal);
      } else {
        Swal.fire('Error', 'Socio no encontrado con esa cédula', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSearching(false);
    }
  };

  const cargarBuses = async (idPersonal) => {
    setLoadingBuses(true);
    try {
      const res = await api.get('/buses/seleccionarBuses', { params: { id_personal: idPersonal, limit: 50 } });
      if (res.data?.success) {
        setBuses(res.data.data || []);
      }
    } catch (err) {
      console.error('Error cargando buses:', err);
    } finally {
      setLoadingBuses(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') buscarSocio();
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[11px] font-bold text-slate-600 mb-1">Cédula del Socio</label>
        <div className="flex gap-2">
          <input type="text" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            placeholder="Ingrese cédula del socio"
            value={cedula} onChange={e => setCedula(e.target.value)} onKeyDown={handleKeyDown} />
          <button onClick={buscarSocio} disabled={searching}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
            {searching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
            Buscar
          </button>
        </div>
      </div>

      {socio && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
          <p className="font-bold text-emerald-800">{socio.per_nombres_persona} {socio.per_apellidos_personal}</p>
          <p className="text-xs text-emerald-600">Cédula: {socio.per_cedula_personal}</p>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-bold text-slate-600 mb-1">Bus</label>
        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          value={idBus} onChange={e => onBusChange(e.target.value)}
          disabled={!socio || loadingBuses}>
          {!socio ? (
            <option value="">Primero busque un socio</option>
          ) : loadingBuses ? (
            <option value="">Cargando buses...</option>
          ) : buses.length === 0 ? (
            <option value="">Sin buses asignados</option>
          ) : (
            <>
              <option value="">Seleccione un bus</option>
              {buses.map(b => (
                <option key={b.id_buses} value={b.id_buses}>
                  {b.disco_buses} - {b.placa_buses || ''}
                </option>
              ))}
            </>
          )}
        </select>
      </div>
    </div>
  );
};

export default SocioBusSelector;