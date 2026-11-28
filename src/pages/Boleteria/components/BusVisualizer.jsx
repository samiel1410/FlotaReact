import { useState, useEffect, useMemo } from 'react';
import {
  CAMPO_COLOR_POR_ESTADO,
  ESTADOS_ASIENTO,
  normalizarColoresAsientos,
  normalizarColorIdentificacion,
  estiloAsiento,
} from '../../../config/coloresAsientos';
import './BusVisualizer.css';

// Estados que conservan su color propio. Los asientos vendidos se pintan con
// el color de la agencia que los vendió (identificación), no con el estado.
const LEYENDA_ESTADOS = ['libre', 'libre-parada', 'pendiente', 'seleccionado']
  .map((key) => ESTADOS_ASIENTO.find((estado) => estado.key === key))
  .filter(Boolean);

// Marcador que distingue un asiento vendido para todo el recorrido de uno
// vendido solo por un tramo (los dos usan el color de la oficina vendedora).
const MARCADORES_OCUPADO = [
  {
    estado: 'ocupado',
    icon: 'fa-flag-checkered',
    clase: 'seat-badge--fin',
    label: 'Ocupado hasta el final',
  },
  {
    estado: 'ocupado-parcial',
    icon: 'fa-circle-half-stroke',
    clase: 'seat-badge--parcial',
    label: 'Ocupado por tramo',
  },
];

const formatearTiempoBloqueo = (lockedAt, now) => {
  if (!lockedAt) return '';
  const segundos = Math.floor((now - lockedAt) / 1000);
  if (segundos < 60) return `${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  const segs = segundos % 60;
  return `${minutos}m ${segs}s`;
};

export const BusVisualizer = ({
  asientosOcupados = [],
  asientosSeleccionados = [],
  asientosPendientes = {},  // { [numeroAsiento]: { usuario: 'nombre', lockedAt: timestamp } }
  pasajeros = [],           // pasajeros ya cargados en la venta ({ asiento, nombres, cedula, id_destino })
  destinosViaje = [],       // sub-rutas del viaje ({ id_sub_rutas, nombre_sub_rutas })
  onAsientoClick,
  onAsientoOcupadoClick,
  capacidad = 40,
  mapaAsientos = null,
  onCambiarBus,
  coloresAsientos = null,   // colores configurados por la agencia para cada estado
  seatLockTimeoutMs = 15 * 60 * 1000  // 15 minutos por defecto
}) => {
  const paletaAsientos = useMemo(
    () => normalizarColoresAsientos(coloresAsientos),
    [coloresAsientos]
  );
  const estilosPorEstado = useMemo(() => {
    const estilos = {};
    for (const [estado, campo] of Object.entries(CAMPO_COLOR_POR_ESTADO)) {
      estilos[estado] = estiloAsiento(paletaAsientos[campo]);
    }
    return estilos;
  }, [paletaAsientos]);
  const estiloEstado = (estado) => estilosPorEstado[estado];
  // Asientos vendidos: se pintan con el color de la oficina que los vendió
  // para reconocer de un vistazo quién vendió (Sur, Inga Urco, etc.). Si la
  // oficina no configuró color propio, se mantiene el color del estado.
  const colorVentaDeAsiento = (numeroAsiento) => {
    // Primero el color de la oficina que define el estado (la que bloquea);
    // si esa no tiene color propio, se busca en los demás tramos del asiento.
    const principal = filaPrincipalDeAsiento(numeroAsiento);
    const colorPrincipal = normalizarColorIdentificacion(principal?.color_sucursal_venta);
    if (colorPrincipal) return colorPrincipal;
    for (const fila of getOcupadosDeAsiento(numeroAsiento)) {
      const color = normalizarColorIdentificacion(fila?.color_sucursal_venta);
      if (color) return color;
    }
    return null;
  };
  // Fila que define el estado del asiento: la más restrictiva (la que bloquea).
  const PRIORIDAD_ESTADO = { ocupado: 0, 'ocupado-parcial': 1, 'libre-parada': 2 };
  const filaPrincipalDeAsiento = (numeroAsiento) => {
    const filas = getOcupadosDeAsiento(numeroAsiento);
    return filas.reduce((mejor, fila) => {
      if (!mejor) return fila;
      const prioridad = PRIORIDAD_ESTADO[estadoDeOcupacion(fila)] ?? 9;
      const prioridadMejor = PRIORIDAD_ESTADO[estadoDeOcupacion(mejor)] ?? 9;
      return prioridad < prioridadMejor ? fila : mejor;
    }, null);
  };
  const estiloDeAsiento = (numeroAsiento, estado) => {
    if (estado === 'ocupado' || estado === 'ocupado-parcial') {
      const colorVenta = colorVentaDeAsiento(numeroAsiento);
      if (colorVenta) return estiloAsiento(colorVenta);
    }
    return estiloEstado(estado);
  };
  const marcadorDeEstado = (estado) =>
    MARCADORES_OCUPADO.find((m) => m.estado === estado) || null;
  // Oficinas que vendieron asientos del viaje, con su color de identificación.
  const vendedores = useMemo(() => {
    const mapa = new Map();
    for (const fila of asientosOcupados) {
      if (!fila || typeof fila !== 'object') continue;
      // 'libre-parada' se pinta como disponible: su oficina no identifica nada.
      if (fila.estado_ocupacion === 'libre-parada') continue;
      const color = normalizarColorIdentificacion(fila.color_sucursal_venta);
      const nombre = String(fila.nombre_sucursal_venta || '').trim();
      if (!color || !nombre || mapa.has(nombre)) continue;
      mapa.set(nombre, color);
    }
    return [...mapa.entries()]
      .map(([nombre, color]) => ({ nombre, color }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [asientosOcupados]);
  // Timer para actualizar los tiempos de bloqueo cada segundo
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const [pisoActivo, setPisoActivo] = useState(0);
  // Tooltip flotante (position: fixed) para que no lo recorte el scroll del mapa
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!tooltip) return undefined;
    const ocultar = () => setTooltip(null);
    window.addEventListener('scroll', ocultar, true);
    window.addEventListener('resize', ocultar);
    return () => {
      window.removeEventListener('scroll', ocultar, true);
      window.removeEventListener('resize', ocultar);
    };
  }, [tooltip]);

  // Parsear mapa de asientos personalizado
  let mapaData = null;
  if (mapaAsientos && typeof mapaAsientos === 'string') {
    try { mapaData = JSON.parse(mapaAsientos); } catch (e) { mapaData = null; }
  } else if (mapaAsientos && typeof mapaAsientos === 'object') {
    mapaData = mapaAsientos;
  }

  const pisosMapa = mapaData?.pisos || [{}];
  const gridWidth = mapaData?.gridWidth || 4;
  const gridHeight = mapaData?.gridHeight || Math.ceil(capacidad / 4);

  // Estado de un asiento con boleto. El backend lo resuelve por solape de
  // recorrido ('ocupado', 'ocupado-parcial', 'libre-parada'); si no viene, se
  // mantiene el cálculo anterior por órdenes.
  const estadoDeOcupacion = (ocupado) => {
    if (!ocupado || typeof ocupado !== 'object') return 'ocupado';
    if (ocupado.estado_ocupacion) return ocupado.estado_ocupacion;
    if (ocupado.orden_destino !== undefined) {
      const ordenDestino = ocupado.orden_destino || 9999;
      const ordenActual = ocupado.orden_actual || 0;
      const ordenVenta = ocupado.orden_venta || 0;
      const maxOrden = ocupado.max_orden || 9999;

      if (ordenDestino <= ordenActual || ordenActual < ordenVenta) return 'libre-parada';
      if (ordenDestino < maxOrden) return 'ocupado-parcial';
      return 'ocupado';
    }
    return 'ocupado';
  };

  const getSeatStatus = (numeroAsiento) => {
    const num = Number(numeroAsiento);
    if (asientosSeleccionados.includes(num)) return 'seleccionado';

    // Un mismo asiento puede tener varios boletos (tramos distintos): gana el
    // estado más restrictivo para la venta actual. 'libre-parada' significa que
    // el pasajero anterior bajó en esta parada, así que se puede vender.
    const estados = getOcupadosDeAsiento(num).map(estadoDeOcupacion);
    if (estados.includes('ocupado')) return 'ocupado';
    if (estados.includes('ocupado-parcial')) return 'ocupado-parcial';
    if (estados.includes('libre-parada')) return 'libre-parada';

    // Luego verificar si otro usuario lo está seleccionando
    if (asientosPendientes && asientosPendientes[num]) return 'pendiente';

    return 'libre';
  };

  // Filas de ocupación de un asiento: un mismo asiento puede tener varios
  // boletos (tramos distintos), por eso se devuelven todas las coincidencias.
  const getOcupadosDeAsiento = (numeroAsiento) => {
    const num = Number(numeroAsiento);
    return asientosOcupados.filter((a) => (a && typeof a === 'object'
      ? Number(a.asiento_boleto_detalle) === num
      : Number(a) === num));
  };

  // El nombre del tramo viene resuelto del backend; si falta (asiento llegado
  // por socket) se busca en las sub-rutas del viaje.
  const nombreDestinoDe = (fila) => {
    if (!fila) return '';
    if (fila.nombre_destino) return fila.nombre_destino;
    const sub = destinosViaje.find((d) => String(d.id_sub_rutas) === String(fila.id_destino_boleto));
    return sub?.nombre_sub_rutas || '';
  };

  const textoEstadoOcupado = (estado) => {
    if (estado === 'ocupado-parcial') return 'Ocupado por tramo';
    if (estado === 'libre-parada') return 'Libre en esta parada (el anterior bajó)';
    if (estado === 'ocupado') return 'Ocupado todo el recorrido';
    return 'Ocupado';
  };

  const getTooltipInfo = (numeroAsiento) => {
    const num = Number(numeroAsiento);
    const base = { numero: num, estado: 'libre', titulo: 'Disponible' };

    // Pendiente (siendo seleccionado por otro)
    if (asientosPendientes && asientosPendientes[num]) {
      const info = asientosPendientes[num];
      const usuario = typeof info === 'string' ? info : info.usuario;
      const lockedAt = typeof info === 'object' ? info.lockedAt : null;
      const tiempo = lockedAt ? formatearTiempoBloqueo(lockedAt, now) : '';
      const restante = lockedAt ? Math.max(0, Math.floor((seatLockTimeoutMs - (now - lockedAt)) / 1000)) : null;
      return {
        ...base,
        estado: 'pendiente',
        titulo: 'Lo está seleccionando otro usuario',
        usuario,
        tiempo: restante !== null
          ? `${tiempo} · restan ${Math.floor(restante / 60)}m ${restante % 60}s`
          : tiempo
      };
    }

    // Asiento de esta venta: se muestra el pasajero ya capturado
    if (asientosSeleccionados.includes(num)) {
      const pasajero = pasajeros.find((p) => Number(p.asiento) === num);
      const sub = destinosViaje.find((d) => String(d.id_sub_rutas) === String(pasajero?.id_destino));
      return {
        ...base,
        estado: 'seleccionado',
        titulo: 'Seleccionado (tú)',
        cliente: pasajero?.nombres || pasajero?.nombre || '',
        documento: pasajero?.cedula || '',
        destino: nombreDestinoDe(pasajero ? { id_destino_boleto: pasajero.id_destino } : null),
        origen: sub?.nombre_lugar_origen || sub?.origen_nombre || ''
      };
    }

    const ocupados = getOcupadosDeAsiento(num);
    if (ocupados.length === 0) return base;

    const estado = getSeatStatus(num);
    // La fila que bloquea aporta estado y oficina vendedora; si no tiene
    // cliente identificado se usa la primera que sí lo tenga.
    const principal = filaPrincipalDeAsiento(num) || ocupados[0];
    const conCliente = ocupados.find((o) => o.nombre_cliente);
    const destinos = [...new Set(ocupados.map(nombreDestinoDe).filter(Boolean))];
    const origen = principal?.nombre_origen || '';
    const oficinaVenta = principal?.nombre_sucursal_venta || '';

    return {
      ...base,
      estado,
      titulo: textoEstadoOcupado(estado),
      colorVenta: normalizarColorIdentificacion(principal?.color_sucursal_venta),
      cliente: (conCliente || principal)?.nombre_cliente || '',
      documento: (conCliente || principal)?.identificacion_cliente || '',
      destino: destinos.join(' · '),
      etiquetaDestino: estado === 'ocupado-parcial'
        ? 'Ocupado hasta'
        : (estado === 'libre-parada' ? 'Bajó en' : 'Vendido hasta'),
      origen,
      // Punto final escrito por la agencia que vendió (venta más allá de la
      // última parada de la ruta, ej. Coca → Aguagrio).
      puntoFinal: principal?.punto_final_destino || principal?.punto_final_boleto_detalle || '',
      // La agencia que vendió solo se distingue cuando no coincide con la salida
      oficina: oficinaVenta && oficinaVenta !== origen ? oficinaVenta : (origen ? '' : oficinaVenta),
      etiquetaOficina: origen && oficinaVenta && oficinaVenta !== origen ? 'Vendido en' : 'Oficina'
    };
  };

  const mostrarTooltip = (event, numeroAsiento) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const info = getTooltipInfo(numeroAsiento);
    const ancho = 240;
    const x = Math.min(
      Math.max(rect.left + rect.width / 2, ancho / 2 + 8),
      window.innerWidth - ancho / 2 - 8
    );
    // Sin espacio arriba, el tooltip se abre hacia abajo
    const below = rect.top < 170;
    setTooltip({ ...info, x, y: below ? rect.bottom + 6 : rect.top - 6, below });
  };

  const ocultarTooltip = () => setTooltip(null);

  const renderPiso = (pisoData, pisoIdx) => {
    if (mapaData && mapaData.pisos) {
      // Render mapa personalizado
      const rows = [];
      for (let row = 0; row < gridHeight; row++) {
        const rowButtons = [];
        for (let col = 0; col < gridWidth; col++) {
          const cellId = `mc_${pisoIdx + 1}_${row}_${col}`;
          const cellData = pisoData[cellId];

          if (!cellData || cellData.tipo === 'pasillo') {
            rowButtons.push(<div key={cellId} className="seat-wrapper" style={{ width: 40, height: 40, margin: '0 4 4 0' }}></div>);
          } else if (cellData.tipo === 'asiento') {
            const num = Number(cellData.numero);
            const status = getSeatStatus(num);
            const marcador = marcadorDeEstado(status);
            rowButtons.push(
              <div key={cellId} className="seat-wrapper">
                  <button
                    className={`bus-seat ${status}`}
                    style={estiloDeAsiento(num, status)}
                    onClick={() => {
                      ocultarTooltip();
                      if (status === 'ocupado' || status === 'ocupado-parcial') {
                        onAsientoOcupadoClick?.(filaPrincipalDeAsiento(num));
                      } else {
                        onAsientoClick(num);
                      }
                    }}
                    onMouseEnter={(e) => mostrarTooltip(e, num)}
                    onMouseLeave={ocultarTooltip}
                    onFocus={(e) => mostrarTooltip(e, num)}
                    onBlur={ocultarTooltip}
                    aria-label={`Asiento ${num} - ${getTooltipInfo(num).titulo}`}
                  >
                    <span className="seat-number">{num}</span>
                    {marcador && (
                      <span className={`seat-badge ${marcador.clase}`} aria-hidden="true">
                        <i className={`fas ${marcador.icon}`}></i>
                      </span>
                    )}
                    {status === 'ocupado-parcial' && <span className="seat-tramo-bar" aria-hidden="true" />}
                  </button>
              </div>
            );
          } else {
            // Otros tipos: bano, escalera, puerta, chofer
            let icon = '';
            let bg = '#f0f0f0';
            if (cellData.tipo === 'bano') { icon = 'fa-restroom'; bg = '#f1c40f'; }
            else if (cellData.tipo === 'escalera') { icon = 'fa-stream'; bg = '#17a2b8'; }
            else if (cellData.tipo === 'puerta') { icon = 'fa-door-open'; bg = '#6c757d'; }
            else if (cellData.tipo === 'chofer') { icon = 'fa-user-tie'; bg = '#343a40'; }

            rowButtons.push(
              <div key={cellId} className="seat-wrapper" style={{
                width: 40, height: 40, margin: '0 4 4 0',
                background: bg, borderRadius: 6, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 16
              }}>
                {icon && <i className={`fas ${icon}`}></i>}
              </div>
            );
          }
        }
        rows.push(
          <div key={`row-${row}`} style={{ display: 'flex' }}>
            {rowButtons}
          </div>
        );
      }
      return rows;
    } else {
      const totalSeats = Math.min(capacidad || 40, 60);
      const seatsPerRow = 4;
      const SPLIT_THRESHOLD = 26;

      const renderSeatsRange = (start, end, label) => {
        const rows = [];
        const count = end - start + 1;
        const totalRows = Math.ceil(count / seatsPerRow);

        for (let row = 0; row < totalRows; row++) {
          const rowButtons = [];
          for (let col = 0; col < seatsPerRow; col++) {
            const seatNum = start + row * seatsPerRow + col;
            if (seatNum > end) break;

            const marginRight = col === 1 ? '30px' : '5px';
            const status = getSeatStatus(seatNum);
            const marcador = marcadorDeEstado(status);

            rowButtons.push(
              <div key={seatNum} className="seat-wrapper" style={{ marginRight }}>
                <button
                  className={`bus-seat ${status}`}
                  style={estiloDeAsiento(seatNum, status)}
                  onClick={() => {
                    ocultarTooltip();
                    if (status === 'ocupado' || status === 'ocupado-parcial') {
                      onAsientoOcupadoClick?.(filaPrincipalDeAsiento(seatNum));
                    } else {
                      onAsientoClick(seatNum);
                    }
                  }}
                  onMouseEnter={(e) => mostrarTooltip(e, seatNum)}
                  onMouseLeave={ocultarTooltip}
                  onFocus={(e) => mostrarTooltip(e, seatNum)}
                  onBlur={ocultarTooltip}
                  aria-label={`Asiento ${seatNum} - ${getTooltipInfo(seatNum).titulo}`}
                >
                  <span className="seat-number">{seatNum}</span>
                  {marcador && (
                    <span className={`seat-badge ${marcador.clase}`} aria-hidden="true">
                      <i className={`fas ${marcador.icon}`}></i>
                    </span>
                  )}
                  {status === 'ocupado-parcial' && <span className="seat-tramo-bar" aria-hidden="true" />}
                </button>
              </div>
            );
          }
          rows.push(
            <div key={`row-${row}`} style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
              {rowButtons}
            </div>
          );
        }
        return (
          <div style={{ textAlign: 'center' }}>
            {label && <div style={{ fontWeight: 600, fontSize: 12, color: '#64748b', marginBottom: 2 }}>{label}</div>}
            {rows}
          </div>
        );
      };

      if (totalSeats > SPLIT_THRESHOLD) {
        return (
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-start' }}>
            {renderSeatsRange(1, SPLIT_THRESHOLD, `Asientos 1\u2013${SPLIT_THRESHOLD}`)}
            {renderSeatsRange(SPLIT_THRESHOLD + 1, totalSeats, `Asientos ${SPLIT_THRESHOLD + 1}\u2013${totalSeats}`)}
          </div>
        );
      }

      return renderSeatsRange(1, totalSeats, null);
    }
  };

  return (
    <div className="bus-visualizer-wrapper">
      {/* Cambiar button (solo el botón, el nro del bus se muestra arriba) */}
      {onCambiarBus && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 15 }}>
          <button
            onClick={onCambiarBus}
            style={{
              background: '#0a365d', color: 'white', fontWeight: 'bold',
              border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12
            }}
          >
            <i className="fas fa-exchange-alt"></i> Cambiar
          </button>
        </div>
      )}

      {/* MAPA DE ASIENTOS */}
      <div style={{
        background: '#fdfdfd', border: '1px solid #d0d0d0', borderRadius: 4,
        padding: 4, flex: 1, overflowY: 'auto'
      }}>
        {/* Front indicator */}
        <div style={{
          background: 'linear-gradient(to bottom, #bdc3c7, #95a5a6)',
          padding: 3, marginBottom: 4, borderRadius: '3px 3px 12px 12px',
          textAlign: 'center', color: 'white', fontWeight: 'bold',
          fontSize: 10, letterSpacing: 0.5
        }}>
          <i className="fas fa-arrow-up" style={{ fontSize: 10 }}></i> FRENTE
        </div>

        {/* Tabs para pisos */}
        {mapaData?.pisos && pisosMapa.length > 1 && (
          <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
            {pisosMapa.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setPisoActivo(idx)}
                style={{
                  flex: 1, padding: '6px 10px', border: 'none', borderRadius: 4,
                  cursor: 'pointer', fontWeight: 'bold', fontSize: 12,
                  background: pisoActivo === idx ? '#0a365d' : '#e2e8f0',
                  color: pisoActivo === idx ? 'white' : '#475569'
                }}
              >
                Piso {idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Seats */}
        <div className="bus-seats-grid" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {renderPiso(pisosMapa[pisoActivo] || {}, pisoActivo)}
        </div>
      </div>

      {/* LEYENDA */}
      <div className="bus-legend">
        <div className="bus-legend-row">
          {LEYENDA_ESTADOS.map((estado) => {
            const estilo = estilosPorEstado[estado.key];
            return (
              <div key={estado.key} className="bus-legend-item">
                <span
                  className="bus-legend-swatch"
                  style={{ background: estilo.background, borderColor: estilo.borderColor }}
                />
                <span>{estado.label}</span>
              </div>
            );
          })}
          <div className="bus-legend-item">
            <span className="bus-legend-swatch" style={{ background: '#95a5a6', borderColor: '#7f8c8d' }} />
            <span>No dispone</span>
          </div>
        </div>

        <div className="bus-legend-row">
          {MARCADORES_OCUPADO.map((marcador) => (
            <div key={marcador.estado} className="bus-legend-item">
              <span className={`seat-badge-sample ${marcador.clase}`}>
                <i className={`fas ${marcador.icon}`}></i>
              </span>
              <span>{marcador.label}</span>
            </div>
          ))}
          <div className="bus-legend-item">
            <span className="bus-legend-swatch bus-legend-swatch--venta" />
            <span>Color = oficina que vendió</span>
          </div>
        </div>

        {vendedores.length > 0 && (
          <div className="bus-legend-row bus-legend-vendedores">
            <span className="bus-legend-title"><i className="fas fa-building"></i> Vendido en:</span>
            {vendedores.map((vendedor) => (
              <span key={vendedor.nombre} className="bus-legend-vendedor">
                <i style={{ background: vendedor.color }}></i>
                {vendedor.nombre}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* TOOLTIP DEL ASIENTO (cliente, destino y oficina de venta) */}
      {tooltip && (
        <div
          className={`seat-tooltip ${tooltip.estado}`}
          role="tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            borderLeftColor: tooltip.colorVenta || estilosPorEstado[tooltip.estado]?.background,
            transform: tooltip.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
          }}
        >
          <div className="seat-tooltip-head">
            <span className="seat-tooltip-num">Asiento {tooltip.numero}</span>
            <span className="seat-tooltip-status">
              {tooltip.colorVenta && (
                <i className="seat-tooltip-dot" style={{ background: tooltip.colorVenta }}></i>
              )}
              {tooltip.titulo}
            </span>
          </div>
          {[
            tooltip.cliente && { icon: 'fa-user', label: 'Cliente', value: tooltip.cliente },
            tooltip.documento && { icon: 'fa-id-card', label: 'CI/RUC', value: tooltip.documento },
            tooltip.destino && { icon: 'fa-location-dot', label: tooltip.etiquetaDestino || 'Destino', value: tooltip.destino },
            tooltip.puntoFinal && { icon: 'fa-flag-checkered', label: 'Punto final', value: tooltip.puntoFinal },
            tooltip.origen && { icon: 'fa-bus', label: 'Sale de', value: tooltip.origen },
            tooltip.oficina && { icon: 'fa-building', label: tooltip.etiquetaOficina || 'Oficina', value: tooltip.oficina },
            tooltip.usuario && { icon: 'fa-user-clock', label: 'Usuario', value: tooltip.usuario },
            tooltip.tiempo && { icon: 'fa-hourglass-half', label: 'Tiempo', value: tooltip.tiempo }
          ].filter(Boolean).map((fila) => (
            <div key={fila.label} className="seat-tooltip-row">
              <i className={`fas ${fila.icon}`}></i>
              <span className="seat-tooltip-label">{fila.label}:</span>
              <span className="seat-tooltip-value">{fila.value}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
