import React, { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2'; // Para los prompts y confirmaciones

export const MonitoreoPage = () => {
  const { socket, isConnected } = useSocket();
  const [activeUsers, setActiveUsers] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [lockedSeats, setLockedSeats] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (!socket) return;

    socket.on('usuarios_actualizados', (data) => {
      console.log('Usuarios actualizados:', data);
      setActiveUsers(data);
    });

    socket.on('login_history_data', (data) => {
      console.log('Historial de login:', data);
      setLoginHistory(data);
    });

    socket.on('nuevo_login_historial', () => {
      socket.emit('get_login_history');
    });

    // ─── LOCKS DE ASIENTOS ────────────────────────────────────────────────
    socket.on('locks_actualizados', (locks) => {
      setLockedSeats(locks || []);
    });

    // Carga inicial (la suscripción devuelve la lista completa de usuarios)
    socket.emit('monitoreo_subscribe');
    socket.emit('get_active_users');
    socket.emit('get_login_history');
    socket.emit('get_locked_asientos');

    return () => {
      socket.off('usuarios_actualizados');
      socket.off('login_history_data');
      socket.off('nuevo_login_historial');
      socket.off('locks_actualizados');
    };
  }, [socket]);

  // Refrescar locks
  const refrescarLocks = () => {
    socket.emit('get_locked_asientos');
  };

  // Liberar locks de un usuario
  const handleReleaseUserLocks = (userId, userName) => {
    if (!userId) return;
    Swal.fire({
      title: '¿Liberar asientos?',
      text: `Se liberarán TODOS los asientos bloqueados por ${userName || userId}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#035f2c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, liberar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        socket.emit('release_user_locks', { userId, userName });
        toast.success(`Asientos de ${userName || userId} liberados`);
      }
    });
  };

  // Funciones para las acciones de usuario
  const handleSetUserLock = (userId, userName) => {
    Swal.fire({
      title: 'Bloqueo Temporal',
      input: 'number',
      inputLabel: `Ingrese el tiempo de bloqueo en MINUTOS para ${userName}:`,
      inputPlaceholder: 'Minutos',
      showCancelButton: true,
      confirmButtonText: 'Bloquear',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || isNaN(value) || parseInt(value) <= 0) {
          return 'Debe ingresar un número válido de minutos.';
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const mins = parseInt(result.value);
        socket.emit('set_user_lock', { userId, minutes: mins });
        toast.success(`Bloqueo de ${mins} min aplicado a ${userName}`);
      }
    });
  };

  const handleSendIndividualNotification = (userId, userName) => {
    Swal.fire({
      title: 'Mensaje Individual',
      input: 'text',
      inputLabel: `Escriba el mensaje para ${userName}:`,
      inputPlaceholder: 'Mensaje',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'El mensaje no puede estar vacío.';
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        socket.emit('send_individual_notification', { userId, mensaje: result.value });
        toast.success(`Mensaje enviado a ${userName}`);
      }
    });
  };

  const handleKickUser = (userId, userName) => {
    Swal.fire({
      title: 'Expulsar Usuario',
      text: `¿Cerrar sesión de ${userName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, expulsar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        socket.emit('kick_user', { userId });
        toast.success(`Usuario ${userName} expulsado.`);
      }
    });
  };

  const handleSendMassiveNotification = () => {
    Swal.fire({
      title: 'Aviso General',
      input: 'text',
      inputLabel: 'Escriba el mensaje para TODOS los usuarios conectados:',
      inputPlaceholder: 'Mensaje masivo',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'El mensaje no puede estar vacío.';
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        socket.emit('send_massive_notification', { mensaje: result.value });
        toast.success('Notificación masiva enviada correctamente');
      }
    });
  };

  // ─── DERIVADOS PARA LA LISTA DE USUARIOS ─────────────────────────────
  const formatFecha = (value) => {
    if (!value) return 'Nunca';
    const d = new Date(value);
    return isNaN(d.getTime()) ? 'Nunca' : d.toLocaleString();
  };

  const conectadosCount = activeUsers.filter(u => Number(u.socketCount) > 0).length;
  const q = busqueda.trim().toLowerCase();
  const usuariosFiltrados = q
    ? activeUsers.filter(u =>
        String(u.id).toLowerCase().includes(q) ||
        (u.nombre || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.sucursal || '').toLowerCase().includes(q)
      )
    : activeUsers;

  return (
    <div className="p-4 flex flex-col h-full">
      <h1 className="text-2xl font-bold mb-4">Monitoreo de Usuarios</h1>
      <p className="mb-4">Estado del Socket: {isConnected ? 'Conectado' : 'Desconectado'}</p>

      <div className="mb-4">
        <button
          onClick={handleSendMassiveNotification}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          <i className="fas fa-bullhorn mr-2"></i> NOTIFICACIÓN MASIVA
        </button>
        <button
          onClick={() => socket.emit('get_active_users')}
          className="ml-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out"
        >
          <i className="fas fa-sync-alt mr-2"></i> ACTUALIZAR LISTA
        </button>
      </div>

      {/* ─── PANEL DE LOCKS DE ASIENTOS ────────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 8,
        border: '1px solid #e5e7eb', padding: 12, marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 className="text-xl font-semibold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-lock text-purple-600" style={{ fontSize: 18 }}></i>
            Asientos Bloqueados en Vivo
          </h2>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{
              padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
              background: lockedSeats.length > 0 ? '#f3e8ff' : '#f0fdf4',
              color: lockedSeats.length > 0 ? '#7c3aed' : '#16a34a'
            }}>
              {lockedSeats.length} asiento(s) bloqueado(s)
            </div>
            <button
              onClick={refrescarLocks}
              style={{
                background: '#f3f4f6', border: 'none', borderRadius: 6,
                padding: '4px 10px', cursor: 'pointer', fontSize: 11,
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4
              }}
              title="Refrescar"
            >
              <i className="fas fa-sync-alt"></i> Refrescar
            </button>
          </div>
        </div>

        {lockedSeats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>
            <i className="fas fa-check-circle" style={{ fontSize: 24, marginBottom: 4, color: '#22c55e' }}></i>
            <p>No hay asientos bloqueados en este momento</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {/* Agrupado por usuario */}
            {(() => {
              const porUsuario = {};
              lockedSeats.forEach(lock => {
                const key = lock.userId || lock.userName || 'Desconocido';
                if (!porUsuario[key]) porUsuario[key] = { userName: lock.userName || 'Desconocido', userId: lock.userId, locks: [] };
                porUsuario[key].locks.push(lock);
              });

              return (
                <table className="min-w-full divide-y divide-gray-200" style={{ fontSize: 12 }}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Asientos</th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Cant.</th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Viaje</th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Tiempo Bloqueo</th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(porUsuario).map(([key, group]) => {
                      const lockedAt = group.locks[0]?.lockedAt;
                      const segundos = lockedAt ? Math.floor((Date.now() - lockedAt) / 1000) : 0;
                      const minutos = Math.floor(segundos / 60);
                      const tiempoTexto = segundos < 60 ? `${segundos}s` : `${minutos}m ${segundos % 60}s`;

                      return (
                        <tr key={key}>
                          <td className="px-2 py-1 whitespace-nowrap font-medium">
                            <i className="fas fa-user-circle mr-1 text-purple-500"></i>
                            {group.userName || group.userId}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap">
                            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                              {group.locks.map((lock, i) => (
                                <span key={i} style={{
                                  background: '#f3e8ff', color: '#7c3aed',
                                  padding: '1px 5px', borderRadius: 3,
                                  fontSize: 11, fontWeight: 700
                                }}>
                                  {lock.asiento}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-center font-bold">
                            {group.locks.length}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs">
                            #{group.locks[0]?.viajeId || '---'}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {tiempoTexto}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap">
                            <button
                              onClick={() => handleReleaseUserLocks(group.userId, group.userName)}
                              style={{
                                background: '#fef2f2', color: '#dc2626',
                                border: '1px solid #fecaca', borderRadius: 4,
                                padding: '2px 8px', cursor: 'pointer',
                                fontSize: 11, fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 3
                              }}
                            >
                              <i className="fas fa-unlock"></i> Liberar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
        {/* Usuarios Activos */}
        <div className="bg-white p-4 rounded-lg shadow-md flex flex-col overflow-hidden">
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <h2 className="text-xl font-semibold">Usuarios Activos</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              {conectadosCount} conectado(s)
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {activeUsers.length} en total
            </span>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por ID, usuario, nombre o sucursal..."
            className="mb-3 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="overflow-auto flex-1">
            {usuariosFiltrados.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Actividad</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuariosFiltrados.map(user => (
                    <tr key={user.id} className={Number(user.socketCount) > 0 ? 'bg-green-50/40' : ''}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex items-center">
                          <i className={`fas fa-user-circle mr-2 ${Number(user.socketCount) > 0 ? 'text-green-500' : 'text-gray-400'}`}></i>
                          <div className="flex flex-col leading-tight">
                            <span>{user.nombre}</span>
                            <span className="text-xs text-gray-400">
                              {[user.username, user.sucursal].filter(Boolean).join(' · ')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {user.bloqueado_hasta ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            <i className="fas fa-hourglass-half mr-1"></i> Bloqueado
                          </span>
                        ) : Number(user.socketCount) > 0 ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Conectado ({user.socketCount})
                          </span>
                        ) : Number(user.estado_usuario) === 0 ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-200 text-gray-600">
                            <i className="fas fa-ban mr-1"></i> Inactivo
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-700">
                            Desconectado
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatFecha(user.lastSeen)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => handleSetUserLock(user.id, user.nombre)} className="text-orange-600 hover:text-orange-900 mr-3" title="Bloqueo Temporal">
                          <i className="fas fa-clock"></i>
                        </button>
                        <button
                          onClick={() => handleSendIndividualNotification(user.id, user.nombre)}
                          disabled={Number(user.socketCount) === 0}
                          className="text-blue-600 hover:text-blue-900 mr-3 disabled:text-gray-300 disabled:cursor-not-allowed"
                          title={Number(user.socketCount) === 0 ? 'Usuario desconectado' : 'Enviar Mensaje'}
                        >
                          <i className="fas fa-comment-dots"></i>
                        </button>
                        <button
                          onClick={() => handleKickUser(user.id, user.nombre)}
                          disabled={Number(user.socketCount) === 0}
                          className="text-red-600 hover:text-red-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                          title={Number(user.socketCount) === 0 ? 'Usuario desconectado' : 'Expulsar Usuario'}
                        >
                          <i className="fas fa-user-slash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500">
                {activeUsers.length === 0 ? 'Cargando usuarios...' : 'Sin resultados para la búsqueda.'}
              </p>
            )}
          </div>
        </div>

        {/* Historial de Accesos */}
        <div className="bg-white p-4 rounded-lg shadow-md flex flex-col overflow-hidden">
          <h2 className="text-xl font-semibold mb-3">Historial de Accesos</h2>
          <div className="overflow-auto flex-1">
            {loginHistory.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP de Conexión</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha y Hora</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loginHistory.map((entry, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <i className="fas fa-history mr-2 text-gray-500"></i>
                          {entry.nombre_usuario}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                        <code className="bg-gray-100 p-1 rounded text-xs">{entry.ip_acceso || 'Desconocida'}</code>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{new Date(entry.fecha_acceso).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500">No hay historial de accesos.</p>
            )}
          </div>
          <div className="mt-4">
            <button
              onClick={() => setLoginHistory([])}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
            >
              <i className="fas fa-broom mr-2"></i> Limpiar Vista
            </button>
            <button
              onClick={() => socket.emit('get_login_history')}
              className="ml-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out"
            >
              <i className="fas fa-sync mr-2"></i> REFRESCAR HISTORIAL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};