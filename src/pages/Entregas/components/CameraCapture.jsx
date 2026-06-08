import { useState, useRef, useEffect } from 'react';

/**
 * Modal de captura de foto desde cámara web
 * Recrea la funcionalidad de ExtJS en EntregadoController y CobrarGuiaEntregado
 */
export const CameraCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Su navegador no soporta acceso a cámara');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage && onCapture) {
      onCapture(capturedImage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold flex items-center gap-2">
            <i className="fas fa-camera text-blue-400"></i> Capturar Foto
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-4 flex flex-col items-center">
          {error ? (
            <div className="text-center py-6">
              <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-3"></i>
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          ) : capturedImage ? (
            <div className="flex flex-col items-center">
              <img src={capturedImage} alt="Captura" className="rounded-lg border-2 border-green-400 max-w-full" />
              <p className="text-green-600 text-sm font-medium mt-2">✓ Foto capturada</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="rounded-lg bg-black max-w-full"
                style={{ width: '320px', height: '240px' }}
              />
              <p className="text-slate-500 text-xs mt-2">Posicione el documento frente a la cámara</p>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center justify-center gap-3 px-4 pb-4">
          {capturedImage ? (
            <>
              <button
                onClick={handleRetake}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <i className="fas fa-redo"></i> Repetir
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-md"
              >
                <i className="fas fa-check"></i> Usar Foto
              </button>
            </>
          ) : (
            <button
              onClick={handleCapture}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-md"
              disabled={!!error}
            >
              <i className="fas fa-camera"></i> Capturar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
