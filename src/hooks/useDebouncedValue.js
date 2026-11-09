import { useEffect, useState } from 'react';

/**
 * Devuelve el valor tras `delay` ms sin cambios.
 * Uso: búsquedas/autocompletados que disparan peticiones deben usar el valor
 * debounced como dependencia, nunca el valor del input.
 */
export const useDebouncedValue = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
};

export default useDebouncedValue;
