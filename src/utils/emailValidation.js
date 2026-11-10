/**
 * Validación de correos en el frontend.
 *
 * Replica la lógica de `Back/services/emailValidator.js` para dar respuesta
 * inmediata en formularios y modales. El backend sigue siendo la autoridad
 * final: es el único que además verifica los registros MX del dominio.
 */

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
const LOCAL_REGEX = /^[A-Za-z0-9._%+-]+$/;
const DOMAIN_LABEL_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

const CORREOS_PLACEHOLDER = new Set([
  'sincorreo@gmail.com',
  'sin.correo@gmail.com',
  'sin_correo@gmail.com',
  'sincorreo@hotmail.com',
  'correo@correo.com',
  'usuario@usuario.com',
  'ejemplo@ejemplo.com',
  'noemail@noemail.com',
  'no-email@noemail.com'
]);

const DOMINIOS_CONOCIDOS = {
  gmail: ['gmail.com'],
  googlemail: ['gmail.com'],
  hotmail: ['hotmail.com', 'hotmail.es'],
  outlook: ['outlook.com', 'outlook.es'],
  live: ['live.com', 'live.com.ec'],
  yahoo: ['yahoo.com', 'yahoo.es', 'yahoo.com.ec'],
  icloud: ['icloud.com'],
  me: ['me.com'],
  msn: ['msn.com'],
  aol: ['aol.com'],
  protonmail: ['protonmail.com'],
  proton: ['proton.me'],
  zoho: ['zoho.com'],
  gmx: ['gmx.com'],
  yandex: ['yandex.com']
};

const TLD_TYPOS = new Map([
  ['con', 'com'], ['coom', 'com'], ['comm', 'com'], ['comc', 'com'],
  ['cpm', 'com'], ['vom', 'com'], ['ocm', 'com'], ['cmo', 'com'], ['xom', 'com'],
  ['nte', 'net'], ['ner', 'net'], ['nett', 'net'],
  ['or', 'org'], ['rg', 'org'], ['ogr', 'org'], ['orga', 'org'],
  ['gob', 'gov'], ['gv', 'gov'],
  ['inf', 'info'], ['infoo', 'info'],
  ['eec', 'ec'], ['ecx', 'ec']
]);

const MARCAS_ESTRICTAS = new Set([
  'gmail', 'googlemail', 'icloud', 'me', 'msn', 'aol', 'protonmail', 'proton'
]);

/** Valores que quedan guardados cuando el campo llega vacío desde sistemas legacy. */
const TOKENS_VACIOS = new Set([
  'null', 'undefined', 'nan', 'none', 'ninguno', 'ninguna',
  'n/a', 'n.a.', 'na', 'sin correo', 'sin_correo', '-', '--', '.'
]);

const esTokenVacio = (valor) => TOKENS_VACIOS.has(String(valor ?? '').trim().toLowerCase());

/** Devuelve el correo limpio, o '' si el valor es vacío o un relleno ("null"). */
export const normalizarCorreo = (valor) => {
  const texto = String(valor ?? '').trim();
  if (!texto || esTokenVacio(texto)) return '';
  return texto;
};

const levenshtein = (a, b) => {
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = fila[j];
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + costo);
      anterior = temp;
    }
  }
  return fila[b.length];
};

const sugerirDominio = (dominio) => {
  const partes = String(dominio || '').toLowerCase().split('.');
  if (partes.length < 2) return null;

  const primera = partes[0];
  const tld = partes[partes.length - 1];
  const marcas = Object.keys(DOMINIOS_CONOCIDOS).filter((marca) => marca.length >= 4);

  let mejorMarca = null;
  let mejorDistancia = Infinity;
  for (const marca of marcas) {
    if (primera[0] !== marca[0]) continue;
    if (Math.abs(primera.length - marca.length) > 1) continue;
    const distancia = levenshtein(primera, marca);
    const limite = marca.length >= 5 ? 2 : 1;
    if (distancia <= limite && distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejorMarca = marca;
    }
  }

  if (mejorMarca && mejorDistancia > 0) {
    return DOMINIOS_CONOCIDOS[mejorMarca][0];
  }

  if (DOMINIOS_CONOCIDOS[primera]) {
    const canonicos = DOMINIOS_CONOCIDOS[primera];
    if (!canonicos.includes(dominio) && MARCAS_ESTRICTAS.has(primera)) {
      return canonicos[0];
    }
  }

  return TLD_TYPOS.get(tld)
    ? [...partes.slice(0, -1), TLD_TYPOS.get(tld)].join('.')
    : null;
};

/**
 * @param {string} correoOriginal
 * @param {{permitirVacio?: boolean}} [opciones]
 * @returns {{valido:boolean, correo:string, codigo:string, motivo:string|null,
 *   sugerencia:string|null, dominio:string|null, tieneCorreo:boolean}}
 */
export const validarCorreo = (correoOriginal, { permitirVacio = false } = {}) => {
  const original = correoOriginal == null ? '' : String(correoOriginal);
  // "null"/"undefined"/"N/A" se tratan como campo vacío, no como correo inválido.
  const correo = esTokenVacio(original) ? '' : original.trim();
  const base = {
    valido: false,
    correo,
    codigo: 'CORREO_INVALIDO',
    motivo: null,
    sugerencia: null,
    dominio: null,
    tieneCorreo: correo !== ''
  };

  if (!correo) {
    return { ...base, codigo: 'SIN_CORREO', valido: permitirVacio, motivo: permitirVacio ? null : 'No hay correo registrado' };
  }

  if (correo.length > 254) {
    return { ...base, codigo: 'CORREO_MUY_LARGO', motivo: 'El correo es demasiado largo' };
  }

  if (/\s/.test(correo)) {
    return { ...base, codigo: 'CORREO_CON_ESPACIOS', motivo: 'El correo contiene espacios', sugerencia: correo.replace(/\s+/g, '') };
  }

  const correoLimpio = correo.replace(/^[<"']+|[>"',;.]+$/g, '');
  if (correoLimpio !== correo) {
    const limpia = validarCorreo(correoLimpio, { permitirVacio });
    return {
      ...limpia,
      valido: false,
      tieneCorreo: true,
      codigo: limpia.valido ? 'CORREO_CON_SIGNOS' : limpia.codigo,
      motivo: limpia.valido
        ? 'El correo tiene comillas, comas, puntos o punto y coma al inicio/final'
        : limpia.motivo,
      sugerencia: limpia.valido
        ? correoLimpio
        : (limpia.sugerencia || correoLimpio)
    };
  }

  const arrobas = (correo.match(/@/g) || []).length;
  if (arrobas === 0) return { ...base, codigo: 'FALTA_ARROBA', motivo: 'Al correo le falta el símbolo @' };
  if (arrobas > 1) return { ...base, codigo: 'ARROBAS_DUPLICADAS', motivo: 'El correo tiene más de un símbolo @' };

  const posArroba = correo.lastIndexOf('@');
  const usuario = correo.slice(0, posArroba);
  const dominio = correo.slice(posArroba + 1).toLowerCase();
  const resultado = { ...base, correo: `${usuario}@${dominio}`, dominio };

  if (!usuario) return { ...resultado, codigo: 'SIN_USUARIO', motivo: 'Falta el nombre de usuario antes del @' };
  if (usuario.length > 64) return { ...resultado, codigo: 'USUARIO_MUY_LARGO', motivo: 'La parte antes del @ es demasiado larga' };
  if (usuario.startsWith('.') || usuario.endsWith('.') || usuario.includes('..')) {
    return { ...resultado, codigo: 'PUNTOS_INVALIDOS', motivo: 'El usuario del correo tiene puntos mal ubicados' };
  }
  if (!LOCAL_REGEX.test(usuario)) {
    return { ...resultado, codigo: 'CARACTERES_INVALIDOS', motivo: 'El usuario del correo tiene caracteres no permitidos' };
  }

  if (!dominio) return { ...resultado, codigo: 'SIN_DOMINIO', motivo: 'Falta el dominio después del @' };
  if (!dominio.includes('.')) {
    return { ...resultado, codigo: 'DOMINIO_SIN_PUNTO', motivo: 'El dominio del correo está incompleto (falta .com, .ec, etc.)' };
  }
  if (dominio.startsWith('.') || dominio.endsWith('.') || dominio.includes('..')) {
    return { ...resultado, codigo: 'PUNTOS_INVALIDOS', motivo: 'El dominio del correo tiene puntos mal ubicados' };
  }

  const etiquetas = dominio.split('.');
  if (etiquetas.some((etiqueta) => !DOMAIN_LABEL_REGEX.test(etiqueta))) {
    return { ...resultado, codigo: 'DOMINIO_INVALIDO', motivo: 'El dominio del correo tiene un formato inválido' };
  }

  const tld = etiquetas[etiquetas.length - 1];
  if (!/^[A-Za-z]{2,24}$/.test(tld)) {
    return { ...resultado, codigo: 'TLD_INVALIDO', motivo: 'La terminación del dominio del correo no es válida' };
  }

  if (!EMAIL_REGEX.test(correo)) {
    return { ...resultado, codigo: 'FORMATO_INVALIDO', motivo: 'El correo no tiene un formato válido' };
  }

  if (CORREOS_PLACEHOLDER.has(resultado.correo.toLowerCase())) {
    return { ...resultado, codigo: 'CORREO_PLACEHOLDER', motivo: 'El correo registrado es un valor de relleno y no recibe mensajes' };
  }

  const correccionDominio = sugerirDominio(dominio);
  if (correccionDominio) {
    return {
      ...resultado,
      codigo: 'POSIBLE_ERROR_DOMINIO',
      motivo: `El dominio "${dominio}" parece estar mal escrito`,
      sugerencia: `${usuario}@${correccionDominio}`
    };
  }

  return { ...resultado, valido: true, codigo: 'OK' };
};

/** Texto listo para mostrar al usuario. */
export const describirCorreo = (resultado) => {
  if (!resultado) return 'Correo inválido';
  if (resultado.valido) return 'Correo válido';
  const base = resultado.motivo || 'El correo no es válido';
  return resultado.sugerencia ? `${base}. ¿Quisiste decir ${resultado.sugerencia}?` : base;
};

/** Clasifica los correos de una guía (remitente, destinatario y otros). */
export const clasificarCorreosGuia = (guia = {}) => {
  const roles = [
    { rol: 'REMITENTE', correo: guia.correo_cliente_emisor ?? guia.email_remitente },
    { rol: 'DESTINATARIO', correo: guia.correo_cliente_receptor ?? guia.email_destinatario },
    { rol: 'OTROS', correo: guia.correo_otros }
  ];

  const correos = roles.map((item) => {
    const validacion = validarCorreo(item.correo, { permitirVacio: true });
    return { rol: item.rol, correo: validacion.correo, ...validacion };
  });

  const invalidos = correos.filter((item) => item.tieneCorreo && !item.valido);
  return {
    correos,
    correosInvalidos: invalidos,
    alerta: invalidos.length > 0,
    motivo: invalidos.length > 0 ? invalidos.map((item) => `${item.rol}: ${item.motivo}`).join(' | ') : null,
    sugerencia: invalidos.find((item) => item.sugerencia)?.sugerencia || null
  };
};

export default validarCorreo;
