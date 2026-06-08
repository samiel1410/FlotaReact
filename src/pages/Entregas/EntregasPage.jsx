import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { EntregaService } from '../../services/entrega.service';
import { CobrarEntregarModal } from './components/CobrarEntregarModal';
import { ConfirmarEntregaModal } from './components/ConfirmarEntregaModal';

const PAGE_SIZE = 25;

export const EntregasPage = () => {
  // ─── Estado principal ──────────────────────────────────────
  const [guias, setGuias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // ─── Filtros ───────────────────────────────────────────────
  const [filtros, setFiltros] = useState({
    cedula_remitente: '',
    cedula_destinatario: '',
    nombre_remitente: '',
    nombre_destinatario: '',
    mes: '',
    anio: '',
    fechaini: '',
    fechalast: '',
    numeroguia: '',
    estado: '0'
  });

  // ─── Modal state ───────────────────────────────────────────
  const [selectedGuia, setSelectedGuia] = useState(null);
  const [modalType, setModalType] = useState(null); // 'cobrar' | 'confirmar'

  // ─── Fetch data ────────────────────────────────────────────
  const cargarGuias = useCallback(async (pageNum = 1, filtrosActuales = null) => {
    setLoading(true);
    try {
      const f = filtrosActuales || filtros;
      const params = {
        rucremitente: f.cedula_remitente || '',
        rucreceptor: f.cedula_destinatario || '',
        nombreremitente: f.nombre_remitente || '',
        nombrereceptor: f.nombre_destinatario || '',
        fechaini: f.fechaini || '',
        fechalast: f.fechalast || '',
        mes: f.mes || '',
        anio: f.anio || '',
        estado: f.estado || '0',
        numeroguia: f.numeroguia || '',
        idusuario: '',
        page: pageNum,
        limit: PAGE_SIZE
      };
      const res = await EntregaService.listar(params);
      if (res?.success) {
        setGuias(res.data || []);
        setTotal(res.total || 0);
        setPage(pageNum);
      } else {
        setGuias([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Error cargando guías:', error);
      toast.error('Error al cargar guías');
      setGuias([]);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarGuias(1);
  }, []);

  // ─── Handlers de filtros ───────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  };

  const handleBuscar = () => {
    cargarGuias(1, filtros);
  };

  const handleRefrescar = () => {
    const limpio = {
      cedula_remitente: '', cedula_destinatario: '', nombre_remitente: '',
      nombre_destinatario: '', mes: '', anio: '', fechaini: '', fechalast: '',
      numeroguia: '', estado: '0'
    };
    setFiltros(limpio);
    cargarGuias(1, limpio);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    cargarGuias(newPage);
  };

  // ─── Acción: Entregar Guía (flujo completo) ────────────────
  const handleEntregarGuia = async (guia) => {
    // Validaciones rápidas
    if (String(guia.estado_guias_entregadas) === '2') {
      toast.error('Esta guía ya se encuentra entregada');
      return;
    }
    if (String(guia.estado_oficina) === '1') {
      toast.error('Esta guía se encuentra en otra oficina, no puede entregar');
      return;
    }

    try {
      // 1. Verificar anulación
      const anulRes = await EntregaService.verificarAnulacion(guia.id_guia);
      const msg = anulRes?.message;
      if (msg === 2) { toast.error('La guía se encuentra anulada'); return; }
      if (msg === 3) { toast.error('La guía está pendiente de anulación'); return; }

      // 2. Verificar factura autorizada
      const factRes = await EntregaService.autorizadoFacturaPorGuia(guia.id_guia);
      if (!factRes?.data || factRes.data.length === 0) {
        toast.error('Esta guía no tiene una factura asociada');
        return;
      }
      const factData = factRes.data[0];
      const totalFactura = parseFloat(factData.total_factura || 0);

      // 3. Verificar suma ya cobrada
      let cobrado = 0;
      try {
        const sumRes = await EntregaService.facturaidguicobradasuma(guia.id_guia);
        // El backend devuelve { success: true, data: [{ total_factura: X }] }
        // o también puede devolver { success: true, data: X } (número directo)
        if (sumRes?.data) {
          if (Array.isArray(sumRes.data)) {
            cobrado = parseFloat(sumRes.data[0]?.total_factura || 0);
          } else if (typeof sumRes.data === 'object') {
            cobrado = parseFloat(sumRes.data.total_factura || 0);
          } else {
            cobrado = parseFloat(sumRes.data || 0);
          }
        }
      } catch (e) {
        console.warn('Error obteniendo suma cobrada:', e);
      }

      const pendiente = totalFactura - cobrado;

      if (pendiente <= 0) {
        // No hay cobro pendiente → entrega simple
        setSelectedGuia(guia);
        setModalType('confirmar');
      } else {
        // Hay cobro pendiente → validar caja
        const cajaRes = await EntregaService.validarCaja();
        if (cajaRes?.message === 1 || cajaRes?.success) {
          setSelectedGuia(guia);
          setModalType('cobrar');
        } else {
          toast.error('No hay una caja aperturada. Debe aperturar una caja primero.');
        }
      }
    } catch (err) {
      console.error('Error al verificar guía:', err);
      toast.error('Error al verificar la guía');
    }
  };

  // ─── Acción: PDF ───────────────────────────────────────────
  const handlePdf = async (guia) => {
    try {
      const userRes = await EntregaService.buscarUsuario();
      if (!userRes?.success) {
        toast.error('No se pudo obtener información del usuario');
        return;
      }
      const idUsuario = userRes.data.id_usuario;

      const pdfRes = await EntregaService.generarPdfEntrega(guia.id_guia, idUsuario);
      if (pdfRes?.success && pdfRes?.ruta) {
        const url = `${window.location.origin}/php/tmp/${pdfRes.ruta}`;
        window.open(url, 'PDF_Entrega', 'width=800,height=600');
      } else {
        toast.error('Error al generar PDF');
      }
    } catch (err) {
      console.error('Error PDF:', err);
      toast.error('Error al generar PDF');
    }
  };

  const handleModalSuccess = () => {
    cargarGuias(page);
  };

  // ─── Paginación ────────────────────────────────────────────
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ─── Render helpers ────────────────────────────────────────
  const formatNumeroGuia = (numero) => {
    if (!numero) return '';
    const s = String(numero);
    if (s.length >= 10) {
      return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
    }
    return s;
  };

  const renderClienteRemitente = (g) => (
    <div className="text-[11px] leading-tight">
      <div className="text-slate-500"><b>RUC:</b> {g.cedula_cliente_remitente || '-'}</div>
      <div className="text-slate-700"><b>Razón:</b> {g.nombre_cliente_remitente || '-'}</div>
    </div>
  );

  const renderClienteDestinatario = (g) => (
    <div className="text-[11px] leading-tight">
      <div className="text-slate-500"><b>RUC:</b> {g.cedula_cliente_receptor || '-'}</div>
      <div className="text-slate-700"><b>Razón:</b> {g.nombre_cliente_receptor || '-'}</div>
    </div>
  );

  const renderEstadoOficina = (g) => {
    const val = String(g.estado_oficina);
    if (val === '1') return <i className="fas fa-map-marker-alt text-red-500" title="ESTA EN OTRA OFICINA"></i>;
    if (val === '0') return <i className="fas fa-map-marker-alt text-green-500" title="ESTA EN ESTA OFICINA"></i>;
    if (val === '2') return <i className="fas fa-map-marker-alt text-orange-500" title="ANTIGUA"></i>;
    return null;
  };

  const renderEstadoEntrega = (g) => {
    if (String(g.estado_guias_entregadas) === '2')
      return <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">ENTREGADO</span>;
    return <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full">PENDIENTE</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── TITLE ─── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <i className="fas fa-hand-holding-usd text-green-500"></i>
          GUIAS ENTREGADAS
          <span className="text-sm font-normal text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            {total} registro{total !== 1 ? 's' : ''}
          </span>
        </h1>
      </div>

      {/* ─── FILTROS ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-search text-blue-500 text-xs"></i>
            Búsqueda de Entregados
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Ced. Remitente</label>
              <input
                type="text" value={filtros.cedula_remitente}
                onChange={e => handleFilterChange('cedula_remitente', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Ced. Destinatario</label>
              <input
                type="text" value={filtros.cedula_destinatario}
                onChange={e => handleFilterChange('cedula_destinatario', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Remitente</label>
              <input
                type="text" value={filtros.nombre_remitente}
                onChange={e => handleFilterChange('nombre_remitente', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Destinatario</label>
              <input
                type="text" value={filtros.nombre_destinatario}
                onChange={e => handleFilterChange('nombre_destinatario', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mes</label>
              <select
                value={filtros.mes}
                onChange={e => handleFilterChange('mes', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">Todos</option>
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                  <option key={m} value={m}>{
                    ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][parseInt(m)-1]
                  }</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Año</label>
              <select
                value={filtros.anio}
                onChange={e => handleFilterChange('anio', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">Todos</option>
                {[2019,2020,2021,2022,2023,2024,2025,2026].map(a => (
                  <option key={a} value={String(a)}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Desde</label>
              <input
                type="date" value={filtros.fechaini}
                onChange={e => handleFilterChange('fechaini', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Hasta</label>
              <input
                type="date" value={filtros.fechalast}
                onChange={e => handleFilterChange('fechalast', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">N° Guía</label>
              <input
                type="text"
                value={filtros.numeroguia}
                onChange={e => {
                  let val = e.target.value.replace(/[^0-9-]/g, '');
                  const nums = val.replace(/-/g, '');
                  if (nums.length === 3) val = nums + '-';
                  else if (nums.length > 3 && nums.length <= 6) val = nums.slice(0,3) + '-' + nums.slice(3);
                  else if (nums.length > 6) val = nums.slice(0,3) + '-' + nums.slice(3,6) + '-' + nums.slice(6,15);
                  handleFilterChange('numeroguia', val);
                }}
                placeholder="001-001-000000000" maxLength={17}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Estado</label>
              <select
                value={filtros.estado}
                onChange={e => handleFilterChange('estado', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="0">TODOS</option>
                <option value="1">NO ENTREGADO</option>
                <option value="2">ENTREGADO</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button onClick={handleBuscar} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm text-sm">
                <i className="fas fa-search"></i> Buscar
              </button>
              <button onClick={handleRefrescar} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm" title="Limpiar filtros">
                <i className="fas fa-eraser"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TABLA ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="ml-3 text-sm text-slate-500 font-medium">Cargando guías...</span>
          </div>
        ) : guias.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <i className="fas fa-inbox text-5xl mb-4"></i>
            <p className="text-base font-semibold">Sin datos para mostrar</p>
            <p className="text-sm mt-1">Ajuste los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase text-slate-500 tracking-wider">GUÍA</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase text-slate-500 tracking-wider">CLIENTE REMITENTE</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase text-slate-500 tracking-wider">CLIENTE DESTINATARIO</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase text-slate-500 tracking-wider">SALIDA</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase text-slate-500 tracking-wider">LLEGADA</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase text-slate-500 tracking-wider">TOTAL</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase text-slate-500 tracking-wider">F.CREACIÓN</th>
                  <th className="text-center px-2 py-3 text-[11px] font-bold uppercase text-slate-500 tracking-wider">OFICINA</th>
                  <th className="text-center px-2 py-3 text-[11px] font-bold uppercase text-slate-500 tracking-wider">ESTADO</th>
                  <th className="text-center px-1 py-3 w-[35px]"></th>
                  <th className="text-center px-1 py-3 w-[35px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guias.map((g, idx) => (
                  <tr
                    key={g.id_entregado || g.id_guia || idx}
                    className={`hover:bg-blue-50/50 transition-colors ${String(g.estado_guias_entregadas) === '2' ? 'bg-green-50/40' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">
                      {formatNumeroGuia(g.numero_guia_final)}
                    </td>
                    <td className="px-4 py-3">{renderClienteRemitente(g)}</td>
                    <td className="px-4 py-3">{renderClienteDestinatario(g)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{g.origen_guia || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{g.destino_guia || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700 text-sm">
                      ${parseFloat(g.total_guia || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{g.fecha_guia || '-'}</td>
                    <td className="px-4 py-3 text-center">{renderEstadoOficina(g)}</td>
                    <td className="px-4 py-3 text-center">{renderEstadoEntrega(g)}</td>
                    <td className="px-1 py-3 text-center">
                      {String(g.estado_guias_entregadas) !== '2' && (
                        <button
                          onClick={() => handleEntregarGuia(g)}
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-100 hover:bg-amber-200 text-amber-600 transition-colors"
                          title="Entregar"
                        >
                          <i className="fas fa-cart-arrow-down text-sm"></i>
                        </button>
                      )}
                    </td>
                    <td className="px-1 py-3 text-center">
                      <button
                        onClick={() => handlePdf(g)}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                        title="PDF"
                      >
                        <i className="fas fa-file-pdf text-sm"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── PAGINACIÓN ─── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => handlePageChange(1)} disabled={page <= 1}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <i className="fas fa-angle-double-left"></i>
              </button>
              <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <i className="fas fa-angle-left"></i>
              </button>
              <span className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md">
                {page}
              </span>
              <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <i className="fas fa-angle-right"></i>
              </button>
              <button onClick={() => handlePageChange(totalPages)} disabled={page >= totalPages}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <i className="fas fa-angle-double-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODALES ─── */}
      {modalType === 'cobrar' && selectedGuia && (
        <CobrarEntregarModal
          guia={selectedGuia}
          destinoGuia={selectedGuia.destino_guia}
          onClose={() => { setModalType(null); setSelectedGuia(null); }}
          onSuccess={handleModalSuccess}
        />
      )}

      {modalType === 'confirmar' && selectedGuia && (
        <ConfirmarEntregaModal
          guia={selectedGuia}
          destinoGuia={selectedGuia.destino_guia}
          onClose={() => { setModalType(null); setSelectedGuia(null); }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default EntregasPage;
