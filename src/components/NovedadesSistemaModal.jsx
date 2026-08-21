import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../config/axios';

export const NovedadesSistemaModal = () => {
  const { user } = useAuth();
  const [alerta, setAlerta] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [noMostrarMas, setNoMostrarMas] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let userData = user;
    if (!userData || (!userData.id_usuario && !userData.id_user && !userData.id)) {
      try {
        userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      } catch (e) {}
    }

    const userId = userData?.id_usuario || userData?.id_user || userData?.id || 0;

    const checkAlertaActiva = async () => {
      try {
        const response = await api.get('/alerta/alertaActivaUsuario', {
          params: { id_usuario: userId }
        });

        if (response.data?.success && response.data?.data) {
          setAlerta(response.data.data);
          setIsOpen(true);
        }
      } catch (error) {
        console.warn('[NovedadesSistemaModal] Error al consultar:', error.message);
      }
    };

    checkAlertaActiva();
  }, [user]);

  const handleCerrar = async () => {
    if (!alerta) {
      setIsOpen(false);
      return;
    }

    const userId = user?.id_usuario || user?.id_user || user?.id || 0;

    setSubmitting(true);
    try {
      await api.post('/alerta/marcarVisto', {
        id_alerta: alerta.id_alerta,
        id_usuario: userId,
        no_mostrar_mas: noMostrarMas ? 1 : 0
      });
    } catch (e) {
      console.warn('Error al registrar lectura:', e);
    } finally {
      setSubmitting(false);
      setIsOpen(false);
    }
  };

  if (!isOpen || !alerta) return null;

  const lineasContenido = (alerta.contenido_alerta || '')
    .split('\n')
    .filter(l => l.trim() !== '');

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      {/* Modal Limpio y Profesional (Estilo Stripe/Linear) */}
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Cabecera Sobria y Elegante */}
        <div className="p-6 sm:p-7 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {alerta.version_sistema || 'Actualización'}
            </span>
            <span className="text-xs text-slate-400 font-normal">
              {alerta.fecha_creacion ? new Date(alerta.fecha_creacion).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            {alerta.titulo_alerta}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Revisa los últimos cambios y mejoras incorporados al sistema.
          </p>
        </div>

        {/* Contenido Limpio en Lista Organizada */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-white">
          {lineasContenido.map((linea, index) => {
            const esBullet = linea.trim().startsWith('•') || linea.trim().startsWith('-');
            const texto = esBullet ? linea.trim().substring(1).trim() : linea;

            return (
              <div key={index} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-2"></span>
                <span className="leading-relaxed text-xs sm:text-sm font-normal text-slate-700">
                  {texto}
                </span>
              </div>
            );
          })}
        </div>

        {/* Pie de Página Sobrio y Funcional */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noMostrarMas}
              onChange={(e) => setNoMostrarMas(e.target.checked)}
              className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-400 cursor-pointer"
            />
            <span>No volver a mostrar esta actualización</span>
          </label>

          <button
            type="button"
            onClick={handleCerrar}
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {submitting ? 'Guardando...' : 'Entendido'}
          </button>
        </div>
      </div>
    </div>
  );
};
