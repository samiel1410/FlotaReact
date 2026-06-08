import React, { useState, useEffect } from 'react';
import DestinoList from './components/DestinoList';
import DestinoSearchBar from './components/DestinoSearchBar';
import NewDestinoForm from './components/NewDestinoForm';
import Modal from '../../components/common/Modal';
import { getDestinos, createDestino, updateDestino, deleteDestino } from '../../services/destino.service';

const DestinoPage = () => {
  const [destinos, setDestinos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDestino, setEditingDestino] = useState(null);
  const [filters, setFilters] = useState({ nombre: '', estado: '2' });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, pageSize: 25 });

  const fetchDestinos = async (currentFilters, currentPage) => {
    setLoading(true);
    try {
      const params = {
        nombre: currentFilters.nombre,
        estado: currentFilters.estado === '2' ? '' : currentFilters.estado,
        page: currentPage,
        limit: pagination.pageSize,
      };
      const response = await getDestinos(params);
      setDestinos(response.data);
      setPagination((prev) => ({ ...prev, totalPages: Math.ceil(response.total / prev.pageSize) }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinos(filters, pagination.currentPage);
  }, [filters, pagination.currentPage]);

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleRefresh = () => {
    setFilters({ nombre: '', estado: '2' });
    setPagination({ currentPage: 1, totalPages: 1, pageSize: 25 });
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleNewDestinoClick = () => {
    setEditingDestino(null);
    setShowModal(true);
  };

  const handleEditDestino = (destino) => {
    setEditingDestino(destino);
    setShowModal(true);
  };

  const handleDeleteDestino = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este destino?')) {
      try {
        await deleteDestino(id);
        fetchDestinos(filters, pagination.currentPage);
      } catch (err) {
        setError(err);
      }
    }
  };

  const handleSubmitForm = async (formData) => {
    try {
      if (formData.id) {
        await updateDestino(formData.id, formData);
      } else {
        await createDestino(formData);
      }
      setShowModal(false);
      fetchDestinos(filters, pagination.currentPage);
    } catch (err) {
      setError(err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDestino(null);
  };

  if (loading) return <p>Cargando destinos...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de Destinos</h1>
      <button
        onClick={handleNewDestinoClick}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Nuevo Destino
      </button>
      <DestinoSearchBar onSearch={handleSearch} onRefresh={handleRefresh} />
      <DestinoList
        destinos={destinos}
        onEdit={handleEditDestino}
        onDelete={handleDeleteDestino}
        onPageChange={handlePageChange}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
      />

      {showModal && (
        <Modal title={editingDestino ? 'Editar Destino' : 'Nuevo Destino'} onClose={handleCloseModal}>
          <NewDestinoForm
            initialData={editingDestino}
            onSubmit={handleSubmitForm}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
};

export default DestinoPage;
