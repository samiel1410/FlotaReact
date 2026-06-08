import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import ViajesService from '../../services/viajes.service';

export const DespachoViajesPage = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const response = await ViajesService.getTrips();
      if (response.success) {
        setTrips(response.data || []);
      } else {
        toast.error(response.message || 'Error al cargar los viajes');
      }
    } catch (error) {
      toast.error('Error al cargar los viajes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleDispatchTrip = async (trip) => {
    const result = await Swal.fire({
      title: '¿Despachar viaje?',
      html: `<p>¿Está seguro de despachar el viaje de la ruta <strong>${trip.nombre_ruta || ''}</strong>?</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, despachar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
    });

    if (result.isConfirmed) {
      try {
        const response = await ViajesService.dispatchTrip(trip.id_viajes);
        if (response.success) {
          toast.success('Viaje despachado exitosamente');
          fetchTrips();
        } else {
          toast.error(response.message || 'Error al despachar el viaje');
        }
      } catch (error) {
        toast.error('Error al despachar el viaje');
      }
    }
  };

  const getEstadoLabel = (estado) => {
    const estados = {
      1: { label: 'Programado', color: 'bg-blue-50 text-blue-600' },
      2: { label: 'Despachado', color: 'bg-emerald-50 text-emerald-600' },
      3: { label: 'Realizado', color: 'bg-green-50 text-green-600' },
      4: { label: 'Cancelado', color: 'bg-rose-50 text-rose-600' },
    };
    return estados[estado] || { label: 'Desconocido', color: 'bg-slate-100 text-slate-500' };
  };

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500"></i>
          <span className="text-slate-500 font-medium">Cargando viajes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 pb-32">
        {/* Cabecera */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple-600 text-white rounded-xl flex items-center justify-center text-xl shadow-sm">
                <i className="fas fa-shipping-fast"></i>
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">Despacho de Viajes</h1>
                <p className="text-sm font-medium text-slate-500 mt-0.5">
                  Viajes programados y despachados — {trips.length} registros
                </p>
              </div>
            </div>
            <button onClick={fetchTrips} disabled={loading}
              className="h-9 px-4 flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-all text-[10px] font-bold">
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
              ACTUALIZAR
            </button>
          </div>
        </div>

        {/* Grid de viajes */}
        {trips.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12">
            <div className="flex flex-col items-center gap-3">
              <i className="fas fa-road text-4xl text-slate-200"></i>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay viajes disponibles</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((trip, idx) => {
              const estadoInfo = getEstadoLabel(trip.estado_viajes);
              return (
                <div key={trip.id_viajes || idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <i className="fas fa-bus text-xs"></i>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{trip.nombre_ruta || 'Sin ruta'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Unidad {trip.nombre_bus || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
                      <span>
                        <i className="fas fa-calendar text-slate-300 mr-1"></i>
                        {trip.fecha_viaje || '-'}
                      </span>
                      <span>
                        <i className="fas fa-clock text-slate-300 mr-1"></i>
                        {trip.hora_salida || '-'}
                      </span>
                      <span>
                        <i className="fas fa-user text-slate-300 mr-1"></i>
                        {trip.chofer_viaje || 'Sin conductor'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] uppercase font-black w-max ${estadoInfo.color}`}>
                        {estadoInfo.label}
                      </span>
                    </div>
                    <div className="flex gap-3 text-[10px] font-bold text-slate-400 pt-1">
                      <span>
                        <i className="fas fa-ticket-alt text-slate-200 mr-1"></i>
                        {trip.cantidad_boletos || 0} boletos
                      </span>
                      <span>
                        <i className="fas fa-dollar-sign text-slate-200 mr-1"></i>
                        ${parseFloat(trip.total_recaudado || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {trip.estado_viajes == 1 && (
                    <div className="pt-3 border-t border-slate-100 mt-3">
                      <button onClick={() => handleDispatchTrip(trip)}
                        className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest shadow-sm">
                        <i className="fas fa-paper-plane"></i>
                        DESPACHAR
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
