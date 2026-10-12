import { useState } from 'react';
import '../../Guias/components/GuiasGrid.css';

export const BoleteriaGrid = ({ data, loading, page, limit, total, onPageChange, onReload, onVisualizarPdf, onImprimir, onAnular, onReenviarSri, onCambiarFecha, currentUserId, reenviandoId }) => {
  const [activeMenu, setActiveMenu] = useState(null);

  const toggleMenu = (id) => {
    if (activeMenu === id) {
      setActiveMenu(null);
    } else {
      setActiveMenu(id);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const formatNumero = (item) => {
    const suc = item.sucursal_emision_boleto || '001';
    const emi = item.punto_emision_boleto || '001';
    const num = item.numero_boleto;
    if (num) {
      return `${suc}-${emi}-${String(num).padStart(9, '0')}`;
    }
    return `#${item.id_boleto}`;
  };

  const formatEstado = (estado) => {
    // Solo dos estados visibles: EMITIDO (no anulado) y ANULADO.
    return Number(estado) === 3
      ? { label: 'ANULADO', color: '#c0392b' }
      : { label: 'EMITIDO', color: 'green' };
  };

  // Estado de cobro del boleto (estado_cobro_boleto): 1 = cobrado.
  const formatCobro = (item) => {
    const cobrado = Number(item.estado_cobro_boleto) === 1;
    return {
      label: cobrado ? 'COBRADO' : 'NO COBRADO',
      color: cobrado ? '#16a085' : '#e67e22',
      icon: cobrado ? 'fa-hand-holding-usd' : 'fa-hourglass-half',
    };
  };

  // Estado SRI (solo tres): AUTORIZADO, EN PROCESO y ANULADO.
  const formatSri = (estado) => {
    const e = String(estado || '').toUpperCase();
    if (e === 'AUTORIZADO' || e === 'AUTORIZADA') {
      return { label: 'AUTORIZADO', color: 'green', icon: 'fa-check-circle' };
    }
    if (e === 'PENDIENTE' || e === 'RECIBIDA' || e === '') {
      return { label: 'EN PROCESO', color: '#f39c12', icon: 'fa-clock' };
    }
    // RECHAZADO / DEVUELTA / nota de crédito => documento no válido.
    return { label: 'ANULADO', color: '#c0392b', icon: 'fa-exclamation-circle' };
  };

  if (loading) {
    return <div className="guias-grid-loading"><i className="fas fa-spinner fa-spin"></i> Cargando boletos...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="guias-grid-empty">No se encontraron boletos.</div>;
  }

  return (
    <div className="guias-grid-container">
      <div className="table-responsive">
        <table className="guias-table">
          <thead>
            <tr>
              <th># BOLETO</th>
              <th>CLIENTE</th>
              <th>RUTA / DESTINO</th>
              <th className="text-center">BUS / ASIENTOS</th>
              <th>FECHA / HORA</th>
              <th className="text-right">TOTAL</th>
              <th className="text-center">ESTADO</th>
              <th className="text-center">COBRADO</th>
              <th className="text-center">SRI</th>
              <th style={{width: '40px'}}></th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => {
              const est = formatEstado(item.estado_boleto);
              const cobro = formatCobro(item);
              const sri = formatSri(item.estado_autorizacion);
              const asientosStr = item.detalles && item.detalles.length > 0
                ? item.detalles.map(d => d.asiento_boleto_detalle).join(', ')
                : item.total_asiento > 0 ? `${item.total_asiento} asns` : '-';

              return (
              <tr key={item.id_boleto} className={
                Number(item.estado_boleto) === 3 ? 'row-anulado' : 
                item.estado_autorizacion === 'AUTORIZADO' ? 'row-autorizado' : 'row-no-autorizado'
              }>
                <td className="font-mono" style={{fontWeight: 700, color: '#1a252f', fontSize: '14px', letterSpacing: '0.3px'}}>
                  {formatNumero(item)}
                </td>

                <td className="cell-client">
                  <strong style={{fontSize: '12px'}}>{item.identificacion_boleto}</strong><br/>
                  <span style={{color: '#34495e', fontSize: '12px'}}>{item.nombres_boleto}</span>
                  {item.nombre_usuario && (
                    <div style={{fontSize: '10px', color: '#95a5a6', marginTop: '2px'}}>
                      <i className="far fa-user" style={{marginRight: '3px'}}></i>Vend: {item.nombre_usuario}
                    </div>
                  )}
                </td>

                <td style={{fontSize: '12px'}}>
                  <div style={{fontWeight: '600', color: '#2c3e50'}}>
                    {item.nombre_rutas || 'Ruta sin especificar'}
                  </div>
                  <div style={{color: '#e67e22', fontWeight: 'bold', fontSize: '11px', marginTop: '2px'}}>
                    <i className="fas fa-map-marker-alt" style={{color: '#e74c3c', marginRight: '4px'}}></i>
                    {item.destino_nombre_combo || item.nombre_sub_rutas || item.nombre_destino || item.destino_boleto || 'Destino'}
                  </div>
                </td>

                {/* Bus + Asientos Combinados */}
                <td className="text-center" style={{fontSize: '12px'}}>
                  <div style={{display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
                    <span style={{background: '#34495e', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px'}}>
                      Bus {item.disco_buses || '-'}
                    </span>
                    <span style={{color: '#e67e22', fontWeight: 'bold', fontSize: '11px', fontFamily: 'monospace'}}>
                      Asn: {asientosStr}
                    </span>
                  </div>
                </td>

                <td style={{fontSize: '12px'}}>
                  <div>{item.fecha_creacion_boleto ? item.fecha_creacion_boleto.split('T')[0] : item.fecha_boleto || '-'}</div>
                  {item.hora_viaje && (
                    <div style={{fontSize: '11px', color: '#3498db', fontWeight: '600', marginTop: '1px'}}>
                      <i className="far fa-clock" style={{marginRight: '3px'}}></i>{item.hora_viaje}
                    </div>
                  )}
                </td>

                <td className="font-mono text-right font-bold" style={{color: '#27ae60', fontSize: '16px'}}>
                  ${parseFloat(item.total_boleto || 0).toFixed(2)}
                </td>

                <td className="text-center">
                  <span style={{color: est.color, fontWeight: 'bold', fontSize: '11px'}}>{est.label}</span>
                </td>

                <td className="text-center" style={{fontSize: '11px'}}>
                  <span style={{color: cobro.color, fontWeight: 'bold'}}>
                    <i className={`fas ${cobro.icon}`} style={{marginRight: '4px'}}></i>
                    {cobro.label}
                  </span>
                </td>

                <td className="text-center" style={{fontSize: '11px'}} title={item.mensaje_sri || ''}>
                  {reenviandoId === item.id_boleto ? (
                    <div style={{color: '#3498db', fontWeight: 'bold'}} className="flex items-center justify-center gap-1">
                      <i className="fas fa-spinner fa-spin text-blue-500"></i> PROCESANDO...
                    </div>
                  ) : (
                    <div style={{color: sri.color, fontWeight: 'bold'}}>
                      <i className={`fas ${sri.icon}`} style={{marginRight: '4px'}}></i>
                      {sri.label}
                      {item.mensaje_sri && sri.label === 'ANULADO' && (
                        <div style={{fontSize: '9px', color: '#e74c3c', marginTop: '2px', maxWidth: '140px', margin: '2px auto 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={item.mensaje_sri}>
                          {item.mensaje_sri}
                        </div>
                      )}
                    </div>
                  )}
                  {item.estado_sri_nota_credito && (
                    <div style={{marginTop: '4px', borderTop: '1px solid #eee', paddingTop: '2px', color: item.estado_sri_nota_credito === 'AUTORIZADO' ? '#e74c3c' : '#f39c12'}}>
                      <b>NC: {item.estado_sri_nota_credito}</b>
                    </div>
                  )}
                </td>

                <td className="cell-actions">
                  <div className="action-dropdown-container">
                    <button className="btn-action-icon" onClick={() => toggleMenu(item.id_boleto)}>
                      <i className="fas fa-chevron-circle-down" style={{color: '#e67e22'}}></i>
                    </button>
                    {activeMenu === item.id_boleto && (
                      <>
                        <div className="dropdown-overlay" onClick={() => setActiveMenu(null)}></div>
                        <div className="action-menu">
                          <button onClick={() => { setActiveMenu(null); onVisualizarPdf?.(item); }}><i className="far fa-file-pdf" style={{color: 'red'}}></i> Visualizar Pdf</button>
                          <button onClick={() => { setActiveMenu(null); onImprimir?.(item); }}><i className="fas fa-print" style={{color: 'gray'}}></i> Imprimir</button>
                          <button onClick={() => { setActiveMenu(null); onAnular?.(item); }}><i className="fas fa-ban" style={{color: 'red'}}></i> Anular</button>
                          <button onClick={() => { setActiveMenu(null); onReenviarSri?.(item); }}><i className="fas fa-cloud-upload-alt" style={{color: '#3498db'}}></i> Reenviar SRI</button>
                          {/* Cambiar Fecha: solo visible si el usuario actual es quien vendió el boleto y no está anulado */}
                          {Number(item.id_fkusuario_boleto) === Number(currentUserId) && Number(item.estado_boleto) !== 3 && (
                            <button onClick={() => { setActiveMenu(null); onCambiarFecha?.(item); }} style={{color: '#e67e22'}}>
                              <i className="fas fa-calendar-alt" style={{color: '#e67e22'}}></i> Cambiar Fecha
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      
      {/* Paginación */}
      <div className="guias-pagination">
        <div className="pagination-info">
          Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
        </div>
        <div className="pagination-controls">
          <button disabled={page === 1} onClick={() => onPageChange(1)}><i className="fas fa-angle-double-left"></i></button>
          <button disabled={page === 1} onClick={() => onPageChange(page - 1)}><i className="fas fa-angle-left"></i></button>
          <span className="page-indicator">Página {page} de {totalPages}</span>
          <button disabled={page === totalPages || totalPages === 0} onClick={() => onPageChange(page + 1)}><i className="fas fa-angle-right"></i></button>
          <button disabled={page === totalPages || totalPages === 0} onClick={() => onPageChange(totalPages)}><i className="fas fa-angle-double-right"></i></button>
          <button onClick={onReload} className="btn-refresh"><i className="fas fa-sync-alt"></i></button>
        </div>
      </div>
    </div>
  );
};
