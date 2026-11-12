/**
 * Conversión entre el marcado enriquecido de leyendas y el HTML del editor.
 *
 * Marcado (lo interpreta imprimirLeyendaEnriquecida en pdf_utils.php):
 *   [b]..[/b]  [i]..[/i]  [u]..[/u]
 *   [c=#RRGGBB]..[/c]  [s=12]..[/s]  [a=l|c|r|j]
 */

const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'TABLE', 'TR', 'TD']);
const SIZE_TAG_MAP = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18, 6: 24, 7: 36 };
const ALIGN_TO_CSS = { left: 'left', center: 'center', right: 'right', justify: 'justify' };
const ALIGN_TO_MARK = { left: 'l', center: 'c', right: 'r', justify: 'j' };
const MARK_TO_ALIGN = {
  l: 'left', i: 'left', left: 'left', izq: 'left', izquierda: 'left',
  c: 'center', centro: 'center', center: 'center',
  r: 'right', d: 'right', right: 'right', der: 'right', derecha: 'right',
  j: 'justify', justify: 'justify', justificado: 'justify',
};

export const ptToPx = (pt) => `${Math.round(((Number(pt) * 4) / 3) * 100) / 100}px`;

export const pxToPt = (valor) => {
  const num = parseFloat(String(valor || '').replace(',', '.'));
  if (!Number.isFinite(num) || num <= 0) return null;
  if (String(valor).includes('pt')) return Math.round(num * 10) / 10;
  return Math.round(num * 0.75 * 10) / 10;
};

export const colorToHex = (valor) => {
  const raw = String(valor || '').trim().toLowerCase();
  if (!raw) return null;
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  const rgb = raw.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgb) {
    const hex = [rgb[1], rgb[2], rgb[3]]
      .map((n) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0'))
      .join('');
    return `#${hex}`;
  }
  return null;
};

export const normalizarAlineacion = (valor) => MARK_TO_ALIGN[String(valor || '').toLowerCase()] || null;

const escaparHtml = (texto) => String(texto)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const mismoEstilo = (a, b) => a
  && a.b === b.b && a.i === b.i && a.u === b.u
  && a.color === b.color && a.size === b.size;

/** Convierte el HTML que produce el editor al marcado que entiende el PHP. */
export const htmlAMarkup = (root) => {
  if (!root) return '';

  const fragmentos = [];

  const agregarSalto = (estilo) => {
    const ultimo = fragmentos[fragmentos.length - 1];
    if (ultimo && ultimo.texto && ultimo.texto.endsWith('\n')) return;
    fragmentos.push({ ...estilo, texto: '\n' });
  };

  const recorrer = (node, estilo) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue) fragmentos.push({ ...estilo, texto: node.nodeValue });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName;
    if (tag === 'BR') {
      fragmentos.push({ ...estilo, texto: '\n' });
      return;
    }

    const siguiente = { ...estilo };

    if (tag === 'B' || tag === 'STRONG') siguiente.b = true;
    if (tag === 'I' || tag === 'EM') siguiente.i = true;
    if (tag === 'U') siguiente.u = true;

    const inline = node.style || {};
    const peso = inline.fontWeight || '';
    if (peso && (peso === 'bold' || parseInt(peso, 10) >= 600)) siguiente.b = true;
    if (inline.fontStyle === 'italic') siguiente.i = true;
    if (`${inline.textDecoration || ''} ${inline.textDecorationLine || ''}`.includes('underline')) siguiente.u = true;

    const color = node.getAttribute('color') || inline.color;
    if (color) {
      const hex = colorToHex(color);
      if (hex) siguiente.color = hex;
    }

    const sizeAttr = node.getAttribute('size');
    if (sizeAttr && SIZE_TAG_MAP[sizeAttr]) {
      siguiente.size = SIZE_TAG_MAP[sizeAttr];
    } else if (inline.fontSize) {
      const pt = pxToPt(inline.fontSize);
      if (pt) siguiente.size = pt;
    }

    const align = inline.textAlign || node.getAttribute('align');
    if (align) {
      const normalizada = normalizarAlineacion(align);
      if (normalizada) siguiente.align = normalizada;
    }

    const esBloque = BLOCK_TAGS.has(tag);
    if (esBloque && fragmentos.length) agregarSalto(siguiente);
    Array.from(node.childNodes).forEach((hijo) => recorrer(hijo, siguiente));
  };

  Array.from(root.childNodes).forEach((node) => recorrer(node, {
    b: false, i: false, u: false, color: null, size: null, align: null,
  }));

  const lineas = [];
  let actual = { align: null, runs: [] };
  const cerrarLinea = () => {
    lineas.push(actual);
    actual = { align: null, runs: [] };
  };

  fragmentos.forEach((frag) => {
    String(frag.texto).split('\n').forEach((parte, indice) => {
      if (indice > 0) cerrarLinea();
      if (!parte) return;

      if (frag.align && !actual.align) actual.align = frag.align;

      const run = {
        texto: parte,
        b: !!frag.b,
        i: !!frag.i,
        u: !!frag.u,
        color: frag.color || null,
        size: frag.size || null,
      };
      const ultimo = actual.runs[actual.runs.length - 1];
      if (ultimo && mismoEstilo(ultimo, run)) {
        ultimo.texto += parte;
      } else {
        actual.runs.push(run);
      }
    });
  });
  cerrarLinea();

  while (lineas.length && !lineas[0].runs.length) lineas.shift();
  while (lineas.length && !lineas[lineas.length - 1].runs.length) lineas.pop();
  if (!lineas.length) return '';

  return lineas.map((linea) => {
    const align = linea.align || 'center';
    let salida = align === 'center' ? '' : `[a=${ALIGN_TO_MARK[align]}]`;
    linea.runs.forEach((run) => {
      let abre = '';
      let cierra = '';
      if (run.b) { abre += '[b]'; cierra = `[/b]${cierra}`; }
      if (run.i) { abre += '[i]'; cierra = `[/i]${cierra}`; }
      if (run.u) { abre += '[u]'; cierra = `[/u]${cierra}`; }
      if (run.color) { abre += `[c=${run.color}]`; cierra = `[/c]${cierra}`; }
      if (run.size) { abre += `[s=${run.size}]`; cierra = `[/s]${cierra}`; }
      salida += `${abre}${run.texto}${cierra}`;
    });
    return salida;
  }).join('\n');
};

/** Convierte el marcado guardado en la BD al HTML editable del editor. */
export const markupAHtml = (markup) => {
  const texto = String(markup || '').replace(/\r\n?/g, '\n');
  if (!texto.trim()) return '';

  const lineas = [];
  let runs = [];
  let align = 'center';
  let estilo = { b: false, i: false, u: false, color: null, size: null };
  const pilas = { b: [], i: [], u: [], c: [], s: [] };

  const cerrarParrafo = (forzar = false) => {
    if (runs.length) {
      lineas.push({ align, runs });
      runs = [];
    } else if (forzar && lineas.length) {
      lineas.push({ align, runs: [] });
    }
  };

  const agregar = (frag) => {
    if (!frag) return;
    const ultimo = runs[runs.length - 1];
    if (ultimo && mismoEstilo(ultimo, { ...estilo, ...frag })) {
      ultimo.texto += frag.texto;
    } else {
      runs.push({ ...estilo, ...frag });
    }
  };

  const partes = texto.split(/(\[[^\]\n]{1,24}\])/);
  partes.forEach((parte) => {
    if (!parte) return;

    let match = parte.match(/^\[([biucsa])(?:=([^\]]*))?\]$/i);
    if (match) {
      const tag = match[1].toLowerCase();
      const valor = (match[2] || '').trim();
      if (tag === 'b') { pilas.b.push(estilo.b); estilo = { ...estilo, b: true }; }
      else if (tag === 'i') { pilas.i.push(estilo.i); estilo = { ...estilo, i: true }; }
      else if (tag === 'u') { pilas.u.push(estilo.u); estilo = { ...estilo, u: true }; }
      else if (tag === 'c') {
        pilas.c.push(estilo.color);
        const hex = colorToHex(valor.startsWith('#') ? valor : `#${valor}`);
        estilo = { ...estilo, color: hex || estilo.color };
      } else if (tag === 's') {
        pilas.s.push(estilo.size);
        const pt = parseFloat(valor.replace(',', '.'));
        if (Number.isFinite(pt) && pt >= 4 && pt <= 72) estilo = { ...estilo, size: pt };
      } else if (tag === 'a') {
        cerrarParrafo();
        align = normalizarAlineacion(valor) || align;
      }
      return;
    }

    match = parte.match(/^\[\/(b|i|u|c|s|a)\]$/i);
    if (match) {
      const tag = match[1].toLowerCase();
      if (tag === 'a') return;
      if (tag === 'b' && pilas.b.length) estilo = { ...estilo, b: pilas.b.pop() };
      if (tag === 'i' && pilas.i.length) estilo = { ...estilo, i: pilas.i.pop() };
      if (tag === 'u' && pilas.u.length) estilo = { ...estilo, u: pilas.u.pop() };
      if (tag === 'c' && pilas.c.length) estilo = { ...estilo, color: pilas.c.pop() };
      if (tag === 's' && pilas.s.length) estilo = { ...estilo, size: pilas.s.pop() };
      return;
    }

    parte.split('\n').forEach((linea, indice) => {
      if (indice > 0) cerrarParrafo(true);
      if (linea) agregar({ texto: linea });
    });
  });
  cerrarParrafo();

  return lineas.map((linea) => {
    const contenido = linea.runs.map((run) => {
      let html = escaparHtml(run.texto);
      if (run.size) html = `<span style="font-size:${ptToPx(run.size)}">${html}</span>`;
      if (run.color) html = `<span style="color:${run.color}">${html}</span>`;
      if (run.u) html = `<u>${html}</u>`;
      if (run.i) html = `<i>${html}</i>`;
      if (run.b) html = `<b>${html}</b>`;
      return html;
    }).join('');
    return `<div style="text-align:${ALIGN_TO_CSS[linea.align] || 'left'}">${contenido || '<br>'}</div>`;
  }).join('');
};
