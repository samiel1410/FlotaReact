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
    estado: '4',
    estado_sri: '',
    fecha_desde: '',
    fecha_hasta: '',
    numero_boleto: '',
    identificacion: ''
  });

  useEffect(() => {
    const loadCombos = async () => {
      try {
        const [u, b, r] = await Promise.all([
          BoleteriaService.getUsuariosParaFiltro().catch(() => ({ data: [] })),
          BoleteriaService.getBusesParaFiltro().catch(() => ({ data: [] })),
          BoleteriaService.getRutasParaFiltro().catch(() => ({ data: [] }))
        ]);
        if (u.data) setUsuarios(u.data);
        if (b.data) setBuses(b.data);
        if (r.data) setRutas(r.data);
      } catch (error) {
        console.error('Error al cargar combos de boletería', error);
      }
    };
    loadCombos();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Máscara automática: 001-001-000000000
  const handleNumeroBoleto = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 3 || i === 6) formatted += '-';
      formatted += digits[i];
    }
    setFormData({ ...formData, numero_boleto: formatted });
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
      estado_sri: '',
      fecha_desde: '',
      fecha_hasta: '',
      numero_boleto: '',
      identificacion: ''
    };
    setFormData(resetData);
    onSearch(resetData);
  };

  return (
    <div className="guias-filter-panel" style={{ borderTopColor: '#e67e22' }}>
      <div className="filter-header">
        <h3><i className="fas fa-ticket-alt" style={{ color: '#e67e22' }}></i> Búsqueda de Boletos</h3>
        <button className="btn-nueva-guia" style={{ backgroundColor: '#e67e22' }} onClick={() => navigate('/boleteria/nuevo')}>
          <i className="fas fa-plus-circle"></i> Vender Boleto
        </button>
      </div>

      <form onSubmit={handleSubmit} className="filter-form">
        <div className="filter-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))' }}>

          <div className="form-group">
            <label><i className="fas fa-hashtag" style={{ color: '#e67e22', marginRight: 4 }}></i> N° Boleto</label>
            <input
              type="text"
              name="numero_boleto"
              value={formData.numero_boleto}
              onChange={handleNumeroBoleto}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSearch(formData); } }}
              placeholder="001-001-000000000"
              maxLength="14"
              style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
            />
          </div>

          <div className="form-group">
            <label><i className="fas fa-id-card" style={{ color: '#e67e22', marginRight: 4 }}></i> RUC / CI</label>
            <input
              type="text"
              name="identificacion"
              value={formData.identificacion}
              onChange={e => setFormData({ ...formData, identificacion: e.target.value.replace(/\D/g, '') })}
              placeholder="Ej: 1804699799"
              maxLength="13"
            />
          </div>

          <div className="form-group">
            <label><i className="fas fa-user" style={{ color: '#e67e22', marginRight: 4 }}></i> Usuario</label>
            <select name="id_usuario" value={formData.id_usuario} onChange={handleChange}>
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_usuario}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label><i className="fas fa-bus" style={{ color: '#e67e22', marginRight: 4 }}></i> Bus</label>
            <select name="id_bus" value={formData.id_bus} onChange={handleChange}>
              <option value="">Todos</option>
              {buses.map(b => <option key={b.id_buses} value={b.id_buses}>{b.disco_buses || b.alias_bus || b.codigo_buses}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label><i className="fas fa-route" style={{ color: '#e67e22', marginRight: 4 }}></i> Ruta</label>
            <select name="id_ruta" value={formData.id_ruta} onChange={handleChange}>
              <option value="">Todas</option>
              {rutas.map(r => <option key={r.id_rutas} value={r.id_rutas}>{r.nombre_rutas}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label><i className="fas fa-toggle-on" style={{ color: '#e67e22', marginRight: 4 }}></i> Estado Boleto</label>
            <select name="estado" value={formData.estado} onChange={handleChange}>
              <option value="4">TODOS</option>
              <option value="1">AUTORIZADO</option>
              <option value="0">EN PROCESO</option>
              <option value="3">ANULADO</option>
              <option value="2">RESERVADO</option>
            </select>
          </div>

          <div className="form-group">
            <label><i className="fas fa-cloud" style={{ color: '#e67e22', marginRight: 4 }}></i> Estado SRI</label>
            <select name="estado_sri" value={formData.estado_sri} onChange={handleChange}>
              <option value="">TODOS</option>
              <option value="AUTORIZADO">AUTORIZADO</option>
              <option value="RECHAZADO">RECHAZADO</option>
              <option value="DEVUELTA">DEVUELTA</option>
              <option value="RECIBIDA">RECIBIDA</option>
              <option value="PENDIENTE">PENDIENTE</option>
            </select>
          </div>

          <div className="form-group">
            <label><i className="fas fa-calendar-alt" style={{ color: '#e67e22', marginRight: 4 }}></i> Desde</label>
            <input type="date" name="fecha_desde" value={formData.fecha_desde} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label><i className="fas fa-calendar-check" style={{ color: '#e67e22', marginRight: 4 }}></i> Hasta</label>
            <input type="date" name="fecha_hasta" value={formData.fecha_hasta} onChange={handleChange} />
          </div>

        </div>

        <div className="filter-actions" style={{ justifyContent: 'flex-end', marginTop: '15px' }}>
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
