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
