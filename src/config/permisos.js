// Catálogo central de permisos del sistema.
// IMPORTANTE: las claves de cada permiso son las que usa el Sidebar y los guards
// (formato "modulo.clave"). Mantener este archivo como única fuente de verdad
// evita que la pantalla de permisos y el menú se desincronicen.

export const SUBGROUPS_ADMIN = [
  {
    label: 'Seguridad',
    icon: 'fas fa-shield-alt',
    permisos: {
      gestion_usuarios: 'Usuarios',
      gestion_roles: 'Roles',
      ver_auditoria: 'Auditoría',
      monitoreo_vivo: 'Monitoreo en Vivo',
      graficos_dashboard: 'Estadísticas',
    }
  },
  {
    label: 'Catálogos',
    icon: 'fas fa-book',
    permisos: {
      gestion_sucursales: 'Agencias',
      gestion_ciudades: 'Ciudades',
      gestion_provincias: 'Provincias',
      gestion_lugares: 'Lugares',
      gestion_destinos: 'Destinos',
      gestion_convenios: 'Convenios',
      gestion_tipos_envios: 'Tipo de Envíos',
      gestion_formas_pago: 'Forma de Pago',
      gestion_bancos: 'Banco',
    }
  },
  {
    label: 'Operaciones',
    icon: 'fas fa-tools',
    permisos: {
      gestion_buses: 'Buses',
      gestion_vehiculos: 'Vehículos',
      gestion_socios: 'Socios',
      gestion_clientes: 'Clientes',
      gestion_rutas: 'Rutas',
      gestion_sub_rutas: 'Sub-Rutas',
      config_rutas: 'Config. Rutas',
      auditoria_rutas: 'Auditoría Rutas',
      gestion_alimentos: 'Alimentos',
      gestion_inventario: 'Inventario',
      gestion_impresoras: 'Impresoras',
    }
  }
];

export const ALL_PERMISSIONS = {
  // Se mantiene 'administracion' como clave única en BD (compatibilidad con sidebar)
  administracion: {
    label: 'Administración',
    icon: 'fas fa-cogs',
    isSubGrouped: true,
    subGroups: SUBGROUPS_ADMIN,
    // Unión de todos los permisos de los subgrupos (para el toggle general y conteo)
    permisos: Object.assign({}, ...SUBGROUPS_ADMIN.map(sg => sg.permisos)),
    hiddenPermisos: {
      configuracion_sistema: 'Configuración del Sistema',
    }
  },
  aprobaciones: {
    label: 'Aprobaciones',
    icon: 'fas fa-check-circle',
    permisos: {
      listado_aprobaciones: 'Listado Aprobaciones'
    }
  },
  viajes: {
    label: 'Viajes',
    icon: 'fas fa-road',
    permisos: {
      listado_viajes: 'Listado Viajes',
      crear_viaje: 'Creación Viajes',
      planificacion_viajes: 'Planificación',
      despacho_viaje: 'Despacho Viajes',
      cierre_viajes: 'Cierre Viajes',
    }
  },
  guias: {
    label: 'Guías',
    icon: 'fas fa-box',
    permisos: {
      crear_guia: 'Nueva Guía',
      listado_guias: 'Listado Guías',
      busqueda_oficina: 'Buscar Guía Oficina',
      guias_companias: 'Guías Compañías',
      despacho_guias: 'Desp. Guías Compañías',
      despacho_guia: 'Despacho',
      entrega_guia: 'Entrega de Guías',
      seguimiento_guia: 'Seguimientos',
      reimpresion: 'Reimpresión de Guías',
      listado_cajas: 'Listado Cajas',
      cajas_comprobantes: 'Cajas Comprobantes',
      comprobantes: 'Comprobantes',
    }
  },
  notas_venta: {
    label: 'Notas de Venta',
    icon: 'fas fa-receipt',
    permisos: {
      crear_nota_venta: 'Nueva Nota Venta',
      listado_notas_venta: 'Listado Notas Venta',
      despacho_notas_venta: 'Despachos Notas Venta',
      seguimiento_notas_venta: 'Seguimiento Notas Venta',
      entrega_notas_venta: 'Entrega Notas Venta',
      caja_notas_venta: 'Cajas Notas Venta',
    }
  },
  cobros: {
    label: 'Cobros',
    icon: 'fas fa-dollar-sign',
    permisos: {
      listado_cobros: 'Listado Cobros',
      tipos_cobros: 'Tipo Cobros',
      caja_cobros: 'Caja Cobros',
      cartera_socio: 'Cartera Socio',
      multas: 'Multas',
      creditos_admin: 'Créditos Admin.',
      bonos: 'Bonos',
      cuota_admin: 'Cuota Admin.',
      cierre_cobros: 'Cierre x Concepto',
    }
  },
  boletos: {
    label: 'Boletos',
    icon: 'fas fa-ticket-alt',
    permisos: {
      listado_boletos: 'Listado Boletos',
      nuevo_boleto: 'Nuevo Boleto',
      reagendamientos: 'Reagendamientos',
      facturacion_boletos: 'Facturación',
      caja_boleteria: 'Caja Boletería',
      reportes_boleteria: 'Reportes Boletería',
      reservaciones: 'Reservaciones',
      pasajeros: 'Pasajeros',
    }
  },
  anulaciones: {
    label: 'Anulaciones',
    icon: 'fas fa-ban',
    permisos: {
      listado_anulaciones: 'Listado Anulaciones',
      anulacion_boleteria: 'Anulación Boletería',
      verificacion_boleteria: 'Verificaciones',
    }
  },
  facturas: {
    label: 'Facturas',
    icon: 'fas fa-file-invoice',
    permisos: {
      listado_facturas: 'Listado Facturas',
    }
  },
  buseros: {
    label: 'Buseros / Socios',
    icon: 'fas fa-id-card',
    permisos: {
      gestion_buseros: 'Facturación Socio',
      gestion_asientos: 'Asientos',
      recaudado: 'Recaudado',
    }
  },
  notificaciones: {
    label: 'Notificaciones',
    icon: 'fas fa-bell',
    permisos: {
      notificaciones: 'Notificaciones Push',
    }
  },
  reportes: {
    label: 'Reportes',
    icon: 'fas fa-chart-bar',
    permisos: {
      ranking_ventas: 'Ranking Ventas',
      reportes: 'Reportes',
    }
  }
};

// Claves antiguas que aún existen en la BD de muchos roles.
// Se mapean hacia la clave canónica nueva para que el menú siga funcionando
// sin obligar a volver a marcar todos los permisos uno por uno.
export const PERMISOS_ALIAS = {
  'administracion.gestion_usuarios': ['administracion.usuarios'],
  'administracion.gestion_roles': ['administracion.roles'],
  'administracion.ver_auditoria': ['administracion.auditoria'],
  'administracion.monitoreo_vivo': ['administracion.monitoreo_en_vivo'],
  'administracion.gestion_sucursales': ['administracion.sucursales'],
  'administracion.gestion_provincias': ['administracion.listado_provincia'],
  'administracion.gestion_lugares': ['administracion.listado_lugares'],
  'administracion.gestion_destinos': ['administracion.destino'],
  'administracion.gestion_convenios': ['administracion.convenios'],
  'administracion.gestion_tipos_envios': ['administracion.tipo_envios'],
  'administracion.gestion_formas_pago': ['administracion.forma_pago'],
  'administracion.gestion_bancos': ['administracion.listado_banco'],
  'administracion.gestion_buses': ['administracion.buses'],
  'administracion.gestion_vehiculos': ['administracion.vehiculos'],
  'administracion.gestion_socios': ['administracion.socios'],
  'administracion.gestion_clientes': ['administracion.clientes'],
  'administracion.gestion_rutas': ['administracion.rutas'],
  'administracion.gestion_sub_rutas': ['administracion.sub_rutas'],
  'administracion.config_rutas': ['administracion.configuracion_rutas'],
  'administracion.gestion_alimentos': ['administracion.gestionalimentos'],
  'administracion.gestion_impresoras': ['administracion.impresoras'],
  'viajes.crear_viaje': ['viajes.creacion_viajes', 'administracion.viajes'],
  'viajes.planificacion_viajes': ['viajes.configuracion_itinerarios'],
  'viajes.despacho_viaje': ['viajes.despacho_viajes_v2'],
  'guias.crear_guia': ['guias.nueva_guia'],
  'guias.busqueda_oficina': ['guias.buscar_guia_oficina'],
  'guias.despacho_guias': ['guias.despacho_guias_companias'],
  'guias.despacho_guia': ['guias.despacho'],
  'guias.entrega_guia': ['guias.entrega_guias'],
  'guias.seguimiento_guia': ['guias.seguimientos'],
  'guias.reimpresion': ['guias.reimprimir_guia'],
  'boletos.listado_boletos': ['boletos.listado_boleto'],
  'boletos.facturacion_boletos': ['boletos.facturacion_boleto'],
  'boletos.reservaciones': ['boletos.gestionar_reservaciones'],
  'anulaciones.verificacion_boleteria': ['anulaciones.verificaciones_boleteria_encomiendas'],
  'buseros.gestion_buseros': ['buseros.busero'],
  'buseros.gestion_asientos': ['buseros.asientos'],
  'cobros.tipos_cobros': ['cobros.tipo_cobros'],
};

const esObjetoPlano = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

// Convierte cualquier representación de permisos (string JSON, JSON doblemente
// codificado u objeto devuelto por el backend) en un objeto plano.
export const parsePermisos = (raw) => {
  if (esObjetoPlano(raw)) return raw;
  if (typeof raw !== 'string') return {};

  const texto = raw.trim();
  if (!texto) return {};

  try {
    const parsed = JSON.parse(texto);
    if (esObjetoPlano(parsed)) return parsed;
    // Algunos registros antiguos quedaron doblemente codificados
    if (typeof parsed === 'string' && parsed.trim().startsWith('{')) {
      const doble = JSON.parse(parsed);
      if (esObjetoPlano(doble)) return doble;
    }
  } catch (e) {
    // Texto plano o JSON inválido
  }
  return {};
};

const mezclarModulos = (base, extra) => {
  const salida = { ...base };
  Object.entries(extra || {}).forEach(([modulo, valor]) => {
    if (esObjetoPlano(valor)) {
      salida[modulo] = { ...(esObjetoPlano(base?.[modulo]) ? base[modulo] : {}), ...valor };
    } else {
      salida[modulo] = valor;
    }
  });
  return salida;
};

// Resuelve claves antiguas hacia sus equivalentes nuevas (solo en memoria).
export const aplicarAlias = (permisos) => {
  const salida = mezclarModulos({}, permisos);

  Object.entries(PERMISOS_ALIAS).forEach(([canonica, alternativas]) => {
    const [modulo, clave] = canonica.split('.');
    if (salida[modulo]?.[clave] === true) return;

    const activa = alternativas.some(alt => {
      const [altModulo, altClave] = alt.split('.');
      return salida[altModulo]?.[altClave] === true;
    });

    if (activa) {
      salida[modulo] = { ...(salida[modulo] || {}), [clave]: true };
    }
  });

  return salida;
};

// Estructura completa con todas las claves en false (incluye las ocultas).
export const permisosVacios = () => {
  const salida = {};
  Object.entries(ALL_PERMISSIONS).forEach(([mod, config]) => {
    salida[mod] = {};
    Object.keys(config.permisos).forEach(perm => { salida[mod][perm] = false; });
    Object.keys(config.hiddenPermisos || {}).forEach(perm => { salida[mod][perm] = false; });
  });
  return salida;
};

// Permisos normalizados: catálogo completo + alias resueltos.
export const normalizarPermisos = (raw) => mezclarModulos(permisosVacios(), aplicarAlias(parsePermisos(raw)));

// Mantiene sincronizadas las claves antiguas con su equivalente nueva al guardar,
// de modo que activar/desactivar en la pantalla nueva también aplique en BD.
export const sincronizarAlias = (permisos) => {
  const salida = mezclarModulos({}, permisos);

  Object.entries(PERMISOS_ALIAS).forEach(([canonica, alternativas]) => {
    const [modulo, clave] = canonica.split('.');
    const valor = salida[modulo]?.[clave] === true;

    alternativas.forEach(alt => {
      const [altModulo, altClave] = alt.split('.');
      if (esObjetoPlano(salida[altModulo]) && altClave in salida[altModulo]) {
        salida[altModulo] = { ...salida[altModulo], [altClave]: valor };
      }
    });
  });

  return salida;
};

// Construye el JSON final a guardar, preservando módulos/permisos desconocidos.
export const construirPayloadPermisos = (original, estado) => {
  const salida = mezclarModulos({}, parsePermisos(original));

  Object.keys(ALL_PERMISSIONS).forEach(mod => {
    salida[mod] = { ...(esObjetoPlano(salida[mod]) ? salida[mod] : {}), ...(estado[mod] || {}) };
  });

  return sincronizarAlias(salida);
};
