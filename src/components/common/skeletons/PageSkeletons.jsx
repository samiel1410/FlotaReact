import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * Esqueletos compartidos para estados de carga.
 * Regla del proyecto: nunca mostrar pantalla vacía ni spinner genérico mientras
 * se esperan datos; mostrar la forma del contenido que va a llegar.
 */

/** Filas de tabla con el ancho de las columnas reales. */
export const TableSkeleton = ({ rows = 10, columns = 5 }) => (
  <table className="w-full border-collapse" aria-hidden="true">
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        <th className="py-2 px-2 w-8"><Skeleton height={9} /></th>
        {Array.from({ length: columns }).map((_, i) => (
          <th key={i} className="py-2 px-2"><Skeleton height={9} /></th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          <td className="py-2 px-2"><Skeleton height={12} width={18} /></td>
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="py-2 px-2">
              <Skeleton height={12} width={`${55 + ((r + c) % 4) * 12}%`} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

/** Tarjetas de resumen (KPIs) en una fila responsive. */
export const CardsSkeleton = ({ cards = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden="true">
    {Array.from({ length: cards }).map((_, i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
        <Skeleton height={10} width="40%" />
        <div className="mt-3">
          <Skeleton height={24} width="65%" />
        </div>
        <div className="mt-2">
          <Skeleton height={9} width="50%" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Esqueleto del layout completo: se usa como fallback de Suspense mientras
 * se descarga el chunk de la página (equivalente a la primera carga).
 */
export const PageSkeleton = ({ cards = 4, rows = 10 }) => (
  <div className="p-4 space-y-4" aria-busy="true" aria-live="polite">
    <span className="sr-only">Cargando módulo...</span>
    <div className="flex items-center gap-3">
      <Skeleton circle height={36} width={36} />
      <div className="flex-1 max-w-xs">
        <Skeleton height={14} width="60%" />
        <Skeleton height={9} width="40%" />
      </div>
    </div>

    {cards > 0 && <CardsSkeleton cards={cards} />}

    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <Skeleton height={10} width="35%" />
      </div>
      <TableSkeleton rows={rows} columns={5} />
    </div>
  </div>
);

export default PageSkeleton;
