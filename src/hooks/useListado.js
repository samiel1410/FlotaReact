
import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../config/axios';

/**
 * Hook genérico para paginación + fetching de datos
 * @param {string} endpoint - Ruta de la API
 * @param {object} defaultParams - Parámetros iniciales del store
 */
export const useListado = (endpoint, defaultParams = {}, customParamsFn) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  // AbortController para cancelar requests anteriores
  const abortControllerRef = useRef(null);
  // Ref para evitar que respuestas antiguas sobreescriban datos nuevos
  const fetchIdRef = useRef(0);

  // Cancelar request al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetch = useCallback(async (filters = {}, pageIndex = 0) => {
    if (!endpoint) return;

    // Cancelar request anterior si aún está pendiente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Incrementar fetchId para identificar esta llamada
    const currentFetchId = ++fetchIdRef.current;

    setLoading(true);
    try {
      const baseParams = {
        ...defaultParams,
        ...filters,
      };
      // Si customParamsFn existe, úsalo para generar los parámetros (ej: numero_bloque/tamanio_bloque)
      const finalParams = customParamsFn
        ? { ...baseParams, ...customParamsFn(pageIndex, PAGE_SIZE, filters) }
        : { ...baseParams, start: pageIndex * PAGE_SIZE, limit: PAGE_SIZE };

      const res = await api.get(endpoint, {
        params: finalParams,
        signal: controller.signal,
      });

      // Solo actualizar si este es el fetch más reciente
      if (currentFetchId !== fetchIdRef.current) return;

      const d = res.data;

      // Normalizar: la API puede retornar:
      // - { data: [...], total: N }       → estándar
      // - { success, datos: [...] }       → algunos endpoints
      // - { success, data: "mensaje" }    → respuestas de error/formato string
      // - [...]                           → array directo (raro pero posible)
      let rows;
      if (Array.isArray(d)) {
        rows = d;
      } else if (Array.isArray(d.data)) {
        rows = d.data;
      } else if (Array.isArray(d.datos)) {
        rows = d.datos;
      } else if (Array.isArray(d.result)) {
        rows = d.result;
      } else if (Array.isArray(d.rows)) {
        rows = d.rows;
      } else {
        // Si d.data es string, objeto o cualquier otra cosa, usar array vacío
        console.warn(`[useListado] Formato inesperado en ${endpoint}:`, typeof d.data, d);
        rows = [];
      }

      setData(rows);
      setTotal(d.total ?? d.count ?? rows.length);
      setPage(pageIndex);

      // Debug temporal - ver qué datos llegan
      if (rows.length > 0) {
        console.log(`[useListado] Endpoint: ${endpoint}`, {
          totalParam: d.total,
          totalCalc: d.total ?? rows.length,
          sampleRow: rows[0],
          keys: Object.keys(rows[0]),
        });
      }
    } catch (err) {
      // Ignorar errores de cancelación (navegación rápida)
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED' || err.message === 'canceled' || controller.signal.aborted) return;

      // Solo mostrar error si es el fetch más reciente
      if (currentFetchId !== fetchIdRef.current) return;

      console.error(`Error en ${endpoint}:`, err);
      toast.error(`No se pudo cargar la información`);
      setData([]);
    } finally {
      // Solo actualizar loading si es el fetch más reciente
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [endpoint]); // eslint-disable-line

  return { data, loading, total, page, setPage, fetch, PAGE_SIZE };
};
