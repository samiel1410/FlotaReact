import { useEffect, useRef } from 'react';

const BASE_URL = window.location.origin;

export const ListadoPasajerosModal = ({ isOpen, onClose, viajeId }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (isOpen && iframeRef.current) {
      iframeRef.current.src = `${BASE_URL}/php/imprimirPasajeros.php?inline=1&id_viaje=${viajeId}`;
    }
  }, [isOpen, viajeId]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1050,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 8, width: 700, height: 600,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid #e0e0e0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#0a365d', color: 'white', borderRadius: '8px 8px 0 0'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: 15 }}>
            <i className="fas fa-list" style={{ marginRight: 8 }}></i>
            LISTADO PASAJEROS — Viaje #{viajeId}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}
          >
            &times;
          </button>
        </div>
        <iframe
          ref={iframeRef}
          title="Listado Pasajeros"
          style={{ flex: 1, border: 'none', width: '100%' }}
        />
      </div>
    </div>
  );
};