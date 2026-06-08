import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';
import CompaniaSelect from '../../../components/common/CompaniaSelect';

const NewDestinoForm = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm();

  const watchLugar = watch('lugar_destino');
  const watchCompania = watch('idfk_compania_asociada_destino');

  // ── Estado para Provincia → Ciudades ─────────────────
  const [provincias, setProvincias] = useState([]);
  const [cantones, setCantones] = useState([]);
  const [selectedProvincia, setSelectedProvincia] = useState('');
  const [loadingCantones, setLoadingCantones] = useState(false);

  // Cargar provincias al montar
  useEffect(() => {
    const fetchProvincias = async () => {
      try {
        const res = await api.get('/locacion/seleccionarProvincia');
        const data = res?.data?.data || res?.data || [];
        setProvincias(data);
      } catch (e) {
        console.error('Error cargando provincias:', e);
      }
    };
    fetchProvincias();
  }, []);

  // Cargar cantones cuando cambia la provincia
  useEffect(() => {
    if (!selectedProvincia) {
      setCantones([]);
      setValue('lugar_destino', '');
      return;
    }
    const fetchCantones = async () => {
      setLoadingCantones(true);
      try {
        const res = await api.get('/canton/cantonSeleccionarCombo', {
          params: { id_provincia: selectedProvincia }
        });
        const data = res?.data?.data || res?.data || [];
        // Ordenar alfabéticamente por nombre
        const ordenados = [...data].sort((a, b) => {
          const nombreA = (a.nombre_canton || a.nombre || '').toLowerCase();
          const nombreB = (b.nombre_canton || b.nombre || '').toLowerCase();
          return nombreA.localeCompare(nombreB);
        });
        setCantones(ordenados);
        setValue('lugar_destino', '');
      } catch (e) {
        console.error('Error cargando cantones:', e);
        setCantones([]);
      } finally {
        setLoadingCantones(false);
      }
    };
    fetchCantones();
  }, [selectedProvincia, setValue]);

  // Al editar, si ya hay lugar_destino, cargar todas las ciudades
  useEffect(() => {
    if (initialData?.lugar_destino && provincias.length > 0 && !selectedProvincia) {
      api.get('/locacion/seleccionarCiudad').then(r => {
        const todas = r?.data?.data || [];
        setCantones(todas);
      }).catch(() => {});
    }
  }, [initialData, provincias, selectedProvincia]);

  useEffect(() => {
    if (initialData) {
      reset({
        id: initialData.id_destino || '',
        nombre_destino: initialData.nombre_destino || '',
        lugar_destino: initialData.lugar_destino || '',
        idfk_compania_asociada_destino: initialData.idfk_compania_asociada_destino || '',
        contacto: initialData.contacto || initialData.numero_contacto || '',
        estado_destino: initialData.estado_destino == 1 || initialData.estado_destino === '1'
      });
    } else {
      reset({
        id: '',
        nombre_destino: '',
        lugar_destino: '',
        idfk_compania_asociada_destino: '',
        contacto: '',
        estado_destino: true
      });
    }
  }, [initialData, reset]);

  const handleValidSubmit = async (data) => {
    if (!data.lugar_destino || !data.idfk_compania_asociada_destino) return;
    setLoading(true);
    try {
      const payload = {
        ...data,
        estado_destino: data.estado_destino ? '1' : '0',
      };
      await api.post('/destino/destinoinsertarActualizar', payload);
      toast.success(isEditing ? 'Destino actualizado correctamente' : 'Destino creado correctamente');
      onSubmit();
    } catch (err) {
      toast.error('Error al guardar. ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleValidSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <input type="hidden" {...register('id')} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Nombre/Dirección */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Dirección / Nombre del Destino <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-map-marker-alt text-slate-400"></i>
              </div>
              <input
                type="text"
                {...register('nombre_destino', { required: 'La dirección es obligatoria' })}
                className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-all ${
                  errors.nombre_destino ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400'
                }`}
                placeholder="Ej: Terminal Terrestre Guayaquil"
                autoFocus
              />
            </div>
            {errors.nombre_destino && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.nombre_destino.message}</p>}
          </div>

          {/* Provincia */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Provincia <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-map text-slate-400"></i>
              </div>
              <select
                value={selectedProvincia}
                onChange={(e) => setSelectedProvincia(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-all ${
                  errors.lugar_destino ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400'
                }`}
              >
                <option value="">Seleccione una provincia...</option>
                {provincias.map((p) => (
                  <option key={p.id_provincia || p.id || p.value} value={p.id_provincia || p.id || p.value}>
                    {p.nombre_provincia || p.nombre || p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ciudad */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Ciudad <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-city text-slate-400"></i>
              </div>
              <select
                value={watchLugar || ''}
                onChange={(e) => setValue('lugar_destino', e.target.value)}
                disabled={!selectedProvincia || loadingCantones}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-all ${
                  !selectedProvincia ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50'
                } ${
                  errors.lugar_destino ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400'
                }`}
              >
                <option value="">
                  {loadingCantones
                    ? 'Cargando ciudades...'
                    : selectedProvincia
                      ? 'Seleccione una ciudad...'
                      : 'Primero seleccione una provincia'
                  }
                </option>
                {cantones.map((c) => (
                  <option key={c.id_canton || c.id || c.value} value={c.nombre_canton || c.nombre || c.label}>
                    {c.nombre_canton || c.nombre || c.label}
                  </option>
                ))}
              </select>
            </div>
            {(!watchLugar && errors.lugar_destino) && <p className="mt-1 text-xs text-rose-500 font-medium">Debe seleccionar una ciudad.</p>}
          </div>

          {/* Compañía Asociada */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Compañía <span className="text-rose-500">*</span>
            </label>
            <CompaniaSelect
              value={watchCompania}
              onChange={(e) => setValue('idfk_compania_asociada_destino', e.target.value)}
              name="idfk_compania_asociada_destino"
              label=""
            />
            {(!watchCompania && errors.idfk_compania_asociada_destino) && <p className="mt-1 text-xs text-rose-500 font-medium">Debe seleccionar una compañía.</p>}
          </div>

          {/* Contacto */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Contacto (Teléfono) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-phone-alt text-slate-400"></i>
              </div>
              <input
                type="text"
                maxLength="15"
                {...register('contacto', { 
                  required: 'El teléfono es obligatorio',
                  pattern: { value: /^[0-9]+$/, message: 'Debe contener solo números' },
                  maxLength: { value: 15, message: 'Máximo 15 dígitos' }
                })}
                className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-all ${
                  errors.contacto ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400'
                }`}
                placeholder="Ej: 0987654321"
              />
            </div>
            {errors.contacto && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.contacto.message}</p>}
          </div>

          {/* Estado (Switch) */}
          <div className="flex flex-col justify-center">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Estado</label>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input 
                type="checkbox" 
                className="sr-only peer"
                {...register('estado_destino')}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
            </label>
          </div>

        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm flex items-center gap-2"
        >
          <i className="fas fa-times"></i>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 border border-emerald-700 rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-60"
        >
          {loading ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-save"></i> Guardar Destino</>}
        </button>
      </div>
    </form>
  );
};

export default NewDestinoForm;
