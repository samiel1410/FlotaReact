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
 * Validación para guías: cédula 10 dígitos, RUC 13 dígitos.
 * Se aceptan identificaciones alfanuméricas (pasaporte) de 5 a 20 caracteres.
 */
export const validarIdentificacionGuia = (identificacion) => {
  const valor = String(identificacion ?? '').trim();
  if (!valor) return { valido: false, mensaje: 'La identificación es obligatoria.' };
  if (esSoloDigitos(valor)) {
    if (valor.length === 10) return { valido: true, mensaje: '' };
    if (valor.length === 13) return { valido: true, mensaje: '' };
    return {
      valido: false,
      mensaje: `Debe tener 10 dígitos (cédula) o 13 dígitos (RUC); se ingresaron ${valor.length}.`
    };
  }
  if (/^[A-Za-z0-9]{5,20}$/.test(valor)) return { valido: true, mensaje: '' };
  return { valido: false, mensaje: 'La identificación no tiene un formato válido.' };
};
