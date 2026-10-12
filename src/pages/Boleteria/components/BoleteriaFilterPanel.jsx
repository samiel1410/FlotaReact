import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { DateRangePicker } from '../../../components/common/DateRangePicker';
import { BusquedaRutaModal } from '../../Buseros/components/BusquedaRutaModal';
import { BusquedaPersonalModal } from '../../Buseros/components/BusquedaPersonalModal';
import { BusquedaBusModal } from '../../Despacho/components/BusquedaBusModal';
import '../../Guias/components/GuiasFilterPanel.css'; // Reutilizamos estilos base

const MESES = [
  { v: '0', l: 'Todos' },
  { v: '1', l: 'Enero' }, { v: '2', l: 'Febrero' }, { v: '3', l: 'Marzo' },
  { v: '4', l: 'Abril' }, { v: '5', l: 'Mayo' }, { v: '6', l: 'Junio' },
  { v: '7', l: 'Julio' }, { v: '8', l: 'Agosto' }, { v: '9', l: 'Septiembre' },
  { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' },
];

export const BoleteriaFilterPanel = ({ onSearch, onSriLote }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const rolNum = parseInt(user?.rol_usuario || user?.rol || 0, 10);
  const isRolAdmin = rolNum === 5 || rolNum === 1;
  const currentUserId = user?.id_usuario || user?.id || '';

  // Modales de búsqueda (las listas son largas y no caben en un <select>).
  const [showRutaModal, setShowRutaModal] = useState(false);
  const [showBusModal, setShowBusModal] = useState(false);
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);

  // Nombres legibles para los filtros seleccionados por modal.
  const [nombres, setNombres] = useState({ ruta: '', bus: '', usuario: '' });

  const anioActual = new Date().getFullYear();
  const aniosDisponibles = [];
  for (let a = anioActual + 1; a >= anioActual - 4; a--) aniosDisponibles.push(String(a));

  const [formData, setFormData] = useState({
    id_usuario: !isRolAdmin ? currentUserId : '',
    id_bus: '',
    id_ruta: '',
    estado: '4',
    estado_sri: '',
    cobrado: '',
    fecha_desde: '',
    fecha_hasta: '',
    numero_boleto: '',
    identificacion: '',
    clave_acceso: '',
    comboMes: '0',
    comboAnio: '0'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Máscara automática: 001-001-000000000
  const handleNumeroBoleto = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 3 || i === 6) formatted += '-';
      formatted += digits[i];
    }
    setFormData(prev => ({ ...prev, numero_boleto: formatted }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(formData);
  };

  const handleClear = () => {
    const resetData = {
      id_usuario: !isRolAdmin ? currentUserId : '',
      id_bus: '',
      id_ruta: '',
      estado: '4',
      estado_sri: '',
      cobrado: '',
      fecha_desde: '',
      fecha_hasta: '',
      numero_boleto: '',
      identificacion: '',
      clave_acceso: '',
      comboMes: '0',
      comboAnio: '0'
    };
    setFormData(resetData);
    setNombres({ ruta: '', bus: '', usuario: '' });
    onSearch(resetData);
  };

  /** Campo de solo lectura que abre un modal de búsqueda. */
  const campoBusqueda = ({ label, icon, valor, placeholder, onOpen, onClear }) => (
    <div className="form-group">
      <label><i className={`fas ${icon}`} style={{ color: '#e67e22', marginRight: 4 }}></i> {label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          readOnly
          value={valor}
          placeholder={placeholder}
          onClick={onOpen}
          style={{ flex: 1, cursor: 'pointer', backgroundColor: '#fff' }}
        />
        <button
          type="button"
          onClick={onOpen}
          title={`Buscar ${label.toLowerCase()}`}
          style={{ padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#f8fafc', cursor: 'pointer' }}
        >
          <i className="fas fa-search" style={{ color: '#e67e22' }}></i>
        </button>
        {valor ? (
          <button
            type="button"
            onClick={onClear}
            title="Quitar"
            style={{ padding: '0 10px', border: '1px solid #fecaca', borderRadius: 4, background: '#fef2f2', cursor: 'pointer' }}
          >
            <i className="fas fa-times" style={{ color: '#c0392b' }}></i>
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="guias-filter-panel" style={{ borderTopColor: '#e67e22' }}>
      <div className="filter-header">
        <h3><i className="fas fa-ticket-alt" style={{ color: '#e67e22' }}></i> Búsqueda de Boletos</h3>
        <button className="btn-nueva-guia" style={{ backgroundColor: '#e67e22' }} onClick={() => navigate('/boleteria/nuevo')}>
          <i className="fas fa-plus-circle"></i> Vender Boleto
        </button>
      </div>

      <form onSubmit={handleSubmit} className="filter-form">
        <div className="filter-grid">

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

          {isRolAdmin
            ? campoBusqueda({
                label: 'Usuario',
                icon: 'fa-user',
                valor: nombres.usuario,
                placeholder: 'Todos',
                onOpen: () => setShowUsuarioModal(true),
                onClear: () => {
                  setNombres(prev => ({ ...prev, usuario: '' }));
                  setFormData(prev => ({ ...prev, id_usuario: '' }));
                },
              })
            : (
              <div className="form-group">
                <label><i className="fas fa-user" style={{ color: '#e67e22', marginRight: 4 }}></i> Mi Usuario</label>
                <input
                  type="text"
                  value={user?.nombre_usuario || user?.username || 'Usuario actual'}
                  disabled
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                />
              </div>
            )}

          {campoBusqueda({
            label: 'Bus',
            icon: 'fa-bus',
            valor: nombres.bus,
            placeholder: 'Todos',
            onOpen: () => setShowBusModal(true),
            onClear: () => {
              setNombres(prev => ({ ...prev, bus: '' }));
              setFormData(prev => ({ ...prev, id_bus: '' }));
            },
          })}

          {campoBusqueda({
            label: 'Ruta',
            icon: 'fa-route',
            valor: nombres.ruta,
            placeholder: 'Todas',
            onOpen: () => setShowRutaModal(true),
            onClear: () => {
              setNombres(prev => ({ ...prev, ruta: '' }));
              setFormData(prev => ({ ...prev, id_ruta: '' }));
            },
          })}

          <div className="form-group">
            <label><i className="fas fa-toggle-on" style={{ color: '#e67e22', marginRight: 4 }}></i> Estado Boleto</label>
            <select name="estado" value={formData.estado} onChange={handleChange}>
              <option value="4">TODOS</option>
              <option value="EMITIDO">EMITIDO</option>
              <option value="3">ANULADO</option>
            </select>
          </div>

          <div className="form-group">
            <label><i className="fas fa-hand-holding-usd" style={{ color: '#e67e22', marginRight: 4 }}></i> Estado Cobro</label>
            <select name="cobrado" value={formData.cobrado} onChange={handleChange}>
              <option value="">TODOS</option>
              <option value="1">COBRADO</option>
              <option value="0">NO COBRADO</option>
            </select>
          </div>

          <div className="form-group">
            <label><i className="fas fa-cloud" style={{ color: '#e67e22', marginRight: 4 }}></i> Estado SRI</label>
            <select name="estado_sri" value={formData.estado_sri} onChange={handleChange}>
              <option value="">TODOS</option>
              <option value="AUTORIZADO">AUTORIZADO</option>
              <option value="EN PROCESO">EN PROCESO</option>
              <option value="ANULADO">ANULADO</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2', minWidth: '240px' }}>
            <label><i className="fas fa-key" style={{ color: '#e67e22', marginRight: 4 }}></i> Clave de Acceso</label>
            <input
              type="text"
              name="clave_acceso"
              value={formData.clave_acceso}
              onChange={e => setFormData(prev => ({ ...prev, clave_acceso: e.target.value.replace(/\D/g, '') }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSearch(formData); } }}
              placeholder="Clave de acceso del comprobante (49 dígitos)"
              maxLength="49"
              style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
            />
          </div>

          <div className="form-group">
            <label><i className="fas fa-calendar" style={{ color: '#e67e22', marginRight: 4 }}></i> Mes</label>
            <select name="comboMes" value={formData.comboMes} onChange={handleChange}>
              {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label><i className="fas fa-calendar-alt" style={{ color: '#e67e22', marginRight: 4 }}></i> Año</label>
            <select name="comboAnio" value={formData.comboAnio} onChange={handleChange}>
              <option value="0">Todos</option>
              {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2', minWidth: '240px' }}>
            <label><i className="fas fa-calendar-alt" style={{ color: '#e67e22', marginRight: 4 }}></i> Rango de Fechas</label>
            <DateRangePicker
              startDate={formData.fecha_desde}
              endDate={formData.fecha_hasta}
              onChange={({ startDate, endDate }) => {
                setFormData(prev => ({
                  ...prev,
                  fecha_desde: startDate || '',
                  fecha_hasta: endDate || ''
                }));
              }}
              placeholder="Filtrar por rango de fechas..."
            />
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

      {/* ── Modales de búsqueda (listas largas) ── */}
      {showRutaModal && (
        <BusquedaRutaModal
          onClose={() => setShowRutaModal(false)}
          onSelect={(id, nombre) => {
            setFormData(prev => ({ ...prev, id_ruta: id }));
            setNombres(prev => ({ ...prev, ruta: nombre }));
            setShowRutaModal(false);
          }}
        />
      )}

      {showBusModal && (
        <BusquedaBusModal
          onClose={() => setShowBusModal(false)}
          onSelect={(bus) => {
            setFormData(prev => ({ ...prev, id_bus: bus.id_buses || bus.codigo_buses }));
            setNombres(prev => ({ ...prev, bus: `Bus ${bus.disco_buses || ''} · ${bus.placa_buses || ''}`.trim() }));
            setShowBusModal(false);
          }}
        />
      )}

      {showUsuarioModal && (
        <BusquedaPersonalModal
          onClose={() => setShowUsuarioModal(false)}
          onSelect={(id, nombre) => {
            setFormData(prev => ({ ...prev, id_usuario: id }));
            setNombres(prev => ({ ...prev, usuario: nombre }));
            setShowUsuarioModal(false);
          }}
        />
      )}
    </div>
  );
};
