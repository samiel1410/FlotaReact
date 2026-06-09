import { useState } from 'react';
import { GuiaService } from '../../../services/guia.service';
import { api, clienteApi } from '../../../config/axios';
import Modal from '../../../components/common/Modal';
import toast from 'react-hot-toast';

export const RemitenteDestinatarioForm = ({ tipo, cliente, onChange, onConvenioFound, remitenteId, onDestinatarioAutoFill, error }) => {
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCliente, setNewCliente] = useState({
    identificacion_cliente: '',
    tipo_identificacion_cliente: '05',
    nombre_cliente: '',
    direccion_cliente: '',
    correo_cliente: '',
    telefono_cliente: '',
    provincia: '',
    canton: '',
    telefono2: ''
  });
  const [provincias, setProvincias] = useState([]);
  const [cantones, setCantones] = useState([]);

  // ── Estado para el Modal de Edición ─────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    identificacion_cliente: '',
    tipo_identificacion_cliente: '05',
    nombre_cliente: '',
    direccion_cliente: '',
    correo_cliente: '',
    telefono_cliente: '',
    provincia: '',
    canton: '',
    telefono2: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editProvincias, setEditProvincias] = useState([]);
  const [editCantones, setEditCantones] = useState([]);

  const iconColor = tipo === 'Remitente' ? '#3498db' : '#e67e22';
  const isRemitente = tipo === 'Remitente';
  const esConsumidorFinal = cliente?.id_cliente === 683 || cliente?.nombres === 'CONSUMIDOR FINAL';

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
        toast.error(`${tipo} no encontrado. Puede crear uno nuevo.`);
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
    if (newCliente.correo_cliente && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCliente.correo_cliente)) {
      toast.error('Formato de correo inválido');
      return;
    }
    setLoading(true);
    try {
      await GuiaService.buscarClientePorIdentificacion(newCliente.identificacion_cliente);
      // El backend de ingresarActualizarCliente crea o actualiza
      await clienteApi.post('/cliente/ingresarActualizarCliente', {
        identificacion_cliente: newCliente.identificacion_cliente,
        tipo_identificacion_cliente: newCliente.tipo_identificacion_cliente,
        nombre_cliente: newCliente.nombre_cliente,
        direccion_cliente: newCliente.direccion_cliente,
        correo_cliente: newCliente.correo_cliente,
        telefono_cliente: newCliente.telefono_cliente
      });
      const clienteData = {
        id_cliente: null,
        cedula: newCliente.identificacion_cliente,
        nombres: newCliente.nombre_cliente,
        direccion: newCliente.direccion_cliente,
        telefono: newCliente.telefono_cliente,
        email: newCliente.correo_cliente,
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

  // ── Handler Guardar Edición de Cliente ──────────────────
  const handleSaveEdit = async () => {
    if (!editFormData.nombre_cliente) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setEditLoading(true);
    try {
      const payload = {
        identificacion_cliente: editFormData.identificacion_cliente,
        tipo_identificacion_cliente: editFormData.tipo_identificacion_cliente,
        nombre_cliente: editFormData.nombre_cliente,
        direccion_cliente: editFormData.direccion_cliente,
        correo_cliente: editFormData.correo_cliente || editFormData.email_cliente || '',
        telefono_cliente: editFormData.telefono_cliente,
        fecha_nacimiento: editFormData.fecha_nacimiento || ''
      };
      await clienteApi.post('/cliente/actualizarCliente', payload);
      
      // Actualizar el estado local del cliente
      const clienteActualizado = {
        ...cliente,
        cedula: editFormData.identificacion_cliente,
        nombres: editFormData.nombre_cliente,
        direccion: editFormData.direccion_cliente,
        telefono: editFormData.telefono_cliente,
        email: editFormData.correo_cliente || editFormData.email_cliente || '',
        telefono2: editFormData.telefono2
      };
      onChange(clienteActualizado);
      setShowEditModal(false);
      toast.success(`${tipo} actualizado exitosamente`);
    } catch (error) {
      console.error('Error actualizando cliente:', error);
      toast.error('Error al actualizar el cliente');
    } finally {
      setEditLoading(false);
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
    <div className="ng-section bg-white" style={{ borderTop: `3px solid ${iconColor}`, outline: error ? '2px solid #ef4444' : undefined, outlineOffset: '-1px' }}>
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
                    onChange={(e) => setNewCliente({...newCliente, identificacion_cliente: e.target.value.replace(/\D/g, '')})} />
                </div>
                <div>
                  <label className={labelClass}>Tipo ID</label>
                  <select className={inputClass} value={newCliente.tipo_identificacion_cliente}
                    onChange={(e) => setNewCliente({...newCliente, tipo_identificacion_cliente: e.target.value})}>
                  <option value="05">Cédula</option>
                  <option value="04">RUC</option>
                  <option value="06">Pasaporte</option>
                  <option value="08">Identificación del Exterior</option>
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
                    onChange={(e) => setNewCliente({...newCliente, telefono_cliente: e.target.value.replace(/\D/g, '')})} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className={labelClass}>Email</label>
                  <input className={inputClass} type="email" value={newCliente.correo_cliente}
                    onChange={(e) => setNewCliente({...newCliente, correo_cliente: e.target.value})} />
                </div>
                {!isRemitente && (
                  <>
                    <div>
                      <label className={labelClass}>Teléfono 2</label>
                      <input className={inputClass} value={newCliente.telefono2}
                        onChange={(e) => setNewCliente({...newCliente, telefono2: e.target.value.replace(/\D/g, '')})} />
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
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn-icon" onClick={() => {
                setEditFormData({
                  identificacion_cliente: cliente.cedula || '',
                  tipo_identificacion_cliente: cliente.tipo_identificacion || '05',
                  nombre_cliente: cliente.nombres || '',
                  direccion_cliente: cliente.direccion || '',
                  telefono_cliente: cliente.telefono || '',
                  correo_cliente: cliente.email || '',
                  provincia: cliente.provincia || '',
                  canton: cliente.canton || '',
                  telefono2: cliente.telefono2 || ''
                });
                setShowEditModal(true);
              }} title="Editar Cliente" style={{ background: '#3b82f6', border: 'none', cursor: 'pointer', color: 'white', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="fas fa-pen"></i> Editar
              </button>
              <button className="btn-icon" onClick={() => { onChange(null); if (onConvenioFound) onConvenioFound(null); }} title="Cambiar Cliente" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <i className="fas fa-times-circle" style={{color: '#ef4444'}}></i>
              </button>
            </div>
          </div>
          <div className="client-details" style={{ fontSize: '11px', marginTop: '6px', lineHeight: '1.6' }}>
            <p style={{ margin: 0 }}><strong>C.I./RUC:</strong> {cliente.cedula}</p>
            {esConsumidorFinal ? (
              <div style={{ display: 'grid', gap: '6px', marginTop: '6px' }}>
                <div>
                  <label style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', display: 'block' }}>Nombre</label>
                  <input type="text" className={inputClass} value={cliente.nombres}
                    onChange={(e) => onChange({ ...cliente, nombres: e.target.value.toUpperCase() })}
                    placeholder="Nombre del consumidor final" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <label style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', display: 'block' }}>Teléfono</label>
                    <input type="text" className={inputClass} value={cliente.telefono}
                      onChange={(e) => onChange({ ...cliente, telefono: e.target.value.replace(/\D/g, '') })}
                      placeholder="Teléfono" />
                  </div>
                  <div>
                    <label style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', display: 'block' }}>Email</label>
                    <input type="email" className={inputClass} value={cliente.email}
                      onChange={(e) => onChange({ ...cliente, email: e.target.value })}
                      placeholder="correo@ejemplo.com" />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', display: 'block' }}>Dirección</label>
                  <input type="text" className={inputClass} value={cliente.direccion}
                    onChange={(e) => onChange({ ...cliente, direccion: e.target.value.toUpperCase() })}
                    placeholder="Dirección" />
                </div>
              </div>
            ) : (
              <>
                <p style={{ margin: 0 }}><strong>Dirección:</strong> {cliente.direccion}</p>
                <p style={{ margin: 0 }}><strong>Teléfono:</strong> {cliente.telefono}</p>
                {cliente.email && <p style={{ margin: 0 }}><strong>Email:</strong> {cliente.email}</p>}
              </>
            )}
          </div>
        </div>
      )}
      
      {/* ── Modal Editar Cliente ──────────────────────────────── */}
      <Modal isOpen={showEditModal} onClose={() => { if (!editLoading) setShowEditModal(false); }} title={`Editar ${tipo}`} width="max-w-lg">
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className={labelClass}>Identificación</label>
              <input className={inputClass} value={editFormData.identificacion_cliente}
                onChange={(e) => setEditFormData({...editFormData, identificacion_cliente: e.target.value.replace(/\D/g, '')})}
                maxLength={13} />
            </div>
            <div>
              <label className={labelClass}>Tipo ID</label>
              <select className={inputClass} value={editFormData.tipo_identificacion_cliente}
                onChange={(e) => setEditFormData({...editFormData, tipo_identificacion_cliente: e.target.value})}>                  <option value="05">Cédula</option>
                  <option value="04">RUC</option>
                  <option value="06">Pasaporte</option>
                  <option value="08">Identificación del Exterior</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className={labelClass}>Nombre / Razón Social *</label>
                <input className={inputClass} value={editFormData.nombre_cliente}
                onChange={(e) => setEditFormData({...editFormData, nombre_cliente: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className={labelClass}>Dirección</label>
              <input className={inputClass} value={editFormData.direccion_cliente}
                onChange={(e) => setEditFormData({...editFormData, direccion_cliente: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input className={inputClass} value={editFormData.telefono_cliente}
                onChange={(e) => setEditFormData({...editFormData, telefono_cliente: e.target.value.replace(/\D/g, '')})} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className={labelClass}>Email</label>
              <input className={inputClass} type="email" value={editFormData.correo_cliente}
                onChange={(e) => setEditFormData({...editFormData, correo_cliente: e.target.value})} />
            </div>
            {!isRemitente && (
              <>
                <div>
                  <label className={labelClass}>Teléfono 2</label>
                  <input className={inputClass} value={editFormData.telefono2}
                    onChange={(e) => setEditFormData({...editFormData, telefono2: e.target.value.replace(/\D/g, '')})} />
                </div>
                <div>
                  <label className={labelClass}>Provincia</label>
                  <select className={inputClass} value={editFormData.provincia}
                    onChange={(e) => {
                      const idProv = e.target.value;
                      setEditFormData({...editFormData, provincia: idProv, canton: ''});
                      GuiaService.getCantonesPorProvincia(idProv).then(r => setEditCantones(r?.data || [])).catch(() => setEditCantones([]));
                    }}
                    onFocus={() => {
                      GuiaService.getProvinciasCombo().then(r => setEditProvincias(r?.data || [])).catch(() => {});
                    }}>
                    <option value="">Seleccione...</option>
                    {editProvincias.map(p => <option key={p.id || p.value} value={p.id || p.value}>{p.nombre || p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Ciudad</label>
                  <select className={inputClass} value={editFormData.canton}
                    onChange={(e) => setEditFormData({...editFormData, canton: e.target.value})}>
                    <option value="">Seleccione...</option>
                    {editCantones.map(c => <option key={c.id || c.value} value={c.id || c.value}>{c.nombre || c.label}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
            <button onClick={() => { if (!editLoading) setShowEditModal(false); }}
              disabled={editLoading}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-bold disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleSaveEdit} disabled={editLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-70 flex items-center gap-2">
              {editLoading ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-save"></i> Actualizar Cliente</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};