import { useState } from 'react';
import { GuiaService } from '../../../services/guia.service';
import Modal from '../../../components/common/Modal';
import toast from 'react-hot-toast';

/**
 * CompaniaPanel - Muestra la Compañía Asociada con sus botones de acción (Destinos, Buscar, Limpiar)
 * y el Nombre de la Compañía destacado en grande.
 */
export const CompaniaPanel = ({ cliente, compania: companiaProp, onSeleccionarCompania, error, destinos = [], onSeleccionarDestino }) => {
  const [rucBusqueda, setRucBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [showModalCompanias, setShowModalCompanias] = useState(false);
  const [filtroModal, setFiltroModal] = useState('');
  const compania = companiaProp || null;

  const nombreCompania = compania?.nombre || compania?.nombre_compania_asociada || cliente?.nombre || '';

  const inputClass = "w-full h-8 px-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white text-slate-700";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1";
  const inputRO = `${inputClass} bg-slate-50 cursor-not-allowed`;

  const handleBuscarCompania = async () => {
    const ruc = (rucBusqueda || compania?.ruc || '').trim();
    if (!ruc || ruc.length < 10) {
      toast.error('Ingrese al menos 10 dígitos de RUC para buscar');
      return;
    }
    setBuscando(true);
    try {
      const res = await GuiaService.buscarCompaniaPorRuc(ruc);
      const raw = res?.data;
      if (raw) {
        const normalizado = {
          id: raw.id || raw.id_compania || raw.id_fkcompania_asociada || null,
          id_compania: raw.id_compania || raw.id || raw.id_fkcompania_asociada || null,
          nombre: raw.nombre || raw.nombre_compania || raw.nombre_compania_asociada || '',
          ruc: raw.ruc || raw.ruc_compania || raw.ruc_compania_asociada || ruc,
          telefono: raw.telefono || raw.telefono_compania || raw.numero_contacto || '',
          correo: raw.correo || raw.correo_compania || ''
        };
        if (normalizado.id || normalizado.nombre) {
          onSeleccionarCompania?.(normalizado);
          toast.success(`Compañía encontrada: ${normalizado.nombre}`);
        } else {
          onSeleccionarCompania?.(null);
          toast.error('No se encontró compañía con ese RUC');
        }
      } else {
        onSeleccionarCompania?.(null);
        toast.error('No se encontró compañía con ese RUC');
      }
    } catch (e) {
      console.error('Error buscando compañía:', e);
      toast.error('Error al buscar compañía');
      onSeleccionarCompania?.(null);
    } finally {
      setBuscando(false);
    }
  };

  const handleClear = (e) => {
    e?.stopPropagation();
    setRucBusqueda('');
    onSeleccionarCompania?.(null);
  };

  const handleOpenModal = () => {
    setFiltroModal('');
    setShowModalCompanias(true);
  };

  const sectionTitle = { fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em' };

  // Filtrar destinos para el modal
  const destinosFiltrados = destinos.filter(d => {
    if (!filtroModal) return true;
    const busqueda = filtroModal.toLowerCase();
    const nombreDest = (d.lugar_destino || d.nombre || d.nombre_destino || '').toLowerCase();
    const nombreComp = (d.nombre_compania_asociada || '').toLowerCase();
    return nombreDest.includes(busqueda) || nombreComp.includes(busqueda);
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80" style={{ padding: '14px', outline: error ? '2px solid #ef4444' : undefined, outlineOffset: '-1px' }}>
      <div style={sectionTitle}>
        <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
          <i className="fas fa-building" style={{ color: '#4f46e5' }}></i>
        </div>
        <span>Compañía Asociada</span>
      </div>

      {/* Fila de Búsqueda y Botones de Acción */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <label className={labelClass}>RUC Compañía</label>
          <input
            type="text"
            className={compania ? inputRO : inputClass}
            value={compania ? (compania.ruc || rucBusqueda) : rucBusqueda}
            onChange={(e) => setRucBusqueda(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleBuscarCompania();
              }
            }}
            placeholder="Ingrese RUC..."
            maxLength={13}
            readOnly={!!compania}
          />
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'end' }}>
          <button
            onClick={handleOpenModal}
            type="button"
            className="h-8 px-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 transition-colors"
            title="Seleccionar Destino/Compañía"
          >
            <i className="fas fa-list text-xs"></i>
            <span className="hidden sm:inline">Destinos</span>
          </button>
          <button
            onClick={handleBuscarCompania}
            disabled={buscando || !!compania}
            type="button"
            className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            title="Buscar por RUC"
          >
            <i className={`fas ${buscando ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
          </button>
          <button
            onClick={handleClear}
            type="button"
            className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
            title="Limpiar compañía"
          >
            <i className="fas fa-eraser text-xs"></i>
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* Visualización del Nombre en Grande */}
      {nombreCompania ? (
        <div className="bg-gradient-to-r from-indigo-50/90 via-indigo-50/50 to-white border border-indigo-200/80 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <i className="fas fa-building text-xs"></i>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider block">Compañía Asociada</span>
              <span className="text-sm md:text-base font-black text-slate-800 truncate block">
                {nombreCompania}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            title="Quitar compañía"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>
      ) : (
        <div
          onClick={handleOpenModal}
          className="bg-slate-50 border border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-indigo-50/40 transition-all group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 flex items-center justify-center shrink-0 transition-colors">
              <i className="fas fa-building text-[10px]"></i>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-900 block truncate transition-colors">
                Sin compañía asociada
              </span>
              <span className="text-[9px] text-slate-400 block truncate">
                Se vincula según el destino o búsqueda por RUC
              </span>
            </div>
          </div>
          <span className="text-slate-300 group-hover:text-indigo-500 transition-colors pr-1">
            <i className="fas fa-chevron-right text-xs"></i>
          </span>
        </div>
      )}

      {/* Campo oculto para ID de compañía */}
      <input type="hidden" name="id_compania" value={compania?.id || compania?.id_compania || ''} />

      {/* Modal para buscar o seleccionar destino y su compañía asociada */}
      <Modal isOpen={showModalCompanias} onClose={() => setShowModalCompanias(false)} title="Seleccionar Destino y Compañía" width="max-w-md">
        <div className="p-4 flex flex-col h-[60vh]">
          <div className="mb-4 shrink-0">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                className="w-full h-10 pl-9 pr-4 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Buscar por destino o compañía..."
                value={filtroModal}
                onChange={(e) => setFiltroModal(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {!destinosFiltrados || destinosFiltrados.length === 0 ? (
              <div className="text-center text-slate-500 py-8 text-sm">
                <i className="fas fa-inbox text-2xl mb-2 text-slate-300 block"></i>
                No se encontraron resultados
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {destinosFiltrados.map(d => (
                  <div key={d.id || d.id_destino} 
                    onClick={() => {
                      if (onSeleccionarDestino) {
                        onSeleccionarDestino(String(d.id || d.id_destino), d.lugar_destino || d.nombre || d.nombre_destino || '');
                      }
                      setShowModalCompanias(false);
                    }}
                    className="p-3 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer transition-all flex justify-between items-center group"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        <i className="fas fa-map-marker-alt text-slate-400 mr-2 group-hover:text-indigo-500"></i>
                        {d.lugar_destino || d.nombre}
                      </div>
                      {d.nombre_destino && d.nombre_destino !== (d.lugar_destino || d.nombre) && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {d.nombre_destino}
                        </div>
                      )}
                      {d.nombre_compania_asociada ? (
                        <div className="text-xs text-slate-600 font-semibold mt-1 flex items-center gap-1">
                          <i className="fas fa-building text-indigo-500"></i>
                          {d.nombre_compania_asociada}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-1 italic">Sin compañía asociada</div>
                      )}
                    </div>
                    <i className="fas fa-chevron-right text-slate-300 group-hover:text-indigo-400 transition-colors"></i>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};