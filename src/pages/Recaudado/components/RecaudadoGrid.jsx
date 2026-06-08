export const RecaudadoGrid = ({ data, loading, page, limit, total, totales, onPageChange, onReload }) => {

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="guias-grid-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* BARRA DE TOTALES */}
      <div className="totales-toolbar" style={{ background: '#f8fafc', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '30px', borderBottom: '2px solid #e2e8f0', alignItems: 'center' }}>
        <div style={{ fontSize: '15px' }}>
          <span style={{ color: '#475569', fontWeight: 600, marginRight: '8px' }}>Total Facturas:</span>
          <span style={{ color: '#026536', fontWeight: 'bold', fontSize: '18px' }}>{totales.facturas}</span>
        </div>
        <div style={{ fontSize: '15px' }}>
          <span style={{ color: '#475569', fontWeight: 600, marginRight: '8px' }}>Total Venta:</span>
          <span style={{ color: '#026536', fontWeight: 'bold', fontSize: '18px' }}>${parseFloat(totales.venta).toFixed(2)}</span>
        </div>
        <div style={{ fontSize: '15px' }}>
          <span style={{ color: '#475569', fontWeight: 600, marginRight: '8px' }}>Total Retenido:</span>
          <span style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '18px' }}>${parseFloat(totales.retenido).toFixed(2)}</span>
        </div>
      </div>

      <div className="table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
        <table className="guias-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
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
              <tr><td colSpan="8" className="text-center" style={{padding: '30px'}}><i className="fas fa-spinner fa-spin"></i> Cargando...</td></tr>
            ) : !data || data.length === 0 ? (
              <tr><td colSpan="8" className="text-center" style={{padding: '30px', color: '#94a3b8'}}>No se encontraron registros de recaudación.</td></tr>
            ) : (
              data.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={{ fontWeight: 600, color: '#1e293b' }}>{item.socio}</td>
                  <td className="text-center font-bold" style={{ color: '#3b82f6' }}>{item.disco}</td>
                  <td className="text-center font-mono">{item.viaje}</td>
                  <td>{item.nombre_rutas}</td>
                  <td className="text-center">{item.fecha}</td>
                  <td className="text-center font-bold">{item.cantidad_boletos}</td>
                  <td className="text-right font-mono" style={{ color: '#27ae60', fontWeight: 'bold' }}>
                    ${parseFloat(item.vendido || 0).toFixed(2)}
                  </td>
                  <td className="text-right font-mono" style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                    ${parseFloat(item.retenido || 0).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Paginación */}
      <div className="guias-pagination" style={{ borderTop: '1px solid #e2e8f0', marginTop: 'auto' }}>
        <div className="pagination-info">
          Mostrando {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
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
