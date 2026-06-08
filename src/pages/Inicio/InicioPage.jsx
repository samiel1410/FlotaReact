import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './InicioPage.css';

const ACCIONES = [
  { label: 'Listado Guías',      icon: 'fas fa-clipboard-list',  iconClass: 'icon-guias',     path: '/guias',                permission: 'guias.listado_guias' },
  { label: 'Nueva Guía',         icon: 'fas fa-plus-circle',     iconClass: 'icon-nueva',     path: '/guias/nueva',          permission: 'guias.crear_guia' },
  { label: 'Listado Boletos',    icon: 'fas fa-ticket-alt',      iconClass: 'icon-boletos',   path: '/boleteria',            permission: 'boletos.listado_boletos' },
  { label: 'Nuevo Boleto',       icon: 'fas fa-plus-circle',     iconClass: 'icon-nuevo-bol', path: '/boleteria/nuevo',      permission: 'boletos.nuevo_boleto' },
  { label: 'Viajes',             icon: 'fas fa-road',            iconClass: 'icon-viajes',    path: '/viajes',               permission: 'viajes.listado_viajes' },
  { label: 'Crear Viaje',        icon: 'fas fa-plus-square',     iconClass: 'icon-crear-via', path: '/creacion-viajes',      permission: 'viajes.crear_viaje' },
  { label: 'Despacho Viajes',    icon: 'fas fa-shipping-fast',   iconClass: 'icon-desp-via',  path: '/despacho-viajes',      permission: 'viajes.despacho_viaje' },
  { label: 'Despacho',           icon: 'fas fa-truck-loading',   iconClass: 'icon-despacho',  path: '/despacho',             permission: 'guias.despacho_guia' },
  { label: 'Seguimientos',       icon: 'fas fa-box-open',        iconClass: 'icon-seguim',    path: '/seguimiento',          permission: 'guias.seguimiento_guia' },
  { label: 'Cobros',             icon: 'fas fa-dollar-sign',     iconClass: 'icon-cobros',    path: '/cobros',               permission: 'cobros.listado_cobros' },
  { label: 'Recaudado',          icon: 'fas fa-coins',           iconClass: 'icon-recaudado', path: '/recaudado',            permission: 'facturas.listado_facturas' },
  { label: 'Caja Boletería',     icon: 'fas fa-cash-register',   iconClass: 'icon-caja-bol',  path: '/caja-boleteria',       permission: 'boletos.caja_boleteria' },
  { label: 'Usuarios',           icon: 'fas fa-users',           iconClass: 'icon-usuarios',  path: '/usuarios',             permission: 'administracion.gestion_usuarios' },
  { label: 'Reportes',           icon: 'fas fa-chart-bar',       iconClass: 'icon-reportes',  path: '/reportes',             permission: 'reportes.reportes' },
  { label: 'Monitoreo',          icon: 'fas fa-satellite-dish',  iconClass: 'icon-monitoreo', path: '/monitoreo',            permission: 'administracion.monitoreo_vivo' },
];

export const InicioPage = () => {
  const [date, setDate] = useState('');
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  useEffect(() => {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setDate(today.toLocaleDateString('es-EC', options));
  }, []);

  const accionesVisibles = ACCIONES.filter(a => !a.permission || hasPermission(a.permission));

  return (
    <div className="inicio-container">
      <div className="dashboard-hero">
        <div className="hero-content">
          <h1 className="hero-title">Sistema de Gestión EasysPlus</h1>
          <p className="hero-subtitle">Bienvenido a su panel de control. Todo lo que necesita en un solo lugar.</p>
          <div className="hero-date">{date}</div>
        </div>
      </div>

      <div className="dashboard-main">
        <div className="dashboard-section">
          <div className="section-label">Accesos Directos</div>
          <div className="dashboard-actions-grid">
            {accionesVisibles.map(a => (
              <button key={a.path} className="dashboard-btn-card" onClick={() => navigate(a.path)}>
                <i className={`${a.icon} ${a.iconClass}`}></i>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-footer">
        &copy; {new Date().getFullYear()} EasysPlus Solutions. Todos los derechos reservados.
      </div>
    </div>
  );
};
