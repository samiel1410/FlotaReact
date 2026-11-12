/**
 * Aviso para los listados cuando el rol tiene activado
 * "Alcance de Datos → Solo los suyos".
 */
export const AlcancePropiosAviso = ({ mostrar, className = '' }) => {
  if (!mostrar) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800 ${className}`}
    >
      <i className="fas fa-user-shield mt-0.5 text-amber-600"></i>
      <div>
        <b>Estás viendo solo tus registros.</b>{' '}
        Tu rol tiene activado el alcance <b>Solo los suyos</b> en este listado. Un administrador
        puede cambiarlo en <b>Roles → Permisos → Alcance de Datos</b>.
      </div>
    </div>
  );
};

export default AlcancePropiosAviso;
