import { useState } from 'react';
import toast from 'react-hot-toast';
import { CameraCapture } from './CameraCapture';
import { EntregaService } from '../../../services/entrega.service';

/**
 * Modal para confirmar entrega simple (cuando total_factura <= 0)
 * Permite capturar cédula de quien recibe y foto opcional (archivo o cámara)
 * Recrea la funcionalidad de ExtJS en EntregadoController.onentregarGuia
 */
export const ConfirmarEntregaModal = ({ guia, destinoGuia, onClose, onSuccess }) => {
  const [cedula, setCedula] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');
  const [fotoPreview, setFotoPreview] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setFotoBase64(evt.target.result);
        setFotoPreview(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (dataUrl) => {
    setFotoBase64(dataUrl);
    setFotoPreview(dataUrl);
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // 1. Obtener usuario actual
      const userRes = await EntregaService.buscarUsuario();
      if (!userRes?.success) {
        toast.error('No se pudo obtener información del usuario');
        setSaving(false);
        return;
      }
      const { id_usuario, nombre_oficina } = userRes.data;

      // 2. Entregar guía con foto
      const entregaRes = await EntregaService.entregarGuiaConFoto({
        id_guia: guia.id_guia,
        nombre_oficina: nombre_oficina || '',
        destino_guia: destinoGuia || guia.destino_guia || '',
        cedula_recibe: cedula,
        foto_base64: fotoBase64
      });

      if (!entregaRes?.success) {
        toast.error(entregaRes?.data || 'Error al entregar la guía');
        setSaving(false);
        return;
      }

      toast.success('Guía entregada correctamente');

      // 3. Generar PDF de entrega
      try {
        const pdfRes = await EntregaService.generarPdfEntrega(guia.id_guia, id_usuario);
        if (pdfRes?.success && pdfRes?.ruta) {
          const w = window.open(
            `${window.location.origin}/php/tmp/${pdfRes.ruta}`,
            'PDF_Entrega',
            'width=800,height=600'
          );
          if (!w) {
            const a = document.createElement('a');
            a.href = `${window.location.origin}/php/tmp/${pdfRes.ruta}`;
            a.target = '_blank';
            a.click();
          }
        }
      } catch (pdfErr) {
        console.warn('Error generando PDF:', pdfErr);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error al entregar:', err);
      toast.error('Ocurrió un error al procesar la entrega');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
            <h2 className="text-white text-lg font-bold flex items-center gap-2">
              <i className="fas fa-truck text-green-400"></i> Confirmar Entrega de Guía
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col gap-5">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <i className="fas fa-info-circle mr-1"></i>
                Guía <strong>{guia.numero_guia_final || guia.gui_numero || ''}</strong>
                {destinoGuia ? ` — Destino: ${destinoGuia}` : ''}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Cédula de quien recibe <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Ingrese cédula o RUC"
                maxLength={13}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Foto (opcional)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-slate-300 rounded-lg hover:border-blue-400 transition-colors bg-slate-50 hover:bg-blue-50">
                    <i className="fas fa-folder-open text-blue-500"></i>
                    <span className="text-sm text-slate-600">Seleccionar archivo</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>

                <button
                  onClick={() => setShowCamera(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium transition-colors"
                >
                  <i className="fas fa-camera"></i>
                  Tomar Foto
                </button>
              </div>

              {fotoPreview && (
                <div className="mt-3 relative inline-block">
                  <img src={fotoPreview} alt="Preview" className="h-24 rounded-lg border border-slate-200 shadow-sm" />
                  <button
                    onClick={() => { setFotoBase64(''); setFotoPreview(''); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 pb-6 border-t border-slate-100 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-60"
              disabled={saving || (!cedula && !fotoBase64)}
            >
              {saving ? (
                <><i className="fas fa-spinner fa-spin"></i> Procesando...</>
              ) : (
                <><i className="fas fa-check"></i> Confirmar Entrega</>
              )}
            </button>
          </div>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
};
