import { useState, useEffect, useRef } from 'react';
import { api } from '../../../config/axios';
import { useAuth } from '../../../context/AuthContext';
import { despachoConvenioService } from '../../../services/despachoConvenio.service';
import toast from 'react-hot-toast';

export const NuevoDespachoGuiaCompaniaModal = ({ onClose, onSuccess }) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [buscandoBus, setBuscandoBus] = useState(false);
  const [busEncontrado, setBusEncontrado] = useState(null);
  const loadedRef = useRef(false);
  const [combos, setCombos] = useState({
    oficinistas: [],
    buses: [],
    destinos: [],
    personal: []
  });

  const [formData, setFormData] = useState({
    id_fkoficinista_despacho_maestro: user?.id_usuario || user?.id || '',
    id_fkbus_despacho_maestro: '',
    nombre_bus_raw: '',
    id_personal: '',
    fecha_despacho_maestro: new Date().toISOString().slice(0, 16).replace('T', ' '),
    oficina_usuario: '',
    destino: '',
    estado_despacho_maestro: '1'
  });

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    cargarCombos();
    // Auto-set oficinista from user
    if (user?.id_usuario || user?.id) {
      setFormData(prev => ({
        ...prev,
        id_fkoficinista_despacho_maestro: String(user.id_usuario || user.id)
      }));
    }
  }, []);

  const cargarCombos = async () => {
    try {
      const [resOficinistas, resBuses, resDestinos, resPersonal] = await Promise.allSettled([
        api.get('/usuario/usuarioSeleccionarOficinista'),
        api.get('/buses/seleccionarBuses', { params: { page: 1, limit: 50 } }),
        api.get('/destino/destinoSeleccionCombo', { params: { numero_bloque: 1, tamanio_bloque: 50 } }),
        api.get('/personal/personalSelectCombo')
      ]);

      let oficinistas = [];
      if (resOficinistas.status === 'fulfilled' && resOficinistas.value.data?.data) {
        oficinistas = resOficinistas.value.data.data;
      }

      let buses = [];
      if (resBuses.status === 'fulfilled' && resBuses.value.data?.data) {
        buses = resBuses.value.data.data;
      }

      let destinos = [];
      if (resDestinos.status === 'fulfilled' && resDestinos.value.data?.data) {
        destinos = resDestinos.value.data.data;
      }

      let personal = [];
      if (resPersonal.status === 'fulfilled' && resPersonal.value.data?.data) {
        personal = resPersonal.value.data.data;
      }

      setCombos({ oficinistas, buses, destinos, personal });
    } catch (error) {
      console.error('Error cargando combos:', error);
      toast.error('Error al cargar datos del formulario');
    }
  };

  // Buscar bus por número/placa/disco en la lista cargada
  const buscarBus = async () => {
    const texto = formData.nombre_bus_raw.trim();
    if (!texto) { toast.error('Ingrese un número de bus'); return; }
    setBuscandoBus(true);
    setBusEncontrado(null);

    try {
      const bus = combos.buses.find(b => {
        const cod = String(b.codigo_buses || b.bus_codigo || '').toLowerCase();
        const placa = String(b.bus_placa || b.placa_buses || '').toLowerCase();
        const disco = String(b.bus_disco || b.disco_buses || '').toLowerCase();
        return cod === texto.toLowerCase() || placa.includes(texto.toLowerCase()) || disco.includes(texto.toLowerCase());
      });

      if (bus) {
        const discoBus = bus.bus_disco || bus.disco_buses || '';
        
        // No reemplazar el input, conservar lo que escribió el usuario
        setFormData(prev => ({ ...prev, id_fkbus_despacho_maestro: discoBus }));
        setBusEncontrado(bus);
        
        // Auto-cargar personal asignado al bus
        const res = await api.get('/personal/buscarPorBus', { params: { id_bus: discoBus } });
        if (res.data?.success && res.data?.data?.length > 0) {
          const personal = res.data.data[0];
          if (personal.id_fkpersonal_buses) {
            const perEncontrado = combos.personal.find(p => 
              String(p.id_personal) === String(personal.id_fkpersonal_buses)
            );
            if (perEncontrado) {
              setFormData(prev => ({
                ...prev,
                id_personal: perEncontrado.per_codigo_personal || perEncontrado.id_personal,
              }));
              toast.success(`Bus encontrado (Disco ${discoBus}). Personal: ${perEncontrado.per_nombres_persona}`);
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
        toast.error('Bus no encontrado.');
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

  const handleSubmit = async () => {
    // Validations
    if (!formData.id_fkbus_despacho_maestro) {
      toast.error('Debe seleccionar un bus');
      return;
    }
    if (!formData.oficina_usuario) {
      toast.error('Debe seleccionar un destino/oficina');
      return;
    }

    setLoading(true);
    try {
      // Get raw values for nombre_oficinista and nombre_bus from combos
      const oficinistaSel = combos.oficinistas.find(
        o => String(o.id_usuario) === String(formData.id_fkoficinista_despacho_maestro)
      );
      const busSel = combos.buses.find(
        b => String(b.bus_disco || b.disco_buses || b.id_buses) === String(formData.id_fkbus_despacho_maestro)
      );
      const destinoSel = combos.destinos.find(
        d => String(d.id_destino) === String(formData.oficina_usuario)
      );

      // Extraer raw values (display text) como lo hace ExtJS con getRawValue()
      const nombreOficinista = oficinistaSel?.nombre_usuario || 
        (oficinistaSel ? `${oficinistaSel.nombre_usuario || ''} ${oficinistaSel.apellido_usuario || ''}`.trim() : '');
      const nombreBus = busSel?.codigo_buses || busSel?.placa_buses || busSel?.bus_placa || '';
      // Busero se obtiene del combo personal seleccionado
      const personalSel = combos.personal.find(
        p => String(p.per_codigo_personal || p.id_personal) === String(formData.id_personal)
      );
      const nombreBusero = personalSel?.per_nombres_persona || 
        `${personalSel?.per_nombre || ''} ${personalSel?.per_apellido || ''}`.trim() || '';
      const nombreDestino = destinoSel?.lugar_destino || '';

      const payload = {
        id_despacho_maestro: '', // Empty = create new
        id_fkoficinista_despacho_maestro: formData.id_fkoficinista_despacho_maestro,
        id_fkbus_despacho_maestro: formData.id_fkbus_despacho_maestro,
        nombre_oficinista: nombreOficinista,
        nombre_bus: nombreBus,
        fecha_despacho_maestro: formData.fecha_despacho_maestro,
        estado_despacho_maestro: formData.estado_despacho_maestro,
        oficina_usuario: formData.oficina_usuario,
        destino: nombreDestino,
        busero: nombreBusero
      };

      const res = await despachoConvenioService.crear(payload);
      if (res.data?.success || res.success) {
        toast.success('Despacho creado correctamente');
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        toast.error(res.data?.mensaje || res.mensaje || 'Error al crear despacho');
      }
    } catch (error) {
      console.error('Error creando despacho:', error);
      toast.error('Error al crear despacho');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <i className="fas fa-plus-circle text-sm"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Nuevo Despacho de Guía de Compañía</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Oficinista */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Oficinista</label>
              <select
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                value={formData.id_fkoficinista_despacho_maestro}
                disabled
              >
                <option value="">Seleccionar...</option>
                {combos.oficinistas.map(o => (
                  <option key={o.id_usuario} value={o.id_usuario}>
                    {o.nombre_usuario || `${o.nombre_usuario || ''} ${o.apellido_usuario || ''}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Bus - Búsqueda por número/placa */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Bus *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.nombre_bus_raw}
                  onChange={e => {
                    setFormData(p => ({ ...p, nombre_bus_raw: e.target.value.toUpperCase() }));
                    setBusEncontrado(null);
                  }}
                  onKeyDown={handleBuscarKeyDown}
                  placeholder="Ingrese placa, disco o código..."
                  className={`flex-1 h-9 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white ${
                    busEncontrado ? 'border-emerald-400 ring-emerald-200' : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-400'
                  }`}
                />
                <button
                  onClick={buscarBus}
                  disabled={buscandoBus}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                  title="Buscar bus"
                >
                  {buscandoBus ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <><i className="fas fa-search"></i> Buscar</>
                  )}
                </button>
              </div>
              {busEncontrado && (
                <div className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <i className="fas fa-check-circle"></i>
                  Bus seleccionado: Disco {busEncontrado.bus_disco || busEncontrado.disco_buses || '?'}
                </div>
              )}
            </div>

            {/* Personal (busero) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Personal (Busero)</label>
              <select
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={formData.id_personal}
                onChange={e => setFormData(prev => ({ ...prev, id_personal: e.target.value }))}
              >
                <option value="">Seleccionar personal...</option>
                {combos.personal.map(p => (
                  <option key={p.per_codigo_personal || p.id_personal} value={p.per_codigo_personal || p.id_personal}>
                    {p.per_nombres_persona || `${p.per_nombre || ''} ${p.per_apellido || ''}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha</label>
              <input
                type="datetime-local"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={formData.fecha_despacho_maestro}
                onChange={e => setFormData({ ...formData, fecha_despacho_maestro: e.target.value })}
              />
            </div>

            {/* Oficina / Destino */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Destino *</label>
              <select
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={formData.oficina_usuario}
                onChange={e => {
                  const val = e.target.value;
                  const destinoSel = combos.destinos.find(d => String(d.id_destino) === String(val));
                  setFormData(prev => ({
                    ...prev,
                    oficina_usuario: val,
                    destino: destinoSel?.lugar_destino || ''
                  }));
                }}
              >
                <option value="">Seleccionar destino...</option>
                {combos.destinos.map(d => (
                  <option key={d.id_destino} value={d.id_destino}>{d.lugar_destino}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Estado</label>
              <select
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                value={formData.estado_despacho_maestro}
                disabled
              >
                <option value="1">Activo</option>
                <option value="2">Terminado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-all"
          >
            <i className="fas fa-window-close mr-2"></i>Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i>Guardando...</>
            ) : (
              <><i className="fas fa-save mr-2"></i>Guardar</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
