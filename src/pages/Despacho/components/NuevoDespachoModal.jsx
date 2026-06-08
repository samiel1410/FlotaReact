import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../config/axios';
import { despachoService } from '../../../services/despacho.service';
import { BusquedaBusModal } from './BusquedaBusModal';

/**
 * Modal para crear nuevo despacho
 * Recrea NuevoDespacho del ExtJS
 */
export const NuevoDespachoModal = ({ onClose, onSuccess }) => {
  const [loadingInit, setLoadingInit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBusSearch, setShowBusSearch] = useState(false);
  const [datosCombo, setDatosCombo] = useState({
    oficinistas: [],
    buses: [],
    personal: [],
    destinos: []
  });

  const [formData, setFormData] = useState({
    id_fkoficinista_despacho_maestro: '',
    id_fkbus_despacho_maestro: '',
    nombre_bus_raw: '',
    id_personal: '',
    nombre_busero_raw: '',
    fecha_despacho_maestro: new Date().toISOString().slice(0, 16),
    oficina_usuario: '',
    nombre_destino_raw: '',
    estado_despacho_maestro: '1'
  });

  useEffect(() => {
    initCombos();
  }, []);

  const initCombos = async () => {
    try {
      // 1. Obtener usuario actual
      const userRes = await api.get('/buscarUsuario');
      let idUsuario = '';
      if (userRes.data?.success) {
        idUsuario = userRes.data.data.id_usuario;
      }

      // 2. Cargar combos
      const [ofiRes, busRes, perRes, desRes] = await Promise.all([
        api.get('/usuario/usuarioSeleccionarOficinista'),
        api.get('/buses/seleccionarBuses', { params: { numero_bloque: 1, tamanio_bloque: 500 } }),
        api.get('/personal/personalSelectCombo'),
        api.get('/destino/destinoSeleccionCombo')
      ]);

      setDatosCombo({
        oficinistas: ofiRes.data?.data || [],
        buses: busRes.data?.data || [],
        personal: perRes.data?.data || [],
        destinos: desRes.data?.data || []
      });

      // Auto-set oficinista
      setFormData(prev => ({
        ...prev,
        id_fkoficinista_despacho_maestro: idUsuario
      }));

    } catch (err) {
      console.error('Error cargando combos:', err);
      toast.error('Error al cargar datos del formulario');
    } finally {
      setLoadingInit(false);
    }
  };

  const handleBusChange = (e) => {
    const busId = e.target.value;
    setFormData(prev => ({
      ...prev,
      id_fkbus_despacho_maestro: busId,
      nombre_bus_raw: busId
    }));
  };

  const handleBusSelectFromModal = (bus) => {
    setFormData(prev => ({
      ...prev,
      id_fkbus_despacho_maestro: bus.bus_codigo,
      nombre_bus_raw: `${bus.bus_placa} - ${bus.bus_disco || ''}`
    }));
    setShowBusSearch(false);
  };

  const handleSubmit = async () => {
    if (!formData.id_fkbus_despacho_maestro) {
      toast.error('Debe seleccionar un bus');
      return;
    }

    setSaving(true);
    try {
      const busSel = datosCombo.buses.find(b => String(b.bus_codigo) === String(formData.id_fkbus_despacho_maestro));
      const perSel = datosCombo.personal.find(p => String(p.per_codigo_personal) === String(formData.id_personal));
      const desSel = datosCombo.destinos.find(d => String(d.id_destino) === String(formData.oficina_usuario));
      const ofiSel = datosCombo.oficinistas.find(o => String(o.id_usuario) === String(formData.id_fkoficinista_despacho_maestro));

      const payload = {
        ...formData,
        nombre_oficinista: ofiSel ? `${ofiSel.nombre_usuario || ''} ${ofiSel.apellido_usuario || ''}`.trim() : '',
        nombre_bus: busSel?.codigo_buses || formData.nombre_bus_raw || '',
        destino: desSel?.lugar_destino || formData.nombre_destino_raw || '',
        busero: perSel?.per_nombres_persona || ''
      };

      const res = await despachoService.insertarActualizar(payload);
      if (res?.success) {
        toast.success(res.tipo === 0 ? 'Despacho creado exitosamente' : 'Despacho actualizado exitosamente');
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

  if (loadingInit) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center">
          <i className="fas fa-spinner fa-spin text-3xl text-blue-600 mb-4"></i>
          <p className="text-slate-600 font-medium">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
            <h2 className="text-white font-bold flex items-center gap-2">
              <i className="fas fa-plus-circle text-green-400"></i> Nuevo Despacho
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Form */}
          <div className="p-6 flex flex-col gap-4">
            {/* Oficinista */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Oficinista</label>
              <input
                type="text"
                value={datosCombo.oficinistas.find(o => String(o.id_usuario) === String(formData.id_fkoficinista_despacho_maestro))
                  ? `${datosCombo.oficinistas.find(o => String(o.id_usuario) === String(formData.id_fkoficinista_despacho_maestro)).nombre_usuario || ''} ${datosCombo.oficinistas.find(o => String(o.id_usuario) === String(formData.id_fkoficinista_despacho_maestro)).apellido_usuario || ''}`
                  : 'Cargando...'}
                readOnly
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 text-sm"
              />
            </div>

            {/* Bus */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Bus <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <select
                  value={formData.id_fkbus_despacho_maestro}
                  onChange={handleBusChange}
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Seleccionar bus...</option>
                  {datosCombo.buses.map(b => (
                    <option key={b.bus_codigo} value={b.bus_codigo}>
                      {b.codigo_buses || b.bus_placa || ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowBusSearch(true)}
                  className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                  title="Buscar bus"
                >
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </div>

            {/* Personal/Busero */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Personal (Busero)</label>
              <select
                value={formData.id_personal}
                onChange={e => setFormData(p => ({ ...p, id_personal: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Seleccionar personal...</option>
                {datosCombo.personal.map(p => (
                  <option key={p.per_codigo_personal || p.id_personal} value={p.per_codigo_personal || p.id_personal}>
                    {p.per_nombres_persona || `${p.per_nombre || ''} ${p.per_apellido || ''}`.trim()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Fecha */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha</label>
                <input
                  type="datetime-local"
                  value={formData.fecha_despacho_maestro}
                  onChange={e => setFormData(p => ({ ...p, fecha_despacho_maestro: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Estado</label>
                <input
                  type="text"
                  value="Activo"
                  readOnly
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 text-sm"
                />
              </div>
            </div>

            {/* Oficina/Destino */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Oficina / Destino</label>
              <select
                value={formData.oficina_usuario}
                onChange={e => setFormData(p => ({ ...p, oficina_usuario: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Seleccionar destino...</option>
                {datosCombo.destinos.map(d => (
                  <option key={d.id_destino} value={d.id_destino}>
                    {d.lugar_destino || d.nombre_destino || ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors text-sm" disabled={saving}>
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 text-sm disabled:opacity-60">
              {saving ? (
                <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
              ) : (
                <><i className="fas fa-save"></i> Guardar</>
              )}
            </button>
          </div>
        </div>
      </div>

      {showBusSearch && (
        <BusquedaBusModal
          onSelect={handleBusSelectFromModal}
          onClose={() => setShowBusSearch(false)}
        />
      )}
    </>
  );
};
