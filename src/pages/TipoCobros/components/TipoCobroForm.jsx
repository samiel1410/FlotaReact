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
          name: 'prioridad_cobros_tipo',
          label: 'Orden de Cobro / Prioridad (1 = primero en deducirse)',
          type: 'select',
          required: true,
          options: [
            { value: '1', label: 'Orden 1 — Primero en cobrarse (Máxima prioridad / Multas)' },
            { value: '2', label: 'Orden 2 — Segundo en cobrarse' },
            { value: '3', label: 'Orden 3 — Tercero en cobrarse' },
            { value: '4', label: 'Orden 4 — Cuarto en cobrarse' },
            { value: '5', label: 'Orden 5 — Quinto en cobrarse' },
            { value: '6', label: 'Orden 6 — Sexto en cobrarse' },
            { value: '7', label: 'Orden 7 — Séptimo en cobrarse' },
            { value: '8', label: 'Orden 8 — Octavo en cobrarse' },
            { value: '9', label: 'Orden 9 — Noveno en cobrarse' },
            { value: '10', label: 'Orden 10 — Al final (Menor prioridad)' },
          ],
          defaultValue: '3'
        },
        {
          name: 'tipo_cobros_automaticos', label: 'Automático en Despacho', type: 'select', options: [
            { value: '1', label: 'Sí — Se genera automáticamente en cada despacho' },
            { value: '0', label: 'No — Solo se cobra si fue asignado manualmente' },
          ], defaultValue: '0'
        },
        {
          name: 'cobrar_una_vez_dia', label: 'Cobrar Una Vez al Día', type: 'select', options: [
            { value: '1', label: 'Sí — Solo una vez por día (aunque haya varios viajes)' },
            { value: '0', label: 'No — Se cobra en cada viaje' },
          ], defaultValue: '0'
        },
        {
          name: 'cobro_total_despacho',
          label: 'Puede deducir del 100% de boletos (Sin tope de retención)',
          type: 'select',
          options: [
            { value: '0', label: 'No — Limitado al % de retención de la agencia' },
            { value: '1', label: 'Sí — Puede deducir hasta el 100% de la recaudación (recomendado para multas)' },
          ],
          defaultValue: '0'
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
