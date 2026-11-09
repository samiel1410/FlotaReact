import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../config/axios';
import { getInitials } from '../../utils/initials';

export const ProfilePage = () => {
  const { user, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const res = await api.get('/buscarUsuario');
        if (res.data?.success && res.data?.data) {
          setUserDetails(res.data.data);
        }
      } catch (err) {
        console.error('Error cargando datos del usuario:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserDetails();
  }, []);

  const nombreUsuario = user?.nombre_usuario || user?.usuario || 'Usuario';

  const ROLES_MOVIL = {
    1: 'Administrador',
    2: 'Busero',
    3: 'Cliente',
    4: 'Oficinista',
    5: 'Super Administrador',
  };
  const rolMovilId = Number(userDetails?.rol_usuario ?? user?.rol_usuario);
  const rolMovilNombre = ROLES_MOVIL[rolMovilId] || 'Sin rol';
  const rolWebNombre = userDetails?.nombre_rol || user?.nombre_rol || 'Sin rol';

  const detalles = [
    { label: 'Usuario', value: nombreUsuario, icon: 'fas fa-user' },
    { label: 'Rol Web', value: rolWebNombre, icon: 'fas fa-globe' },
    { label: 'Rol Móvil', value: rolMovilNombre, icon: 'fas fa-mobile-alt' },
    { label: 'Sucursal', value: userDetails?.nombre_sucursal || '—', icon: 'fas fa-building' },
    { label: 'Ciudad', value: userDetails?.ciudad_sucursal || userDetails?.nombre_canton || '—', icon: 'fas fa-map-marker-alt' },
    { label: 'Pto. Boletería', value: userDetails?.punto_emision_boleteria || '—', icon: 'fas fa-ticket-alt' },
    { label: 'Pto. Guía', value: userDetails?.punto_emision_usuario || '—', icon: 'fas fa-box' },
    { label: 'ID Usuario', value: user?.id_usuario || user?.id || '—', icon: 'fas fa-hashtag' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500"></i>
          <span className="text-slate-500 font-medium">Cargando perfil...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Cabecera */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-8">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white/30 shadow-lg shrink-0 bg-white flex items-center justify-center">
              <span className="text-xl font-black text-slate-800 select-none">
                {getInitials(nombreUsuario)}
              </span>
            </div>
            <div className="text-white">
              <h1 className="text-xl font-bold">{nombreUsuario}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/30 text-sky-50 border border-sky-300/40 uppercase tracking-wide">
                  <i className="fas fa-globe"></i>
                  Web: {rolWebNombre}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-50 border border-emerald-300/40 uppercase tracking-wide">
                  <i className="fas fa-mobile-alt"></i>
                  Móvil: {rolMovilNombre}
                </span>
                {userDetails?.nombre_sucursal && (
                  <span className="text-xs text-white/70 flex items-center gap-1">
                    <i className="fas fa-map-marker-alt"></i>
                    {userDetails.nombre_sucursal}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-1 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 py-3 transition-colors"
          >
            <i className="fas fa-arrow-left"></i>
            Volver
          </button>
          {hasPermission('administracion.gestion_usuarios') && (
            <button
              onClick={() => navigate('/usuarios')}
              className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 py-3 transition-colors"
            >
              <i className="fas fa-users"></i>
              Gestionar Usuarios
            </button>
          )}
        </div>

        {/* Detalles del usuario */}
        <div className="p-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <i className="fas fa-info-circle text-blue-500"></i>
            Datos de la Cuenta
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detalles.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200/60 hover:border-slate-300 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <i className={`${d.icon} text-sm`}></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d.label}</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{String(d.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-bolt text-amber-500"></i>
            Acciones Rápidas
          </h2>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/inicio')}
            className="flex flex-col items-center gap-2 px-4 py-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <i className="fas fa-home text-lg text-slate-500"></i>
            <span className="text-[11px] font-bold text-slate-600">Inicio</span>
          </button>
          {hasPermission('guias.listado_guias') && (
            <button
              onClick={() => navigate('/guias')}
              className="flex flex-col items-center gap-2 px-4 py-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <i className="fas fa-box text-lg text-slate-500"></i>
              <span className="text-[11px] font-bold text-slate-600">Guías</span>
            </button>
          )}
          {hasPermission('boletos.listado_boletos') && (
            <button
              onClick={() => navigate('/boleteria')}
              className="flex flex-col items-center gap-2 px-4 py-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <i className="fas fa-ticket-alt text-lg text-slate-500"></i>
              <span className="text-[11px] font-bold text-slate-600">Boletos</span>
            </button>
          )}
          {hasPermission('administracion.configuracion_sistema') && (
            <button
              onClick={() => navigate('/configuracion')}
              className="flex flex-col items-center gap-2 px-4 py-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <i className="fas fa-cog text-lg text-slate-500"></i>
              <span className="text-[11px] font-bold text-slate-600">Configuración</span>
            </button>
          )}
          <button
            onClick={logout}
            className="flex flex-col items-center gap-2 px-4 py-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all"
          >
            <i className="fas fa-sign-out-alt text-lg text-slate-500"></i>
            <span className="text-[11px] font-bold text-red-600">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
