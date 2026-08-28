import { useState, useEffect } from 'react';
import { api } from '../../config/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const getDailyKey = (type) => {
  const d = new Date().toLocaleDateString('es-EC').replace(/\//g, '-');
  return `print_count_${type}_${d}`;
};

const loadQZ = () => new Promise((resolve, reject) => {
  if (window.qz) return resolve();
  const s = document.createElement('script');
  s.src = '/qz.js';
  s.onload = () => resolve();
  s.onerror = () => reject(new Error('No se pudo cargar qz.js'));
  document.head.appendChild(s);
});

const configurarQZ = () => {
  if (!window.qz) return;
  qz.security.setSignatureAlgorithm('SHA256');
  qz.security.setCertificatePromise((resolve) => {
    fetch('/digital-certificate.crt', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
      .then(r => r.ok ? r.text() : null).then(resolve).catch(() => resolve(null));
  });
  qz.security.setSignaturePromise((toSign) => (resolve) => {
    api.get('/configuracion/sign-message', { params: { request: toSign } })
      .then(res => resolve(res.data))
      .catch(err => {
        console.error('Error signing message', err);
        resolve(null);
      });
  });
};

const conectarQZ = () => {
  if (!window.qz) return Promise.reject('Librería no cargada');
  if (qz.websocket.isActive()) return Promise.resolve();
  return qz.websocket.connect({ retries: 1, delay: 1, usingSecure: false })
    .catch(() => qz.websocket.connect({ retries: 0, delay: 0, usingSecure: false, port: { insecure: [8182, 8283, 8384, 8485] } }));
};

export const ImpresorasPage = () => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [printerBoletos, setPrinterBoletos] = useState('');
  const [printerGuias, setPrinterGuias] = useState('');
  const [copiasBoletos, setCopiasBoletos] = useState(1);
  const [copiasGuias, setCopiasGuias] = useState(1);
  const [metodoImpresion, setMetodoImpresion] = useState('manual');
  const [totalBoletos] = useState(0);
  const [totalGuias] = useState(0);
  const [hoyBoletos, setHoyBoletos] = useState(0);
  const [hoyGuias, setHoyGuias] = useState(0);
  const [testing, setTesting] = useState(false);
  const [loadingQZ, setLoadingQZ] = useState(true);

  const userId = user?.id_usuario;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api.get('/impresoras/miConfig', { params: { id_usuario: userId } }).then(res => {
      if (cancelled) return;
      if (res.data?.success && res.data?.data) {
        const c = res.data.data;
        setPrinterBoletos(c.printer_boletos || '');
        setPrinterGuias(c.printer_guias || '');
        setMetodoImpresion(c.metodo_impresion || 'manual');
        setCopiasBoletos(c.copias_boletos || 1);
        setCopiasGuias(c.copias_guias || 1);
        localStorage.setItem('printer_boletos', c.printer_boletos || '');
        localStorage.setItem('printer_guias', c.printer_guias || '');
        localStorage.setItem('metodo_impresion', c.metodo_impresion || 'manual');
        localStorage.setItem('copias_boletos', c.copias_boletos || 1);
        localStorage.setItem('copias_guias', c.copias_guias || 1);
      }
    }).catch(e => console.warn('[Impresoras] Error loading config:', e));
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const keyB = getDailyKey('boletos');
    const keyG = getDailyKey('guias');
    setHoyBoletos(parseInt(localStorage.getItem(keyB)) || 0);
    setHoyGuias(parseInt(localStorage.getItem(keyG)) || 0);
  }, []);

  useEffect(() => {
    loadQZ().then(() => {
      configurarQZ();
      conectarQZ().then(() => {
        setConnected(true);
        window.qz.printers.details().then(details => {
          const list = details.filter(p => p.name).map(p => ({ nombre: p.name }));
          setPrinters(list);
        }).catch(e => console.warn('Silent scan error', e));
      }).catch(() => { });
    }).catch(() => { }).finally(() => setLoadingQZ(false));
  }, []);

  const scanPrinters = async (manual = false) => {
    if (scanning) return;
    setScanning(true);
    try {
      await loadQZ();
      configurarQZ();
      await conectarQZ();
      setConnected(true);
      const details = await window.qz.printers.details();
      const list = details.filter(p => p.name).map(p => ({ nombre: p.name }));
      setPrinters(list);
      toast.success(`${list.length} impresoras encontradas`);

      if (printerBoletos && list.some(p => p.nombre === printerBoletos)) {
        setPrinterBoletos(printerBoletos);
      }
      if (printerGuias && list.some(p => p.nombre === printerGuias)) {
        setPrinterGuias(printerGuias);
      }
    } catch (err) {
      setConnected(false);
      console.error('[Impresoras] QZ error:', err);
      const msg = 'No se pudo conectar con QZ Tray. Abra el programa QZ Tray.';
      if (manual) toast.error(msg); else toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  const saveConfig = async (type, value) => {
    const uid = user?.id_usuario || user?.id_user || user?.id || JSON.parse(sessionStorage.getItem('user_data') || '{}')?.id_usuario;
    if (!uid) {
      toast.error('No se pudo identificar al usuario');
      return;
    }
    try {
      localStorage.setItem(type, value);
      const res = await api.post('/usuario/guardarConfiguracionImpresora', {
        id_usuario: uid,
        tipo: type,
        impresora: value
      });
      if (res.data?.success) {
        toast.success(`Configuración guardada`);
        if (type === 'metodo_impresion') {
          window.dispatchEvent(new CustomEvent('metodo_impresion_changed', { detail: value }));
        }
      } else {
        toast.error(res.data?.message || 'Error al guardar');
      }
    } catch (e) {
      toast.error('Error al guardar configuración');
    }
  };

  const testPrint = async (printer, text) => {
    if (!printer) {
      toast.error('Seleccione una impresora');
      return;
    }
    setTesting(true);
    try {
      await loadQZ();
      configurarQZ();
      await conectarQZ();

      const config = window.qz.configs.create(printer, {
        scaleContent: true,
        units: 'mm',
        margins: { top: 0, bottom: 0, left: 8, right: 2 }
      });
      const data = [{
        type: 'html',
        format: 'plain',
        data: `
          <div style="font-family: monospace; padding: 10px; text-align: center; width: 250px;">
            <h3>${text}</h3>
            <p>Impresora: ${printer}</p>
            <p>Fecha: ${new Date().toLocaleString()}</p>
            <hr/>
            <p>Sistema de Gestión de Flota</p>
          </div>
        `
      }];
      await window.qz.print(config, data);
      toast.success('Impresión de prueba enviada');
    } catch (err) {
      console.error('[Impresoras] Error prueba:', err);
      toast.error('Error al imprimir prueba');
    } finally {
      setTesting(false);
    }
  };

  const selectClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all disabled:bg-slate-50 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2";
  const statLabelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1";
  const statValueClass = "text-xl font-extrabold text-slate-800";

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <i className="fas fa-print text-blue-600" />
            Configuraci&oacute;n de Impresoras
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Gestione las impresoras t&eacute;rmicas para boletos, facturas y gu&iacute;as de encomiendas
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  M&eacute;todo de Impresi&oacute;n del Sistema
                </h2>
                <p className="text-xs text-slate-500">
                  Seleccione c&oacute;mo desea imprimir los boletos y gu&iacute;as en el sistema.
                </p>
              </div>
            </div>
            <div className="flex gap-6 mt-4">
              <label className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all flex-1 ${metodoImpresion === 'manual'
                  ? 'border-blue-500 bg-blue-50 shadow-md transform -translate-y-0.5'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                <input
                  type="radio"
                  name="metodo_impresion"
                  value="manual"
                  checked={metodoImpresion === 'manual'}
                  onChange={() => {
                    setMetodoImpresion('manual');
                    saveConfig('metodo_impresion', 'manual');
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-bold text-slate-800">Manual / Visor PDF (Predeterminado)</div>
                  <div className="text-xs text-slate-500 mt-1">Abre el ticket en un visor PDF para imprimir con el navegador</div>
                </div>
              </label>
              <label className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all flex-1 ${metodoImpresion === 'directa'
                  ? 'border-amber-500 bg-amber-50 shadow-md transform -translate-y-0.5'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                <input
                  type="radio"
                  name="metodo_impresion"
                  value="directa"
                  checked={metodoImpresion === 'directa'}
                  onChange={() => {
                    setMetodoImpresion('directa');
                    saveConfig('metodo_impresion', 'directa');
                  }}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="text-sm font-bold text-slate-800">Impresi&oacute;n Directa (QZ Tray)</div>
                  <div className="text-xs text-slate-500 mt-1">Env&iacute;a el documento autom&aacute;ticamente a la impresora t&eacute;rmica configurada</div>
                </div>
              </label>
            </div>
          </div>

          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Estado del Servicio QZ Tray: {loadingQZ ? 'Verificando...' : (connected ? 'Conectado' : 'Desconectado')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {connected
                      ? `${printers.length} impresoras detectadas en su equipo local`
                      : 'Inicie QZ Tray en su computadora para habilitar la impresión directa'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => scanPrinters(true)} disabled={scanning || metodoImpresion === 'manual'}
                  className="px-4 h-8 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50">
                  <i className={`fas fa-sync-alt ${scanning ? 'fa-spin' : ''}`} />
                  Detectar Impresoras
                </button>
                <button onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/digital-certificate.crt';
                  link.download = 'digital-certificate.crt';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                  className="px-4 h-8 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 shadow-xs">
                  <i className="fas fa-certificate" />
                  Descargar Certificado
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <i className="fas fa-ticket-alt text-sm" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Boleteria</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Seleccione la impresora t&eacute;rmica y el n&uacute;mero de copias para boletos y facturas.
              </p>
              <div className="flex gap-4 mb-5">
                <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center">
                  <p className={statLabelClass}>Total Hist&oacute;rico</p>
                  <p className={statValueClass}>{totalBoletos}</p>
                </div>
                <div className="flex-1 bg-emerald-50 rounded-lg p-3 text-center">
                  <p className={statLabelClass}>Emitidos Hoy</p>
                  <p className={`${statValueClass} text-emerald-600`}>{hoyBoletos}</p>
                </div>
              </div>
              <div className="mb-4">
                <label className={labelClass}>Impresora T&eacute;rmica</label>
                <select value={printerBoletos} onChange={e => { setPrinterBoletos(e.target.value); saveConfig('printer_boletos', e.target.value); }}
                  className={selectClass} disabled={metodoImpresion === 'manual'}>
                  <option value="">Seleccione impresora...</option>
                  {printers.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="mb-5">
                <label className={labelClass}>N&uacute;mero de Copias por Emisi&oacute;n</label>
                <select
                  value={copiasBoletos}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 1;
                    setCopiasBoletos(val);
                    saveConfig('copias_boletos', val);
                  }}
                  className={selectClass}
                  disabled={metodoImpresion === 'manual'}
                >
                  <option value={1}>1 Copia (Original)</option>
                  <option value={2}>2 Copias (Original + Copia)</option>
                  <option value={3}>3 Copias</option>
                  <option value={4}>4 Copias</option>
                  <option value={5}>5 Copias</option>
                </select>
              </div>
              <button onClick={() => testPrint(printerBoletos, 'TICKET DE PRUEBA')} disabled={testing || !printerBoletos || metodoImpresion === 'manual'}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
                <i className="fas fa-print" /> Probar Boletos
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <i className="fas fa-box-open text-sm" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Gu&iacute;as</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Seleccione la impresora y el n&uacute;mero de copias para encomiendas y gu&iacute;as.
              </p>
              <div className="flex gap-4 mb-5">
                <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center">
                  <p className={statLabelClass}>Total Hist&oacute;rico</p>
                  <p className={statValueClass}>{totalGuias}</p>
                </div>
                <div className="flex-1 bg-emerald-50 rounded-lg p-3 text-center">
                  <p className={statLabelClass}>Emitidas Hoy</p>
                  <p className={`${statValueClass} text-emerald-600`}>{hoyGuias}</p>
                </div>
              </div>
              <div className="mb-4">
                <label className={labelClass}>Impresora Etiquetas/Gu&iacute;as</label>
                <select value={printerGuias} onChange={e => { setPrinterGuias(e.target.value); saveConfig('printer_guias', e.target.value); }}
                  className={selectClass} disabled={metodoImpresion === 'manual'}>
                  <option value="">Seleccione impresora...</option>
                  {printers.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="mb-5">
                <label className={labelClass}>N&uacute;mero de Copias por Emisi&oacute;n</label>
                <select
                  value={copiasGuias}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 1;
                    setCopiasGuias(val);
                    saveConfig('copias_guias', val);
                  }}
                  className={selectClass}
                  disabled={metodoImpresion === 'manual'}
                >
                  <option value={1}>1 Copia (Original)</option>
                  <option value={2}>2 Copias (Remitente + Destinatario / Oficina)</option>
                  <option value={3}>3 Copias (Remitente + Destinatario + Transportista)</option>
                  <option value={4}>4 Copias</option>
                  <option value={5}>5 Copias</option>
                </select>
              </div>
              <button onClick={() => testPrint(printerGuias, 'GUIA DE PRUEBA')} disabled={testing || !printerGuias || metodoImpresion === 'manual'}
                className="w-full h-10 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
                <i className="fas fa-print" /> Probar Gu&iacute;as
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
