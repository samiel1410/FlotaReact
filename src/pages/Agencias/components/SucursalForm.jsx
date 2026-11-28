import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';
import ToggleSwitch from '../../../components/common/ToggleSwitch';
import {
  COLORES_ASIENTOS_DEFAULT,
  ESTADOS_ASIENTO,
  CAMPO_COLOR_IDENTIFICACION,
  normalizarColoresAsientos,
  normalizarColorHex,
  normalizarColorIdentificacion,
  estiloAsiento,
} from '../../../config/coloresAsientos';

const COLOR_IDENTIFICACION_SUGERIDO = COLORES_ASIENTOS_DEFAULT.color_asiento_ocupado;

// Íconos fijos del mapa: no dependen de los colores y siempre significan lo
// mismo. Se repiten en la vista previa para que al editar colores no se pierda
// la referencia de qué representa cada asiento.
const MARCADOR_POR_ESTADO = {
  ocupado: {
    icon: 'fa-flag-checkered',
    clase: 'bg-red-700',
    label: 'Ocupado hasta el final',
  },
  'ocupado-parcial': {
    icon: 'fa-circle-half-stroke',
    clase: 'bg-yellow-700',
    label: 'Ocupado por tramo',
  },
};

const SucursalForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [todasCiudades, setTodasCiudades] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [selectedProvincia, setSelectedProvincia] = useState('');

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre_sucursal: '',
      ciudad_sucursal: '',
      direccion_sucursal: '',
      telefono_sucursal: '',
      ruc_sucursal: '',
      porcentaje_retencion: 0,
      tiene_punto_emision: false,
      punto_emision_sucursal: '',
      tiene_encomiendas: false,
      punto_emision_boleteria_sucursal: '',
      genera_tasa: false,
      piso_sucursal: '',
      anden_sucursal: '',
      estado_sucursales: true,
      tiene_color_identificacion: false,
      [CAMPO_COLOR_IDENTIFICACION]: COLOR_IDENTIFICACION_SUGERIDO,
      ...COLORES_ASIENTOS_DEFAULT,
    }
  });

  const tienePuntoEmision = watch('tiene_punto_emision');
  const tieneEncomiendas = watch('tiene_encomiendas');
  const estadoValue = watch('estado_sucursales');
  const coloresActuales = normalizarColoresAsientos(watch());
  const tieneColorIdentificacion = watch('tiene_color_identificacion');
  const colorIdentificacion = normalizarColorHex(
    watch(CAMPO_COLOR_IDENTIFICACION),
    COLOR_IDENTIFICACION_SUGERIDO
  );

  // Cargar provincias y TODAS las ciudades al montar (sin depender de provincia)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [provRes, cityRes] = await Promise.all([
          api.get('/locacion/seleccionarProvincia'),
          api.get('/locacion/seleccionarCiudad')
        ]);
        setProvincias(provRes?.data?.data || provRes?.data || []);
        
        const todas = (cityRes?.data?.data || cityRes?.data || []).sort((a, b) => {
          const na = (a.nombre_canton || a.nombre || '').toLowerCase();
          const nb = (b.nombre_canton || b.nombre || '').toLowerCase();
          return na.localeCompare(nb);
        });
        setTodasCiudades(todas);
        
        // Al editar: resetear form y auto-seleccionar provincia
        if (isEditing && initialData) {
          reset({
            ...initialData,
            ...normalizarColoresAsientos(initialData),
            estado_sucursales: (initialData.estado_sucursales ?? initialData.estado ?? 1) == 1 || (initialData.estado_sucursales ?? initialData.estado ?? 1) === '1',
            tiene_punto_emision: !!initialData.punto_emision_sucursal,
            tiene_encomiendas: !!initialData.punto_emision_boleteria_sucursal,
            punto_emision_sucursal: initialData.punto_emision_sucursal || '',
            punto_emision_boleteria_sucursal: initialData.punto_emision_boleteria_sucursal || '',
            piso_sucursal: initialData.piso_sucursal || '',
            anden_sucursal: initialData.anden_sucursal || '',
            tiene_color_identificacion: !!normalizarColorIdentificacion(initialData[CAMPO_COLOR_IDENTIFICACION]),
            [CAMPO_COLOR_IDENTIFICACION]: normalizarColorIdentificacion(initialData[CAMPO_COLOR_IDENTIFICACION])
              || COLOR_IDENTIFICACION_SUGERIDO,
          });
          
          // Auto-seleccionar provincia
          if (initialData.ciudad_sucursal) {
            const match = todas.find(c =>
              (c.nombre_canton || '').trim().toUpperCase() === initialData.ciudad_sucursal.trim().toUpperCase()
            );
            if (match?.id_fkprovincia) {
              setSelectedProvincia(String(match.id_fkprovincia));
            }
          }
        }
      } catch (e) {
        console.error('Error cargando datos:', e);
      }
    };
    fetchData();
  }, []); // Solo al montar, sin dependencias problemáticas

  // Al editar con initialData, cargar RUC si es nuevo
  useEffect(() => {
    if (!isEditing) {
      api.get('/empresa/selectempresa').then(res => {
        if (res.data.success && res.data.data.length > 0) {
          setValue('ruc_sucursal', res.data.data[0].ruc_empresa);
        }
      }).catch(() => {});
    }
  }, []);

  // Ciudades visibles: filtradas por provincia o TODAS si no hay provincia seleccionada
  const ciudadesVisibles = selectedProvincia
    ? todasCiudades.filter(c => String(c.id_fkprovincia) === String(selectedProvincia))
    : todasCiudades;

  const restaurarColores = () => {
    ESTADOS_ASIENTO.forEach(({ campo }) => {
      setValue(campo, COLORES_ASIENTOS_DEFAULT[campo], { shouldDirty: true });
    });
  };

  const onFormSubmit = async (formData) => {
    setLoading(true);
    try {
      // Mapear datos de vuelta al formato del servidor
      const payload = {
        ...formData,
        ...normalizarColoresAsientos(formData),
        // Si el checkbox está apagado, enviamos vacío como en el legacy
        punto_emision_sucursal: formData.tiene_punto_emision ? formData.punto_emision_sucursal : '',
        punto_emision_boleteria_sucursal: formData.tiene_encomiendas ? formData.punto_emision_boleteria_sucursal : '',
        // Color con el que la agencia se identifica en el mapa de las demás.
        // Vacío = usar su color de "ocupado fin".
        [CAMPO_COLOR_IDENTIFICACION]: formData.tiene_color_identificacion
          ? normalizarColorHex(formData[CAMPO_COLOR_IDENTIFICACION], COLOR_IDENTIFICACION_SUGERIDO)
          : '',
        // Enviar flags de checkbox como '1'/'0' si el servidor lo requiere
        tiene_punto_emision: formData.tiene_punto_emision ? '1' : '0',
        tiene_encomiendas: formData.tiene_encomiendas ? '1' : '0',
        genera_tasa: formData.genera_tasa ? 1 : 0
      };

      if (isEditing) payload.id_sucursal = initialData.id_sucursal;

      const res = await api.post('/sucursal/insertarActualizarSucursal', payload);
      
      if (res.data.success) {
        toast.success(isEditing ? 'Agencia actualizada' : 'Agencia creada');
        onSubmit(payload);
      } else {
        toast.error(res.data.mensaje || 'Error al guardar');
      }
    } catch (err) {
      console.error('Error guardando sucursal:', err);
      toast.error('Error de comunicación con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Nombre */}
        <div className="md:col-span-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre de la Agencia</label>
          <input 
            type="text" 
            {...register('nombre_sucursal', { required: 'El nombre es requerido' })} 
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
            placeholder="Ej: Agencia Central"
          />
          {errors.nombre_sucursal && <span className="text-rose-500 text-[9px] font-bold uppercase">{errors.nombre_sucursal.message}</span>}
        </div>

        {/* Provincia */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Provincia</label>
          <select
            value={selectedProvincia}
            onChange={(e) => setSelectedProvincia(e.target.value)}
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
          >
            <option value="">Seleccione una provincia...</option>
            {provincias.map(p => (
              <option key={p.id_provincia || p.id || p.value} value={p.id_provincia || p.id || p.value}>
                {p.nombre_provincia || p.nombre || p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ciudad */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ciudad</label>
          <select 
            {...register('ciudad_sucursal', { required: 'La ciudad es requerida' })} 
            disabled={!todasCiudades.length}
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
          >
            <option value="">{todasCiudades.length ? 'Seleccione la ciudad...' : 'Cargando ciudades...'}</option>
            {ciudadesVisibles.map(c => (
              <option key={c.id_canton || c.id || c.value} value={c.nombre_canton || c.nombre || c.label}>
                {c.nombre_canton || c.nombre || c.label}
              </option>
            ))}
          </select>
          {errors.ciudad_sucursal && <span className="text-rose-500 text-[9px] font-bold uppercase">{errors.ciudad_sucursal.message}</span>}
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dirección</label>
          <input 
            type="text" 
            {...register('direccion_sucursal', { required: 'La dirección es requerida' })} 
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Teléfono</label>
          <input 
            type="text" 
            {...register('telefono_sucursal', { required: 'El teléfono es requerido' })} 
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
          />
        </div>

        {/* RUC (Read Only) */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">RUC</label>
          <input 
            type="text" 
            {...register('ruc_sucursal')} 
            readOnly
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-slate-100 text-slate-500 outline-none"
          />
        </div>

        {/* Retención */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">% Retención</label>
          <input 
            type="number" 
            step="0.01"
            {...register('porcentaje_retencion')} 
            className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50"
          />
        </div>

        {/* Estado */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</label>
          <ToggleSwitch 
            register={register('estado_sucursales')}
            label={estadoValue ? 'Activo' : 'Inactivo'}
          />
        </div>

        {/* Punto Emisión Guías */}
        <div className="border border-slate-100 p-3 rounded-2xl bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <input 
              type="checkbox" 
              {...register('tiene_punto_emision')} 
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="text-[10px] font-black text-slate-600 uppercase">Habilitar P.E. Guías</label>
          </div>
          <input 
            type="text" 
            maxLength="3"
            disabled={!tienePuntoEmision}
            {...register('punto_emision_sucursal', { required: tienePuntoEmision })} 
            className={`w-full h-10 px-3 text-xs font-bold border rounded-xl transition-all outline-none ${tienePuntoEmision ? 'bg-white border-slate-200' : 'bg-slate-100 border-transparent text-slate-400'}`}
            placeholder="Ej: 001"
          />
        </div>

        {/* Punto Emisión Boletería */}
        <div className="border border-slate-100 p-3 rounded-2xl bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <input 
              type="checkbox" 
              {...register('tiene_encomiendas')} 
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="text-[10px] font-black text-slate-600 uppercase">Habilitar P.E. Boletería</label>
          </div>
          <input 
            type="text" 
            maxLength="3"
            disabled={!tieneEncomiendas}
            {...register('punto_emision_boleteria_sucursal', { required: tieneEncomiendas })} 
            className={`w-full h-10 px-3 text-xs font-bold border rounded-xl transition-all outline-none ${tieneEncomiendas ? 'bg-white border-slate-200' : 'bg-slate-100 border-transparent text-slate-400'}`}
            placeholder="Ej: 002"
          />
        </div>

        {/* Piso y andén propios de la agencia (el boleto los usa si están configurados) */}
        <div className="md:col-span-2 border border-slate-100 p-3 rounded-2xl bg-slate-50/50">
          <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Piso y Andén de la agencia</label>
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-3">
            Algunas agencias tienen andenes distintos a los de la ruta. Si se dejan vacíos, el boleto imprime el piso y andén de la ruta.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Piso</label>
              <input
                type="number"
                min="1"
                {...register('piso_sucursal')}
                className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-white"
                placeholder="Ej: 1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Andén</label>
              <input
                type="text"
                maxLength={20}
                {...register('anden_sucursal')}
                className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-white"
                placeholder="Ej: A3"
              />
            </div>
          </div>
        </div>

        {/* Tasa de terminal FTTG */}
        <div className="md:col-span-2 border border-slate-100 p-3 rounded-2xl bg-slate-50/50">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              {...register('genera_tasa')}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase">Generar tasa de terminal (FTTG)</label>
              <p className="text-[9px] font-bold text-slate-400 uppercase">
                Solo agencias con torniquete. Cada boleto imprime un QR con su código de tasa.
              </p>
            </div>
          </div>
        </div>

        {/* Color de identificación de la agencia en el mapa de asientos */}
        <div className="md:col-span-2 border border-indigo-100 p-3 rounded-2xl bg-indigo-50/40">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              {...register('tiene_color_identificacion')}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase">Color de identificación de la agencia</label>
              <p className="text-[9px] font-bold text-slate-400 uppercase">
                Los boletos vendidos aquí se pintan con este color en el mapa de asientos de todas las agencias,
                para saber de un vistazo quién vendió (Terminal Sur, Inga Urco, etc.).
                Si se deja apagado se usa el color de "Ocupado fin" de esta agencia.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 pl-6">
            <input
              type="color"
              disabled={!tieneColorIdentificacion}
              {...register(CAMPO_COLOR_IDENTIFICACION)}
              className={`w-12 h-9 rounded-lg border border-slate-200 bg-transparent p-0.5 ${tieneColorIdentificacion ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
            />
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              {tieneColorIdentificacion ? colorIdentificacion : 'Sin color propio'}
            </span>
            <div className="flex items-end gap-1.5">
              <div className="relative">
                <span
                  className="w-9 h-9 rounded-t-lg rounded-b border-2 flex items-center justify-center text-[11px] font-black shadow-sm"
                  style={estiloAsiento(tieneColorIdentificacion ? colorIdentificacion : COLOR_IDENTIFICACION_SUGERIDO)}
                >
                  1
                </span>
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border border-white shadow-sm flex items-center justify-center text-[6px] text-white bg-red-700">
                  <i className="fas fa-flag-checkered"></i>
                </span>
              </div>
              <div className="relative">
                <span
                  className="w-9 h-9 rounded-t-lg rounded-b border-2 flex items-center justify-center text-[11px] font-black shadow-sm"
                  style={estiloAsiento(tieneColorIdentificacion ? colorIdentificacion : COLOR_IDENTIFICACION_SUGERIDO)}
                >
                  2
                </span>
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border border-white shadow-sm flex items-center justify-center text-[6px] text-white bg-yellow-700">
                  <i className="fas fa-circle-half-stroke"></i>
                </span>
                <span className="absolute left-1 right-1 bottom-0.5 h-[2px] rounded bg-slate-900/60"></span>
              </div>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase leading-tight">
              Así se verán sus asientos vendidos. El ícono indica si el boleto va hasta el final
              <i className="fas fa-flag-checkered text-red-700 mx-1"></i>
              o solo por un tramo
              <i className="fas fa-circle-half-stroke text-yellow-700 mx-1"></i>.
            </span>
          </div>
        </div>

        {/* Colores del mapa de asientos */}
        <div className="md:col-span-2 border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Colores del mapa de asientos</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Estados al vender en esta agencia. Los asientos vendidos usan el color de la oficina que los vendió.</p>
            </div>
            <button
              type="button"
              onClick={restaurarColores}
              className="h-8 px-3 text-[9px] font-black text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 rounded-lg transition-all uppercase tracking-widest flex items-center gap-1.5"
            >
              <i className="fas fa-rotate-left"></i> Restaurar
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ESTADOS_ASIENTO.map((estado) => (
              <div key={estado.campo} className="border border-slate-200 rounded-xl p-2 bg-white" title={estado.descripcion}>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1">
                  {estado.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    {...register(estado.campo)}
                    className="w-10 h-8 rounded-lg border border-slate-200 bg-transparent cursor-pointer p-0.5"
                  />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    {normalizarColorHex(coloresActuales[estado.campo])}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
            {ESTADOS_ASIENTO.map((estado) => {
              const marcador = MARCADOR_POR_ESTADO[estado.key];
              return (
                <div key={`preview-${estado.campo}`} className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <span
                      className="w-8 h-8 rounded-t-lg rounded-b border-2 flex items-center justify-center text-[11px] font-black shadow-sm"
                      style={estiloAsiento(coloresActuales[estado.campo])}
                    >
                      1
                    </span>
                    {marcador && (
                      <span
                        className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border border-white shadow-sm flex items-center justify-center text-[6px] text-white ${marcador.clase}`}
                        title={marcador.label}
                      >
                        <i className={`fas ${marcador.icon}`}></i>
                      </span>
                    )}
                    {estado.key === 'ocupado-parcial' && (
                      <span className="absolute left-1 right-1 bottom-0.5 h-[2px] rounded bg-slate-900/60"></span>
                    )}
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase text-center leading-tight">
                    {estado.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 pt-2">
            {Object.entries(MARCADOR_POR_ESTADO).map(([key, marcador]) => (
              <span key={key} className="inline-flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase">
                <span className={`w-3.5 h-3.5 rounded-full border border-white shadow-sm flex items-center justify-center text-[6px] text-white ${marcador.clase}`}>
                  <i className={`fas ${marcador.icon}`}></i>
                </span>
                {marcador.label}
              </span>
            ))}
            <span className="text-[9px] font-bold text-slate-400 uppercase">
              Los íconos son fijos; solo se editan los colores.
            </span>
          </div>
        </div>

      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 px-6 text-[10px] font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all uppercase tracking-widest"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="h-10 px-8 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest flex items-center gap-2"
        >
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
          {isEditing ? 'Actualizar Agencia' : 'Guardar Agencia'}
        </button>
      </div>
    </form>
  );
};

export default SucursalForm;
