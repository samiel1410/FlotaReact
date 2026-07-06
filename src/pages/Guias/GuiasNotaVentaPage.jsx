import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuiasFilterPanel } from './components/GuiasFilterPanel';
import { GuiasGrid } from './components/GuiasGrid';
import { GuiaNotaVentaService as GuiaService } from '../../services/guiaNotaVenta.service';
import { CONFIG } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import './GuiasPage.css';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import { CobrarFacturaModal } from './components/CobrarFacturaModal';
import { CobrosRealizadosModal } from './components/CobrosRealizadosModal';
import { SeguimientoGuiaModal } from './components/SeguimientoGuiaModal';

export const GuiasNotaVentaPage = () => {
  const { user, userRole } = useAuth();
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
    const url = `${CONFIG.PHP_URL}/guiaNotaVentaPdf.php?id_guia=${encodeURIComponent(item.id_guia)}`;
    setPdfTitle(`Guía ${item.numero_guia_final || item.id_guia}`);
    setPdfUrl(url);
    setPdfShouldShowPrint(false);
    setPdfModalOpen(true);
  };

  const handlePrint = (item) => {
    setSelectedPrintItem(item);
    setPrintSelectorOpen(true);
  };

  const handlePrintGuia = async () => {
    const item = selectedPrintItem;
    setPrintSelectorOpen(false);
    try {
      const idUsuario = user?.id_usuario || 0;
      const phpUrl = `${CONFIG.PHP_URL}/guiaNotaVentaPdfImpresion.php?id_guia=${encodeURIComponent(item.id_guia)}&id_usuario_global=${encodeURIComponent(idUsuario)}`;
      const res = await fetch(phpUrl);
      if (!res.ok) throw new Error(`PHP respondió ${res.status}`);
      const data = await res.json();
      if (!data.success || !data.ruta) { toast.error(data.error || 'Error generando PDF'); return; }
      setPdfTitle(`Imprimir Guía ${item.numero_guia_final || item.id_guia}`);
      setPdfUrl(`${CONFIG.PHP_URL}/tmp/${data.ruta}`);
      setPdfShouldShowPrint(true);
      setPdfModalOpen(true);
    } catch (err) {
      console.error('Error imprimiendo guía:', err);
      toast.error('No se pudo generar el PDF de guía');
    }
  };

  const handlePrintQR = async () => {
    const item = selectedPrintItem;
    setPrintSelectorOpen(false);
    try {
      const phpUrl = `${CONFIG.PHP_URL}/qrNotaVentaPdf.php?id_guia=${encodeURIComponent(item.id_guia)}`;
      const res = await fetch(phpUrl);
      if (!res.ok) throw new Error(`PHP respondió ${res.status}`);
      const data = await res.json();
      if (!data.success || !data.ruta) { toast.error(data.error || 'Error generando QR'); return; }
      setPdfTitle(`QR Guía ${item.numero_guia_final || item.id_guia}`);
      setPdfUrl(`${CONFIG.PHP_URL}/tmp/${data.ruta}`);
      setPdfShouldShowPrint(true);
      setPdfModalOpen(true);
    } catch (err) {
      console.error('Error imprimiendo QR:', err);
      toast.error('No se pudo generar el PDF de QR');
    }
  };

  const handleEdit = async (item) => {
    try {
      // 1. Verificar estado de anulación (ExtJS: verificacionanulacion)
      const verif = await GuiaService.verificarAnulacion(item.id_guia);
      const msg = verif.message ?? verif.data?.message;

      if (msg === 2) {
        toast.error('La guía se encuentra anulada');
        return;
      }
      if (msg === 3) {
        toast.error('La guía está pendiente a anular');
        return;
      }

      // 3. Navegar a edición (No se verifica factura porque es Nota de Venta)
      navigate(`/guias/editar/${item.id_guia}`);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar la guía para editar');
    }
  };

  const handleFacturar = async (item) => {
    try {
      // 1. Verificar si la guía está anulada/pendiente (ExtJS: verificacionanulacion)
      const verif = await GuiaService.verificarAnulacion(item.id_guia);
      const msg = verif.message ?? verif.data?.message;
      
      if (msg === 2) {
        toast.error('La guía se encuentra anulada');
        return;
      }
      if (msg === 3) {
        toast.error('La guía está pendiente a anular');
        return;
      }
      
      // 3. Confirmar con el usuario (No se verifica factura porque es Nota de Venta)
      const confirmFacturar = await Swal.fire({ title: '¿Facturar guía?', text: `¿Seguro desea facturar la guía ${item.numero_guia_final}?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, facturar', cancelButtonText: 'Cancelar' });
      if (!confirmFacturar.isConfirmed) return;
      
      const r = await GuiaService.facturarGuia(item.id_guia);
      if (r && r.success) {
        toast.success('Guía facturada correctamente');
        loadGuias(filtros, page);
      } else {
        toast.error(r?.message || 'Error al facturar');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al facturar la guía');
    }
  };

  const handleAnular = async (item) => {
    try {
      // Verificar estado de la guía (ExtJS: verificacionanulacion)
      const verif = await GuiaService.verificarAnulacion(item.id_guia);
      const msg = verif.message ?? verif.data?.message;

      if (msg === 2) {
        toast.error('La guía ya se encuentra anulada');
        return;
      }

      const idUsuario = user?.id_usuario || 0;
      const rol = Number(userRole);

      if (msg === 1) {
        // Guía activa (estado 1) - Proceder con anulación (sin verificar factura en Nota de Venta)
        if (rol === 1 || rol === 4 || rol === 5) {
          const { value: motivo } = await Swal.fire({ title: 'Motivo de anulación', input: 'text', inputLabel: 'Motivo de anulación para la guía ' + item.numero_guia_final + ':', showCancelButton: true, confirmButtonText: 'Anular', cancelButtonText: 'Cancelar', inputValidator: (value) => { if (!value) return 'Debe ingresar un motivo'; } });
          if (!motivo) return;

          let r;
          if (rol === 1) {
            r = await GuiaService.anularAdministrador(item.id_guia, idUsuario, motivo);
          } else {
            r = await GuiaService.anularGuia(item.id_guia, idUsuario, motivo);
          }

          if (r && r.success) {
            toast.success('Guía anulada correctamente');
            loadGuias(filtros, page);
          } else {
            toast.error(r?.message || 'No se pudo anular la guía');
          }
        } else {
          toast.error('No tiene permisos (rol) para anular esta guía');
        }

      } else if (msg === 3) {
        // Guía pendiente a anular (estado 3)
        if (rol === 1 || rol === 5) {
          const { value: motivo } = await Swal.fire({ title: 'Motivo de anulación', input: 'text', inputLabel: 'Motivo de anulación para la guía pendiente ' + item.numero_guia_final + ':', showCancelButton: true, confirmButtonText: 'Anular', cancelButtonText: 'Cancelar', inputValidator: (value) => { if (!value) return 'Debe ingresar un motivo'; } });
          if (!motivo) return;

          const r = await GuiaService.anularAdministrador(item.id_guia, idUsuario, motivo);
          if (r && r.success) {
            toast.success('Guía pendiente anulada correctamente');
            loadGuias(filtros, page);
          } else {
            toast.error(r?.message || 'No se pudo anular la guía pendiente');
          }
        } else {
          toast.error('La guía está pendiente a anular. Requiere permisos de administrador.');
        }
      } else {
        toast.error('No se puede anular la guía');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al anular la guía');
    }
  };

  const handleCharge = async (item) => {
    // Para Notas de Venta NO se requiere verificar que tenga una factura autorizada,
    // ya que la nota de venta es el comprobante en sí mismo.
    setSelectedGuiaCobrar(item);
    setCobrarModalOpen(true);
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
    // ExtJS: onAnularSeleccionadas → abre modal AnulacionSeleccionadas
    const { value: motivoSeleccionadas } = await Swal.fire({ title: 'Motivo de anulación', input: 'text', inputLabel: 'Ingrese el motivo de anulación para las guías seleccionadas:', showCancelButton: true, confirmButtonText: 'Siguiente', cancelButtonText: 'Cancelar', inputValidator: (value) => { if (!value) return 'Debe ingresar un motivo'; } });
    if (!motivoSeleccionadas) return;
    const confirmAnularSel = await Swal.fire({ title: '¿Anular guías seleccionadas?', text: '¿Seguro que desea anular las guías seleccionadas?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, anular', cancelButtonText: 'Cancelar' });
    if (!confirmAnularSel.isConfirmed) return;
    const motivo = motivoSeleccionadas;
    try {
      const ids = guias.filter(g => g.estado_guia !== 2).map(g => g.id_guia);
      if (ids.length === 0) {
        toast.error('No hay guías activas para anular');
        return;
      }
      let successCount = 0;
      const idUsuario = user?.id_usuario || 0;
      for (const id of ids) {
        try {
          const r = await GuiaService.anularGuiasSeleccionadas(id, idUsuario, motivo);
          if (r && r.success) successCount++;
        } catch (e) { /* skip individual failures */ }
      }
      toast.success(`${successCount} guías anuladas`);
      loadGuias(filtros, page);
    } catch (err) {
      console.error(err);
      toast.error('Error al anular guías seleccionadas');
    }
  };

  const handleAnularPendientes = async () => {
    // ExtJS: onAnularGuiasPendientesPantalla → onbtnAnularTodasGuias
    const { value: motivoPendientes } = await Swal.fire({ title: 'Motivo de anulación', input: 'text', inputLabel: 'Motivo de anulación para todas las guías pendientes:', showCancelButton: true, confirmButtonText: 'Siguiente', cancelButtonText: 'Cancelar', inputValidator: (value) => { if (!value) return 'Debe ingresar un motivo'; } });
    if (!motivoPendientes) return;
    const confirmAnularPend = await Swal.fire({ title: '¿Anular todas las guías pendientes?', text: '¿Seguro que desea anular todas las guías pendientes?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, anular', cancelButtonText: 'Cancelar' });
    if (!confirmAnularPend.isConfirmed) return;
    const motivo = motivoPendientes;
    try {
      const idUsuario = user?.id_usuario || 0;
      const r = await GuiaService.anularGuiasTodas(idUsuario, motivo);
      if (r && r.success) {
        toast.success('Guías pendientes anuladas correctamente');
        loadGuias(filtros, page);
      } else {
        toast.error(r?.message || 'No se pudieron anular');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al anular guías pendientes');
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

      <div className="guias-content">
        <div className={`filter-panel-container ${showFilters ? 'open' : 'collapsed'}`}>
          <GuiasFilterPanel onSearch={handleSearch} visible={showFilters} />
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
            onFacturar={handleFacturar}
            onAnular={handleAnular}
            onCharge={handleCharge}
            onCharges={handleCharges}
            onTrack={handleTrack}
            onNuevaGuia={handleNuevaGuia}
            onAnularSeleccionadas={handleAnularSeleccionadas}
            onAnularPendientes={handleAnularPendientes}
          />
        </div>
      </div>

      {/* Mini-modal selector de impresión — idéntico a Impresion.js de ExtJS */}
      {printSelectorOpen && selectedPrintItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-56 flex flex-col gap-3">
            <div className="text-center font-bold text-slate-700 text-sm border-b pb-3">
              <i className="fas fa-print mr-2 text-blue-500"></i>
              IMPRIMIR GUÍA
            </div>
            <p className="text-xs text-slate-500 text-center">
              Guía: <strong>{selectedPrintItem.numero_guia_final || selectedPrintItem.id_guia}</strong>
            </p>
            <button
              onClick={handlePrintGuia}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-file-alt"></i> GUIA
            </button>
            <button
              onClick={handlePrintQR}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-qrcode"></i> QR
            </button>
            <button
              onClick={() => { setPrintSelectorOpen(false); setSelectedPrintItem(null); }}
              className="w-full py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg text-xs transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
};
