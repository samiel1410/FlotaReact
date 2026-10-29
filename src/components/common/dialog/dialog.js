let handler = null;

export const setDialogHandler = (fn) => {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
};

const abrir = (options, positional) => {
  if (!handler) {
    console.warn('[dialog] DialogProvider no está montado; no se pudo mostrar el diálogo.');
    return Promise.resolve({ isConfirmed: false, isDismissed: true, isDenied: false, value: undefined });
  }
  // Compatibilidad con la firma posicional de Swal: (title, text, icon)
  if (typeof options === 'string') {
    const [, text, icon] = positional;
    return handler({ title: options, text, icon });
  }
  return handler(options);
};

/**
 * API global equivalente a `Swal.fire`. Puede usarse dentro o fuera de un
 * componente React (el host se monta una sola vez en main.jsx).
 *
 * Respuesta: { isConfirmed, isDismissed, isDenied, value } igual que Swal.
 */
export const dialog = {
  fire(options) {
    return abrir(options, arguments);
  },
  confirm(options = {}) {
    return abrir({ ...options, showCancelButton: true }, []);
  },
  alert(options = {}) {
    return abrir({ ...options, showCancelButton: false }, []);
  },
};
