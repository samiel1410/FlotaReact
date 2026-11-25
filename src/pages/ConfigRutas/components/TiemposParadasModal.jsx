import { useState, useEffect } from 'react';

const normalizar = (valor) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const extraerGuardados = (route) => {
  if (!route?.tiempos_paradas_rutas) return [];
  try {
    const data = typeof route.tiempos_paradas_rutas === 'string'
      ? JSON.parse(route.tiempos_paradas_rutas)
      : route.tiempos_paradas_rutas;
    return Array.isArray(data)
      ? data.filter(p => p && (p.canton_id != null || p.id_sucursal != null))
      : [];
  } catch {
    return [];
  }
};

export const TiemposParadasModal = ({ open, onClose, route, subrutas, catalogoCantones, sucursales, onSave, saving }) => {
  const [paradas, setParadas] = useState([]);
  const [tiempos, setTiempos] = useState([]);

  useEffect(() => {
    if (!open) return;

    const guardados = extraerGuardados(route);
    const porCanton = new Map();
    const porSucursal = new Map();
    guardados.forEach((g, idx) => {
      const orden = Number.isFinite(Number(g.orden)) ? Number(g.orden) : idx + 1;
      const normalizado = { ...g, orden };
      if (g.canton_id != null) porCanton.set(String(g.canton_id), normalizado);
      if (g.id_sucursal != null) porSucursal.set(String(g.id_sucursal), normalizado);
    });

    // Una ciudad puede tener varias oficinas (Guayaquil, Quito, Ambato Sur).
    // Se prioriza la oficina ya guardada y, si no, la boletería/oficina sobre
    // encomiendas para no guardar el id de otra sucursal.
    const buscarSucursal = (cantonId, guardada) => {
      const listaSucursales = sucursales || [];
      if (guardada?.id_sucursal != null) {
        const previa = listaSucursales.find(s => String(s.id_sucursal) === String(guardada.id_sucursal));
        if (previa) return previa;
      }
      const nombre = normalizar((catalogoCantones || []).find(c => String(c.id_canton) === String(cantonId))?.nombre_canton);
      if (!nombre) return null;

      const exactas = listaSucursales.filter(s => normalizar(s.ciudad_sucursal) === nombre);
      const candidatas = exactas.length ? exactas : listaSucursales.filter(s => {
        const ciudad = normalizar(s.ciudad_sucursal);
        const nombreSucursal = normalizar(s.nombre_sucursal);
        return (ciudad && (ciudad.includes(nombre) || nombre.includes(ciudad))) ||
          (nombreSucursal && nombreSucursal.includes(nombre));
      });
      if (candidatas.length === 0) return null;

      const boleteria = candidatas.find(s =>
        /boleter|oficin/i.test(String(s.nombre_sucursal || '')) &&
        !/encomiend/i.test(String(s.nombre_sucursal || ''))
      );
      return boleteria || candidatas[0];
    };

    const lista = [];
    const porCantonVisto = new Set();
    const porOficina = new Map();

    const agregar = (cantonId, { nueva = false } = {}) => {
      if (cantonId == null || cantonId === '') return false;
      const key = String(cantonId);
      if (porCantonVisto.has(key)) return false;

      const guardadoPrevio = porCanton.get(key) || null;
      const sucursal = buscarSucursal(cantonId, guardadoPrevio);
      const idSucursal = sucursal?.id_sucursal ?? guardadoPrevio?.id_sucursal ?? null;
      const guardado = guardadoPrevio ||
        (idSucursal != null ? porSucursal.get(String(idSucursal)) : null) ||
        null;

      // Un cantón genérico ("Ambato") puede representar la oficina configurada
      // como parroquia ("AMBATO (SUR)"): se conserva el cantón ya guardado.
      const cantonEfectivo = guardado?.canton_id != null ? String(guardado.canton_id) : key;
      const canton = (catalogoCantones || []).find(c => String(c.id_canton) === cantonEfectivo);

      const fila = {
        cantonId: cantonEfectivo,
        nombre: canton?.nombre_canton || (guardado ? `Cantón ${cantonEfectivo}` : cantonEfectivo),
        idSucursal,
        nombreSucursal: sucursal?.nombre_sucursal || null,
        guardada: Boolean(guardado),
        minutosGuardados: guardado && Number.isFinite(Number(guardado.minutos_desde_origen))
          ? Number(guardado.minutos_desde_origen)
          : null,
        ordenGuardado: guardado ? guardado.orden : null,
        nueva,
      };

      // La misma oficina ya está en la cadena (p. ej. "Ambato" genérico y
      // "AMBATO (SUR)"): se queda la que tiene configuración guardada.
      if (idSucursal != null && porOficina.has(String(idSucursal))) {
        const idx = porOficina.get(String(idSucursal));
        if (!lista[idx].guardada && fila.guardada) {
          porCantonVisto.delete(lista[idx].cantonId);
          porCantonVisto.add(cantonEfectivo);
          lista[idx] = fila;
        }
        return false;
      }

      porCantonVisto.add(key);
      porCantonVisto.add(cantonEfectivo);
      if (idSucursal != null) porOficina.set(String(idSucursal), lista.length);
      lista.push(fila);
      return true;
    };

    const subrutasOrdenadas = [...(subrutas || [])].sort((a, b) =>
      (Number(a.orden_sub_rutas) || 0) - (Number(b.orden_sub_rutas) || 0) ||
      (Number(a.id_sub_rutas) || 0) - (Number(b.id_sub_rutas) || 0)
    );

    // 1. Origen de la ruta y orígenes de las subrutas (cadena de despacho).
    agregar(route?.id_fkorigen_rutas);
    for (const sr of subrutasOrdenadas) agregar(sr.id_fkorigen_sub_rutas);

    // 2. Oficinas de destino que nunca son origen (p. ej. Puyo en Quito-Puyo):
    //    se toman las que salen de la última oficina de la cadena.
    const ultima = lista[lista.length - 1];
    if (ultima) {
      for (const sr of subrutasOrdenadas) {
        if (String(sr.id_fkorigen_sub_rutas) !== ultima.cantonId) continue;
        const destino = sr.id_fkdestino_sub_rutas;
        if (destino == null || porCantonVisto.has(String(destino))) continue;
        const guardadoDestino = porCanton.get(String(destino)) || null;
        if (!buscarSucursal(destino, guardadoDestino)) continue;
        agregar(destino, { nueva: !guardadoDestino });
      }
    }

    // 3. Mantener el orden ya guardado: los minutos acumulados guardados
    //    corresponden a ese orden. Las paradas nuevas van al final.
    const final = [
      ...lista.filter(p => p.guardada).sort((a, b) => (a.ordenGuardado ?? 0) - (b.ordenGuardado ?? 0)),
      ...lista.filter(p => !p.guardada),
    ];
    if (lista[0] && !lista[0].guardada) {
      const idx = final.indexOf(lista[0]);
      if (idx > 0) {
        final.splice(idx, 1);
        final.unshift(lista[0]);
      }
    }

    // 4. Restaurar los tramos entre paradas consecutivas. Un tramo con una
    //    parada nueva sin configurar queda vacío y no se guarda.
    const deltas = [];
    for (let i = 0; i < final.length - 1; i++) {
      const desde = final[i].minutosGuardados;
      const hasta = final[i + 1].minutosGuardados;
      deltas.push(desde != null && hasta != null ? Math.max(0, hasta - desde) : '');
    }

    setParadas(final);
    setTiempos(deltas);
  }, [open, route, subrutas, sucursales, catalogoCantones]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const mapped = [];
    let acumulado = 0;

    for (let i = 0; i < paradas.length; i++) {
      const parada = paradas[i];
      const deltaEntrada = i === 0 ? 0 : tiempos[i - 1];
      const delta = deltaEntrada === '' || deltaEntrada == null
        ? null
        : Math.max(0, parseInt(deltaEntrada, 10) || 0);

      if (i > 0) {
        if (delta !== null) acumulado += delta;
        else if (parada.minutosGuardados != null) acumulado = parada.minutosGuardados;
      }

      // Las paradas nuevas se guardan solo si se les asignó un tiempo; una
      // parada ya configurada nunca se pierde al guardar.
      if (i > 0 && !parada.guardada && delta === null) continue;

      mapped.push({
        id_sucursal: parada.idSucursal ? parseInt(parada.idSucursal, 10) : null,
        canton_id: parseInt(parada.cantonId, 10),
        minutos_desde_origen: acumulado,
        orden: mapped.length + 1,
      });
    }

    // Conservar paradas que ya estaban configuradas y no aparecen en la
    // cadena visible: abrir y guardar no debe borrar tiempos de otras oficinas.
    const cantonesMapeados = new Set(mapped.map(p => String(p.canton_id)));
    const sucursalesMapeadas = new Set(
      mapped.filter(p => p.id_sucursal != null).map(p => String(p.id_sucursal))
    );
    for (const g of extraerGuardados(route)) {
      const cantonKey = g.canton_id != null ? String(g.canton_id) : null;
      const sucursalKey = g.id_sucursal != null ? String(g.id_sucursal) : null;
      if (cantonKey && cantonesMapeados.has(cantonKey)) continue;
      if (!cantonKey && sucursalKey && sucursalesMapeadas.has(sucursalKey)) continue;
      mapped.push({
        id_sucursal: g.id_sucursal != null ? parseInt(g.id_sucursal, 10) : null,
        canton_id: g.canton_id != null ? parseInt(g.canton_id, 10) : null,
        minutos_desde_origen: Number(g.minutos_desde_origen) || 0,
        orden: mapped.length + 1,
      });
    }

    if (mapped.length === 0 || !mapped.some(p => p.id_sucursal)) {
      alert('No se encontró ninguna sucursal para guardar. Verifica que los cantones de las paradas tengan oficinas registradas.');
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
              <p>El sistema detectó las oficinas de la ruta (origen, paradas y destino final).</p>
              <p className="mt-1 font-medium text-indigo-600">Ingrese los minutos que toma viajar de una oficina a la siguiente.</p>
              <p className="mt-1 text-xs text-slate-400">Un tramo vacío no se guarda.</p>
            </div>

            <div className="py-2">
              {paradas.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <i className="fas fa-exclamation-triangle text-3xl mb-3 text-amber-400"></i>
                  <p>No se encontraron orígenes en las subrutas actuales.</p>
                  <p className="text-xs mt-1">Cree al menos una subruta para configurar tiempos.</p>
                </div>
              ) : (
                paradas.map((parada, index) => (
                  <div key={parada.cantonId} className="flex flex-col items-center">

                    {/* CAJA DE LA PARADA */}
                    <div className="bg-white border-2 border-indigo-100 rounded-xl p-4 shadow-sm w-full sm:w-3/4 text-center relative z-10 transition-all hover:border-indigo-300">
                      <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        {index + 1}
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg">{parada.nombre}</h3>
                      <p className="text-xs text-slate-500 uppercase font-semibold mt-1">
                        {parada.nombreSucursal || 'Punto de Despacho'}
                      </p>
                      {!parada.idSucursal && (
                        <p className="text-red-500 text-xs mt-2 bg-red-50 p-1.5 rounded border border-red-100">
                          <i className="fas fa-exclamation-circle mr-1"></i> No hay sucursal en este cantón
                        </p>
                      )}
                      {parada.nueva && (
                        <p className="text-sky-600 text-xs mt-2 bg-sky-50 p-1.5 rounded border border-sky-100">
                          <i className="fas fa-info-circle mr-1"></i> Parada sin tiempo: asigne el tramo para incluirla
                        </p>
                      )}
                    </div>

                    {/* CONECTOR CON INPUT DE TIEMPO (solo si no es la última) */}
                    {index < paradas.length - 1 && (
                      <div className="flex flex-col items-center my-1 relative z-0">
                        <div className="h-6 w-1 bg-indigo-200"></div>
                        <div className="flex items-center gap-2 bg-indigo-50 border-2 border-indigo-200 rounded-full px-4 py-2 my-1 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all">
                          <i className="fas fa-clock text-indigo-500" />
                          <input 
                            type="number" 
                            min="0"
                            placeholder="—"
                            className="w-16 bg-transparent text-center font-black text-indigo-700 text-lg focus:outline-none placeholder-indigo-300" 
                            value={tiempos[index] ?? ''}
                            onChange={e => {
                              const nuevos = [...tiempos];
                              nuevos[index] = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                              setTiempos(nuevos);
                            }}
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
              disabled={saving || paradas.length === 0} 
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
