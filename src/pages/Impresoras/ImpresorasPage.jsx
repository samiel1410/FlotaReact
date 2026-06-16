import { useState, useEffect } from 'react';
import { api } from '../../config/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const getDailyKey = (type) => {
  const d = new Date().toLocaleDateString('es-EC').replace(/\//g, '-');
  return `print_count_${type}_${d}`;
};

let qzLoaded = false;

const loadQZ = () => new Promise((resolve, reject) => {
  if (window.qz) { qzLoaded = true; return resolve(); }
  const s = document.createElement('script');
  s.src = '/qz.js';
  s.onload = () => { qzLoaded = true; resolve(); };
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
  qz.security.setSignaturePromise(function (toSign) {
    return function (resolve) {
      fetch('/configuracion/sign-message?request=' + toSign, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
        .then((res) => (res.ok ? res.text() : null))
        .then(resolve)
        .catch((err) => {
          console.error(err);
          resolve(null);
        });
    };
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
  const [metodoImpresion, setMetodoImpresion] = useState('manual');
  const [totalBoletos, setTotalBoletos] = useState(0);
  const [totalGuias, setTotalGuias] = useState(0);
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
      if (window.qz?.websocket?.isActive()) setConnected(true);
    }).catch(() => {}).finally(() => setLoadingQZ(false));
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
      const bodyStr = `id_usuario=${encodeURIComponent(uid)}&tipo=${encodeURIComponent(type)}&impresora=${encodeURIComponent(value)}`;
      const res = await api.post('/usuario/guardarConfiguracionImpresora', bodyStr, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      if (res.data?.success) {
        toast.success(`Configuración de impresión guardada`);
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
    if (!printer) { toast.error('Seleccione una impresora primero'); return; }
    setTesting(true);
    try {
      await conectarQZ();
      const config = window.qz.configs.create(printer);
      const data = [{
        type: 'raw', format: 'plain',
        data: `\n\n   ${text}\n   SISTEMA FLOTA\n   -------------------\n   Usuario: ${user?.nombre_usuario || 'Desconocido'}\n   Prueba Exitosa\n   \n\n\n`
      }];
      await window.qz.print(config, data);

      const key = getDailyKey(text === 'TICKET DE PRUEBA' ? 'boletos' : 'guias');
      const current = parseInt(localStorage.getItem(key)) || 0;
      localStorage.setItem(key, current + 1);
      if (text === 'TICKET DE PRUEBA') setHoyBoletos(current + 1);
      else setHoyGuias(current + 1);

      toast.success(`Prueba enviada a: ${printer}`);
    } catch (err) {
      toast.error(err?.toString() || 'Error al imprimir');
    } finally {
      setTesting(false);
    }
  };

  const selectClass = "w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800";
  const labelClass = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5";
  const statLabelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5";
  const statValueClass = "text-lg font-extrabold text-slate-800";

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 pb-32">
        {/* MÉTODO DE IMPRESIÓN - AHORA EN LA PARTE SUPERIOR */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                <i className="fas fa-print text-lg" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">M&eacute;todo de Impresi&oacute;n</h2>
            </div>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              Seleccione c&oacute;mo desea imprimir los boletos y gu&iacute;as en el sistema.
            </p>
            <div className="flex gap-6">
              <label className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all flex-1 ${
                metodoImpresion === 'manual'
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
                  className="accent-blue-600 w-5 h-5"
                />
                <div>
                  <div className="font-bold text-base text-slate-800">Manual</div>
                  <div className="text-xs text-slate-500 mt-1">Abre el ticket en un visor PDF para imprimir con el navegador</div>
                </div>
              </label>
              <label className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all flex-1 ${
                metodoImpresion === 'directa'
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
                  className="accent-amber-500 w-5 h-5"
                />
                <div>
                  <div className="font-bold text-base text-slate-800">Directa (Automática)</div>
                  <div className="text-xs text-slate-500 mt-1">Imprime directamente en la impresora t&eacute;rmica configurada (requiere QZ Tray)</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* CONFIGURACIÓN DE IMPRESORAS TÉRMICAS */}
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 ${metodoImpresion === 'manual' ? 'opacity-40 pointer-events-none grayscale-[30%]' : ''}`}>
          <div className="flex items-center gap-5 px-8 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${connected ? 'bg-emerald-100 text-emerald-600 shadow-inner' : 'bg-red-100 text-red-500 shadow-inner'}`}>
              <i className={`fas ${connected ? 'fa-check-circle' : 'fa-times-circle'}`} />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Configuraci&oacute;n de Impresoras T&eacute;rmicas</h1>
              <p className={`text-sm font-bold mt-0.5 ${connected ? 'text-emerald-600' : 'text-red-500'}`}>
                {connected ? 'SERVICIO QZ TRAY CONECTADO' : 'SERVICIO QZ TRAY DESCONECTADO'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => scanPrinters(true)} disabled={scanning || loadingQZ || metodoImpresion === 'manual'}
                className="px-5 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm">
                <i className={`fas fa-sync ${scanning ? 'fa-spin' : ''}`} />
                {loadingQZ ? 'Cargando...' : scanning ? 'Buscando...' : 'Buscar Impresoras'}
              </button>
              <div className="flex gap-2">
                <a href="/qz-tray-2.2.5-x86_64.exe"
                  className="px-3 h-8 border border-slate-200 bg-white text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-all flex items-center gap-2 flex-1 justify-center"
                  style={{ pointerEvents: metodoImpresion === 'manual' ? 'none' : 'auto' }}>
                  <i className="fas fa-download" />
                  Controlador
                </a>
                <button onClick={() => {
                  const link = document.createElement('a');
                  link.href = 'digital-certificate.crt';
                  link.download = 'digital-certificate.crt';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                  disabled={metodoImpresion === 'manual'}
                  className="px-3 h-8 border border-emerald-200 bg-white text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-50 transition-all flex items-center gap-2 flex-1 justify-center disabled:opacity-50">
                  <i className="fas fa-certificate" />
                  Certificado
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
                <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Facturaci&oacute;n y Boletos</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Seleccione la impresora t&eacute;rmica para emitir boletos de viaje y facturas electr&oacute;nicas.
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
                <label className={labelClass}>Impresora T&eacute;rmica Boletos</label>
                <select value={printerBoletos} onChange={e => { setPrinterBoletos(e.target.value); saveConfig('boletos', e.target.value); }}
                  className={selectClass} disabled={metodoImpresion === 'manual'}>
                  <option value="">Seleccione dispositivo...</option>
                  {printers.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
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
                <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Gu&iacute;as y Encomiendas</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Seleccione la impresora para etiquetas de encomiendas y gu&iacute;as de remisi&oacute;n.
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
                <select value={printerGuias} onChange={e => { setPrinterGuias(e.target.value); saveConfig('guias', e.target.value); }}
                  className={selectClass} disabled={metodoImpresion === 'manual'}>
                  <option value="">Seleccione dispositivo...</option>
                  {printers.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
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


