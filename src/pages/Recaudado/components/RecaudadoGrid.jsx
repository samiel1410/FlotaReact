export const RecaudadoGrid = ({ data, loading, page, limit, total, totales, onPageChange, onReload }) => {

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* BARRA DE TOTALES */}
      <div className="recaudado-totales-bar">
        <div className="recaudado-totales-item">
          <span className="label">Total Facturas:</span>
          <span className="value facturas">{totales.facturas}</span>
        </div>
        <div className="recaudado-totales-item">
          <span className="label">Total Venta:</span>
          <span className="value venta">${parseFloat(totales.venta).toFixed(2)}</span>
        </div>
        <div className="recaudado-totales-item">
          <span className="label">Total Retenido:</span>
          <span className="value retenido">${parseFloat(totales.retenido).toFixed(2)}</span>
        </div>
      </div>

      <div className="recaudado-table-container">
        <table className="recaudado-table">
          <thead>
            <tr>
              <th>SOCIO</th>
              <th className="text-center">DISCO</th>
              <th className="text-center">VIAJE</th>
              <th>RUTA</th>
              <th className="text-center">FECHA</th>
              <th className="text-center"># FACTURAS</th>
              <th className="text-right">VENTA</th>
              <th className="text-right">RETENIDO</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row">
                <td colSpan="8">
                  <i className="fas fa-spinner fa-spin" style={{marginRight: 8}}></i> Cargando datos de recaudación...
                </td>
              </tr>
            ) : !data || data.length === 0 ? (
              <tr className="empty-row">
                <td colSpan="8">
                  <i className="fas fa-inbox" style={{marginRight: 8, opacity: 0.4}}></i>
                  No se encontraron registros de recaudación.
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="socio-cell">{item.socio}</td>
                  <td className="disco-cell text-center">{item.disco}</td>
                  <td className="text-center font-mono">{item.viaje}</td>
                  <td>{item.nombre_rutas}</td>
                  <td className="text-center">{item.fecha}</td>
                  <td className="text-center font-bold">{item.cantidad_boletos}</td>
                  <td className="monto-venta text-right">
                    ${parseFloat(item.vendido || 0).toFixed(2)}
                  </td>
                  <td className="monto-retenido text-right">
                    ${parseFloat(item.retenido || 0).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Paginación */}
      <div className="recaudado-pagination">
        <div className="page-info">
          Mostrando {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
        </div>
        <div className="page-controls">
          <button disabled={page === 1} onClick={() => onPageChange(1)} title="Primera página">
            <i className="fas fa-angle-double-left"></i>
          </button>
          <button disabled={page === 1} onClick={() => onPageChange(page - 1)} title="Página anterior">
            <i className="fas fa-angle-left"></i>
          </button>
          <span className="page-indicator">Pág. {page} de {totalPages}</span>
          <button disabled={page === totalPages || totalPages === 0} onClick={() => onPageChange(page + 1)} title="Siguiente página">
            <i className="fas fa-angle-right"></i>
          </button>
          <button disabled={page === totalPages || totalPages === 0} onClick={() => onPageChange(totalPages)} title="Última página">
            <i className="fas fa-angle-double-right"></i>
          </button>
          <button onClick={onReload} className="btn-refresh" title="Actualizar">
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>
    </div>
  );
};
