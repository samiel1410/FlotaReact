import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ViajesService from '../../services/viajes.service';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_LABEL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const PlanificacionViajesPage = () => {
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [diasSemana, setDiasSemana] = useState([]);
  const [editCache, setEditCache] = useState({});

  // Generar fechas de la semana
  const getWeekDates = useCallback(() => {
    const start = new Date(fechaInicio);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push({
        nombre: DIAS_LABEL[i],
        nombreKey: DIAS[i],
        dia: String(d.getDate()).padStart(2, '0'),
        fecha_completa: d.toISOString().split('T')[0],
      });
    }
    setDiasSemana(dates);
  }, [fechaInicio]);

  useEffect(() => { getWeekDates(); }, [getWeekDates]);

  const cargarPlanificacion = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ViajesService.getPlanificacion(fechaInicio);
      if (res.success && Array.isArray(res.data)) {
        setData(res.data);
        setEditCache({});
      } else {
        setData([]);
      }
    } catch (e) {
      toast.error('Error al cargar planificación');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio]);

  useEffect(() => { cargarPlanificacion(); }, [cargarPlanificacion]);

  // Obtener valor para un día específico desde los datos
  const getValor = (row, diaKey) => {
    if (editCache[`${row.id_ruta}_${row.hora}_${diaKey}`] !== undefined) {
      return editCache[`${row.id_ruta}_${row.hora}_${diaKey}`];
    }
    // Usar el campo específico de bus por día (bus_lunes, bus_martes, etc.)
    const tieneKey = `tiene_${diaKey}`;
    const busKey = `bus_${diaKey}`;
    if (row[tieneKey] == 1) {
      return row[busKey] || '✓';
    }
    return '';
  };

  const handleChange = (row, diaKey, value) => {
    const key = `${row.id_ruta}_${row.hora}_${diaKey}`;
    setEditCache(c => ({ ...c, [key]: value }));
  };

  const handleGuardar = async () => {
    // Construir cambios agrupados por ruta+hora
    const cambios = [];
    const cambiosMap = {};

    data.forEach(row => {
      const key = `${row.id_ruta}_${row.hora}`;
      if (!cambiosMap[key]) {
        cambiosMap[key] = { id_ruta: row.id_ruta, hora: row.hora, ruta: row.ruta };
      }
      DIAS.forEach(dia => {
        const cacheKey = `${row.id_ruta}_${row.hora}_${dia}`;
        if (editCache[cacheKey] !== undefined) {
          const fechaObj = diasSemana.find(d => d.nombreKey === dia);
          cambiosMap[key][dia] = editCache[cacheKey];
          if (fechaObj) cambiosMap[key][`fecha_${dia}`] = fechaObj.fecha_completa;
        }
      });
    });

    Object.values(cambiosMap).forEach(c => {
      const hasChange = DIAS.some(d => c[d] !== undefined);
      if (hasChange) cambios.push(c);
    });

    if (cambios.length === 0) {
      toast('No hay cambios pendientes', { icon: 'ℹ️' });
      return;
    }

    setLoading(true);
    try {
      const res = await ViajesService.bulkCreateTrips(cambios);
      if (res.success) {
        toast.success(`${res.total || 0} viajes creados/actualizados`);
        setEditCache({});
        cargarPlanificacion();
      } else {
        toast.error(res.message || 'Error al guardar');
      }
    } catch (e) {
      toast.error('Error al guardar cambios');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = Object.keys(editCache).length > 0;
  const inputCls = 'w-full h-8 text-center text-[10px] font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white transition-all';

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 pb-32">
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <i className="fas fa-calendar-alt text-lg"></i>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight">Planificación de Viajes</h1>
              <p className="text-xs font-medium text-slate-500">Asignación de buses por día — {data.length} rutas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Semana del:</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                className="h-8 px-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
            </div>
            <button onClick={cargarPlanificacion} disabled={loading}
              className="h-8 px-3 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-black rounded-lg transition-all flex items-center gap-1.5 uppercase tracking-widest">
              <i className="fas fa-sync-alt text-[10px]"></i> CARGAR
            </button>
          </div>
        </div>

        {/* Grid de Planificación */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="px-3 py-2.5 text-center w-12 text-[9px] font-black uppercase tracking-wider">#</th>
                  <th className="px-3 py-2.5 text-center w-16 text-[9px] font-black uppercase tracking-wider">HORA</th>
                  <th className="px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-wider">RUTA</th>
                  {diasSemana.map((d, i) => (
                    <th key={i} className="px-3 py-2.5 text-center w-20 text-[9px] font-black uppercase tracking-wider">
                      <div>{d.nombre}</div>
                      <div className="text-[8px] text-slate-400 font-bold">{d.dia}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={2 + diasSemana.length} className="text-center py-12 text-slate-400">
                    <i className="fas fa-spinner fa-spin mr-2"></i>Cargando planificación...
                  </td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={2 + diasSemana.length} className="text-center py-12 text-slate-400 font-bold">
                    No hay datos para la fecha seleccionada
                  </td></tr>
                ) : data.map((row, idx) => {
                  const key = `${row.id_ruta}_${row.hora}`;
                  const hasRowChanges = DIAS.some(d => editCache[`${row.id_ruta}_${row.hora}_${d}`] !== undefined);
                  return (
                    <tr key={key + '_' + idx} className={`hover:bg-slate-50 transition-colors ${hasRowChanges ? 'bg-emerald-50' : ''}`}>
                      <td className="px-3 py-2 text-center font-bold text-slate-400 text-[10px]">{idx + 1}</td>
                      <td className="px-3 py-2 text-center font-black text-slate-700">{row.hora || '-'}</td>
                      <td className="px-3 py-2 font-semibold text-slate-700 text-[11px]">{row.ruta || '-'}</td>
                      {DIAS.map(dia => {
                        const val = getValor(row, dia);
                        const isEdited = editCache[`${row.id_ruta}_${row.hora}_${dia}`] !== undefined;
                        const celKey = `${row.id_ruta}_${row.hora}_${dia}`;
                        return (
                          <td key={dia} className="px-2 py-1.5 text-center">
                             <input type="text" value={editCache[celKey] !== undefined ? editCache[celKey] : (row[`tiene_${dia}`] == 1 ? (row[`bus_${dia}`] || '✓') : '')}
                              onChange={e => handleChange(row, dia, e.target.value)}
                              placeholder={row[`tiene_${dia}`] == 1 ? '' : '—'}
                              className={`${inputCls} ${isEdited ? 'bg-emerald-50 border-emerald-300 font-black text-emerald-700' : '' } ${row[`tiene_${dia}`] == 1 && !isEdited ? 'bg-emerald-50 text-emerald-700' : ''}`} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data.length > 0 && (
            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400">
                {Object.keys(editCache).length} cambios pendientes
              </span>
              <button onClick={() => setEditCache({})} disabled={!hasChanges}
                className="h-8 px-4 text-[9px] font-black text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-30 uppercase tracking-widest">
                DESHACER
              </button>
              <button onClick={handleGuardar} disabled={loading || !hasChanges}
                className="h-8 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 uppercase tracking-widest shadow-sm">
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanificacionViajesPage;
