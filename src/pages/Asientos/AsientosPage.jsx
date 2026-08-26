import { useState, useEffect } from 'react';
import { AsientosFilterPanel } from './components/AsientosFilterPanel';
import { ViajesGrid } from './components/ViajesGrid';
import { ViajeDetallePanel } from './components/ViajeDetallePanel';
import { AsientosService } from '../../services/asientos.service';
import toast from 'react-hot-toast';
import './AsientosPage.css';

const getTodayString = () => {
  const localDate = new Date();
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().split('T')[0];
};

export const AsientosPage = () => {
  const today = getTodayString();
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 5;

  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  const [modoDetalle, setModoDetalle] = useState(null);
  const [datosDetalle, setDatosDetalle] = useState([]);
  const [pasajerosDetalle, setPasajerosDetalle] = useState([]);
  const [resumenDetalle, setResumenDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [filtros, setFiltros] = useState({
    comboMes: new Date().getMonth() + 1,
    comboAnioFactura: new Date().getFullYear(),
    buscarPorFechaDesde: today
  });

  const loadViajes = async (currentFiltros, currentPage) => {
    setLoading(true);
    setViajeSeleccionado(null);
    setModoDetalle(null);
    setResumenDetalle(null);
    setPasajerosDetalle([]);
    try {
      const params = {
        ...currentFiltros,
        limit,
        start: (currentPage - 1) * limit
      };
      const response = await AsientosService.getViajes(params);
      setViajes(response.data || []);
      setTotalRecords(response.total || 0);
    } catch (error) {
      console.error('Error cargando viajes:', error);
      toast.error('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadViajes(filtros, page);
  }, [filtros, page]);

  const handleSearch = (nuevosFiltros) => {
    setFiltros(nuevosFiltros);
    setPage(1);
  };

  const handleVerDetalle = async (viaje, modo) => {
    setViajeSeleccionado(viaje);
    setModoDetalle(modo);
    setLoadingDetalle(true);
    try {
      const response = await AsientosService.getAsientosViaje(viaje.via_codigo || viaje.id_viaje);
      setDatosDetalle(response.data || []);
      setPasajerosDetalle(response.pasajeros || []);
      setResumenDetalle(response.resumen || null);
    } catch (error) {
      console.error('Error cargando detalle:', error);
      toast.error('No se pudo obtener la información de los asientos.');
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleCerrarDetalle = () => {
    setViajeSeleccionado(null);
    setModoDetalle(null);
    setResumenDetalle(null);
    setPasajerosDetalle([]);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <i className="fas fa-chair text-orange-600 text-lg"></i>
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-800">Gestión de Asientos y Viajes</h1>
          <p className="text-[11px] text-slate-500">Visualización de asientos y pasajeros por viaje</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <AsientosFilterPanel onSearch={handleSearch} />

        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col ${viajeSeleccionado ? 'flex-1' : 'flex-1'}`}>
            <ViajesGrid
              data={viajes}
              loading={loading}
              page={page}
              limit={limit}
              total={totalRecords}
              onPageChange={setPage}
              onReload={() => loadViajes(filtros, page)}
              onVerAsientos={(viaje) => handleVerDetalle(viaje, 'asientos')}
              onVerPasajeros={(viaje) => handleVerDetalle(viaje, 'pasajeros')}
              viajeSeleccionadoId={viajeSeleccionado?.via_codigo}
            />
          </div>

          {viajeSeleccionado && (
            <div className="flex-[2] bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col animate-fadeIn">
              <ViajeDetallePanel
                viaje={viajeSeleccionado}
                modo={modoDetalle}
                datos={datosDetalle}
                pasajeros={pasajerosDetalle}
                resumen={resumenDetalle}
                loading={loadingDetalle}
                onClose={handleCerrarDetalle}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
