import { useState, useEffect } from 'react';
import { BoleteriaService } from '../../../services/boleteria.service';
import { useNavigate } from 'react-router-dom';
import '../../Guias/components/GuiasFilterPanel.css'; // Reutilizamos estilos base

export const BoleteriaFilterPanel = ({ onSearch, onSriLote }) => {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [buses, setBuses] = useState([]);
  const [rutas, setRutas] = useState([]);
  
  const [formData, setFormData] = useState({
    id_usuario: '',
    id_bus: '',
    id_ruta: '',
    estado: '4', // 4 = TODOS
    fecha_desde: new Date().toISOString().split('T')[0],
    fecha_hasta: new Date().toISOString().split('T')[0],
    numero_boleto: '',
    identificacion: ''
  });

  useEffect(() => {
    // Cargar combos
    const loadCombos = async () => {
      try {
        const [u, b, r] = await Promise.all([
          BoleteriaService.getUsuariosParaFiltro().catch(()=>({data:[{id_usuario:1, nombre_usuario:'Cajero 1'}]})),
          BoleteriaService.getBusesParaFiltro().catch(()=>({data:[{id_buses:1, alias_bus:'Bus 45'}]})),
          BoleteriaService.getRutasParaFiltro().catch(()=>({data:[{id_rutas:1, nombre_rutas:'Quito - Guayaquil'}]}))
        ]);
        if(u.data) setUsuarios(u.data);
        if(b.data) setBuses(b.data);
        if(r.data) setRutas(r.data);
      } catch (error) {
        console.error("Error al cargar combos de boletería", error);
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
      id_usuario: '',
      id_bus: '',
      id_ruta: '',
      estado: '4',
      fecha_desde: new Date().toISOString().split('T')[0],
      fecha_hasta: new Date().toISOString().split('T')[0],
      numero_boleto: '',
      identificacion: ''
    };
    setFormData(resetData);
    onSearch(resetData);
  };

  return (
    <div className="guias-filter-panel" style={{ borderTopColor: '#e67e22' }}>
      <div className="filter-header">
        <h3><i className="fas fa-filter"></i> Filtros de Búsqueda</h3>
        <button className="btn-nueva-guia" style={{ backgroundColor: '#e67e22' }} onClick={() => navigate('/boleteria/nuevo')}>
          <i className="fas fa-plus-circle"></i> Vender Boleto
        </button>
      </div>

      <form onSubmit={handleSubmit} className="filter-form">
        <div className="filter-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          
          <div className="form-group">
            <label>Usuario</label>
            <select name="id_usuario" value={formData.id_usuario} onChange={handleChange}>
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_usuario}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Bus</label>
            <select name="id_bus" value={formData.id_bus} onChange={handleChange}>
              <option value="">Todos</option>
              {buses.map(b => <option key={b.id_buses} value={b.id_buses}>{b.disco_buses || b.alias_bus || b.codigo_buses}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Ruta</label>
            <select name="id_ruta" value={formData.id_ruta} onChange={handleChange}>
              <option value="">Todas</option>
              {rutas.map(r => <option key={r.id_rutas} value={r.id_rutas}>{r.nombre_rutas}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Estado</label>
            <select name="estado" value={formData.estado} onChange={handleChange}>
              <option value="4">TODOS</option>
              <option value="1">AUTORIZADA</option>
              <option value="0">EN PROCESO</option>
              <option value="3">PENDIENTE</option>
              <option value="2">ANULADOS</option>
            </select>
          </div>

          <div className="form-group">
            <label>Desde</label>
            <input type="date" name="fecha_desde" value={formData.fecha_desde} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Hasta</label>
            <input type="date" name="fecha_hasta" value={formData.fecha_hasta} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label># Boleto</label>
            <input type="text" name="numero_boleto" value={formData.numero_boleto} onChange={e => handleChange({ target: { name: 'numero_boleto', value: e.target.value.replace(/\D/g, '') } })} placeholder="Opcional" />
          </div>

          <div className="form-group">
            <label>RUC/CI</label>
            <input type="text" name="identificacion" value={formData.identificacion} onChange={e => handleChange({ target: { name: 'identificacion', value: e.target.value.replace(/\D/g, '') } })} placeholder="Opcional" />
          </div>

        </div>

        <div className="filter-actions" style={{ justifyContent: 'flex-end' }}>
          <div className="buttons">
            <button type="button" className="btn-secondary" onClick={handleClear}>
              <i className="fas fa-sync-alt"></i> Limpiar
            </button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: '#2ecc71' }}>
              <i className="fas fa-search"></i> Buscar
            </button>
            <button type="button" className="btn-primary" style={{ backgroundColor: '#3498db' }} onClick={onSriLote}>
              <i className="fas fa-cloud-upload-alt"></i> SRI LOTE
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
