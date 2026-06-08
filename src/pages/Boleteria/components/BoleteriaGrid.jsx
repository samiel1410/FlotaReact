import { useState } from 'react';
import '../../Guias/components/GuiasGrid.css';

export const BoleteriaGrid = ({ data, loading, page, limit, total, onPageChange, onReload, onVisualizarPdf, onImprimir, onAnular, onReenviarSri }) => {
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
    switch (Number(estado)) {
      case 0: return { label: 'EN PROCESO', color: '#7f8c8d' };
      case 1: return { label: 'AUTORIZADA', color: 'green' };
      case 2: return { label: 'RESERVADO', color: '#f39c12' };
      case 3: return { label: 'ANULADO', color: '#c0392b' };
      default: return { label: 'DESCONOCIDO', color: '#95a5a6' };
    }
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
              <th className="text-center">BUS</th>
              <th>FECHA</th>
              <th className="text-center">ASIENTOS</th>
              <th className="text-right">TOTAL</th>
              <th className="text-center">ESTADO</th>
              <th className="text-center">SRI</th>
              <th style={{width: '40px'}}></th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => {
              const est = formatEstado(item.estado_boleto);
              return (
              <tr key={item.id_boleto} className={Number(item.estado_boleto) === 3 ? 'row-anulado' : ''}>
                <td className="font-mono" style={{fontWeight: 600, color: '#2c3e50', fontSize: '12px'}}>
                  {formatNumero(item)}
                </td>

                <td className="cell-client">
                  <strong style={{fontSize: '12px'}}>{item.identificacion_boleto}</strong><br/>
                  <span style={{color: '#34495e', fontSize: '12px'}}>{item.nombres_boleto}</span>
                </td>

                <td className="text-center">
                  <span style={{background: '#ecf0f1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px'}}>
                    {item.disco_buses || '-'}
                  </span>
                </td>

                <td style={{fontSize: '12px'}}>
                  {item.fecha_creacion_boleto ? item.fecha_creacion_boleto.split('T')[0] : item.fecha_boleto || '-'}
                </td>

                <td className="text-center font-mono font-bold" style={{fontSize: '12px'}}>
                  {item.detalles && item.detalles.length > 0
                    ? item.detalles.map(d => d.asiento_boleto_detalle).join(', ')
                    : item.total_asiento > 0 ? `${item.total_asiento} asientos` : '-'}
                </td>

                <td className="font-mono text-right font-bold" style={{color: '#27ae60', fontSize: '14px'}}>
                  ${parseFloat(item.total_boleto || 0).toFixed(2)}
                </td>

                <td className="text-center">
                  <span style={{color: est.color, fontWeight: 'bold', fontSize: '11px'}}>{est.label}</span>
                </td>

                <td className="text-center" style={{fontSize: '11px'}}>
                  {item.estado_autorizacion === 'AUTORIZADO' ? (
                    <div style={{color: 'green', fontWeight: 'bold'}}><i className="fas fa-check-circle"></i> AUTORIZADO</div>
                  ) : item.estado_autorizacion === 'RECHAZADO' ? (
                    <div style={{color: '#c0392b', fontWeight: 'bold'}}><i className="fas fa-exclamation-circle"></i> RECHAZADO</div>
                  ) : item.clave_acceso_boletos && item.clave_acceso_boletos !== '0' ? (
                    <div style={{color: '#3498db', fontWeight: 'bold'}}><i className="fas fa-cloud-upload-alt"></i> ENVIADO</div>
                  ) : (
                    <div style={{color: '#95a5a6', fontStyle: 'italic'}}><i className="fas fa-clock"></i> PENDIENTE</div>
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
