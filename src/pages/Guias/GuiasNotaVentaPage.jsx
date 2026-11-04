import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuiasFilterPanel } from './components/GuiasFilterPanel';
import { GuiasGrid } from './components/GuiasGrid';
import { GuiaNotaVentaService as GuiaService } from '../../services/guiaNotaVenta.service';
import { CONFIG } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { buildPdfUrl } from '../../utils/pdfUrlUtils';
import toast from 'react-hot-toast';
import './GuiasPage.css';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import { CobrarFacturaModal } from './components/CobrarFacturaModal';
import { CobrosRealizadosModal } from './components/CobrosRealizadosModal';
import { SeguimientoGuiaModal } from './components/SeguimientoGuiaModal';
import cajaNotaVentaService from '../../services/cajaNotaVenta.service';
import MotivoModal from '../../components/common/MotivoModal';
import { PrintSelectorModal } from './components/PrintSelectorModal';
import Swal from 'sweetalert2';

export const GuiasNotaVentaPage = () => {
  const { user, userRole } = useAuth();
  const rolUsuario = Number(user?.rol_usuario || user?.id_fkrol_usuario || userRole || 0);
  const puedeAprobar = rolUsuario === 1 || rolUsuario === 5;
  const [guias, setGuias] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfTitle, setPdfTitle] = useState('Guía');
  const [pdfShouldShowPrint, setPdfShouldShowPrint] = useState(false);
  // Mini-modal selector de impresión (igual que Impresion.js en ExtJS)
  const [printSelectorOpen, setPrintSelectorOpen] = useState(false);
  const [selectedPrintItem, setSelectedPrintItem] = useState(null);
  
  // Modal de Cobro
  const [cobrarModalOpen, setCobrarModalOpen] = useState(false);
  const [selectedGuiaCobrar, setSelectedGuiaCobrar] = useState(null);

  // Modal de Cobros Realizados
  const [cobrosModalOpen, setCobrosModalOpen] = useState(false);
  const [selectedGuiaCobros, setSelectedGuiaCobros] = useState(null);

  // Modal de Seguimiento
  const [seguimientoModalOpen, setSeguimientoModalOpen] = useState(false);
  const [selectedGuiaSeguimiento, setSelectedGuiaSeguimiento] = useState(null);

  // Estado de filtros y paginación
  const [filtros, setFiltros] = useState({});
  const [page, setPage] = useState(1);
  const limit = 20;
  const navigate = useNavigate();

  const loadGuias = async (currentFiltros, currentPage) => {
    setLoading(true);
    try {
      const params = {
        ...currentFiltros,
        limit,
        page: currentPage
      };
      
      const response = await GuiaService.getGuias(params);
      
      let dataArray = response.data || [];
      if (!Array.isArray(dataArray) && typeof dataArray === 'object') {
        dataArray = Object.values(dataArray);
      }
      if (!Array.isArray(dataArray)) {
        dataArray = [];
      }
      setGuias(dataArray);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error cargando guías:', error);
      toast.error('No se pudo conectar con el servidor para cargar las guías.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadGuias(filtros, page);
  }, [filtros, page]);

  const handleSearch = (nuevosFiltros) => {
    // Mapear nombres del frontend al backend
    const params = {
      rucremitente: nuevosFiltros.cedula_remitente || '',
      rucreceptor: nuevosFiltros.cedula_destinatario || '',
      nombreremitente: nuevosFiltros.nombre_remitente || '',
      nombrereceptor: nuevosFiltros.nombre_destinatario || '',
      fechaini: nuevosFiltros.buscarPorFechaDesde || '',
      fechalast: nuevosFiltros.buscarPorFechaHasta || '',
      mes: nuevosFiltros.comboMes || '0',
      anio: nuevosFiltros.comboAnioFactura || '0',
      factura: nuevosFiltros.numero_factura || '',
      numeroguia: nuevosFiltros.numero_guia || '',
      estado: nuevosFiltros.estado_busqueda || '4',
      idusuario: nuevosFiltros.usuario_busqueda || '',
      numero_guia_manual: nuevosFiltros.numero_guia_manual || '',
      despacho: nuevosFiltros.chechEstadoDespacho ? 'true' : 'false',
      checknumero: nuevosFiltros.checknumero || false
    };
    setFiltros(params);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Action handlers for grid row actions
  const handleViewPdf = (item) => {
    const tenantId = user?.tenant_id || user?.id_tenant || 1;
    const url = `${CONFIG.PHP_URL}/guiaNotaVentaPdf.php?id_guia=${encodeURIComponent(item.id_guia)}&tenantId=${encodeURIComponent(tenantId)}`;
    setPdfTitle(`Guía ${item.numero_guia_final || item.id_guia}`);
    setPdfUrl(url);
    setPdfShouldShowPrint(false);
    setPdfModalOpen(true);
  };

  const handlePrint = (item) => {
    setSelectedPrintItem(item);
    setPrintSelectorOpen(true);
  };

  // Abre el PDF directamente en el modal (no bloqueante: el iframe carga en background).
  // El PdfViewerModal ya muestra spinner hasta el onLoad del iframe.
  const openPhpPdf = (phpUrl, titulo) => {
    const finalUrl = buildPdfUrl(phpUrl);
    setPdfTitle(titulo);
    setPdfUrl(finalUrl);
    setPdfShouldShowPrint(true);
    setPdfModalOpen(true);
  };

  const handlePrintGuia = () => {
    const item = selectedPrintItem;
    setPrintSelectorOpen(false);
    const idUsuario = user?.id_usuario || 0;
    const tenantId = user?.tenant_id || user?.id_tenant || 1;
    const phpUrl = `${CONFIG.PHP_URL}/guiaNotaVentaPdfImpresion.php?id_guia=${encodeURIComponent(item.id_guia)}&id_usuario_global=${encodeURIComponent(idUsuario)}&tenantId=${encodeURIComponent(tenantId)}`;
    openPhpPdf(phpUrl, `Imprimir Guía ${item.numero_guia_final || item.id_guia}`);
  };

  const handlePrintQR = () => {
    const item = selectedPrintItem;
    setPrintSelectorOpen(false);
    const tenantId = user?.tenant_id || user?.id_tenant || 1;
    const phpUrl = `${CONFIG.PHP_URL}/qrNotaVentaPdf.php?id_guia=${encodeURIComponent(item.id_guia)}&tenantId=${encodeURIComponent(tenantId)}`;
    openPhpPdf(phpUrl, `QR Guía ${item.numero_guia_final || item.id_guia}`);
  };

  const handlePrintTicket = () => {
    const item = selectedPrintItem;
    setPrintSelectorOpen(false);
    const idUsuario = user?.id_usuario || 0;
    const tenantId = user?.tenant_id || user?.id_tenant || user?.tenantId || 1;
    const phpUrl = `${CONFIG.PHP_URL}/ticketPdf.php?id_guia=${encodeURIComponent(item.id_guia)}&id_usuario_global=${encodeURIComponent(idUsuario)}&tenantId=${encodeURIComponent(tenantId)}`;
    openPhpPdf(phpUrl, `Ticket Guía ${item.numero_guia_final || item.id_guia}`);
  };

  const handleEdit = async (item) => {
    try {
      // 1. Verificar estado de anulación
      const verif = await GuiaService.verificarAnulacion(item.id_guia);
      const msg = verif.message ?? verif.data?.message;

      if (msg === 2) {
        toast.error('La nota se encuentra anulada');
        return;
      }
      if (msg === 3) {
        toast.error('La nota está pendiente a anular');
        return;
      }

      // 2. Verificar si tiene factura autorizada (bloquea edición SRI)
      try {
        let factVerif = null;
        try {
          factVerif = await GuiaService.autorizadoFacturaPorGuia(item.id_guia);
        } catch (err) {
          factVerif = await GuiaService.verificarFacturaAutorizada(item.id_guia);
        }

        if (factVerif && (factVerif.tipo === 0 || (factVerif.data && factVerif.data.length > 0))) {
          toast.error('Esta nota se encuentra vinculada a una factura autorizada');
          return;
        }
      } catch (e) {
        console.warn('No se pudo verificar factura autorizada', e);
      }

      // 3. Navegar a edición de nota de venta
      navigate(`/notas-venta/editar/${item.id_guia}`);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar la nota para editar');
    }
  };



  // Modal de Anulación (Componente MotivoModal)
  const [anularModalOpen, setAnularModalOpen] = useState(false);
  const [anularModalData, setAnularModalData] = useState(null);

  const handleAnular = async (item) => {
    try {
      // Verificar estado de la guía (ExtJS: verificacionanulacion)
      const verif = await GuiaService.verificarAnulacion(item.id_guia);
      const codeState = Number(verif?.data ?? verif?.code ?? 0);

      if (codeState === 2) {
        toast.error(verif?.message || 'La guía ya se encuentra anulada');
        return;
      }

      if (codeState === 1 || codeState === 3) {
        if (codeState === 3 && !puedeAprobar) {
          toast(verif?.message || 'La guía está pendiente de aprobación por un administrador.', { icon: 'ℹ️' });
          return;
        }

        setAnularModalData({
          item,
          codeState,
          title: codeState === 3 ? 'Aprobar Anulación de Guía' : 'Solicitar Anulación de Guía',
          subtitle: codeState === 3
            ? `Aprobar la anulación de la guía ${item.numero_guia_final || item.id_guia}. Los comprobantes asociados también serán anulados.`
            : `Ingrese el motivo de anulación para la guía ${item.numero_guia_final || item.id_guia}:`,
          confirmText: codeState === 3 ? 'Sí, aprobar' : 'Enviar solicitud'
        });
        setAnularModalOpen(true);
      } else {
        toast.error(verif?.message || 'No se puede anular la guía');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al anular la guía');
    }
  };

  const ejecutarAnulacionGuia = async (motivo) => {
    if (!anularModalData) return;
    const { item, codeState } = anularModalData;
    const idUsuario = user?.id_usuario || user?.id || user?.id_user || 0;

    try {
      let r;
      if (codeState === 3) {
        if (!puedeAprobar) {
          toast.error('Solo un administrador puede aprobar la anulación.');
          return;
        }
        r = await GuiaService.anularAdministrador(item.id_guia, idUsuario, motivo);
      } else {
        r = await GuiaService.anularGuia(item.id_guia, idUsuario, motivo);
      }

      if (r && r.success) {
        toast.success(
          codeState === 3
            ? (r.message || 'Anulación aprobada correctamente.')
            : (r.message || 'Solicitud de anulación enviada. Pendiente de aprobación.')
        );
        loadGuias(filtros, page);
      } else {
        toast.error(r?.message || 'No se pudo procesar la anulación');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al procesar anulación');
    } finally {
      setAnularModalOpen(false);
      setAnularModalData(null);
    }
  };

  const handleCharge = async (item) => {
    try {
      // Verificar que la guía no esté ya cobrada completamente
      if (item.estado_cobro_guia === 'COBRADA' || parseFloat(item.por_cobrar || 0) <= 0) {
        toast.success('La nota de venta ya se encuentra cobrada en su totalidad');
        return;
      }

      // Verificar que la caja de notas de venta esté aperturada
      const cajaVal = await cajaNotaVentaService.validarCaja();
      if (!cajaVal || !cajaVal.success) {
        toast.error(cajaVal?.message || 'Error al validar la caja');
        return;
      }
      if (!cajaVal.id_caja) {
        toast.error('No tiene una caja de notas de venta aperturada. Debe aperturar una caja primero.');
        return;
      }
      // Para Notas de Venta NO se requiere verificar que tenga una factura autorizada,
      // ya que la nota de venta es el comprobante en sí mismo.
      setSelectedGuiaCobrar(item);
      setCobrarModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Error al validar la caja');
    }
  };

  const handleCobroSuccess = () => {
    loadGuias(filtros, page); // Recargar grilla
  };

  const handleCharges = (item) => {
    setSelectedGuiaCobros(item);
    setCobrosModalOpen(true);
  };

  const handleTrack = (item) => {
    setSelectedGuiaSeguimiento(item);
    setSeguimientoModalOpen(true);
  };

  const handleNuevaGuia = () => {
    navigate('/notas-venta/nueva');
  };

  const handleAnularSeleccionadas = async () => {
    if (!puedeAprobar) {
      toast.error('Solo un administrador puede aprobar anulaciones.');
      return;
    }

    const ids = guias.filter(g => Number(g.estado_guia) === 3).map(g => g.id_guia);
    if (ids.length === 0) {
      toast.error('No hay guías pendientes de aprobación');
      return;
    }

    const { value: motivoSeleccionadas } = await Swal.fire({ title: 'Motivo de aprobación', input: 'text', inputLabel: 'Ingrese el motivo de aprobación de las guías pendientes:', showCancelButton: true, confirmButtonText: 'Siguiente', cancelButtonText: 'Cancelar', inputValidator: (value) => { if (!value) return 'Debe ingresar un motivo'; } });
    if (!motivoSeleccionadas) return;
    const confirmAnularSel = await Swal.fire({ title: '¿Aprobar anulación de guías pendientes?', text: `Se aprobarán ${ids.length} solicitud(es) de anulación.`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, aprobar', cancelButtonText: 'Cancelar' });
    if (!confirmAnularSel.isConfirmed) return;
    const motivo = motivoSeleccionadas;
    try {
      let successCount = 0;
      const idUsuario = user?.id_usuario || 0;
      for (const id of ids) {
        try {
          const r = await GuiaService.anularGuiasSeleccionadas(id, idUsuario, motivo);
          if (r && r.success) successCount++;
        } catch (e) { /* skip individual failures */ }
      }
      toast.success(`${successCount} solicitud(es) aprobada(s)`);
      loadGuias(filtros, page);
    } catch (err) {
      console.error(err);
      toast.error('Error al aprobar las anulaciones');
    }
  };

  const handleAnularPendientes = async () => {
    if (!puedeAprobar) {
      toast.error('Solo un administrador puede aprobar anulaciones.');
      return;
    }

    const { value: motivoPendientes } = await Swal.fire({ title: 'Motivo de aprobación', input: 'text', inputLabel: 'Motivo de aprobación para todas las guías pendientes:', showCancelButton: true, confirmButtonText: 'Siguiente', cancelButtonText: 'Cancelar', inputValidator: (value) => { if (!value) return 'Debe ingresar un motivo'; } });
    if (!motivoPendientes) return;
    const confirmAnularPend = await Swal.fire({ title: '¿Aprobar todas las guías pendientes?', text: '¿Seguro que desea aprobar la anulación de todas las guías pendientes?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, aprobar', cancelButtonText: 'Cancelar' });
    if (!confirmAnularPend.isConfirmed) return;
    const motivo = motivoPendientes;
    try {
      const idUsuario = user?.id_usuario || 0;
      const r = await GuiaService.anularGuiasTodas(idUsuario, motivo);
      if (r && r.success) {
        toast.success(r.message || 'Guías pendientes aprobadas correctamente');
        loadGuias(filtros, page);
      } else {
        toast.error(r?.message || 'No se pudieron aprobar');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al aprobar guías pendientes');
    }
  };

  return (
    <div className="flex flex-col min-h-screen gap-2 p-0 bg-slate-100/50">
      {/* ── CABECERA INTEGRADA ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        
        {/* Fila Superior: Título + Botones Principales */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
              <i className="fas fa-truck-moving text-sm"></i>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Listado de Notas de Venta</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestión de Encomiendas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              className="h-8 w-8 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-all shadow-sm flex items-center justify-center"
              onClick={() => loadGuias(filtros, page)}
              disabled={loading}
              title="Actualizar"
            >
              <i className={`fas fa-sync-alt text-[11px] ${loading ? 'fa-spin text-blue-500' : ''}`}></i>
            </button>
            <button
              className="h-8 w-8 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-all shadow-sm flex items-center justify-center"
              onClick={() => setShowFilters(prev => !prev)}
              title={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            >
              <i className={`fas ${showFilters ? 'fa-eye-slash' : 'fa-eye'} text-[11px]`}></i>
            </button>
          </div>
        </div>

      </div>

      {/* ── CONTENIDO: Guías ─────────────────────────────────────── */}
      <div className="guias-content">
        <div className={`filter-panel-container ${showFilters ? 'open' : 'collapsed'}`}>
          <GuiasFilterPanel onSearch={handleSearch} visible={showFilters} isNotaVenta={true} />
        </div>

        <div className="guias-grid-wrapper">
          <GuiasGrid
            data={guias}
            loading={loading}
            page={page}
            limit={limit}
            total={total}
            onPageChange={handlePageChange}
            onReload={() => loadGuias(filtros, page)}
            onViewPdf={handleViewPdf}
            onPrint={handlePrint}
            onEdit={handleEdit}
            onAnular={handleAnular}
            onCharge={handleCharge}
            onCharges={handleCharges}
            onTrack={handleTrack}
            onNuevaGuia={handleNuevaGuia}
            onAnularSeleccionadas={puedeAprobar ? handleAnularSeleccionadas : undefined}
            onAnularPendientes={puedeAprobar ? handleAnularPendientes : undefined}
          />
        </div>
      </div>

      {/* Mini-modal selector de impresión — idéntico a Impresion.js de ExtJS */}
      <PrintSelectorModal
        isOpen={printSelectorOpen}
        item={selectedPrintItem}
        onClose={() => { setPrintSelectorOpen(false); setSelectedPrintItem(null); }}
        onPrintGuia={handlePrintGuia}
        onPrintQR={handlePrintQR}
        onPrintTicket={handlePrintTicket}
      />

      <PdfViewerModal
        open={pdfModalOpen}
        onClose={() => {
          setPdfModalOpen(false);
          try {
            if (pdfUrl && pdfUrl.startsWith('blob:')) URL.revokeObjectURL(pdfUrl);
          } catch (e) { /* ignore */ }
          setPdfUrl(null);
          setPdfShouldShowPrint(false);
        }}
        url={pdfUrl}
        title={pdfTitle}
        showPrintButton={pdfShouldShowPrint}
      />

      {cobrarModalOpen && selectedGuiaCobrar && (
        <CobrarFacturaModal
          guia={selectedGuiaCobrar}
          isNotaVenta={true}
          onClose={() => { setCobrarModalOpen(false); setSelectedGuiaCobrar(null); }}
          onSuccess={handleCobroSuccess}
        />
      )}

      {cobrosModalOpen && selectedGuiaCobros && (
        <CobrosRealizadosModal
          guia={selectedGuiaCobros}
          isNotaVenta={true}
          onClose={() => { setCobrosModalOpen(false); setSelectedGuiaCobros(null); }}
          onUpdate={() => loadGuias(filtros, page)}
        />
      )}

      {seguimientoModalOpen && selectedGuiaSeguimiento && (
        <SeguimientoGuiaModal
          guia={selectedGuiaSeguimiento}
          isNotaVenta={true}
          onClose={() => { setSeguimientoModalOpen(false); setSelectedGuiaSeguimiento(null); }}
        />
      )}

      {anularModalOpen && (
        <MotivoModal
          isOpen={anularModalOpen}
          onClose={() => { setAnularModalOpen(false); setAnularModalData(null); }}
          onConfirm={ejecutarAnulacionGuia}
          title={anularModalData?.title || 'Motivo de Anulación'}
          subtitle={anularModalData?.subtitle}
          confirmText={anularModalData?.confirmText || 'Enviar solicitud'}
        />
      )}
    </div>
  );
};
