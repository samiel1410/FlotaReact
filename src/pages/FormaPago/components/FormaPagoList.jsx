import React from 'react';

const FormaPagoList = ({ formasPago, onEdit, onDelete, onPageChange, currentPage, totalPages }) => {
  const getTipoFormaPago = (value) => {
    switch (value) {
      case '1': return 'OTRO';
      case '2': return 'EFECTIVO';
      case '3': return 'CHEQUE';
      case '4': return 'CREDITO';
      case '5': return 'DEBITO';
      default: return 'DESCONOCIDO';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-xl font-bold mb-4">Lista de Formas de Pago</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                F. Creación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {formasPago.map((formaPago) => (
              <tr key={formaPago.id_forma_pago}>
                <td className="px-6 py-4 whitespace-nowrap">{formaPago.codigo_forma_pago}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formaPago.nombre_forma_pago}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getTipoFormaPago(formaPago.tipo_forma_pago)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatDate(formaPago.fecha_creacion_forma_pago)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formaPago.estado_forma_pago === '1' ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Activo
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onEdit(formaPago)}
                    className="text-indigo-600 hover:text-indigo-900 mr-2"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(formaPago.id_forma_pago)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
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

export default FormaPagoList;
