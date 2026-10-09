/**
 * Botones de acción estándar de las grillas (Imprimir + Anular).
 *
 * Se usa en Bonos y Créditos Administrativos para que el icono, el estilo y el
 * comportamiento de ambas columnas de "Acción" sean exactamente iguales.
 */
export default function AccionesFila({
  onImprimir,
  onAnular,
  anulado = false,
  tituloImprimir = 'Imprimir',
  tituloAnular = 'Anular',
}) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={onImprimir}
        title={tituloImprimir}
        className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
      >
        <i className="fas fa-print text-sm"></i>
      </button>
      {onAnular && (
        <button
          type="button"
          onClick={onAnular}
          disabled={anulado}
          title={anulado ? 'Ya está anulado' : tituloAnular}
          className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <i className="fas fa-ban text-sm"></i>
        </button>
      )}
    </div>
  );
}
