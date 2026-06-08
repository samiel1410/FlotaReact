import React from 'react';

const SRICodeSelect = ({ value, onChange, name = 'id_fkcodigo_pago_sri', label = 'SRI', ...props }) => {
  const sriCodes = [
    { id: '01', nombre: 'SIN UTILIZACIóN DEL SISTEMA FINACIERO' },
    { id: '15', nombre: 'COMPESACIóN DE DEUDAD' },
    { id: '16', nombre: 'TARJETA DE DEBITO' },
    { id: '17', nombre: 'DINERO ELECTRóNICO' },
    { id: '18', nombre: 'TARJETA PREPAGO' },
    { id: '19', nombre: 'TARJETA DE CREDITO' },
    { id: '20', nombre: 'OTROS CON UTILIZACIóN DEL SISTEMA FINANCIERO' },
    { id: '21', nombre: 'ENDOSO DE TéTULOS' },
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
        {sriCodes.map((sri) => (
          <option key={sri.id} value={sri.id}>
            {sri.nombre}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SRICodeSelect;
