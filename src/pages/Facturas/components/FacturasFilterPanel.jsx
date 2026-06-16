import { useState } from 'react';

const MESES = [
  { value: '', label: 'Todos' },
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

const ANIOS = ['', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];

const ESTADOS_FACTURA = [
  { value: '', label: 'Todos' },
  { value: '1', label: 'En Proceso' },
  { value: '2', label: 'Anulado' },
  { value: '3', label: 'Pendiente' },
  { value: '4', label: 'Autorizado' },
];

export const FacturasFilterPanel = ({ onSearch, usuarios = [] }) => {
  const [filtros, setFiltros] = useState({
    nombrecliente: '',
    rucliente: '',
    estado: '',
    mes: '',
    anio: '',
    fechaini: '',
    fechalast: '',
    factura: '',
    numeroguia: '',
    idusuario: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(filtros);
  };

  const handleClear = () => {
    const reset = {
      nombrecliente: '', rucliente: '', estado: '', mes: '',
      anio: '', fechaini: '', fechalast: '', factura: '',
      numeroguia: '', idusuario: '',
    };
    setFiltros(reset);
    onSearch(reset);
  };

  const inputClass = "w-full h-8 px-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white text-slate-800";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center gap-2">
        <i className="fas fa-search text-blue-500 text-xs"></i>
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Búsqueda de Facturas</span>
      </div>

      <form onSubmit={handleSubmit} className="p-4">
        <div className="grid grid-cols-12 gap-3">
          {/* Fila 1: Nombre, RUC, Estado */}
          <div className="col-span-3">
            <label className={labelClass}>Nombre</label>
            <input type="text" name="nombrecliente" value={filtros.nombrecliente} onChange={handleChange}
              placeholder="Buscar por nombre..." className={inputClass} />
          </div>
          <div className="col-span-3">
            <label className={labelClass}>RUC</label>
            <input type="text" name="rucliente" value={filtros.rucliente} onChange={handleChange}
              placeholder="Buscar por RUC..." className={inputClass} />
          </div>
          <div className="col-span-3">
            <label className={labelClass}>Estado</label>
            <select name="estado" value={filtros.estado} onChange={handleChange} className={inputClass}>
              {ESTADOS_FACTURA.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-3">
            <label className={labelClass}>Usuario</label>
            <select name="idusuario" value={filtros.idusuario} onChange={handleChange} className={inputClass}>
              <option value="">Todos</option>
              {usuarios.map(u => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nombre_usuario} {u.apellido_usuario || ''}
                </option>
              ))}
            </select>
          </div>

          {/* Fila 2: Periodo (Mes + Año) */}
          <div className="col-span-3">
            <label className={labelClass}>Mes</label>
            <select name="mes" value={filtros.mes} onChange={handleChange} className={inputClass}>
              {MESES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-3">
            <label className={labelClass}>Año</label>
            <select name="anio" value={filtros.anio} onChange={handleChange} className={inputClass}>
              {ANIOS.map(a => (
                <option key={a} value={a}>{a || 'Todos'}</option>
              ))}
            </select>
          </div>

          {/* Rango Fechas */}
          <div className="col-span-3">
            <label className={labelClass}>Fecha Desde</label>
            <input type="date" name="fechaini" value={filtros.fechaini} onChange={handleChange} className={inputClass} />
          </div>
          <div className="col-span-3">
            <label className={labelClass}>Fecha Hasta</label>
            <input type="date" name="fechalast" value={filtros.fechalast} onChange={handleChange} className={inputClass} />
          </div>

          {/* Fila 3: Factura #, Guía # */}
          <div className="col-span-3">
            <label className={labelClass}>N° Factura</label>
            <input type="text" name="factura" value={filtros.factura} onChange={handleChange}
              placeholder="Ej: 001-001-000000001" className={inputClass} />
          </div>
          <div className="col-span-3">
            <label className={labelClass}>N° Guía</label>
            <input type="text" name="numeroguia" value={filtros.numeroguia} onChange={handleChange}
              placeholder="Buscar por guía..." className={inputClass} />
          </div>

          {/* Acciones */}
          <div className="col-span-6 flex items-end justify-end gap-2">
            <button type="button" onClick={handleClear}
              className="h-8 px-3 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1.5">
              <i className="fas fa-eraser"></i> Limpiar
            </button>
            <button type="submit"
              className="h-8 px-4 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-sm">
              <i className="fas fa-search"></i> Buscar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
