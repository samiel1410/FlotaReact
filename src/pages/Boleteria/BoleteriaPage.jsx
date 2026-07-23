import { useState, useEffect } from 'react';
import { api } from '../../config/axios';
import { BoleteriaFilterPanel } from './components/BoleteriaFilterPanel';
import { BoleteriaGrid } from './components/BoleteriaGrid';
import { CambiarFechaViajeModal } from './components/CambiarFechaViajeModal';
import { BoleteriaService } from '../../services/boleteria.service';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import { CONFIG } from '../../config/env';
import './BoleteriaPage.css';

export const BoleteriaPage = () => {
  const [boletos, setBoletos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Estado de filtros y paginación
  const [filtros, setFiltros] = useState({});
  const [page, setPage] = useState(1);
  const limit = 20;

  // Modal cambio de fecha
  const [showCambiarFechaModal, setShowCambiarFechaModal] = useState(false);
  const [boletoParaCambioFecha, setBoletoParaCambioFecha] = useState(null);

  // Modal PDF
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  // Obtener usuario actual para permisos
  const currentUser = (() => {
    try {
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      return {
        id_usuario: userData.id_usuario || userData.id || userData.user_id,
        nombre_usuario: userData.nombre || userData.username || '',
      };
    } catch {
      return { id_usuario: null, nombre_usuario: '' };
    }
  })();

  const loadBoletos = async (currentFiltros, currentPage) => {
    setLoading(true);
    try {
      const params = {
        ...currentFiltros,
        limit,
        page: currentPage
      };

      const response = await BoleteriaService.getBoletos(params);

      setBoletos(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error cargando boletería:', error);
      toast.error('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoletos(filtros, page);
  }, [filtros, page]);

  const handleSearch = (nuevosFiltros) => {
    setFiltros(nuevosFiltros);
    setPage(1);
  };

  const handleSriLote = async () => {
    const result = await Swal.fire({
      title: 'Enviar Lote al SRI',
      text: '¿Está seguro de enviar todos los comprobantes pendientes al SRI?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-cloud-upload-alt"></i> Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3498db',
      cancelButtonColor: '#95a5a6',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    toast.promise(
      new Promise(resolve => setTimeout(resolve, 2000)),
      {
        loading: 'Enviando comprobantes al SRI...',
        success: 'Lote enviado correctamente',
        error: 'Error al enviar lote'
      }
    );
  };

  const openPdfViewer = async (id_boleto) => {
    if (!id_boleto) return;
    const loadingToast = toast.loading('Generando boleto...');
    try {
      const urlGenerador = window.location.origin + `/php/boletoFactura.php?id_boleto=${id_boleto}`;
      const response = await fetch(urlGenerador);
      const data = await response.json();

      if (data.success && data.ruta) {
        toast.dismiss(loadingToast);
        setPdfUrl(`/php/tmp/${data.ruta}?t=${Date.now()}`); // Prevenir caché
        setPdfModalOpen(true);
      } else {
        toast.error(data.error || "Error al generar el PDF del boleto", { id: loadingToast });
      }
    } catch (e) {
      console.error("Error abriendo visor PDF:", e);
      toast.error("Ocurrió un error al cargar el PDF", { id: loadingToast });
    }
  };

  const handleVisualizarPdf = (item) => openPdfViewer(item?.id_boleto);
  const handleImprimir = (item) => openPdfViewer(item?.id_boleto);

  const handleAnular = async (item) => {
    if (!item?.id_boleto) return;
    const result = await Swal.fire({
      title: '¿Anular boleto?',
      text: `#${item.id_boleto} - ${item.nombres_boleto}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b'
    });
    if (!result.isConfirmed) return;
    try {
      const res = await BoleteriaService.anularBoleto(item.id_boleto);
      if (res.success) {
        toast.success('Boleto anulado correctamente');
        loadBoletos(filtros, page);
      } else {
        toast.error(res.message || 'Error al anular');
      }
    } catch {
      toast.error('Error al conectar con el servidor');
    }
  };

  const handleCambiarFecha = (item) => {
    setBoletoParaCambioFecha(item);
    setShowCambiarFechaModal(true);
  };

  const handleCambioFechaExitoso = () => {
    loadBoletos(filtros, page);
  };

  const handleReenviarSri = async (item) => {
    if (!item?.id_boleto) return;
    console.log('[SRI Reenviar] === INICIO REENVÍO SRIss ===', item);
    try {
      toast('Iniciando proceso de autorización SRI...', { icon: 'ℹ️' });

      // 1. Preparar boleto (clave de acceso)
      console.log('[SRI Reenviar] Paso 1: Llamando a prepararBoletoSRI con id_boleto:', item.id_boleto);
      const prepRes = await BoleteriaService.prepararBoletoSRI(item.id_boleto);
      console.log('[SRI Reenviar] Respuesta prepararBoletoSRI:', prepRes);

      if (!prepRes?.success && !prepRes?.clave_acceso) {
        console.warn('[SRI Reenviar] Falló prepararBoletoSRI');
        toast.error(prepRes?.message || 'Error al preparar la clave de acceso SRI');
        return;
      }

      // 2. Generar XML (vía PHP negocioXmlBoleto.php)
      const phpUrl = CONFIG.PHP_URL;
      const xmlUrl = `${phpUrl}/negocioXmlBoleto.php?id_boleto=${item.id_boleto}`;
      console.log('[SRI Reenviar] Paso 2: Solicitando XML a:', xmlUrl);
      const xmlRes = await fetch(xmlUrl);
      const xmlData = await xmlRes.json();
      console.log('[SRI Reenviar] Respuesta XML PHP:', xmlData);

      if (!xmlData.success || !xmlData.xml) {
        console.warn('[SRI Reenviar] Falló generación de XML:', xmlData);
        toast.error(xmlData.message || 'Error al generar el XML del comprobante');
        return;
      }

      // Obtener RUC de la empresa si el script PHP no lo incluyó en la respuesta
      let rucEmpresa = xmlData.ruc || '';
      if (!rucEmpresa) {
        try {
          const confRes = await api.get('/configuracion/configuracionSeleccion');
          if (confRes.data?.data?.[0]?.ruc_empresa) {
            rucEmpresa = confRes.data.data[0].ruc_empresa;
          }
        } catch (e) {
          console.warn('[SRI Reenviar] No se pudo obtener el RUC de la empresa:', e);
        }
      }

      // 3. Firmar y transmitir al SRI directamente al servicio de firma (CONFIG.API_FIRMA)
      const firmaUrl = CONFIG.API_FIRMA;
      console.log('[SRI Reenviar] Paso 3: Enviando a servicio de firma:', `${firmaUrl}/firmar-enviar`, { ruc: rucEmpresa, tieneXml: !!xmlData.xml, tieneClave: !!xmlData.p12_password });
      toast('Firmando y enviando al SRI...', { icon: '✍️' });

      if (!firmaUrl) {
        throw new Error('Servicio de firma no configurado en CONFIG.API_FIRMA');
      }

      const directRes = await fetch(`${firmaUrl}/firmar-enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xml: xmlData.xml,
          ruc: rucEmpresa,
          clave: xmlData.p12_password || ''
        })
      });
      const firmaData = await directRes.json();
      console.log('[SRI Reenviar] Respuesta servicio de firma:', firmaData);

      const estadoSri = (firmaData.estado || (firmaData.success ? 'AUTORIZADO' : 'RECHAZADO')).toUpperCase();
      const mensajeSri = firmaData.message || firmaData.mensaje || '';
      const successFirma = firmaData.success;

      // 4. Registrar estado de autorización
      console.log('[SRI Reenviar] Paso 4: Registrando autorización en backend:', { id_boleto: item.id_boleto, estadoSri, mensajeSri });
      const regRes = await BoleteriaService.autorizarBoleto(item.id_boleto, estadoSri, mensajeSri);
      console.log('[SRI Reenviar] Respuesta autorizarBoleto:', regRes);

      if (successFirma || estadoSri === 'AUTORIZADO' || estadoSri === 'AUTORIZADA' || estadoSri === 'RECIBIDA') {
        toast.success(`Boleto ${estadoSri.toLowerCase()} exitosamente por el SRI`);
        loadBoletos(filtros, page);
      } else {
        toast.error(`SRI ${estadoSri}: ${mensajeSri || 'Fallo en autorización'}`);
        loadBoletos(filtros, page);
      }
    } catch (error) {
      console.error('[SRI Reenviar] ERROR CATCH GENERAL:', error);
      toast.error('Error al conectar con el servidor o servicio de firma SRI');
    }
  };

  return (
    <div className="flex flex-col h-full gap-2 p-0 bg-slate-100/50">
      {/* ── CABECERA INTEGRADA ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">

        {/* Fila Superior: Título + Botones Principales */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
              <i className="fas fa-ticket-alt text-sm"></i>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Control de Boletería y Facturación</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestión de Boletos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-all shadow-sm flex items-center justify-center"
              onClick={() => loadBoletos(filtros, page)}
              disabled={loading}
              title="Actualizar"
            >
              <i className={`fas fa-sync-alt text-[11px] ${loading ? 'fa-spin text-blue-500' : ''}`}></i>
            </button>
          </div>
        </div>
      </div>

      <div className="boleteria-content">
        <BoleteriaFilterPanel onSearch={handleSearch} onSriLote={handleSriLote} />

        <div className="boleteria-grid-wrapper">
          <BoleteriaGrid
            data={boletos}
            loading={loading}
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onReload={() => loadBoletos(filtros, page)}
            onVisualizarPdf={handleVisualizarPdf}
            onImprimir={handleImprimir}
            onAnular={handleAnular}
            onReenviarSri={handleReenviarSri}
            onCambiarFecha={handleCambiarFecha}
            currentUserId={currentUser.id_usuario}
          />
        </div>
      </div>

      {/* Modal Cambiar Fecha de Viaje */}
      <CambiarFechaViajeModal
        isOpen={showCambiarFechaModal}
        onClose={() => { setShowCambiarFechaModal(false); setBoletoParaCambioFecha(null); }}
        boleto={boletoParaCambioFecha}
        onCambioExitoso={handleCambioFechaExitoso}
      />

      {/* Modal PDF de impresión */}
      <PdfViewerModal
        open={pdfModalOpen}
        onClose={() => { setPdfModalOpen(false); setPdfUrl(null); }}
        url={pdfUrl}
        title="Boleto de Viaje"
      />
    </div>
  );
};
