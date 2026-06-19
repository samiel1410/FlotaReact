import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// =============================================
// ESTRUCTURA DE MENÚ — fiel al TreeList de ExtJS (Main.js)
// permission = "modulo.permiso_key" mapea al JSON descripcion_rol del rol
// =============================================
const MENU = [
  {
    id: 'seguridad',
    title: 'Seguridad',
    icon: 'fas fa-shield-alt',
    items: [
      { to: '/usuarios', icon: 'fas fa-user', label: 'Usuarios', permission: 'administracion.gestion_usuarios' },
      { to: '/roles', icon: 'fas fa-user-shield', label: 'Roles', permission: 'administracion.gestion_roles' },
      { to: '/auditoria', icon: 'fas fa-history', label: 'Auditoría', permission: 'administracion.ver_auditoria' },
      { to: '/monitoreo', icon: 'fas fa-satellite-dish', label: 'Monitoreo en Vivo', permission: 'administracion.monitoreo_vivo' },
      { to: '/estadisticas', icon: 'fas fa-chart-line', label: 'Estadísticas', permission: 'administracion.graficos_dashboard' },
    ]
  },
  {
    id: 'catalogos',
    title: 'Catálogos',
    icon: 'fas fa-book',
    items: [
      { to: '/agencias', icon: 'fas fa-building', label: 'Agencias', permission: 'administracion.gestion_sucursales' },
      { to: '/ciudades', icon: 'fas fa-city', label: 'Ciudades', permission: 'administracion.gestion_ciudades' },
      { to: '/provincia', icon: 'fas fa-map', label: 'Provincias', permission: 'administracion.gestion_provincias' },
      { to: '/lugares', icon: 'fas fa-map-marker-alt', label: 'Lugares', permission: 'administracion.gestion_lugares' },
      { to: '/destino', icon: 'fas fa-map-marker-alt', label: 'Destinos', permission: 'administracion.gestion_destinos' },
      { to: '/convenios', icon: 'fas fa-hands-helping', label: 'Convenios', permission: 'administracion.gestion_convenios' },
      { to: '/tipo-envios', icon: 'fas fa-paper-plane', label: 'Tipo de Envíos', permission: 'administracion.gestion_tipos_envios' },
      { to: '/forma-pago', icon: 'fas fa-money-bill-wave', label: 'Forma de Pago', permission: 'administracion.gestion_formas_pago' },
      { to: '/bancos', icon: 'fas fa-university', label: 'Banco', permission: 'administracion.gestion_bancos' },
    ]
  },
  {
    id: 'operaciones',
    title: 'Operaciones',
    icon: 'fas fa-tools',
    items: [
      { to: '/buses', icon: 'fas fa-bus', label: 'Buses', permission: 'administracion.gestion_buses' },
      { to: '/socios', icon: 'fas fa-users', label: 'Socios', permission: 'administracion.gestion_socios' },
      { to: '/clientes', icon: 'fas fa-user-tie', label: 'Clientes', permission: 'administracion.gestion_clientes' },
      { to: '/rutas', icon: 'fas fa-route', label: 'Rutas', permission: 'administracion.config_rutas' },
      { to: '/sub-rutas', icon: 'fas fa-code-branch', label: 'Sub-Rutas', permission: 'administracion.config_rutas' },
      { to: '/config-rutas', icon: 'fas fa-cogs', label: 'Config. Rutas', permission: 'administracion.config_rutas' },
      { to: '/alimentos', icon: 'fas fa-utensils', label: 'Alimentos', permission: 'administracion.gestion_alimentos' },
      { to: '/inventario', icon: 'fas fa-boxes', label: 'Inventario', permission: 'administracion.gestion_inventario' },
      { to: '/impresoras', icon: 'fas fa-print', label: 'Impresoras', permission: 'administracion.gestion_impresoras' },
    ]
  },
  {
    id: 'aprobaciones',
    title: 'Aprobaciones',
    icon: 'fas fa-check-circle',
    items: [
      { to: '/aprobaciones', icon: 'fas fa-check-square', label: 'Listado Aprobaciones', permission: 'aprobaciones.listado_aprobaciones' },
    ]
  },
  {
    id: 'viajes',
    title: 'Viajes',
    icon: 'fas fa-road',
    items: [
      { to: '/viajes', icon: 'fas fa-list', label: 'Listado Viajes', permission: 'viajes.listado_viajes' },
      { to: '/creacion-viajes', icon: 'fas fa-plus-square', label: 'Creación Viajes', permission: 'viajes.crear_viaje' },
      { to: '/planificacion-viajes', icon: 'fas fa-calendar-alt', label: 'Planificación', permission: 'viajes.crear_viaje' },
      { to: '/despacho-viajes', icon: 'fas fa-shipping-fast', label: 'Despacho Viajes', permission: 'viajes.despacho_viaje' },
      { to: '/cierre-viajes', icon: 'fas fa-file-invoice', label: 'Cierre Viajes', permission: 'viajes.listado_viajes' },
    ]
  },
  {
    id: 'guias',
    title: 'Guías',
    icon: 'fas fa-box',
    items: [
      { to: '/guias/nueva', icon: 'fas fa-plus-circle', label: 'Nueva Guía', permission: 'guias.crear_guia' },
      { to: '/guias', icon: 'fas fa-truck-moving', label: 'Listado Guías', permission: 'guias.listado_guias' },
      { to: '/guias/buscar-oficina', icon: 'fas fa-search', label: 'Buscar Guía Oficina', permission: 'guias.busqueda_oficina' },
      { to: '/guias-companias', icon: 'fas fa-truck-moving', label: 'Guías Compañías', permission: 'guias.guias_companias' },
      { to: '/despacho-guias', icon: 'fas fa-truck-moving', label: 'Desp. Guías Compañías', permission: 'guias.despacho_guias' },
      { to: '/despacho', icon: 'fas fa-truck-loading', label: 'Despacho', permission: 'guias.despacho_guia' },
      { to: '/entregas', icon: 'fas fa-hand-holding-usd', label: 'Entrega de Guías', permission: 'guias.entrega_guia' },
      { to: '/seguimiento', icon: 'fas fa-box-open', label: 'Seguimientos', permission: 'guias.seguimiento_guia' },
    ]
  },
  {
    id: 'notas_venta',
    title: 'Notas de Venta',
    icon: 'fas fa-receipt',
    items: [
      { to: '/notas-venta/nueva', icon: 'fas fa-plus-square', label: 'Nueva Nota Venta', permission: 'notas_venta.crear_nota_venta' },
      { to: '/notas-venta', icon: 'fas fa-list-alt', label: 'Listado Notas Venta', permission: 'notas_venta.listado_notas_venta' },
      { to: '/despachos-notas-venta', icon: 'fas fa-truck-moving', label: 'Despachos Notas Venta', permission: 'notas_venta.despacho_notas_venta' },
      { to: '/seguimiento-notas-venta', icon: 'fas fa-box-open', label: 'Seguimiento Notas Venta', permission: 'notas_venta.seguimiento_notas_venta' },
      { to: '/entregas-notas-venta', icon: 'fas fa-hand-holding-usd', label: 'Entrega Notas Venta', permission: 'notas_venta.entrega_notas_venta' },
    ]
  },
  {
    id: 'cobros',
    title: 'Cobros',
    icon: 'fas fa-dollar-sign',
    items: [
      { to: '/cobros', icon: 'fas fa-list-alt', label: 'Listado Cobros', permission: 'cobros.listado_cobros' },
      { to: '/tipo-cobros', icon: 'fas fa-tags', label: 'Tipo Cobros', permission: 'cobros.tipos_cobros' },
      { to: '/caja-cobros', icon: 'fas fa-cash-register', label: 'Caja Cobros', permission: 'cobros.caja_cobros' },
      { to: '/cartera-socio', icon: 'fas fa-wallet', label: 'Cartera Socio', permission: 'cobros.cartera_socio' },
      { to: '/multas', icon: 'fas fa-gavel', label: 'Multas', permission: 'cobros.multas' },
      { to: '/creditos-admin', icon: 'fas fa-hand-holding-usd', label: 'Créditos Admin.', permission: 'cobros.creditos_admin' },
      { to: '/bonos', icon: 'fas fa-gift', label: 'Bonos', permission: 'cobros.bonos' },
      { to: '/cuota-admin', icon: 'fas fa-calendar-alt', label: 'Cuota Admin.', permission: 'cobros.cuota_admin' },
      { to: '/cierre-cobros', icon: 'fas fa-file-invoice', label: 'Cierre x Concepto', permission: 'cobros.cierre_cobros' },
    ]
  },
  {
    id: 'boletos',
    title: 'Boletos',
    icon: 'fas fa-ticket-alt',
    items: [
      { to: '/boleteria', icon: 'fas fa-list', label: 'Listado Boletos', permission: 'boletos.listado_boletos' },
      { to: '/boleteria/nuevo', icon: 'fas fa-plus-circle', label: 'Nuevo Boleto', permission: 'boletos.nuevo_boleto' },
      { to: '/facturacion', icon: 'fas fa-file-invoice-dollar', label: 'Facturación', permission: 'boletos.facturacion_boletos' },
      { to: '/caja-boleteria', icon: 'fas fa-cash-register', label: 'Caja Boletería', permission: 'boletos.caja_boleteria' },
      { to: '/reportes-boleteria', icon: 'fas fa-chart-bar', label: 'Reportes Boletería', permission: 'boletos.reportes_boleteria' },
      { to: '/reservaciones', icon: 'fas fa-calendar-check', label: 'Reservaciones', permission: 'boletos.reservaciones' },
    ]
  },
  {
    id: 'cajas',
    title: 'Cajas',
    icon: 'fas fa-cash-register',
    items: [
      { to: '/caja', icon: 'fas fa-cash-register', label: 'Listado Cajas', permission: 'cajas.listado_cajas' },
      { to: '/cajas-comprobantes', icon: 'fas fa-cash-register', label: 'Cajas Comprobantes', permission: 'cajas.cajas_comprobantes' },
      { to: '/comprobantes', icon: 'fas fa-receipt', label: 'Comprobantes', permission: 'cajas.comprobantes' },
    ]
  },
  {
    id: 'anulaciones',
    title: 'Anulaciones',
    icon: 'fas fa-ban',
    items: [
      { to: '/anulaciones', icon: 'fas fa-list', label: 'Listado Anulaciones', permission: 'anulaciones.listado_anulaciones' },
      { to: '/anulaciones-boleteria', icon: 'fas fa-times-circle', label: 'Anulación Boletería', permission: 'anulaciones.anulacion_boleteria' },
      { to: '/verificaciones', icon: 'fas fa-check-double', label: 'Verificaciones', permission: 'anulaciones.verificacion_boleteria' },
    ]
  },
  {
    id: 'facturas',
    title: 'Facturas',
    icon: 'fas fa-file-invoice',
    items: [
      { to: '/facturas', icon: 'fas fa-file-invoice-dollar', label: 'Listado Facturas', permission: 'facturas.listado_facturas' },
    ]
  },
  {
    id: 'buseros',
    title: 'Buseros / Socios',
    icon: 'fas fa-id-card',
    items: [
      { to: '/buseros', icon: 'fas fa-bus', label: 'Listado Buseros', permission: 'buseros.gestion_buseros' },
      { to: '/asientos', icon: 'fas fa-chair', label: 'Asientos', permission: 'buseros.gestion_asientos' },
    ]
  },
  {
    id: 'reportes',
    title: 'Reportes',
    icon: 'fas fa-chart-bar',
    items: [
      { to: '/ranking-ventas', icon: 'fas fa-trophy', label: 'Ranking Ventas', permission: 'reportes.ranking_ventas' },
      { to: '/reportes', icon: 'fas fa-file-archive', label: 'Reportes', permission: 'reportes.reportes' },
    ]
  },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const [openCategories, setOpenCategories] = useState({});

  // Filtrar menú según permisos del usuario
  const filteredMenu = useMemo(() => {
    return MENU.map(cat => ({
      ...cat,
      items: cat.items.filter(item => {
        // Si no tiene permiso requerido, ocultar
        if (item.permission && !hasPermission(item.permission)) return false;
        // Si no tiene rol requerido, ocultar
        if (item.roles && user) {
          const userRoles = user.roles || user.role || [];
          const rolesArr = Array.isArray(userRoles) ? userRoles : [userRoles];
          const hasAllowedRole = rolesArr.some(r => {
            const roleName = typeof r === 'string' ? r : r?.nombre;
            return item.roles.includes(roleName);
          });
          if (!hasAllowedRole) return false;
        }
        return true;
      })
    })).filter(cat => cat.items.length > 0);
  }, [hasPermission, user]);

  // Auto-abrir solo la categoría activa al navegar (acordeón: una a la vez)
  useEffect(() => {
    const currentPath = location.pathname;
    let activeCategoryId = null;

    for (const cat of filteredMenu) {
      const isActive = cat.items.some(item => currentPath.startsWith(item.to) && item.to !== '/');
      if (isActive) {
        activeCategoryId = cat.id;
        break;
      }
    }

    if (activeCategoryId) {
      setOpenCategories(prev => {
        if (prev[activeCategoryId]) return prev;
        return { [activeCategoryId]: true };
      });
    }
  }, [location.pathname, filteredMenu]);

  const toggle = (id) =>
    setOpenCategories(prev => {
      // Si ya está abierta, cerrarla
      if (prev[id]) return {};
      // Si no, abrir solo esta y cerrar las demás
      return { [id]: true };
    });

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen shadow-2xl z-20 shrink-0">
      {/* Brand - EasyPlus */}
      <div className="flex items-center justify-center gap-3 h-16 border-b border-slate-800 bg-slate-950/50 shrink-0">
        <img src="/images/transpaeasy.png" alt="EasyPlus" className="w-10 h-10 object-contain" />
        <span className="font-bold text-lg tracking-wider text-slate-100 uppercase">EasyPlus</span>
      </div>

      {/* Inicio rápido */}
      <div className="px-3 pt-3 shrink-0">
        <NavLink
          to="/inicio"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 ${isActive
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <i className="fas fa-home w-5 text-center"></i>
          Inicio
        </NavLink>
      </div>

      {/* Navigation (accordion) */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {filteredMenu.map(cat => {
          const isOpen = !!openCategories[cat.id];
          const hasActive = cat.items.some(item =>
            location.pathname.startsWith(item.to) && item.to !== '/'
          );

          return (
            <div key={cat.id}>
              <button
                onClick={() => toggle(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors group ${hasActive
                  ? 'text-blue-400 bg-blue-900/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <i className={`${cat.icon} w-4 text-center text-xs`}></i>
                  <span className="text-[11px] font-bold uppercase tracking-wider">{cat.title}</span>
                </div>
                <i className={`fas fa-chevron-right text-[9px] transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}></i>
              </button>

              <div
                className={`overflow-hidden transition-all duration-250 ease-in-out ${isOpen ? 'max-h-[950px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
              >
                <div className="ml-2 pl-2 border-l border-slate-700/60 flex flex-col gap-0.5 py-1">
                  {cat.items.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/guias'}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] font-medium transition-all duration-150 ${isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                        }`
                      }
                    >
                      <i className={`${item.icon} w-4 text-center text-xs shrink-0`}></i>
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

    </aside>
  );
};
