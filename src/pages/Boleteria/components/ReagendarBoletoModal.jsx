import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';
import { BoleteriaService } from '../../../services/boleteria.service';

const inputStyle = { 
  flex: 1, 
  padding: '8px 12px', 
  border: '1px solid #cbd5e1', 
  borderRadius: 6, 
  fontSize: 13,
  width: '100%',
  backgroundColor: '#f8fafc',
  transition: 'border-color 0.2s',
  outline: 'none'
};

export const ReagendarBoletoModal = ({ isOpen, onClose, boletoOriginal, onSuccess }) => {
  const [fechaUso, setFechaUso] = useState('');
  const [viajesDisponibles, setViajesDisponibles] = useState([]);
  const [selectedViaje, setSelectedViaje] = useState('');
  
  const [destinosDisponibles, setDestinosDisponibles] = useState([]);
  const [selectedDestino, setSelectedDestino] = useState('');

  const [asientosDisponibles, setAsientosDisponibles] = useState([]);
  const [selectedAsiento, setSelectedAsiento] = useState('');
  
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingViajes, setLoadingViajes] = useState(false);
  const [loadingAsientos, setLoadingAsientos] = useState(false);
  const [loadingDestinos, setLoadingDestinos] = useState(false);
  const [viajeObject, setViajeObject] = useState(null);

  // Initialize with today's date if not set
  useEffect(() => {
    if (isOpen) {
      const hoy = new Date();
      const localString = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      setFechaUso(localString);
      setMotivo('Reubicación solicitada por el usuario');
      // Set the default destination from the original ticket
      if (boletoOriginal && boletoOriginal.id_destino_boleto) {
         setSelectedDestino(String(boletoOriginal.id_destino_boleto));
      }
    }
  }, [isOpen, boletoOriginal]);

  useEffect(() => {
    if (!isOpen || !fechaUso) return;
    const fetchViajes = async () => {
      setLoadingViajes(true);
      try {
        let user = {};
        try {
          const userData = sessionStorage.getItem('user_data');
          if (userData) user = { ...user, ...JSON.parse(userData) };
        } catch (e) {}

        const res = await BoleteriaService.getViajesDisponibles({
          fecha: fechaUso,
          id_sucursal: user.id_sucursal
        });
        if (res.success && res.data) {
          setViajesDisponibles(res.data);
        } else {
          setViajesDisponibles([]);
        }
      } catch (e) {
        console.error(e);
        toast.error('Error cargando viajes disponibles');
      } finally {
        setLoadingViajes(false);
      }
    };
    fetchViajes();
  }, [fechaUso, isOpen]);

  // When Viaje changes, fetch both seats AND destinations
  useEffect(() => {
    if (!selectedViaje) {
      setAsientosDisponibles([]);
      setDestinosDisponibles([]);
      setViajeObject(null);
      return;
    }
    
    const fetchDestinosYAsientos = async () => {
      setLoadingAsientos(true);
      setLoadingDestinos(true);
      try {
        const busObj = viajesDisponibles.find(v => String(v.id_viajes) === String(selectedViaje));
        setViajeObject(busObj);

        // Fetch destinos
        const resDestinos = await api.get('/viajes/destinoViajeSelect', { params: { id_viaje: selectedViaje } });
        if (resDestinos.data?.success && resDestinos.data?.data) {
           setDestinosDisponibles(resDestinos.data.data);
           
           // Keep the previously selected destination if it exists in the new trip's destinations
           const isDestinoStillValid = resDestinos.data.data.some(d => String(d.id_sub_rutas) === selectedDestino);
           if (!isDestinoStillValid) {
              setSelectedDestino(''); 
           }
        }

        // Fetch asientos ocupados usando getAsientosBusViaje igual que en NuevoBoletoPage
        const resAsientos = await BoleteriaService.getAsientosBusViaje(selectedViaje);
        let ocupados = [];
        let capacidad = 0;
        
        if (resAsientos?.success && resAsientos?.data && resAsientos?.data.length > 0) {
          const busData = resAsientos.data[0];
          capacidad = Number(busData.capacidad_buses || busObj?.capacidad_buses || 0);
          
          if (resAsientos.asiento) {
            resAsientos.asiento.forEach(a => {
              if (a.estado_boleto_detalle !== '0' && Number(a.estado_boleto_detalle) !== 0) {
                ocupados.push(Number(a.asiento_boleto_detalle));
              }
            });
          }
        } else {
          capacidad = Number(busObj?.capacidad_buses || 0);
        }
        
        if (capacidad > 0) {
          const disponibles = [];
          for (let i = 1; i <= capacidad; i++) {
            if (!ocupados.includes(i)) {
              disponibles.push(i);
            }
          }
          setAsientosDisponibles(disponibles);
        } else {
          setAsientosDisponibles([]);
        }
      } catch (e) {
        console.error(e);
        toast.error('Error cargando datos del viaje');
      } finally {
        setLoadingAsientos(false);
        setLoadingDestinos(false);
      }
    };
    
    fetchDestinosYAsientos();
  }, [selectedViaje, viajesDisponibles]);

  const handleGuardar = async () => {
    if (!selectedViaje) { toast.error('Seleccione un viaje nuevo'); return; }
    if (!selectedDestino) { toast.error('Seleccione un destino nuevo'); return; }
    if (!selectedAsiento) { toast.error('Seleccione un asiento nuevo'); return; }
    if (!motivo.trim()) { toast.error('Ingrese un motivo'); return; }

    setLoading(true);
    try {
      const payload = {
        id_boleto: boletoOriginal.id_boleto,
        id_viaje_nuevo: selectedViaje,
        id_bus_nuevo: viajeObject?.id_fkbus_viajes || viajeObject?.id_buses || viajeObject?.bus_id || '',
        id_subruta_nueva: selectedDestino,
        asiento_nuevo: selectedAsiento,
        id_origen_nuevo: boletoOriginal.origen_boleto || boletoOriginal.id_origen_boleto || '', // Fix property name
        motivo: motivo,
        fecha_uso: fechaUso
      };
      
      console.log('[ReagendarBoletoModal] Payload a enviar:', payload);

      const response = await api.post('/boleto/reubicarAsiento', payload);
      
      if (response.data?.success) {
        toast.success('Boleto reubicado exitosamente sin costos adicionales');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(response.data?.message || 'Error al reubicar boleto');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', borderRadius: 12, width: 650, maxWidth: '95%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', 
        overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
          color: 'white', padding: '16px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '4px solid #3b82f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '50%' }}>
                <i className="fas fa-exchange-alt" style={{ fontSize: 16 }}></i>
             </div>
             <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '0.5px' }}>
                  Reagendar Boleto 
                  <span style={{ color: '#93c5fd', marginLeft: 6 }}>#{boletoOriginal?.numero_boleto || ''}</span>
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                   Pasajero: {boletoOriginal?.nombres_boleto || 'Desconocido'}
                </p>
             </div>
          </div>
          <button onClick={onClose}
            style={{ 
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', 
              cursor: 'pointer', fontSize: 16, width: 32, height: 32, 
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
             {/* Left Column */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                   <i className="far fa-calendar-alt text-blue-500"></i> Fecha de Uso *
                 </label>
                 <input type="date" value={fechaUso} onChange={e => setFechaUso(e.target.value)} style={inputStyle} 
                   onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
               </div>

               <div>
                 <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                   <i className="fas fa-bus text-blue-500"></i> Viaje Nuevo *
                 </label>
                 <select value={selectedViaje} onChange={e => setSelectedViaje(e.target.value)} style={inputStyle} disabled={loadingViajes}>
                   <option value="">{loadingViajes ? 'Cargando viajes...' : 'Seleccione viaje...'}</option>
                   {viajesDisponibles.map((v, idx) => {
                     const descHora = v.hora_origen_salida ? v.hora_origen_salida.substring(0,5) : (v.hora || v.hora_salida);
                     const descRuta = v.nombre_rutas || v.nombre_aux || `Viaje ${v.id_viajes}`;
                     const descBus = v.bus_disco || v.bus_codigo;
                     return (
                       <option key={v?.id_viajes ?? `viaje-opt-${idx}`} value={v.id_viajes}>
                         {descHora} - {descRuta} (Bus: {descBus})
                       </option>
                     );
                   })}
                 </select>
               </div>
             </div>

             {/* Right Column */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                   <i className="fas fa-map-marker-alt text-blue-500"></i> Destino *
                 </label>
                 <select value={selectedDestino} onChange={e => setSelectedDestino(e.target.value)} style={inputStyle} disabled={loadingDestinos || !selectedViaje}>
                   <option value="">{loadingDestinos ? 'Cargando destinos...' : 'Seleccione destino...'}</option>
                   {destinosDisponibles.map(d => (
                     <option key={d.id_sub_rutas} value={d.id_sub_rutas}>
                       {d.nombre_sub_rutas} - ${parseFloat(d.valor_sub_rutas || 0).toFixed(2)}
                     </option>
                   ))}
                 </select>
               </div>

               <div>
                 <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                   <i className="fas fa-chair text-blue-500"></i> Asiento Nuevo *
                 </label>
                 <select value={selectedAsiento} onChange={e => setSelectedAsiento(e.target.value)} style={inputStyle} disabled={loadingAsientos || !selectedViaje}>
                   <option value="">{loadingAsientos ? 'Cargando asientos...' : 'Seleccione asiento...'}</option>
                   {asientosDisponibles.map(a => (
                     <option key={a} value={a}>
                       Asiento {a}
                     </option>
                   ))}
                 </select>
               </div>
             </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <i className="fas fa-comment-dots text-blue-500"></i> Motivo del Cambio *
            </label>
            <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Cambio solicitado por el cliente" style={inputStyle} 
              onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
          </div>
          
          <div style={{ 
            padding: '12px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', 
            borderRadius: 8, fontSize: 13, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{ background: '#e0f2fe', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <i className="fas fa-info-circle text-blue-600"></i>
            </div>
            <span>La reasignación de asiento se aplicará <strong>sin costos adicionales</strong>. El boleto anterior quedará anulado implícitamente en ese viaje.</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', 
          display: 'flex', justifyContent: 'flex-end', gap: 12 
        }}>
          <button onClick={onClose}
            style={{ 
              padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: 6, 
              background: 'white', color: '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              transition: 'background 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseOut={e => e.currentTarget.style.background = 'white'}
          >
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={loading}
            style={{
              padding: '10px 20px', border: 'none', borderRadius: 6,
              background: '#0f172a', color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600, opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'background 0.2s', boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.2)'
            }}
            onMouseOver={e => { if(!loading) e.currentTarget.style.background = '#1e293b'; }}
            onMouseOut={e => { if(!loading) e.currentTarget.style.background = '#0f172a'; }}
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> Procesando...</>
            ) : (
              <><i className="fas fa-save"></i> Reubicar y Guardar</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
