import React from 'react';

const AnulacionFacturasList = ({
  facturas,
  onCancelAnulacion,
  onPageChange,
  currentPage,
  totalPages,
  selectedFacturas,
  onSelectFactura,
  onSelectAllFacturas,
}) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
  };

  const isFacturaSelectable = (factura) => {
    // Solo se pueden seleccionar facturas con estado_factura == 3 o estado_sincroinizacion == 0
    return factura.estado_factura === '3' || factura.estado_sincroinizacion === '0';
  };

  const allFacturasSelectable = facturas.every(isFacturaSelectable);

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-xl font-bold mb-4">Facturas Pendientes de Anulación</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  onChange={onSelectAllFacturas}
                  checked={selectedFacturas.length > 0 && selectedFacturas.length === facturas.filter(isFacturaSelectable).length}
                  disabled={!allFacturasSelectable}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #FACTURA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                GUÍA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                FECHA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CLIENTE
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                TOTAL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                MOTIVO
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                COBRADO
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                POR COBRAR
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ESTADO
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {facturas.map((factura) => (
              <tr
                key={factura.id_factura}
                className={
                  factura.estado_factura === '3'
                    ? 'bg-red-100'
                    : factura.estado_factura === '1'
                    ? 'bg-green-100'
                    : ''
                }
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedFacturas.includes(factura.id_factura)}
                    onChange={() => onSelectFactura(factura.id_factura)}
                    disabled={!isFacturaSelectable(factura)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{factura.secuencial_factura}</td>
                <td className="px-6 py-4 whitespace-nowrap">{factura.numero_guia}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatDate(factura.fecha_factura)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {factura.rucliente} - {factura.cliente}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(factura.total_factura)}</td>
                <td className="px-6 py-4 whitespace-nowrap" title={factura.motivo_anulacion_factura}>
                  {factura.motivo_anulacion_factura ? factura.motivo_anulacion_factura.substring(0, 20) + '...' : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(factura.cobrado)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(factura.por_cobrar)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {factura.estado_cobro === 'COBRADA' ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      COBRADA
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      NO COBRADA
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {factura.estado_factura === '3' && ( // Solo mostrar si está anulada
                    <button
                      onClick={() => onCancelAnulacion(factura.id_factura)}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      Cancelar Anulación
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Paginación */}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l"
        >
          Anterior
        </button>
        <span>
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default AnulacionFacturasList;
