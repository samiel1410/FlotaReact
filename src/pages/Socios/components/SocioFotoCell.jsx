import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { api } from '../../../config/axios';

// Cache global en memoria para evitar descargar la misma foto múltiples veces
const photoCache = new Map();

export const SocioFotoCell = ({ socio }) => {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const thumbRef = useRef(null);

  const id = socio?.id_personal;
  const hasPhoto = !!(socio?.ruta_imagen_personal && socio?.ruta_imagen_personal.trim() !== '');

  const nombres = socio?.per_nombres_persona || socio?.soc_nombres || '';
  const apellidos = socio?.per_apellidos_personal || socio?.soc_apellidos || '';
  const nombreCompleto = `${nombres} ${apellidos}`.trim() || 'Socio';
  const cedula = socio?.per_cedula_personal || socio?.soc_cedula || '';

  const getInitials = () => {
    const n = (nombres[0] || '').toUpperCase();
    const a = (apellidos[0] || '').toUpperCase();
    return n || a ? `${n}${a}` : 'S';
  };

  useEffect(() => {
    let isMounted = true;

    if (!id || !hasPhoto) {
      setPhotoUrl(null);
      return;
    }

    if (photoCache.has(id)) {
      setPhotoUrl(photoCache.get(id));
      return;
    }

    setLoading(true);
    api.get(`/personal/foto/${id}`, { responseType: 'blob' })
      .then((res) => {
        if (!isMounted) return;
        if (res.headers && res.headers['content-type']?.includes('image/svg') && !socio?.ruta_imagen_personal) {
          photoCache.set(id, null);
          setPhotoUrl(null);
          return;
        }
        const blobUrl = URL.createObjectURL(res.data);
        photoCache.set(id, blobUrl);
        setPhotoUrl(blobUrl);
      })
      .catch(() => {
        if (isMounted) {
          photoCache.set(id, null);
          setPhotoUrl(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, hasPhoto]);

  const handleMouseEnter = () => {
    if (thumbRef.current) {
      const rect = thumbRef.current.getBoundingClientRect();
      const popoverWidth = 220;
      const popoverHeight = 240;

      // Calcular posición horizontal (preferir a la derecha, si no cabe, a la izquierda)
      let left = rect.right + 12;
      if (left + popoverWidth > window.innerWidth) {
        left = rect.left - popoverWidth - 12;
      }

      // Calcular posición vertical para que no se salga de la pantalla
      let top = rect.top - 40;
      if (top + popoverHeight > window.innerHeight) {
        top = window.innerHeight - popoverHeight - 16;
      }
      if (top < 10) {
        top = 10;
      }

      setPopoverPos({ top, left });
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Miniatura en la grid */}
      <div
        ref={thumbRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center cursor-pointer shadow-sm hover:ring-2 hover:ring-indigo-500 hover:scale-105 transition-all"
        title={nombreCompleto}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={nombreCompleto}
            className="w-full h-full object-cover"
          />
        ) : loading ? (
          <i className="fas fa-spinner fa-spin text-slate-400 text-xs" />
        ) : (
          <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 w-full h-full flex items-center justify-center">
            {getInitials()}
          </span>
        )}
      </div>

      {/* Popover Grande con Portal (escapa del overflow-auto de la tabla) */}
      {isHovered && photoUrl && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="bg-white rounded-2xl p-2.5 shadow-2xl border border-slate-200 ring-4 ring-black/5 animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center w-52 backdrop-blur-sm"
        >
          <div className="w-48 h-48 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner mb-2 flex items-center justify-center">
            <img
              src={photoUrl}
              alt={nombreCompleto}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center w-full px-1">
            <p className="text-xs font-black text-slate-800 uppercase truncate leading-tight">
              {nombreCompleto}
            </p>
            {cedula && (
              <p className="text-[10px] font-bold text-slate-400 mt-0.5 font-mono">
                CI: {cedula}
              </p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
