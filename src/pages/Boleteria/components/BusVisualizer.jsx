import { useState, useEffect, useRef } from 'react';
import './BusVisualizer.css';

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
  onAsientoClick,
  onAsientoOcupadoClick,
  capacidad = 40,
  pisos = 1,
  mapaAsientos = null,
  discoBus = '',
  onCambiarBus,
  totalVenta = 0,
  seatLockTimeoutMs = 15 * 60 * 1000  // 15 minutos por defecto
}) => {
  // Timer para actualizar los tiempos de bloqueo cada segundo
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const [pisoActivo, setPisoActivo] = useState(0);

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

  const getSeatStatus = (numeroAsiento) => {
    const num = Number(numeroAsiento);
    if (asientosSeleccionados.includes(num)) return 'seleccionado';

    // Primero verificar si está ocupado (más importante que pendiente)
    const ocupado = asientosOcupados.find(a =>
      Number(a.asiento_boleto_detalle) === num || Number(a) === num
    );
    if (ocupado) {
      if (typeof ocupado === 'object' && ocupado.orden_destino !== undefined) {
        const ordenDestino = ocupado.orden_destino || 9999;
        const ordenActual = ocupado.orden_actual || 0;
        const ordenVenta = ocupado.orden_venta || 0;
        const maxOrden = ocupado.max_orden || 9999;

        if (ordenDestino <= ordenActual || ordenActual < ordenVenta) return 'libre-parada';
        if (ordenDestino < maxOrden) return 'ocupado-parcial';
        return 'ocupado';
      }
      return 'ocupado';
    }

    // Luego verificar si otro usuario lo está seleccionando
    if (asientosPendientes && asientosPendientes[num]) return 'pendiente';

    return 'libre';
  };

  const getTooltip = (numeroAsiento) => {
    const num = Number(numeroAsiento);

    // Pendiente (siendo seleccionado por otro)
    if (asientosPendientes && asientosPendientes[num]) {
      const info = asientosPendientes[num];
      const usuario = typeof info === 'string' ? info : info.usuario;
      const lockedAt = typeof info === 'object' ? info.lockedAt : null;
      const tiempo = lockedAt ? formatearTiempoBloqueo(lockedAt, now) : '';
      const restante = lockedAt ? Math.max(0, Math.floor((seatLockTimeoutMs - (now - lockedAt)) / 1000)) : null;
      const restanteTexto = restante !== null ? ` - Restan ${Math.floor(restante / 60)}m ${restante % 60}s` : '';
      return `Asiento ${num} - ${usuario} lo está seleccionando (${tiempo}${restanteTexto})`;
    }

    const ocupado = asientosOcupados.find(a =>
      Number(a.asiento_boleto_detalle) === num || Number(a) === num
    );
    if (!ocupado && !asientosSeleccionados.includes(num)) {
      return `Asiento ${num} - Disponible`;
    }
    if (asientosSeleccionados.includes(num)) {
      return `Asiento ${num} - Seleccionado`;
    }
    if (typeof ocupado === 'object') {
      const estado = getSeatStatus(num);
      if (estado === 'libre-parada') return `Asiento ${num} - Libre en esta parada`;
      if (estado === 'ocupado-parcial') return `Asiento ${num} - Ocupado hasta destino`;
      return `Asiento ${num} - Ocupado Fin de Viaje`;
    }
    return `Asiento ${num} - Ocupado`;
  };

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
            rowButtons.push(
              <div key={cellId} className="seat-wrapper">
                  <button
                    className={`bus-seat ${status}`}
                    onClick={() => {
                      if (status === 'ocupado' || status === 'ocupado-parcial') {
                        const ocupado = asientosOcupados.find(a =>
                          Number(a.asiento_boleto_detalle) === num
                        );
                        onAsientoOcupadoClick?.(ocupado);
                      } else {
                        onAsientoClick(num);
                      }
                    }}
                    title={getTooltip(num)}
                  >
                    <span className="seat-number">{num}</span>
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

            rowButtons.push(
              <div key={seatNum} className="seat-wrapper" style={{ marginRight }}>
                <button
                  className={`bus-seat ${status}`}
                  onClick={() => {
                    if (status === 'ocupado' || status === 'ocupado-parcial') {
                      const ocupado = asientosOcupados.find(a =>
                        Number(a.asiento_boleto_detalle) === seatNum
                      );
                      onAsientoOcupadoClick?.(ocupado);
                    } else {
                      onAsientoClick(seatNum);
                    }
                  }}
                  title={getTooltip(seatNum)}
                >
                  <span className="seat-number">{seatNum}</span>
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
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 6px',
        marginTop: 4, fontSize: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, background: 'white', border: '1px solid #bdc3c7', borderRadius: 2 }}></div>
          <span style={{ color: '#7f8c8d' }}>Libre</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 10, height: 10, background: '#c0392b', borderRadius: 2 }}></div>
          <span style={{ color: '#c0392b' }}>Ocupado fin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 10, height: 10, background: '#f1c40f', borderRadius: 2 }}></div>
          <span style={{ color: '#f39c12' }}>Ocupado parcial</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 10, height: 10, background: '#27ae60', borderRadius: 2 }}></div>
          <span style={{ color: '#27ae60' }}>Libre en parada</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 10, height: 10, background: '#95a5a6', borderRadius: 2 }}></div>
          <span style={{ color: '#7f8c8d' }}>No dispone</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 10, height: 10, background: '#8b5cf6', borderRadius: 2 }}></div>
          <span style={{ color: '#8b5cf6' }}>Seleccionado por otro</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: 2 }}></div>
          <span style={{ color: '#3b82f6' }}>Seleccionado (tú)</span>
        </div>
      </div>

    </div>
  );
};
