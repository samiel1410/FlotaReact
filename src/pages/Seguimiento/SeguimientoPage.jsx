import { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { api } from '../../config/axios';
import { useAuth } from '../../context/AuthContext';
import { SeguimientoService } from '../../services/seguimiento.service';

const PAGE_SIZE = 15;

/** Mapa de estado_seguimiento a etiqueta legible (fiel al ExtJS) */
const ESTADO_MAP = {
  '1': { label: 'EN OFICINA', color: 'bg-slate-100 text-slate-700' },
  '2': { label: 'POR ENTREGAR', color: 'bg-yellow-100 text-yellow-700' },
  '3': { label: 'PENDIENTE ANULAR', color: 'bg-orange-100 text-orange-700' },
  '8': { label: 'EN BUS', color: 'bg-indigo-100 text-indigo-700' },
  '7': { label: 'VIAJANDO', color: 'bg-blue-100 text-blue-700' },
  '4': { label: 'ANULADO', color: 'bg-red-100 text-red-700' },
  '9': { label: 'CANCELADO', color: 'bg-red-100 text-red-700' },
  '10': { label: 'ENTREGADO', color: 'bg-emerald-100 text-emerald-700' },
};

const getEstadoBadge = (value) => {
  const v = String(value);
  return ESTADO_MAP[v] || { label: v || '-', color: 'bg-slate-100 text-slate-600' };
};

/** Formatea número de guía con guiones automáticos: XXX-XXX-XXXXXXXXX (3-3-9) */
const formatNumeroGuia = (value) => {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 15)}`;
};

const formatFecha = (fecha) => {
  if (!fecha) return '-';
  const texto = String(fecha).trim();
  // MySQL entrega 'YYYY-MM-DD HH:mm:ss' en hora local; se muestra tal cual
  // para no volver a convertirla con la zona horaria del navegador.
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/);
  if (partes && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(texto)) {
    return `${partes[1]}-${partes[2]}-${partes[3]} ${partes[4]}`;
  }
  try {
    const d = new Date(fecha);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}`;
  } catch {
    return fecha;
  }
};

export const SeguimientoPage = ({ isNotaVenta = false }) => {
  const { user } = useAuth();
  const [numeroGuia, setNumeroGuia] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [pagina, setPagina] = useState(1);

  // Guía ubicada (paso 2) y registro de CHECKING / FINALIZAR
  const [guiaInfo, setGuiaInfo] = useState(null);
  const [observacion, setObservacion] = useState('');
  const [procesando, setProcesando] = useState(false);
  // Datos del viaje (solo CHEKING)
  const [buses, setBuses] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [idBus, setIdBus] = useState('');
  const [destino, setDestino] = useState('');

  useEffect(() => {
    // Combos necesarios para el CHEKING (bus y destino del viaje)
    if (isNotaVenta) return;

    const cargarCombos = async () => {
      try {
        const [resBuses, resDestinos] = await Promise.all([
          api.get('/buses/seleccionarBusesCombo'),
          api.get('/destino/destinoSeleccionCombo'),
        ]);

        setBuses(resBuses.data?.data || []);

        const lugares = (resDestinos.data?.data || [])
          .map((d) => d.lugar_destino || d.nombre_destino || '')
          .filter(Boolean);

        setDestinos([...new Set(lugares)].sort((a, b) => a.localeCompare(b)));
      } catch (err) {
        console.error('[Seguimiento] Error al cargar combos:', err);
      }
    };

    cargarCombos();
  }, [isNotaVenta]);

  /** Resultados paginados localmente */
  const resultadosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * PAGE_SIZE;
    return resultados.slice(inicio, inicio + PAGE_SIZE);
  }, [resultados, pagina]);

  const totalPaginas = Math.max(1, Math.ceil(resultados.length / PAGE_SIZE));

  const apiEndpoint = isNotaVenta ? '/seguimiento_nota_venta' : '/seguimiento';

  /**
   * Paso 1: ubica la guía por su número y carga su historial de seguimientos.
   * Si la guía no existe, no se habilita el registro (paso 2).
   */
  const handleBuscar = async (guiaParam) => {
    const guia = String(guiaParam ?? numeroGuia).trim();
    if (!guia) {
      toast.error('Ingrese un número de guía para buscar');
      return;
    }

    setLoading(true);
    setPagina(1);
    try {
      // 1. Ubicar la guía (las notas de venta solo consultan historial)
      if (!isNotaVenta) {
        const busqueda = await SeguimientoService.buscarGuiaParaSeguimiento(guia);
        if (!busqueda?.success || !busqueda?.data?.id_guia) {
          setGuiaInfo(null);
          setResultados([]);
          setBuscado(false);
          toast.error(busqueda?.message || 'No se encontró la guía');
          return;
        }
        setGuiaInfo(busqueda.data);
        setDestino(busqueda.data.destino_guia || '');
        setIdBus('');
      }

      // 2. Historial de seguimientos
      const res = await api.get(`${apiEndpoint}/buscarGuiaSeguimineto?guia=${encodeURIComponent(guia)}`);

      const datos = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.resultados)
            ? res.data.resultados
            : [];

      setBuscado(true);
      setResultados(datos);

      if (datos.length === 0) {
        toast('La guía no tiene movimientos registrados', { icon: 'ℹ️' });
      }
    } catch (err) {
      console.error('[Seguimiento] Error al buscar:', err);
      toast.error('Error al buscar seguimientos');
      setResultados([]);
      setGuiaInfo(null);
      setBuscado(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBuscar();
    }
  };

  const handleLimpiar = () => {
    setNumeroGuia('');
    setGuiaInfo(null);
    setObservacion('');
    setIdBus('');
    setDestino('');
    setResultados([]);
    setBuscado(false);
    setPagina(1);
  };

  /**
   * Resuelve la ubicación y la oficina del usuario (los mismos datos que envía la app móvil).
   * La fuente confiable es el backend: `user.id_sucursal` puede quedar apuntando a
   * otra agencia si el usuario cambió de agencia en Boletería (se persiste en user_data).
   */
  const resolverUbicacion = async () => {
    let ubicacion = '';
    // id_oficina debe ser el id real de la sucursal, no su código
    let idOficina = '';

    try {
      const res = await api.get('/buscarUsuario');
      const u = res.data?.data;
      if (u) {
        ubicacion = u.nombre_canton || u.ciudad_sucursal || u.canton || u.ciudad || '';
        idOficina = u.id_sucursal || '';
      }
    } catch (e) {
      // Sin datos del backend se usan los de la sesión
    }

    if (!ubicacion) {
      ubicacion = user?.nombre_canton || user?.canton || user?.ciudad || '';
    }

    const codigoSucursal = user?.id_fksucursal_usuario || user?.sucursal_usuario || user?.id_fksucursal || '';
    if (!idOficina && codigoSucursal) {
      try {
        const res = await api.get('/sucursal/comboSucursal');
        const lista = res.data?.data || [];
        const miSucursal = lista.find((s) => String(s.suc_codigo_sucursal) === String(codigoSucursal));
        if (miSucursal) {
          ubicacion = ubicacion || miSucursal.nombre_sucursal || miSucursal.ciudad_sucursal || '';
          idOficina = miSucursal.id_sucursal || '';
        }
      } catch (e) {
        // Si falla, se envía lo disponible (el backend lo acepta)
      }
    }

    return { ubicacion, idOficina };
  };

  /**
   * Paso 2: registra el seguimiento de la guía ubicada.
   * estado 1 = CHECKING (en camino) · estado 2 = FINALIZAR (entregada a destino)
   */
  const handleAccion = async (estado) => {
    const accionNombre = estado === 1 ? 'CHECKING' : 'FINALIZAR';

    if (!guiaInfo?.id_guia) {
      toast.error('Primero busque una guía');
      return;
    }

    if (Number(guiaInfo.estado_guia_seguimiento) === 1) {
      toast.error(`La guía ${guiaInfo.numero_guia} ya está finalizada`);
      return;
    }

    const idUsuario = user?.id_usuario || user?.id || 0;
    if (!idUsuario) {
      toast.error('No se pudo identificar al usuario de la sesión');
      return;
    }

    // El CHEKING viaja en un bus hacia un destino
    if (estado === 1) {
      if (!idBus) {
        toast.error('Seleccione el bus para el CHEKING');
        return;
      }
      if (!destino.trim()) {
        toast.error('Ingrese el destino para el CHEKING');
        return;
      }
    }

    const confirm = await Swal.fire({
      title: `¿Registrar ${accionNombre}?`,
      text:
        estado === 1
          ? `Guía ${guiaInfo.numero_guia} · Bus ${idBus} → ${destino}`
          : `Guía ${guiaInfo.numero_guia} · ${guiaInfo.origen_guia || '-'} → ${guiaInfo.destino_guia || '-'}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accionNombre}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: estado === 1 ? '#2563eb' : '#059669',
    });

    if (!confirm.isConfirmed) return;

    setProcesando(true);
    try {
      const { ubicacion, idOficina } = await resolverUbicacion();

      const res = await SeguimientoService.insertarSeguimientoGuia({
        idGuia: guiaInfo.id_guia,
        observacion: observacion.trim(),
        estado,
        idUsuario,
        ubicacion,
        idOficina,
        idBus,
        destino: destino.trim(),
      });

      if (res?.success === false) {
        toast.error(res?.message || res?.data || 'No se pudo registrar el seguimiento');
        return;
      }

      // El backend responde data: 1 cuando la guía ya tenía ese seguimiento
      if (Number(res?.data) === 1) {
        toast(`${accionNombre} ya estaba registrado para esta guía`, { icon: 'ℹ️' });
      } else {
        toast.success(`${accionNombre} registrado correctamente`);
      }

      // Refrescar el estado y el historial de la guía
      setObservacion('');
      handleBuscar(guiaInfo.numero_guia || numeroGuia);
    } catch (err) {
      console.error('[Seguimiento] Error al registrar seguimiento:', err);
      toast.error('Error al registrar el seguimiento');
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminar = async (record) => {
    const estadoVal = String(record.estado_seguimiento);

    if (estadoVal !== '10') {
      toast.error('Solo se pueden eliminar los seguimientos con estado ENTREGADO');
      return;
    }

    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: 'Esta acción eliminará el seguimiento seleccionado',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await api.get(`${apiEndpoint}/eliminarSeguimientoEntregado?id_seguimiento=${record.id_seguimiento}`);
      
      if (res.data?.success !== false) {
        toast.success('Seguimiento eliminado');
        // Re-buscar para refrescar la lista
        handleBuscar();
      } else {
        toast.error(res.data?.message || 'Error al eliminar seguimiento');
      }
    } catch (err) {
      console.error('[Seguimiento] Error al eliminar:', err);
      toast.error('Error al eliminar seguimiento');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <i className="fas fa-box-open text-blue-600 text-lg"></i>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">SEGUIMIENTOS</h1>
          <p className="text-xs text-slate-500">Búsqueda y gestión de seguimientos de guías</p>
        </div>
      </div>

      {/* Paso 1: ubicar la guía */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
          Número de Guía
        </label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
            placeholder="001-0001-0000001"
            value={numeroGuia}
            onChange={(e) => {
              setNumeroGuia(formatNumeroGuia(e.target.value));
              setGuiaInfo(null);
              setResultados([]);
              setBuscado(false);
            }}
            onKeyDown={handleKeyDown}
            maxLength={17}
            disabled={procesando}
          />
          <button
            onClick={() => handleBuscar()}
            disabled={loading || procesando}
            className="shrink-0 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors text-sm whitespace-nowrap flex items-center gap-2"
          >
            <i className={loading ? 'fas fa-spinner fa-spin' : 'fas fa-search'}></i>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
          <button
            onClick={handleLimpiar}
            disabled={procesando}
            className="shrink-0 px-3 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-50 rounded-lg font-medium transition-colors text-sm whitespace-nowrap flex items-center gap-2"
          >
            <i className="fas fa-eraser"></i>
            Limpiar
          </button>
        </div>
      </div>

      {/* Paso 2: aparece solo cuando la guía fue encontrada */}
      {guiaInfo && !isNotaVenta && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <i className="fas fa-box text-blue-600 text-lg"></i>
              </div>
              <div>
                <p className="font-mono font-bold text-slate-800">{guiaInfo.numero_guia}</p>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  {guiaInfo.origen_guia || '-'}
                  <i className="fas fa-arrow-right text-[10px] text-slate-400"></i>
                  {guiaInfo.destino_guia || '-'}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${
                Number(guiaInfo.estado_guia_seguimiento) === 1
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {Number(guiaInfo.estado_guia_seguimiento) === 1 ? 'FINALIZADA' : 'EN SEGUIMIENTO'}
            </span>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Observación
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Detalle para CHECKING o FINALIZAR"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              maxLength={200}
              disabled={procesando}
            />
          </div>

          {Number(guiaInfo.estado_guia_seguimiento) === 1 ? (
            <p className="text-xs text-emerald-600 mt-4 flex items-center gap-2">
              <i className="fas fa-circle-check"></i>
              Esta guía ya fue finalizada, no admite nuevos seguimientos.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Bus <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={idBus}
                    onChange={(e) => setIdBus(e.target.value)}
                    disabled={procesando}
                  >
                    <option value="">Seleccione un bus</option>
                    {buses.map((b) => (
                      <option key={b.id_buses} value={b.id_buses}>
                        Bus {b.disco_buses} ({b.placa_buses})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Destino <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="destinos-seguimiento"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Ciudad o lugar de destino"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    disabled={procesando}
                  />
                  <datalist id="destinos-seguimiento">
                    {destinos.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button
                  onClick={() => handleAccion(1)}
                  disabled={procesando}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold transition-colors text-sm whitespace-nowrap flex items-center gap-2"
                >
                  <i className={procesando ? 'fas fa-spinner fa-spin' : 'fas fa-check'}></i>
                  CHECKING
                </button>
                <button
                  onClick={() => handleAccion(2)}
                  disabled={procesando}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-semibold transition-colors text-sm whitespace-nowrap flex items-center gap-2"
                >
                  <i className={procesando ? 'fas fa-spinner fa-spin' : 'fas fa-flag-checkered'}></i>
                  FINALIZAR
                </button>
              </div>

              <p className="text-xs text-slate-400 mt-3 flex items-center gap-2">
                <i className="fas fa-circle-info"></i>
                Bus y destino son obligatorios para el CHEKING; FINALIZAR no requiere datos extra.
              </p>
            </>
          )}
        </div>
      )}

      {/* Grid de resultados */}
      {buscado && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <h2 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
              <i className="fas fa-clock-rotate-left text-slate-400"></i>
              Historial de la guía
              <span className="font-mono text-slate-500 normal-case">{numeroGuia}</span>
            </h2>
            {!loading && resultados.length > 0 && (
              <span className="text-xs font-semibold text-slate-500">
                {resultados.length} movimiento{resultados.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <i className="fas fa-spinner fa-spin text-2xl mr-3 text-blue-500"></i>
              <span className="font-medium">Buscando seguimientos...</span>
            </div>
          ) : resultados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <i className="fas fa-inbox text-4xl mb-3 text-slate-300"></i>
              <p className="font-medium">No se encontraron resultados</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">GUÍA</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">OFICINA</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">OBSERVACIÓN</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">FECHA Y HORA</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">BUS</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">USUARIO</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ESTADO</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-16">ACCIÓN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultadosPaginados.map((r, idx) => {
                      const badge = getEstadoBadge(r.estado_seguimiento);
                      const puedeEliminar = String(r.estado_seguimiento) === '10';
                      return (
                        <tr key={r.id_seguimiento || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-700 font-medium text-xs">
                            {r.numeroguia || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {r.ubicacion_seguimiento || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs italic max-w-[200px] truncate">
                            {r.observacion_seguimiento || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                            {formatFecha(r.fecha_creacion_seguimiento)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {r.bus_seguimiento || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {r.usuario || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${badge.color}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleEliminar(r)}
                              disabled={!puedeEliminar}
                              title={puedeEliminar ? 'Eliminar seguimiento' : 'Solo se puede eliminar en estado ENTREGADO'}
                              className={`p-1.5 rounded-md transition-colors ${
                                puedeEliminar
                                  ? 'text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer'
                                  : 'text-slate-300 cursor-not-allowed'
                              }`}
                            >
                              <i className="fas fa-minus-circle text-lg"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación local */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-500">
                  Mostrando {((pagina - 1) * PAGE_SIZE) + 1} - {Math.min(pagina * PAGE_SIZE, resultados.length)} de {resultados.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                    disabled={pagina <= 1}
                    className="px-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
                    const pageNum = start + i;
                    if (pageNum > totalPaginas) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPagina(pageNum)}
                        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                          pagina === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                    disabled={pagina >= totalPaginas}
                    className="px-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SeguimientoPage;
