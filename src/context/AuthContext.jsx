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

  // Inicializar estado desde sessionStorage
  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    const userDataStr = sessionStorage.getItem('user_data');

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
      console.error('Error parsing user data from session storage', e);
      logout();
      setLoading(false);
      return;
    }

    // Re-establecer la sesión PHP (login.php) ANTES de renderizar la app.
    // Al recargar la página (F5) el puente no se ejecuta en el flujo de login,
    // y si la cookie PHPSESSID se perdió, las peticiones PHP no encuentran las
    // variables de sesión y caen a credenciales por defecto. Aquí se garantiza
    // que la sesión PHP exista cuando carguen las peticiones del dashboard.
    const bridgeData = {
      user: userData,
      db_name: sessionStorage.getItem('db_name') || '',
      db_host: sessionStorage.getItem('db_host') || '',
      db_user: sessionStorage.getItem('db_user') || '',
      db_pass: sessionStorage.getItem('db_pass') || '',
    };
    // Tope de 2s para no bloquear la recarga si PHP no responde. phpSessionBridge
    // nunca rechaza (captura errores internamente y devuelve true/false).
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
  }, []);

  const login = async (username, password) => {
    try {
      const loginData = await AuthService.login(username, password);
      
      if (loginData.success) {
        // 1. Guardar tokens y URL de backend
        sessionStorage.setItem('auth_token', loginData.token);
        sessionStorage.setItem('refresh_token', loginData.refresh_token);
        const backendUrlToUse = loginData.backend_url || CONFIG.AUTH_API_URL;
        sessionStorage.setItem('backend_url', backendUrlToUse);
        sessionStorage.setItem('user_data', JSON.stringify(loginData.user));

        // Credenciales de BD guardadas para poder restaurar la sesión PHP al recargar la página
        sessionStorage.setItem('db_name', loginData.db_name || '');
        sessionStorage.setItem('db_host', loginData.db_host || '');
        sessionStorage.setItem('db_user', loginData.db_user || '');
        sessionStorage.setItem('db_pass', loginData.db_pass || '');

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
    // 1. Guardar en sessionStorage exactamente como login normal
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('user_data', JSON.stringify(userData));
    if (bridgeData.refresh_token) {
      sessionStorage.setItem('refresh_token', bridgeData.refresh_token);
    }
    if (bridgeData.backend_url) {
      sessionStorage.setItem('backend_url', bridgeData.backend_url);
    }

    // Credenciales de BD para poder restaurar la sesión PHP al recargar la página
    sessionStorage.setItem('db_name', bridgeData.db_name || '');
    sessionStorage.setItem('db_host', bridgeData.db_host || '');
    sessionStorage.setItem('db_user', bridgeData.db_user || '');
    sessionStorage.setItem('db_pass', bridgeData.db_pass || '');

    // 2. Puente PHP (sesión legacy)
    await AuthService.phpSessionBridge(bridgeData);

    // 3. Actualizar estado React
    setUser(userData);
    setIsAuthenticated(true);

    // 4. Cargar permisos del rol del usuario suplantado
    cargarPermisosRol(userData);
  }, [cargarPermisosRol]);

  const logout = useCallback(() => {
    sessionStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/#/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, loginFromImpersonation, hasRole, hasPermission, userName, userRole }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
