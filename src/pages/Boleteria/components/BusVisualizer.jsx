import { useState } from 'react';
import './BusVisualizer.css';

export const BusVisualizer = ({
  asientosOcupados = [],
  asientosSeleccionados = [],
  onAsientoClick,
  onAsientoOcupadoClick,
  capacidad = 40,
  pisos = 1,
  mapaAsientos = null,
  discoBus = '',
  onCambiarBus,
  totalVenta = 0
}) => {
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
    if (asientosSeleccionados.includes(Number(numeroAsiento))) return 'seleccionado';

    const ocupado = asientosOcupados.find(a =>
      Number(a.asiento_boleto_detalle) === Number(numeroAsiento) || Number(a) === Number(numeroAsiento)
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
    return 'libre';
  };

  const getTooltip = (numeroAsiento) => {
    const ocupado = asientosOcupados.find(a =>
      Number(a.asiento_boleto_detalle) === Number(numeroAsiento) || Number(a) === Number(numeroAsiento)
    );
    if (!ocupado && !asientosSeleccionados.includes(Number(numeroAsiento))) {
      return `Asiento ${numeroAsiento} - Disponible`;
    }
    if (asientosSeleccionados.includes(Number(numeroAsiento))) {
      return `Asiento ${numeroAsiento} - Seleccionado`;
    }
    if (typeof ocupado === 'object') {
      const estado = getSeatStatus(numeroAsiento);
      if (estado === 'libre-parada') return `Asiento ${numeroAsiento} - Libre en esta parada`;
      if (estado === 'ocupado-parcial') return `Asiento ${numeroAsiento} - Ocupado hasta destino`;
      return `Asiento ${numeroAsiento} - Ocupado Fin de Viaje`;
    }
    return `Asiento ${numeroAsiento} - Ocupado`;
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
      // Mapa por defecto 2x2
      const rows = [];
      const totalSeats = Math.min(capacidad || 40, 60);
      const seatsPerRow = 4;
      const totalRows = Math.ceil(totalSeats / seatsPerRow);

      for (let row = 0; row < totalRows; row++) {
        const rowButtons = [];
        for (let col = 0; col < seatsPerRow; col++) {
          const seatNum = row * seatsPerRow + col + 1;
          if (seatNum > totalSeats) break;

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
      return rows;
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
        background: '#fdfdfd', border: '1px solid #d0d0d0', borderRadius: 6,
        padding: 10, maxHeight: 400, overflowY: 'auto'
      }}>
        {/* Front indicator */}
        <div style={{
          background: 'linear-gradient(to bottom, #bdc3c7, #95a5a6)',
          padding: 8, marginBottom: 10, borderRadius: '4px 4px 20px 20px',
          textAlign: 'center', color: 'white', fontWeight: 'bold',
          fontSize: 11, letterSpacing: 1
        }}>
          <i className="fas fa-arrow-up"></i> FRENTE DEL BUS
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
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px',
        marginTop: 10, fontSize: 11
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, background: 'white', border: '1px solid #bdc3c7', borderRadius: 3 }}></div>
          <span style={{ color: '#7f8c8d' }}>Libre</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, background: '#c0392b', borderRadius: 3 }}></div>
          <span style={{ color: '#c0392b' }}>Ocupado fin viaje</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, background: '#f1c40f', borderRadius: 3 }}></div>
          <span style={{ color: '#f39c12' }}>Ocupado parcial</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, background: '#27ae60', borderRadius: 3 }}></div>
          <span style={{ color: '#27ae60' }}>Libre en parada</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, background: '#95a5a6', borderRadius: 3 }}></div>
          <span style={{ color: '#7f8c8d' }}>No dispone</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, background: '#3b82f6', borderRadius: 3 }}></div>
          <span style={{ color: '#3b82f6' }}>Seleccionado</span>
        </div>
      </div>

    </div>
  );
};
