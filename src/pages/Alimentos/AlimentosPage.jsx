import React, { useState, useEffect } from 'react';
import AlimentosList from './components/AlimentosList';
import AlimentosSearchBar from './components/AlimentosSearchBar';
import NewAlimentoForm from './components/NewAlimentoForm';
import Modal from '../../components/common/Modal';
import { getAlimentos, createAlimento, updateAlimento, deleteAlimento } from '../../services/alimentos.service';

const AlimentosPage = () => {
  const [alimentos, setAlimentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAlimento, setEditingAlimento] = useState(null);
  const [filters, setFilters] = useState({ nombre: '' });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, pageSize: 25 });

  const fetchAlimentos = async (currentFilters, currentPage) => {
    setLoading(true);
    try {
      const params = {
        nombre: currentFilters.nombre,
        page: currentPage,
        limit: pagination.pageSize,
      };
      const response = await getAlimentos(params);
      setAlimentos(response.data);
      setPagination((prev) => ({ ...prev, totalPages: Math.ceil(response.total / prev.pageSize) }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlimentos(filters, pagination.currentPage);
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

  const handleNewAlimentoClick = () => {
    setEditingAlimento(null);
    setShowModal(true);
  };

  const handleEditAlimento = (alimento) => {
    setEditingAlimento(alimento);
    setShowModal(true);
  };

  const handleDeleteAlimento = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este alimento?')) {
      try {
        await deleteAlimento(id);
        fetchAlimentos(filters, pagination.currentPage);
      } catch (err) {
        setError(err);
      }
    }
  };

  const handleSubmitForm = async (formData) => {
    try {
      if (formData.id_alimentos) {
        await updateAlimento(formData);
      } else {
        await createAlimento(formData);
      }
      setShowModal(false);
      fetchAlimentos(filters, pagination.currentPage);
    } catch (err) {
      setError(err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAlimento(null);
  };

  if (loading) return <p>Cargando alimentos...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de Alimentos</h1>
      <button
        onClick={handleNewAlimentoClick}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Nuevo Alimento
      </button>
      <AlimentosSearchBar onSearch={handleSearch} onRefresh={handleRefresh} />
      <AlimentosList
        alimentos={alimentos}
        onEdit={handleEditAlimento}
        onDelete={handleDeleteAlimento}
        onPageChange={handlePageChange}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
      />

      {showModal && (
        <Modal title={editingAlimento ? 'Editar Alimento' : 'Nuevo Alimento'} onClose={handleCloseModal}>
          <NewAlimentoForm
            initialData={editingAlimento}
            onSubmit={handleSubmitForm}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
};

export default AlimentosPage;
