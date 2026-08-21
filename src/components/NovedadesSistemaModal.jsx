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
    if (!user || !user.id_usuario) return;

    const checkAlertaActiva = async () => {
      try {
        const response = await api.get('/alerta/alertaActivaUsuario', {
          params: { id_usuario: user.id_usuario }
        });
        if (response.data?.success && response.data?.data) {
          setAlerta(response.data.data);
          setIsOpen(true);
        }
      } catch (error) {
        console.warn('Error al verificar alertas de sistema:', error.message);
      }
    };

    checkAlertaActiva();
  }, [user]);

  const handleCerrar = async () => {
    if (!alerta || !user) {
      setIsOpen(false);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/alerta/marcarVisto', {
        id_alerta: alerta.id_alerta,
        id_usuario: user.id_usuario,
        no_mostrar_mas: noMostrarMas ? 1 : 0
      });
    } catch (e) {
      console.warn('Error al registrar lectura de alerta:', e);
    } finally {
      setSubmitting(false);
      setIsOpen(false);
    }
  };

  if (!isOpen || !alerta) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Banner de Cabecera */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
              <i className="fas fa-rocket text-indigo-400"></i>
              {alerta.version_sistema || 'Novedad de Sistema'}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {alerta.fecha_creacion ? new Date(alerta.fecha_creacion).toLocaleDateString('es-EC') : ''}
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white leading-snug">
            {alerta.titulo_alerta}
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Novedades y mejoras del sistema
          </p>
        </div>

        {/* Cuerpo con Contenido Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-slate-700 text-sm leading-relaxed">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs font-medium text-slate-600 whitespace-pre-line leading-relaxed">
            {alerta.contenido_alerta}
          </div>
        </div>

        {/* Pie de página con opción "No mostrar nuevamente" */}
        <div className="p-5 bg-slate-50 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noMostrarMas}
              onChange={(e) => setNoMostrarMas(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <span>No mostrar esta actualización nuevamente</span>
          </label>

          <button
            type="button"
            onClick={handleCerrar}
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {submitting ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-check"></i>
            )}
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
