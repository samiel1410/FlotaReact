import { useState, useRef } from 'react';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

const inputClass = "w-full pl-3 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-100 focus:border-green-400 outline-none transition-all";
const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2";

export const WhatsAppTestForm = () => {
  const [numero, setNumero] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [alimentacion, setAlimentacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [historial, setHistorial] = useState([]);
  const formRef = useRef(null);

  const handleEnviar = async (e) => {
    e.preventDefault();

    if (!numero.trim()) {
      toast.error('Ingrese un número de teléfono');
      return;
    }
    if (!mensaje.trim()) {
      toast.error('Ingrese un mensaje');
      return;
    }

    // Limpiar número (solo dígitos)
    const numeroLimpio = numero.replace(/\D/g, '');
    if (numeroLimpio.length < 10) {
      toast.error('El número debe tener al menos 10 dígitos');
      return;
    }

    setEnviando(true);
    const toastId = toast.loading('Enviando mensaje WhatsApp...');

    try {
      const payload = {
        number: numeroLimpio,
        message: mensaje.trim(),
      };
      if (fileUrl.trim()) {
        payload.fileUrl = fileUrl.trim();
      }
      if (alimentacion.trim()) {
        payload.alimentacion = alimentacion.trim();
      }

      const res = await api.post('/whatsapp/enviar', payload);

      if (res.data?.success) {
        toast.success('✅ Mensaje enviado correctamente', { id: toastId });

        // Agregar al historial local
        const nuevoEnvio = {
          id: Date.now(),
          numero: numeroLimpio,
          mensaje: mensaje.trim(),
          fileUrl: fileUrl.trim() || null,
          alimentacion: alimentacion.trim() || null,
          fecha: new Date().toLocaleString(),
          respuesta: res.data,
        };
        setHistorial(prev => [nuevoEnvio, ...prev].slice(0, 10));
      } else {
        toast.error(res.data?.message || 'Error al enviar mensaje', { id: toastId });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error de conexión';
      toast.error(`❌ ${msg}`, { id: toastId });
    } finally {
      setEnviando(false);
    }
  };

  const limpiarFormulario = () => {
    setNumero('');
    setMensaje('');
    setFileUrl('');
    setAlimentacion('');
  };

  return (
    <div ref={formRef} className="space-y-6">
      <div className="space-y-4">
        {/* Número */}
        <div>
          <label className={labelClass}>
            <i className="fas fa-phone-alt mr-1.5 text-green-600"></i>
            Número de Teléfono
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              +593
            </span>
            <input
              type="tel"
              value={numero}
              onChange={e => setNumero(e.target.value.replace(/\D/g, ''))}
              placeholder="999999999"
              maxLength={10}
              className="w-full pl-14 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-100 focus:border-green-400 outline-none transition-all font-mono"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1 ml-1">
            Ingrese el número sin el código de país (ej: 0999999999)
          </p>
        </div>

        {/* Mensaje */}
        <div>
          <label className={labelClass}>
            <i className="fas fa-comment-dots mr-1.5 text-green-600"></i>
            Mensaje
          </label>
          <textarea
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            placeholder="Escriba el mensaje que desea enviar..."
            rows={4}
            className={inputClass + ' resize-none'}
            maxLength={1000}
          />
          <div className="flex justify-between mt-1">
            <p className="text-[10px] text-slate-400 ml-1">
              Máximo 1000 caracteres
            </p>
            <span className={`text-[10px] font-mono ${mensaje.length > 900 ? 'text-amber-600' : 'text-slate-400'}`}>
              {mensaje.length}/1000
            </span>
          </div>
        </div>

        {/* URL del archivo (opcional) */}
        <div>
          <label className={labelClass}>
            <i className="fas fa-paperclip mr-1.5 text-green-600"></i>
            URL del Archivo (opcional — PDF, imagen, etc.)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={fileUrl}
              onChange={e => setFileUrl(e.target.value)}
              placeholder="https://ejemplo.com/documento.pdf"
              className={inputClass}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1 ml-1">
            Puede adjuntar un PDF, imagen u otro archivo accesible mediante URL
          </p>
        </div>

        {/* Alimentación (opcional) */}
        <div>
          <label className={labelClass}>
            <i className="fas fa-utensils mr-1.5 text-green-600"></i>
            Alimentación (opcional)
          </label>
          <input
            type="text"
            value={alimentacion}
            onChange={e => setAlimentacion(e.target.value)}
            placeholder="Ej: Incluye refrigerio"
            className={inputClass}
          />
          <p className="text-[10px] text-slate-400 mt-1 ml-1">
            Información sobre alimentación incluida en el viaje
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleEnviar}
            disabled={enviando}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold rounded-xl shadow-md shadow-green-200 hover:shadow-lg transition-all flex items-center gap-2 text-sm"
          >
            {enviando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Enviando...
              </>
            ) : (
              <>
                <i className="fab fa-whatsapp text-lg"></i>
                Enviar Mensaje de Prueba
              </>
            )}
          </button>
          <button
            type="button"
            onClick={limpiarFormulario}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition-all flex items-center gap-2 text-sm"
          >
            <i className="fas fa-eraser"></i>
            Limpiar
          </button>
        </div>
      </div>

      {/* Historial de envíos */}
      {historial.length > 0 && (
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            <i className="fas fa-history mr-1.5"></i>
            Historial de Envíos
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {historial.map(envio => (
              <div key={envio.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-green-700">
                    <i className="fab fa-whatsapp mr-1"></i>
                    +593 {envio.numero}
                  </span>
                  <span className="text-slate-400">{envio.fecha}</span>
                </div>
                <p className="text-slate-600 line-clamp-2">{envio.mensaje}</p>
                {envio.fileUrl && (
                  <p className="text-blue-500 mt-1 truncate">
                    <i className="fas fa-paperclip mr-1"></i>
                    {envio.fileUrl}
                  </p>
                )}
                {envio.alimentacion && (
                  <p className="text-orange-600 mt-1 truncate">
                    <i className="fas fa-utensils mr-1"></i>
                    {envio.alimentacion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
