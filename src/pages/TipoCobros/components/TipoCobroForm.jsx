import React from 'react';
import { GenericForm } from '../../../components/common/GenericForm';

export const TipoCobroForm = (props) => {
  return (
    <GenericForm
      {...props}
      idField="id_tipo_cobros"
      endpoint="/tipo_cobros/tipoCobrosInsertar"
      fields={[
        { name: 'nombre_tipo_cobros', label: 'Nombre', type: 'text', required: true },
        { name: 'valor_tipo_cobros', label: 'Valor ($)', type: 'number', required: true, defaultValue: '0' },
        {
          name: 'prioridad_cobros_tipo', label: 'Prioridad', type: 'select', required: true, options: [
            { value: '1', label: 'Alta' },
            { value: '2', label: 'Media' },
            { value: '3', label: 'Baja' },
          ], defaultValue: '3'
        },
        {
          name: 'tipo_cobros_automaticos', label: 'Automático', type: 'select', options: [
            { value: '1', label: 'Sí' },
            { value: '0', label: 'No' },
          ], defaultValue: '0'
        },
        {
          name: 'cobrar_una_vez_dia', label: 'Cobrar Una Vez al Día', type: 'select', options: [
            { value: '1', label: 'Sí' },
            { value: '0', label: 'No' },
          ], defaultValue: '0'
        },
        {
          name: 'estado_tipo_cobros', label: 'Estado', type: 'select', required: true, options: [
            { value: '1', label: 'Activo' },
            { value: '0', label: 'Inactivo' },
          ], defaultValue: '1'
        },
      ]}
    />
  );
};

export default TipoCobroForm;
