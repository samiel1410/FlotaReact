import { useState, useEffect } from 'react';
import { api } from '../../config/axios';
import toast from 'react-hot-toast';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

// Visualmente se muestran en 3 subgrupos, pero todos se guardan bajo la clave 'administracion'
// para mantener compatibilidad con los permisos existentes en BD y en el Sidebar
const SUBGROUPS_ADMIN = [
  {
    label: 'Seguridad',
    icon: 'fas fa-shield-alt',
    permisos: {
      gestion_usuarios: 'Gestión de Usuarios',
      gestion_roles: 'Gestión de Roles',
      ver_auditoria: 'Auditoría del Sistema',
      monitoreo_vivo: 'Monitoreo en Vivo',
      graficos_dashboard: 'Estadísticas',
    }
  },
  {
    label: 'Catálogos',
    icon: 'fas fa-book',
    permisos: {
      gestion_sucursales: 'Gestión de Agencias',
      gestion_ciudades: 'Gestión de Ciudades',
      gestion_provincias: 'Gestión de Provincias',
      gestion_lugares: 'Gestión de Lugares',
      gestion_destinos: 'Gestión de Destinos',
      gestion_convenios: 'Gestión de Convenios',
      gestion_tipos_envios: 'Gestión de Tipos de Envíos',
      gestion_formas_pago: 'Gestión de Formas de Pago',
      gestion_bancos: 'Gestión de Bancos',
    }
  },
  {
    label: 'Operaciones',
    icon: 'fas fa-tools',
    permisos: {
      gestion_buses: 'Gestión de Buses',
      gestion_socios: 'Gestión de Socios',
      gestion_clientes: 'Gestión de Clientes',
      config_rutas: 'Configuración de Rutas',
      auditoria_rutas: 'Auditoría de Rutas',
      gestion_alimentos: 'Gestión de Alimentos',
      gestion_inventario: 'Gestión de Inventario',
      gestion_impresoras: 'Gestión de Impresoras',
    }
  }
];

const ALL_PERMISSIONS = {
  // Se mantiene 'administracion' como clave única en BD (compatibilidad con sidebar)
  administracion: {
    label: '⚙️ Administración',
    icon: 'fas fa-cogs',
    isSubGrouped: true,
    subGroups: SUBGROUPS_ADMIN,
    // Unión de todos los permisos de los subgrupos (para el toggle general y conteo)
    permisos: Object.assign({}, ...SUBGROUPS_ADMIN.map(sg => sg.permisos)),
    // Conservamos permisos que no están en subgrupos pero estaban en el original
    hiddenPermisos: {
      configuracion_sistema: 'Configuración del Sistema',
    }
  },
  guias: {
    label: 'Guías',
    icon: 'fas fa-box',
    permisos: {
      crear_guia: 'Crear Guía',
      listado_guias: 'Listado de Guías',
      despacho_guia: 'Despacho de Guía',
      entrega_guia: 'Entrega de Guía',
      seguimiento_guia: 'Seguimiento de Guía',
      guias_companias: 'Guías de Compañías',
      despacho_guias: 'Despacho de Guías',
      busqueda_oficina: 'Búsqueda en Oficina',
      reimpresion: 'Reimpresión'
    }
  },
  notas_venta: {
    label: 'Notas de Venta',
    icon: 'fas fa-receipt',
    permisos: {
      crear_nota_venta: 'Crear Nota de Venta',
      listado_notas_venta: 'Listado de Notas de Venta',
      despacho_notas_venta: 'Despachos de Notas de Venta',
      seguimiento_notas_venta: 'Seguimiento de Notas de Venta',
      entrega_notas_venta: 'Entrega de Notas de Venta'
    }
  },
  boletos: {
    label: 'Boletos',
    icon: 'fas fa-ticket-alt',
    permisos: {
      nuevo_boleto: 'Nuevo Boleto',
      listado_boletos: 'Listado de Boletos',
      caja_boleteria: 'Caja de Boletería',
      despachos: 'Despachos',
      reportes_boleteria: 'Reportes de Boletería',
      reservaciones: 'Reservaciones',
      pasajeros: 'Pasajeros',
      facturacion_boletos: 'Facturación de Boletos'
    }
  },
  cajas: {
    label: 'Cajas',
    icon: 'fas fa-cash-register',
    permisos: {
      listado_cajas: 'Listado de Cajas',
      comprobantes: 'Comprobantes',
      cajas_comprobantes: 'Cajas de Comprobantes'
    }
  },
  anulaciones: {
    label: 'Anulaciones',
    icon: 'fas fa-ban',
    permisos: {
      listado_anulaciones: 'Listado de Anulaciones',
      anulacion_boleteria: 'Anulación de Boletería',
      verificacion_boleteria: 'Verificación Boletería/Encomiendas'
    }
  },
  aprobaciones: {
    label: 'Aprobaciones',
    icon: 'fas fa-check-circle',
    permisos: {
      listado_aprobaciones: 'Listado de Aprobaciones'
    }
  },
  buseros: {
    label: 'Buseros',
    icon: 'fas fa-bus',
    permisos: {
      gestion_buseros: 'Gestión de Buseros',
      gestion_asientos: 'Gestión de Asientos'
    }
  },
  notificaciones: {
    label: 'Notificaciones',
    icon: 'fas fa-bell',
    permisos: {
      notificaciones: 'Acceso a Notificaciones'
    }
  },
  reportes: {
    label: 'Reportes',
    icon: 'fas fa-file-alt',
    permisos: {
      reportes: 'Acceso a Reportes',
      ranking_ventas: 'Ranking de Ventas'
    }
  },
  facturas: {
    label: 'Facturas',
    icon: 'fas fa-file-invoice',
    permisos: {
      listado_facturas: 'Listado de Facturas'
    }
  },
  viajes: {
    label: 'Viajes',
    icon: 'fas fa-road',
    permisos: {
      listado_viajes: 'Listado de Viajes',
      crear_viaje: 'Crear Viaje',
      despacho_viaje: 'Despacho de Viaje',
      config_itinerarios: 'Configuración de Itinerarios'
    }
  },
  cobros: {
    label: 'Cobros',
    icon: 'fas fa-dollar-sign',
    permisos: {
      listado_cobros: 'Listado de Cobros',
      tipos_cobros: 'Tipos de Cobros',
      caja_cobros: 'Caja de Cobros',
      cartera_socio: 'Cartera Socio',
      multas: 'Multas',
      creditos_admin: 'Créditos Admin.',
      bonos: 'Bonos',
      cuota_admin: 'Cuota Admin.',
      cierre_cobros: 'Cierre x Concepto'
    }
  }
};

export const PermisosRolPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const rol = location.state?.rol || { id_rol: id, nombre_rol: 'Rol ' + id };
  
  const [permisos, setPermisos] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarPermisos();
  }, [id]);

  const cargarPermisos = async () => {
    setLoading(true);
    try {
      const res = await api.post('/roles/selectRolesAcciones', { id_rol: id });
      if (res.data?.success && res.data?.data?.length > 0 && res.data.data[0]?.descripcion_rol) {
        try {
          const parsed = JSON.parse(res.data.data[0].descripcion_rol);
          setPermisos(parsed);
        } catch {
          setPermisos(inicializarPermisosVacios());
        }
      } else {
        setPermisos(inicializarPermisosVacios());
      }
    } catch (err) {
      console.error('Error cargando permisos:', err);
      toast.error('Error al cargar los permisos');
      setPermisos(inicializarPermisosVacios());
    } finally {
      setLoading(false);
    }
  };

  const inicializarPermisosVacios = () => {
    const result = {};
    Object.keys(ALL_PERMISSIONS).forEach(mod => {
      result[mod] = {};
      Object.keys(ALL_PERMISSIONS[mod].permisos).forEach(perm => {
        result[mod][perm] = false;
      });
    });
    return result;
  };

  const togglePermiso = (modulo, permiso) => {
    setPermisos(prev => ({
      ...prev,
      [modulo]: {
        ...prev[modulo],
        [permiso]: !prev[modulo]?.[permiso]
      }
    }));
  };

  const toggleModulo = (modulo) => {
    const allTrue = Object.keys(ALL_PERMISSIONS[modulo].permisos)
      .every(p => permisos[modulo]?.[p] === true);
    const newValue = !allTrue;

    setPermisos(prev => {
      const updated = { ...prev, [modulo]: { ...prev[modulo] } };
      Object.keys(ALL_PERMISSIONS[modulo].permisos).forEach(p => {
        updated[modulo][p] = newValue;
      });
      return updated;
    });
  };

  const guardarPermisos = async () => {
    setSaving(true);
    try {
      const res = await api.post('/roles/editarAccionesRoles', {
        id_rol: id,
        valores: JSON.stringify(permisos)
      });

      if (res.data?.success) {
        toast.success('Permisos actualizados correctamente');
        navigate('/roles');
      } else {
        toast.error(res.data?.message || 'Error al guardar permisos');
      }
    } catch (err) {
      console.error('Error guardando permisos:', err);
      toast.error('Error de conexión al guardar permisos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-100/50 p-6">
      <div className="bg-white border-b border-slate-200 shadow-sm rounded-xl mb-6 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/roles')}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Permisos de Sistema</h1>
            <p className="text-sm font-medium text-blue-600">Editando Rol: {rol.nombre_rol}</p>
          </div>
        </div>
        
        <button
          onClick={guardarPermisos}
          disabled={saving || loading}
          className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
        >
          {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
          {saving ? 'Guardando...' : 'Guardar Permisos'}
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <i className="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
            <span className="text-slate-500 font-medium text-lg">Cargando permisos actuales...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.keys(ALL_PERMISSIONS).map(modKey => {
              const modulo = ALL_PERMISSIONS[modKey];
              const permisosMod = permisos[modKey] || {};

              // --- Si el módulo tiene subgrupos (solo 'administracion') ---
              if (modulo.isSubGrouped) {
                const totalGeneral = Object.keys(modulo.permisos).length;
                const activosGeneral = Object.keys(modulo.permisos).filter(p => permisosMod[p] === true).length;

                return (
                  <div key={modKey} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col col-span-1 lg:col-span-3">
                    {/* Cabecera del módulo */}
                    <div
                      className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleModulo(modKey)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <i className={`${modulo.icon} text-sm`}></i>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{modulo.label}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {activosGeneral}/{totalGeneral} activos
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleModulo(modKey); }}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border ${
                          activosGeneral === totalGeneral
                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <i className={`fas ${activosGeneral === totalGeneral ? 'fa-times' : 'fa-check-double'} text-[10px]`}></i>
                        {activosGeneral === totalGeneral ? 'Desactivar Todos' : 'Activar Todos'}
                      </button>
                    </div>

                    {/* Subgrupos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                      {modulo.subGroups.map((sub, subIdx) => {
                        const subPermKeys = Object.keys(sub.permisos);
                        const subActivos = subPermKeys.filter(p => permisosMod[p] === true).length;
                        const subTotal = subPermKeys.length;
                        return (
                          <div key={subIdx} className="p-4 bg-slate-50/30">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <i className={`${sub.icon} text-blue-500 text-xs w-4 text-center`}></i>
                                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wide">{sub.label}</h5>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                subActivos === subTotal ? 'bg-emerald-100 text-emerald-700' : subActivos > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {subActivos}/{subTotal}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {subPermKeys.map(permKey => (
                                <label
                                  key={permKey}
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border ${
                                    permisosMod[permKey] === true
                                      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                      : 'bg-white border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className={`text-[11px] font-medium ${
                                    permisosMod[permKey] === true ? 'text-blue-700' : 'text-slate-600'
                                  }`}>
                                    {sub.permisos[permKey]}
                                  </span>
                                  <div className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ml-2 ${
                                    permisosMod[permKey] === true ? 'bg-blue-500' : 'bg-slate-300'
                                  }`}>
                                    <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                                      permisosMod[permKey] === true ? 'left-4 transform translate-x-3' : 'left-0.5'
                                    }`}></div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={permisosMod[permKey] === true}
                                    onChange={() => togglePermiso(modKey, permKey)}
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // --- Módulos normales (sin subgrupos) ---
              const total = Object.keys(modulo.permisos).length;
              const activos = Object.keys(modulo.permisos).filter(p => permisosMod[p] === true).length;
              const todosActivos = activos === total;

              return (
                <div key={modKey} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                  {/* Cabecera del módulo */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleModulo(modKey)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <i className={`${modulo.icon} text-sm`}></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{modulo.label}</h4>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {activos}/{total} activos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        todosActivos ? 'bg-emerald-100 text-emerald-700' : activos > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {todosActivos ? 'TODO' : activos > 0 ? 'PARCIAL' : 'NADA'}
                      </span>
                    </div>
                  </div>

                  {/* Permisos del módulo */}
                  <div className="p-4 flex-1 flex flex-col bg-slate-50/30">
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleModulo(modKey); }}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 border w-full ${
                          todosActivos
                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <i className={`fas ${todosActivos ? 'fa-times' : 'fa-check-double'} text-[10px]`}></i>
                        {todosActivos ? 'Desactivar Todos' : 'Activar Todos'}
                      </button>
                    </div>

                    <div className="space-y-2 flex-1">
                      {Object.keys(modulo.permisos).map(permKey => (
                        <label
                          key={permKey}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                            permisosMod[permKey] === true
                              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`text-xs font-medium ${
                            permisosMod[permKey] === true ? 'text-blue-700' : 'text-slate-600'
                          }`}>
                            {modulo.permisos[permKey]}
                          </span>
                          <div className={`w-10 h-5 rounded-full relative transition-colors ${
                            permisosMod[permKey] === true ? 'bg-blue-500' : 'bg-slate-300'
                          }`}>
                            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                              permisosMod[permKey] === true ? 'left-5.5 transform translate-x-5' : 'left-0.5'
                            }`}></div>
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={permisosMod[permKey] === true}
                            onChange={() => togglePermiso(modKey, permKey)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
