import { useState, useEffect } from 'react';
import { api } from '../../config/axios';
import Swal from 'sweetalert2';
import { NotificacionModal } from './components/NotificacionModal';
import { useAuth } from '../../hooks/useAuth';

export const NotificacionesPage = () => {
  const { hasPermission } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  
  // Filters
  const [fechaFilter, setFechaFilter] = useState('');
  const [rolFilter, setRolFilter] = useState('');
  const [roles, setRoles] = useState([]);
  
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Cargar roles para el filtro
    api.get('/roles/rolesSeleccionPaginado')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setRoles(res.data.data);
        }
      })
      .catch(console.error);
  }, []);

  const fetchNotificaciones = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notificaciones/notificacionesSeleccionarPaginado', {
        params: {
          page,
          limit,
          fecha: fechaFilter,
          rol: rolFilter
        }
      });
      if (res.data?.success) {
        setNotificaciones(res.data.data || []);
        setTotal(res.data.total || 0);
      } else {
        setNotificaciones([]);
        setTotal(0);
      }
    } catch (error) {
      console.error(error);
      setNotificaciones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificaciones();
  }, [page, limit, fechaFilter, rolFilter]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage);
    }
  };

  const getStatusBadge = (estado) => {
    if (estado === 1) return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase border border-emerald-200">Enviado</span>;
    if (estado === 0) return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase border border-rose-200">Fallido</span>;
    return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase border border-slate-200">Desconocido</span>;
  };

  const getRolName = (rolId) => {
    if (rolId === -1) return 'Usuario Específico';
    if (rolId === 0) return 'Todos';
    if (rolId === 1) return 'Administrador';
    if (rolId === 5) return 'Super Administrador';
    const rol = roles.find(r => r.id_rol == rolId);
    return rol ? rol.nombre_rol : `Rol ${rolId}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {/* Header Panel */}
      <div className="bg-white px-6 py-4 shadow-sm border-b border-slate-200 shrink-0 sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <i className="fas fa-bell text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-tight">Historial de Notificaciones</h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Envíos de alertas Push al aplicativo móvil</p>
          </div>
        </div>
        
        {hasPermission('notificaciones.notificaciones') && (
          <button 
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-200 hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <i className="fas fa-paper-plane"></i>
            Nueva Notificación
          </button>
        )}
      </div>

      {/* Filters Panel */}
      <div className="px-6 py-3 bg-white border-b border-slate-200 shrink-0 flex flex-wrap gap-4 items-end">
        <div className="w-full md:w-48">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha</label>
          <input 
            type="date" 
            value={fechaFilter}
            onChange={(e) => { setFechaFilter(e.target.value); setPage(1); }}
            className="w-full pl-3 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
          />
        </div>
        <div className="w-full md:w-48">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rol</label>
          <select 
            value={rolFilter}
            onChange={(e) => { setRolFilter(e.target.value); setPage(1); }}
            className="w-full pl-3 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
          >
            <option value="">Todos los roles</option>
            <option value="0">General (0)</option>
            {roles.map(rol => (
              <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre_rol}</option>
            ))}
          </select>
        </div>
        {(fechaFilter || rolFilter) && (
          <button 
            onClick={() => { setFechaFilter(''); setRolFilter(''); setPage(1); }}
            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 h-8"
          >
            <i className="fas fa-times mr-1"></i> Limpiar Filtros
          </button>
        )}
      </div>

      {/* Grid Content */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10 font-black tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-black">ID</th>
                  <th className="px-6 py-4 font-black">Fecha</th>
                  <th className="px-6 py-4 font-black">Título</th>
                  <th className="px-6 py-4 font-black">Mensaje</th>
                  <th className="px-6 py-4 font-black">Rol Destino</th>
                  <th className="px-6 py-4 font-black">Usuario (Emisor)</th>
                  <th className="px-6 py-4 font-black text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center">
                      <i className="fas fa-spinner fa-spin text-3xl text-blue-500 mb-2"></i>
                      <p className="text-slate-500">Cargando notificaciones...</p>
                    </td>
                  </tr>
                ) : notificaciones.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-inbox text-2xl text-slate-400"></i>
                      </div>
                      <p className="text-slate-500 font-medium text-lg">No se encontraron notificaciones</p>
                      <p className="text-xs text-slate-400 mt-1">Envía una nueva alerta o cambia los filtros de búsqueda</p>
                    </td>
                  </tr>
                ) : (
                  notificaciones.map(item => (
                    <tr key={item.id_notificaciones} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-3 font-bold text-slate-800">#{item.id_notificaciones}</td>
                      <td className="px-6 py-3 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <i className="far fa-calendar-alt text-slate-400"></i>
                          {item.fecha_notificaciones ? new Date(item.fecha_notificaciones).toLocaleString('es-EC', { hour12: false }) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-3 font-semibold text-slate-700">{item.titulo_notificaciones}</td>
                      <td className="px-6 py-3 min-w-[200px]">
                        <p className="line-clamp-2 text-xs" title={item.mensaje_notificaciones}>
                          {item.mensaje_notificaciones}
                        </p>
                      </td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md whitespace-nowrap">
                          {getRolName(item.rol_notificaciones)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                          <img src={`https://ui-avatars.com/api/?name=${item.nombre_usuario}&background=e2e8f0&color=475569`} alt="" />
                        </div>
                        {item.nombre_usuario}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {getStatusBadge(item.estado_notificaciones)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!loading && total > 0 && (
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-slate-500">
                Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de <strong className="text-slate-700">{total}</strong> registros
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <i className="fas fa-chevron-left text-xs"></i>
                </button>
                <span className="w-10 text-center text-xs font-bold text-slate-700">
                  {page} / {Math.ceil(total / limit)}
                </span>
                <button 
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= Math.ceil(total / limit)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <i className="fas fa-chevron-right text-xs"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Notificación */}
      <NotificacionModal 
        show={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => { setShowModal(false); fetchNotificaciones(); setPage(1); }}
      />
    </div>
  );
};
