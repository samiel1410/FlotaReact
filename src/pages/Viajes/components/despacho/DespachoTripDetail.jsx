import React from 'react';
import DespachoOcupacionBar from './DespachoOcupacionBar';
import DespachoAsientosTable from './DespachoAsientosTable';
import { buildPdfUrl } from '../../../../utils/pdfUrlUtils';

const formatFecha = (f) => {
  if (!f) return '--/--/----';
  const d = new Date(f);
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const DespachoTripDetail = ({
  selectedTrip,
  detailLoading,
  detailData,
  despachando,
  onDespachar,
  onOpenUnidadModal,
  onOpenConductorModal,
  onOpenRetencionesModal,
}) => {
  if (!selectedTrip) {
    return (
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 shadow-sm mb-4">
          <i className="fas fa-hand-pointer text-3xl text-blue-500/70 animate-bounce" />
        </div>
        <h3 className="text-base font-bold text-slate-700">Seleccione un viaje del listado</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Haga clic en cualquier viaje de la izquierda para revisar lista de pasajeros, validar asignaciones de tripulación y realizar el despacho operativo.
        </p>
      </main>
    );
  }

  if (detailLoading) {
    return (
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col items-center justify-center gap-3">
        <i className="fas fa-circle-notch fa-spin text-3xl text-blue-600" />
        <p className="text-xs font-bold text-slate-500">Cargando información del viaje...</p>
      </main>
    );
  }

  if (!detailData) {
    return (
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6 flex items-center justify-center text-slate-400">
        <p className="text-sm font-semibold">No se pudo cargar la información del viaje</p>
      </main>
    );
  }

  const tripId = selectedTrip.id_viajes || selectedTrip.id_viaje;
  const isDespachado = Number(selectedTrip.estado || selectedTrip.estado_viajes) === 2;
  const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;

  const totalAsientosOcupados = detailData.asientos?.length || detailData.cantidad_boletos || 0;
  const capacidadBus = detailData.capacidad_bus || 40;
  const ocupacionPct = Math.round((totalAsientosOcupados / capacidadBus) * 100);

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col">
      <div className="max-w-5xl mx-auto w-full space-y-4 pb-12">
        
        {/* ═══ TARJETA HERO: CABECERA DEL VIAJE (DISEÑO CLARO) ═══ */}
        <div className="bg-gradient-to-r from-blue-50 via-white to-indigo-50/50 rounded-2xl p-5 text-slate-800 shadow-sm border border-blue-200/80">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-blue-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  N° VIAJE #{tripId}
                </span>
                {selectedTrip.codigo_viaje && (
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-slate-200">
                    Frecuencia: {selectedTrip.codigo_viaje}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
                <span>{selectedTrip.origen || 'Origen'}</span>
                <i className="fas fa-arrow-right text-blue-600 text-base mx-1" />
                <span>{selectedTrip.destino || 'Destino'}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-black tracking-tight leading-none text-blue-700 font-mono">
                {selectedTrip.hora_salida || '--:--'}
              </div>
              <div className="text-xs font-bold text-slate-500 mt-1.5 flex items-center justify-end gap-1.5">
                <i className="far fa-calendar-alt text-blue-500" />
                {formatFecha(selectedTrip.fecha_viaje)}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ BARRA DE OCUPACIÓN Y CAPACIDAD ═══ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                <i className="fas fa-chair" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">Ocupación de Asientos</span>
                <span className="text-[11px] text-slate-500 ml-2">
                  ({totalAsientosOcupados} de {capacidadBus} asientos ocupados)
                </span>
              </div>
            </div>

            <span className="text-xs font-black text-slate-800 font-mono">
              {ocupacionPct}%
            </span>
          </div>

          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <DespachoOcupacionBar capacidad={capacidadBus} ocupados={totalAsientosOcupados} />
          </div>
        </div>

        {/* ═══ TARJETAS DE TRIPULACIÓN Y UNIDAD ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          
          {/* 1. Unidad / Bus */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <i className="fas fa-bus text-blue-600" /> Unidad Asignada
                </span>
                {parseFloat(detailData.cxc || detailData.valores?.cxc || '0') > 0 && (
                  <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                    CxC: ${parseFloat(detailData.cxc || detailData.valores?.cxc || 0).toFixed(2)}
                  </span>
                )}
              </div>
              <div className="text-xl font-black text-slate-900">
                {detailData.unidad?.numero_unidad ? `Bus ${detailData.unidad.numero_unidad}` : 'Sin Unidad'}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Placa: <b className="text-slate-800 font-mono">{detailData.unidad?.placa || '-'}</b>
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenUnidadModal}
              className="mt-3.5 w-full h-8 text-xs font-bold border border-blue-200 text-blue-700 bg-blue-50/70 hover:bg-blue-100 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
            >
              <i className="fas fa-exchange-alt text-blue-600 text-[10px]" />
              <span>Cambiar Unidad</span>
            </button>
          </div>

          {/* 2. Conductor */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <i className="fas fa-id-card text-emerald-600" /> Conductor Principal
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 truncate" title={detailData.conductor?.nombre}>
                {detailData.conductor?.nombre || 'Sin Conductor Asignado'}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cédula: <b className="text-slate-800 font-mono">{detailData.conductor?.cedula || '-'}</b>
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenConductorModal}
              className="mt-3.5 w-full h-8 text-xs font-bold border border-emerald-200 text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
            >
              <i className="fas fa-user-edit text-emerald-600 text-[10px]" />
              <span>Cambiar Conductor</span>
            </button>
          </div>

          {/* 3. Auxiliar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <i className="fas fa-user-friends text-purple-600" /> Auxiliar / Azafata
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 truncate" title={detailData.auxiliar?.nombre}>
                {detailData.auxiliar?.nombre || 'Sin Auxiliar'}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cédula: <b className="text-slate-800 font-mono">{detailData.auxiliar?.cedula || '-'}</b>
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenConductorModal}
              className="mt-3.5 w-full h-8 text-xs font-bold border border-purple-200 text-purple-700 bg-purple-50/70 hover:bg-purple-100 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
            >
              <i className="fas fa-user-plus text-purple-600 text-[10px]" />
              <span>Gestionar Auxiliar</span>
            </button>
          </div>

        </div>

        {/* ═══ TABLA DE PASAJEROS & MANIFIESTO ═══ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 pt-3 bg-slate-50/70">
            <div className="flex gap-2">
              <div className="pb-3 px-3 text-xs font-bold border-b-2 border-blue-600 text-blue-700 flex items-center gap-2">
                <i className="fas fa-users text-xs" />
                <span>Pasajeros a Bordo</span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-200">
                  {totalAsientosOcupados}
                </span>
              </div>
            </div>

            {/* Botón Imprimir Manifiesto */}
            <button
              type="button"
              onClick={() => {
                window.open(`${baseUrl}/php/imprimirPasajeros.php?id_viaje=${tripId}`, '_blank');
              }}
              className="mb-2 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <i className="fas fa-print text-xs text-blue-600" />
              <span>Imprimir Manifiesto</span>
            </button>
          </div>

          <div className="p-0">
            <DespachoAsientosTable asientos={detailData.asientos} />
          </div>
        </div>

        {/* ═══ RESUMEN FINANCIERO Y LIQUIDACIÓN (DISEÑO CLARO) ═══ */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <i className="fas fa-calculator text-blue-600 text-sm" />
              Liquidación Financiera del Viaje
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Valores calculados en boletería</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 text-center">
              <p className="text-[10px] uppercase font-bold tracking-wider text-blue-700">Total Boletos</p>
              <p className="text-2xl font-black font-mono text-blue-900 mt-1">
                ${parseFloat(detailData.valores?.boletos || 0).toFixed(2)}
              </p>
            </div>

            <div
              onClick={onOpenRetencionesModal}
              className="bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200/80 hover:border-rose-300 rounded-xl p-3.5 text-center cursor-pointer transition-all shadow-sm hover:shadow-md group active:scale-95 relative"
              title="Haga clic para ver el desglose detallado de retenciones y cobros"
            >
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-rose-700">Retenciones / Gastos</p>
                <i className="fas fa-search-plus text-[10px] text-rose-400 group-hover:text-rose-600 transition-colors" />
              </div>
              <p className="text-2xl font-black font-mono text-rose-600 mt-1">
                -${parseFloat(detailData.valores?.retencion || 0).toFixed(2)}
              </p>
              <div className="mt-1 flex items-center justify-center">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-white/90 group-hover:bg-rose-200/90 px-2 py-0.5 rounded-full border border-rose-200 transition-colors shadow-xs">
                  <i className="fas fa-list text-[8px]" /> Ver detalle
                </span>
              </div>
            </div>

            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 text-center shadow-sm">
              <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">Neto a Entregar</p>
              <p className="text-2xl font-black font-mono text-emerald-700 mt-1">
                ${parseFloat(detailData.valores?.entrega || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ BOTÓN DE ACCIÓN PRINCIPAL (DESPACHO / REIMPRESIÓN) ═══ */}
        <div className="pt-2 flex flex-col items-center gap-2">
          {isDespachado ? (
            <div className="w-full max-w-md flex flex-col gap-2">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                <i className="fas fa-check-double text-blue-600" />
                <span>Este viaje ya se encuentra despachado</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const pdfUrl = baseUrl + buildPdfUrl(`/php/despachoViajePdf.php?id_viajes=${tripId}`);
                  window.open(pdfUrl, '_blank');
                }}
                className="w-full h-12 text-xs font-bold rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <i className="fas fa-print text-blue-600" />
                <span>Reimprimir Hoja de Despacho (PDF)</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onDespachar}
                disabled={despachando}
                className="w-full max-w-md h-13 text-sm font-extrabold rounded-xl text-white tracking-wider shadow-lg flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:transform-none"
                style={{
                  background: despachando
                    ? '#64748b'
                    : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.35)'
                }}
              >
                {despachando ? (
                  <>
                    <i className="fas fa-spinner fa-spin text-lg" />
                    <span>Procesando y Autorizando SRI...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle text-lg" />
                    <span>DESPACHAR VIAJE N° {tripId}</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-400 font-medium">
                Al despachar se emitirá la hoja de ruta y se autorizarán los comprobantes en el SRI.
              </p>
            </>
          )}
        </div>

      </div>
    </main>
  );
};

export default DespachoTripDetail;
