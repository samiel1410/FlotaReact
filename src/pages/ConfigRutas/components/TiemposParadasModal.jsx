import { useState, useEffect } from 'react';

const fl = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";
const fw = "w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-500";

export const TiemposParadasModal = ({ open, onClose, route, subrutas, catalogoCantones, sucursales, onSave, saving }) => {
  const [origenes, setOrigenes] = useState([]);
  const [tiempos, setTiempos] = useState([]);

  useEffect(() => {
    if (open) {
      // 1. Extraer origenes únicos de subrutas ordenadas
      const subrutasOrdenadas = [...(subrutas || [])].sort((a, b) => (parseInt(a.orden_sub_rutas) || 0) - (parseInt(b.orden_sub_rutas) || 0));
      const origenesUnicosIds = [];
      
      for (const sr of subrutasOrdenadas) {
        if (sr.id_fkorigen_sub_rutas && !origenesUnicosIds.includes(sr.id_fkorigen_sub_rutas)) {
           origenesUnicosIds.push(sr.id_fkorigen_sub_rutas);
        }
      }

      // 2. Mapear cantones a sucursales (por nombre de cantón)
      const origenesDetectados = [];
      for (const cantonId of origenesUnicosIds) {
        const canton = catalogoCantones?.find(c => c.id_canton == cantonId);
        const nombreCanton = canton?.nombre_canton?.toLowerCase() || '';

        // Buscar sucursal cuyo nombre o ciudad contenga el nombre del cantón
        const sucursal = sucursales?.find(s =>
          (s.ciudad_sucursal && s.ciudad_sucursal.toLowerCase().includes(nombreCanton)) ||
          (s.nombre_sucursal && s.nombre_sucursal.toLowerCase().includes(nombreCanton))
        );

        origenesDetectados.push({
          id_sucursal: sucursal?.id_sucursal || null,
          nombre: canton ? canton.nombre_canton : 'Desconocido',
          nombreSucursal: sucursal?.nombre_sucursal || null,
          cantonId
        });
      }

      setOrigenes(origenesDetectados);

      // 3. Restaurar los tiempos si ya existía configuración
      if (route && route.tiempos_paradas_rutas && route.tiempos_paradas_rutas !== '[]' && route.tiempos_paradas_rutas !== 'null') {
        let guardados = [];
        try {
          guardados = typeof route.tiempos_paradas_rutas === 'string' ? JSON.parse(route.tiempos_paradas_rutas) : route.tiempos_paradas_rutas;
        } catch(e) { guardados = []; }
        
        if (Array.isArray(guardados) && guardados.length > 0) {
          guardados.sort((a,b) => (a.orden || 0) - (b.orden || 0));
          // Construir mapa: cantonId -> minutos_desde_origen
          const mapaCanton = {};
          guardados.forEach(g => { if (g.canton_id) mapaCanton[g.canton_id] = g.minutos_desde_origen || 0; });

          const deltas = [];
          for (let i = 0; i < origenesDetectados.length - 1; i++) {
            // Usar cantonId si está disponible, si no usar posición en guardados
            const minCurr = mapaCanton[origenesDetectados[i].cantonId] ?? (guardados[i]?.minutos_desde_origen || 0);
            const minNext = mapaCanton[origenesDetectados[i+1].cantonId] ?? (guardados[i+1]?.minutos_desde_origen || 0);
            deltas.push(Math.max(0, minNext - minCurr));
          }
          while (deltas.length < origenesDetectados.length - 1) deltas.push(0);
          setTiempos(deltas);
        } else {
          setTiempos(Array(Math.max(0, origenesDetectados.length - 1)).fill(0));
        }
      } else {
        setTiempos(Array(Math.max(0, origenesDetectados.length - 1)).fill(0));
      }
    }
  }, [open, subrutas, sucursales, catalogoCantones, route]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const mapped = [];
    let acumulado = 0;

    for (let i = 0; i < origenes.length; i++) {
      // Siempre guardar cada origen con su cantonId para poder restaurar aunque no tenga sucursal
      mapped.push({
        id_sucursal: origenes[i].id_sucursal ? parseInt(origenes[i].id_sucursal) : null,
        canton_id: origenes[i].cantonId,
        minutos_desde_origen: acumulado,
        orden: i + 1
      });
      if (i < origenes.length - 1) {
        acumulado += (parseInt(tiempos[i]) || 0);
      }
    }

    // Filtrar los que no tienen sucursal para el despacho, pero guardar todos para restaurar
    if (mapped.filter(p => p.id_sucursal).length === 0) {
      alert('No se encontró ninguna sucursal para guardar. Verifica que los cantones de origen tengan oficinas registradas.');
      return;
    }

    onSave(mapped);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-indigo-700 px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-white flex items-center gap-2">
            <i className="fas fa-route text-indigo-200" />
            Configurar Tiempos entre Oficinas
          </h2>
          <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
          <div className="p-6 overflow-y-auto flex-1">
            <div className="mb-6 text-sm text-slate-600 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <p>El sistema ha detectado automáticamente las oficinas de despacho a partir de sus subrutas.</p>
              <p className="mt-1 font-medium text-indigo-600">Por favor, ingrese el tiempo aproximado (en minutos) que toma viajar entre ellas.</p>
            </div>

            <div className="py-2">
              {origenes.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <i className="fas fa-exclamation-triangle text-3xl mb-3 text-amber-400"></i>
                  <p>No se encontraron orígenes en las subrutas actuales.</p>
                  <p className="text-xs mt-1">Cree al menos una subruta para configurar tiempos.</p>
                </div>
              ) : (
                origenes.map((origen, index) => (
                  <div key={index} className="flex flex-col items-center">
                    
                    {/* CAJA DEL ORIGEN */}
                    <div className="bg-white border-2 border-indigo-100 rounded-xl p-4 shadow-sm w-full sm:w-3/4 text-center relative z-10 transition-all hover:border-indigo-300">
                      <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        {index + 1}
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg">{origen.nombre}</h3>
                      <p className="text-xs text-slate-500 uppercase font-semibold mt-1">Punto de Despacho</p>
                      {!origen.id_sucursal && (
                        <p className="text-red-500 text-xs mt-2 bg-red-50 p-1.5 rounded border border-red-100">
                          <i className="fas fa-exclamation-circle mr-1"></i> No hay sucursal en este cantón
                        </p>
                      )}
                    </div>

                    {/* CONECTOR CON INPUT DE TIEMPO (solo si no es el último) */}
                    {index < origenes.length - 1 && (
                      <div className="flex flex-col items-center my-1 relative z-0">
                        <div className="h-6 w-1 bg-indigo-200"></div>
                        <div className="flex items-center gap-2 bg-indigo-50 border-2 border-indigo-200 rounded-full px-4 py-2 my-1 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all">
                          <i className="fas fa-clock text-indigo-500" />
                          <input 
                            type="number" 
                            min="0"
                            placeholder="0"
                            className="w-16 bg-transparent text-center font-black text-indigo-700 text-lg focus:outline-none placeholder-indigo-300" 
                            value={tiempos[index] ?? ''}
                            onChange={e => {
                              const newT = [...tiempos];
                              newT[index] = e.target.value === '' ? '' : parseInt(e.target.value);
                              setTiempos(newT);
                            }}
                            required
                          />
                          <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider">minutos</span>
                        </div>
                        <div className="h-6 w-1 bg-indigo-200"></div>
                        <i className="fas fa-chevron-down text-indigo-300 text-xs -mt-1" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-5 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-bold transition-all">
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={saving || origenes.length === 0} 
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-60 flex items-center gap-2 shadow-md"
            >
              {saving ? <><i className="fas fa-spinner fa-spin" />Guardando...</> : <><i className="fas fa-save" />Guardar Tiempos</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
