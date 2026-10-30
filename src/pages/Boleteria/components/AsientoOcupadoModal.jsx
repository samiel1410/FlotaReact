import Modal from '../../../components/common/Modal';

const money = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

/**
 * Detalle de un asiento ya vendido. Reemplaza el popup de SweetAlert.
 * Muestra la oficina que vendió el boleto y el nombre de la sub-ruta (tramo).
 */
export const AsientoOcupadoModal = ({ isOpen, onClose, ocupado, destinoNombre, onImprimir, onReubicar }) => {
  if (!isOpen || !ocupado) return null;

  const nombreDestino = destinoNombre
    || ocupado.nombre_destino
    || (ocupado.id_destino_boleto ? `Destino #${ocupado.id_destino_boleto}` : '---');

  const oficina = ocupado.nombre_sucursal_venta || '---';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Asiento ${ocupado.asiento_boleto_detalle}`} width="max-w-md">
      <div className="space-y-4">
        {/* Estado */}
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <i className="fas fa-chair"></i>
          </div>
          <div className="text-xs">
            <p className="font-black text-amber-900 uppercase tracking-wide">Asiento ocupado</p>
            <p className="text-amber-700">
              {ocupado.estado_ocupacion === 'ocupado-parcial'
                ? 'Vendido para un tramo de la ruta'
                : 'Vendido para todo el recorrido'}
            </p>
          </div>
        </div>

        {/* Datos del pasajero */}
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
          <div className="grid grid-cols-2 gap-2 p-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pasajero</p>
              <p className="font-bold text-slate-800">{ocupado.nombre_cliente || '---'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cédula</p>
              <p className="font-mono font-semibold text-slate-700">{ocupado.identificacion_cliente || '---'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Oficina que vendió</p>
              <p className="font-bold text-indigo-700 flex items-center gap-1.5">
                <i className="fas fa-building text-[10px]"></i>
                {oficina}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
              <p className="font-mono font-black text-emerald-700">{money(ocupado.total_boleto_detalle)}</p>
            </div>
          </div>

          <div className="p-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sub-ruta (tramo vendido)</p>
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <i className="fas fa-route text-[10px] text-slate-400"></i>
              {nombreDestino}
            </p>
          </div>

          {(ocupado.punto_final_destino || ocupado.punto_final_boleto_detalle) && (
            <div className="p-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Punto final vendido</p>
              <p className="font-bold text-amber-700 flex items-center gap-1.5">
                <i className="fas fa-flag-checkered text-[10px]"></i>
                {ocupado.punto_final_destino || ocupado.punto_final_boleto_detalle}
              </p>
            </div>
          )}

          <div className="p-3 flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Boleto</span>
            <span className="font-mono font-bold text-slate-700">#{ocupado.id_boleto || '---'}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onImprimir}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
          >
            <i className="fas fa-print"></i> Imprimir
          </button>
          <button
            type="button"
            onClick={onReubicar}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold text-white bg-teal-800 hover:bg-teal-900 transition-colors"
          >
            <i className="fas fa-exchange-alt"></i> Cambiar / Reubicar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <i className="fas fa-times"></i> Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
