import { useState, useEffect } from 'react';
import { RecaudadoService } from '../../../services/recaudado.service';

export const RecaudadoFilterPanel = ({ onSearch }) => {
  const [personal, setPersonal] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [buses, setBuses] = useState([]);
  
  const [formData, setFormData] = useState({
    id_personal: '',
    id_ruta_busqueda: '',
    id_bus_busqueda: '',
    comboMes: new Date().getMonth() + 1, // 1 a 12
    comboAnioFactura: new Date().getFullYear(),
    buscarPorFechaDesde: ''
  });

  useEffect(() => {
    // Cargar combos
    const loadCombos = async () => {
      try {
        const [p, r, b] = await Promise.all([
          RecaudadoService.getPersonalParaFiltro().catch(()=>({data:[{id_personal:1, nombres_personal:'Juan Perez'}]})),
          RecaudadoService.getRutasParaFiltro().catch(()=>({data:[{id_rutas:1, nombre_rutas:'Quito - Guayaquil'}]})),
          RecaudadoService.getBusesParaFiltro().catch(()=>({data:[{id_buses:1, alias_bus:'Bus 45'}]}))
        ]);
        if(p.data) setPersonal(p.data);
        if(r.data) setRutas(r.data);
        if(b.data) setBuses(b.data);
      } catch (error) {
        console.error("Error al cargar combos de recaudado", error);
      }
    };
    loadCombos();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
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

  return (
    <div className="guias-filter-panel" style={{ borderTopColor: '#9b59b6' }}>
      <div className="filter-header">
        <h3><i className="fas fa-search"></i> Búsqueda de Recaudación</h3>
      </div>

      <form onSubmit={handleSubmit} className="filter-form">
        <div className="filter-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          
          <div className="form-group">
            <label>Socio</label>
            <select name="id_personal" value={formData.id_personal} onChange={handleChange}>
              <option value="">Todos</option>
              {personal.map(p => <option key={p.id_personal} value={p.id_personal}>{p.nombres_personal}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Ruta</label>
            <select name="id_ruta_busqueda" value={formData.id_ruta_busqueda} onChange={handleChange}>
              <option value="">Todas</option>
              {rutas.map(r => <option key={r.id_rutas} value={r.id_rutas}>{r.nombre_rutas}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Bus</label>
            <select name="id_bus_busqueda" value={formData.id_bus_busqueda} onChange={handleChange}>
              <option value="">Todos</option>
              {buses.map(b => <option key={b.id_buses} value={b.id_buses}>{b.alias_bus}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label>Mes</label>
              <select name="comboMes" value={formData.comboMes} onChange={handleChange}>
                <option value="0">Todos</option>
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Año</label>
              <select name="comboAnioFactura" value={formData.comboAnioFactura} onChange={handleChange}>
                <option value="0">Todos</option>
                {[2019,2020,2021,2022,2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Fecha Específica (Opcional)</label>
            <input type="date" name="buscarPorFechaDesde" value={formData.buscarPorFechaDesde} onChange={handleChange} />
          </div>

        </div>

        <div className="filter-actions" style={{ justifyContent: 'flex-end', marginTop: '15px' }}>
          <div className="buttons">
            <button type="button" className="btn-secondary" onClick={handleClear}>
              <i className="fas fa-eraser"></i> Limpiar
            </button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: '#3498db' }}>
              <i className="fas fa-search"></i> Buscar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
