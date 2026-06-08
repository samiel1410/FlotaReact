import React from 'react';

const TipoFormaPagoSelect = ({ value, onChange, name = 'tipo_forma_pago', label = 'Tipo', ...props }) => {
  const tipos = [
    { id: '1', nombre: 'OTRO' },
    { id: '2', nombre: 'EFECTIVO' },
    { id: '3', nombre: 'CHEQUE' },
    { id: '4', nombre: 'CREDITO' },
    { id: '5', nombre: 'DEBITO' },
  ];

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-bold text-gray-700 mb-2">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        {...props}
      >
        <option value="">Seleccionar</option>
        {tipos.map((tipo) => (
          <option key={tipo.id} value={tipo.id}>
            {tipo.nombre}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TipoFormaPagoSelect;
