import React from 'react';
import GenericListPage from '../../components/common/GenericListPage';
import { useListado } from '../../hooks/useListado';
import { Button } from '@mui/material';

const AprobacionesPage = () => {
  const { data, loading, error } = useListado('/aprobaciones'); // Adjust API endpoint as needed

  const columns = [
    { field: 'id_aprobacion', headerName: 'ID Aprobación', width: 150 },
    { field: 'usuario_aprueba', headerName: 'Usuario Aprueba', width: 200 },
    { field: 'fecha_aprobacion', headerName: 'Fecha Aprobación', width: 200 },
    { field: 'estado', headerName: 'Estado', width: 120 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 150,
      renderCell: (params) => (
        <Button variant="contained" color="primary" onClick={() => handleViewDetails(params.row.id)}>
          Ver Detalles
        </Button>
      ),
    },
  ];

  const handleViewDetails = (id) => {
    console.log('Ver detalles de aprobación:', id);
    // Implement navigation or modal to show approval details
  };

  return (
    <GenericListPage
      title="Listado de Aprobaciones"
      columns={columns}
      data={data}
      loading={loading}
      error={error}
      // Add any other props for GenericListPage like onAdd, onDelete, onEdit if applicable
    />
  );
};

export default AprobacionesPage;
