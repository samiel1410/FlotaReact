import React, { useState, useEffect } from 'react';
import FormaPagoList from './components/FormaPagoList';
import FormaPagoSearchBar from './components/FormaPagoSearchBar';
import NewFormaPagoForm from './components/NewFormaPagoForm';
import Modal from '../../components/common/Modal';
import Swal from 'sweetalert2';
import { getFormasPago, createFormaPago, updateFormaPago, deleteFormaPago } from '../../services/formapago.service';

const FormaPagoPage = () => {
  const [formasPago, setFormasPago] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingFormaPago, setEditingFormaPago] = useState(null);
  const [filters, setFilters] = useState({ nombre: '', codigo: '', estado: '2' });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, pageSize: 25 });

  const fetchFormasPago = async (currentFilters, currentPage) => {
    setLoading(true);
    try {
      const params = {
        nombre: currentFilters.nombre,
        cod: currentFilters.codigo, // Usar 'cod' como en ExtJS
        estado: currentFilters.estado === '2' ? '' : currentFilters.estado,
        page: currentPage,
        limit: pagination.pageSize,
      };
      const response = await getFormasPago(params);
      setFormasPago(response.data);
      setPagination((prev) => ({ ...prev, totalPages: Math.ceil(response.total / prev.pageSize) }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormasPago(filters, pagination.currentPage);
  }, [filters, pagination.currentPage]);

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleRefresh = () => {
    setFilters({ nombre: '', codigo: '', estado: '2' });
    setPagination({ currentPage: 1, totalPages: 1, pageSize: 25 });
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleNewFormaPagoClick = () => {
    setEditingFormaPago(null);
    setShowModal(true);
  };

  const handleEditFormaPago = (formaPago) => {
    setEditingFormaPago(formaPago);
    setShowModal(true);
  };

  const handleDeleteFormaPago = async (id) => {
    const result = await Swal.fire({
      title: 'Confirmar',
      text: '¿Está seguro de que desea eliminar esta forma de pago?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        await deleteFormaPago(id);
        fetchFormasPago(filters, pagination.currentPage);
      } catch (err) {
        setError(err);
      }
    }
  };

  const handleSubmitForm = async (formData) => {
    try {
      if (formData.id_forma_pago) {
        await updateFormaPago(formData);
      } else {
        await createFormaPago(formData);
      }
      setShowModal(false);
      fetchFormasPago(filters, pagination.currentPage);
    } catch (err) {
      setError(err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFormaPago(null);
  };

  if (loading) return <p>Cargando formas de pago...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de Formas de Pago</h1>
      <button
        onClick={handleNewFormaPagoClick}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Nueva Forma de Pago
      </button>
      <FormaPagoSearchBar onSearch={handleSearch} onRefresh={handleRefresh} />
      <FormaPagoList
        formasPago={formasPago}
        onEdit={handleEditFormaPago}
        onDelete={handleDeleteFormaPago}
        onPageChange={handlePageChange}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
      />

      {showModal && (
        <Modal title={editingFormaPago ? 'Editar Forma de Pago' : 'Nueva Forma de Pago'} onClose={handleCloseModal}>
          <NewFormaPagoForm
            initialData={editingFormaPago}
            onSubmit={handleSubmitForm}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
};

export default FormaPagoPage;
