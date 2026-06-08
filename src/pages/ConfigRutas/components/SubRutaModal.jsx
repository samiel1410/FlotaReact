import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

const fw = "w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800";
const fl = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";

export const SubRutaModal = ({ open, onClose, onSave, subruta, catalogoCantones, nextOrden, saving }) => {
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      id_fkorigen_sub_rutas: '',
      id_fkdestino_sub_rutas: '',
      valor_sub_rutas: '0',
      minutos_sub_rutas: '0',
      orden_sub_rutas: nextOrden,
      tipo_servicio: '',
      estado_sub_rutas: '1',
      nombre_sub_rutas: '',
    }
  });

  const origen = watch('id_fkorigen_sub_rutas');
  const destino = watch('id_fkdestino_sub_rutas');

  useEffect(() => {
    if (open) {
      if (subruta) {
        reset({
          id_fkorigen_sub_rutas: subruta.id_fkorigen_sub_rutas || '',
          id_fkdestino_sub_rutas: subruta.id_fkdestino_sub_rutas || '',
          valor_sub_rutas: subruta.valor_sub_rutas || '0',
          minutos_sub_rutas: subruta.minutos_sub_rutas || '0',
          orden_sub_rutas: subruta.orden_sub_rutas || nextOrden,
          tipo_servicio: subruta.tipo_servicio || '',
          estado_sub_rutas: (subruta.estado_sub_rutas || '1').toString(),
          nombre_sub_rutas: subruta.nombre_sub_rutas || '',
        });
      } else {
        reset({
          id_fkorigen_sub_rutas: '',
          id_fkdestino_sub_rutas: '',
          valor_sub_rutas: '0',
          minutos_sub_rutas: '0',
          orden_sub_rutas: nextOrden,
          tipo_servicio: '',
          estado_sub_rutas: '1',
          nombre_sub_rutas: '',
        });
      }
    }
  }, [open, subruta, reset, nextOrden]);

  const getCantonNombre = (id) => {
    const c = catalogoCantones.find(c => c.id_canton == id);
    return c ? c.nombre_canton : '';
  };

  const onSubmit = (data) => {
    const nombreAutomatico = data.nombre_sub_rutas || (getCantonNombre(data.id_fkorigen_sub_rutas) + ' - ' + getCantonNombre(data.id_fkdestino_sub_rutas));
    onSave({
      ...data,
      nombre_sub_rutas: nombreAutomatico,
      valor_sub_rutas: parseFloat(data.valor_sub_rutas) || 0,
      minutos_sub_rutas: parseInt(data.minutos_sub_rutas) || 0,
      orden_sub_rutas: parseInt(data.orden_sub_rutas) || nextOrden,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-indigo-700 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-white flex items-center gap-2">
            <i className="fas fa-code-branch text-indigo-200" />
            {subruta ? 'Editar Sub Ruta' : 'Nueva Sub Ruta'}
          </h2>
          <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors"><i className="fas fa-times" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fl}>Origen</label>
              <select {...register('id_fkorigen_sub_rutas')} className={fw}>
                <option value="">Seleccionar...</option>
                {catalogoCantones.map(c => <option key={c.id_canton} value={c.id_canton}>{c.nombre_canton}</option>)}
              </select>
            </div>
            <div>
              <label className={fl}>Destino</label>
              <select {...register('id_fkdestino_sub_rutas')} className={fw}>
                <option value="">Seleccionar...</option>
                {catalogoCantones.map(c => <option key={c.id_canton} value={c.id_canton}>{c.nombre_canton}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={fl}>Nombre (opcional. Se auto-genera)</label>
            <input type="text" {...register('nombre_sub_rutas')} className={fw} placeholder={getCantonNombre(origen) + ' - ' + getCantonNombre(destino) || 'Origen - Destino'} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fl}>Valor Tarifa ($)</label>
              <input type="number" step="0.01" {...register('valor_sub_rutas')} className={fw} min="0" />
            </div>
            <div>
              <label className={fl}>Minutos de Viaje</label>
              <input type="number" {...register('minutos_sub_rutas')} className={fw} min="0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={fl}>Orden</label>
              <input type="number" {...register('orden_sub_rutas')} className={fw} min="1" />
            </div>
            <div>
              <label className={fl}>Tipo Servicio</label>
              <input type="text" {...register('tipo_servicio')} className={fw} placeholder="Ej: Directo" />
            </div>
            <div className="flex items-end pb-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...register('estado_sub_rutas')} value="1" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                <span className="ml-3 text-sm font-semibold text-slate-700">Activo</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-bold transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-60 flex items-center gap-2">
              {saving ? <><i className="fas fa-spinner fa-spin" />Guardando...</> : <><i className="fas fa-save" />Guardar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
