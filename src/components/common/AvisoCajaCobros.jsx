import { useState } from 'react';
import AperturaCajaCobrosModal from './AperturaCajaCobrosModal';
import { useCajaCobros } from '../../hooks/useCajaCobros';

const formatFechaHora = (f) => {
  if (!f) return '';
  const d = new Date(f);
  if (isNaN(d.getTime())) return String(f);
  return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
};

/**
 * Aviso de estado de la caja de cobros. Se muestra en la parte superior de
 * los módulos donde se cobra para que el cajero no registre dinero fuera de
 * una caja abierta.
 */
export const AvisoCajaCobros = ({ caja, loading, recargar }) => {
  const [showApertura, setShowApertura] = useState(false);
  const abierta = Boolean(caja?.id_caja_retenciones);

  return (
    <>
      <div
        className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
          loading
            ? 'bg-slate-50 border-slate-200 text-slate-600'
            : abierta
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs font-semibold">
          <i
            className={`fas ${
              loading ? 'fa-spinner fa-spin' : abierta ? 'fa-lock-open' : 'fa-triangle-exclamation'
            } text-sm`}
          />
          {loading ? (
            <span>Verificando caja de cobros...</span>
          ) : abierta ? (
            <span>
              Caja de cobros abierta <b>#{caja.id_caja_retenciones}</b>
              {caja.fecha_apertura ? ` — aperturada ${formatFechaHora(caja.fecha_apertura)}` : ''}
            </span>
          ) : (
            <span>
              <b>No tiene una caja de cobros abierta.</b> Abra una caja para poder registrar cobros.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!loading && !abierta && (
            <button
              type="button"
              onClick={() => setShowApertura(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all"
            >
              <i className="fas fa-door-open mr-1.5" /> Aperturar caja
            </button>
          )}
          <button
            type="button"
            onClick={recargar}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all disabled:opacity-50"
            title="Volver a verificar la caja"
          >
            <i className="fas fa-rotate-right" />
          </button>
        </div>
      </div>

      <AperturaCajaCobrosModal
        isOpen={showApertura}
        onClose={() => setShowApertura(false)}
        onSuccess={() => {
          setShowApertura(false);
          recargar();
        }}
      />
    </>
  );
};

/**
 * Variante que resuelve el estado por sí misma (para pantallas que no
 * comparten el hook desde el padre).
 */
export const AvisoCajaCobrosAuto = () => {
  const { caja, loading, recargar } = useCajaCobros();
  return <AvisoCajaCobros caja={caja} loading={loading} recargar={recargar} />;
};

export default AvisoCajaCobros;
