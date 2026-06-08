import React, { useState, useEffect } from 'react';
import AnulacionFacturasList from './components/AnulacionFacturasList';
import AnulacionFacturasSearchBar from './components/AnulacionFacturasSearchBar';
import Swal from 'sweetalert2';
import {
  getFacturasPendientes,
  anularFacturasSeleccionadas,
  anularTodasFacturas,
  cancelarAnulacionFactura,
} from '../../services/anulaciones.service';

const AnulacionFacturasPage = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    nombrecliente: '',
    rucliente: '',
    factura: '',
    numeroguia: '',
    mes: '',
    anio: '',
    fechaini: '',
    fechalast: '',
    idusuario: '',
  });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, pageSize: 25 });
  const [selectedFacturas, setSelectedFacturas] = useState([]);

  const fetchFacturas = async (currentFilters, currentPage) => {
    setLoading(true);
    try {
      const params = {
        ...currentFilters,
        page: currentPage,
        limit: pagination.pageSize,
      };
      const response = await getFacturasPendientes(params);
      setFacturas(response.data);
      setPagination((prev) => ({ ...prev, totalPages: Math.ceil(response.total / prev.pageSize) }));
      setSelectedFacturas([]); // Clear selection on new fetch
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacturas(filters, pagination.currentPage);
  }, [filters, pagination.currentPage]);

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleRefresh = () => {
    setFilters({
      nombrecliente: '',
      rucliente: '',
      factura: '',
      numeroguia: '',
      mes: '',
      anio: '',
      fechaini: '',
      fechalast: '',
      idusuario: '',
    });
    setPagination({ currentPage: 1, totalPages: 1, pageSize: 25 });
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleSelectFactura = (id) => {
    setSelectedFacturas((prevSelected) =>
      prevSelected.includes(id) ? prevSelected.filter((item) => item !== id) : [...prevSelected, id]
    );
  };

  const handleSelectAllFacturas = () => {
    const selectableFacturas = facturas.filter(
      (factura) => factura.estado_factura === '3' || factura.estado_sincroinizacion === '0'
    ).map((factura) => factura.id_factura);

    if (selectedFacturas.length === selectableFacturas.length) {
      setSelectedFacturas([]);
    } else {
      setSelectedFacturas(selectableFacturas);
    }
  };

  const handleAnularSeleccionadas = async () => {
    if (selectedFacturas.length === 0) {
      Swal.fire('Info', 'Seleccione al menos una factura para anular.', 'info');
      return;
    }
    const result = await Swal.fire({
      title: 'Confirmar Anulación',
      text: '¿Está seguro de que desea anular las facturas seleccionadas?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        await anularFacturasSeleccionadas(selectedFacturas);
        fetchFacturas(filters, pagination.currentPage);
      } catch (err) {
        setError(err);
      }
    }
  };

  const handleAnularTodas = async () => {
    const result2 = await Swal.fire({
      title: 'Anular Todas',
      text: '¿Está seguro de que desea anular todas las facturas que cumplen con los filtros actuales?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular todas',
      cancelButtonText: 'Cancelar'
    });
    if (result2.isConfirmed) {
      try {
        await anularTodasFacturas(filters);
        fetchFacturas(filters, pagination.currentPage);
      } catch (err) {
        setError(err);
      }
    }
  };

  const handleCancelarAnulacion = async (id) => {
    const result3 = await Swal.fire({
      title: 'Cancelar Anulación',
      text: '¿Está seguro de que desea cancelar la anulación de esta factura?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar anulación',
      cancelButtonText: 'No'
    });
    if (result3.isConfirmed) {
      try {
        await cancelarAnulacionFactura(id);
        fetchFacturas(filters, pagination.currentPage);
      } catch (err) {
        setError(err);
      }
    }
  };

  if (loading) return <p>Cargando facturas...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Anulación de Facturas</h1>
      <div className="flex space-x-2 mb-4">
        <button
          onClick={handleAnularSeleccionadas}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          disabled={selectedFacturas.length === 0}
        >
          Anular Seleccionadas
        </button>
        <button
          onClick={handleAnularTodas}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Anular Todas
        </button>
      </div>
      <AnulacionFacturasSearchBar onSearch={handleSearch} onRefresh={handleRefresh} />
      <AnulacionFacturasList
        facturas={facturas}
        onCancelAnulacion={handleCancelarAnulacion}
        onPageChange={handlePageChange}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        selectedFacturas={selectedFacturas}
        onSelectFactura={handleSelectFactura}
        onSelectAllFacturas={handleSelectAllFacturas}
      />
    </div>
  );
};

export default AnulacionFacturasPage;
