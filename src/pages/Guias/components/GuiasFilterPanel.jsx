import { useState, useEffect } from 'react';
import { GuiaService } from '../../../services/guia.service';
import { useNavigate } from 'react-router-dom';
import './GuiasFilterPanel.css';

export const GuiasFilterPanel = ({ onSearch, visible = true, isNotaVenta = false }) => {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  
  // Estado local del formulario
  const [formData, setFormData] = useState({
    usuario_busqueda: '',
    cedula_remitente: '',
    cedula_destinatario: '',
    numero_factura: '',
    nombre_remitente: '',
    nombre_destinatario: '',
    comboMes: '0',
    comboAnioFactura: '0',
    buscarPorFechaDesde: '',
    buscarPorFechaHasta: '',
    numero_guia: '',
    numero_guia_manual: '',
    estado_busqueda: '4', // 4 = TODOS
    checknumero: false,
    chechEstadoDespacho: false
  });

  useEffect(() => {
    // Cargar combo de usuarios al inicio
    const fetchUsuarios = async () => {
      try {
        const res = await GuiaService.getUsuariosParaFiltro();
        if (res && res.data) setUsuarios(res.data);
      } catch (error) {
        // console.error("Error al cargar usuarios", error);
        // Fallback for visual mock
        setUsuarios([{ id_usuario: 1, nombre_usuario: 'Admin' }, { id_usuario: 2, nombre_usuario: 'Oficina 1' }]);
      }
    };
    fetchUsuarios();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    // Formato para numero de guia (000-000-00000000)
    if (name === 'numero_guia') {
      const digits = value.replace(/\D/g, '').slice(0, 14);
      let formatted = '';
      for (let i = 0; i < digits.length; i++) {
        if (i === 3 || i === 6) formatted += '-';
        formatted += digits[i];
      }
      newValue = formatted;
    }

    setFormData({
      ...formData,
      [name]: newValue
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(formData);
  };

  const handleClear = () => {
    const resetData = {
      usuario_busqueda: '',
      cedula_remitente: '',
      cedula_destinatario: '',
      numero_factura: '',
      nombre_remitente: '',
      nombre_destinatario: '',
      comboMes: '0',
      comboAnioFactura: '0',
      buscarPorFechaDesde: '',
      buscarPorFechaHasta: '',
      numero_guia: '',
      numero_guia_manual: '',
      estado_busqueda: '4',
      checknumero: false,
      chechEstadoDespacho: false
    };
    setFormData(resetData);
    onSearch(resetData);
  };

  return (
    <div className={`guias-filter-panel ${visible ? 'open' : 'collapsed'}`}>
      <div className="filter-header">
        <h3>{isNotaVenta ? 'Búsqueda de Notas de Venta' : 'Búsqueda de Guías'}</h3>
        <button className="btn-nueva-guia" onClick={() => navigate(isNotaVenta ? '/notas-venta/nueva' : '/guias/nueva')}>
          <i className="fas fa-plus-circle"></i> {isNotaVenta ? 'Nueva Nota Venta' : 'Nueva Guía'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="filter-form">
        <div className="filter-grid">
          
          <div className="form-group">
            <label>Usuario</label>
            <select name="usuario_busqueda" value={formData.usuario_busqueda} onChange={handleChange}>
              <option value="">Seleccionar...</option>
              {usuarios.map(u => (
                <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_usuario}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Cédula Remitente</label>
            <input type="text" name="cedula_remitente" value={formData.cedula_remitente} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Cédula Destinatario</label>
            <input type="text" name="cedula_destinatario" value={formData.cedula_destinatario} onChange={handleChange} />
          </div>

          {/* Row 2 */}
          {!isNotaVenta && (
            <div className="form-group">
              <label>Factura</label>
              <input type="text" name="numero_factura" value={formData.numero_factura} onChange={handleChange} />
            </div>
          )}

          <div className="form-group">
            <label>Nombre Remitente</label>
            <input type="text" name="nombre_remitente" value={formData.nombre_remitente} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Nombre Destinatario</label>
            <input type="text" name="nombre_destinatario" value={formData.nombre_destinatario} onChange={handleChange} />
          </div>

          {/* Row 3 - Dates */}
          <div className="form-group group-periodo">
            <label>Periodo</label>
            <div className="flex-inputs">
              <select name="comboMes" value={formData.comboMes} onChange={handleChange}>
                <option value="0">Todos los Meses</option>
                <option value="01">Enero</option>
                <option value="02">Febrero</option>
                <option value="03">Marzo</option>
                <option value="04">Abril</option>
                <option value="05">Mayo</option>
                <option value="06">Junio</option>
                <option value="07">Julio</option>
                <option value="08">Agosto</option>
                <option value="09">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
              <select name="comboAnioFactura" value={formData.comboAnioFactura} onChange={handleChange}>
                <option value="0">Todos los Años</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
          </div>

          <div className="form-group group-rango">
            <label>Rango de Fechas</label>
            <div className="flex-inputs">
              <input type="date" name="buscarPorFechaDesde" value={formData.buscarPorFechaDesde} onChange={handleChange} />
              <input type="date" name="buscarPorFechaHasta" value={formData.buscarPorFechaHasta} onChange={handleChange} />
              <button type="submit" className="btn-search-date" title="Buscar por rango"><i className="fas fa-search"></i></button>
            </div>
          </div>

          {/* Row 4 */}
          <div className="form-group">
            <label>Número de Guía</label>
            <input 
              type="text" 
              name="numero_guia" 
              placeholder="001-001-00000000" 
              maxLength="16" 
              value={formData.numero_guia} 
              onChange={handleChange} 
            />
          </div>

          <div className="form-group">
            <label>Guía Manual</label>
            <input type="text" name="numero_guia_manual" value={formData.numero_guia_manual} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Estado</label>
            <select name="estado_busqueda" value={formData.estado_busqueda} onChange={handleChange}>
              <option value="4">TODOS</option>
              <option value="1">AUTORIZADA</option>
              <option value="0">EN PROCESO</option>
              <option value="3">PENDIENTE</option>
              <option value="2">ANULADOS</option>
            </select>
          </div>

        </div>

        <div className="filter-actions">
          <div className="checkboxes">
            <label>
              <input type="checkbox" name="checknumero" checked={formData.checknumero} onChange={handleChange} /> 
              N° Guía Físico
            </label>
            <label>
              <input type="checkbox" name="chechEstadoDespacho" checked={formData.chechEstadoDespacho} onChange={handleChange} /> 
              Mostrar Todos (Despacho)
            </label>
          </div>
          
          <div className="buttons">
            <button type="button" className="btn-secondary" onClick={handleClear}>
              <i className="fas fa-eraser"></i> Limpiar
            </button>
            <button type="submit" className="btn-primary">
              <i className="fas fa-search"></i> Buscar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
