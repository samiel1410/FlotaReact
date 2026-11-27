/**
 * Validación de identificaciones de clientes (Ecuador).
 *
 * Cédula: 10 dígitos.
 * RUC: 13 dígitos.
 * Pasaporte / identificación del exterior: alfanumérico de 5 a 20 caracteres.
 */

export const normalizarTipoIdentificacion = (tipo) => {
  const valor = String(tipo ?? '').trim().toUpperCase();
  if (!valor) return null;
  if (['05', 'C', 'CEDULA', 'CÉDULA'].includes(valor)) return 'CEDULA';
  if (['04', 'R', 'RUC'].includes(valor)) return 'RUC';
  if (['06', 'P', 'PASAPORTE'].includes(valor)) return 'PASAPORTE';
  if (['08', 'E', 'EXTERIOR', 'IDENTIFICACION DEL EXTERIOR', 'IDENTIFICACIÓN DEL EXTERIOR'].includes(valor)) return 'EXTERIOR';
  if (['07', 'CF', 'CONSUMIDOR FINAL'].includes(valor)) return 'CONSUMIDOR_FINAL';
  return null;
};

const esSoloDigitos = (valor) => /^\d+$/.test(valor);

/**
 * Código SRI del tipo de identificación.
 * 04=RUC, 05=Cédula, 06=Pasaporte, 07=Consumidor Final, 08=Exterior.
 */
export const tipoIdentificacionACodigo = (tipo) => {
  switch (normalizarTipoIdentificacion(tipo)) {
    case 'CEDULA': return '05';
    case 'RUC': return '04';
    case 'PASAPORTE': return '06';
    case 'EXTERIOR': return '08';
    case 'CONSUMIDOR_FINAL': return '07';
    default: return '';
  }
};

/**
 * Deduce el código de tipo de identificación a partir del tipo recibido y,
 * si no es reconocible, del formato del número (10 dígitos cédula, 13 RUC,
 * el resto pasaporte).
 */
export const inferirTipoIdentificacion = (identificacion, tipo = null) => {
  const codigo = tipoIdentificacionACodigo(tipo);
  if (codigo) return codigo;
  const valor = String(identificacion ?? '').trim();
  if (/^\d{10}$/.test(valor)) return '05';
  if (/^\d{13}$/.test(valor)) return '04';
  if (valor) return '06';
  return '05';
};

/**
 * Código corto usado por el módulo de clientes ('C' cédula, 'R' RUC,
 * 'P' pasaporte, 'E' exterior, 'CF' consumidor final).
 */
export const tipoIdentificacionACodigoCorto = (tipo) => {
  switch (normalizarTipoIdentificacion(tipo)) {
    case 'CEDULA': return 'C';
    case 'RUC': return 'R';
    case 'PASAPORTE': return 'P';
    case 'EXTERIOR': return 'E';
    case 'CONSUMIDOR_FINAL': return 'CF';
    default: return '';
  }
};

/**
 * Igual que inferirTipoIdentificacion pero devolviendo el código corto.
 */
export const inferirTipoIdentificacionCliente = (identificacion, tipo = null) => {
  const corto = tipoIdentificacionACodigoCorto(tipo);
  if (corto) return corto;
  const valor = String(identificacion ?? '').trim();
  if (/^\d{10}$/.test(valor)) return 'C';
  if (/^\d{13}$/.test(valor)) return 'R';
  if (valor) return 'P';
  return 'C';
};

/**
 * Longitud máxima admitida según el tipo de identificación.
 */
export const maxLengthIdentificacion = (tipo = null) => {
  switch (normalizarTipoIdentificacion(tipo)) {
    case 'CEDULA': return 10;
    case 'RUC':
    case 'CONSUMIDOR_FINAL': return 13;
    default: return 20;
  }
};

/**
 * Limpia la identificación según el tipo: solo dígitos para cédula/RUC y
 * alfanumérico (pasaporte / identificación del exterior) en el resto.
 */
export const sanitizarIdentificacion = (valor, tipo = null) => {
  const texto = String(valor ?? '');
  switch (normalizarTipoIdentificacion(tipo)) {
    case 'CEDULA':
    case 'RUC':
    case 'CONSUMIDOR_FINAL':
      return texto.replace(/\D/g, '');
    default:
      return texto.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }
};

export const validarIdentificacion = (identificacion, tipo = null) => {
  const valor = String(identificacion ?? '').trim();
  const tipoNormalizado = normalizarTipoIdentificacion(tipo);

  if (!valor) {
    return { valido: false, mensaje: 'La identificación es obligatoria.' };
  }

  if (!tipoNormalizado) {
    if (esSoloDigitos(valor)) {
      if (valor.length === 10) return { valido: true, mensaje: 'Cédula válida.' };
      if (valor.length === 13) return { valido: true, mensaje: 'RUC válido.' };
      return {
        valido: false,
        mensaje: `Debe tener 10 dígitos (cédula) o 13 dígitos (RUC); se ingresaron ${valor.length}.`
      };
    }
    if (/^[A-Za-z0-9]{5,20}$/.test(valor)) {
      return { valido: true, mensaje: 'Pasaporte válido.' };
    }
    return { valido: false, mensaje: 'La identificación no tiene un formato válido.' };
  }

  switch (tipoNormalizado) {
    case 'CEDULA':
      if (esSoloDigitos(valor) && valor.length === 10) return { valido: true, mensaje: 'Cédula válida.' };
      return { valido: false, mensaje: `La cédula debe tener 10 dígitos (se ingresaron ${valor.length}).` };
    case 'RUC':
      if (esSoloDigitos(valor) && valor.length === 13) return { valido: true, mensaje: 'RUC válido.' };
      return { valido: false, mensaje: `El RUC debe tener 13 dígitos (se ingresaron ${valor.length}).` };
    case 'CONSUMIDOR_FINAL':
      if (esSoloDigitos(valor) && (valor.length === 10 || valor.length === 13)) {
        return { valido: true, mensaje: 'Identificación válida.' };
      }
      return { valido: false, mensaje: `La identificación debe tener 10 o 13 dígitos (se ingresaron ${valor.length}).` };
    case 'PASAPORTE':
    case 'EXTERIOR':
      if (/^[A-Za-z0-9]{5,20}$/.test(valor)) return { valido: true, mensaje: 'Identificación válida.' };
      return { valido: false, mensaje: 'La identificación debe ser alfanumérica de 5 a 20 caracteres.' };
    default:
      return { valido: false, mensaje: 'La identificación no tiene un formato válido.' };
  }
};

/**
 * Valida el dígito verificador de una cédula ecuatoriana (módulo 10).
 * Los números de "consumidor final" (9999999999) se aceptan como válidos
 * porque son un identificador genérico del sistema, no una cédula real.
 */
export const validarCedulaEcuatoriana = (cedula) => {
  const valor = String(cedula ?? '').trim();
  if (!/^\d{10}$/.test(valor)) {
    return { valido: false, mensaje: 'La cédula debe tener 10 dígitos.' };
  }
  if (/^9{10}$/.test(valor)) return { valido: true, mensaje: '' };

  const provincia = Number(valor.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) {
    return { valido: false, mensaje: 'Cédula inválida: el código de provincia no existe.' };
  }
  if (Number(valor[2]) >= 6) {
    return { valido: false, mensaje: 'Cédula inválida: el tercer dígito no corresponde a una persona natural.' };
  }

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i += 1) {
    let producto = Number(valor[i]) * coeficientes[i];
    if (producto > 9) producto -= 9;
    suma += producto;
  }
  const verificador = (10 - (suma % 10)) % 10;
  if (verificador !== Number(valor[9])) {
    return { valido: false, mensaje: 'Cédula inválida: el dígito verificador no coincide.' };
  }
  return { valido: true, mensaje: '' };
};

/**
 * Valida el dígito verificador de un RUC ecuatoriano (módulo 11).
 * Acepta personas naturales (cédula + establecimiento), sociedades privadas
 * (tercer dígito 9) y entidades públicas (tercer dígito 6).
 */
export const validarRucEcuatoriano = (ruc) => {
  const valor = String(ruc ?? '').trim();
  if (!/^\d{13}$/.test(valor)) {
    return { valido: false, mensaje: 'El RUC debe tener 13 dígitos.' };
  }
  if (/^9{13}$/.test(valor)) return { valido: true, mensaje: '' };
  if (valor.slice(10) === '000') {
    return { valido: false, mensaje: 'RUC inválido: el establecimiento no puede ser 000.' };
  }

  const tercerDigito = Number(valor[2]);

  if (tercerDigito <= 5) {
    const cedula = validarCedulaEcuatoriana(valor.slice(0, 10));
    if (!cedula.valido) return { valido: false, mensaje: `RUC inválido: ${cedula.mensaje}` };
    return { valido: true, mensaje: '' };
  }

  if (tercerDigito === 6 || tercerDigito === 9) {
    const coeficientes = tercerDigito === 6
      ? [3, 2, 7, 6, 5, 4, 3, 2]
      : [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < coeficientes.length; i += 1) {
      suma += Number(valor[i]) * coeficientes[i];
    }
    let verificador = 11 - (suma % 11);
    if (verificador === 11) verificador = 0;
    if (verificador === 10) {
      return { valido: false, mensaje: 'RUC inválido: el dígito verificador no es válido.' };
    }
    if (verificador !== Number(valor[coeficientes.length])) {
      return { valido: false, mensaje: 'RUC inválido: el dígito verificador no coincide.' };
    }
    return { valido: true, mensaje: '' };
  }

  return { valido: false, mensaje: 'RUC inválido: el tercer dígito no es válido.' };
};

/**
 * Validación estricta del documento del cliente para la venta de boletos:
 * cédula (10 dígitos) o RUC (13) con dígito verificador, más los números
 * genéricos de consumidor final. El campo del boleto solo se revisaba "no
 * vacío", así que con dos dígitos ya dejaba seleccionar asientos y vender.
 */
export const validarDocumentoVenta = (identificacion) => {
  const valor = String(identificacion ?? '').trim();
  if (!valor) {
    return { valido: false, tipo: null, mensaje: 'Ingrese la cédula o RUC del cliente.' };
  }
  if (!esSoloDigitos(valor)) {
    return { valido: false, tipo: null, mensaje: 'La cédula o RUC debe contener solo números.' };
  }
  if (/^9{10}$/.test(valor) || /^9{13}$/.test(valor)) {
    return { valido: true, tipo: 'CONSUMIDOR_FINAL', mensaje: 'Consumidor final.' };
  }
  if (valor.length === 10) {
    const resultado = validarCedulaEcuatoriana(valor);
    return { valido: resultado.valido, tipo: 'CEDULA', mensaje: resultado.mensaje };
  }
  if (valor.length === 13) {
    const resultado = validarRucEcuatoriano(valor);
    return { valido: resultado.valido, tipo: 'RUC', mensaje: resultado.mensaje };
  }
  return {
    valido: false,
    tipo: null,
    mensaje: `La cédula debe tener 10 dígitos y el RUC 13 (se ingresaron ${valor.length}).`
  };
};

/**
 * Normaliza la identificación de quien recibe: mayúsculas y solo letras o
 * números. Un pasaporte puede traer espacios o guiones y debe compararse
 * igual contra la identificación guardada en la guía.
 */
export const normalizarIdentificacionEntrega = (identificacion) =>
  String(identificacion ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');

/**
 * Validación usada al entregar una guía.
 *
 * - Cédula/RUC (Ecuador): 10 o 13 dígitos con dígito verificador correcto.
 * - Pasaporte/Extranjero: 5 a 20 letras o números, porque los documentos de
 *   otros países no siguen el formato ecuatoriano.
 */
export const validarIdentificacionEntrega = (identificacion, tipo = null) => {
  const valor = normalizarIdentificacionEntrega(identificacion);
  const tipoNormalizado = normalizarTipoIdentificacion(tipo);

  if (!valor) return { valido: false, mensaje: 'Ingrese la identificación de quien recibe.' };

  if (tipoNormalizado === 'PASAPORTE' || tipoNormalizado === 'EXTERIOR') {
    if (/^[A-Z0-9]{5,20}$/.test(valor)) return { valido: true, mensaje: '' };
    return { valido: false, mensaje: 'El pasaporte debe tener entre 5 y 20 letras o números.' };
  }

  if (!esSoloDigitos(valor)) {
    // Sin tipo explícito se acepta un pasaporte alfanumérico.
    if (!tipoNormalizado && /^[A-Z0-9]{5,20}$/.test(valor)) return { valido: true, mensaje: '' };
    return {
      valido: false,
      mensaje: 'La cédula o RUC debe contener solo números. Si es extranjero, seleccione “Pasaporte / Extranjero”.'
    };
  }
  if (valor.length === 10) return validarCedulaEcuatoriana(valor);
  if (valor.length === 13) return validarRucEcuatoriano(valor);
  return {
    valido: false,
    mensaje: `Debe tener 10 dígitos (cédula) o 13 dígitos (RUC); se ingresaron ${valor.length}. Si es extranjero, seleccione “Pasaporte / Extranjero”.`
  };
};

/**
 * Validación para guías.
 *
 * Si se conoce el tipo (cédula / RUC / pasaporte) se valida con esa regla.
 * Si no, se acepta cédula (10 dígitos), RUC (13 dígitos) y pasaporte
 * (5 a 20 caracteres alfanuméricos, incluidos los pasaportes solo numéricos
 * de otros países, que no tienen 10 ni 13 dígitos).
 */
export const validarIdentificacionGuia = (identificacion, tipo = null) => {
  const valor = String(identificacion ?? '').trim();
  if (!valor) return { valido: false, mensaje: 'La identificación es obligatoria.' };

  if (normalizarTipoIdentificacion(tipo)) {
    return validarIdentificacion(valor, tipo);
  }

  if (esSoloDigitos(valor)) {
    // 10 = cédula, 13 = RUC, cualquier otro largo de 5 a 20 = pasaporte numérico
    if (valor.length >= 5 && valor.length <= 20) return { valido: true, mensaje: '' };
    return {
      valido: false,
      mensaje: `Debe tener entre 5 y 20 caracteres (pasaporte) o 10/13 dígitos (cédula/RUC); se ingresaron ${valor.length}.`
    };
  }
  if (/^[A-Za-z0-9]{5,20}$/.test(valor)) return { valido: true, mensaje: '' };
  return { valido: false, mensaje: 'Debe ser cédula (10 dígitos), RUC (13 dígitos) o pasaporte (5 a 20 caracteres alfanuméricos).' };
};
