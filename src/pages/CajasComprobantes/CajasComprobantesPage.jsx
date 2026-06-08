import { useState } from 'react';
import { useListado } from '../../hooks/useListado';
import Swal from 'sweetalert2';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import { api } from '../../config/axios';

// ─── CONFIGURACIÓN DE CADA TAB ───────────────────────────────────────────────
const TABS = [
  {
    id: 'encomiendas',
    label: 'Encomiendas',
    icon: 'fas fa-box',
    endpoint: '/caja/listadoCaja',
    customParams: (page, pageSize, filters) => ({
      desde: filters.desde || '',
      hasta: filters.hasta || '',
      estado: filters.estado || '',
      apertura: filters.apertura || '',
      page: page + 1,
      limit: pageSize,
    }),
    columns: [
      { key: 'numero_caja', label: '#' },
      { key: 'fecha_caja', label: 'FECHA', render: v => v ? v.split(' ')[0] : '-' },
      { key: 'nombre_sucursal', label: 'SUCURSAL', render: v => v || '-' },
      { key: 'usuario', label: 'USUARIO', render: v => v || '-' },
      {
        key: 'estado_caja', label: 'ESTADO',
        render: v => {
          const ap = v === 'APERTURADA';
          return (
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${ap ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {v || 'CERRADA'}
            </span>
          );
        }
      },
      { key: 'apertura_total_caja', label: '($)APERTURA', render: v => `$${parseFloat(v||0).toFixed(2)}` },
      { key: 'cierre_total_caja', label: '($)CIERRE', render: v => v ? `$${parseFloat(v).toFixed(2)}` : '-' },
      { key: 'numero_comprobante_cierre', label: 'COMPROBANTE', render: v => v || '-' },
      { key: 'banco_cierre', label: 'BANCO', render: v => v || '-' },
    ],
  },
  {
    id: 'boleteria',
    label: 'Boletería',
    icon: 'fas fa-ticket-alt',
    endpoint: '/caja_boleteria/listadoCaja',
    customParams: (page, pageSize, filters) => ({
      desde: filters.desde || '',
      hasta: filters.hasta || '',
      estado: filters.estado || '',
      apertura: filters.apertura || '',
      page: page + 1,
      limit: pageSize,
    }),
    columns: [
      { key: 'numero_caja', label: '#' },
      { key: 'fecha_caja', label: 'FECHA', render: v => v ? v.split(' ')[0] : '-' },
      { key: 'nombre_sucursal', label: 'SUCURSAL', render: v => v || '-' },
      { key: 'usuario', label: 'USUARIO', render: v => v || '-' },
      {
        key: 'estado_caja', label: 'ESTADO',
        render: v => {
          const ap = v === 'APERTURADA';
          return (
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${ap ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {v || 'CERRADA'}
            </span>
          );
        }
      },
      { key: 'apertura_total_caja', label: '($)APERTURA', render: v => `$${parseFloat(v||0).toFixed(2)}` },
      { key: 'cierre_total_caja', label: '($)CIERRE', render: v => v ? `$${parseFloat(v).toFixed(2)}` : '-' },
      { key: 'numero_comprobante_cierre', label: 'COMPROBANTE', render: v => v || '-' },
      { key: 'banco_cierre', label: 'BANCO', render: v => v || '-' },
    ],
  },
  {
    id: 'retenciones',
    label: 'Retenciones',
    icon: 'fas fa-file-invoice',
    endpoint: '/cajaretenciones/listadoCajaComprobantes',
    customParams: (page, pageSize, filters) => ({
      desde: filters.desde || '',
      hasta: filters.hasta || '',
      estado: filters.estado || '',
      apertura: filters.apertura || '',
      page: page + 1,
      limit: pageSize,
    }),
    columns: [
      { key: 'numero_caja', label: '#', render: (v, r) => v || r.id_caja_retenciones || '-' },
      { key: 'fecha_caja', label: 'FECHA', render: v => v ? v.split(' ')[0] : '-' },
      { key: 'fecha_hora_cierre', label: 'F.CIERRE', render: v => v ? v.split(' ')[0] : '-' },
      { key: 'nombre_sucursal', label: 'SUCURSAL', render: v => v || '-' },
      { key: 'usuario', label: 'USUARIO', render: v => v || '-' },
      {
        key: 'estado_caja', label: 'ESTADO',
        render: (v, r) => {
          const val = v || (r.fecha_hora_cierre ? 'CERRADA' : 'APERTURADA');
          const ap = val === 'APERTURADA';
          return (
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${ap ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {val}
            </span>
          );
        }
      },
      { key: 'horas_desde_cierre', label: 'HRS CIERRE', render: v => v || '-' },
      { key: 'apertura_total_caja', label: '($)APERTURA', render: v => `$${parseFloat(v||0).toFixed(2)}` },
      { key: 'cierre_total_caja', label: '($)CIERRE', render: v => v ? `$${parseFloat(v).toFixed(2)}` : '-' },
      { key: 'numero_comprobante_cierre', label: 'COMPROBANTE', render: v => v || '-' },
      { key: 'banco_cierre', label: 'BANCO', render: v => v || '-' },
    ],
  },
];

// ─── SUBCOMPONENTE: TAB CONTENT ──────────────────────────────────────────────
const getComprobanteEndpoint = (tabId) => {
  switch (tabId) {
    case 'encomiendas': return '/caja/guardarInfoComprobante';
    case 'boleteria': return '/caja_boleteria/guardarInfoComprobante';
    case 'retenciones': return '/cajaretenciones/guardarInfoComprobante';
    default: return '/caja/guardarInfoComprobante';
  }
};

const getIdField = (tabId) => {
  switch (tabId) {
    case 'retenciones': return 'id_caja_retenciones';
    default: return 'id_caja';
  }
};

const TabContent = ({ tab }) => {
  const { id: tabId, endpoint, columns, customParams } = tab;
  const { data: rawData, loading, total, page, setPage, fetch, PAGE_SIZE } = useListado(endpoint, {}, customParams);
  const data = Array.isArray(rawData) ? rawData : [];

  const [filters, setFilters] = useState({ desde: '', hasta: '', estado: '' });

  // Estado para modales
  const [showComprobanteModal, setShowComprobanteModal] = useState(false);
  const [showImagenModal, setShowImagenModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [comprobanteNum, setComprobanteNum] = useState('');
  const [comprobanteBanco, setComprobanteBanco] = useState('');
  const [savingComprobante, setSavingComprobante] = useState(false);
  const [imagenUrl, setImagenUrl] = useState('');

  const handleSearch = () => { fetch(filters, 0); };
  const handlePrev = () => { const p = Math.max(0, page - 1); setPage(p); fetch(filters, p); };
  const handleNext = () => { const p = page + 1; setPage(p); fetch(filters, p); };

  const handleLimpiar = () => {
    const reset = { desde: '', hasta: '', estado: '' };
    setFilters(reset);
    fetch(reset, 0);
  };

  const handleCajaAperturada = () => {
    const f = { ...filters, apertura: '1' };
    fetch(f, 0);
  };

  // ── Info Comprobante (Modal React) ────────────────────────
  const handleOpenComprobante = (row) => {
    setSelectedRow(row);
    setComprobanteNum(row.numero_comprobante_cierre || '');
    setComprobanteBanco(row.banco_cierre || '');
    setShowComprobanteModal(true);
  };

  const handleGuardarComprobante = async () => {
    if (!selectedRow) return;
    setSavingComprobante(true);
    try {
      const idField = getIdField(tabId);
      const payload = {
        id_caja: selectedRow[idField],
        numero_comprobante: comprobanteNum,
        banco: comprobanteBanco,
      };
      const endpoint = getComprobanteEndpoint(tabId);
      const res = await api.post(endpoint, payload);
      if (res.data?.success) {
        toast.success('Comprobante guardado');
        setShowComprobanteModal(false);
        fetch(filters, page);
      } else {
        toast.error(res.data?.mensaje || 'Error al guardar');
      }
    } catch {
      toast.error('Error al guardar comprobante');
    } finally {
      setSavingComprobante(false);
    }
  };

  // ── Ver Imagen (Modal React) ──────────────────────────────
  const handleVerImagen = (row) => {
    const ruta = row.ruta_imagen_comprobante_cierre;
    if (!ruta) {
      Swal.fire('Info', 'No hay imagen disponible', 'info');
      return;
    }
    const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
    setImagenUrl(baseUrl + '/' + ruta);
    setSelectedRow(row);
    setShowImagenModal(true);
  };

  const effectiveTotal = total || data.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / PAGE_SIZE));
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  const renderCell = (col, row) => {
    const value = row[col.key];
    if (col.render) return col.render(value, row);
    return value ?? <span className="text-slate-300">—</span>;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── FILTROS ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-white">
        <div className="flex items-center gap-1.5 text-slate-400">
          <i className="fas fa-filter text-[10px]"></i>
          <span className="text-[9px] font-black uppercase tracking-tighter">Filtros:</span>
        </div>

        <input
          type="date"
          value={filters.desde}
          onChange={e => setFilters(p => ({ ...p, desde: e.target.value }))}
          className="h-8 px-2 text-[10px] border border-slate-200 rounded-lg font-bold text-slate-700 w-[160px]"
        />
        <input
          type="date"
          value={filters.hasta}
          onChange={e => setFilters(p => ({ ...p, hasta: e.target.value }))}
          className="h-8 px-2 text-[10px] border border-slate-200 rounded-lg font-bold text-slate-700 w-[160px]"
        />
        <select
          value={filters.estado}
          onChange={e => setFilters(p => ({ ...p, estado: e.target.value }))}
          className="h-8 px-2 text-[10px] border border-slate-200 rounded-lg font-bold text-slate-700 w-[150px]"
        >
          <option value="">Estado: TODOS</option>
          <option value="APERTURADA">APERTURADA</option>
          <option value="CERRADA">CERRADA</option>
        </select>

        <button onClick={handleSearch} disabled={loading}
          className="h-8 px-4 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black rounded-lg flex items-center gap-2 active:scale-95 disabled:opacity-70 uppercase tracking-widest"
        >
          <i className="fas fa-search"></i> BUSCAR
        </button>
        <button onClick={handleLimpiar}
          className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
          title="Limpiar"
        >
          <i className="fas fa-eraser text-xs"></i>
        </button>
        <button onClick={handleCajaAperturada}
          className="h-8 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-black rounded-lg flex items-center gap-2 active:scale-95 uppercase"
        >
          <i className="fas fa-cash-register"></i> Caja Aperturada
        </button>
      </div>

      {/* ── GRID ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-white flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-[1] border-b border-slate-200">
              <tr>
                <th className="py-2 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-10 text-center">#</th>
                {columns.map(col => (
                  <th key={col.key} className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                <th className="py-2 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">COMP</th>
                <th className="py-2 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">IMG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="py-2 px-4"><Skeleton height={12} /></td>
                    {columns.map(col => (
                      <td key={col.key} className="py-2 px-3"><Skeleton height={12} /></td>
                    ))}
                    <td className="py-2 px-4"><Skeleton height={12} /></td>
                    <td className="py-2 px-4"><Skeleton height={12} /></td>
                  </tr>
                ))
              ) : data.length > 0 ? (
                data.map((row, i) => (
                  <tr key={i} className="group hover:bg-indigo-50/30 transition-all">
                    <td className="py-2 px-4 text-slate-400 font-mono text-[9px] text-center">{page * PAGE_SIZE + i + 1}</td>
                    {columns.map(col => (
                      <td key={col.key} className="py-2 px-3 text-slate-700 font-bold text-[11px] uppercase tracking-tight">
                        {renderCell(col, row)}
                      </td>
                    ))}
                    <td className="py-2 px-4 text-center">
                      <button
                        onClick={() => handleOpenComprobante(row)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 flex items-center justify-center transition-all hover:scale-110"
                        title="Info Comprobante"
                      >
                        <i className="fas fa-vote-yea text-[10px]"></i>
                      </button>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <button
                        onClick={() => handleVerImagen(row)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-blue-600 hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center transition-all hover:scale-110"
                        title="Ver Imagen"
                      >
                        <i className="fas fa-image text-[10px]"></i>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 3} className="py-12 text-center">
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

        {/* Paginador */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {effectiveTotal > 0
              ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, effectiveTotal)} DE ${effectiveTotal}`
              : '0 REGISTROS'}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={handlePrev} disabled={!canPrev || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 transition-all active:scale-90"
            ><i className="fas fa-chevron-left text-[8px]"></i></button>
            <div className="px-3 h-7 flex items-center justify-center bg-white rounded-lg border border-slate-200 text-[9px] font-black text-slate-700 min-w-[80px] uppercase tracking-tighter">
              PÁG {page + 1} / {totalPages || 1}
            </div>
            <button onClick={handleNext} disabled={!canNext || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 transition-all active:scale-90"
            ><i className="fas fa-chevron-right text-[8px]"></i></button>
          </div>
        </div>
      </div>
      {/* ── MODAL: Info Comprobante ──────────────────────────────── */}
      <Modal isOpen={showComprobanteModal} onClose={() => { setShowComprobanteModal(false); setSelectedRow(null); }}
        title={`Info Comprobante — Caja #${selectedRow?.numero_caja || selectedRow?.id_caja_retenciones || ''}`} width="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">N° Comprobante</label>
            <input type="text" value={comprobanteNum}
              onChange={e => setComprobanteNum(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              placeholder="Ingrese número de comprobante..." />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Banco</label>
            <input type="text" value={comprobanteBanco}
              onChange={e => setComprobanteBanco(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              placeholder="Ingrese nombre del banco..." />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button onClick={() => { setShowComprobanteModal(false); setSelectedRow(null); }}
              className="px-4 py-2 text-[10px] font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all uppercase tracking-wider">
              Cancelar
            </button>
            <button onClick={handleGuardarComprobante} disabled={savingComprobante}
              className="px-4 py-2 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-all uppercase tracking-wider flex items-center gap-1.5">
              {savingComprobante ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}
              Guardar
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: Ver Imagen Comprobante ──────────────────────────── */}
      <Modal isOpen={showImagenModal} onClose={() => { setShowImagenModal(false); setSelectedRow(null); setImagenUrl(''); }}
        title={`Comprobante: ${selectedRow?.numero_comprobante_cierre || 'S/N'}`} width="max-w-xl">
        <div className="flex items-center justify-center">
          {imagenUrl && (
            <img src={imagenUrl} alt="Comprobante" className="max-w-full max-h-[70vh] rounded-lg object-contain" />
          )}
        </div>
      </Modal>
    </div>
  );
};

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export const CajasComprobantesPage = () => {
  const [activeTab, setActiveTab] = useState('retenciones');

  const currentTab = TABS.find(t => t.id === activeTab) || TABS[2];

  return (
    <div className="flex flex-col h-full gap-0 p-0 bg-slate-100/50">
      {/* ── CABECERA ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
              <i className="fas fa-cash-register text-sm"></i>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Cajas Comprobantes</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Cuadre de cajas con comprobantes</p>
            </div>
          </div>
        </div>

        {/* ── TABS ───────────────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-200 px-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-700 bg-amber-50/50'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
            >
              <i className={`${tab.icon} text-xs`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENIDO DEL TAB ACTIVO ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 p-2">
        <TabContent key={activeTab} tab={currentTab} />
      </div>
    </div>
  );
};

export default CajasComprobantesPage;
