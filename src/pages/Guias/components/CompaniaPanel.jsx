import { useState } from 'react';
import { GuiaService } from '../../../services/guia.service';
import Modal from '../../../components/common/Modal';

/**
 * CompaniaPanel - Equivalente a "Datos de la Compañía" del ExtJS
 * 
 * ExtJS original:
 * - Combo "A quién se factura" (Remitente=1, Destinatario=2, Otros=3)
 * - Fieldset Datos Compañía (Nombre, RUC, Teléfono - solo lectura)
 * - Botón Buscar compañía
 */
export const CompaniaPanel = ({ cliente, compania: companiaProp, onSeleccionarCompania, error, destinos = [], onSeleccionarDestino }) => {
  const [rucBusqueda, setRucBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [showModalCompanias, setShowModalCompanias] = useState(false);
  const compania = companiaProp || null;

  const inputClass = "w-full h-8 px-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white text-slate-700";
  const labelClass = "block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1";
  const inputRO = `${inputClass} bg-slate-50 cursor-not-allowed`;

  const handleBuscarCompania = async () => {
    if (!rucBusqueda || rucBusqueda.length < 10) return;
    setBuscando(true);
    try {
      const res = await GuiaService.buscarCompaniaPorRuc(rucBusqueda);
      const raw = res?.data;
      if (raw) {
        const normalizado = {
          id: raw.id || raw.id_compania || raw.id_fkcompania_asociada || null,
          id_compania: raw.id_compania || raw.id || raw.id_fkcompania_asociada || null,
          nombre: raw.nombre || raw.nombre_compania || '',
          ruc: raw.ruc || raw.ruc_compania || '',
          telefono: raw.telefono || raw.telefono_compania || raw.numero_contacto || '',
          correo: raw.correo || raw.correo_compania || ''
        };
        if (normalizado.id) {
          onSeleccionarCompania?.(normalizado);
        } else {
          onSeleccionarCompania?.(null);
        }
      } else {
        onSeleccionarCompania?.(null);
      }
    } catch (e) {
      console.error('Error buscando compañía:', e);
      onSeleccionarCompania?.(null);
    } finally {
      setBuscando(false);
    }
  };

  const handleClear = () => {
    setRucBusqueda('');
    onSeleccionarCompania?.(null);
  };

  const [filtroModal, setFiltroModal] = useState('');

  const handleOpenModal = () => {
    setFiltroModal('');
    setShowModalCompanias(true);
  };

  const sectionTitle = { fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.01em' };

  // Filtrar destinos para el modal (opcionalmente solo los que tienen compañía o todos, según lo requerido. El usuario pidió "todos los destinos y las compa;ias asociadas")
  const destinosFiltrados = destinos.filter(d => {
    if (!filtroModal) return true;
    const busqueda = filtroModal.toLowerCase();
    const nombreDest = (d.nombre || d.nombre_destino || '').toLowerCase();
    const nombreComp = (d.nombre_compania_asociada || '').toLowerCase();
    return nombreDest.includes(busqueda) || nombreComp.includes(busqueda);
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80" style={{ padding: '16px', outline: error ? '2px solid #ef4444' : undefined, outlineOffset: '-1px' }}>
      <h3 style={sectionTitle}>
        <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
          <i className="fas fa-building" style={{ color: '#4f46e5' }}></i>
        </div>
        Datos de la Compañía
      </h3>

      {/* Búsqueda por RUC */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <label className={labelClass}>RUC Compañía</label>
          <input type="text" className={compania ? inputRO : inputClass} 
            value={compania ? (compania.ruc || rucBusqueda) : rucBusqueda}
            onChange={(e) => setRucBusqueda(e.target.value)}
            placeholder="Ingrese RUC..."
            maxLength={13}
            readOnly={!!compania} />
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'end' }}>
          <button onClick={handleOpenModal}
            type="button"
            className="h-8 px-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-xs font-bold shadow-sm"
            title="Seleccionar Destino/Compañía">
            <i className="fas fa-list"></i>
          </button>
          <button onClick={handleBuscarCompania} disabled={buscando || !!compania}
            type="button"
            className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-md text-xs font-bold shadow-sm">
            <i className={`fas ${buscando ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
          </button>
          <button onClick={handleClear}
            type="button"
            className="h-8 px-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-md text-xs font-bold">
            <i className="fas fa-eraser"></i> Limpiar
          </button>
        </div>
      </div>

      {/* Datos de la compañía (solo lectura) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label className={labelClass}>Nombre</label>
          <input type="text" className={inputRO} readOnly value={compania?.nombre || cliente?.nombre || ''} />
        </div>
        <div>
          <label className={labelClass}>Teléfono</label>
          <input type="text" className={inputRO} readOnly value={compania?.telefono || cliente?.telefono || ''} />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label className={labelClass}>Correo</label>
          <input type="text" className={inputRO} readOnly value={compania?.correo || cliente?.correo || ''} />
        </div>
      </div>

      {/* Campo oculto para ID */}
      <input type="hidden" name="id_compania" value={compania?.id || compania?.id_compania || ''} />

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
                        onSeleccionarDestino(String(d.id || d.id_destino), d.nombre || d.nombre_destino || '');
                      }
                      setShowModalCompanias(false);
                    }}
                    className="p-3 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer transition-all flex justify-between items-center group"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        <i className="fas fa-map-marker-alt text-slate-400 mr-2 group-hover:text-indigo-500"></i>
                        {d.nombre || d.nombre_destino}
                      </div>
                      {d.nombre_compania_asociada ? (
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <i className="fas fa-building text-slate-400"></i>
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