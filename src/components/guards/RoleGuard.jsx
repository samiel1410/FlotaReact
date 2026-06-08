import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

/**
 * Componente para proteger rutas según el rol del usuario.
 * @param {Array<number>} allowedRoles - Array de roles permitidos (ej. [1, 5])
 * @param {React.Component} children - Componente a renderizar si tiene permiso
 */
export const RoleGuard = ({ allowedRoles, children }) => {
  const { user } = useAuth();

  // Si no hay roles permitidos definidos, se permite a todos los autenticados (manejado por ProtectedRoute)
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  if (user && allowedRoles.includes(user.rol_usuario)) {
    return children;
  }

  // Si no tiene permisos, mostrar advertencia y no renderizar (o redirigir)
  toast.error('No tiene permisos para acceder a este módulo.', { id: 'role-guard-toast' });
  return <Navigate to="/inicio" replace />;
};
