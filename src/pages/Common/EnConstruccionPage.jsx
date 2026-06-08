export const EnConstruccionPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50 text-slate-500 gap-4">
      <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mb-2">
        <i className="fas fa-hard-hat text-4xl"></i>
      </div>
      <h2 className="text-2xl font-bold text-slate-700">Módulo en Construcción</h2>
      <p className="text-sm max-w-md text-center">
        Esta pantalla formaba parte del sistema antiguo (ExtJS) y actualmente está en la cola para ser migrada al nuevo entorno de React.
      </p>
    </div>
  );
};
