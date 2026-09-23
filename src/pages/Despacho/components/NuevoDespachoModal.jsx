import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';
import { despachoService } from '../../../services/despacho.service';
import { vehiculoService } from '../../../services/vehiculo.service';
import { SearchableSelect } from '../../../components/common/SearchableSelect';

/**
 * Modal para crear nuevo despacho
 * Soporta 3 tipos: BUS | VEHÍCULO | OFICINA
 */
export const NuevoDespachoModal = ({ onClose, onSuccess }) => {
  const [loadingInit, setLoadingInit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tipoDespacho, setTipoDespacho] = useState('BUS'); // 'BUS' | 'VEHICULO' | 'OFICINA'
  const [buscandoBus, setBuscandoBus] = useState(false);
  const [busEncontrado, setBusEncontrado] = useState(null);
  const loadedRef = useRef(false);

  const [datosCombo, setDatosCombo] = useState({
    oficinistas: [],
    buses: [],
    personal: [],
    destinos: [],
    vehiculos: []
  });

  const [formData, setFormData] = useState({
    // General
    id_fkoficinista_despacho_maestro: '',
    fecha_despacho_maestro: new Date().toISOString().slice(0, 16),
    estado_despacho_maestro: '1',

    // BUS
    id_fkbus_despacho_maestro: '',
    nombre_bus_raw: '',
    id_personal: '',

    // VEHÍCULO
    id_fkvehiculo_despacho: '',
    tipo_vehiculo: 'Camión', // 'Camión' | 'Camioneta' | 'Automóvil'
    numero_vehiculo: '',
    placa_vehiculo: '',
    responsable_despacho: '',

    // OFICINA & COMUNES
    id_fkorigen_despacho: '',
    nombre_origen: '',
    oficina_usuario: '', // ID Destino
    nombre_destino_raw: ''
  });

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    initCombos();
  }, []);

  const initCombos = async () => {
    try {
      // 1. Obtener usuario actual
      const userRes = await api.get('/buscarUsuario');
      let idUsuario = '';
      let idOficinaUsuario = '';
      let nombreOficinaUsuario = '';
      if (userRes.data?.success) {
        idUsuario = userRes.data.data.id_usuario;
        idOficinaUsuario = userRes.data.data.id_fkdestino_usuario || userRes.data.data.sucursal_usuario || '';
        nombreOficinaUsuario = userRes.data.data.nombre_sucursal || userRes.data.data.suc_nombre || '';
      }

      // 2. Cargar combos en paralelo
      const [ofiRes, busRes, perRes, desRes, vehRes] = await Promise.all([
        api.get('/usuario/usuarioSeleccionarOficinista'),
        api.get('/buses/seleccionarBuses', { params: { numero_bloque: 1, tamanio_bloque: 500 } }),
        api.get('/personal/personalSelectCombo'),
        api.get('/destino/destinoSeleccionCombo'),
        vehiculoService.combo()
      ]);

      const destinos = desRes.data?.data || [];
      const vehiculos = vehRes.data || [];

      setDatosCombo({
        oficinistas: ofiRes.data?.data || [],
        buses: busRes.data?.data || [],
        personal: perRes.data?.data || [],
        destinos: destinos,
        vehiculos: vehiculos
      });

      // Auto-set oficinista y oficina de origen por defecto
      setFormData(prev => ({
        ...prev,
        id_fkoficinista_despacho_maestro: idUsuario,
        id_fkorigen_despacho: idOficinaUsuario || (destinos.length > 0 ? destinos[0].id_destino : ''),
        nombre_origen: nombreOficinaUsuario
      }));

    } catch (err) {
      console.error('Error cargando combos:', err);
      toast.error('Error al cargar datos del formulario');
    } finally {
      setLoadingInit(false);
    }
  };

  // Buscar bus por número/placa/disco
  const buscarBus = async () => {
    const texto = formData.nombre_bus_raw.trim();
    if (!texto) { toast.error('Ingrese un número o placa de bus'); return; }
    setBuscandoBus(true);
    setBusEncontrado(null);

    try {
      const bus = datosCombo.buses.find(b => {
        const cod = String(b.codigo_buses || b.bus_codigo || '').toLowerCase();
        const placa = String(b.bus_placa || b.placa_buses || '').toLowerCase();
        const disco = String(b.bus_disco || b.disco_buses || '').toLowerCase();
        return cod === texto.toLowerCase() || placa.includes(texto.toLowerCase()) || disco === texto.toLowerCase();
      });

      if (bus) {
        const discoBus = bus.bus_disco || bus.disco_buses || '';
        setFormData(prev => ({ ...prev, id_fkbus_despacho_maestro: discoBus }));
        setBusEncontrado(bus);
        
        // Auto-cargar personal asignado al bus
        const res = await api.get('/personal/buscarPorBus', { params: { id_bus: discoBus } });
        if (res.data?.success && res.data?.data?.length > 0) {
          const personal = res.data.data[0];
          if (personal.id_fkpersonal_buses) {
            const perEncontrado = datosCombo.personal.find(p => 
              String(p.id_personal) === String(personal.id_fkpersonal_buses)
            );
            if (perEncontrado) {
              setFormData(prev => ({
                ...prev,
                id_personal: perEncontrado.per_codigo_personal || perEncontrado.id_personal,
              }));
              toast.success(`Bus encontrado (Disco ${discoBus}). Conductor: ${perEncontrado.per_nombres_persona}`);
            } else {
              toast.success(`Bus encontrado (Disco ${discoBus})`);
            }
          } else {
            toast.success(`Bus encontrado (Disco ${discoBus})`);
          }
        } else {
          toast.success(`Bus encontrado (Disco ${discoBus})`);
        }
      } else {
        toast.error('Bus no encontrado');
        setFormData(prev => ({ ...prev, id_fkbus_despacho_maestro: '', id_personal: '' }));
      }
    } catch (err) {
      console.error('Error buscando bus:', err);
      toast.error('Error al buscar bus');
    } finally {
      setBuscandoBus(false);
    }
  };

  const handleBuscarKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarBus();
    }
  };

  // Manejar selección de vehículo de la cooperativa
  const handleSelectVehiculo = (idVehiculo) => {
    if (!idVehiculo) {
      setFormData(prev => ({
        ...prev,
        id_fkvehiculo_despacho: '',
        numero_vehiculo: '',
        placa_vehiculo: '',
        responsable_despacho: ''
      }));
      return;
    }

    const veh = datosCombo.vehiculos.find(v => String(v.id_vehiculo) === String(idVehiculo));
    if (veh) {
      setFormData(prev => ({
        ...prev,
        id_fkvehiculo_despacho: veh.id_vehiculo,
        tipo_vehiculo: veh.tipo_vehiculo || prev.tipo_vehiculo,
        numero_vehiculo: veh.numero_vehiculo || '',
        placa_vehiculo: veh.placa_vehiculo || '',
        responsable_despacho: veh.nombre_responsable || ''
      }));
    }
  };

  // Submit
  const handleSubmit = async () => {
    // Validaciones según tipo
    if (tipoDespacho === 'BUS') {
      if (!formData.id_fkbus_despacho_maestro) {
        toast.error('Debe seleccionar o buscar un bus');
        return;
      }
      if (!formData.oficina_usuario) {
        toast.error('Debe seleccionar la oficina de destino');
        return;
      }
    } else if (tipoDespacho === 'VEHICULO') {
      if (!formData.placa_vehiculo.trim() && !formData.numero_vehiculo.trim()) {
        toast.error('Debe ingresar o seleccionar un vehículo (número o placa)');
        return;
      }
      if (!formData.oficina_usuario) {
        toast.error('Debe seleccionar la oficina de destino');
        return;
      }
    } else if (tipoDespacho === 'OFICINA') {
      if (!formData.id_fkorigen_despacho) {
        toast.error('Debe seleccionar la oficina de origen');
        return;
      }
      if (!formData.oficina_usuario) {
        toast.error('Debe seleccionar la oficina de destino');
        return;
      }
      if (String(formData.id_fkorigen_despacho) === String(formData.oficina_usuario)) {
        toast.error('La oficina de origen y destino no pueden ser iguales');
        return;
      }
    }

    setSaving(true);
    try {
      const busSel = datosCombo.buses.find(b => String(b.bus_disco || b.disco_buses || b.id_buses) === String(formData.id_fkbus_despacho_maestro));
      const perSel = datosCombo.personal.find(p => String(p.per_codigo_personal || p.id_personal) === String(formData.id_personal));
      const desSel = datosCombo.destinos.find(d => String(d.id_destino) === String(formData.oficina_usuario));
      const oriSel = datosCombo.destinos.find(d => String(d.id_destino) === String(formData.id_fkorigen_despacho));
      const ofiSel = datosCombo.oficinistas.find(o => String(o.id_usuario) === String(formData.id_fkoficinista_despacho_maestro));

      const ofiNombre = ofiSel ? `${ofiSel.nombre_usuario || ''} ${ofiSel.apellido_usuario || ''}`.trim() : '';
      const origenNombre = oriSel?.lugar_destino || formData.nombre_origen || '';
      const destinoNombre = desSel?.lugar_destino || formData.nombre_destino_raw || '';

      let payload = {
        tipo_despacho: tipoDespacho,
        id_fkoficinista_despacho_maestro: formData.id_fkoficinista_despacho_maestro,
        nombre_oficinista: ofiNombre,
        fecha_despacho_maestro: formData.fecha_despacho_maestro,
        estado_despacho_maestro: '1',
        oficina_usuario: formData.oficina_usuario,
        destino: destinoNombre,
        id_fkorigen_despacho: formData.id_fkorigen_despacho || null,
        nombre_origen: origenNombre,
      };

      if (tipoDespacho === 'BUS') {
        payload = {
          ...payload,
          id_fkbus_despacho_maestro: formData.id_fkbus_despacho_maestro,
          nombre_bus: busSel?.codigo_buses || formData.nombre_bus_raw || `Bus #${formData.id_fkbus_despacho_maestro}`,
          busero: perSel?.per_nombres_persona || '',
          responsable_despacho: perSel?.per_nombres_persona || ''
        };
      } else if (tipoDespacho === 'VEHICULO') {
        const nomBusVeh = `${formData.tipo_vehiculo} #${formData.numero_vehiculo || formData.placa_vehiculo}`;
        payload = {
          ...payload,
          id_fkbus_despacho_maestro: 0,
          nombre_bus: nomBusVeh,
          id_fkvehiculo_despacho: formData.id_fkvehiculo_despacho || null,
          tipo_vehiculo: formData.tipo_vehiculo,
          numero_vehiculo: formData.numero_vehiculo,
          placa_vehiculo: formData.placa_vehiculo,
          responsable_despacho: formData.responsable_despacho,
          busero: formData.responsable_despacho
        };
      } else if (tipoDespacho === 'OFICINA') {
        payload = {
          ...payload,
          id_fkbus_despacho_maestro: 0,
          nombre_bus: 'TRASPASO OFICINA',
          responsable_despacho: formData.responsable_despacho || ofiNombre,
          busero: formData.responsable_despacho || ofiNombre
        };
      }

      const res = await despachoService.insertarActualizar(payload);
      if (res?.success) {
        toast.success(res.tipo === 0 ? 'Despacho creado exitosamente' : 'Despacho guardado exitosamente');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res?.mensaje || 'Error al guardar despacho');
      }
    } catch (err) {
      console.error('Error guardando despacho:', err);
      toast.error('Error al guardar despacho');
    } finally {
      setSaving(false);
    }
  };

  // Opciones para SearchableSelects
  const opcionesDestinos = datosCombo.destinos.map(d => ({
    value: String(d.id_destino),
    label: d.lugar_destino || d.nombre_destino || `Oficina #${d.id_destino}`
  }));

  const opcionesPersonal = datosCombo.personal.map(p => ({
    value: String(p.per_codigo_personal || p.id_personal),
    label: `${p.per_nombres_persona || `${p.per_nombre || ''} ${p.per_apellido || ''}`.trim()}${p.per_cedula_personal ? ` (${p.per_cedula_personal})` : ''}`
  }));

  // Vehículos filtrados o formateados
  const vehiculosFiltrados = datosCombo.vehiculos.filter(v => 
    !formData.tipo_vehiculo || v.tipo_vehiculo === formData.tipo_vehiculo
  );

  const opcionesVehiculos = (vehiculosFiltrados.length > 0 ? vehiculosFiltrados : datosCombo.vehiculos).map(v => ({
    value: String(v.id_vehiculo),
    label: `${v.tipo_vehiculo} #${v.numero_vehiculo || '?'} — Placa: ${v.placa_vehiculo || 'S/P'} ${v.nombre_responsable ? `(${v.nombre_responsable})` : ''}`
  }));

  if (loadingInit) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <i className="fas fa-spinner fa-spin text-3xl text-indigo-600 mb-4"></i>
          <p className="text-slate-600 font-medium">Cargando formulario de despacho...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <i className="fas fa-shipping-fast text-lg"></i>
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">Nuevo Despacho de Guías</h2>
              <p className="text-xs text-slate-300">Seleccione el modo de transporte y complete los datos</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* ─── SELECTOR DE TIPO DE DESPACHO ─── */}
        <div className="p-6 pb-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Tipo de Despacho <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {/* BUS */}
            <button
              type="button"
              onClick={() => setTipoDespacho('BUS')}
              className={`flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                tipoDespacho === 'BUS'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <i className="fas fa-bus text-sm"></i>
              <span>1. BUS</span>
            </button>

            {/* VEHÍCULO */}
            <button
              type="button"
              onClick={() => setTipoDespacho('VEHICULO')}
              className={`flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                tipoDespacho === 'VEHICULO'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <i className="fas fa-truck-moving text-sm"></i>
              <span>2. VEHÍCULO</span>
            </button>

            {/* OFICINA */}
            <button
              type="button"
              onClick={() => setTipoDespacho('OFICINA')}
              className={`flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                tipoDespacho === 'OFICINA'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <i className="fas fa-building text-sm"></i>
              <span>3. OFICINA</span>
            </button>
          </div>
        </div>

        {/* ─── FORMULARIO SEGÚN TIPO ─── */}
        <div className="p-6 pt-3 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          
          {/* OFICINISTA (Común) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Oficinista Responsable</label>
              <input
                type="text"
                value={datosCombo.oficinistas.find(o => String(o.id_usuario) === String(formData.id_fkoficinista_despacho_maestro))
                  ? `${datosCombo.oficinistas.find(o => String(o.id_usuario) === String(formData.id_fkoficinista_despacho_maestro)).nombre_usuario || ''} ${datosCombo.oficinistas.find(o => String(o.id_usuario) === String(formData.id_fkoficinista_despacho_maestro)).apellido_usuario || ''}`
                  : 'Usuario en sesión'}
                readOnly
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha y Hora de Emisión</label>
              <input
                type="datetime-local"
                value={formData.fecha_despacho_maestro}
                onChange={e => setFormData(p => ({ ...p, fecha_despacho_maestro: e.target.value }))}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              MODO 1: BUS (Funcionamiento actual idéntico)
             ═══════════════════════════════════════════════════════════════════ */}
          {tipoDespacho === 'BUS' && (
            <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-100 text-blue-900 font-bold text-xs">
                <i className="fas fa-bus text-blue-600"></i> Datos del Bus y Destino
              </div>

              {/* Bus con Búsqueda */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bus (Disco / Placa / Código) <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.nombre_bus_raw}
                    onChange={e => {
                      setFormData(p => ({ ...p, nombre_bus_raw: e.target.value.toUpperCase() }));
                      setBusEncontrado(null);
                    }}
                    onKeyDown={handleBuscarKeyDown}
                    placeholder="Ej. Disco 12 o Placa TBA-1234..."
                    className={`flex-1 px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 bg-white font-medium ${
                      busEncontrado ? 'border-emerald-400 ring-emerald-200 ring-2' : 'border-slate-300 focus:ring-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={buscarBus}
                    disabled={buscandoBus}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    {buscandoBus ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <><i className="fas fa-search"></i> Buscar</>
                    )}
                  </button>
                </div>
                {busEncontrado && (
                  <div className="mt-1.5 text-xs text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <i className="fas fa-check-circle text-emerald-600"></i>
                    Bus seleccionado: Disco {busEncontrado.bus_disco || busEncontrado.disco_buses || '?'} — Placa: {busEncontrado.bus_placa || busEncontrado.placa_buses || 'N/A'}
                  </div>
                )}
              </div>

              {/* Personal / Busero */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Personal / Conductor (Busero)
                </label>
                <SearchableSelect
                  options={opcionesPersonal}
                  value={formData.id_personal}
                  onChange={(val) => setFormData(p => ({ ...p, id_personal: val }))}
                  placeholder="Seleccionar conductor..."
                />
              </div>

              {/* Destino */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Oficina de Destino <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={opcionesDestinos}
                  value={formData.oficina_usuario}
                  onChange={(val) => setFormData(p => ({ ...p, oficina_usuario: val }))}
                  placeholder="Seleccionar oficina de destino..."
                />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MODO 2: VEHÍCULO (Camión | Camioneta | Automóvil)
             ═══════════════════════════════════════════════════════════════════ */}
          {tipoDespacho === 'VEHICULO' && (
            <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                <span className="text-indigo-900 font-bold text-xs flex items-center gap-2">
                  <i className="fas fa-truck-moving text-indigo-600"></i> Vehículo de la Cooperativa
                </span>
                <span className="text-[11px] text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-full font-medium">
                  Trazabilidad EN TRASLADO
                </span>
              </div>

              {/* Clasificación de Vehículo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Clasificación del Vehículo <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Camión', 'Camioneta', 'Automóvil'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, tipo_vehiculo: cat, id_fkvehiculo_despacho: '' }))}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                        formData.tipo_vehiculo === cat
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <i className={`fas ${cat === 'Camión' ? 'fa-truck' : cat === 'Camioneta' ? 'fa-truck-pickup' : 'fa-car'}`}></i>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Vehículo Registrado */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seleccionar Vehículo Registrado (por número, placa o responsable)
                </label>
                <SearchableSelect
                  options={opcionesVehiculos}
                  value={formData.id_fkvehiculo_despacho}
                  onChange={handleSelectVehiculo}
                  placeholder={`Buscar ${formData.tipo_vehiculo || 'vehículo'}...`}
                />
              </div>

              {/* Detalle manual / editable del vehículo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N° Vehículo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.numero_vehiculo}
                    onChange={e => setFormData(p => ({ ...p, numero_vehiculo: e.target.value }))}
                    placeholder="Ej. 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Placa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.placa_vehiculo}
                    onChange={e => setFormData(p => ({ ...p, placa_vehiculo: e.target.value.toUpperCase() }))}
                    placeholder="Ej. TBA-8026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Responsable / Conductor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.responsable_despacho}
                    onChange={e => setFormData(p => ({ ...p, responsable_despacho: e.target.value }))}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Ruta: Oficina Origen y Destino */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Oficina Origen
                  </label>
                  <SearchableSelect
                    options={opcionesDestinos}
                    value={formData.id_fkorigen_despacho}
                    onChange={(val) => setFormData(p => ({ ...p, id_fkorigen_despacho: val }))}
                    placeholder="Oficina de origen..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Oficina Destino <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={opcionesDestinos}
                    value={formData.oficina_usuario}
                    onChange={(val) => setFormData(p => ({ ...p, oficina_usuario: val }))}
                    placeholder="Oficina de destino..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MODO 3: OFICINA (Traspaso directo entre Oficinas)
             ═══════════════════════════════════════════════════════════════════ */}
          {tipoDespacho === 'OFICINA' && (
            <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-100 flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                <span className="text-amber-900 font-bold text-xs flex items-center gap-2">
                  <i className="fas fa-building text-amber-600"></i> Despacho Directo entre Oficinas
                </span>
                <span className="text-[11px] text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full font-medium">
                  Traspaso Interno
                </span>
              </div>

              {/* Ruta: Origen y Destino */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Oficina Origen <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={opcionesDestinos}
                    value={formData.id_fkorigen_despacho}
                    onChange={(val) => setFormData(p => ({ ...p, id_fkorigen_despacho: val }))}
                    placeholder="Seleccionar origen..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Oficina Destino <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={opcionesDestinos}
                    value={formData.oficina_usuario}
                    onChange={(val) => setFormData(p => ({ ...p, oficina_usuario: val }))}
                    placeholder="Seleccionar destino..."
                  />
                </div>
              </div>

              {/* Responsable del Traslado */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsable del Traslado / Encomienda <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.responsable_despacho}
                  onChange={e => setFormData(p => ({ ...p, responsable_despacho: e.target.value }))}
                  placeholder="Nombre de la persona o encargado que transporta la encomienda..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <i className="fas fa-info-circle text-slate-400"></i>
            Estado: <span className="font-semibold text-emerald-600">Activo</span>
          </div>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={onClose} 
              className="px-4 py-2 text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold transition-colors text-xs" 
              disabled={saving}
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={handleSubmit} 
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 text-xs disabled:opacity-60"
            >
              {saving ? (
                <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
              ) : (
                <><i className="fas fa-save"></i> Guardar Despacho</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
