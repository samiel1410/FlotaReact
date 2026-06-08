import React, { useState, useEffect } from 'react';
import ProvinciaList from './components/ProvinciaList';
import ProvinciaSearchBar from './components/ProvinciaSearchBar';
import NewProvinciaForm from './components/NewProvinciaForm';
import Modal from '../../components/common/Modal';
import Swal from 'sweetalert2';
import { getProvincias, createProvincia, updateProvincia, deleteProvincia } from '../../services/provincia.service';

const ProvinciaPage = () => {
  const [provincias, setProvincias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProvincia, setEditingProvincia] = useState(null);
  const [filters, setFilters] = useState({ nombre: '' });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, pageSize: 25 });

  const fetchProvincias = async (currentFilters, currentPage) => {
    setLoading(true);
    try {
      const params = {
        nombre: currentFilters.nombre,
        page: currentPage,
        limit: pagination.pageSize,
      };
      const response = await getProvincias(params);
      setProvincias(response.data);
      setPagination((prev) => ({ ...prev, totalPages: Math.ceil(response.total / prev.pageSize) }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProvincias(filters, pagination.currentPage);
  }, [filters, pagination.currentPage]);

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleRefresh = () => {
    setFilters({ nombre: '' });
    setPagination({ currentPage: 1, totalPages: 1, pageSize: 25 });
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleNewProvinciaClick = () => {
    setEditingProvincia(null);
    setShowModal(true);
  };

  const handleEditProvincia = (provincia) => {
    setEditingProvincia(provincia);
    setShowModal(true);
  };

  const handleDeleteProvincia = async (id) => {
    const result = await Swal.fire({
      title: 'Confirmar',
      text: '¿Está seguro de que desea eliminar esta provincia?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        await deleteProvincia(id);
        fetchProvincias(filters, pagination.currentPage);
      } catch (err) {
        setError(err);
      }
    }
  };

  const handleSubmitForm = async (formData) => {
    try {
      if (formData.id_provincia) {
        await updateProvincia(formData);
      } else {
        await createProvincia(formData);
      }
      setShowModal(false);
      fetchProvincias(filters, pagination.currentPage);
    } catch (err) {
      setError(err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProvincia(null);
  };

  if (loading) return <p>Cargando provincias...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de Provincias</h1>
      <button
        onClick={handleNewProvinciaClick}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Nueva Provincia
      </button>
      <ProvinciaSearchBar onSearch={handleSearch} onRefresh={handleRefresh} />
      <ProvinciaList
        provincias={provincias}
        onEdit={handleEditProvincia}
        onDelete={handleDeleteProvincia}
        onPageChange={handlePageChange}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
      />

      {showModal && (
        <Modal title={editingProvincia ? 'Editar Provincia' : 'Nueva Provincia'} onClose={handleCloseModal}>
          <NewProvinciaForm
            initialData={editingProvincia}
            onSubmit={handleSubmitForm}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
};

export default ProvinciaPage;
