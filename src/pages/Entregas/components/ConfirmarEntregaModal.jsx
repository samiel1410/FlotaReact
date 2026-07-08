import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CameraCapture } from './CameraCapture';
import { CONFIG } from '../../../config/env';
import { EntregaService } from '../../../services/entrega.service';
import { GuiaService } from '../../../services/guia.service';

/**
 * Modal para confirmar entrega simple (cuando total_factura <= 0)
 * Permite capturar cédula de quien recibe y foto opcional (archivo o cámara)
 * Recrea la funcionalidad de ExtJS en EntregadoController.onentregarGuia
 */
export const ConfirmarEntregaModal = ({ guia, destinoGuia, isNotaVenta = false, onClose, onSuccess }) => {
  const [cedula, setCedula] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');
  const [fotoPreview, setFotoPreview] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const [esLaPersona, setEsLaPersona] = useState(false);
  const [clienteFotoUrl, setClienteFotoUrl] = useState(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  // Precargar la cédula si viene en la guía
  useEffect(() => {
    if (guia.cedula_cliente_receptor && !cedula) {
      setCedula(guia.cedula_cliente_receptor);
    }
  }, [guia]);

  // Buscar cliente cuando cambia la cédula
  useEffect(() => {
    const buscarCliente = async (ident) => {
      setBuscandoCliente(true);
      try {
        const res = await GuiaService.buscarClientePorIdentificacion(ident);
        if (res?.success && res.data && res.data.length > 0) {
          const cliente = res.data[0];
          if (cliente.foto_cliente) {
            setClienteFotoUrl(`${CONFIG.API_URL || 'http://localhost:3002'}/cliente/fotos/${cliente.foto_cliente}`);
          } else {
            setClienteFotoUrl(null);
          }
        } else {
          setClienteFotoUrl(null);
        }
      } catch (e) {
        setClienteFotoUrl(null);
      }
      setBuscandoCliente(false);
    };

    if (cedula && (cedula.length === 10 || cedula.length === 13)) {
      buscarCliente(cedula);
    } else {
      setClienteFotoUrl(null);
      setEsLaPersona(false);
    }
  }, [cedula]);

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
      }, isNotaVenta);

      if (!entregaRes?.success) {
        toast.error(entregaRes?.data || 'Error al entregar la guía');
        setSaving(false);
        return;
      }

      toast.success('Guía entregada correctamente');

      // 3. Generar PDF de entrega
      try {
        const pdfRes = await EntregaService.generarPdfEntrega(guia.id_guia, id_usuario, isNotaVenta);
        if (pdfRes?.success && pdfRes?.ruta) {
          const w = window.open(
            `${CONFIG.PHP_URL}/tmp/${pdfRes.ruta}`,
            'PDF_Entrega',
            'width=800,height=600'
          );
          if (!w) {
            const a = document.createElement('a');
            a.href = `${CONFIG.PHP_URL}/tmp/${pdfRes.ruta}`;
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
              <div className="mt-4 border border-slate-200 rounded-lg p-5 bg-slate-50">
                <label className="block text-sm font-semibold text-slate-700 mb-3 text-center">Identidad / Foto de Entrega <span className="text-red-500">*</span></label>

                {buscandoCliente && (
                  <div className="flex items-center justify-center py-4">
                    <i className="fas fa-spinner fa-spin text-blue-500 mr-2"></i>
                    <span className="text-xs text-slate-500">Buscando datos del cliente...</span>
                  </div>
                )}

                {!buscandoCliente && clienteFotoUrl && !fotoPreview && (
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                      Foto registrada en el sistema:
                    </span>
                    <img src={clienteFotoUrl} alt="Cliente" className="h-32 w-32 object-cover rounded-full border-4 border-white shadow-md" />
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                      <button
                        onClick={() => setEsLaPersona(!esLaPersona)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${esLaPersona ? 'bg-green-600 text-white ring-2 ring-green-300 ring-offset-1' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      >
                        <i className={`fas ${esLaPersona ? 'fa-check-circle' : 'fa-check'} mr-1`}></i> {esLaPersona ? 'Sí, es la persona' : 'Confirmar: Sí es la persona'}
                      </button>
                      <button
                        onClick={() => setShowCamera(true)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-bold transition-colors shadow-sm"
                      >
                        <i className="fas fa-camera mr-1"></i> Tomar nueva foto
                      </button>
                    </div>
                  </div>
                )}

                {!buscandoCliente && !clienteFotoUrl && !fotoPreview && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-100 text-center shadow-sm w-full">
                      <i className="fas fa-exclamation-triangle text-lg mb-1 block"></i>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1">Cliente sin foto registrada</p>
                      <p className="text-[11px] font-medium opacity-80">Debe tomar una foto a la persona que recibe para continuar.</p>
                    </div>
                    <button
                      onClick={() => setShowCamera(true)}
                      className="flex items-center justify-center gap-2 px-5 py-3 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all shadow-md transform hover:-translate-y-0.5"
                    >
                      <i className="fas fa-camera text-lg"></i> Tomar Foto Obligatoria
                    </button>
                  </div>
                )}

                {fotoPreview && (
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-xs text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-200 shadow-sm flex items-center gap-1">
                      <i className="fas fa-check-circle"></i> Nueva foto capturada
                    </span>
                    <div className="relative inline-block mt-1">
                      <img src={fotoPreview} alt="Preview" className="h-32 w-32 object-cover rounded-full border-4 border-green-100 shadow-md" />
                      <button
                        onClick={() => { setFotoBase64(''); setFotoPreview(''); }}
                        className="absolute -top-1 -right-1 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors ring-2 ring-white"
                        title="Eliminar foto"
                      >
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
              disabled={saving || !cedula || (!esLaPersona && !fotoBase64)}
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
