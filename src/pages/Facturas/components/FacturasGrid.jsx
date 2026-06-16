import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../../components/common/Modal';
import { FacturasService } from '../services/facturas.service';

const ESTADO_MAP = {
  1: { label: 'En Proceso', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  2: { label: 'Anulado', class: 'bg-rose-50 text-rose-700 border-rose-200' },
  3: { label: 'Pendiente', class: 'bg-slate-50 text-slate-600 border-slate-200' },
  4: { label: 'Autorizado', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const FacturasGrid = ({ data, loading, page, limit, total, onPageChange, onReload, id_usuario, rol_usuario }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [menuOpen, setMenuOpen] = useState(null);
  const [menuPos, setMenuPos] = useState({});
  const btnRefs = useRef({});
  const [anularModal, setAnularModal] = useState({ open: false, type: null, row: null, count: 0 });
  const [motivo, setMotivo] = useState('');
  const [anulando, setAnulando] = useState(false);

  const totalPages = Math.ceil(total / limit) || 1;

  const openMenu = useCallback((id) => {
    if (menuOpen === id) {
      setMenuOpen(null);
      return;
    }
    const btn = btnRefs.current[id];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const menuH = 260;
      const spaceBelow = window.innerHeight - rect.bottom - 10;
      const spaceAbove = rect.top - 10;
      const openUp = spaceBelow < menuH && spaceAbove >= menuH;
      setMenuPos({
        // Al abrir hacia abajo: top = borde inferior del botón
        // Al abrir hacia arriba: top = borde superior (translateY(-100%) lo desplaza hacia arriba)
        top: openUp ? rect.top : rect.bottom,
        left: Math.max(8, Math.min(rect.left + rect.width - 192, window.innerWidth - 200)),
        openUp,
      });
    }
    setMenuOpen(id);
  }, [menuOpen]);

  // Cerrar menú con Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map(d => d.id_factura));
    }
  };

  const handleAction = (action, row) => {
    setMenuOpen(null);
    switch (action) {
      case 'pdf':
        FacturasService.getPdf(row.id_factura);
        break;
      case 'cobrar':
        toast('Módulo de cobros en integración', { icon: 'ℹ️' });
        break;
      case 'cobros_realizados':
        toast('Módulo de cobros realizados en integración', { icon: 'ℹ️' });
        break;
      case 'anular':
        setMotivo('');
        setAnularModal({ open: true, type: 'single', row, count: 0 });
        break;
      case 'reenviar_sri':
        FacturasService.reenviarSri(row.id_factura);
        break;
    }
  };

  const confirmarAnulacion = async () => {
    if (!motivo.trim()) {
      toast.error('Debe ingresar un motivo de anulación');
      return;
    }
    setAnulando(true);
    let cerrarModal = true;
    try {
      const { type, row } = anularModal;

      if (type === 'single') {
        const res = await FacturasService.verificarAnulacion(row.id_factura);
        const estado = res?.message;

        if (estado === 2) {
          toast.error('La factura ya está anulada');
          cerrarModal = false;
        } else {
          // Admin (rol 1 o 5) usa anularAdmin, oficinista (rol 4) usa anularoficinista
          const esAdmin = rol_usuario == 1 || rol_usuario == 5;
          const anulacionRes = esAdmin
            ? await FacturasService.anularAdmin(row.id_factura, motivo.toUpperCase(), id_usuario)
            : await FacturasService.anular(row.id_factura, motivo.toUpperCase(), id_usuario);

          if (anulacionRes.success) {
            toast.success('Factura anulada correctamente');
            onReload();
          } else {
            toast.error(anulacionRes.message || 'No se pudo anular');
          }
        }

      } else if (type === 'pendientes') {
        const res = await FacturasService.anularPendientes(motivo.toUpperCase(), id_usuario);
        if (res.success) {
          toast.success('Facturas pendientes anuladas');
          onReload();
        } else {
          toast.error(res.message || 'Error al anular');
        }

      } else if (type === 'seleccionadas') {
        const idsStr = selectedIds.join(',');
        const res = await FacturasService.anularSeleccionadas(idsStr, motivo.toUpperCase());
        if (res.success) {
          toast.success('Facturas anuladas correctamente');
          setSelectedIds([]);
          onReload();
        } else {
          toast.error(res.message || 'Error al anular');
        }
      }
    } catch {
      toast.error('Error al conectar con el servidor');
    } finally {
      setAnulando(false);
      if (cerrarModal) {
        setAnularModal({ open: false, type: null, row: null, count: 0 });
        setMotivo('');
      }
    }
  };

  const formatSecuencial = (row) => {
    const num = String(row.numero_factura || '').padStart(9, '0');
    return `${row.punto_emision_sucursal || ''}-${row.punto_emision_factura || ''}-${num}`;
  };

  const formatNumeroGuia = (row) => row.numero_guia || '-';

  const tdClass = "px-3 py-2.5 text-xs border-b border-slate-100";
  const thClass = "px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left bg-slate-50 border-b border-slate-200";

  return (
    <div className="flex flex-col h-full">
      {/* Action Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-200">
        <button onClick={() => { setMotivo(''); setAnularModal({ open: true, type: 'pendientes', row: null, count: 0 }); }}
          className="h-7 px-2.5 text-[10px] font-bold text-white bg-rose-600 rounded-md hover:bg-rose-700 transition-all flex items-center gap-1">
          <i className="fas fa-redo"></i> Anular Pendientes
        </button>
        <button onClick={() => {
          if (selectedIds.length === 0) {
            toast.error('Seleccione al menos una factura');
            return;
          }
          setMotivo('');
          setAnularModal({ open: true, type: 'seleccionadas', row: null, count: selectedIds.length });
        }}
          className="h-7 px-2.5 text-[10px] font-bold text-white bg-rose-600 rounded-md hover:bg-rose-700 transition-all flex items-center gap-1">
          <i className="fas fa-ban"></i> Anular Seleccionadas ({selectedIds.length})
        </button>
        <div className="flex-1"></div>
        <span className="text-[10px] text-slate-400">
          {selectedIds.length > 0 ? `${selectedIds.length} seleccionada(s)` : `${total} factura(s)`}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={`${thClass} w-10`}>
                <input type="checkbox" checked={data.length > 0 && selectedIds.length === data.length}
                  onChange={toggleSelectAll} className="rounded" />
              </th>
              <th className={thClass}># FACTURA</th>
              <th className={thClass}>GUÍA</th>
              <th className={thClass}>FECHA</th>
              <th className={thClass}>CLIENTE</th>
              <th className={`${thClass} text-right`}>TOTAL</th>
              <th className={`${thClass} text-right`}>COBRADO</th>
              <th className={`${thClass} text-right`}>POR COBRAR</th>
              <th className={thClass}>ESTADO</th>
              <th className={`${thClass} w-10`}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="text-center py-12 text-slate-400">
                  <i className="fas fa-spinner fa-spin mr-2"></i> Cargando facturas...
                </td>
              </tr>
            ) : !data || data.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-12 text-slate-400">
                  <i className="fas fa-inbox mr-2 opacity-50"></i> No se encontraron facturas
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const est = ESTADO_MAP[row.estado_factura] || ESTADO_MAP[3];
                const rowClass = row.estado_factura == 2 ? 'bg-rose-50/40' :
                  row.estado_factura == 3 ? 'bg-amber-50/30' :
                  row.estado_factura == 4 ? 'bg-emerald-50/20' : '';

                return (
                  <tr key={row.id_factura || idx} className={`${rowClass} hover:bg-blue-50/40 transition-colors`}>
                    <td className={`${tdClass} text-center`}>
                      <input type="checkbox" checked={selectedIds.includes(row.id_factura)}
                        onChange={() => toggleSelect(row.id_factura)}
                        className="rounded" />
                    </td>
                    <td className={`${tdClass} font-mono text-[11px] font-bold text-slate-700`}>
                      {formatSecuencial(row)}
                    </td>
                    <td className={`${tdClass} font-mono text-[10px] text-slate-500`}>
                      {formatNumeroGuia(row)}
                    </td>
                    <td className={`${tdClass} text-slate-500`}>
                      {row.fecha_creacion_factura ? row.fecha_creacion_factura.split(' ')[0] : '-'}
                    </td>
                    <td className={tdClass}>
                      <div className="text-xs font-medium text-slate-700">{row.nombre_cliente_factura || '-'}</div>
                      <div className="text-[10px] text-slate-400">{row.ruc_cliente_factura || ''}</div>
                    </td>
                    <td className={`${tdClass} text-right font-bold text-slate-700`}>
                      ${parseFloat(row.total_factura || 0).toFixed(2)}
                    </td>
                    <td className={`${tdClass} text-right text-emerald-600 font-semibold`}>
                      ${parseFloat(row.cobrado || 0).toFixed(2)}
                    </td>
                    <td className={`${tdClass} text-right ${parseFloat(row.por_cobrar || 0) > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                      ${parseFloat(row.por_cobrar || 0).toFixed(2)}
                    </td>
                    <td className={tdClass}>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${est.class}`}>
                        {est.label}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {row.estado_cobro === 'COBRADA'
                          ? <span className="text-emerald-600 font-bold">✓ COBRADA</span>
                          : <span className="text-rose-600 font-bold">✗ NO COBRADA</span>
                        }
                      </div>
                    </td>
                    <td className={`${tdClass} text-center`}>
                      <button
                        ref={(el) => { btnRefs.current[row.id_factura] = el; }}
                        onClick={() => openMenu(row.id_factura)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors">
                        <i className="fas fa-chevron-circle-down text-slate-400 hover:text-slate-600"></i>
                      </button>
                      {menuOpen === row.id_factura && (
                        <>
                          {/* Backdrop */}
                          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                          {/* Menú flotante con posición calculada */}
                          <div
                            style={{
                              position: 'fixed',
                              top: menuPos.top,
                              left: menuPos.left,
                              transform: menuPos.openUp ? 'translateY(-100%)' : 'none',
                              transformOrigin: menuPos.openUp ? 'bottom center' : 'top center',
                            }}
                            className="bg-white rounded-lg shadow-xl border border-slate-200 z-50 w-48 py-1 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <button onClick={() => handleAction('pdf', row)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                              <i className="fas fa-file-pdf text-red-400 w-4 text-center"></i> Visualizar PDF
                            </button>
                            <div className="border-t border-slate-100"></div>
                            <button onClick={() => handleAction('cobrar', row)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                              <i className="fas fa-hand-holding-usd text-emerald-500 w-4 text-center"></i> Cobrar
                            </button>
                            <button onClick={() => handleAction('cobros_realizados', row)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                              <i className="fas fa-eye text-blue-500 w-4 text-center"></i> Cobros Realizados
                            </button>
                            <div className="border-t border-slate-100"></div>
                            <button onClick={() => handleAction('anular', row)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors">
                              <i className="fas fa-ban text-rose-400 w-4 text-center"></i> Anular
                            </button>
                            <button onClick={() => handleAction('reenviar_sri', row)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                              <i className="fas fa-share text-blue-400 w-4 text-center"></i> Reenviar al SRI
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-slate-200">
        <div className="text-[11px] text-slate-400">
          Mostrando {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
        </div>
        <div className="flex items-center gap-1">
          <button disabled={page <= 1} onClick={() => onPageChange(1)}
            className="h-7 w-7 flex items-center justify-center rounded-md text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
            <i className="fas fa-angle-double-left"></i>
          </button>
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}
            className="h-7 w-7 flex items-center justify-center rounded-md text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
            <i className="fas fa-angle-left"></i>
          </button>
          <span className="px-3 text-[11px] font-medium text-slate-600">
            Pág. {page} de {totalPages || 1}
          </span>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}
            className="h-7 w-7 flex items-center justify-center rounded-md text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
            <i className="fas fa-angle-right"></i>
          </button>
          <button disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}
            className="h-7 w-7 flex items-center justify-center rounded-md text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
            <i className="fas fa-angle-double-right"></i>
          </button>
          <button onClick={onReload}
            className="h-7 w-7 flex items-center justify-center rounded-md text-xs text-slate-500 hover:bg-slate-100 ml-2">
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>

      {/* ── Modal de Anulación ── */}
      <Modal isOpen={anularModal.open} onClose={() => { setAnularModal({ open: false, type: null, row: null, count: 0 }); setMotivo(''); }} title="Anular Factura(s)">
        <div className="space-y-4">
          {anularModal.type === 'single' && anularModal.row && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Factura:</span>
                <span className="font-bold text-slate-800">{anularModal.row.secuencial_factura}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Cliente:</span>
                <span className="font-semibold text-slate-700">{anularModal.row.nombre_cliente_factura}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total:</span>
                <span className="font-bold text-slate-800">${parseFloat(anularModal.row.total_factura || 0).toFixed(2)}</span>
              </div>
            </div>
          )}
          {anularModal.type === 'pendientes' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              ¿Anular todas las facturas pendientes?
            </div>
          )}
          {anularModal.type === 'seleccionadas' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              ¿Anular <strong>{anularModal.count}</strong> factura(s) seleccionadas?
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Motivo de anulación *
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describa el motivo..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setAnularModal({ open: false, type: null, row: null, count: 0 }); setMotivo(''); }}
              className="h-9 px-4 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarAnulacion}
              disabled={anulando || !motivo.trim()}
              className="h-9 px-4 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {anulando ? <><i className="fas fa-spinner fa-spin"></i> Anulando...</> : <><i className="fas fa-ban"></i> Anular</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
