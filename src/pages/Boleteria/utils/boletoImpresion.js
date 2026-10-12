import { api } from '../../../config/axios';
import { buildPdfUrl } from '../../../utils/pdfUrlUtils';

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
  const printUrl = buildPdfUrl(`/php/boletoFactura.php?id_boleto=${idBoleto}`);
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

/**
 * ¿QZ Tray está activo (librería cargada y websocket conectado)?
 * Se usa para decidir si imprimir por QZ o abrir el diálogo del navegador.
 */
export const qzTrayActivo = () => {
  try {
    return !!(window.qz && window.qz.websocket && window.qz.websocket.isActive());
  } catch {
    return false;
  }
};

/**
 * Abre DIRECTAMENTE el diálogo de impresión del navegador para un PDF,
 * sin mostrar la vista previa.
 *
 * Carga el PDF en un iframe fuera de pantalla (Chrome no imprime PDFs en
 * `display:none`) y llama a `print()` cuando termina de cargar.
 *
 * @returns {Promise<boolean>} `true` si se pudo lanzar el diálogo.
 */
export const imprimirPdfDirecto = (url, { esperaVisor = 800, limpiezaMs = 90000 } = {}) =>
  new Promise((resolve) => {
    let iframe;
    let resuelto = false;
    const terminar = (valor) => {
      if (resuelto) return;
      resuelto = true;
      resolve(valor);
    };

    try {
      iframe = document.createElement('iframe');
      // Fuera de pantalla pero renderizado (1px, transparente).
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0';
      iframe.style.border = '0';
      iframe.style.pointerEvents = 'none';
      iframe.src = url;

      const limpiar = () => {
        try {
          iframe?.remove();
        } catch {
          /* noop */
        }
      };

      iframe.onload = () => {
        // El visor de PDF necesita un instante para inicializarse.
        setTimeout(() => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            terminar(true);
            // Se conserva el iframe un rato para no cortar el diálogo.
            setTimeout(limpiar, limpiezaMs);
          } catch (e) {
            console.error('[impresion] No se pudo abrir el diálogo de impresión:', e);
            limpiar();
            terminar(false);
          }
        }, esperaVisor);
      };

      iframe.onerror = () => {
        limpiar();
        terminar(false);
      };

      document.body.appendChild(iframe);

      // Si el PDF nunca carga (404/red), se libera al cabo de un tiempo.
      setTimeout(() => {
        if (!resuelto) {
          limpiar();
          terminar(false);
        }
      }, limpiezaMs);
    } catch (e) {
      console.error('[impresion] Error preparando la impresión directa:', e);
      try {
        iframe?.remove();
      } catch {
        /* noop */
      }
      terminar(false);
    }
  });

