import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthService } from '../../services/auth.service';

/**
 * Página de suplantación (Login As).
 * Recibe una key vía query param, lee los datos de autenticación desde localStorage
 * (compartido entre tabs del mismo origen), setea sessionStorage como un login normal,
 * y redirige al dashboard principal.
 * 
 * Ruta: /#/login-as?key=login_as_1234567890
 */
export const LoginAsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const key = searchParams.get('key');

    if (!key) {
      setStatus('error');
      setErrorMsg('No se recibió la llave de acceso');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    let dataStr;
    try {
      dataStr = localStorage.getItem(key);
    } catch (e) {
      // localStorage puede no estar disponible en algunos entornos
    }

    if (!dataStr) {
      setStatus('error');
      setErrorMsg('La llave de acceso ha expirado o es inválida. Intente nuevamente desde el panel de usuarios.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    try {
      const data = JSON.parse(dataStr);
      // Limpiar inmediatamente la llave temporal de localStorage
      localStorage.removeItem(key);

      // ─── Establecer sesión exactamente como en login normal ──────────
      sessionStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('refresh_token', data.refresh_token);
      sessionStorage.setItem('backend_url', data.backend_url);
      sessionStorage.setItem('user_data', JSON.stringify(data.user));

      // ─── Bridge PHP (sesión legacy) ─────────────────────────────────
      AuthService.phpSessionBridge({
        token: data.token,
        user: { id_usuario: data.user?.id_usuario },
        db_name: data.db_name,
        db_host: data.db_host,
        db_user: data.db_user,
        db_pass: data.db_pass
      }).finally(() => {
        // Redirigir al dashboard principal
        setStatus('success');
        setTimeout(() => {
          window.location.href = '/#/';
        }, 500);
      });

    } catch (e) {
      console.error('Error al procesar suplantación:', e);
      setStatus('error');
      setErrorMsg('Error al procesar la autenticación del usuario.');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 z-50">
      <div className="text-center max-w-md px-8">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-blue-400/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-key text-blue-400 text-xl"></i>
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Iniciando sesión...</h2>
            <p className="text-slate-400 text-sm">Preparando el entorno del usuario</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <i className="fas fa-check text-emerald-400 text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">¡Sesión iniciada!</h2>
            <p className="text-slate-400 text-sm">Redirigiendo al dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-red-400 text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Error</h2>
            <p className="text-slate-400 text-sm">{errorMsg}</p>
          </>
        )}
      </div>
    </div>
  );
};
