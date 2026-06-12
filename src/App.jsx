import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppMain } from './components/layout/AppMain';
import { useAuth } from './hooks/useAuth';
import { useIdle } from './hooks/useIdle';
import { useSocket } from './hooks/useSocket';
import { DynamicPage } from './pages/Common/DynamicPage';
import { ToastContainer } from './components/common/Toast';
import './App.css';

// Lazy loading de páginas para mejorar rendimiento
const LoginPage = lazy(() => import('./pages/Login/LoginPage').then(m => ({ default: m.LoginPage })));
const InicioPage = lazy(() => import('./pages/Inicio/InicioPage').then(m => ({ default: m.InicioPage })));
const GuiasPage = lazy(() => import('./pages/Guias/GuiasPage').then(m => ({ default: m.GuiasPage })));
const NuevaGuiaPage = lazy(() => import('./pages/Guias/NuevaGuiaPage').then(m => ({ default: m.NuevaGuiaPage })));
const BoleteriaPage = lazy(() => import('./pages/Boleteria/BoleteriaPage').then(m => ({ default: m.BoleteriaPage })));
const NuevoBoletoPage = lazy(() => import('./pages/Boleteria/NuevoBoletoPage').then(m => ({ default: m.NuevoBoletoPage })));
const RecaudadoPage = lazy(() => import('./pages/Recaudado/RecaudadoPage').then(m => ({ default: m.RecaudadoPage })));
const AsientosPage = lazy(() => import('./pages/Asientos/AsientosPage').then(m => ({ default: m.AsientosPage })));
const MonitoreoPage = lazy(() => import('./pages/Monitoreo/MonitoreoPage').then(m => ({ default: m.MonitoreoPage })));
const AgenciasPage = lazy(() => import('./pages/Agencias/AgenciasPage').then(m => ({ default: m.AgenciasPage })));
const BusesPage = lazy(() => import('./pages/Buses/BusesPage').then(m => ({ default: m.BusesPage })));
const AuditoriaRutasPage = lazy(() => import('./pages/AuditoriaRutas/AuditoriaRutasPage').then(m => ({ default: m.AuditoriaRutasPage })));
const EstadisticasPage = lazy(() => import('./pages/Estadisticas/EstadisticasPage').then(m => ({ default: m.EstadisticasPage })));
const ConfigRutasPage = lazy(() => import('./pages/ConfigRutas/ConfigRutasPage').then(m => ({ default: m.ConfigRutasPage })));
const ImpresorasPage = lazy(() => import('./pages/Impresoras/ImpresorasPage').then(m => ({ default: m.ImpresorasPage })));
const DespachoGuiasPage = lazy(() => import('./pages/DespachoGuias/DespachoGuiasPage').then(m => ({ default: m.DespachoGuiasPage })));
const DespachoPage = lazy(() => import('./pages/Despacho/DespachoPage').then(m => ({ default: m.DespachoPage })));
const SeguimientoPage = lazy(() => import('./pages/Seguimiento/SeguimientoPage').then(m => ({ default: m.SeguimientoPage })));
const CobrosPage = lazy(() => import('./pages/Cobros/CobrosPage').then(m => ({ default: m.CobrosPage })));
const FacturacionPage = lazy(() => import('./pages/Facturacion/FacturacionPage').then(m => ({ default: m.FacturacionPage })));
const CajasComprobantesPage = lazy(() => import('./pages/CajasComprobantes/CajasComprobantesPage').then(m => ({ default: m.CajasComprobantesPage })));
const AnulacionesPage = lazy(() => import('./pages/Anulaciones/AnulacionesPage').then(m => ({ default: m.AnulacionesPage })));
const DespachoViajePage = lazy(() => import('./pages/DespachoViaje/DespachoViajePage').then(m => ({ default: m.DespachoViajePage })));
const ReportesBoleteriaPage = lazy(() => import('./pages/ReportesBoleteria/ReportesBoleteriaPage').then(m => ({ default: m.ReportesBoleteriaPage })));
const VerificacionesPage = lazy(() => import('./pages/Verificaciones/VerificacionesPage').then(m => ({ default: m.VerificacionesPage })));
const AnulacionBoleteriaPage = lazy(() => import('./pages/AnulacionBoleteria/AnulacionBoleteriaPage').then(m => ({ default: m.AnulacionBoleteriaPage })));
const BuserosPageCustom = lazy(() => import('./pages/Buseros/BuserosPage').then(m => ({ default: m.BuserosPage })));
const BuscarGuiaOficinaPage = lazy(() => import('./pages/Guias/BuscarGuiaOficinaPage').then(m => ({ default: m.BuscarGuiaOficinaPage })));
const ReportesPage = lazy(() => import('./pages/Reportes/ReportesPage').then(m => ({ default: m.ReportesPage })));
const ConfiguracionPage = lazy(() => import('./pages/Configuracion/ConfiguracionPage').then(m => ({ default: m.ConfiguracionPage })));
const CreacionViajesPage = lazy(() => import('./pages/Viajes/CreacionViajesPage').then(m => ({ default: m.CreacionViajesPage })));
const DespachoViajesPage = lazy(() => import('./pages/Viajes/DespachoViajesPage').then(m => ({ default: m.DespachoViajesPage })));
const ListaViajes = lazy(() => import('./pages/Viajes/ListaViajes').then(m => ({ default: m.ListaViajes })));
const PlanificacionViajesPage = lazy(() => import('./pages/Viajes/PlanificacionViajesPage').then(m => ({ default: m.PlanificacionViajesPage })));
const CobrosRealizadosPage = lazy(() => import('./pages/Guias/CobrosRealizadosPage').then(m => ({ default: m.CobrosRealizadosPage })));
const EditarGuiaPage = lazy(() => import('./pages/Guias/EditarGuiaPage').then(m => ({ default: m.EditarGuiaPage })));
const EntregasPage = lazy(() => import('./pages/Entregas/EntregasPage').then(m => ({ default: m.EntregasPage })));

const RolesPage = lazy(() => import('./pages/Roles/RolesPage').then(m => ({ default: m.RolesPage })));

// Componente Wrapper para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Cargando...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Layout Principal protegido que inicializará Hooks globales
const ProtectedLayout = () => {
  useIdle(); // Monitor de inactividad
  useSocket(); // Conexión a Socket.IO
  
  return <AppMain />;
};

// Loading fallback para Suspense
const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-50 z-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-slate-600 font-medium">Cargando módulo...</p>
    </div>
  </div>
);

function App() {
  return (
    <HashRouter>
      <ToastContainer />
      <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Rutas protegidas */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <ProtectedLayout />
            </ProtectedRoute>
          } 
        >
          {/* Default redirect to /inicio */}
          <Route index element={<Navigate to="/inicio" replace />} />
          <Route path="inicio" element={<InicioPage />} />
          
          {/* Módulos Principales (Componentes Específicos) */}
          <Route path="guias" element={<GuiasPage />} />
<Route path="guias/buscar-oficina" element={<BuscarGuiaOficinaPage />} />
          <Route path="boleteria" element={<BoleteriaPage />} />
          <Route path="recaudado" element={<RecaudadoPage />} />
          <Route path="asientos" element={<AsientosPage />} />
          <Route path="caja" element={<DynamicPage key="caja" configKey="caja" />} />
          <Route path="monitoreo" element={<MonitoreoPage />} />
          <Route path="alimentos" element={<DynamicPage key="alimentos" configKey="alimentos" />} />
          <Route path="creacion-viajes" element={<CreacionViajesPage />} />
          <Route path="despacho-viajes" element={<DespachoViajesPage />} />
          <Route path="viajes" element={<ListaViajes />} />
          <Route path="planificacion-viajes" element={<PlanificacionViajesPage />} />

          {/* Administración (Páginas Dinámicas vía pagesConfig) — key fuerza remount al navegar */}
          <Route path="buses" element={<BusesPage />} />
          <Route path="agencias" element={<DynamicPage key="sucursales" configKey="sucursales" />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="usuarios" element={<DynamicPage key="usuarios" configKey="usuarios" />} />
          <Route path="ciudades" element={<DynamicPage key="ciudades" configKey="ciudades" />} />
          <Route path="convenios" element={<DynamicPage key="convenios" configKey="convenios" />} />
          <Route path="auditoria-rutas" element={<DynamicPage key="auditoria-rutas" configKey="auditoria-rutas" />} />
          <Route path="tipo-envios" element={<DynamicPage key="tipo-envios" configKey="tipo-envios" />} />
          <Route path="forma-pago" element={<DynamicPage key="forma-pago" configKey="forma-pago" />} />
          <Route path="socios" element={<DynamicPage key="socios" configKey="socios" />} />
          <Route path="rutas" element={<DynamicPage key="rutas" configKey="rutas" />} />
          <Route path="bancos" element={<DynamicPage key="bancos" configKey="bancos" />} />
          <Route path="destino" element={<DynamicPage key="destinos" configKey="destinos" />} />
          <Route path="provincia" element={<DynamicPage key="provincias" configKey="provincias" />} />
          <Route path="lugares" element={<DynamicPage key="lugares" configKey="lugares" />} />
          <Route path="inventario" element={<DynamicPage key="inventario" configKey="inventario" />} />
          <Route path="sub-rutas" element={<DynamicPage key="sub-rutas" configKey="sub-rutas" />} />
          <Route path="clientes" element={<DynamicPage key="clientes" configKey="clientes" />} />
          <Route path="buseros" element={<BuserosPageCustom />} />
          
          {/* Operaciones & Reportes (Dinámicas o Específicas) — key fuerza remount al navegar */}
          <Route path="estadisticas" element={<EstadisticasPage />} />
          <Route path="reportes" element={<ReportesPage />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
          <Route path="aprobaciones" element={<DynamicPage key="aprobaciones" configKey="aprobaciones" />} />

          <Route path="cobros" element={<CobrosPage />} />
          <Route path="anulaciones" element={<AnulacionesPage />} />
          <Route path="guias-companias" element={<DynamicPage key="guias-companias" configKey="guias-companias" />} />
          <Route path="entregas" element={<EntregasPage />} />
          <Route path="tipo-cobros" element={<DynamicPage key="tipo-cobros" configKey="tipo-cobros" />} />
          <Route path="pasajeros" element={<DynamicPage key="pasajeros" configKey="pasajeros" />} />
          <Route path="reservaciones" element={<DynamicPage key="reservaciones" configKey="reservaciones" />} />
          <Route path="cajas-comprobantes" element={<CajasComprobantesPage />} />
          <Route path="comprobantes" element={<DynamicPage key="comprobantes" configKey="comprobantes" />} />
          

          {/* Rutas con Componentes Específicos — key fuerza remount al navegar */}
          <Route path="config-rutas" element={<ConfigRutasPage />} />
          <Route path="impresoras" element={<ImpresorasPage />} />
          <Route path="despacho-guias" element={<DespachoGuiasPage />} />
          <Route path="despacho" element={<DespachoPage />} />
          <Route path="seguimiento" element={<SeguimientoPage />} />
          <Route path="caja-cobros" element={<DynamicPage key="caja-cobros" configKey="caja-cobros" />} />
          <Route path="facturacion" element={<FacturacionPage />} />
          <Route path="caja-boleteria" element={<DynamicPage key="caja-boleteria" configKey="caja-boleteria" />} />
          <Route path="despacho-viaje" element={<DynamicPage key="despacho-viaje" configKey="despacho-viaje" />} />
          <Route path="reportes-boleteria" element={<DynamicPage key="reportes-boleteria" configKey="reportes-boleteria" />} />
          <Route path="verificaciones" element={<VerificacionesPage />} />
          <Route path="anulaciones-boleteria" element={<AnulacionBoleteriaPage />} />
          <Route path="anulacion-boleteria" element={<AnulacionBoleteriaPage />} />

          {/* Fallback 404 */}
          <Route path="*" element={<div style={{padding: '20px'}}><h2>Página no encontrada</h2></div>} />
        </Route>

        {/* Pantallas completas sin Layout Principal */}
        <Route path="/guias/nueva" element={<ProtectedRoute><NuevaGuiaPage /></ProtectedRoute>} />
        <Route path="/boleteria/nuevo" element={<ProtectedRoute><NuevoBoletoPage /></ProtectedRoute>} />
        <Route path="/guias/editar/:id" element={<ProtectedRoute><EditarGuiaPage /></ProtectedRoute>} />
        <Route path="/guias/cobros/:id" element={<ProtectedRoute><CobrosRealizadosPage /></ProtectedRoute>} />

      </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
