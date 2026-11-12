/**
 * Alerta sonora para avisos del sistema (cajas descuadradas, etc.).
 *
 * Se genera con Web Audio API para no depender de archivos de audio ni de
 * rutas del servidor. Los navegadores bloquean el audio hasta que el usuario
 * interactúa con la página, por eso se "desbloquea" con el primer clic/tecla.
 */

let contexto = null;

const obtenerContexto = () => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!contexto) {
    try {
      contexto = new AudioCtx();
    } catch {
      return null;
    }
  }
  return contexto;
};

const desbloquear = () => {
  const ctx = obtenerContexto();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
};

if (typeof window !== 'undefined') {
  ['pointerdown', 'keydown', 'touchstart'].forEach((evento) => {
    window.addEventListener(evento, desbloquear, { passive: true });
  });
}

const beep = (ctx, frecuencia, inicio, duracion, volumen = 0.25) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frecuencia, ctx.currentTime + inicio);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
  gain.gain.exponentialRampToValueAtTime(volumen, ctx.currentTime + inicio + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + duracion);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + inicio);
  osc.stop(ctx.currentTime + inicio + duracion + 0.02);
};

/**
 * Reproduce la alerta de caja descuadrada (dos tonos descendentes, dos veces).
 * Si el audio está bloqueado se reintenta al siguiente clic del usuario.
 */
export function reproducirAlertaDescuadre() {
  const ctx = obtenerContexto();
  if (!ctx) return;

  const tocar = () => {
    try {
      beep(ctx, 880, 0, 0.16);
      beep(ctx, 660, 0.20, 0.16);
      beep(ctx, 880, 0.46, 0.16);
      beep(ctx, 660, 0.66, 0.22);
    } catch {
      /* sin audio disponible */
    }
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(tocar).catch(() => {});
  } else {
    tocar();
  }
}

export default reproducirAlertaDescuadre;
