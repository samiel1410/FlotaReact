import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

export const loadQZTrayScript = () => {
  return new Promise((resolve, reject) => {
    if (window.qz) return resolve();
    const s = document.createElement('script');
    s.src = '/qz.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar qz.js'));
    document.head.appendChild(s);
  });
};

export const configurarQZTray = () => {
  if (!window.qz) return;
  window.qz.security.setSignatureAlgorithm('SHA256');
  window.qz.security.setCertificatePromise((resolve) => {
    fetch('/digital-certificate.crt', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
      .then(r => (r.ok ? r.text() : null))
      .then(resolve)
      .catch(() => resolve(null));
  });
  window.qz.security.setSignaturePromise((toSign) => (resolve) => {
    api.get('/configuracion/sign-message', { params: { request: toSign } })
      .then(res => resolve(res.data))
      .catch(err => {
        console.error('Error signing message', err);
        resolve(null);
      });
  });
};

export const conectarQZTray = () => {
  if (!window.qz) return Promise.reject(new Error('Librería no cargada'));
  if (window.qz.websocket.isActive()) return Promise.resolve();
  const TIMEOUT_MS = 3000;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout de conexión a QZ Tray')), TIMEOUT_MS);
  });
  return Promise.race([
    window.qz.websocket.connect({ retries: 0, delay: 0, usingSecure: false }),
    timeoutPromise
  ]).finally(() => clearTimeout(timeoutId));
};

export const imprimirBoletoDirectoQZ = async (idBoleto, printerBoletos, copias = 1) => {
  if (!printerBoletos) {
    throw new Error('No hay impresora de boletos configurada');
  }

  const numCopias = parseInt(copias) || parseInt(localStorage.getItem('copias_boletos')) || 1;
  const printUrl = `/php/boletoFactura.php?id_boleto=${idBoleto}`;
  await loadQZTrayScript();
  configurarQZTray();
  await conectarQZTray();

  const config = window.qz.configs.create(printerBoletos, {
    copies: numCopias,
    scaleContent: true,
    units: 'mm',
    margins: { top: 0, bottom: 0, left: 8, right: 2 }
  });

  const fullPdfUrl = window.location.origin + printUrl;
  const data = [{
    type: 'pixel',
    format: 'pdf',
    flavor: 'file',
    data: fullPdfUrl
  }];

  await window.qz.print(config, data);
};
