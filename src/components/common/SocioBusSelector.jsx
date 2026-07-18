import { useState } from 'react';
import { api } from '../../config/axios';
import Swal from 'sweetalert2';

const SocioBusSelector = ({ idSocio, idBus, onSocioChange, onBusChange }) => {
  const [mode, setMode] = useState('socio'); // 'socio' o 'bus'
  const [cedula, setCedula] = useState('');
  const [busDisco, setBusDisco] = useState('');
  
  const [searching, setSearching] = useState(false);
  const [socio, setSocio] = useState(null);
  const [buses, setBuses] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(false);
  const [sociosDelBus, setSociosDelBus] = useState([]); // Socios del bus encontrado

  const buscarSocio = async () => {
    if (!cedula.trim()) { Swal.fire('Aviso', 'Ingrese un número de cédula', 'warning'); return; }
    setSearching(true);
    setSocio(null);
    setBuses([]);
    setSociosDelBus([]);
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
      // Usar id_socio en lugar de id_personal para buscar en bus_socios
      const res = await api.get('/buses/seleccionarBuses', { params: { id_socio: idPersonal, limit: 50 } });
      if (res.data?.success) {
        setBuses(res.data.data || []);
      }
    } catch (err) {
      console.error('Error cargando buses:', err);
    } finally {
      setLoadingBuses(false);
    }
  };

  const buscarBus = async () => {
    if (!busDisco.trim()) { Swal.fire('Aviso', 'Ingrese un disco de bus', 'warning'); return; }
    setSearching(true);
    setSocio(null);
    setBuses([]);
    setSociosDelBus([]);
    onSocioChange('');
    onBusChange('');
    try {
      const res = await api.get('/buses/seleccionarBuses', { params: { bus_disco: busDisco.trim(), limit: 1 } });
      if (res.data?.success && res.data?.data?.length > 0) {
        const foundBus = res.data.data[0];
        setBuses([foundBus]); // Solo para display local si hiciera falta
        onBusChange(foundBus.id_buses);
        
        const socios = foundBus.socios || [];
        setSociosDelBus(socios);
        
        if (socios.length === 1) {
          setSocio(socios[0]);
          onSocioChange(socios[0].id_socio);
        } else if (socios.length === 0) {
          Swal.fire('Aviso', 'Este bus no tiene socios asignados', 'warning');
        }
      } else {
        Swal.fire('Error', 'Bus no encontrado con ese disco', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e, searchFn) => {
    if (e.key === 'Enter') searchFn();
  };

  return (
    <div className="space-y-4">
      {/* TABS DE BÚSQUEDA */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => { setMode('socio'); setSocio(null); setBuses([]); setSociosDelBus([]); onSocioChange(''); onBusChange(''); }}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${mode === 'socio' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <i className="fas fa-user mr-2"></i>Buscar por Socio
        </button>
        <button
          type="button"
          onClick={() => { setMode('bus'); setSocio(null); setBuses([]); setSociosDelBus([]); onSocioChange(''); onBusChange(''); }}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${mode === 'bus' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <i className="fas fa-bus mr-2"></i>Buscar por Bus
        </button>
      </div>

      {mode === 'socio' ? (
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cédula del Socio</label>
            <div className="flex gap-2">
              <input type="text" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Ingrese cédula del socio"
                value={cedula} onChange={e => setCedula(e.target.value)} onKeyDown={e => handleKeyDown(e, buscarSocio)} />
              <button type="button" onClick={buscarSocio} disabled={searching}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                {searching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>} Buscar
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
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Bus Asignado</label>
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
                      Disco {b.disco_buses} - Placa {b.placa_buses || ''}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Disco del Bus</label>
            <div className="flex gap-2">
              <input type="text" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Ingrese el disco del bus"
                value={busDisco} onChange={e => setBusDisco(e.target.value)} onKeyDown={e => handleKeyDown(e, buscarBus)} />
              <button type="button" onClick={buscarBus} disabled={searching}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                {searching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>} Buscar
              </button>
            </div>
          </div>

          {buses.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm flex items-center justify-between">
              <div>
                <p className="font-bold text-emerald-800">Bus Encontrado (Disco {buses[0].disco_buses})</p>
                <p className="text-xs text-emerald-600">Placa: {buses[0].placa_buses}</p>
              </div>
              <i className="fas fa-check-circle text-emerald-500 text-2xl"></i>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Socio Responsable</label>
            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              value={idSocio} 
              onChange={e => {
                onSocioChange(e.target.value);
                const s = sociosDelBus.find(soc => soc.id_socio == e.target.value);
                setSocio(s || null);
              }}
              disabled={buses.length === 0 || sociosDelBus.length === 0}>
              {buses.length === 0 ? (
                <option value="">Primero busque un bus</option>
              ) : sociosDelBus.length === 0 ? (
                <option value="">El bus no tiene socios</option>
              ) : (
                <>
                  <option value="">Seleccione el socio responsable</option>
                  {sociosDelBus.map(s => (
                    <option key={s.id_socio} value={s.id_socio}>
                      {s.per_nombres_persona} {s.per_apellidos_personal} ({s.per_cedula_personal})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocioBusSelector;