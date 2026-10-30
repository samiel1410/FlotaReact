import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CameraCapture } from './CameraCapture';
import { EntregaService, abrirPdfEntrega } from '../../../services/entrega.service';
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
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [nombreRecibe, setNombreRecibe] = useState('');
  const [entregaTercero, setEntregaTercero] = useState(false);

  // Precargar la cédula si viene en la guía
  useEffect(() => {
    if (guia.cedula_cliente_receptor && !cedula) {
      setCedula(guia.cedula_cliente_receptor);
    }
  }, [guia]);

  // Buscar cliente cuando cambia la cédula para mostrar a quién se entrega
  useEffect(() => {
    let cancelado = false;

    const buscarCliente = async (ident) => {
      setBuscandoCliente(true);
      try {
        const res = await GuiaService.buscarClientePorIdentificacion(ident);
        if (cancelado) return;
        const cliente = res?.success && res.data?.length > 0 ? res.data[0] : null;
        setClienteInfo(cliente);
        setNombreRecibe(cliente?.nombre_cliente || '');
      } catch (e) {
        if (!cancelado) {
          setClienteInfo(null);
          setNombreRecibe('');
        }
      }
      if (!cancelado) setBuscandoCliente(false);
    };

    if (cedula && (cedula.length === 10 || cedula.length === 13)) {
      buscarCliente(cedula);
    } else {
      setClienteInfo(null);
      setNombreRecibe('');
    }

    return () => { cancelado = true; };
  }, [cedula]);

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
        nombre_recibe: (nombreRecibe || clienteInfo?.nombre_cliente || '').trim(),
        foto_base64: fotoBase64
      }, isNotaVenta);

      if (!entregaRes?.success) {
        toast.error(entregaRes?.data || 'Error al entregar la guía');
        setSaving(false);
        return;
      }

      toast.success('Guía entregada correctamente');

      // 3. Generar e imprimir el comprobante de entrega
      try {
        const pdfRes = await EntregaService.generarPdfEntrega(guia.id_guia, id_usuario, isNotaVenta);
        if (pdfRes?.success && pdfRes?.url) {
          abrirPdfEntrega(pdfRes.url);
        } else {
          toast.error(pdfRes?.message || 'No se pudo imprimir el comprobante de entrega');
        }
      } catch (pdfErr) {
        console.warn('Error generando PDF:', pdfErr);
        toast.error('No se pudo imprimir el comprobante de entrega');
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

  const cedulaValida = cedula.length === 10 || cedula.length === 13;
  const nombreEditable = entregaTercero || !clienteInfo;
  const nombreObligatorio = entregaTercero;

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
          <div className="p-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
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

              {buscandoCliente && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <i className="fas fa-spinner fa-spin text-blue-500"></i> Buscando datos del cliente...
                </div>
              )}

              {!buscandoCliente && clienteInfo && (
                <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Cliente registrado</p>
                  <p className="text-sm font-semibold text-emerald-900 break-words">
                    <i className="fas fa-user-check mr-1"></i> {clienteInfo.nombre_cliente}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    {clienteInfo.tipo_identificacion_cliente} {clienteInfo.identificacion_cliente}
                  </p>
                </div>
              )}

              {!buscandoCliente && !clienteInfo && cedula.length >= 10 && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Identificación no registrada</p>
                  <p className="text-[11px] text-amber-700">No es un cliente del sistema. Puede entregar igual indicando el nombre de quien recibe.</p>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <label className={`flex items-center gap-2 text-xs font-semibold cursor-pointer select-none rounded-full px-3 py-1 border shadow-sm w-fit transition-colors ${entregaTercero ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                <input
                  type="checkbox"
                  checked={entregaTercero}
                  onChange={(e) => {
                    setEntregaTercero(e.target.checked);
                    if (!e.target.checked) setNombreRecibe(clienteInfo?.nombre_cliente || '');
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Entrega a tercero
              </label>

              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de quien recibe{' '}
                  {nombreObligatorio
                    ? <span className="text-red-500">*</span>
                    : <span className="text-[10px] font-medium text-slate-400">(del cliente)</span>}
                </label>
                <input
                  type="text"
                  value={nombreRecibe}
                  onChange={(e) => setNombreRecibe(e.target.value)}
                  placeholder={nombreEditable ? 'Nombre completo de la persona que recibe' : 'Nombre del cliente'}
                  disabled={!nombreEditable}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {entregaTercero
                    ? 'Se guarda junto a la cédula para dejar constancia de quién recibió.'
                    : (!clienteInfo && cedulaValida)
                      ? 'La identificación no está registrada: escriba el nombre de quien recibe (recomendado).'
                      : 'Si entrega un tercero, marque "Entrega a tercero" y escriba su nombre.'}
                </p>
              </div>
            </div>

            <div>
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Foto de Entrega <span className="text-[10px] font-medium text-slate-400">(opcional)</span>
                </label>

                {!fotoPreview && (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[11px] text-slate-500 text-center">La foto es opcional; puede confirmar solo con la cédula.</p>
                    <button
                      onClick={() => setShowCamera(true)}
                      className="px-4 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors shadow-sm"
                    >
                      <i className="fas fa-camera mr-1"></i> Tomar foto (opcional)
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
              disabled={saving || !cedulaValida || (nombreObligatorio && !nombreRecibe.trim())}
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
