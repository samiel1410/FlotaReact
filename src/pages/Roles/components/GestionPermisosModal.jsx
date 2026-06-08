import { useState, useEffect } from 'react';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';
import Modal from '../../../components/common/Modal';

const ALL_PERMISSIONS = {
  administracion: {
    label: 'Administración',
    icon: 'fas fa-cogs',
    permisos: {
      gestion_usuarios: 'Gestión de Usuarios',
      gestion_convenios: 'Gestión de Convenios',
      gestion_tipos_envios: 'Gestión de Tipos de Envíos',
      gestion_formas_pago: 'Gestión de Formas de Pago',
      gestion_destinos: 'Gestión de Destinos',
      gestion_buses: 'Gestión de Buses',
      gestion_roles: 'Gestión de Roles',
      gestion_viajes: 'Gestión de Viajes',
      gestion_socios: 'Gestión de Socios',
      gestion_impresoras: 'Gestión de Impresoras',
      gestion_sucursales: 'Gestión de Sucursales',
      gestion_ubicaciones: 'Gestión de Ubicaciones',
      gestion_ciudades: 'Gestión de Ciudades',
      gestion_provincias: 'Gestión de Provincias',
      gestion_lugares: 'Gestión de Lugares',
      gestion_clientes: 'Gestión de Clientes',
      gestion_bancos: 'Gestión de Bancos',
      gestion_alimentos: 'Gestión de Alimentos',
      auditoria_rutas: 'Auditoría de Rutas',
      monitoreo_vivo: 'Monitoreo en Vivo',
      graficos_dashboard: 'Gráficos Dashboard',
      config_rutas: 'Configuración de Rutas',
      gestion_inventario: 'Gestión de Inventario'
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
      reportes: 'Acceso a Reportes'
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
      caja_cobros: 'Caja de Cobros'
    }
  }
};

const GestionPermisosModal = ({ rol, onClose, onSuccess }) => {
  const [permisos, setPermisos] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarPermisos();
  }, []);

  const cargarPermisos = async () => {
    setLoading(true);
    try {
      const res = await api.post('/roles/selectRolesAcciones', { id_rol: rol.id_rol });
      if (res.data?.success && res.data?.data?.length > 0 && res.data.data[0]?.descripcion_rol) {
        try {
          const parsed = JSON.parse(res.data.data[0].descripcion_rol);
          setPermisos(parsed);
        } catch {
          // Si no es JSON válido, usar estructura vacía pero con todos los módulos
          setPermisos(inicializarPermisosVacios());
        }
      } else {
        // Sin permisos guardados, inicializar todos como false
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
        id_rol: rol.id_rol,
        valores: JSON.stringify(permisos)
      });

      if (res.data?.success) {
        toast.success('Permisos actualizados correctamente');
        if (onSuccess) onSuccess();
        onClose();
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
    <Modal isOpen={true} onClose={onClose} title={`PERMISOS: ${rol.nombre_rol}`} width="max-w-5xl">
      <div className="p-1">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <i className="fas fa-spinner fa-spin text-3xl text-blue-500"></i>
            <span className="ml-3 text-slate-500 font-medium">Cargando permisos...</span>
          </div>
        ) : (
          <>
            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
              {Object.keys(ALL_PERMISSIONS).map(modKey => {
                const modulo = ALL_PERMISSIONS[modKey];
                const permisosMod = permisos[modKey] || {};
                const total = Object.keys(modulo.permisos).length;
                const activos = Object.keys(modulo.permisos).filter(p => permisosMod[p] === true).length;
                const todosActivos = activos === total;

                return (
                  <div key={modKey} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    {/* Cabecera del módulo */}
                    <div
                      className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleModulo(modKey)}
                    >
                      <div className="flex items-center gap-3">
                        <i className={`${modulo.icon} text-blue-600 text-lg`}></i>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{modulo.label}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {activos}/{total} permisos activos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          todosActivos ? 'bg-emerald-100 text-emerald-700' : activos > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {todosActivos ? 'TODO' : activos > 0 ? 'PARCIAL' : 'NADA'}
                        </span>
                        <i className={`fas fa-chevron-down text-slate-400 text-xs transition-transform`}></i>
                      </div>
                    </div>

                    {/* Permisos del módulo */}
                    <div className="px-4 py-3">
                      {/* Botón Seleccionar / Deseleccionar todos */}
                      <div className="mb-3 flex items-center">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleModulo(modKey); }}
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border ${
                            todosActivos
                              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <i className={`fas ${todosActivos ? 'fa-times' : 'fa-check-double'} text-[9px]`}></i>
                          {todosActivos ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </button>
                        <span className="ml-3 text-[10px] text-slate-400 font-medium">
                          ({activos}/{total} seleccionados)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Object.keys(modulo.permisos).map(permKey => (
                          <label
                            key={permKey}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                              permisosMod[permKey] === true
                                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={permisosMod[permKey] === true}
                              onChange={() => togglePermiso(modKey, permKey)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className={`text-xs font-medium ${
                              permisosMod[permKey] === true ? 'text-blue-700' : 'text-slate-600'
                            }`}>
                              {modulo.permisos[permKey]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
              <p className="text-xs text-slate-400">
                <i className="fas fa-info-circle mr-1"></i>
                Los cambios se aplicarán a los usuarios con este rol al iniciar sesión nuevamente
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarPermisos}
                  disabled={saving}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
                >
                  {saving ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-save"></i>
                  )}
                  {saving ? 'Guardando...' : 'Guardar Permisos'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default GestionPermisosModal;
