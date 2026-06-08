import React from 'react';

const EstadoSelect = ({ value, onChange, name = 'estado_destino', label = 'Estado', ...props }) => {
  const estados = [
    { value: '1', label: 'Activo' },
    { value: '0', label: 'Inactivo' },
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
        {estados.map((estado) => (
          <option key={estado.value} value={estado.value}>
            {estado.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default EstadoSelect;
