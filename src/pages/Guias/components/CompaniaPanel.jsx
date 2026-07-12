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

  const [companiasList, setCompaniasList] = useState([]);
  const [loadingCompanias, setLoadingCompanias] = useState(false);

  const handleOpenModal = async () => {
    setShowModalCompanias(true);
    if (companiasList.length === 0) {
      setLoadingCompanias(true);
      try {
        const res = await GuiaService.getCompaniasCombo();
        if (res && res.data) {
          setCompaniasList(res.data);
        }
      } catch (e) {
        console.error('Error al cargar companias', e);
      } finally {
        setLoadingCompanias(false);
      }
    }
  };

  const sectionTitle = { fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.01em' };

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
            title="Seleccionar Compañía">
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

      <Modal isOpen={showModalCompanias} onClose={() => setShowModalCompanias(false)} title="Seleccionar Compañía" width="max-w-md">
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loadingCompanias ? (
            <div className="text-center text-slate-500 py-4 text-sm"><i className="fas fa-spinner fa-spin mr-2"></i>Cargando compañías...</div>
          ) : !companiasList || companiasList.length === 0 ? (
            <div className="text-center text-slate-500 py-4 text-sm">No hay compañías disponibles</div>
          ) : (
            <div className="flex flex-col gap-2">
              {companiasList.map(c => (
                <div key={c.id_compania_asociada} 
                  onClick={() => {
                    if (onSeleccionarCompania) {
                      onSeleccionarCompania({
                        id: c.id_compania_asociada,
                        id_compania: c.id_compania_asociada,
                        nombre: c.nombre_compania_asociada,
                        ruc: c.ruc_compania_asociada,
                        telefono: c.telefono_compania_asociada || '',
                        correo: c.correo_compania_asociada || ''
                      });
                    }
                    setShowModalCompanias(false);
                  }}
                  className="p-3 border border-slate-200 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors flex justify-between items-center"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-700">{c.nombre_compania_asociada}</div>
                    <div className="text-[10px] text-slate-500">RUC: {c.ruc_compania_asociada}</div>
                  </div>
                  <i className="fas fa-chevron-right text-slate-300"></i>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};