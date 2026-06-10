import { useState, useEffect } from 'react';
import { api } from '../../config/axios';
import { useAuth } from '../../hooks/useAuth';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

export const SistemaPage = () => {
  const { user } = useAuth();
  const [modo, setModo] = useState('prueba');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/sistema/modo').then(res => {
      if (res.data?.success && res.data?.data?.modo) {
        setModo(res.data.data.modo);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const esProduccion = modo === 'produccion';

  const handleChange = async (nuevoModo) => {
    if (nuevoModo === modo) return;
    if (esProduccion) return;

    if (nuevoModo === 'produccion') {
      const result = await Swal.fire({
        title: '¿Cambiar a Producción?',
        html: `
          <div style="text-align: left; font-size: 13px;">
            <p style="margin-bottom: 12px; font-weight: 600; color: #dc2626;">
              ⚠️ Esta acción eliminará TODOS los datos transaccionales:
            </p>
            <ul style="list-style: none; padding: 0; margin: 0 0 12px 0; line-height: 1.8;">
              <li>• Guías, detalle de guías, guías entregadas</li>
              <li>• Boletos, detalle de boletos, reservas</li>
              <li>• Facturas y detalle de facturas</li>
              <li>• Cajas (principal, boletería, retenciones)</li>
              <li>• Comprobantes de cobro</li>
              <li>• Viajes, itinerarios</li>
              <li>• Despachos</li>
              <li>• Cobros, seguimientos</li>
              <li>• Inventario y movimientos</li>
            </ul>
            <p style="color: #991b1b; font-weight: 600;">Los datos maestros (usuarios, buses, rutas, clientes, etc.) NO se eliminarán.</p>
            <p style="margin-top: 12px; color: #64748b;">Esta operación no se puede deshacer.</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, cambiar a Producción',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626',
        reverseButtons: true,
      });
      if (!result.isConfirmed) return;

      const confirm2 = await Swal.fire({
        title: '¿Estás completamente seguro?',
        text: 'Escribe "PRODUCCION" para confirmar',
        input: 'text',
        inputPlaceholder: 'Escribe PRODUCCION',
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626',
        preConfirm: (value) => {
          if (value !== 'PRODUCCION') {
            Swal.showValidationMessage('Debes escribir PRODUCCION para confirmar');
          }
        }
      });
      if (!confirm2.isConfirmed) return;
    }

    setSaving(true);
    try {
      const res = await api.post('/sistema/modo', { modo: nuevoModo });
      if (res.data?.success) {
        setModo(nuevoModo);
        toast.success(res.data.message || 'Modo actualizado correctamente');
      } else {
        toast.error(res.data?.message || 'Error al cambiar el modo');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error de conexión con el servidor');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <i className="fas fa-toggle-on text-blue-600 text-lg"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Estado del Sistema</h1>
              <p className="text-xs text-slate-500">Control de modo de operación del sistema</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Modo de operación actual
            </label>

            <div className="flex items-center gap-4">
              <select
                value={modo}
                onChange={(e) => handleChange(e.target.value)}
                disabled={saving || esProduccion || user?.rol_usuario !== 5}
                className="w-full max-w-xs px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="prueba">🔧 Modo Prueba</option>
                <option value="produccion">🚀 Producción</option>
              </select>

              {saving && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  Guardando...
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                modo === 'prueba'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  modo === 'prueba' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}></span>
                {modo === 'prueba' ? 'Modo Prueba — Los datos son de prueba' : 'Producción — Datos en producción'}
              </span>
            </div>
          </div>

          {modo === 'prueba' && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <i className="fas fa-info-circle text-amber-600 mt-0.5"></i>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Modo Prueba activo</p>
                  <p className="text-xs text-amber-700 mt-1">
                    El sistema está en modo de pruebas. Cuando cambies a <strong>Producción</strong>, 
                    todos los datos transaccionales (guías, boletos, facturas, viajes, cajas, etc.) 
                    serán eliminados permanentemente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {modo === 'produccion' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <i className="fas fa-lock text-red-600 mt-0.5"></i>
                <div>
                  <p className="text-sm font-semibold text-red-800">Producción activa — Cambio irreversible</p>
                  <p className="text-xs text-red-700 mt-1">
                    El sistema está en <strong>Producción</strong>. Esta operación es <strong>irreversible</strong>, 
                    no se puede regresar a Modo Prueba. Todos los datos transaccionales fueron eliminados 
                    al momento del cambio.
                  </p>
                </div>
              </div>
            </div>
          )}

          {user?.rol_usuario !== 5 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <i className="fas fa-shield-alt text-red-600 mt-0.5"></i>
                <div>
                  <p className="text-sm font-semibold text-red-800">Acceso restringido</p>
                  <p className="text-xs text-red-700 mt-1">
                    Solo los administradores pueden cambiar el modo del sistema.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
