import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../config/axios';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { getSistemaModo } from '../../services/sistema.service';

export const GlobalHeader = () => {
  const { user, hasPermission, logout } = useAuth();
  const navigate = useNavigate();

  // Leer estado de conexión del socket global (creado en ProtectedLayout → useSocket)
  // en lugar de instanciar un segundo socket
  const [isConnected, setIsConnected] = useState(() => !!window.__socket?.connected);

  useEffect(() => {
    const checkSocket = () => setIsConnected(!!window.__socket?.connected);
    // Polling liviano para actualizar el badge de conexión
    const interval = setInterval(checkSocket, 3000);
    checkSocket();
    return () => clearInterval(interval);
  }, []);

  
  // ─── NOTIFICACIONES ─────────────────────────────────────────────────
  const [notificaciones, setNotificaciones] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifDropdownRef = useRef(null);

  // Agregar una notificación (máximo 20, evita duplicados por id_boleto+tipo)
  const addNotificacion = useCallback((notif) => {
    const dedupKey = `${notif.tipo}-${notif.data?.id_boleto || ''}`;
    const id = Date.now() + Math.random();
    setNotificaciones(prev => {
      // Si ya existe una notificación del mismo tipo+id_boleto, reemplazarla (actualizar timestamp)
      if (dedupKey && dedupKey !== '-') {
        const existingIdx = prev.findIndex(n => `${n.tipo}-${n.data?.id_boleto || ''}` === dedupKey);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], ...notif, id, timestamp: new Date(), leida: false };
          return updated;
        }
      }
      const next = [{ ...notif, id, timestamp: new Date(), leida: false }, ...prev];
      return next.slice(0, 20);
    });
  }, []);

  // Marcar todas como leídas
  const marcarLeidas = () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClick = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const [time, setTime] = useState(new Date());
  const [empresa, setEmpresa] = useState({ nombre: '', imagen: null, distintivo: null });
  const [userDetails, setUserDetails] = useState(null);
  const [metodoImpresion, setMetodoImpresion] = useState('manual');
  const [sistemaModo, setSistemaModo] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const stored = sessionStorage.getItem('empresa_data');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setEmpresa(parsed);
      } catch { /* ignorar */ }
    }
    // Cargar datos detallados del usuario (sucursal, ciudad, puntos)
    api.get('/buscarUsuario').then(res => {
      if (res.data?.success && res.data?.data) {
        setUserDetails(res.data.data);
      }
    }).catch(() => {});

    // Cargar método de impresión
    const uid = user?.id_usuario || user?.id_user || user?.id || JSON.parse(sessionStorage.getItem('user_data') || '{}')?.id_usuario;
    if (uid) {
      api.get('/impresoras/miConfig', { params: { id_usuario: uid } }).then(res => {
        if (res.data?.success && res.data?.data) {
          setMetodoImpresion(res.data.data.metodo_impresion || 'manual');
        }
      }).catch(() => {});
    }

    // Cargar datos de la empresa (logo + nombre)
    api.get('/empresa/selectempresa').then(res => {
      if (res.data?.success && res.data?.data?.length > 0) {
        const e = res.data.data[0];
        const data = {
          nombre: e.razon_social_empresa || e.nombre_comercial_empresa || 'SistemaFlota',
          imagen: e.imagen_empresa || null,
          distintivo: e.distintivo_empresa || null
        };
        setEmpresa(data);
        // Cargar config para obtener cobrar_iva_guia
        api.get('/configuracion/configuracionSeleccion').then(cfgRes => {
          if (cfgRes.data?.data?.length > 0) {
            const cfg = cfgRes.data.data[0];
            data.cobrar_iva_guia = cfg.cobrar_iva_guia === 1 || cfg.cobrar_iva_guia === true ? 1 : 0;
          }
          sessionStorage.setItem('empresa_data', JSON.stringify(data));
        }).catch(() => {
          sessionStorage.setItem('empresa_data', JSON.stringify(data));
        });
      }
    }).catch(() => {});

    // Cargar modo del sistema (con cache compartido)
    getSistemaModo().then(modo => {
      setSistemaModo(modo);
    });

    // ─── LISTENER MÉTODO IMPRESIÓN ──────────────────────────────────
    const handleMetodoChanged = (e) => {
      setMetodoImpresion(e.detail);
    };
    window.addEventListener('metodo_impresion_changed', handleMetodoChanged);

    // ─── NOTIFICACIONES VÍA SOCKET ──────────────────────────────────
    const handleReservaPorVencer = (e) => {
      const data = e.detail;
      addNotificacion({
        tipo: 'reserva_por_vencer',
        titulo: '⏰ Reserva próxima a vencer',
        mensaje: data.mensaje || `Reserva #${data.id_boleto} vence en ${data.minutos_restantes} min`,
        acciones: [
          { label: 'Ver reserva', link: '/reservaciones', icon: 'fa-eye' }
        ],
        data
      });
      // Mostrar toast también
      toast(data.mensaje, {
        id: `vencer-${data.id_boleto}-${data.id_reserva}`,
        duration: 10000,
        icon: '⏰',
        style: { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '12px', padding: '12px 16px', fontFamily: 'Outfit, sans-serif', fontSize: '12px', whiteSpace: 'pre-line' },
      });
    };

    const handleReservaConfirmada = (e) => {
      const data = e.detail;
      addNotificacion({
        tipo: 'reserva_confirmada',
        titulo: '✅ Reserva confirmada',
        mensaje: data.mensaje || `Reserva #${data.id_boleto} confirmada por ${data.confirmado_por || 'oficinista'}`,
        data
      });
    };

    window.addEventListener('reserva_por_vencer', handleReservaPorVencer);
    window.addEventListener('reserva_confirmada', handleReservaConfirmada);

    // Escuchar evento de cambio de ciudad de sucursal para refrescar datos
    const handleCiudadChanged = () => {
      api.get('/buscarUsuario').then(res => {
        if (res.data?.success && res.data?.data) {
          setUserDetails(res.data.data);
        }
      }).catch(() => {});
    };
    window.addEventListener('sucursal_ciudad_changed', handleCiudadChanged);

    return () => {
      clearInterval(timer);
      window.removeEventListener('sucursal_ciudad_changed', handleCiudadChanged);
      window.removeEventListener('reserva_por_vencer', handleReservaPorVencer);
      window.removeEventListener('reserva_confirmada', handleReservaConfirmada);
      window.removeEventListener('metodo_impresion_changed', handleMetodoChanged);
    };
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Cerrar Sesión',
      text: '¿Seguro que desea cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) logout();
    });
  };

  const formattedTime = time.toLocaleTimeString('es-EC', { hour12: false });
  const formattedDate = time.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });

  const nombreUsuario = user?.nombre_usuario || 'Usuario';
  const rolName = user?.rol_usuario === 5 ? 'Admin' : (user?.rol_usuario === 1 ? 'Oficina' : 'Rol ' + user?.rol_usuario);
  const sucursalNombre = userDetails?.nombre_sucursal || '';
  const userCiudad = userDetails?.ciudad_sucursal || userDetails?.nombre_canton || 'Ciudad';
  const puntoGuia = userDetails?.punto_emision_usuario || '1';
  const puntoBoleteria = userDetails?.punto_emision_boleteria || '1';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-10 shrink-0">
      
      {/* Izquierda */}
      <div className="flex items-center gap-4">
        {/* Logo + Nombre empresa */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/inicio')}
        >
          {empresa.imagen ? (
            <img
              src={`data:image/png;base64,${empresa.imagen}`}
              alt="logo"
              className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center shrink-0">
              <i className="fas fa-bus text-blue-600"></i>
            </div>
          )}
          <span className="hidden sm:block text-sm font-bold text-slate-800 truncate max-w-[300px]">{empresa.nombre}</span>
        </div>

        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

        {/* Reloj */}
        <div className="flex flex-col">
          <span className="text-lg font-bold text-slate-800 leading-none">{formattedTime}</span>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{formattedDate}</span>
        </div>

        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

        {/* Socket Status */}
        <div 
          className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
            isConnected 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
              : 'bg-rose-50 text-rose-600 border-rose-200'
          }`}
          title={isConnected ? "Socket: Conectado" : "Socket: Desconectado"}
        >
          <span className="relative flex h-2 w-2">
            {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </span>
          {isConnected ? 'Conectado' : 'Desconectado'}
        </div>

        {/* Método de impresión */}
        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
          metodoImpresion === 'directa'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-blue-50 text-blue-700 border-blue-200'
        }`} title={`Método: ${metodoImpresion === 'directa' ? 'Directa (QZ Tray)' : 'Manual (PDF)'}`}>
          <i className={`fas fa-${metodoImpresion === 'directa' ? 'bolt' : 'file-pdf'} text-xs`}></i>
          <span>{metodoImpresion === 'directa' ? 'Directa' : 'Manual'}</span>
        </div>

        {/* Modo Sistema */}
        {sistemaModo === 'prueba' && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-rose-50 text-rose-700 border-rose-300 animate-pulse-slow" title="El sistema está en modo prueba">
            <i className="fas fa-flask text-xs"></i>
            <span>MODO PRUEBA</span>
          </div>
        )}
      </div>

      {/* Derecha: User Info & Actions */}
      <div className="flex items-center gap-6">
        
        {/* User Info Block - Click para ir a Mi Perfil */}
        <button
          onClick={() => navigate('/perfil')}
          className="hidden md:flex flex-col items-end cursor-pointer hover:bg-slate-50 rounded-lg px-3 py-1.5 -mr-3 transition-colors"
          title="Mi Perfil"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{nombreUsuario}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 tracking-wide uppercase">
              {rolName}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
            <span className="flex items-center gap-1"><i className="fas fa-map-marker-alt text-slate-400"></i> {sucursalNombre ? `${sucursalNombre} - ${userCiudad}` : userCiudad}</span>
            <span className="flex items-center gap-1 font-mono bg-slate-100 px-1.5 rounded text-[10px]">B:{puntoBoleteria} G:{puntoGuia}</span>
          </div>
        </button>

        {/* Avatar - Click para ir a Mi Perfil */}
        <button
          onClick={() => navigate('/perfil')}
          className="h-10 w-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-2 ring-slate-100 hover:ring-blue-300 hover:border-blue-200 transition-all cursor-pointer"
          title="Mi Perfil"
        >
          <img 
            src={`https://ui-avatars.com/api/?name=${nombreUsuario}&background=f1f5f9&color=334155&font-size=0.35&bold=true`} 
            alt="Avatar" 
            className="w-full h-full object-cover" 
          />
        </button>

        {/* Notificaciones - Campana */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => { setShowNotifDropdown(!showNotifDropdown); if (!showNotifDropdown) marcarLeidas(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors relative"
            title="Notificaciones"
          >
            <i className="fas fa-bell text-lg"></i>
            {notificaciones.filter(n => !n.leida).length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white animate-pulse">
                {notificaciones.filter(n => !n.leida).length}
              </span>
            )}
          </button>

          {/* Dropdown de Notificaciones */}
          {showNotifDropdown && (
            <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[420px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <i className="fas fa-bell text-amber-500"></i>
                  Notificaciones
                </h3>
                <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {notificaciones.length}
                </span>
              </div>
              <div className="overflow-y-auto max-h-[340px] scrollbar-thin scrollbar-thumb-slate-200">
                {notificaciones.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <i className="fas fa-check-circle text-2xl text-emerald-300 mb-2"></i>
                    <p className="text-[10px] font-bold uppercase tracking-wider">Sin notificaciones</p>
                  </div>
                ) : (
                  notificaciones.map(notif => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${
                        !notif.leida ? 'bg-amber-50/30 border-l-2 border-l-amber-400' : ''
                      }`}
                      onClick={() => {
                        if (notif.acciones?.[0]?.link) {
                          navigate(notif.acciones[0].link);
                          setShowNotifDropdown(false);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          notif.tipo === 'reserva_por_vencer' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          <i className={`fas fa-${notif.tipo === 'reserva_por_vencer' ? 'clock' : 'check-circle'} text-xs`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-800 mb-0.5 uppercase tracking-tight">
                            {notif.titulo}
                          </p>
                          <p className="text-[10px] text-slate-600 leading-tight line-clamp-2">
                            {notif.mensaje}
                          </p>
                          <p className="text-[8px] text-slate-400 mt-1 font-medium">
                            {notif.timestamp?.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!notif.leida && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1"></span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {notificaciones.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/80">
                  <button
                    onClick={() => { marcarLeidas(); setShowNotifDropdown(false); }}
                    className="w-full py-1.5 text-[9px] font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider text-center"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200"></div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasPermission('administracion.configuracion_sistema') && (
            <Link 
              to="/configuracion"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Configuración"
            >
              <i className="fas fa-cog text-lg"></i>
            </Link>
          )}
          <button 
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            onClick={handleLogout}
            title="Cerrar Sesión"
          >
            <i className="fas fa-sign-out-alt text-lg"></i>
          </button>
        </div>

      </div>
    </header>
  );
};
