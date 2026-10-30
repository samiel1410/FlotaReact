import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import ViajesService from '../../services/viajes.service';
import { api } from '../../config/axios';
import { useAuth } from '../../hooks/useAuth';

// Fecha local (no UTC): después de las 19:00 en Ecuador, toISOString()
// devuelve el día siguiente y el viaje se creaba para una fecha equivocada.
const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MINUTOS_GRACIA_VENTA = 10;

const salidaVencida = (fecha, hora) => {
  if (!fecha || !hora) return false;
  const salida = new Date(`${fecha}T${hora}:00`);
  if (Number.isNaN(salida.getTime())) return false;
  return salida.getTime() < Date.now() - MINUTOS_GRACIA_VENTA * 60 * 1000;
};

export const CreacionViajesPage = () => {
  const { user } = useAuth();
  const valoresIniciales = {
    fecha: hoyLocal(),
    hora_salida_viaje: '',
    id_ruta_viaje: '',
    id_buses_viaje: '',
  };
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: valoresIniciales,
  });

  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCombos, setLoadingCombos] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const idSucursal = user?.id_sucursal || user?.id_fksucursal || user?.sucursal || null;
        const params = idSucursal ? { id_sucursal: idSucursal } : {};

        const [routesRes, busesRes] = await Promise.all([
          api.get('/rutas/rutasSeleccionCombo', { params }),
          api.get('/buses/seleccionarBusesCombo')
        ]);
        setRoutes(routesRes.data?.data || routesRes.data || []);
        setBuses(busesRes.data?.data || busesRes.data || []);
      } catch (error) {
        toast.error('Error al cargar rutas y buses');
        console.error('Error fetching combos:', error);
      } finally {
        setLoadingCombos(false);
      }
    };
    fetchInitialData();
  }, [user]);

  const onSubmit = async (data) => {
    // Un viaje cuya salida ya pasó (más la tolerancia de venta) no aparece en
    // boletería. Se avisa antes de crearlo para no dejarlo "invisible".
    if (salidaVencida(data.fecha, data.hora_salida_viaje)) {
      toast.error('La hora de salida ya pasó. Ajusta la hora para que el viaje aparezca al vender boletos.', { duration: 6000 });
      return;
    }

    setLoading(true);
    try {
      const response = await ViajesService.createTrip(data);
      if (response.success) {
        toast.success(`Viaje creado para ${data.fecha} ${data.hora_salida_viaje}`);
        reset(valoresIniciales);
      } else {
        toast.error(response.message || 'Error al crear el viaje', { duration: 6000 });
      }
    } catch (error) {
      toast.error(error?.message || 'Error al crear el viaje');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-10 px-3 text-sm font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none bg-slate-50";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";

  if (loadingCombos) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500"></i>
          <span className="text-slate-500 font-medium">Cargando datos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6 pb-32">
        {/* Cabecera */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xl shadow-sm">
              <i className="fas fa-plus-square"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Creación de Viajes</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Programar un nuevo viaje con ruta, bus y horario
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Fecha de Salida *</label>
                <input
                  type="date"
                  {...register('fecha', { required: 'La fecha es requerida' })}
                  className={inputClass}
                />
                {errors.fecha && <p className="text-rose-500 text-xs mt-1 font-bold">{errors.fecha.message}</p>}
              </div>

              <div>
                <label className={labelClass}>Hora de Salida *</label>
                <input
                  type="time"
                  {...register('hora_salida_viaje', { required: 'La hora es requerida' })}
                  className={inputClass}
                />
                {errors.hora_salida_viaje && <p className="text-rose-500 text-xs mt-1 font-bold">{errors.hora_salida_viaje.message}</p>}
              </div>

              <div>
                <label className={labelClass}>Ruta *</label>
                <select
                  {...register('id_ruta_viaje', { required: 'La ruta es requerida' })}
                  className={inputClass}
                >
                  <option value="">Seleccionar ruta...</option>
                  {routes.map((route, idx) => (
                    <option key={route.id_rutas || route.id_ruta || `r-${idx}`} value={route.id_rutas || route.id_ruta}>
                      {route.nombre_rutas || route.rut_nombre || route.nombre_ruta}
                    </option>
                  ))}
                </select>
                {errors.id_ruta_viaje && <p className="text-rose-500 text-xs mt-1 font-bold">{errors.id_ruta_viaje.message}</p>}
              </div>

              <div>
                <label className={labelClass}>Bus *</label>
                <select
                  {...register('id_buses_viaje', { required: 'El bus es requerido' })}
                  className={inputClass}
                >
                  <option value="">Seleccionar bus...</option>
                  {buses.map((bus, idx) => (
                    <option key={bus.id_buses || bus.bus_id || `b-${idx}`} value={bus.id_buses || bus.bus_id}>
                      {bus.disco_buses || bus.codigo_buses} - {bus.placa_buses || ''}
                    </option>
                  ))}
                </select>
                {errors.id_buses_viaje && <p className="text-rose-500 text-xs mt-1 font-bold">{errors.id_buses_viaje.message}</p>}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => reset(valoresIniciales)}
                className="h-10 px-6 text-[10px] font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all uppercase tracking-widest"
              >
                Limpiar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="h-10 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-widest disabled:opacity-70"
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>}
                {loading ? 'Creando...' : 'Crear Viaje'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};