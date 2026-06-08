import { useState } from 'react';
import { GuiaService } from '../../../services/guia.service';
import toast from 'react-hot-toast';

export const RemitenteDestinatarioForm = ({ tipo, cliente, onChange, onConvenioFound, remitenteId, onDestinatarioAutoFill }) => {
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCliente, setNewCliente] = useState({
    identificacion_cliente: '',
    tipo_identificacion_cliente: 'C',
    nombre_cliente: '',
    direccion_cliente: '',
    email_cliente: '',
    telefono_cliente: '',
    provincia: '',
    canton: '',
    telefono2: ''
  });
  const [provincias, setProvincias] = useState([]);
  const [cantones, setCantones] = useState([]);

  const iconColor = tipo === 'Remitente' ? '#3498db' : '#e67e22';
  const isRemitente = tipo === 'Remitente';

  const handleSearch = async () => {
    if (!busqueda || busqueda.trim().length < 3) {
      toast.error('Ingrese al menos 3 caracteres para buscar');
      return;
    }
    // Validar solo dígitos para cédula/RUC
    if (!/^\d+$/.test(busqueda.trim())) {
      toast.error('La identificación debe contener solo números');
      return;
    }
    setLoading(true);
    try {
      const result = await GuiaService.buscarClientePorIdentificacion(busqueda.trim());
      if (result && result.data && result.data.length > 0) {
        const cli = result.data[0];
        const clienteData = {
          id_cliente: cli.id_cliente || cli.id,
          cedula: cli.identificacion_cliente || cli.cedula || cli.ruc_cliente,
          nombres: cli.nombre_cliente || cli.nombres || '',
          direccion: cli.direccion_cliente || cli.direccion || '',
          telefono: cli.telefono_cliente || cli.telefono || '',
          email: cli.email_cliente || cli.correo_cliente || cli.email || '',
          telefono2: cli.telefono2 || ''
        };
        onChange(clienteData);
        
        // Si es remitente, autocompletar destinatario (ExtJS: params { cedula })
        if (isRemitente && onDestinatarioAutoFill && clienteData.cedula) {
          try {
            const ultDest = await GuiaService.getUltimoDestinatarioPorRemitente(clienteData.cedula);
            if (ultDest?.success && ultDest.data) {
              onDestinatarioAutoFill(ultDest.data);
            }
          } catch (e) {
          }
        }
        
        toast.success(`${tipo} encontrado: ${clienteData.nombres}`);
      } else {
        toast.warning(`${tipo} no encontrado. Puede crear uno nuevo.`);
        setShowCreateForm(true);
        setNewCliente(prev => ({ ...prev, identificacion_cliente: busqueda.trim() }));
      }
    } catch (error) {
      console.error('Error buscando cliente:', error);
      toast.error('Error al buscar cliente en el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newCliente.nombre_cliente || !newCliente.identificacion_cliente) {
      toast.error('Identificación y Nombre son obligatorios');
      return;
    }
    if (!/^\d+$/.test(newCliente.identificacion_cliente)) {
      toast.error('La identificación debe contener solo números');
      return;
    }
    if (newCliente.email_cliente && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCliente.email_cliente)) {
      toast.error('Formato de correo inválido');
      return;
    }
    setLoading(true);
    try {
      await GuiaService.buscarClientePorIdentificacion(newCliente.identificacion_cliente);
      // El backend de ingresarActualizarCliente crea o actualiza
      const { api } = await import('../../../config/axios');
      await api.post('/cliente/ingresarActualizarCliente', {
        identificacion_cliente: newCliente.identificacion_cliente,
        tipo_identificacion_cliente: newCliente.tipo_identificacion_cliente,
        nombre_cliente: newCliente.nombre_cliente,
        direccion_cliente: newCliente.direccion_cliente,
        email_cliente: newCliente.email_cliente,
        telefono_cliente: newCliente.telefono_cliente
      });
      const clienteData = {
        id_cliente: null,
        cedula: newCliente.identificacion_cliente,
        nombres: newCliente.nombre_cliente,
        direccion: newCliente.direccion_cliente,
        telefono: newCliente.telefono_cliente,
        email: newCliente.email_cliente,
        telefono2: newCliente.telefono2
      };
      onChange(clienteData);
      setShowCreateForm(false);
      toast.success(`${tipo} creado exitosamente`);
    } catch (error) {
      console.error('Error creando cliente:', error);
      toast.error('Error al crear el cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProvincias = async () => {
    try {
      const result = await GuiaService.getProvinciasCombo();
      setProvincias(result?.data || []);
    } catch (e) { /* ignore */ }
  };

  const handleProvinciaChange = async (idProvincia) => {
    setNewCliente(prev => ({ ...prev, provincia: idProvincia, canton: '' }));
    try {
      const result = await GuiaService.getCantonesPorProvincia(idProvincia);
      setCantones(result?.data || []);
    } catch (e) {
      setCantones([]);
    }
  };

  const inputClass = "w-full h-8 px-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white text-slate-700";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1";

  return (
    <div className="ng-section bg-white" style={{ borderTop: `3px solid ${iconColor}` }}>
      <h3 className="section-title">
        <i className={`fas fa-user`} style={{color: iconColor, marginRight: '8px'}}></i>
        {tipo}
      </h3>
      
      {!cliente ? (
        <div className="search-client-box">
          {!showCreateForm ? (
            <>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{isRemitente ? 'Cédula / RUC del Remitente' : 'Cédula / RUC del Destinatario'}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    className={inputClass}
                    placeholder="Ingrese número de identificación" 
                    value={busqueda} 
                    onChange={(e) => setBusqueda(e.target.value.replace(/\D/g, ''))} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    disabled={loading}
                    maxLength={13}
                  />
                  <button type="button" className="btn-primary" onClick={handleSearch} disabled={loading} style={{ minWidth: '36px' }}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                  </button>
                </div>
              </div>
              <button type="button" className="btn-link" onClick={() => { setShowCreateForm(true); setNewCliente(prev => ({ ...prev, identificacion_cliente: busqueda })); }} style={{ fontSize: '11px', color: iconColor, marginTop: '4px' }}>
                <i className="fas fa-plus-circle"></i> Crear nuevo {tipo.toLowerCase()}
              </button>
              {!isRemitente && (
                <button type="button" className="btn-link" onClick={() => {
                  onChange({
                    id_cliente: 683,
                    cedula: '9999999999999',
                    nombres: 'CONSUMIDOR FINAL',
                    direccion: 'S/D',
                    telefono: '9999999999',
                    email: 'sincorreo@gmail.com',
                    telefono2: ''
                  });
                  toast.success('Consumidor Final seleccionado');
                }} style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', marginLeft: '8px' }}>
                  <i className="fas fa-user-check"></i> Consumidor Final
                </button>
              )}
            </>
          ) : (
            /* Formulario de creación rápida */
            <div className="create-client-form" style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: '#334155' }}>
                <i className="fas fa-user-plus"></i> Crear {tipo}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label className={labelClass}>Identificación *</label>
                  <input className={inputClass} value={newCliente.identificacion_cliente} 
                    onChange={(e) => setNewCliente({...newCliente, identificacion_cliente: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Tipo ID</label>
                  <select className={inputClass} value={newCliente.tipo_identificacion_cliente}
                    onChange={(e) => setNewCliente({...newCliente, tipo_identificacion_cliente: e.target.value})}>
                    <option value="C">Cédula</option>
                    <option value="R">RUC</option>
                    <option value="P">Pasaporte</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className={labelClass}>Nombre / Razón Social *</label>
                  <input className={inputClass} value={newCliente.nombre_cliente}
                    onChange={(e) => setNewCliente({...newCliente, nombre_cliente: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className={labelClass}>Dirección</label>
                  <input className={inputClass} value={newCliente.direccion_cliente}
                    onChange={(e) => setNewCliente({...newCliente, direccion_cliente: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input className={inputClass} value={newCliente.telefono_cliente}
                    onChange={(e) => setNewCliente({...newCliente, telefono_cliente: e.target.value})} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className={labelClass}>Email</label>
                  <input className={inputClass} type="email" value={newCliente.email_cliente}
                    onChange={(e) => setNewCliente({...newCliente, email_cliente: e.target.value})} />
                </div>
                {!isRemitente && (
                  <>
                    <div>
                      <label className={labelClass}>Teléfono 2</label>
                      <input className={inputClass} value={newCliente.telefono2}
                        onChange={(e) => setNewCliente({...newCliente, telefono2: e.target.value})} />
                    </div>
                    <div>
                      <label className={labelClass}>Provincia</label>
                      <select className={inputClass} value={newCliente.provincia}
                        onChange={(e) => handleProvinciaChange(e.target.value)}
                        onFocus={handleLoadProvincias}>
                        <option value="">Seleccione...</option>
                        {provincias.map(p => <option key={p.id || p.value} value={p.id || p.value}>{p.nombre || p.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Ciudad</label>
                      <select className={inputClass} value={newCliente.canton}
                        onChange={(e) => setNewCliente({...newCliente, canton: e.target.value})}>
                        <option value="">Seleccione...</option>
                        {cantones.map(c => <option key={c.id || c.value} value={c.id || c.value}>{c.nombre || c.label}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowCreateForm(false)} 
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 text-xs font-bold">
                  Cancelar
                </button>
                <button type="button" onClick={handleCreateClient} disabled={loading}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-sm disabled:opacity-70">
                  {loading ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-save"></i> Guardar</>}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="client-info-box" style={{ padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <div className="client-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#166534', margin: 0 }}>{cliente.nombres}</h4>
            <button className="btn-icon" onClick={() => { onChange(null); if (onConvenioFound) onConvenioFound(null); }} title="Cambiar Cliente" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <i className="fas fa-times-circle" style={{color: '#ef4444'}}></i>
            </button>
          </div>
          <div className="client-details" style={{ fontSize: '11px', marginTop: '6px', lineHeight: '1.6' }}>
            <p style={{ margin: 0 }}><strong>C.I./RUC:</strong> {cliente.cedula}</p>
            <p style={{ margin: 0 }}><strong>Dirección:</strong> {cliente.direccion}</p>
            <p style={{ margin: 0 }}><strong>Teléfono:</strong> {cliente.telefono}</p>
            {cliente.email && <p style={{ margin: 0 }}><strong>Email:</strong> {cliente.email}</p>}
          </div>
        </div>
      )}
    </div>
  );
};