import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';
import { despachoService } from '../../../services/despacho.service';
import { vehiculoService } from '../../../services/vehiculo.service';
import { SearchableSelect } from '../../../components/common/SearchableSelect';

/**
 * Modal simplificado y elegante para crear nuevo despacho
 * Soporta 3 tipos: BUS | VEHÍCULO | CONVENIO
 */
export const NuevoDespachoModal = ({ onClose, onSuccess }) => {
  const [loadingInit, setLoadingInit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tipoDespacho, setTipoDespacho] = useState('BUS'); // 'BUS' | 'VEHICULO' | 'CONVENIO'
  const [modoManualVehiculo, setModoManualVehiculo] = useState(false);
  const loadedRef = useRef(false);

  const [datosCombo, setDatosCombo] = useState({
    oficinistas: [],
    buses: [],
    personal: [],
    sucursales: [],
    vehiculos: [],
    companias: []
  });

  const [formData, setFormData] = useState({
    // General
    id_fkoficinista_despacho_maestro: '',
    nombre_oficinista: '',
    fecha_despacho_maestro: new Date().toISOString().slice(0, 16),
    estado_despacho_maestro: '1',

    // BUS
    id_fkbus_despacho_maestro: '',
    nombre_bus_raw: '',
    id_personal: '',

    // VEHÍCULO
    id_fkvehiculo_despacho: '',
    tipo_vehiculo: 'Camión',
    numero_vehiculo: '',
    placa_vehiculo: '',
    responsable_despacho: '',

    // OFICINA / CONVENIO & COMUNES
    id_fkorigen_despacho: '',
    nombre_origen: '',
    oficina_usuario: '', // ID Destino (Sucursal o Compañía Asociada)
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
      let nombreUsuario = '';
      if (userRes.data?.success) {
        const u = userRes.data.data;
        idUsuario = u.id_usuario;
        nombreUsuario = `${u.nombre_usuario || ''} ${u.apellido_usuario || ''}`.trim() || u.username_usuario || 'Usuario en sesión';
        idOficinaUsuario = String(u.id_fksucursal_usuario || u.sucursal_usuario || u.id_fkdestino_usuario || '');
        nombreOficinaUsuario = u.nombre_sucursal || u.suc_nombre || '';
      }

      // 2. Cargar combos en paralelo (Sucursales, Buses, Personal, Vehículos y Compañías Asociadas)
      const [ofiRes, busRes, perRes, sucRes, vehRes, compRes] = await Promise.all([
        api.get('/usuario/usuarioSeleccionarOficinista'),
        api.get('/buses/seleccionarBuses', { params: { numero_bloque: 1, tamanio_bloque: 500 } }),
        api.get('/personal/personalSelectCombo'),
        api.get('/sucursal/comboSucursal'),
        vehiculoService.combo(),
        api.get('/companiaasociada/companiaasociadaSeleccionPaginadoCombo').catch(() => ({ data: { data: [] } }))
      ]);

      const sucursalesRaw = sucRes.data?.data || [];
      const sucursales = sucursalesRaw.filter(s => s.id_sucursal !== 0 && s.id_sucursal !== '0');
      const vehiculos = vehRes.data || [];
      const companias = compRes.data?.data || compRes.data || [];

      setDatosCombo({
        oficinistas: ofiRes.data?.data || [],
        buses: busRes.data?.data || [],
        personal: perRes.data?.data || [],
        sucursales: sucursales,
        vehiculos: vehiculos,
        companias: Array.isArray(companias) ? companias : []
      });

      // Encontrar sucursal de origen del usuario
      const sucOrigenEncontrada = sucursales.find(s => 
        String(s.suc_codigo_sucursal) === idOficinaUsuario || String(s.id_sucursal) === idOficinaUsuario
      );
      const origenIdFinal = sucOrigenEncontrada ? String(sucOrigenEncontrada.suc_codigo_sucursal || sucOrigenEncontrada.id_sucursal) : (sucursales.length > 0 ? String(sucursales[0].suc_codigo_sucursal || sucursales[0].id_sucursal) : '');
      const origenNombreFinal = sucOrigenEncontrada?.nombre_sucursal || nombreOficinaUsuario;

      // Auto-set oficinista, responsable y sucursal de origen fija
      setFormData(prev => ({
        ...prev,
        id_fkoficinista_despacho_maestro: idUsuario,
        nombre_oficinista: nombreUsuario,
        responsable_despacho: nombreUsuario,
        id_fkorigen_despacho: origenIdFinal,
        nombre_origen: origenNombreFinal
      }));

    } catch (err) {
      console.error('Error cargando combos:', err);
      toast.error('Error al cargar datos del formulario');
    } finally {
      setLoadingInit(false);
    }
  };

  // Manejar cambio de tipo de despacho
  const handleCambioTipo = (nuevoTipo) => {
    setTipoDespacho(nuevoTipo);
    setFormData(prev => ({
      ...prev,
      oficina_usuario: '',
      nombre_destino_raw: '',
      responsable_despacho: prev.nombre_oficinista || ''
    }));
  };

  // Manejar selección de bus
  const handleSelectBus = async (busDisco) => {
    setFormData(prev => ({ ...prev, id_fkbus_despacho_maestro: busDisco }));
    if (!busDisco) return;

    try {
      const res = await api.get('/personal/buscarPorBus', { params: { id_bus: busDisco } });
      if (res.data?.success && res.data?.data?.length > 0) {
        const personal = res.data.data[0];
        if (personal.id_fkpersonal_buses) {
          const perEncontrado = datosCombo.personal.find(p => 
            String(p.id_personal) === String(personal.id_fkpersonal_buses)
          );
          if (perEncontrado) {
            setFormData(prev => ({
              ...prev,
              id_personal: String(perEncontrado.per_codigo_personal || perEncontrado.id_personal)
            }));
          }
        }
      }
    } catch (e) {
      console.error('Error cargando personal del bus:', e);
    }
  };

  // Manejar selección de vehículo registrado
  const handleSelectVehiculo = (idVehiculo) => {
    if (!idVehiculo) {
      setFormData(prev => ({
        ...prev,
        id_fkvehiculo_despacho: '',
        numero_vehiculo: '',
        placa_vehiculo: '',
        responsable_despacho: prev.nombre_oficinista || ''
      }));
      return;
    }

    const veh = datosCombo.vehiculos.find(v => String(v.id_vehiculo) === String(idVehiculo));
    if (veh) {
      setFormData(prev => ({
        ...prev,
        id_fkvehiculo_despacho: veh.id_vehiculo,
        tipo_vehiculo: veh.tipo_vehiculo || 'Camión',
        numero_vehiculo: veh.numero_vehiculo || '',
        placa_vehiculo: veh.placa_vehiculo || '',
        responsable_despacho: veh.nombre_responsable || prev.nombre_oficinista || ''
      }));
      setModoManualVehiculo(false);
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (tipoDespacho === 'BUS') {
      if (!formData.id_fkbus_despacho_maestro) {
        toast.error('Debe seleccionar un bus');
        return;
      }
      if (!formData.oficina_usuario) {
        toast.error('Debe seleccionar la sucursal de destino');
        return;
      }
    } else if (tipoDespacho === 'VEHICULO') {
      if (!formData.placa_vehiculo?.trim() && !formData.numero_vehiculo?.trim()) {
        toast.error('Debe seleccionar o ingresar un vehículo (número o placa)');
        return;
      }
      if (!formData.oficina_usuario) {
        toast.error('Debe seleccionar la sucursal de destino');
        return;
      }
    } else if (tipoDespacho === 'CONVENIO') {
      if (!formData.oficina_usuario) {
        toast.error('Debe seleccionar la compañía asociada de destino');
        return;
      }
    }

    setSaving(true);
    try {
      const busSel = datosCombo.buses.find(b => String(b.bus_disco || b.disco_buses || b.id_buses) === String(formData.id_fkbus_despacho_maestro));
      const perSel = datosCombo.personal.find(p => String(p.per_codigo_personal || p.id_personal) === String(formData.id_personal));
      const sucDestinoSel = datosCombo.sucursales.find(s => String(s.suc_codigo_sucursal || s.id_sucursal) === String(formData.oficina_usuario));
      const compDestinoSel = datosCombo.companias.find(c => String(c.id_compania_asociada || c.id_compania) === String(formData.oficina_usuario));
      const sucOrigenSel = datosCombo.sucursales.find(s => String(s.suc_codigo_sucursal || s.id_sucursal) === String(formData.id_fkorigen_despacho));
      const ofiSel = datosCombo.oficinistas.find(o => String(o.id_usuario) === String(formData.id_fkoficinista_despacho_maestro));

      const ofiNombre = ofiSel ? `${ofiSel.nombre_usuario || ''} ${ofiSel.apellido_usuario || ''}`.trim() : (formData.nombre_oficinista || '');
      const origenNombre = sucOrigenSel?.nombre_sucursal || formData.nombre_origen || '';
      const destinoNombre = (tipoDespacho === 'CONVENIO' 
        ? (compDestinoSel?.nombre_compania_asociada || formData.nombre_destino_raw || '') 
        : (sucDestinoSel?.nombre_sucursal || formData.nombre_destino_raw || '')).trim();
      const responsableFinal = (formData.responsable_despacho || ofiNombre).trim();

      let payload = {
        tipo_despacho: tipoDespacho,
        id_fkoficinista_despacho_maestro: formData.id_fkoficinista_despacho_maestro,
        nombre_oficinista: ofiNombre,
        fecha_despacho_maestro: formData.fecha_despacho_maestro,
        estado_despacho_maestro: '1',
        oficina_usuario: formData.oficina_usuario,
        nombre_destino: destinoNombre,
        id_fkorigen_despacho: formData.id_fkorigen_despacho || null,
        nombre_origen: origenNombre,
        id_fkbus_despacho_maestro: '',
        id_personal: '',
        nombre_busero: '',
        nombre_bus: '',
        responsable_despacho: responsableFinal
      };

      if (tipoDespacho === 'BUS') {
        const nomBus = busSel ? `Bus ${busSel.bus_disco || busSel.disco_buses || ''} (${busSel.bus_placa || busSel.placa_buses || ''})` : `Bus ${formData.id_fkbus_despacho_maestro}`;
        const nomBusero = perSel ? `${perSel.per_nombres_persona || ''} ${perSel.per_apellidos_personal || ''}`.trim() : '';

        payload = {
          ...payload,
          id_fkbus_despacho_maestro: formData.id_fkbus_despacho_maestro,
          id_personal: formData.id_personal || '',
          nombre_bus: nomBus,
          nombre_busero: nomBusero
        };
      } else if (tipoDespacho === 'VEHICULO') {
        const nomBusVeh = `${formData.tipo_vehiculo || 'Vehículo'} #${formData.numero_vehiculo || ''} (${formData.placa_vehiculo || 'S/P'})`;

        payload = {
          ...payload,
          id_fkbus_despacho_maestro: formData.numero_vehiculo || formData.placa_vehiculo || 'VEH',
          nombre_bus: nomBusVeh,
          nombre_busero: responsableFinal,
          id_fkvehiculo_despacho: formData.id_fkvehiculo_despacho || null,
          tipo_vehiculo: formData.tipo_vehiculo,
          numero_vehiculo: formData.numero_vehiculo,
          placa_vehiculo: formData.placa_vehiculo,
          responsable_despacho: responsableFinal
        };
      } else if (tipoDespacho === 'CONVENIO') {
        const nomDespConv = `Convenio: ${origenNombre} → ${destinoNombre}`;

        payload = {
          ...payload,
          id_fkbus_despacho_maestro: 'CONVENIO',
          nombre_bus: nomDespConv,
          nombre_busero: responsableFinal,
          responsable_despacho: responsableFinal
        };
      }

      const res = await despachoService.insertarActualizar(payload);

      if (res?.success) {
        const msg = typeof res.mensaje === 'string' ? res.mensaje : 'Despacho creado exitosamente';
        toast.success(msg);
        onSuccess?.();
        onClose?.();
      } else {
        const msgErr = typeof res?.mensaje === 'string' ? res.mensaje : 'Error al guardar el despacho';
        toast.error(msgErr);
      }
    } catch (err) {
      console.error('Error guardando despacho:', err);
      toast.error('Error de servidor al guardar el despacho');
    } finally {
      setSaving(false);
    }
  };

  // Opciones formateadas para Selects
  const opcionesBuses = datosCombo.buses.map(b => ({
    value: String(b.bus_disco || b.disco_buses || b.id_buses),
    label: `Bus #${b.bus_disco || b.disco_buses || '?'} — Placa: ${b.bus_placa || b.placa_buses || 'S/P'}`
  }));

  const opcionesPersonal = datosCombo.personal.map(p => ({
    value: String(p.per_codigo_personal || p.id_personal),
    label: `${p.per_cedula_personal ? `[${p.per_cedula_personal}] ` : ''}${p.per_nombres_persona || ''} ${p.per_apellidos_personal || ''}`.trim()
  }));

  const opcionesSucursales = datosCombo.sucursales.map(s => ({
    value: String(s.suc_codigo_sucursal || s.id_sucursal),
    label: `${s.nombre_sucursal || `Sucursal #${s.id_sucursal}`}${s.suc_codigo_sucursal ? ` (Cód. ${s.suc_codigo_sucursal})` : ''}`
  }));

  const opcionesCompanias = datosCombo.companias.map(c => ({
    value: String(c.id_compania_asociada || c.id_compania),
    label: `${c.nombre_compania_asociada || c.nombre || 'Compañía'}${c.ruc_compania_asociada ? ` (RUC: ${c.ruc_compania_asociada})` : ''}`
  }));

  const opcionesVehiculos = datosCombo.vehiculos.map(v => ({
    value: String(v.id_vehiculo),
    label: `${v.tipo_vehiculo || 'Vehículo'} #${v.numero_vehiculo || '?'} — Placa: ${v.placa_vehiculo || 'S/P'} ${v.nombre_responsable ? `(${v.nombre_responsable})` : ''}`
  }));

  const vehiculoSeleccionadoObj = datosCombo.vehiculos.find(v => String(v.id_vehiculo) === String(formData.id_fkvehiculo_despacho));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* ─── HEADER ─── */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <i className="fas fa-truck-loading text-lg"></i>
            </div>
            <div>
              <h2 className="text-white font-black text-base tracking-tight">Nuevo Despacho</h2>
              <p className="text-slate-400 text-xs">Seleccione el modo de transporte y destino del despacho</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center"
          >
            <i className="fas fa-times text-base"></i>
          </button>
        </div>

        {/* ─── TABS DE TIPO DE DESPACHO ─── */}
        <div className="px-6 pt-5 pb-2">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleCambioTipo('BUS')}
              className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${
                tipoDespacho === 'BUS'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <i className="fas fa-bus text-xs"></i>
              <span>1. Bus</span>
            </button>

            <button
              type="button"
              onClick={() => handleCambioTipo('VEHICULO')}
              className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${
                tipoDespacho === 'VEHICULO'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <i className="fas fa-truck-pickup text-xs"></i>
              <span>2. Vehículo</span>
            </button>

            <button
              type="button"
              onClick={() => handleCambioTipo('CONVENIO')}
              className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${
                tipoDespacho === 'CONVENIO'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <i className="fas fa-handshake text-xs"></i>
              <span>3. Convenio</span>
            </button>
          </div>
        </div>

        {/* ─── BODY (SCROLLABLE & COMPACTO) ─── */}
        <div className="p-6 pt-2 flex flex-col gap-4 overflow-y-auto">
          
          {/* ═══════════════════════════════════════════════════════════════════
              MODO 1: BUS
             ═══════════════════════════════════════════════════════════════════ */}
          {tipoDespacho === 'BUS' && (
            <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
              
              {/* Sucursal Origen (Fija) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Sucursal Origen (Emisora)
                  </label>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <i className="fas fa-lock text-[9px]"></i> Fijo
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs">
                  <i className="fas fa-building text-slate-400"></i>
                  <span>{formData.nombre_origen || 'Sucursal del Usuario'}</span>
                </div>
              </div>

              {/* Bus */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bus <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={opcionesBuses}
                  value={formData.id_fkbus_despacho_maestro}
                  onChange={handleSelectBus}
                  placeholder="Buscar bus por número o placa..."
                />
              </div>

              {/* Conductor / Busero */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Conductor / Busero
                </label>
                <SearchableSelect
                  options={opcionesPersonal}
                  value={formData.id_personal}
                  onChange={(val) => setFormData(p => ({ ...p, id_personal: val }))}
                  placeholder="Seleccionar conductor..."
                />
              </div>

              {/* Destino (Sucursal) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sucursal de Destino <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={opcionesSucursales}
                  value={formData.oficina_usuario}
                  onChange={(val) => {
                    const suc = datosCombo.sucursales.find(s => String(s.suc_codigo_sucursal || s.id_sucursal) === String(val));
                    setFormData(p => ({ ...p, oficina_usuario: val, nombre_destino_raw: suc?.nombre_sucursal || '' }));
                  }}
                  placeholder="Seleccionar sucursal de destino..."
                />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MODO 2: VEHÍCULO
             ═══════════════════════════════════════════════════════════════════ */}
          {tipoDespacho === 'VEHICULO' && (
            <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
              
              {/* Sucursal Origen (Fija) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Sucursal Origen (Emisora)
                  </label>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <i className="fas fa-lock text-[9px]"></i> Fijo
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs">
                  <i className="fas fa-building text-slate-400"></i>
                  <span>{formData.nombre_origen || 'Sucursal del Usuario'}</span>
                </div>
              </div>

              {/* Selector principal de Vehículo */}
              {!modoManualVehiculo ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Vehículo de la Cooperativa <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setModoManualVehiculo(true)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      + Ingresar manual
                    </button>
                  </div>
                  <SearchableSelect
                    options={opcionesVehiculos}
                    value={formData.id_fkvehiculo_despacho}
                    onChange={handleSelectVehiculo}
                    placeholder="Seleccionar vehículo (Camión, Camioneta o Auto)..."
                  />
                  
                  {/* Resumen sutil del vehículo seleccionado */}
                  {vehiculoSeleccionadoObj && (
                    <div className="mt-2 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          <i className={`fas ${
                            (vehiculoSeleccionadoObj.tipo_vehiculo || '').includes('Camioneta') ? 'fa-truck-pickup' :
                            (vehiculoSeleccionadoObj.tipo_vehiculo || '').includes('Auto') ? 'fa-car' : 'fa-truck'
                          }`}></i>
                        </div>
                        <div>
                          <div className="font-bold text-indigo-950">
                            {vehiculoSeleccionadoObj.tipo_vehiculo || 'Vehículo'} #{vehiculoSeleccionadoObj.numero_vehiculo || '?'}
                            <span className="ml-2 font-mono font-normal text-slate-600">[{vehiculoSeleccionadoObj.placa_vehiculo || 'S/P'}]</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Resp: {vehiculoSeleccionadoObj.nombre_responsable || formData.nombre_oficinista || 'Sin asignar'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                        EN TRASLADO
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Entrada Manual Compacta */
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Datos Manuales de Vehículo</span>
                    <button
                      type="button"
                      onClick={() => setModoManualVehiculo(false)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      ← Volver a lista
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {['Camión', 'Camioneta', 'Automóvil'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, tipo_vehiculo: cat }))}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                          formData.tipo_vehiculo === cat
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">N° Vehículo</label>
                      <input
                        type="text"
                        value={formData.numero_vehiculo}
                        onChange={e => setFormData(p => ({ ...p, numero_vehiculo: e.target.value }))}
                        placeholder="Ej. 1"
                        className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs font-bold uppercase outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Placa</label>
                      <input
                        type="text"
                        value={formData.placa_vehiculo}
                        onChange={e => setFormData(p => ({ ...p, placa_vehiculo: e.target.value.toUpperCase() }))}
                        placeholder="Ej. TBA-8026"
                        className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs font-bold uppercase outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Responsable / Conductor</label>
                    <input
                      type="text"
                      value={formData.responsable_despacho}
                      onChange={e => setFormData(p => ({ ...p, responsable_despacho: e.target.value }))}
                      placeholder="Nombre del conductor o responsable..."
                      className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Sucursal Destino */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sucursal Destino <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={opcionesSucursales}
                  value={formData.oficina_usuario}
                  onChange={(val) => {
                    const suc = datosCombo.sucursales.find(s => String(s.suc_codigo_sucursal || s.id_sucursal) === String(val));
                    setFormData(p => ({ ...p, oficina_usuario: val, nombre_destino_raw: suc?.nombre_sucursal || '' }));
                  }}
                  placeholder="Seleccionar sucursal de destino..."
                />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MODO 3: CONVENIO (Compañía Asociada)
             ═══════════════════════════════════════════════════════════════════ */}
          {tipoDespacho === 'CONVENIO' && (
            <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
              
              {/* Sucursal Origen (Bloqueada / Fija) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Sucursal Origen (Emisora)
                  </label>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <i className="fas fa-lock text-[9px]"></i> Fijo
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs">
                  <i className="fas fa-building text-slate-400"></i>
                  <span>{formData.nombre_origen || 'Sucursal del Usuario'}</span>
                </div>
              </div>

              {/* Compañía Asociada Destino */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Compañía Asociada (Convenio / Destino) <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={opcionesCompanias}
                  value={formData.oficina_usuario}
                  onChange={(val) => {
                    const comp = datosCombo.companias.find(c => String(c.id_compania_asociada || c.id_compania) === String(val));
                    setFormData(p => ({ ...p, oficina_usuario: val, nombre_destino_raw: comp?.nombre_compania_asociada || '' }));
                  }}
                  placeholder="Seleccionar compañía asociada de convenio..."
                />
              </div>

              {/* Responsable (Bloqueado / Fijo) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Responsable del Despacho
                  </label>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <i className="fas fa-lock text-[9px]"></i> Fijo
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs">
                  <i className="fas fa-user-shield text-slate-400"></i>
                  <span>{formData.nombre_oficinista || 'Usuario en sesión'}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Asignado automáticamente al usuario activo en sesión.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* ─── FOOTER ─── */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Emisor: <span className="font-semibold text-slate-700">{formData.nombre_oficinista || 'Oficinista'}</span>
          </div>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={onClose} 
              className="h-9 px-4 text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-bold transition-colors text-xs uppercase tracking-wider" 
              disabled={saving}
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={handleSubmit} 
              disabled={saving}
              className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 text-xs uppercase tracking-wider disabled:opacity-60"
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

export default NuevoDespachoModal;

