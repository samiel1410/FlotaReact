import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useListado } from '../../hooks/useListado';
import { api } from '../../config/axios';
import Modal from './Modal';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

/**
 * Componente genérico reutilizable para todas las páginas de listado del sistema.
 * Diseño ultra-compacto: Todo integrado en la cabecera superior para maximizar el espacio del grid.
 */

const getSingular = (text) => {
  if (!text) return '';
  if (/(des|les|nes|ses|res)$/i.test(text)) {
    return text.replace(/es$/i, '');
  }
  return text.replace(/s$/i, '');
};

export const GenericListPage = ({ config }) => {
  const navigate = useNavigate();
  const {
    title = 'Módulo',
    subtitle = '',
    icon = 'fas fa-list',
    iconBg = 'bg-blue-100',
    iconColor = 'text-blue-600',
    endpoint,
    defaultParams = {},
    columns = [],
    filters: filterDefs = [],
    actions = {},
    formComponent: FormComponent,
    customParams
  } = config;

  const { data: rawData, loading, total, page, setPage, fetch, PAGE_SIZE } = useListado(endpoint, defaultParams, customParams);
  const data = Array.isArray(rawData) ? rawData : [];

  const [localFilters, setLocalFilters] = useState(() => {
    const initial = {};
    filterDefs.forEach(f => { initial[f.key] = f.defaultValue ?? ''; });
    return initial;
  });

  useEffect(() => {
    fetch(localFilters, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Mantener la ref actualizada con los últimos valores
    refreshCallbackRef.current = () => {
      fetch(localFilters, page);
      toast.success('Actualizado', {
        duration: 1500,
        style: { borderRadius: '10px', background: '#333', color: '#fff', fontSize: '11px' }
      });
    };
  }, [localFilters, page, fetch]);

  useEffect(() => {
    const handleRefreshList = () => refreshCallbackRef.current && refreshCallbackRef.current();
    window.addEventListener('refresh-list', handleRefreshList);

    const handleSetCajaFilter = (e) => {
      if (e.detail && typeof e.detail === 'object') {
        setLocalFilters(prev => {
          const newFilters = { ...prev, ...e.detail };
          fetch(newFilters, 0);
          return newFilters;
        });
      }
    };
    window.addEventListener('set-caja-filter', handleSetCajaFilter);

    return () => {
      window.removeEventListener('refresh-list', handleRefreshList);
      window.removeEventListener('set-caja-filter', handleSetCajaFilter);
    };
  }, [fetch]);

  const handleSearch = () => { fetch(localFilters, 0); };
  const handlePrev  = () => { const p = Math.max(0, page - 1); setPage(p); fetch(localFilters, p); };
  const handleNext  = () => { const p = page + 1; setPage(p); fetch(localFilters, p); };

  const handleRefresh = async () => {
    await fetch(localFilters, page);
    toast.success('Actualizado', {
      duration: 1500,
      style: { borderRadius: '10px', background: '#333', color: '#fff', fontSize: '11px' }
    });
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [iframeModal, setIframeModal] = useState({ open: false, url: '', title: 'Documento' });
  const [customModal, setCustomModal] = useState({ open: false, component: null, props: {}, title: '', width: 'max-w-5xl' });

  const openCustomModal = (component, props, title, width = 'max-w-5xl') => setCustomModal({ open: true, component, props, title, width });
  const closeCustomModal = () => setCustomModal({ open: false, component: null, props: {}, title: '', width: 'max-w-5xl' });

  // Ref para evitar stale closure en el event listener refresh-list
  const refreshCallbackRef = useRef();

  const handleCreate = () => { setSelectedRecord(null); setIsModalOpen(true); };
  const handleEdit = (record) => { setSelectedRecord(record); setIsModalOpen(true); };

  const handleDelete = (row) => {
    const idField = config.idField || 'id';
    const deleteEndpoint = config.deleteEndpoint;

    if (!deleteEndpoint) {
      toast.error('Endpoint de eliminación no configurado');
      return;
    }

    Swal.fire({
      title: '¿Eliminar registro?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
    }).then((result) => {
      if (result.isConfirmed) {
        toast.promise(
          api.post(deleteEndpoint, { id: row[idField], [idField]: row[idField] }),
          {
            loading: 'Eliminando...',
            success: (res) => {
              // Éxito real: success=true Y (tipo=1 ó sin tipo definido)
              // Algunos endpoints devuelven success=true con tipo=3 (bloqueado por dependencia)
              const isRealSuccess = res.data.success && (res.data.tipo === undefined || res.data.tipo === 1);
              if (isRealSuccess) {
                handleSearch();
                return 'Eliminado correctamente';
              }
              throw new Error(res.data.message || res.data.mensaje || 'No se pudo eliminar');
            },
            error: (err) => `Error: ${err.message || 'Error de servidor'}`
          }
        );
      }
    });
  };

  const handleModalClose = () => { setIsModalOpen(false); setSelectedRecord(null); };
  const handleFormSubmit = () => { handleModalClose(); handleSearch(); };

  // Calcular total real: si total viene del backend úsalo, si no calcula desde data
  const effectiveTotal = total || data.length;
  const totalPages    = Math.max(1, Math.ceil(effectiveTotal / PAGE_SIZE));
  const canPrev       = page > 0;
  const canNext       = page < totalPages - 1;

  const renderCell = (col, row) => {
    let value = row[col.key];
    
    // Si el valor es undefined, intentar buscar en llaves alternativas comunes para estados
    if (col.renderType === 'status' && value === undefined) {
      value = row.estado ?? row.estado_usuario ?? row.estado_sucursales ?? row.estado_rol ?? row.estado_buses;
    }

    if (col.renderType === 'status') {
      // Normalizar el valor para la comparación
      const normalizedValue = String(value ?? '').trim().toUpperCase();
      const isActive = normalizedValue === 'A' || 
                       normalizedValue === '1' || 
                       value === 1 || 
                       value === true || 
                       normalizedValue === 'ACTIVO' ||
                       normalizedValue === 'S'; // 'S' de 'Sí' en algunos sistemas legados
      
      return (
        <span className={`px-2 py-0.5 rounded-lg text-[9px] uppercase font-black flex items-center gap-1 w-max border ${isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
          <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      );
    }
    if (col.render) return col.render(value, row);
    return value ?? <span className="text-slate-300">—</span>;
  };

  return (
    <div className="flex flex-col h-full gap-2 p-0 bg-slate-100/50">
      
      {/* ── CABECERA INTEGRADA ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        
        {/* Fila Superior: Título + Botones Principales */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-sm border border-white`}>
              <i className={`${icon} text-sm`}></i>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">{title}</h1>
              {subtitle && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {actions.bulkActions && actions.bulkActions.map(action => (
              <button
                key={action.id}
                onClick={() => action.handler && action.handler({ openCustomModal, closeCustomModal, refreshList: handleRefresh })}
                disabled={loading}
                className={`h-8 px-3 flex items-center gap-2 ${action.color || 'bg-slate-100 text-slate-700 hover:bg-slate-200'} rounded-lg border border-slate-200 transition-all active:scale-95 disabled:opacity-50 text-[10px] font-bold`}
              >
                {action.icon && <i className={`${action.icon}`}></i>}
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="h-8 px-3 flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-all active:scale-95 disabled:opacity-50 text-[10px] font-bold"
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
              <span className="hidden sm:inline">ACTUALIZAR</span>
            </button>
            
            {actions.create && FormComponent && (
              <button
                onClick={handleCreate}
                className="h-8 px-4 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md shadow-indigo-100 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest"
              >
                <i className="fas fa-plus"></i>
                NUEVO {getSingular(title)}
              </button>
            )}
          </div>
        </div>

        {/* Fila Inferior: Filtros de Búsqueda (Horizontal) */}
        {filterDefs.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400 mr-2">
              <i className="fas fa-filter text-[10px]"></i>
              <span className="text-[9px] font-black uppercase tracking-tighter">Filtros:</span>
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-3">
              {filterDefs.map(f => (
                <div key={f.key} className="flex items-center gap-2 min-w-[140px]">
                  {f.type === 'select' ? (
                    <select
                      value={localFilters[f.key]}
                      onChange={e => setLocalFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full h-8 px-2 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white font-bold text-slate-700"
                    >
                      <option value="">{f.label}: Todos</option>
                      {(f.options || []).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type || 'text'}
                      placeholder={`${f.label}...`}
                      value={localFilters[f.key]}
                      onChange={e => setLocalFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      className="w-full h-8 px-2 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-normal"
                    />
                  )}
                </div>
              ))}
              
              <button
                onClick={handleSearch}
                disabled={loading}
                className="h-8 px-4 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black rounded-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70 uppercase tracking-widest shadow-sm"
              >
                <i className="fas fa-search"></i>
                BUSCAR
              </button>
              
              <button
                onClick={() => {
                  const reset = {};
                  filterDefs.forEach(f => { reset[f.key] = ''; });
                  setLocalFilters(reset);
                  fetch(reset, 0);
                }}
                className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="Limpiar"
              >
                <i className="fas fa-eraser text-xs"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CUERPO: GRID DE DATOS ─────────────────────────────────────────────── */}
      <div className="flex-1 bg-white flex flex-col overflow-hidden min-h-0 relative">
        <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-[1] border-b border-slate-200">
              <tr>
                <th className="py-2 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-10 text-center">#</th>
                {columns.map(col => (
                  <th key={col.key} className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                {(actions.edit || actions.delete || (actions.custom && actions.custom.length > 0)) && (
                  <th className="py-2 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">
                    ACCIONES
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(15).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="py-2 px-4"><Skeleton height={12} /></td>
                    {columns.map(col => (
                      <td key={col.key} className="py-2 px-3"><Skeleton height={12} /></td>
                    ))}
                    <td className="py-2 px-4"><Skeleton height={12} /></td>
                  </tr>
                ))
              ) : data.length > 0 ? (
                data.map((row, i) => {
                  const rowId = row.id || row.id_buses || row.id_rutas || row.id_viajes || row.id_usuario || row.id_caja || row.id_sucursal || row.id_rol || row.id_personal || row.id_boleto || row.id_destino || row.id_canton || row.id_provincia || row.id_lugar || row.id_sub_rutas || row.id_cliente || row.id_convenio || row.id_inventario || row.id_forma_pago || row.id_tipo_cobro || row.id_comprobante || row.id_reserva || row.id_anulacion || row.id_banco || `row-${i}`;
                  return (
                    <tr key={rowId} className="group hover:bg-indigo-50/30 transition-all duration-75">
                    <td className="py-2 px-4 text-slate-400 font-mono text-[9px] text-center group-hover:text-indigo-500 transition-colors">
                      {page * PAGE_SIZE + i + 1}
                    </td>
                    {columns.map(col => (
                      <td key={col.key} className="py-2 px-3 text-slate-700 font-bold text-[11px] uppercase tracking-tight">
                        {renderCell(col, row)}
                      </td>
                    ))}
                    {(actions.edit || actions.delete || (actions.custom && actions.custom.length > 0)) && (
                      <td className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                          {actions.custom && actions.custom.filter(action => !action.showIf || action.showIf(row)).map(action => (
                            <button
                              key={action.id}
                              onClick={() => {
                                if (action.modal) {
                                  const url = typeof action.modal === 'function' ? action.modal(row) : action.modal;
                                  if (url) {
                                    setIframeModal({ open: true, url, title: action.modalTitle || 'Documento' });
                                  }
                                }
                                if (action.handler) action.handler(row, { openCustomModal, closeCustomModal, refreshList: handleRefresh, navigate });
                              }}
                              className={`w-7 h-7 rounded-lg bg-white border border-slate-200 ${action.color || 'text-slate-600'} hover:border-slate-300 hover:shadow-sm flex items-center justify-center transition-all hover:scale-110`}
                              title={action.tooltip}
                            >
                              <i className={`${action.icon} text-[10px]`}></i>
                            </button>
                          ))}
                          {actions.edit && (
                            <button 
                              onClick={() => handleEdit(row)}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-amber-600 hover:border-amber-200 hover:bg-amber-50 flex items-center justify-center transition-all hover:scale-110"
                              title="Editar"
                            >
                              <i className="fas fa-pen text-[10px]"></i>
                            </button>
                          )}
                          {actions.delete && (
                            <button 
                              onClick={() => handleDelete(row)}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all hover:scale-110"
                              title="Eliminar"
                            >
                              <i className="fas fa-trash text-[10px]"></i>
                            </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length + 2} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fas fa-folder-open text-xl text-slate-200"></i>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin registros</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Paginador Compacto */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {effectiveTotal > 0 ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, effectiveTotal)} DE ${effectiveTotal}` : '0 REGISTROS'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={!canPrev || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 transition-all active:scale-90"
            >
              <i className="fas fa-chevron-left text-[8px]"></i>
            </button>
            <div className="px-3 h-7 flex items-center justify-center bg-white rounded-lg border border-slate-200 text-[9px] font-black text-slate-700 min-w-[80px] uppercase tracking-tighter">
              PÁG {page + 1} / {totalPages || 1}
            </div>
            <button
              onClick={handleNext}
              disabled={!canNext || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 transition-all active:scale-90"
            >
              <i className="fas fa-chevron-right text-[8px]"></i>
            </button>
          </div>
        </div>
      </div>

      {FormComponent && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={handleModalClose}
          title={selectedRecord ? `EDITAR ${getSingular(title).toUpperCase()}` : `NUEVO ${getSingular(title).toUpperCase()}`}
          width="max-w-4xl"
        >
          <FormComponent initialData={selectedRecord} onSubmit={handleFormSubmit} onCancel={handleModalClose} />
        </Modal>
      )}

      {iframeModal.open && (
        <Modal isOpen={true} onClose={() => setIframeModal({ open: false, url: '', title: 'Documento' })} title={iframeModal.title} width="max-w-6xl">
          <iframe src={iframeModal.url} className="w-full h-[80vh] border-0 rounded-lg" title={iframeModal.title} />
        </Modal>
      )}

      {customModal.open && customModal.component && (
        <Modal isOpen={true} onClose={closeCustomModal} title={customModal.title} width={customModal.width}>
          {React.createElement(customModal.component, {
            ...customModal.props,
            onClose: closeCustomModal,
            onCancel: closeCustomModal
          })}
        </Modal>
      )}
    </div>
  );
};
