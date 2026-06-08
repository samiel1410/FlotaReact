import { useState, useEffect } from 'react';
import { AsientosService } from '../../../services/asientos.service';

const MESES = [
  { value: '0', label: 'Todos' }, { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' }, { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

const ANIOS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

export const AsientosFilterPanel = ({ onSearch }) => {
  const [personal, setPersonal] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [buses, setBuses] = useState([]);

  const [formData, setFormData] = useState({
    id_personal: '',
    id_ruta_busqueda: '',
    id_bus_busqueda: '',
    comboMes: new Date().getMonth() + 1,
    comboAnioFactura: new Date().getFullYear(),
    buscarPorFechaDesde: ''
  });

  useEffect(() => {
    const loadCombos = async () => {
      try {
        const [p, r, b] = await Promise.all([
          AsientosService.getPersonalParaFiltro().catch(() => ({ data: [] })),
          AsientosService.getRutasParaFiltro().catch(() => ({ data: [] })),
          AsientosService.getBusesParaFiltro().catch(() => ({ data: [] }))
        ]);
        if (p.data) setPersonal(p.data);
        if (r.data) setRutas(r.data);
        if (b.data) setBuses(b.data);
      } catch (error) {
        console.error("Error al cargar combos de asientos", error);
      }
    };
    loadCombos();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(formData);
  };

  const handleClear = () => {
    const resetData = {
      id_personal: '',
      id_ruta_busqueda: '',
      id_bus_busqueda: '',
      comboMes: 0,
      comboAnioFactura: 0,
      buscarPorFechaDesde: ''
    };
    setFormData(resetData);
    onSearch(resetData);
  };

  const inputCls = "border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none w-full";
  const labelCls = "text-[9px] font-semibold text-slate-400 uppercase mb-0.5";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
        <i className="fas fa-search mr-1.5 text-orange-500"></i> Búsqueda de Viajes
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="flex flex-col">
            <label className={labelCls}>Socio</label>
            <select name="id_personal" value={formData.id_personal} onChange={handleChange} className={inputCls}>
              <option value="">Todos</option>
              {personal.map(p => (
                <option key={p.id_personal} value={p.id_personal}>
                  {p.per_nombres_persona || p.nombres_personal || p.per_nombres || ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className={labelCls}>Ruta</label>
            <select name="id_ruta_busqueda" value={formData.id_ruta_busqueda} onChange={handleChange} className={inputCls}>
              <option value="">Todas</option>
              {rutas.map(r => (
                <option key={r.id_rutas} value={r.id_rutas}>
                  {r.nombre_rutas || r.rut_nombre || ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className={labelCls}>Bus</label>
            <select name="id_bus_busqueda" value={formData.id_bus_busqueda} onChange={handleChange} className={inputCls}>
              <option value="">Todos</option>
              {buses.map(b => (
                <option key={b.id_buses} value={b.id_buses}>
                  {b.alias_bus || b.disco_buses || b.bus_placa || ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className={labelCls}>Mes</label>
            <select name="comboMes" value={formData.comboMes} onChange={handleChange} className={inputCls}>
              {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className={labelCls}>Año</label>
            <select name="comboAnioFactura" value={formData.comboAnioFactura} onChange={handleChange} className={inputCls}>
              <option value="0">Todos</option>
              {ANIOS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className={labelCls}>Fecha Salida</label>
            <input type="date" name="buscarPorFechaDesde" value={formData.buscarPorFechaDesde} onChange={handleChange} className={inputCls} />
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button type="submit"
            className="flex items-center gap-1 px-4 py-1.5 bg-orange-600 text-white text-[10px] font-bold rounded-lg hover:bg-orange-700 transition-colors">
            <i className="fas fa-search"></i> Buscar Viajes
          </button>
          <button type="button" onClick={handleClear}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-300 transition-colors">
            <i className="fas fa-eraser"></i> Limpiar
          </button>
        </div>
      </form>
    </div>
  );
};
