import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { api } from '../../../config/axios';
import { despachoService } from '../../../services/despacho.service';
import { SearchableSelect } from '../../../components/common/SearchableSelect';

/**
 * Modal para editar despacho existente
 * Recrea DespachoEditar del ExtJS
 * Muestra el formulario para cambiar bus/sucursal + lista de guías + eliminar
 */
export const EditarDespachoModal = ({ despacho, onClose, onSuccess }) => {
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buses, setBuses] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  const [formData, setFormData] = useState({
    id_bus: despacho.id_fkbus_despacho_maestro || '',
    nombre_bus: despacho.nombre_bus || '',
    id_oficina: despacho.id_destino || despacho.id_fkdestino_despacho || '',
    nombre_oficina: despacho.nombre_destino || ''
  });

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    setLoading(true);
    try {
      const [busRes, sucRes, detRes] = await Promise.all([
        api.get('/buses/seleccionarBuses', { params: { numero_bloque: 1, tamanio_bloque: 500 } }),
        api.get('/sucursal/comboSucursal'),
        despachoService.listarDetalle({
          id_maestro: despacho.id_despacho_maestro,
          page: 1,
          limit: 100
        })
      ]);

      const busesData = busRes.data?.data || [];
      const sucursalesData = (sucRes.data?.data || []).filter(s => s.id_sucursal !== 0 && s.id_sucursal !== '0');

      setBuses(busesData);
      setSucursales(sucursalesData);
      setDetalles(detRes?.data || []);

      // Pre-set values
      const busSel = busesData.find(b => String(b.bus_disco || b.disco_buses || b.id_buses || b.bus_codigo) === String(despacho.id_fkbus_despacho_maestro));
      const sucSel = sucursalesData.find(s => String(s.suc_codigo_sucursal || s.id_sucursal) === String(despacho.id_destino || despacho.id_fkdestino_despacho));

      setFormData({
        id_bus: despacho.id_fkbus_despacho_maestro || '',
        nombre_bus: busSel ? `Bus #${busSel.bus_disco || busSel.disco_buses || ''} (${busSel.bus_placa || busSel.placa_buses || ''})` : (despacho.nombre_bus || ''),
        id_oficina: despacho.id_destino || despacho.id_fkdestino_despacho || '',
        nombre_oficina: sucSel?.nombre_sucursal || despacho.nombre_destino || ''
      });
    } catch (err) {
      console.error('Error cargando datos:', err);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const busSel = buses.find(b => String(b.bus_disco || b.disco_buses || b.id_buses || b.bus_codigo) === String(formData.id_bus));
      const sucSel = sucursales.find(s => String(s.suc_codigo_sucursal || s.id_sucursal) === String(formData.id_oficina));

      const res = await despachoService.editar({
        id_maestro: despacho.id_despacho_maestro,
        id_bus: formData.id_bus,
        nombre_bus: busSel ? `Bus #${busSel.bus_disco || busSel.disco_buses || ''} (${busSel.bus_placa || busSel.placa_buses || ''})` : (formData.nombre_bus || ''),
        id_oficina: formData.id_oficina,
        nombre_oficina: sucSel?.nombre_sucursal || formData.nombre_oficina || ''
      });

      if (res?.success) {
        toast.success('Despacho actualizado');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const msgErr = typeof res?.mensaje === 'string' ? res.mensaje : 'Error al actualizar';
        toast.error(msgErr);
      }
    } catch (err) {
      console.error('Error editando:', err);
      toast.error('Error al editar despacho');
    } finally {
      setSaving(false);
    }
  };

  const opcionesBuses = buses.map(b => ({
    value: String(b.bus_disco || b.disco_buses || b.id_buses || b.bus_codigo),
    label: `Bus #${b.bus_disco || b.disco_buses || '?'} — Placa: ${b.bus_placa || b.placa_buses || 'S/P'}`
  }));

  const opcionesSucursales = sucursales.map(s => ({
    value: String(s.suc_codigo_sucursal || s.id_sucursal),
    label: `${s.nombre_sucursal || `Sucursal #${s.id_sucursal}`}${s.suc_codigo_sucursal ? ` (Cód. ${s.suc_codigo_sucursal})` : ''}`
  }));

  const handleQuitarGuia = async (idDetalle) => {
    const confirmQuitar = await Swal.fire({ title: '¿Quitar guía?', text: '¿Está seguro que desea quitar esta guía del despacho?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, quitar', cancelButtonText: 'Cancelar' });
    if (!confirmQuitar.isConfirmed) return;
    try {
      const res = await despachoService.eliminar({
        id_despacho_detalle: idDetalle,
        motivo: 'Eliminado por usuario'
      });
      if (res?.success) {
        toast.success('Guía eliminada del despacho');
        // Recargar detalles
        const detRes = await despachoService.listarDetalle({
          id_maestro: despacho.id_despacho_maestro,
          page: 1,
          limit: 100
        });
        setDetalles(detRes?.data || []);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res?.mensaje || 'Error al eliminar guía');
      }
    } catch (err) {
      console.error('Error eliminando guía:', err);
      toast.error('Error al eliminar guía');
    }
  };

  const renderEstado = (estado) => {
    if (String(estado) === '1') {
      return <i className="fas fa-circle text-green-500 text-xs" title="Activo"></i>;
    } else if (String(estado) === '2') {
      return <i className="fas fa-circle text-red-500 text-xs" title="Finalizado"></i>;
    }
    return <i className="fas fa-circle text-gray-300 text-xs"></i>;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center">
          <i className="fas fa-spinner fa-spin text-3xl text-blue-600 mb-4"></i>
          <p className="text-slate-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
            <h2 className="text-white font-bold flex items-center gap-2">
              <i className="fas fa-edit text-amber-400"></i>
              DESPACHO N# {despacho.numero_despacho_maestro || ''}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex flex-col gap-5">
            {/* Formulario edición */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Bus</label>
                <SearchableSelect
                  options={opcionesBuses}
                  value={formData.id_bus}
                  onChange={val => {
                    const bus = buses.find(b => String(b.bus_disco || b.disco_buses || b.id_buses || b.bus_codigo) === String(val));
                    setFormData(p => ({
                      ...p,
                      id_bus: val,
                      nombre_bus: bus ? `Bus #${bus.bus_disco || bus.disco_buses || ''} (${bus.bus_placa || bus.placa_buses || ''})` : ''
                    }));
                  }}
                  placeholder="Seleccionar bus..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sucursal Destino</label>
                <SearchableSelect
                  options={opcionesSucursales}
                  value={formData.id_oficina}
                  onChange={val => {
                    const suc = sucursales.find(s => String(s.suc_codigo_sucursal || s.id_sucursal) === String(val));
                    setFormData(p => ({
                      ...p,
                      id_oficina: val,
                      nombre_oficina: suc?.nombre_sucursal || ''
                    }));
                  }}
                  placeholder="Seleccionar sucursal destino..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleGuardar} disabled={saving}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-60">
                {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                Guardar Cambios
              </button>
            </div>

            {/* Lista de guías del despacho */}
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <i className="fas fa-list-alt text-blue-500"></i>
                Guías en este despacho ({detalles.length})
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">N° Guía</th>
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-slate-500">Destino</th>
                      <th className="px-3 py-2 text-center text-[11px] font-bold uppercase text-slate-500">Estado</th>
                      <th className="px-3 py-2 text-center w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detalles.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400">
                          <i className="fas fa-inbox mr-2"></i>
                          No hay guías en este despacho
                        </td>
                      </tr>
                    ) : (
                      detalles.map((det, idx) => (
                        <tr key={det.id_despacho_detalle || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 font-mono text-xs font-medium text-slate-700">
                            {det.numero_guia || det.numero_guia_formateado || '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-600 text-xs">{det.destino_guia || '-'}</td>
                          <td className="px-3 py-2 text-center">{renderEstado(det.estado_despacho_detalle)}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleQuitarGuia(det.id_despacho_detalle)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Quitar guía"
                            >
                              <i className="fas fa-trash text-sm"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>


    </>
  );
};
