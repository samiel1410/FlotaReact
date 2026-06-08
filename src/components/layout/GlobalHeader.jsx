import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { api } from '../../config/axios';
import Swal from 'sweetalert2';

export const GlobalHeader = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  
  const [time, setTime] = useState(new Date());
  const [empresa, setEmpresa] = useState({ nombre: '', imagen: null, distintivo: null });
  const [userDetails, setUserDetails] = useState(null);
  const [metodoImpresion, setMetodoImpresion] = useState('manual');

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
        sessionStorage.setItem('empresa_data', JSON.stringify(data));
      }
    }).catch(() => {});

    return () => clearInterval(timer);
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
  const ciudad = userDetails?.nombre_canton || 'Ciudad';
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
      </div>

      {/* Derecha: User Info & Actions */}
      <div className="flex items-center gap-6">
        
        {/* User Info Block */}
        <div className="hidden md:flex flex-col items-end">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{nombreUsuario}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 tracking-wide uppercase">
              {rolName}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
            <span className="flex items-center gap-1"><i className="fas fa-map-marker-alt text-slate-400"></i> {ciudad}</span>
            <span className="flex items-center gap-1 font-mono bg-slate-100 px-1.5 rounded text-[10px]">B:{puntoBoleteria} G:{puntoGuia}</span>
          </div>
        </div>

        {/* Avatar */}
        <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-2 ring-slate-100">
          <img 
            src={`https://ui-avatars.com/api/?name=${nombreUsuario}&background=f1f5f9&color=334155&font-size=0.35&bold=true`} 
            alt="Avatar" 
            className="w-full h-full object-cover" 
          />
        </div>

        <div className="h-8 w-px bg-slate-200"></div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link 
            to="/configuracion"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Configuración"
          >
            <i className="fas fa-cog text-lg"></i>
          </Link>
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
