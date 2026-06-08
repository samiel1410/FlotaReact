import React, { useState, useEffect } from 'react';
import CantonList from './components/CantonList';
import CantonSearchBar from './components/CantonSearchBar';
import NewCantonForm from './components/NewCantonForm';
import Modal from '../../components/common/Modal';
import Swal from 'sweetalert2';
import { getCantones, createCanton, updateCanton, deleteCanton } from '../../services/canton.service';

const CantonPage = () => {
  const [cantones, setCantones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCanton, setEditingCanton] = useState(null);
  const [filters, setFilters] = useState({ nombre: '', id_fkprovincia: '' });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, pageSize: 25 });

  const fetchCantones = async (currentFilters, currentPage) => {
    setLoading(true);
    try {
      const params = {
        nombre: currentFilters.nombre,
        id_fkprovincia: currentFilters.id_fkprovincia,
        page: currentPage,
        limit: pagination.pageSize,
      };
      const response = await getCantones(params);
      setCantones(response.data);
      setPagination((prev) => ({ ...prev, totalPages: Math.ceil(response.total / prev.pageSize) }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCantones(filters, pagination.currentPage);
  }, [filters, pagination.currentPage]);

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleRefresh = () => {
    setFilters({ nombre: '', id_fkprovincia: '' });
    setPagination({ currentPage: 1, totalPages: 1, pageSize: 25 });
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleNewCantonClick = () => {
    setEditingCanton(null);
    setShowModal(true);
  };

  const handleEditCanton = (canton) => {
    setEditingCanton(canton);
    setShowModal(true);
  };

  const handleDeleteCanton = async (id) => {
    const result = await Swal.fire({
      title: 'Confirmar',
      text: '¿Está seguro de que desea eliminar este cantón?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        await deleteCanton(id);
        fetchCantones(filters, pagination.currentPage);
      } catch (err) {
        setError(err);
      }
    }
  };

  const handleSubmitForm = async (formData) => {
    try {
      if (formData.id) {
        await updateCanton(formData);
      } else {
        await createCanton(formData);
      }
      setShowModal(false);
      fetchCantones(filters, pagination.currentPage);
    } catch (err) {
      setError(err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCanton(null);
  };

  if (loading) return <p>Cargando cantones...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de Cantones</h1>
      <button
        onClick={handleNewCantonClick}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Nuevo Cantón
      </button>
      <CantonSearchBar onSearch={handleSearch} onRefresh={handleRefresh} />
      <CantonList
        cantones={cantones}
        onEdit={handleEditCanton}
        onDelete={handleDeleteCanton}
        onPageChange={handlePageChange}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
      />

      {showModal && (
        <Modal title={editingCanton ? 'Editar Cantón' : 'Nuevo Cantón'} onClose={handleCloseModal}>
          <NewCantonForm
            initialData={editingCanton}
            onSubmit={handleSubmitForm}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
};

export default CantonPage;
