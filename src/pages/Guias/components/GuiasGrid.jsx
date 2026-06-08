import { useState } from 'react';
import './GuiasGrid.css';

export const GuiasGrid = ({ data, loading, page, limit, total, onPageChange, onReload,
  onViewPdf, onPrint, onEdit, onCharge, onCharges, onTrack, onAnular, onFacturar
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

  return (
    <div className="guias-grid-container">
      <div className="table-responsive">
        <table className="guias-table">
          <thead>
            <tr>
              <th className="text-center" style={{width: '30px'}}></th>
              <th className="text-center" style={{width: '30px'}}></th>
              <th>CÓDIGO</th>
              <th>CLIENTE REMITENTE</th>
              <th>CLIENTE DESTINATARIO</th>
              <th>SALIDA</th>
              <th>LLEGADA</th>
              <th className="text-right">TOTAL</th>
              <th className="text-right">COBRADO</th>
              <th className="text-right">POR COBRAR</th>
              <th>ESTADO</th>
              <th>FECHA</th>
              <th>N° MANUAL</th>
              <th className="text-center" style={{width: '40px'}}><i className="fas fa-cogs"></i></th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id_guia} className={item.estado_guia === 2 ? 'row-anulado' : item.estado_guia === 3 ? 'row-pendiente' : ''}>
                <td className="text-center">{getSemaforoEstado(item.estado_guia)}</td>
                <td className="text-center">{getSemaforoSeguimiento(item.estado_guia_seguimiento)}</td>
                <td className="font-semibold text-blue-600 font-mono">
                  {item.numero_guia_final}
                </td>
                <td className="cell-client">
                  <strong>RUC:</strong> {item.cedula_cliente_remitente}<br/>
                  <strong>R.S.:</strong> {item.nombre_cliente_remitente}
                </td>
                <td className="cell-client">
                  <strong>RUC:</strong> {item.cedula_cliente_receptor}<br/>
                  <strong>R.S.:</strong> {item.nombre_cliente_receptor}
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
                <td>{item.fecha_guia}</td>
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
                          <button onClick={() => { setActiveMenu(null); onViewPdf && onViewPdf(item); }}><i className="far fa-file-pdf" style={{color: 'red'}}></i> Visualizar Pdf</button>
                          <button onClick={() => { setActiveMenu(null); onPrint && onPrint(item); }}><i className="fas fa-print" style={{color: 'gray'}}></i> Imprimir</button>
                          <button onClick={() => { setActiveMenu(null); onEdit && onEdit(item); }}><i className="fas fa-edit" style={{color: 'orange'}}></i> Editar Guía</button>
                          <button onClick={() => { setActiveMenu(null); onCharge && onCharge(item); }}><i className="fas fa-hand-holding-usd" style={{color: 'green'}}></i> Cobrar</button>
                          <button onClick={() => { setActiveMenu(null); onCharges && onCharges(item); }}><i className="fas fa-money-bill-wave" style={{color: 'blue'}}></i> Cobros Realizados</button>
                          <button onClick={() => { setActiveMenu(null); onTrack && onTrack(item); }}><i className="fas fa-eye" style={{color: '#333'}}></i> Seguimiento</button>
                          <button onClick={() => { setActiveMenu(null); onAnular && onAnular(item); }}><i className="fas fa-ban" style={{color: 'red'}}></i> Anular</button>
                          <button onClick={() => { setActiveMenu(null); onFacturar && onFacturar(item); }}><i className="fas fa-file-invoice-dollar" style={{color: '#2c3e50'}}></i> Facturar</button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
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
