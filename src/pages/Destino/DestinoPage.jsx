import React, { useState, useEffect, useCallback } from 'react';
import DestinoList from './components/DestinoList';
import DestinoSearchBar from './components/DestinoSearchBar';
import NewDestinoForm from './components/NewDestinoForm';
import Modal from '../../components/common/Modal';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { getDestinos, createDestino, updateDestino, deleteDestino } from '../../services/destino.service';

const DestinoPage = () => {
  const [destinos, setDestinos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDestino, setEditingDestino] = useState(null);
  const [filters, setFilters] = useState({
    nombre: '',
    estado: '2',
    id_compania: '',
    lugar: '',
  });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, pageSize: 25 });

  const fetchDestinos = useCallback(async (currentFilters, currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        nombre: currentFilters.nombre || undefined,
        estado: currentFilters.estado === '2' || currentFilters.estado === '' ? undefined : currentFilters.estado,
        id_compania: currentFilters.id_compania || undefined,
        lugar: currentFilters.lugar || undefined,
        page: currentPage,
        limit: pagination.pageSize,
      };
      const response = await getDestinos(params);
      if (response && response.success !== false) {
        setDestinos(Array.isArray(response.data) ? response.data : []);
        const total = response.total || 0;
        setTotalCount(total);
        setPagination((prev) => ({ ...prev, totalPages: Math.ceil(total / prev.pageSize) || 1 }));
      } else {
        setDestinos([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Error fetching destinos:', err);
      setError(err);
      toast.error('Error al cargar la lista de destinos');
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize]);

  useEffect(() => {
    fetchDestinos(filters, pagination.currentPage);
  }, [filters, pagination.currentPage, fetchDestinos]);

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleRefresh = () => {
    setFilters({ nombre: '', estado: '2', id_compania: '', lugar: '' });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
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
    const result = await Swal.fire({
      title: '¿Eliminar destino?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) {
      try {
        await deleteDestino(id);
        toast.success('Destino eliminado correctamente');
        fetchDestinos(filters, pagination.currentPage);
      } catch (err) {
        toast.error('Error al eliminar destino: ' + (err.message || ''));
      }
    }
  };


  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDestino(null);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
            <i className="fas fa-map-marker-alt text-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Gestión de Destinos</h1>
              <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                {totalCount} {totalCount === 1 ? 'destino' : 'destinos'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Administra los puntos de llegada, terminales y agencias por compañía</p>
          </div>
        </div>

        <button
          onClick={handleNewDestinoClick}
          className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 active:scale-95 shrink-0"
        >
          <i className="fas fa-plus text-xs" />
          <span>Nuevo Destino</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <DestinoSearchBar
        filters={filters}
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* Listado de Destinos */}
      <DestinoList
        destinos={destinos}
        loading={loading}
        onEdit={handleEditDestino}
        onDelete={handleDeleteDestino}
        onPageChange={handlePageChange}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalCount={totalCount}
      />

      {/* Modal Crear / Editar */}
      {showModal && (
        <Modal
          isOpen={showModal}
          title={editingDestino ? 'Editar Destino' : 'Nuevo Destino'}
          onClose={handleCloseModal}
        >
          <NewDestinoForm
            initialData={editingDestino}
            onSubmit={() => {
              setShowModal(false);
              setEditingDestino(null);
              fetchDestinos(filters, pagination.currentPage);
            }}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
};

export default DestinoPage;
