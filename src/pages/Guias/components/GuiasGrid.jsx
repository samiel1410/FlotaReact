import { useState } from 'react';
import './GuiasGrid.css';
import { clasificarCorreosGuia, describirCorreo } from '../../../utils/emailValidation';

export const GuiasGrid = ({ data, loading, page, limit, total, onPageChange, onReload,
  onViewPdf, onPrint, onEdit, onCharge, onCharges, onTrack, onAnular, onFacturar,
  onNuevaGuia, onAnularSeleccionadas, onAnularPendientes
}) => {
  const [activeMenu, setActiveMenu] = useState(null);

  const toggleMenu = (id) => {
    if (activeMenu === id) {
      setActiveMenu(null);
    } else {
      setActiveMenu(id);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const guiasConCorreoInvalido = (data || []).filter(
    (item) => clasificarCorreosGuia(item).alerta
  ).length;

  if (loading) {
    return <div className="guias-grid-loading"><i className="fas fa-spinner fa-spin"></i> Cargando guías...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="guias-grid-empty">No se encontraron guías con los filtros actuales.</div>;
  }

  // Helpers para estado
  const getSemaforoEstado = (val) => {
    if (val === 1) return <i className="fas fa-circle" style={{color: 'green'}} title="AUTORIZADA"></i>;
    if (val === 0) return <i className="fas fa-circle" style={{color: 'gray'}} title="EN PROCESO"></i>;
    if (val === 3) return <i className="fas fa-circle" style={{color: 'gold'}} title="PENDIENTE"></i>;
    if (val === 2) return <i className="fas fa-circle" style={{color: 'gold'}} title="ANULADO"></i>;
    return null;
  };

  const getSemaforoSeguimiento = (val) => {
    if (val === 0) return <i className="fas fa-bus-alt" style={{color: 'green'}} title="VIAJANDO"></i>;
    if (val === 1) return <i className="fas fa-flag-checkered" style={{color: 'blue'}} title="LLEGÓ"></i>;
    return null;
  };

  // Regla de edición: solo si la guía NO está anulada/pendiente
  // y NO tiene factura AUTORIZADA (AUTORIZADO/AUTORIZADA/FIRMADO)
  const isFacturaAutorizada = (item) => {
    const est = String(item.estado_autorizacion_factura || '').toUpperCase();
    return est === 'AUTORIZADO' || est === 'AUTORIZADA' || est === 'FIRMADO';
  };

  const getMotivoNoEditable = (item) => {
    if (Number(item.estado_guia) === 2) return 'La guía está anulada';
    if (Number(item.estado_guia) === 3) return 'La guía está pendiente de anulación';
    if (isFacturaAutorizada(item)) return 'Tiene factura autorizada por el SRI';
    return '';
  };

  const canEdit = (item) => getMotivoNoEditable(item) === '';

  const getBadgeEstadoSri = (estadoFactura) => {
    if (!estadoFactura) {
      return <span className="badge badge-secondary" title="Sin Factura generada">SIN FACTURA</span>;
    }
    const est = String(estadoFactura).toUpperCase();
    if (est === 'AUTORIZADO' || est === 'AUTORIZADA' || est === 'FIRMADO') {
      return <span className="badge badge-success">AUTORIZADO</span>;
    }
    if (est === 'RECHAZADO') {
      return <span className="badge badge-danger">RECHAZADO</span>;
    }
    if (est === 'DEVUELTA') {
      return <span className="badge badge-warning">DEVUELTA</span>;
    }
    if (est === 'RECIBIDA' || est === 'PENDIENTE') {
      return <span className="badge badge-info">{est}</span>;
    }
    return <span className="badge badge-secondary">{est}</span>;
  };

  return (
    <div className="guias-grid-container">
      <div className="flex gap-2 p-2 bg-white border-b">
        {onNuevaGuia && (
          <button onClick={onNuevaGuia} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2">
            <i className="fas fa-plus"></i> Nueva Guía
          </button>
        )}
        {onAnularSeleccionadas && (
          <button onClick={onAnularSeleccionadas} className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 flex items-center gap-2">
            <i className="fas fa-check-double"></i> Aprobar Pendientes
          </button>
        )}
        {onAnularPendientes && (
          <button onClick={onAnularPendientes} className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-500 rounded hover:bg-emerald-600 flex items-center gap-2">
            <i className="fas fa-check-circle"></i> Aprobar Todas las Pendientes
          </button>
        )}
        {guiasConCorreoInvalido > 0 && (
          <span
            className="ml-auto inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
            title="Las guías marcadas tienen un correo mal escrito. Corrígelo antes de enviar notificaciones o facturas por correo."
          >
            <i className="fas fa-exclamation-triangle"></i>
            {guiasConCorreoInvalido} guía(s) con correo inválido en esta página
          </span>
        )}
      </div>
      <div className="table-responsive">
        <table className="guias-table">
          <thead>
            <tr>
              <th className="text-center" style={{width: '30px'}}></th>
              <th className="text-center" style={{width: '30px'}}></th>
              <th>CÓDIGO</th>
              <th># FACTURA</th>
              <th>CLIENTE REMITENTE</th>
              <th>CLIENTE DESTINATARIO</th>
              <th>SALIDA</th>
              <th>LLEGADA</th>
              <th className="text-right">TOTAL</th>
              <th className="text-right">COBRADO</th>
              <th className="text-right">POR COBRAR</th>
              <th>ESTADO COBRO</th>
              <th>ESTADO SRI</th>
              <th>FECHA</th>
              <th>N° MANUAL</th>
              <th className="text-center" style={{width: '40px'}}><i className="fas fa-cogs"></i></th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const correos = clasificarCorreosGuia(item);
              const correoRemitente = correos.correos.find((c) => c.rol === 'REMITENTE');
              const correoDestinatario = correos.correos.find((c) => c.rol === 'DESTINATARIO');
              const correoOtros = correos.correos.find((c) => c.rol === 'OTROS');

              return (
              <tr key={item.id_guia} className={
                item.estado_guia === 2 ? 'row-anulado' : 
                item.estado_guia === 3 ? 'row-pendiente' : 
                (item.estado_autorizacion_factura === 'AUTORIZADA' || item.estado_autorizacion_factura === 'AUTORIZADO' || item.estado_autorizacion_factura === 'FIRMADO') 
                  ? 'row-autorizado' : 'row-no-autorizado'
              }>
                <td className="text-center">{getSemaforoEstado(item.estado_guia)}</td>
                <td className="text-center">{getSemaforoSeguimiento(item.estado_guia_seguimiento)}</td>
                <td className="font-semibold text-blue-600 font-mono">
                  {item.numero_guia_final}
                </td>
                <td className="font-mono text-xs font-semibold text-slate-700">
                  {item.numero_factura_asociada}
                </td>
                <td className="cell-client">
                  <strong>RUC:</strong> {item.cedula_cliente_remitente}<br/>
                  <strong>R.S.:</strong> {item.nombre_cliente_remitente}
                  {correoRemitente?.tieneCorreo ? (
                    correoRemitente.valido ? (
                      <div style={{fontSize: '10px', color: '#16a085', marginTop: '3px'}} title={correoRemitente.correo}>
                        <i className="fas fa-envelope" style={{marginRight: '3px'}}></i>{correoRemitente.correo}
                      </div>
                    ) : (
                      <div
                        style={{fontSize: '10px', color: '#c0392b', fontWeight: 'bold', marginTop: '3px', cursor: 'help'}}
                        title={`${describirCorreo(correoRemitente)}. No se enviará la notificación hasta corregirlo.`}
                      >
                        <i className="fas fa-exclamation-triangle" style={{marginRight: '3px'}}></i>
                        Correo inválido{correoRemitente.sugerencia ? ` (¿${correoRemitente.sugerencia}?)` : ''}
                      </div>
                    )
                  ) : (
                    <div style={{fontSize: '10px', color: '#b45309', marginTop: '3px', cursor: 'help'}} title="Sin correo registrado">
                      <i className="fas fa-envelope" style={{marginRight: '3px'}}></i>Sin correo
                    </div>
                  )}
                </td>
                <td className="cell-client">
                  <strong>RUC:</strong> {item.cedula_cliente_receptor}<br/>
                  <strong>R.S.:</strong> {item.nombre_cliente_receptor}
                  {correoDestinatario?.tieneCorreo ? (
                    correoDestinatario.valido ? (
                      <div style={{fontSize: '10px', color: '#16a085', marginTop: '3px'}} title={correoDestinatario.correo}>
                        <i className="fas fa-envelope" style={{marginRight: '3px'}}></i>{correoDestinatario.correo}
                      </div>
                    ) : (
                      <div
                        style={{fontSize: '10px', color: '#c0392b', fontWeight: 'bold', marginTop: '3px', cursor: 'help'}}
                        title={`${describirCorreo(correoDestinatario)}. No se enviará la notificación hasta corregirlo.`}
                      >
                        <i className="fas fa-exclamation-triangle" style={{marginRight: '3px'}}></i>
                        Correo inválido{correoDestinatario.sugerencia ? ` (¿${correoDestinatario.sugerencia}?)` : ''}
                      </div>
                    )
                  ) : (
                    <div style={{fontSize: '10px', color: '#b45309', marginTop: '3px', cursor: 'help'}} title="Sin correo registrado">
                      <i className="fas fa-envelope" style={{marginRight: '3px'}}></i>Sin correo
                    </div>
                  )}
                  {correoOtros?.tieneCorreo && !correoOtros.valido && (
                    <div style={{fontSize: '10px', color: '#c0392b', fontWeight: 'bold', marginTop: '2px', cursor: 'help'}} title={`OTROS: ${describirCorreo(correoOtros)}`}>
                      <i className="fas fa-exclamation-triangle" style={{marginRight: '3px'}}></i>Correo de "Otros" inválido
                    </div>
                  )}
                </td>
                <td>{item.origen_guia}</td>
                <td>{item.destino_guia}</td>
                <td className="font-mono text-right">${parseFloat(item.total_guia).toFixed(2)}</td>
                <td className="font-mono text-right">${parseFloat(item.cobrado).toFixed(2)}</td>
                <td className="font-mono text-right">${parseFloat(item.por_cobrar).toFixed(2)}</td>
                <td>
                  <span className={`badge ${item.estado_cobro_guia === 'COBRADA' ? 'badge-success' : 'badge-danger'}`}>
                    {item.estado_cobro_guia}
                  </span>
                </td>
                <td>
                  {getBadgeEstadoSri(item.estado_autorizacion_factura)}
                </td>
                <td className="font-mono text-xs text-slate-600">
                  {item.fecha_guia ? (String(item.fecha_guia).includes('T') ? String(item.fecha_guia).split('T')[0] : String(item.fecha_guia).split(' ')[0]) : '-'}
                </td>
                <td>{item.numero_manual_guia}</td>
                <td className="cell-actions">
                  <div className="action-dropdown-container">
                    <button className="btn-action-icon" onClick={() => toggleMenu(item.id_guia)}>
                      <i className="fas fa-chevron-circle-down" style={{color: '#3498db'}}></i>
                    </button>
                    {activeMenu === item.id_guia && (
                      <>
                        <div className="dropdown-overlay" onClick={() => setActiveMenu(null)}></div>
                        <div className="action-menu">
                          {onViewPdf && <button onClick={() => { setActiveMenu(null); onViewPdf(item); }}><i className="far fa-file-pdf" style={{color: 'red'}}></i> Visualizar Pdf</button>}
                          {onPrint && <button onClick={() => { setActiveMenu(null); onPrint(item); }}><i className="fas fa-print" style={{color: 'gray'}}></i> Imprimir</button>}
                          {onEdit && (canEdit(item)
                            ? <button onClick={() => { setActiveMenu(null); onEdit(item); }}><i className="fas fa-edit" style={{color: '#f39c12'}}></i> Editar</button>
                            : <button disabled title={getMotivoNoEditable(item)} style={{opacity: 0.45, cursor: 'not-allowed'}}><i className="fas fa-edit" style={{color: '#999'}}></i> Editar ({getMotivoNoEditable(item)})</button>
                          )}
                          {onCharge && parseFloat(item.por_cobrar) > 0 && <button onClick={() => { setActiveMenu(null); onCharge(item); }}><i className="fas fa-hand-holding-usd" style={{color: 'green'}}></i> Cobrar</button>}
                          {onCharges && <button onClick={() => { setActiveMenu(null); onCharges(item); }}><i className="fas fa-money-bill-wave" style={{color: 'blue'}}></i> Cobros Realizados</button>}
                          {onTrack && <button onClick={() => { setActiveMenu(null); onTrack(item); }}><i className="fas fa-eye" style={{color: '#333'}}></i> Seguimiento</button>}
                          {onAnular && (
                            <button onClick={() => { setActiveMenu(null); onAnular(item); }}>
                              <i className={`fas ${Number(item.estado_guia) === 3 ? 'fa-check-circle' : 'fa-ban'}`} style={{ color: Number(item.estado_guia) === 3 ? '#059669' : 'red' }}></i>
                              {Number(item.estado_guia) === 3 ? ' Aprobar anulación' : ' Solicitar anulación'}
                            </button>
                          )}
                          {onFacturar && <button onClick={() => { setActiveMenu(null); onFacturar(item); }}><i className="fas fa-file-invoice-dollar" style={{color: '#2c3e50'}}></i> Facturar</button>}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Paginación */}
      <div className="guias-pagination">
        <div className="pagination-info">
          Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
        </div>
        <div className="pagination-controls">
          <button 
            disabled={page === 1} 
            onClick={() => onPageChange(1)}
            title="Primera página"
          ><i className="fas fa-angle-double-left"></i></button>
          <button 
            disabled={page === 1} 
            onClick={() => onPageChange(page - 1)}
            title="Anterior"
          ><i className="fas fa-angle-left"></i></button>
          
          <span className="page-indicator">Página {page} de {totalPages}</span>
          
          <button 
            disabled={page === totalPages || totalPages === 0} 
            onClick={() => onPageChange(page + 1)}
            title="Siguiente"
          ><i className="fas fa-angle-right"></i></button>
          <button 
            disabled={page === totalPages || totalPages === 0} 
            onClick={() => onPageChange(totalPages)}
            title="Última página"
          ><i className="fas fa-angle-double-right"></i></button>
          
          <button onClick={onReload} className="btn-refresh" title="Recargar"><i className="fas fa-sync-alt"></i></button>
        </div>
      </div>
    </div>
  );
};
