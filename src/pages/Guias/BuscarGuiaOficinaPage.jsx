import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuiaService } from '../../services/guia.service';
import { CONFIG } from '../../config/env';
import { api } from '../../config/axios';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { PdfViewerModal } from '../../components/PdfViewerModal';

/**
 * BuscarGuiaOficinaPage
 * 
 * Permite buscar guías por número desde cualquier oficina y reimprimirlas.
 * Migrado desde ExtJS: FlotaPelileo.view.guia.BuscarGuiaOficina
 * + FlotaPelileo.controller.BuscarGuiaOficinaController
 */
export const BuscarGuiaOficinaPage = () => {
  const navigate = useNavigate();
  const [numeroGuia, setNumeroGuia] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Modal PDF
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfTitle, setPdfTitle] = useState('Ticket');

  const handleBuscar = async () => {
    const valor = numeroGuia.trim();
    if (!valor) {
      toast.error('Por favor ingrese un número de guía');
      return;
    }

    setLoading(true);
    try {
      const response = await GuiaService.getGuias({
        rucremitente: '',
        rucreceptor: '',
        nombreremitente: '',
        nombrereceptor: '',
        fechaini: '',
        fechalast: '',
        mes: '',
        anio: '',
        factura: '',
        numeroguia: valor,
        idusuario: '',
        despacho: 'false',
        limit: 50,
        page: 1
      });

      if (!response || !response.success) {
        toast.error(response?.mensaje || 'Error al buscar guía');
        setResultados([]);
        setTotal(0);
        return;
      }

      const data = Array.isArray(response.data) ? response.data : [];
      setResultados(data);
      setTotal(response.total || 0);

      if (data.length > 0) {
        toast.success(`${data.length} guía(s) encontrada(s)`);
      } else {
        toast.info(`No se encontró ninguna guía con el número: ${valor}`);
      }
    } catch (error) {
      console.error('Error buscando guía:', error);
      toast.error('Error al buscar la guía. Verifique su conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleNumeroGuiaChange = (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 14);
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 3 || i === 6) formatted += '-';
      formatted += digits[i];
    }
    setNumeroGuia(formatted);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBuscar();
    }
  };

  const handleVerPdf = async (guia) => {
    try {
      toast.loading('Generando ticket...', { id: 'pdf-guia' });
      
      const userResp = await api.get('/buscarUsuario');
      const idUsuario = userResp.data?.data?.id_usuario || 0;

      const phpUrl = `${CONFIG.PHP_URL}/guiaPdfImpresion.php?id_guia=${encodeURIComponent(guia.id_guia)}&id_usuario_global=${encodeURIComponent(idUsuario)}`;
      const res = await fetch(phpUrl);
      
      toast.dismiss('pdf-guia');
      
      if (!res.ok) throw new Error(`PHP respondió ${res.status}`);
      const data = await res.json();
      
      if (data.success && data.ruta) {
        setPdfTitle(`Ticket Guía ${guia.numero_guia_final || guia.id_guia}`);
        setPdfUrl(`${CONFIG.PHP_URL}/tmp/${data.ruta}`);
        setPdfModalOpen(true);
      } else {
        toast.error(data.error || 'No se pudo generar el ticket');
      }
    } catch (error) {
      toast.dismiss('pdf-guia');
      console.error('Error generando PDF:', error);
      toast.error('Error al generar el ticket');
    }
  };

  const handleReimprimir = async (guia) => {
    const confirmReimprimir = await Swal.fire({
      title: '¿Reimprimir guía?',
      text: `¿Desea reimprimir la guía ${guia.numero_guia_final || guia.numero_guia || ''} de la oficina ${guia.origen_guia || ''}?`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, reimprimir', cancelButtonText: 'Cancelar'
    });
    if (!confirmReimprimir.isConfirmed) return;

    try {
      toast.loading('Generando reimpresión...', { id: 'reimp-guia' });
      
      const userResp = await api.get('/buscarUsuario');
      const idUsuario = userResp.data?.data?.id_usuario || 0;
      const nombreUsuario = userResp.data?.data?.nombre_usuario || '';

      const phpUrl = `${CONFIG.PHP_URL}/guiaPdfImpresion.php?id_guia=${encodeURIComponent(guia.id_guia)}&id_usuario_global=${encodeURIComponent(idUsuario)}&reimpreso_por=${encodeURIComponent(nombreUsuario)}`;
      const res = await fetch(phpUrl);

      toast.dismiss('reimp-guia');

      if (!res.ok) throw new Error(`PHP respondió ${res.status}`);
      const data = await res.json();

      if (data.success && data.ruta) {
        window.open(`${CONFIG.PHP_URL}/tmp/${data.ruta}`, '_blank', 'width=500,height=700');
      } else {
        toast.error(data.error || 'No se pudo generar la reimpresión');
      }
    } catch (error) {
      toast.dismiss('reimp-guia');
      console.error('Error reimprimiendo:', error);
      toast.error('Error al reimprimir la guía');
    }
  };

  return (
    <>
    <div className="flex flex-col h-full gap-2 p-0 bg-slate-100/50">
      {/* CABECERA */}
      <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
              <i className="fas fa-search text-sm"></i>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">
                Buscar Guía por Oficina
              </h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Búsqueda Global de Guías
              </p>
            </div>
          </div>
          <button
            className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-2"
            onClick={() => navigate('/guias')}
          >
            <i className="fas fa-arrow-left text-[10px]"></i>
            Volver a Guías
          </button>
        </div>
      </div>

      {/* BÚSQUEDA */}
      <div className="mx-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          Número de Guía
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={numeroGuia}
            onChange={handleNumeroGuiaChange}
            onKeyDown={handleKeyDown}
            placeholder="000-000-00000000"
            maxLength="16"
            className="flex-1 h-9 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            autoFocus
          />
          <button
            onClick={handleBuscar}
            disabled={loading || !numeroGuia.trim()}
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-search'} text-[10px]`}></i>
            Buscar
          </button>
        </div>
      </div>

      {/* RESULTADOS */}
      <div className="mx-4 mb-4 bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-auto">
        {resultados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <i className="fas fa-file-invoice text-4xl mb-3 opacity-30"></i>
            <p className="text-sm font-semibold">
              {loading ? 'Buscando...' : 'Ingrese un número de guía para buscar'}
            </p>
            <p className="text-[10px] mt-1 text-slate-300">
              Se buscará en todas las oficinas
            </p>
          </div>
        ) : (
          <>
            {/* Contador */}
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {total} resultado(s) encontrado(s)
              </span>
            </div>

            {/* Tabla */}
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">N° Guía</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remitente</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Receptor</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Origen</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Destino</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultados.map((guia, idx) => (
                    <tr key={guia.id_guia || idx} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-3 py-2 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                      <td className="px-3 py-2 font-bold text-indigo-700">
                        {guia.numero_guia_final || guia.numero_guia || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-700 max-w-[150px] truncate">
                        {guia.nombre_cliente_remitente || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-700 max-w-[150px] truncate">
                        {guia.nombre_cliente_receptor || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {guia.origen_guia || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {guia.destino_guia || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-[10px]">
                        {guia.fecha_guia || '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleVerPdf(guia)}
                            className="h-7 w-7 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-md transition-all flex items-center justify-center"
                            title="Ver Ticket"
                          >
                            <i className="fas fa-eye text-[10px]"></i>
                          </button>
                          <button
                            onClick={() => handleReimprimir(guia)}
                            className="h-7 w-7 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-md transition-all flex items-center justify-center"
                            title="Reimprimir"
                          >
                            <i className="fas fa-print text-[10px]"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>

      <PdfViewerModal
        open={pdfModalOpen}
        onClose={() => {
          setPdfModalOpen(false);
          setPdfUrl(null);
        }}
        url={pdfUrl}
        title={pdfTitle}
        showPrintButton={true}
      />
    </>
  );
};