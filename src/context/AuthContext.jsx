import { createContext, useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/auth.service';
import { CONFIG } from '../config/env';
import { api } from '../config/axios';

import { useContext } from 'react';

export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

const AUTH_KEYS = [
  'auth_token',
  'refresh_token',
  'backend_url',
  'user_data',
  'user',
  'usuario',
  'db_name',
  'db_host',
  'db_user',
  'db_pass',
  'php_url',
  'empresa_data',
  'id_caja_global',
  'sistema_modo'
];

const redirectToLogin = () => {
  const basePath = window.location.pathname;
  window.location.replace(`${basePath}#/login`);
};

const syncStorageFromLocal = () => {
  AUTH_KEYS.forEach(key => {
    const sessionVal = sessionStorage.getItem(key);
    const localVal = localStorage.getItem(key);
    if (!sessionVal && localVal) {
      sessionStorage.setItem(key, localVal);
    }
  });
};

const persistAuthData = (data) => {
  AUTH_KEYS.forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      const val = typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]);
      sessionStorage.setItem(key, val);
      localStorage.setItem(key, val);
    }
  });
  if (data.user_data) {
    const userVal = typeof data.user_data === 'object' ? JSON.stringify(data.user_data) : String(data.user_data);
    localStorage.setItem('user', userVal);
    sessionStorage.setItem('user', userVal);
    localStorage.setItem('usuario', userVal);
    sessionStorage.setItem('usuario', userVal);
  }
};

const clearAuthData = () => {
  sessionStorage.clear();
  AUTH_KEYS.forEach(key => localStorage.removeItem(key));
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('login_as_'))
      .forEach(k => localStorage.removeItem(k));
  } catch (e) {}
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permisos, setPermisos] = useState(null);

  // Cargar permisos del rol desde el backend
  const cargarPermisosRol = useCallback(async (userData) => {
    // Probar varias fuentes posibles para el id del rol
    const idRol = userData?.id_fkrol_usuario || userData?.id_rol || userData?.rol;
    if (idRol) {
      try {
        const res = await api.post('/roles/selectRolesAcciones', { id_rol: idRol });
        if (res.data?.success && res.data?.data?.length > 0 && res.data.data[0]?.descripcion_rol) {
          const parsed = JSON.parse(res.data.data[0].descripcion_rol);
          setPermisos(parsed);
          return;
        }
      } catch (err) {
        console.warn('No se pudieron cargar los permisos del rol:', err);
      }
    }
    // Fallback: si no se cargaron permisos pero el usuario es admin numérico (rol 5), activar todo
    if (userData?.rol_usuario === 5 || userData?.rol === 5) {
      setPermisos(null); // null hará que hasPermission devuelva true para admin
    }
  }, []);

  // Inicializar estado desde sessionStorage / localStorage (para soportar nuevas pestañas)
  useEffect(() => {
    syncStorageFromLocal();

    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    const userDataStr = sessionStorage.getItem('user_data') || localStorage.getItem('user_data');

    if (!token || !userDataStr) {
      setLoading(false);
      return;
    }

    let userData;
    try {
      userData = JSON.parse(userDataStr);
      setUser(userData);
      setIsAuthenticated(true);
      cargarPermisosRol(userData);
    } catch (e) {
      console.error('Error parsing user data from storage', e);
      clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    // Re-establecer la sesión PHP (login.php) ANTES de renderizar la app.
    const bridgeData = {
      user: userData,
      db_name: sessionStorage.getItem('db_name') || localStorage.getItem('db_name') || '',
      db_host: sessionStorage.getItem('db_host') || localStorage.getItem('db_host') || '',
      db_user: sessionStorage.getItem('db_user') || localStorage.getItem('db_user') || '',
      db_pass: sessionStorage.getItem('db_pass') || localStorage.getItem('db_pass') || '',
    };

    Promise.race([
      AuthService.phpSessionBridge(bridgeData),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ])
      .then((ok) => {
        if (ok === false) {
          console.warn('⚠️ No se pudo restablecer la sesión PHP al recargar: las peticiones PHP usarán credenciales por defecto.');
        }
      })
      .finally(() => setLoading(false));
  }, [cargarPermisosRol]);

  // Sincronizar logout y cambios de sesión entre pestañas en tiempo real
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'auth_token') {
        if (!e.newValue) {
          sessionStorage.clear();
          setUser(null);
          setIsAuthenticated(false);
          setPermisos(null);
          if (window.__socket) {
            try {
              window.__socket.disconnect();
              window.__socket = null;
            } catch (err) {}
          }
          redirectToLogin();
        } else {
          syncStorageFromLocal();
          const userStr = localStorage.getItem('user_data');
          if (userStr) {
            try {
              const u = JSON.parse(userStr);
              setUser(u);
              setIsAuthenticated(true);
              cargarPermisosRol(u);
            } catch (err) {}
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [cargarPermisosRol]);

  const login = async (username, password) => {
    try {
      const loginData = await AuthService.login(username, password);
      
      if (loginData.success) {
        // 1. Guardar tokens y URL de backend en session y local storage
        const backendUrlToUse = loginData.backend_url || CONFIG.AUTH_API_URL;
        persistAuthData({
          auth_token: loginData.token,
          refresh_token: loginData.refresh_token,
          backend_url: backendUrlToUse,
          user_data: loginData.user,
          db_name: loginData.db_name || '',
          db_host: loginData.db_host || '',
          db_user: loginData.db_user || '',
          db_pass: loginData.db_pass || ''
        });

        // 2. Puente PHP
        await AuthService.phpSessionBridge(loginData);

        // 3. Actualizar estado y cargar permisos del rol
        setUser(loginData.user);
        setIsAuthenticated(true);
        cargarPermisosRol(loginData.user);
        
        return { success: true };
      } else {
        return { success: false, message: loginData.mensaje || 'Credenciales inválidas' };
      }
    } catch (error) {
      console.error('Login error', error);
      let message = 'Hubo un error en el servidor. Por favor, contacte con soporte.';
      if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        message = 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
      }
      return { success: false, message };
    }
  };

  // Verificar si el usuario tiene un rol específico
  const hasRole = useCallback((roleName) => {
    if (!user) return false;
    // El usuario puede tener roles como array de strings o como array de objetos {nombre, ...}
    const userRoles = user.roles || user.role || [];
    if (Array.isArray(userRoles)) {
      return userRoles.some(r => {
        if (typeof r === 'string') return r.toLowerCase() === roleName.toLowerCase();
        if (r && r.nombre) return r.nombre.toLowerCase() === roleName.toLowerCase();
        return false;
      });
    }
    return typeof userRoles === 'string' && userRoles.toLowerCase() === roleName.toLowerCase();
  }, [user]);

  // Verificar si el usuario tiene permiso por módulo
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    // Admin por rol numérico (5) o por nombre tiene todos los permisos
    if (hasRole('admin') || hasRole('administrador') || user.rol_usuario === 5) return true;
    // Si permisos es null significa admin fallback
    if (permisos === null) return true;
    
    // Prioridad: permisos cargados del backend > user.permisos del auth service
    const sourcePermisos = permisos || user.permisos || user.permissions || user.descripcion_rol || {};
    
    // Si es un string JSON (viene de /buscarUsuario), parsearlo
    const parsedPermisos = typeof sourcePermisos === 'string' ? (() => {
      try { return JSON.parse(sourcePermisos); } catch { return {}; }
    })() : sourcePermisos;
    
    // Soporte para notación "modulo.permiso" (ej. "administracion.gestion_usuarios")
    if (permission && typeof permission === 'string' && permission.includes('.')) {
      const [mod, perm] = permission.split('.');
      return parsedPermisos[mod]?.[perm] === true;
    }
    
    // Soporte legacy: array de strings u objetos
    if (Array.isArray(parsedPermisos)) {
      return parsedPermisos.some(p => {
        if (typeof p === 'string') return p === permission;
        if (p && p.modulo) return p.modulo === permission;
        return false;
      });
    }
    
    return false;
  }, [user, hasRole, permisos]);

  // Nombre del usuario para mostrar
  const userName = user?.nombre || user?.username || user?.usuario || '';
  const userRole = user?.rol || user?.role || user?.roles || '';

  // Suplantación: Login como otro usuario desde el panel de administración
  const loginFromImpersonation = useCallback(async (token, userData, bridgeData) => {
    // 1. Guardar en session y local storage exactamente como login normal
    persistAuthData({
      auth_token: token,
      user_data: userData,
      refresh_token: bridgeData.refresh_token,
      backend_url: bridgeData.backend_url,
      db_name: bridgeData.db_name || '',
      db_host: bridgeData.db_host || '',
      db_user: bridgeData.db_user || '',
      db_pass: bridgeData.db_pass || ''
    });

    // 2. Puente PHP (sesión legacy)
    await AuthService.phpSessionBridge(bridgeData);

    // 3. Actualizar estado React
    setUser(userData);
    setIsAuthenticated(true);

    // 4. Cargar permisos del rol del usuario suplantado
    cargarPermisosRol(userData);
  }, [cargarPermisosRol]);

  const logout = useCallback(async () => {
    if (window.__socket) {
      try {
        window.__socket.disconnect();
        window.__socket = null;
      } catch (e) {}
    }

    try {
      await AuthService.phpLogout();
    } catch (e) {
      console.warn('Error al cerrar sesión PHP:', e);
    }

    clearAuthData();
    setUser(null);
    setIsAuthenticated(false);
    setPermisos(null);
    redirectToLogin();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, loginFromImpersonation, hasRole, hasPermission, userName, userRole }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
