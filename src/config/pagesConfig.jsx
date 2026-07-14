import UsuarioForm from '../pages/Usuarios/components/UsuarioForm';
import { BusForm } from '../pages/Buses/components/BusForm';
import SucursalForm from '../pages/Agencias/components/SucursalForm';
import BancoForm from '../pages/Bancos/components/BancoForm';
import ConvenioForm from '../pages/Convenios/components/ConvenioForm';
import LugarForm from '../pages/Lugares/components/LugarForm';
import TipoEnvioForm from '../pages/TipoEnvio/components/TipoEnvioForm';
import SocioForm from '../pages/Socios/components/SocioForm';
import RutaForm from '../pages/Rutas/components/RutaForm';
import SubRutaForm from '../pages/SubRutas/components/SubRutaForm';
import InventarioForm from '../pages/Inventario/components/InventarioForm';
import NewCantonForm from '../pages/Canton/components/NewCantonForm';
import NewFormaPagoForm from '../pages/FormaPago/components/NewFormaPagoForm';
import NewRolForm from '../pages/Roles/components/NewRolForm';
import NewProvinciaForm from '../pages/Provincia/components/NewProvinciaForm';
import NewAlimentoForm from '../pages/Alimentos/components/NewAlimentoForm';
import NewDestinoForm from '../pages/Destino/components/NewDestinoForm';
import ClienteForm from '../pages/Clientes/components/ClienteForm';
import { GenericForm } from '../components/common/GenericForm';
import { NuevaGuiaCompaniaForm } from '../pages/Guias/components/NuevaGuiaCompaniaForm';
import { createAperturaAction, createBuscarCajaAction, createCerrarAction } from './cajaUtils';
import { api } from '../config/axios';
import Swal from 'sweetalert2';
import comprobantesService from '../services/comprobantes.service';

// Configuración centralizada para todas las páginas genéricas de listado
export const PAGES_CONFIG = {

  // ─── ADMINISTRACIÓN ─────────────────────────────────────────────────────────

  buses: {
    title: 'Buses', subtitle: 'Gestión de flota de buses',
    icon: 'fas fa-bus', iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
    endpoint: '/buses/seleccionarBuses',
    idField: 'id_buses',
    deleteEndpoint: '/buses/eliminarBus',
    actions: {
      create: true, edit: true, delete: true, custom: [
        { id: 'mapa', icon: 'fas fa-chair', tooltip: 'Configurar Mapa', color: 'text-blue-600' }
      ]
    },
    formComponent: BusForm,
    columns: [
      { key: 'codigo_buses', label: 'Código' },
      { key: 'disco_buses', label: 'Disco' },
      { key: 'placa_buses', label: 'Placa' },
      { key: 'marca_buses', label: 'Marca', render: v => v || '-' },
      { key: 'modelo_buses', label: 'Modelo', render: v => v || '-' },
      { key: 'anio_buses', label: 'Año' },
      { key: 'motor_buses', label: 'Motor', render: v => v || '-' },
      { key: 'chasis_buses', label: 'Chasis', render: v => v || '-' },
      { key: 'capacidad_buses', label: 'Cap.', render: v => v || '-' },
      { key: 'pisos_buses', label: 'Pisos', render: v => v == 2 ? '2 Pisos' : '1 Piso' },
      { key: 'busero', label: 'Busero', render: (_, r) => `${r.per_cedula_personal || ''} - ${r.per_nombre_persona || ''}` },
      { key: 'fecha_creacion_buses', label: 'F. Creación', render: v => v ? v.split(' ')[0] : '' },
      { key: 'estado_buses', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'codigo_busqueda', label: 'Código', type: 'text' },
      { key: 'anio_busqueda', label: 'Año', type: 'text' },
      {
        key: 'estado_busqueda', label: 'Estado', type: 'select', options: [
          { value: '1', label: 'Activo' },
          { value: '0', label: 'Inactivo' }
        ]
      },
    ]
  },

  usuarios: {
    title: 'Usuarios', subtitle: 'Gestión de usuarios del sistema',
    icon: 'fas fa-users', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600',
    endpoint: '/usuario/usuarioSeleccionarPaginado',
    idField: 'id_usuario',
    deleteEndpoint: '/usuario/eliminarUsuario',
    actions: { create: true, edit: true, delete: true },
    formComponent: UsuarioForm,
    columns: [
      { key: 'username_usuario', label: 'Usuario' },
      { key: 'nombre', label: 'Nombre', render: (_, r) => `${r.nombre_usuario || ''} ${r.apellido_usuario || ''}`.trim() },
      {
        key: 'rol_usuario', label: 'Rol Móvil', render: v => {
          if (v == 1) return 'Administrador';
          if (v == 2) return 'Busero';
          if (v == 4) return 'Oficinista';
          if (v == 5) return 'Super Administrador';
          return v;
        }
      },
      { key: 'nombre_rol', label: 'Rol Web' },
      { key: 'nombre_sucursal', label: 'Sucursal' },
      { key: 'telefono_usuario', label: 'Teléfono' },
      { key: 'fecha_creacion_usuario', label: 'F. Creación', render: v => v ? v.split(' ')[0] : '' },
      { key: 'estado_usuario', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'nombre_busqueda', label: 'Nombre/Usuario', type: 'text' },
      {
        key: 'estado_busqueda', label: 'Estado', type: 'select', options: [
          { value: '1', label: 'Activo' },
          { value: '0', label: 'Inactivo' }
        ]
      },
    ]
  },

  sucursales: {
    title: 'Agencias / Sucursales', subtitle: 'Puntos de atención y agencias',
    icon: 'fas fa-building', iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
    endpoint: '/sucursal/sucursalselect',
    idField: 'id_sucursal',
    deleteEndpoint: '/sucursal/eliminarSucursal',
    actions: { create: true, edit: true, delete: true },
    formComponent: SucursalForm,
    columns: [
      { key: 'nombre_sucursal', label: 'Nombre' },
      { key: 'suc_codigo_sucursal', label: 'Código' },
      { key: 'ciudad_sucursal', label: 'Ciudad' },
      { key: 'ruc_sucursal', label: 'RUC' },
      { key: 'telefono_sucursal', label: 'Teléfono' },
      { key: 'direccion_sucursal', label: 'Dirección' },
      { key: 'punto_emision_sucursal', label: 'P.E. Guías', render: v => v || '-' },
      { key: 'punto_emision_boleteria_sucursal', label: 'P.E. Boletería', render: v => v || '-' },
      { key: 'porcentaje_retencion', label: '% Ret.', render: v => `${parseFloat(v || 0).toFixed(2)} %` },
    ],
    filters: [
      { key: 'nombre_sucursal', label: 'Nombre', type: 'text' },
    ]
  },

  roles: {
    title: 'Roles', subtitle: 'Gestión de roles y permisos',
    icon: 'fas fa-user-shield', iconBg: 'bg-rose-100', iconColor: 'text-rose-600',
    endpoint: '/roles/rolesSeleccionPaginado',
    idField: 'id_rol',
    deleteEndpoint: '/roles/roleseliminar',
    actions: {
      create: true, edit: true, delete: true, custom: [
        { id: 'permisos', icon: 'fas fa-wrench', tooltip: 'Gestionar Permisos', color: 'text-amber-600' }
      ]
    },
    formComponent: NewRolForm,
    columns: [
      { key: 'nombre_rol', label: 'Nombre' },
      { key: 'fecha_creacion_rol', label: 'F. Creación', render: v => v ? v.split(' ')[0] : '' },
      { key: 'estado_rol', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'nombre_busqueda', label: 'Nombre', type: 'text' },
    ],
    customParams: (page, pageSize, filters) => ({
      nombre: filters.nombre_busqueda || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  ciudades: {
    title: 'Ciudades', subtitle: 'Gestión de ciudades y cantones',
    icon: 'fas fa-city', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
    endpoint: '/canton/cantonSeleccionPaginado',
    idField: 'id_canton',
    deleteEndpoint: '/canton/cantonEliminar',
    actions: { create: true, edit: true, delete: true },
    formComponent: NewCantonForm,
    columns: [
      { key: 'nombre_canton', label: 'Nombre' },
      { key: 'nombre_provincia', label: 'Provincia' },
    ],
    filters: [
      { key: 'nombre', label: 'Nombre', type: 'text' },
    ],
    // Backend uses `page` (1-based) instead of `start` (offset)
    customParams: (page, pageSize, filters) => ({
      nombre: filters.nombre || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  convenios: {
    title: 'Convenios', subtitle: 'Gestión de convenios corporativos',
    icon: 'fas fa-handshake', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600',
    endpoint: '/companiaasociada/companiaasociadaSeleccionPaginado',
    idField: 'id_compania_asociada',
    deleteEndpoint: '/companiaasociada/companiaasociadaeliminar',
    actions: { create: true, edit: true, delete: true },
    formComponent: ConvenioForm,
    columns: [
      { key: 'nombre_compania_asociada', label: 'Nombre' },
      { key: 'direccion_compania_asociada', label: 'Dirección' },
      { key: 'estado_compania_asociada', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'nombre', label: 'Nombre', type: 'text' },
      { key: 'ruc', label: 'RUC', type: 'text' },
    ],
    // Override para paginación: backend usa numero_bloque/tamanio_bloque
    customParams: (page, pageSize, filters) => ({
      ...filters,
      numero_bloque: page + 1,
      tamanio_bloque: pageSize,
    }),
  },

  "tipo-envios": {
    title: 'Tipos de Envío', subtitle: 'Categorías de encomiendas',
    icon: 'fas fa-box-open', iconBg: 'bg-orange-100', iconColor: 'text-orange-600',
    endpoint: '/tipoenvio/tipoenvioSeleccionPaginado',
    idField: 'id_tipo_envio',
    deleteEndpoint: '/tipoenvio/tipoEnvioEliminar',
    actions: { create: true, edit: true, delete: true },
    formComponent: TipoEnvioForm,
    columns: [
      { key: 'cod_tipo_envio', label: 'Código', render: v => v || '-' },
      { key: 'nombre_envio', label: 'Nombre' },
      { key: 'costo_envio', label: 'Costo', render: v => v ? `$ ${parseFloat(v).toFixed(2)}` : '-' },
      {
        key: 'tipo_impuesto', label: 'Impuesto',
        render: v => {
          if (v === '0' || v === 0 || v === '') return '0%';
          if (v === '1') return '12%';
          if (v === '2') return '13%';
          if (v === '3') return '14%';
          if (v === '4') return '15%';
          return v || '-';
        }
      },
      { key: 'observacion_tipo_envio', label: 'Descripción', render: v => v || '-' },
      { key: 'estado_tipo_envio', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'nombre_busqueda', label: 'Nombre', type: 'text' },
    ],
    customParams: (page, pageSize, filters) => ({
      nombre: filters.nombre_busqueda || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  "forma-pago": {
    title: 'Formas de Pago', subtitle: 'Métodos de pago aceptados',
    icon: 'fas fa-credit-card', iconBg: 'bg-rose-100', iconColor: 'text-rose-600',
    endpoint: '/formapago/formapagoSeleccionPaginado',
    idField: 'id_forma_pago',
    deleteEndpoint: '/formapago/formapagoeliminar',
    actions: { create: true, edit: true, delete: true },
    formComponent: NewFormaPagoForm,
    columns: [
      { key: 'nombre_forma_pago', label: 'Nombre' },
      { key: 'codigo_forma_pago', label: 'Código' },
      { key: 'estado_forma_pago_cuenta', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'nombre_busqueda', label: 'Nombre', type: 'text' },
    ],
    customParams: (page, pageSize, filters) => ({
      nombre: filters.nombre_busqueda || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  socios: {
    title: 'Socios', subtitle: 'Listado de socios de la cooperativa',
    icon: 'fas fa-users', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
    endpoint: '/personal/SociosSeleccionar',
    idField: 'id_personal',
    deleteEndpoint: '/personal/eliminarPersonal',
    actions: { create: true, edit: true, delete: true },
    formComponent: SocioForm,
    actions: {
      create: true, edit: true, delete: true, custom: [
        {
          id: 'pdf',
          icon: 'fas fa-file-pdf',
          tooltip: 'Hoja de Vida',
          color: 'text-red-500 hover:border-red-200 hover:bg-red-50',
          modal: (row) => `/php/socio/hoja_vida_personal.php?id_personal=${row.id_personal}`,
          handler: (row) => { }
        }
      ]
    },
    columns: [
      { key: 'per_cedula_personal', label: 'Cédula', render: (v, r) => v || r.soc_cedula || '' },
      { key: 'per_nombres_persona', label: 'Nombres', render: (v, r) => v || r.soc_nombres || '' },
      { key: 'per_apellidos_personal', label: 'Apellidos', render: (v, r) => v || r.soc_apellidos || '' },
      { key: 'celular_personal', label: 'Celular', render: (v, r) => v || r.soc_telefono || '' },
      { key: 'estado_personal', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'nombre_busqueda', label: 'Nombres/Cédula', type: 'text' },
    ],
    customParams: (page, pageSize, filters) => ({
      nombre_busqueda: filters.nombre_busqueda || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  rutas: {
    title: 'Rutas', subtitle: 'Definición de rutas principales',
    icon: 'fas fa-route', iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
    endpoint: '/rutas/rutasSeleccionPaginado',
    idField: 'id_ruta',
    deleteEndpoint: '/rutas/eliminarRuta',
    actions: { create: true, edit: true, delete: true },
    formComponent: RutaForm,
    columns: [
      { key: 'rut_codigo', label: 'Código' },
      { key: 'rut_nombre', label: 'Nombre' },
      { key: 'rut_origen', label: 'Origen' },
      { key: 'rut_destino', label: 'Destino' },
      { key: 'rut_valor', label: 'Tarifa', render: v => v ? `$ ${parseFloat(v).toFixed(2)}` : '-' },
      { key: 'rut_estado', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'nombre_busqueda', label: 'Nombre', type: 'text' },
    ],
    customParams: (page, pageSize, filters) => ({
      nombre: filters.nombre_busqueda || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  bancos: {
    title: 'Bancos', subtitle: 'Entidades bancarias registradas',
    icon: 'fas fa-university', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600',
    endpoint: '/banco/listadobanco',
    idField: 'id_banco',
    deleteEndpoint: '/banco/bancoeliminar',
    actions: { create: true, edit: true, delete: true },
    formComponent: BancoForm,
    columns: [
      { key: 'ban_nombre', label: 'Nombre' },
      { key: 'numero_cuenta', label: 'N° Cuenta', render: v => v || '-' },
      { key: 'tipo_cuenta', label: 'Tipo Cuenta', render: v => v || '-' },
      { key: 'ban_estado', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'nombre', label: 'Nombre', type: 'text' },
    ]
  },

  alimentos: {
    title: 'Alimentos', subtitle: 'Gestión de servicios de alimentación',
    icon: 'fas fa-utensils', iconBg: 'bg-orange-100', iconColor: 'text-orange-600',
    endpoint: '/alimentos/listar',
    idField: 'id_alimentos',
    deleteEndpoint: '/alimentos/eliminar',
    actions: { create: true, edit: true, delete: true },
    formComponent: NewAlimentoForm,
    columns: [
      { key: 'nombre_alimentos', label: 'Nombre' },
      { key: 'precio_alimentos', label: 'Costo', render: v => `$ ${parseFloat(v || 0).toFixed(2)}` },
      { key: 'estado_alimentos', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'nombre', label: 'Nombre', type: 'text' },
    ]
  },

  inventario: {
    title: 'Inventario', subtitle: 'Control de stock y productos',
    icon: 'fas fa-boxes', iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
    endpoint: '/inventario/gestioninventario',
    idField: 'id_inventario',
    deleteEndpoint: '/inventario/inventarioeliminar',
    actions: { create: true, edit: true, delete: false },
    formComponent: InventarioForm,
    columns: [
      { key: 'nombre_alimentos', label: 'Producto', render: (v, r) => v || r.inv_nombre || '' },
      { key: 'nombre_sucursal', label: 'Sucursal', render: v => v || '-' },
      {
        key: 'stock_actual', label: 'Stock', render: v => {
          const n = parseInt(v || 0);
          return <span style={{ color: n > 5 ? '#10b981' : '#ef4444', fontWeight: 800 }}>{n}</span>;
        }
      },
      { key: 'precio_alimentos', label: 'Precio', render: v => v ? `$ ${parseFloat(v).toFixed(2)}` : '-' },
      { key: 'fecha_actualizacion', label: 'Última Actualiz.', render: v => v ? v.split(' ')[0] : '-' },
    ],
    filters: [
      { key: 'nombre', label: 'Producto', type: 'text' },
    ]
  },

  'sub-rutas': {
    title: 'Sub Rutas', subtitle: 'Segmentos y tramos de ruta',
    icon: 'fas fa-code-branch', iconBg: 'bg-purple-100', iconColor: 'text-purple-600',
    endpoint: '/sub_rutas/subrutasSeleccionPaginado',
    idField: 'id_sub_rutas',
    deleteEndpoint: '/sub_rutas/subrutaeliminar',
    actions: { create: true, edit: true, delete: true },
    formComponent: SubRutaForm,
    columns: [
      { key: 'codigo_sub_rutas', label: 'Código' },
      { key: 'nombre_sub_rutas', label: 'Nombre' },
      { key: 'origen_nombre', label: 'Origen', render: v => v || '-' },
      { key: 'destino_nombre', label: 'Destino', render: v => v || '-' },
      { key: 'minutos_sub_rutas', label: 'Minutos', render: v => v ? `${v} min` : '-' },
      { key: 'hora_salida_sub_rutas', label: 'H. Salida', render: v => v || '-' },
      { key: 'estado_sub_rutas', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'nombre_busqueda', label: 'Nombre', type: 'text' },
      {
        key: 'estado_busqueda', label: 'Estado', type: 'select', options: [
          { value: '1', label: 'Activo' },
          { value: '0', label: 'Inactivo' },
        ]
      },
    ],
    customParams: (page, pageSize, filters) => ({
      nombre_busqueda: filters.nombre_busqueda || '',
      estado_busqueda: filters.estado_busqueda || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  provincias: {
    title: 'Provincias', subtitle: 'División política provincial',
    icon: 'fas fa-map', iconBg: 'bg-sky-100', iconColor: 'text-sky-600',
    endpoint: '/provincia/provinciaSeleccionPaginado',
    idField: 'id_provincia',
    deleteEndpoint: '/provincia/provinciaEliminar',
    actions: { create: true, edit: true, delete: true },
    formComponent: NewProvinciaForm,
    columns: [
      { key: 'nombre_provincia', label: 'Nombre' },
    ],
    filters: [
      { key: 'nombre', label: 'Nombre', type: 'text' },
    ],
    customParams: (page, pageSize, filters) => ({
      nombre: filters.nombre || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  lugares: {
    title: 'Lugares', subtitle: 'Puntos de interés y paradas',
    icon: 'fas fa-map-marker-alt', iconBg: 'bg-rose-100', iconColor: 'text-rose-600',
    endpoint: '/lugares/listadolugares',
    idField: 'id_lugar',
    deleteEndpoint: '/lugares/lugareliminar',
    actions: { create: true, edit: true, delete: true },
    formComponent: LugarForm,
    columns: [
      { key: 'lug_nombre', label: 'Nombre', render: (v, r) => v || r.nombre_lugar || '' },
      { key: 'nombre_canton', label: 'Ciudad/Cantón', render: v => v || '-' },
      { key: 'nombre_provincia', label: 'Provincia', render: v => v || '-' },
      { key: 'lug_estado', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'nombre', label: 'Nombre', type: 'text' },
    ]
  },

  'anulacion-boleteria': {
    isSpecialPage: true,
    title: 'Anulación Boletería', subtitle: 'Buscar facturas y anular boletos emitidos',
    icon: 'fas fa-ban', iconBg: 'bg-red-100', iconColor: 'text-red-600',
  },

  'auditoria-rutas': {
    title: 'Auditoría de Rutas', subtitle: 'Validación de rutas y sucursales vinculadas',
    icon: 'fas fa-sitemap', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600',
    endpoint: '/rutas/auditoriaRutasGrid',
    actions: {
      custom: [
        { id: 'edit-origen', icon: 'fas fa-edit', tooltip: 'Editar Origen/Sucursal', color: 'text-blue-600' },
        { id: 'edit-destino', icon: 'fas fa-edit', tooltip: 'Editar Destino/Sucursal', color: 'text-indigo-600' }
      ]
    },
    columns: [
      { key: 'viaje_ruta_group', label: 'Ruta/Viaje' },
      { key: 'text', label: 'Sub-ruta (Segmento)' },
      { key: 'origen', label: 'Origen' },
      {
        key: 'sucursal_origen', label: 'Sucursal Origen', render: v => {
          const isMissing = !v || v === 'Sin vincular';
          return isMissing ? 'No vinculada' : (v || 'No vinculada');
        }
      },
      { key: 'destino', label: 'Destino' },
      {
        key: 'sucursal_destino', label: 'Sucursal Destino', render: v => {
          const isMissing = !v || v === 'Sin vincular';
          return isMissing ? 'No vinculada' : (v || 'No vinculada');
        }
      },
    ],
    filters: [
      { key: 'busqueda', label: 'Buscar', type: 'text' },
    ]
  },


  impresoras: {
    title: 'Impresoras', subtitle: 'Configuración de impresoras con QZ Tray',
    icon: 'fas fa-print', iconBg: 'bg-pink-100', iconColor: 'text-pink-600',
    isSpecialPage: true,
  },

  "despacho-guias": {
    title: 'Despacho de Guías', subtitle: 'Gestión de despacho de guías',
    icon: 'fas fa-shipping-fast', iconBg: 'bg-teal-100', iconColor: 'text-teal-600',
    endpoint: '/guias/despacho',
    columns: [
      { key: 'gui_numero', label: 'Número de Guía' },
      { key: 'gui_fecha', label: 'Fecha' },
      { key: 'gui_estado', label: 'Estado' },
    ],
    filters: [
      { key: 'guia', label: 'Número de Guía', type: 'text' },
    ]
  },

  despacho: {
    title: 'Despacho General', subtitle: 'Gestión de despachos de viajes y guías',
    icon: 'fas fa-truck', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600',
    endpoint: '/despacho/listado',
    columns: [
      { key: 'des_tipo', label: 'Tipo' },
      { key: 'des_referencia', label: 'Referencia' },
      { key: 'des_fecha', label: 'Fecha' },
      { key: 'des_estado', label: 'Estado' },
    ],
    filters: [
      { key: 'tipo', label: 'Tipo', type: 'select', options: [{ value: 'viaje', label: 'Viaje' }, { value: 'guia', label: 'Guía' }] },
    ]
  },

  reportes: {
    title: 'Reportes', subtitle: 'Generación de reportes y documentos',
    icon: 'fas fa-file-pdf', iconBg: 'bg-slate-100', iconColor: 'text-slate-600',
    endpoint: '/reportes/listado',
    actions: {
      custom: [
        { id: 'view', icon: 'fas fa-eye', tooltip: 'Ver Reporte', color: 'text-blue-600' },
        { id: 'download', icon: 'fas fa-download', tooltip: 'Descargar PDF', color: 'text-rose-600' }
      ]
    },
    columns: [
      { key: 'rep_nombre', label: 'Nombre del Reporte' },
      { key: 'rep_tipo', label: 'Tipo' },
      { key: 'rep_fecha', label: 'Fecha' },
      { key: 'rep_usuario', label: 'Generado por' },
    ],
    filters: [
      { key: 'nombre', label: 'Nombre', type: 'text' },
    ]
  },

  configuracion: {
    title: 'Configuración', subtitle: 'Parámetros globales del sistema',
    icon: 'fas fa-cogs', iconBg: 'bg-slate-200', iconColor: 'text-slate-700',
    endpoint: '/configuracion/seleccionar',
    actions: { edit: true },
    columns: [
      { key: 'cfg_clave', label: 'Parámetro' },
      { key: 'cfg_valor', label: 'Valor' },
      { key: 'cfg_descripcion', label: 'Descripción' },
    ],
    filters: [
      { key: 'clave', label: 'Parámetro', type: 'text' },
    ]
  },

  // ─── CAJAS (3 tipos con lógica idéntica, endpoints diferentes) ──────────────

  // Función helper compartida para construir las acciones de caja
  // Parámetro `prefix` puede ser 'caja', 'caja_boleteria', o 'cajaretenciones'
  // Las acciones están inlineadas por módulo para evitar dependencias externas.

  caja: {
    title: 'Cajas (Guías)', subtitle: 'Listado de cajas de guías/encomiendas',
    icon: 'fas fa-cash-register', iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
    endpoint: '/caja/listadoCaja',
    idField: 'id_caja',
    columns: [
      { key: 'numero_caja', label: '#' },
      { key: 'fecha_caja', label: 'Fecha', render: v => v ? v.split('T')[0] || v.split(' ')[0] : '-' },
      { key: 'fecha_hora_cierre', label: 'Fecha Cierre', render: v => v ? (v.split('T')[0] || v.split(' ')[0]) : '-' },
      { key: 'nombre_sucursal', label: 'Sucursal' },
      { key: 'usuario', label: 'Usuario' },
      { key: 'apertura_total_caja', label: '($)Apertura', render: v => `$${parseFloat(v || 0).toFixed(2)}` },
      { key: 'cierre_total_caja', label: '($)Cierre', render: v => v ? `$${parseFloat(v).toFixed(2)}` : '-' },
      { key: 'cuadre_caja', label: 'Cuadre', render: v => v || '-' },
      {
        key: 'estado_caja', label: 'Estado',
        render: v => {
          const isApert = v === 'APERTURADA';
          return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isApert ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            <i className={`fas fa-circle text-[6px]`}></i>{v || '-'}
          </span>;
        }
      },
      {
        key: 'estado_solicitud', label: 'Solicitud',
        render: v => {
          if (v == 0 || v == null) return <span title="Sin solicitud"><i className="fas fa-info-circle text-slate-400"></i></span>;
          if (v == 1) return <span title="Solicitud Enviada"><i className="fas fa-info-circle text-amber-500"></i></span>;
          if (v == 2) return <span title="Solicitud Aprobada"><i className="fas fa-info-circle text-emerald-500"></i></span>;
          return '-';
        }
      },
    ],
    filters: [
      { key: 'desde', label: 'Desde', type: 'date' },
      { key: 'hasta', label: 'Hasta', type: 'date' },
      {
        key: 'estado', label: 'Estado', type: 'select', options: [
          { value: '', label: 'TODOS' },
          { value: 'APERTURADA', label: 'APERTURADA' },
          { value: 'CERRADA', label: 'CERRADA' },
        ], defaultValue: ''
      },
    ],
    customParams: (page, pageSize, filters) => ({
      desde: filters.desde || '',
      hasta: filters.hasta || '',
      estado: filters.estado || '',
      apertura: filters.apertura || '',
      page: page + 1,
      limit: pageSize,
    }),
    actions: {
      bulkActions: [
        createAperturaAction('/caja/insertarAperturaCaja'),
        createBuscarCajaAction()
      ],
      custom: [
        {
          id: 'impresion', icon: 'fas fa-print', tooltip: 'Impresión Rápida',
          color: 'text-slate-600 hover:bg-slate-50',
          handler: async (row) => {
            const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
            window.open(`${baseUrl}/php/pdfCajaImpresion.php?id_caja=${row.id_caja}`, '_blank');
          }
        },
        {
          id: 'info-comprobante', icon: 'fas fa-vote-yea', tooltip: 'Información Comprobante',
          color: 'text-indigo-600 hover:bg-indigo-50',
          handler: async (row) => {
            const { value: form, isDismissed } = await Swal.fire({
              title: 'Info Comprobante',
              html: `
                <div style="text-align:left">
                  <label style="display:block;font-weight:bold;font-size:12px;margin-bottom:4px">N° Comprobante</label>
                  <input id="swal-num" class="swal2-input" style="width:100%" />
                  <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Banco</label>
                  <input id="swal-banco" class="swal2-input" style="width:100%" />
                </div>`,
              showCancelButton: true, confirmButtonText: 'Guardar',
              preConfirm: () => ({
                id_caja: row.id_caja,
                numero_comprobante: document.getElementById('swal-num')?.value || '',
                banco: document.getElementById('swal-banco')?.value || ''
              })
            });
            if (!form || isDismissed) return;
            try {
              const res = await api.post('/caja/guardarInfoComprobante', form);
              if (res.data?.success) { Swal.fire('Éxito', 'Comprobante guardado', 'success'); window.dispatchEvent(new CustomEvent('refresh-list')); }
              else Swal.fire('Error', res.data?.message || 'Error', 'error');
            } catch (e) { Swal.fire('Error', 'Error al guardar', 'error'); }
          }
        },
        {
          id: 'editar', icon: 'fas fa-edit', tooltip: 'Editar Ingresos/Egresos',
          color: 'text-amber-500 hover:bg-amber-50',
          handler: async (row) => {
            Swal.fire('En construcción', 'Para editar Ingresos/Egresos diríjase a la página de Caja detallada', 'info');
          }
        },
        {
          id: 'arqueo', icon: 'fas fa-file-pdf', tooltip: 'Arqueo PDF',
          color: 'text-red-600 hover:bg-red-50',
          handler: async (row) => {
            const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
            window.open(`${baseUrl}/php/pdfArqueoCaja.php?id_caja=${row.id_caja}`, '_blank');
          }
        },        {
          id: 'comprobantes', icon: 'fas fa-receipt', tooltip: 'Reporte Comprobantes',
          color: 'text-indigo-600 hover:bg-indigo-50',
          handler: async (row) => {
            const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
            window.open(`${baseUrl}/php/pdfComprobantesxCaja.php?idcaja=${row.id_caja}`, '_blank');
          }
        },
        createCerrarAction('id_caja', '/caja/cerrarCaja'),
        {
          id: 'solicitud', icon: 'fas fa-share-square', tooltip: 'Solicitar Edición',
          color: 'text-sky-600 hover:bg-sky-50',
          showIf: (row) => row.estado_caja === 'CERRADA' && row.estado_solicitud != 1,
          handler: async (row) => {
            const result = await Swal.fire({ title: 'Solicitar Edición', text: `¿Enviar solicitud para editar la caja #${row.numero_caja}?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, solicitar', cancelButtonText: 'Cancelar' });
            if (!result.isConfirmed) return;
            try {
              const res = await api.get('/caja/enviarSolicituEdicion', { params: { id_caja: row.id_caja } });
              if (res.data?.success) { Swal.fire('Enviada', 'Solicitud enviada correctamente', 'success'); window.dispatchEvent(new CustomEvent('refresh-list')); }
              else Swal.fire('Error', res.data?.message || 'No se pudo enviar', 'error');
            } catch { Swal.fire('Error', 'Error al enviar solicitud', 'error'); }
          }
        },
      ]
    },
  },

  "caja-boleteria": {
    title: 'Caja Boletería', subtitle: 'Listado de cajas del módulo de boletos',
    icon: 'fas fa-ticket-alt', iconBg: 'bg-teal-100', iconColor: 'text-teal-600',
    endpoint: '/caja_boleteria/listadoCaja',
    idField: 'id_caja_boleteria',
    columns: [
      { key: 'numero_caja', label: '#' },
      { key: 'fecha_caja', label: 'Fecha', render: v => v ? v.split('T')[0] || v.split(' ')[0] : '-' },
      { key: 'fecha_hora_cierre', label: 'Fecha Cierre', render: v => v ? (v.split('T')[0] || v.split(' ')[0]) : '-' },
      { key: 'nombre_sucursal', label: 'Sucursal' },
      { key: 'usuario', label: 'Usuario' },
      { key: 'apertura_total_caja', label: '($)Apertura', render: v => `$${parseFloat(v || 0).toFixed(2)}` },
      { key: 'cierre_total_caja', label: '($)Cierre', render: v => v ? `$${parseFloat(v).toFixed(2)}` : '-' },
      { key: 'cuadre_caja', label: 'Cuadre', render: v => v || '-' },
      {
        key: 'estado_caja', label: 'Estado',
        render: v => {
          const isApert = v === 'APERTURADA';
          return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isApert ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            <i className="fas fa-circle text-[6px]"></i>{v || '-'}
          </span>;
        }
      },
      {
        key: 'estado_solicitud', label: 'Solicitud',
        render: v => {
          if (v == 0 || v == null) return <span title="Sin solicitud"><i className="fas fa-info-circle text-slate-400"></i></span>;
          if (v == 1) return <span title="Solicitud Enviada"><i className="fas fa-info-circle text-amber-500"></i></span>;
          if (v == 2) return <span title="Solicitud Aprobada"><i className="fas fa-info-circle text-emerald-500"></i></span>;
          return '-';
        }
      },
    ],
    filters: [
      { key: 'desde', label: 'Desde', type: 'date' },
      { key: 'hasta', label: 'Hasta', type: 'date' },
      {
        key: 'estado', label: 'Estado', type: 'select', options: [
          { value: '', label: 'TODOS' },
          { value: 'APERTURADA', label: 'APERTURADA' },
          { value: 'CERRADA', label: 'CERRADA' },
        ], defaultValue: ''
      },
    ],
    customParams: (page, pageSize, filters) => ({
      desde: filters.desde || '',
      hasta: filters.hasta || '',
      estado: filters.estado || '',
      apertura: filters.apertura || '',
      page: page + 1,
      limit: pageSize,
    }),
    actions: {
      bulkActions: [
        createAperturaAction('/caja_boleteria/insertarAperturaCaja'),
        createBuscarCajaAction()
      ],
      custom: [
        {
          id: 'impresion', icon: 'fas fa-print', tooltip: 'Impresión Rápida',
          color: 'text-slate-600 hover:bg-slate-50',
          handler: async (row) => {
            const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
            window.open(`${baseUrl}/php/pdfCajaBoleteriaImpresion.php?id_caja=${row.id_caja_boleteria}`, '_blank');
          }
        },
        {
          id: 'info-comprobante', icon: 'fas fa-vote-yea', tooltip: 'Información Comprobante',
          color: 'text-indigo-600 hover:bg-indigo-50',
          handler: async (row) => {
            const { value: form, isDismissed } = await Swal.fire({
              title: 'Info Comprobante',
              html: `
                <div style="text-align:left">
                  <label style="display:block;font-weight:bold;font-size:12px;margin-bottom:4px">N° Comprobante</label>
                  <input id="swal-num" class="swal2-input" style="width:100%" />
                  <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Banco</label>
                  <input id="swal-banco" class="swal2-input" style="width:100%" />
                </div>`,
              showCancelButton: true, confirmButtonText: 'Guardar',
              preConfirm: () => ({
                id_caja: row.id_caja_boleteria,
                numero_comprobante: document.getElementById('swal-num')?.value || '',
                banco: document.getElementById('swal-banco')?.value || ''
              })
            });
            if (!form || isDismissed) return;
            try {
              const res = await api.post('/caja_boleteria/guardarInfoComprobante', form);
              if (res.data?.success) { Swal.fire('Éxito', 'Comprobante guardado', 'success'); window.dispatchEvent(new CustomEvent('refresh-list')); }
              else Swal.fire('Error', res.data?.message || 'Error', 'error');
            } catch (e) { Swal.fire('Error', 'Error al guardar', 'error'); }
          }
        },
        {
          id: 'editar', icon: 'fas fa-edit', tooltip: 'Editar Ingresos/Egresos',
          color: 'text-amber-500 hover:bg-amber-50',
          handler: async (row) => {
            Swal.fire('En construcción', 'Para editar Ingresos/Egresos diríjase a la página de Caja detallada', 'info');
          }
        },
        {
          id: 'arqueo', icon: 'fas fa-file-pdf', tooltip: 'Arqueo PDF',
          color: 'text-red-600 hover:bg-red-50',
          handler: async (row) => {
            const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
            window.open(`${baseUrl}/php/pdfArqueoCajaBoleteria.php?id_caja=${row.id_caja_boleteria}`, '_blank');
          }
        },        {
          id: 'comprobantes', icon: 'fas fa-receipt', tooltip: 'Reporte Comprobantes',
          color: 'text-indigo-600 hover:bg-indigo-50',
          handler: async (row) => {
            try {
              Swal.fire({ title: 'Generando reporte...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
              const res = await api.get('/caja_boleteria/reportecomprobantefacturasxcaja', { params: { idcaja: row.id_caja_boleteria } });
              if (res.data?.success && res.data?.nombre) {
                const params = new URLSearchParams();
                params.append('contenido', res.data.nombre);
                params.append('nombre', 'ResumenCaja');
                params.append('tipoA4', 'si');
                params.append('tipoAux', 'no');
                const pdfRes = await fetch('/php/GenerarArchvio.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
                const pdfData = await pdfRes.json();
                Swal.close();
                if (pdfData.success) {
                  const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
                  window.open(`${baseUrl}/php/tmp/${pdfData.ruta}`, '_blank');
                } else {
                  Swal.fire('Error', 'Error al generar el PDF', 'error');
                }
              } else {
                Swal.fire('Error', res.data?.message || 'No se encontraron datos', 'error');
              }
            } catch (e) {
              console.error('Error reporte comprobantes:', e);
              Swal.fire('Error', 'Error al generar el reporte de comprobantes', 'error');
            }
          }
        },
        createCerrarAction('id_caja_boleteria', '/caja_boleteria/cerrarCaja'),
        {
          id: 'solicitud', icon: 'fas fa-share-square', tooltip: 'Solicitar Edición',
          color: 'text-sky-600 hover:bg-sky-50',
          showIf: (row) => row.estado_caja === 'CERRADA' && row.estado_solicitud != 1,
          handler: async (row) => {
            const result = await Swal.fire({ title: 'Solicitar Edición', text: `¿Enviar solicitud para editar la caja #${row.numero_caja}?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, solicitar', cancelButtonText: 'Cancelar' });
            if (!result.isConfirmed) return;
            try {
              const res = await api.get('/caja_boleteria/enviarSolicituEdicion', { params: { id_caja: row.id_caja_boleteria } });
              if (res.data?.success) { Swal.fire('Enviada', 'Solicitud enviada correctamente', 'success'); window.dispatchEvent(new CustomEvent('refresh-list')); }
              else Swal.fire('Error', res.data?.message || 'No se pudo enviar', 'error');
            } catch { Swal.fire('Error', 'Error al enviar solicitud', 'error'); }
          }
        },
      ]
    },
  },

  "caja-cobros": {
    title: 'Caja Cobros', subtitle: 'Listado de cajas del módulo de retenciones/cobros',
    icon: 'fas fa-hand-holding-usd', iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
    endpoint: '/cajaretenciones/listadoCaja',
    idField: 'id_caja_retenciones',
    columns: [
      { key: 'numero_caja', label: '#' },
      { key: 'fecha_caja', label: 'Fecha', render: v => v ? v.split('T')[0] || v.split(' ')[0] : '-' },
      { key: 'fecha_hora_cierre', label: 'Fecha Cierre', render: v => v ? (v.split('T')[0] || v.split(' ')[0]) : '-' },
      { key: 'nombre_sucursal', label: 'Sucursal' },
      { key: 'usuario', label: 'Usuario' },
      { key: 'apertura_total_caja', label: '($)Apertura', render: v => `$${parseFloat(v || 0).toFixed(2)}` },
      { key: 'cierre_total_caja', label: '($)Cierre', render: v => v ? `$${parseFloat(v).toFixed(2)}` : '-' },
      { key: 'cuadre_caja', label: 'Cuadre', render: v => v || '-' },
      {
        key: 'estado_caja', label: 'Estado',
        render: v => {
          const isApert = v === 'APERTURADA';
          return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isApert ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            <i className="fas fa-circle text-[6px]"></i>{v || '-'}
          </span>;
        }
      },
      {
        key: 'estado_solicitud', label: 'Solicitud',
        render: v => {
          if (v == 0 || v == null) return <span title="Sin solicitud"><i className="fas fa-info-circle text-slate-400"></i></span>;
          if (v == 1) return <span title="Solicitud Enviada"><i className="fas fa-info-circle text-amber-500"></i></span>;
          if (v == 2) return <span title="Solicitud Aprobada"><i className="fas fa-info-circle text-emerald-500"></i></span>;
          return '-';
        }
      },
    ],
    filters: [
      { key: 'desde', label: 'Desde', type: 'date' },
      { key: 'hasta', label: 'Hasta', type: 'date' },
      {
        key: 'estado', label: 'Estado', type: 'select', options: [
          { value: '', label: 'TODOS' },
          { value: 'APERTURADA', label: 'APERTURADA' },
          { value: 'CERRADA', label: 'CERRADA' },
        ], defaultValue: ''
      },
    ],
    customParams: (page, pageSize, filters) => ({
      desde: filters.desde || '',
      hasta: filters.hasta || '',
      estado: filters.estado || '',
      apertura: filters.apertura || '',
      page: page + 1,
      limit: pageSize,
    }),
    actions: {
      bulkActions: [
        createAperturaAction('/cajaretenciones/insertarAperturaCaja'),
        createBuscarCajaAction()
      ],
      custom: [
        {
          id: 'impresion', icon: 'fas fa-print', tooltip: 'Impresión Rápida',
          color: 'text-slate-600 hover:bg-slate-50',
          handler: async (row) => {
            const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
            window.open(`${baseUrl}/php/pdfCajaRetencionImpresion.php?id_caja=${row.id_caja_retenciones}`, '_blank');
          }
        },
        {
          id: 'info-comprobante', icon: 'fas fa-vote-yea', tooltip: 'Información Comprobante',
          color: 'text-indigo-600 hover:bg-indigo-50',
          handler: async (row) => {
            const { value: form, isDismissed } = await Swal.fire({
              title: 'Info Comprobante',
              html: `
                <div style="text-align:left">
                  <label style="display:block;font-weight:bold;font-size:12px;margin-bottom:4px">N° Comprobante</label>
                  <input id="swal-num" class="swal2-input" style="width:100%" />
                  <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Banco</label>
                  <input id="swal-banco" class="swal2-input" style="width:100%" />
                </div>`,
              showCancelButton: true, confirmButtonText: 'Guardar',
              preConfirm: () => ({
                id_caja: row.id_caja_retenciones,
                numero_comprobante: document.getElementById('swal-num')?.value || '',
                banco: document.getElementById('swal-banco')?.value || ''
              })
            });
            if (!form || isDismissed) return;
            try {
              const res = await api.post('/caja_retenciones/guardarInfoComprobante', form);
              if (res.data?.success) { Swal.fire('Éxito', 'Comprobante guardado', 'success'); window.dispatchEvent(new CustomEvent('refresh-list')); }
              else Swal.fire('Error', res.data?.message || 'Error', 'error');
            } catch (e) { Swal.fire('Error', 'Error al guardar', 'error'); }
          }
        },
        {
          id: 'editar', icon: 'fas fa-edit', tooltip: 'Editar Ingresos/Egresos',
          color: 'text-amber-500 hover:bg-amber-50',
          handler: async (row) => {
            Swal.fire('En construcción', 'Para editar Ingresos/Egresos diríjase a la página de Caja detallada', 'info');
          }
        },
        {
          id: 'arqueo', icon: 'fas fa-file-pdf', tooltip: 'Arqueo PDF',
          color: 'text-red-600 hover:bg-red-50',
          handler: async (row) => {
            const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
            window.open(`${baseUrl}/php/pdfArqueoCajaRetenciones.php?id_caja=${row.id_caja_retenciones}`, '_blank');
          }
        },        {
          id: 'comprobantes', icon: 'fas fa-receipt', tooltip: 'Reporte Comprobantes',
          color: 'text-indigo-600 hover:bg-indigo-50',
          handler: async (row) => {
            try {
              Swal.fire({ title: 'Generando reporte...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
              const res = await api.get('/cajaretenciones/reportecomprobantefacturasxcaja', { params: { idcaja: row.id_caja_retenciones } });
              if (res.data?.success && res.data?.nombre) {
                const params = new URLSearchParams();
                params.append('contenido', res.data.nombre);
                params.append('nombre', 'ResumenCaja');
                params.append('tipoA4', 'si');
                params.append('tipoAux', 'no');
                const pdfRes = await fetch('/php/GenerarArchvio.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
                const pdfData = await pdfRes.json();
                Swal.close();
                if (pdfData.success) {
                  const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
                  window.open(`${baseUrl}/php/tmp/${pdfData.ruta}`, '_blank');
                } else {
                  Swal.fire('Error', 'Error al generar el PDF', 'error');
                }
              } else {
                Swal.fire('Error', res.data?.message || 'No se encontraron datos', 'error');
              }
            } catch (e) {
              console.error('Error reporte comprobantes:', e);
              Swal.fire('Error', 'Error al generar el reporte de comprobantes', 'error');
            }
          }
        },
        createCerrarAction('id_caja_retenciones', '/cajaretenciones/cerrarCaja'),
        {
          id: 'solicitud', icon: 'fas fa-share-square', tooltip: 'Solicitar Edición',
          color: 'text-sky-600 hover:bg-sky-50',
          showIf: (row) => row.estado_caja === 'CERRADA' && row.estado_solicitud != 1,
          handler: async (row) => {
            const result = await Swal.fire({ title: 'Solicitar Edición', text: `¿Enviar solicitud para editar la caja #${row.numero_caja}?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, solicitar', cancelButtonText: 'Cancelar' });
            if (!result.isConfirmed) return;
            try {
              const res = await api.get('/cajaretenciones/enviarSolicituEdicion', { params: { id_caja: row.id_caja_retenciones } });
              if (res.data?.success) { Swal.fire('Enviada', 'Solicitud enviada correctamente', 'success'); window.dispatchEvent(new CustomEvent('refresh-list')); }
              else Swal.fire('Error', res.data?.message || 'No se pudo enviar', 'error');
            } catch { Swal.fire('Error', 'Error al enviar solicitud', 'error'); }
          }
        },
      ]
    },
  },



  "despacho-viaje": {
    title: 'Despacho de Viaje', subtitle: 'Gestión de despacho de un viaje específico',
    icon: 'fas fa-bus-alt', iconBg: 'bg-purple-100', iconColor: 'text-purple-600',
    endpoint: '/despacho_viaje/despachoViajeSeleccionPaginado',
    columns: [
      { key: 'via_id', label: 'Viaje ID' },
      { key: 'bus_disco', label: 'Bus' },
      { key: 'per_nombre', label: 'Conductor' },
      { key: 'via_estado', label: 'Estado' },
    ],
    filters: [
      { key: 'bus', label: 'Bus Disco', type: 'text' },
    ],
    customParams: (page, pageSize, filters) => ({
      id_bus: filters.bus || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  "reportes-boleteria": {
    title: 'Reportes de Boletería', subtitle: 'Generación de informes de ventas de boletos',
    icon: 'fas fa-file-alt', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600',
    endpoint: '/boleteria/boleteriaListado',
    columns: [
      { key: 'id_boleteria', label: 'ID' },
      { key: 'factura_boleteria', label: 'Factura' },
      { key: 'ruc_cliente_boleteria', label: 'RUC Cliente' },
      { key: 'fecha_boleteria', label: 'Fecha', render: v => v ? v.split(' ')[0] : '' },
      { key: 'total_boleteria', label: 'Total', render: v => `$ ${parseFloat(v || 0).toFixed(2)}` },
    ],
    filters: [
      { key: 'factura', label: 'Factura', type: 'text' },
      { key: 'desde', label: 'Desde', type: 'date' },
      { key: 'hasta', label: 'Hasta', type: 'date' },
    ],
    customParams: (page, pageSize, filters) => ({
      factura: filters.factura || '',
      desde: filters.desde || '',
      hasta: filters.hasta || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  verificaciones: {
    isSpecialPage: true,
    title: 'Verificaciones', subtitle: 'Verificación de anulaciones de boletería y encomiendas',
    icon: 'fas fa-check-circle', iconBg: 'bg-green-100', iconColor: 'text-green-600',
  },

  destinos: {
    title: 'Destinos', subtitle: 'Puntos de entrega y origen',
    icon: 'fas fa-map-marker-alt', iconBg: 'bg-rose-100', iconColor: 'text-rose-600',
    endpoint: '/destino/destinoSeleccionPaginado',
    idField: 'id_destino',
    deleteEndpoint: '/destino/destinoeliminar',
    actions: { create: true, edit: true, delete: true },
    formComponent: NewDestinoForm,
    columns: [
      { key: 'nombre_destino', label: 'Nombre' },
      { key: 'lugar_destino', label: 'Ciudad/Lugar' },
      { key: 'nombre_compania_asociada', label: 'Compañía' },
      { key: 'estado_destino', label: 'Estado', renderType: 'status' },
    ],
    filters: [{ key: 'nombre_busqueda', label: 'Nombre', type: 'text' }],
    customParams: (page, pageSize, filters) => ({
      nombre: filters.nombre_busqueda || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  pasajeros: {
    title: 'Listado de Pasajeros', subtitle: 'Historial de pasajeros',
    icon: 'fas fa-users', iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
    endpoint: '/boleteria/listadoPasajeros',
    columns: [
      { key: 'pas_cedula', label: 'Cédula' },
      { key: 'pas_nombre', label: 'Nombre' },
      { key: 'pas_apellido', label: 'Apellido' },
      { key: 'pas_telefono', label: 'Teléfono' },
    ],
    filters: [
      { key: 'pas_cedula', label: 'Cédula', type: 'text' },
    ]
  },

  reservaciones: {
    title: 'Reservaciones', subtitle: 'Reservas de asientos activas',
    icon: 'fas fa-calendar-check', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600',
    endpoint: '/boleto/listadoReservas',
    actions: {
      custom: [
        {
          id: 'confirmar', icon: 'fas fa-check-circle',
          tooltip: 'Confirmar reserva (vender boleto)',
          color: 'text-emerald-600 hover:bg-emerald-50 border-emerald-200',
          showIf: (row) => row.estado_reserva == 1 || row.estado_reserva === '1',
          handler: async (row) => {
            const result = await Swal.fire({
              title: '¿Confirmar reserva?',
              text: `Se marcará el boleto #${row.id_boleto || row.numero_boleto} como VENDIDO. ¿Desea continuar?`,
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Sí, confirmar',
              confirmButtonColor: '#059669',
              cancelButtonText: 'Cancelar'
            });
            if (!result.isConfirmed) return;

            try {
              const res = await api.post('/boleto/confirmarReserva', { id_boleto: row.id_boleto });
              if (res.data?.success) {
                Swal.fire('✔ Confirmada', 'La reserva se ha convertido en venta exitosamente', 'success');
                window.dispatchEvent(new CustomEvent('refresh-list'));
              } else {
                Swal.fire('Error', res.data?.message || 'No se pudo confirmar la reserva', 'error');
              }
            } catch (e) {
              Swal.fire('Error', e.response?.data?.message || 'Error de conexión', 'error');
            }
          }
        },
        {
          id: 'anular', icon: 'fas fa-ban',
          tooltip: 'Anular reserva',
          color: 'text-rose-600 hover:bg-rose-50 border-rose-200',
          showIf: (row) => row.estado_reserva == 1 || row.estado_reserva === '1',
          handler: async (row) => {
            const { value: motivo } = await Swal.fire({
              title: 'Anular reserva',
              text: `¿Anular la reserva #${row.id_boleto}?`,
              icon: 'warning',
              input: 'textarea',
              inputPlaceholder: 'Motivo de anulación...',
              inputAttributes: { required: 'required' },
              showCancelButton: true,
              confirmButtonText: 'Sí, anular',
              confirmButtonColor: '#e11d48',
              cancelButtonText: 'Cancelar',
              inputValidator: (v) => !v && 'Debe ingresar un motivo'
            });
            if (!motivo) return;

            try {
              const res = await api.post('/boleto/anularReserva', { id_boleto: row.id_boleto, motivo_anulacion: motivo });
              if (res.data?.success) {
                Swal.fire('Anulada', 'Reserva anulada correctamente', 'success');
                window.dispatchEvent(new CustomEvent('refresh-list'));
              } else {
                Swal.fire('Error', res.data?.message || 'No se pudo anular', 'error');
              }
            } catch (e) {
              Swal.fire('Error', e.response?.data?.message || 'Error de conexión', 'error');
            }
          }
        }
      ]
    },
    columns: [
      { key: 'id_boleto', label: 'N° Boleto' },
      { key: 'numero_boleto', label: 'Número' },
      { key: 'fecha_creacion_reserva', label: 'F. Reserva', render: v => v ? v.split(' ')[0] : '-' },
      { key: 'nombre_reservante', label: 'Reservante' },
      { key: 'nombres_boleto', label: 'Pasajero(s)' },
      { key: 'identificacion_boleto', label: 'Identificación' },
      { key: 'nombre_rutas', label: 'Ruta' },
      {
        key: 'estado_reserva', label: 'Estado',
        render: v => {
          const activa = v == 1 || v === '1';
          return (
            <span className={`px-2 py-0.5 rounded-lg text-[9px] uppercase font-black flex items-center gap-1 w-max border ${activa ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
              <span className={`w-1 h-1 rounded-full ${activa ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              {activa ? 'Activa' : 'Vencida'}
            </span>
          );
        }
      },
    ],
    filters: [
      { key: 'numero_boleto', label: 'N° Boleto', type: 'text' },
      { key: 'reservante', label: 'Reservante/Identificación', type: 'text' },
      { key: 'fecha', label: 'Fecha', type: 'date' },
    ],
    customParams: (page, pageSize, filters) => ({
      numero_boleto: filters.numero_boleto || '',
      reservante: filters.reservante || '',
      fecha: filters.fecha || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  clientes: {
    title: 'Clientes', subtitle: 'Gestión de clientes del sistema',
    icon: 'fas fa-user-tie', iconBg: 'bg-sky-100', iconColor: 'text-sky-600',
    endpoint: '/cliente/clienteListado',
    idField: 'id_clientes',
    deleteEndpoint: '/cliente/eliminarCliente',
    actions: { create: true, edit: true, delete: true },
    formComponent: ClienteForm,
    columns: [
      {
        key: 'tipo_identificacion_cliente', label: 'Tipo ID', render: v => {
          if (v === 'C') return 'Cédula';
          if (v === 'R') return 'RUC';
          if (v === 'P') return 'Pasaporte';
          return v || '-';
        }
      },
      { key: 'identificacion_cliente', label: 'Identificación' },
      { key: 'nombre_cliente', label: 'Cliente' },
      { key: 'email_cliente', label: 'Correo', render: v => v || '-' },
      { key: 'direccion_cliente', label: 'Dirección', render: v => v || '-' },
      { key: 'telefono_cliente', label: 'Teléfono', render: v => v || '-' },
      { key: 'estado_clientes', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'nombre_busqueda', label: 'Nombre', type: 'text' },
      {
        key: 'estado_busqueda', label: 'Estado', type: 'select', options: [
          { value: '1', label: 'Activo' },
          { value: '0', label: 'Inactivo' },
        ]
      },
    ]
  },

  buseros: {
    isSpecialPage: true,
    title: 'Buseros', subtitle: 'Reporte de ventas y retenido por busero',
    icon: 'fas fa-id-card', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600',
  },

  recaudado: {
    title: 'Facturas / Recaudado', subtitle: 'Listado de facturas emitidas',
    icon: 'fas fa-file-invoice-dollar', iconBg: 'bg-green-100', iconColor: 'text-green-600',
    endpoint: '/factura/facturalistado',
    columns: [
      { key: 'fac_numero', label: 'N° Factura' },
      { key: 'fac_fecha', label: 'Fecha' },
      { key: 'cli_nombre', label: 'Cliente' },
      { key: 'fac_total', label: 'Total', render: v => `$${parseFloat(v || 0).toFixed(2)}` },
    ],
    filters: [
      { key: 'nombrecliente', label: 'Cliente', type: 'text' },
    ]
  },

  aprobaciones: {
    title: 'Aprobaciones', subtitle: 'Solicitudes pendientes de aprobación',
    icon: 'fas fa-check-circle', iconBg: 'bg-green-100', iconColor: 'text-green-600',
    endpoint: '/caja/listadodetallecajaAprobacion',
    idField: 'id_caja_detalle',
    columns: [
      { key: 'numero_detalle_caja', label: '#' },
      { key: 'usuario', label: 'Usuario' },
      { key: 'nombre_sucursal', label: 'Sucursal' },
      { key: 'fecha_caja_detalle', label: 'Fecha' },
      { key: 'nombre_socio_caja_detalle', label: 'Socio' },
      { key: 'numero_documento_caja_detalle', label: '# Documento' },
      { key: 'observacion_caja_detalle', label: 'Observación', render: v => v || '-' },
      { key: 'monto_caja_detalle', label: 'Monto', render: v => `$${parseFloat(v || 0).toFixed(2)}` },
    ],
    filters: [
      { key: 'usuario', label: 'Usuario', type: 'text' },
      { key: 'fecha', label: 'Fecha', type: 'date' },
    ],
    actions: {
      custom: [
        {
          id: 'aprobar', icon: 'fas fa-check-circle',
          tooltip: 'Aprobar',
          color: 'text-emerald-600 hover:bg-emerald-50',
          handler: async (row) => {
            const result = await Swal.fire({
              title: 'Confirmar Aprobación',
              text: '¿Está seguro que desea APROBAR este detalle?',
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Sí, aprobar',
              confirmButtonColor: '#059669',
              cancelButtonText: 'Cancelar'
            });
            if (result.isConfirmed) {
              try {
                const res = await api.post('/caja/aprobarDetalleCaja', { id_caja_detalle: row.id_caja_detalle });
                if (res.data?.success) {
                  Swal.fire('Éxito', 'Detalle aprobado correctamente', 'success');
                  window.dispatchEvent(new CustomEvent('refresh-list'));
                } else {
                  Swal.fire('Error', res.data?.message || res.data?.msg || 'Error al aprobar', 'error');
                }
              } catch (e) {
                Swal.fire('Error', 'Ocurrió un error al procesar la solicitud', 'error');
              }
            }
          }
        },
        {
          id: 'cancelar', icon: 'fas fa-ban',
          tooltip: 'Cancelar',
          color: 'text-rose-600 hover:bg-rose-50',
          handler: async (row) => {
            const { value: motivo } = await Swal.fire({
              title: 'Cancelar Detalle',
              input: 'textarea',
              inputPlaceholder: 'Ingrese el motivo de cancelación...',
              inputAttributes: { required: 'required' },
              showCancelButton: true,
              confirmButtonText: 'CANCELAR DETALLE',
              confirmButtonColor: '#e11d48',
              cancelButtonText: 'Cerrar',
              inputValidator: (v) => !v && 'Debe ingresar un motivo',
            });
            if (!motivo) return;
            try {
              const res = await api.post('/caja/cancelarDetalleCaja', {
                id_caja_detalle: row.id_caja_detalle,
                motivoAnulacion: motivo
              });
              if (res.data?.success) {
                Swal.fire('Éxito', 'Detalle cancelado correctamente', 'success');
                window.dispatchEvent(new CustomEvent('refresh-list'));
              } else {
                Swal.fire('Error', res.data?.message || res.data?.msg || 'Error al cancelar', 'error');
              }
            } catch (e) {
              Swal.fire('Error', 'Ocurrió un error al procesar la solicitud', 'error');
            }
          }
        }
      ]
    },
    customParams: (page, pageSize, filters) => ({
      usuario: filters.usuario || '',
      fecha: filters.fecha || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  'cajas-comprobantes': {
    isSpecialPage: true,
    title: 'Cajas Comprobantes', subtitle: 'Cuadre de cajas con comprobantes',
    icon: 'fas fa-cash-register', iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
    endpoint: '/cajaretenciones/listadoCajaComprobantes',
    columns: [
      { key: 'numero_caja', label: '#' },
      { key: 'fecha_caja', label: 'FECHA', render: v => v ? v.split(' ')[0] : '-' },
      { key: 'nombre_sucursal', label: 'SUCURSAL' },
      { key: 'usuario', label: 'USUARIO' },
      {
        key: 'estado_caja', label: 'ESTADO',
        render: v => {
          const ap = v === 'APERTURADA' || !v;
          return (
            <span className={"px-2 py-0.5 rounded-full text-[8px] font-black uppercase " + (ap ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
              {ap ? 'APERTURADA' : 'CERRADA'}
            </span>
          );
        }
      },
      { key: 'apertura_total_caja', label: '($)APERTURA', render: v => `$${parseFloat(v || 0).toFixed(2)}` },
      { key: 'cierre_total_caja', label: '($)CIERRE', render: v => v ? `$${parseFloat(v).toFixed(2)}` : '-' },
      { key: 'numero_comprobante_cierre', label: 'COMPROBANTE', render: v => v || '-' },
      { key: 'banco_cierre', label: 'BANCO', render: v => v || '-' },
      { key: 'horas_desde_cierre', label: 'HRS CIERRE', render: v => v || '-' },
    ],
    idField: 'id_caja_retenciones',
    filters: [
      { key: 'desde', label: 'Desde', type: 'date' },
      { key: 'hasta', label: 'Hasta', type: 'date' },
      {
        key: 'estado', label: 'Estado', type: 'select',
        options: [
          { value: '', label: 'TODOS' },
          { value: 'APERTURADA', label: 'APERTURADA' },
          { value: 'CERRADA', label: 'CERRADA' },
        ],
        defaultValue: ''
      },
    ],
    customParams: (page, pageSize, filters) => ({
      desde: filters.desde || '',
      hasta: filters.hasta || '',
      estado: filters.estado || '',
      page: page + 1,
      limit: pageSize,
    }),
    actions: {
      custom: [
        {
          id: 'ver-imagen', icon: 'fas fa-image',
          tooltip: 'Ver Imagen Comprobante',
          color: 'text-blue-600 hover:bg-blue-50',
          handler: (row) => {
            const ruta = row.ruta_imagen_comprobante_cierre;
            if (!ruta) {
              Swal.fire('Info', 'No hay imagen disponible', 'info');
              return;
            }
            const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
            Swal.fire({
              title: 'Comprobante: ' + (row.numero_comprobante_cierre || 'S/N'),
              imageUrl: baseUrl + '/' + ruta,
              imageWidth: 500,
              imageHeight: 550,
              imageAlt: 'Comprobante',
              confirmButtonText: 'Cerrar',
            });
          }
        },
      ],
    },
  },

  comprobantes: {
    title: 'Comprobantes', subtitle: 'Comprobantes de retención y pago',
    icon: 'fas fa-receipt', iconBg: 'bg-slate-100', iconColor: 'text-slate-600',
    endpoint: '/comprobantecobro/comprobantescobrolistado',
    columns: [
      { key: 'numero_comprobante_cobro', label: 'NÚMERO' },
      { key: 'fecha_emision_comprobante_cobro', label: 'F.EMISIÓN', render: v => v ? v.split(' ')[0] : '-' },
      {
        key: 'documento', label: 'DOCUMENTO',
        render: (_, r) => {
          const peSuc = r.punto_emision_sucursal || '';
          const peFac = r.punto_emision_factura || '';
          const numFac = r.numero_factura || '';
          if (!peSuc && !peFac && !numFac) return <span className="text-slate-300">—</span>;
          const facturaStr = [peSuc, peFac, numFac].filter(Boolean).join('-');
          return (
            <span className="text-[10px] font-bold">
              <span className="text-slate-400">Factura:</span> {facturaStr}
            </span>
          );
        }
      },
      {
        key: 'cliente', label: 'CLIENTE',
        render: (_, r) => {
          const ruc = r.identificacion_cliente || '';
          const nombre = r.nombre_cliente || '';
          if (!ruc && !nombre) return <span className="text-slate-300">—</span>;
          return (
            <div className="text-[9px] leading-tight">
              <div className="text-slate-400"><b>RUC:</b> {ruc}</div>
              <div><b>Cliente:</b> {nombre}</div>
            </div>
          );
        }
      },
      { key: 'nombre_forma_pago', label: 'F.PAGO', render: v => v || <span className="text-slate-300">—</span> },
      { key: 'concepto_detalle_comprobante_cobro', label: 'DETALLE', render: v => v || <span className="text-slate-300">—</span> },
      { key: 'monto_comprobante_cobro', label: 'MONTO', render: v => `$${parseFloat(v || 0).toFixed(2)}` },
      {
        key: 'estado_comprobante_cobro', label: 'ESTADO',
        render: v => {
          if (!v) return <span className="text-slate-300">—</span>;
          const isPendiente = v === 'PENDIENTE';
          const isAnulada = v === 'ANULADA';
          const isCobrada = v === 'COBRADA';
          let color = 'bg-slate-100 text-slate-600 border-slate-200';
          if (isPendiente) color = 'bg-amber-50 text-amber-700 border-amber-200';
          if (isAnulada) color = 'bg-rose-50 text-rose-700 border-rose-200';
          if (isCobrada) color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          return <span className={"px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border " + color}>{v}</span>;
        }
      },
    ],
    filters: [
      { key: 'cedula_busqueda', label: 'RUC', type: 'text' },
      { key: 'cliente_busqueda', label: 'Cliente', type: 'text' },
      { key: 'monto_busqueda', label: 'Monto', type: 'text' },
      {
        key: 'comboMes', label: 'Mes', type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
          { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
          { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
          { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
          { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
          { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
        ]
      },
      {
        key: 'comboAnio', label: 'Año', type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: '2019', label: '2019' }, { value: '2020', label: '2020' },
          { value: '2021', label: '2021' }, { value: '2022', label: '2022' },
          { value: '2023', label: '2023' }, { value: '2024', label: '2024' },
          { value: '2025', label: '2025' }, { value: '2026', label: '2026' },
        ]
      },
      { key: 'fechaini', label: 'Desde', type: 'date' },
      { key: 'fechalast', label: 'Hasta', type: 'date' },
      { key: 'numero_factura', label: 'Factura', type: 'text' },
      {
        key: 'formapago', label: 'F.Pago', type: 'select',
        options: [
          { value: '', label: 'Todas' },
          { value: '1', label: 'Efectivo' },
          { value: '2', label: 'Transferencia' },
          { value: '3', label: 'Cheque' },
          { value: '4', label: 'Tarjeta' },
        ]
      },
    ],
    actions: {
      custom: [
        {
          id: 'anular', icon: 'fas fa-ban',
          tooltip: 'Anular Comprobante',
          color: 'text-rose-600 hover:bg-rose-50',
          handler: async (row) => {
            // Verificar estado del comprobante
            if (row.estado_comprobante_cobro === 'ANULADA') {
              Swal.fire('Mensaje', 'Comprobante ya anulado', 'info');
              return;
            }
            if (row.estado_comprobante_cobro === 'PENDIENTE') {
              const user = comprobantesService.getCurrentUser();
              const userRole = parseInt(user?.rol_usuario || '0');
              if (userRole === 4) {
                Swal.fire('Mensaje', 'Este comprobante esta pendiente anular', 'info');
                return;
              }
            }
            // Mostrar motivo de anulación
            const { value: motivo } = await Swal.fire({
              title: 'Motivo de Anulación',
              input: 'textarea',
              inputPlaceholder: 'Ingrese el motivo de la anulación...',
              inputAttributes: { required: 'required' },
              showCancelButton: true,
              confirmButtonText: 'ANULAR',
              confirmButtonColor: '#e11d48',
              cancelButtonText: 'Cancelar',
              inputValidator: (v) => !v && 'Debe ingresar un motivo',
            });
            if (!motivo) return;
            try {
              const res = await comprobantesService.anularIndividual(row, motivo);
              if (res.success || res === true) {
                Swal.fire('Éxito', 'Comprobante anulado correctamente', 'success');
                window.dispatchEvent(new CustomEvent('refresh-list'));
              } else {
                Swal.fire('Error', res.message || res.msg || 'No se pudo anular el comprobante', 'error');
              }
            } catch (err) {
              Swal.fire('Error', 'Error al anular el comprobante', 'error');
            }
          }
        },
        {
          id: 'ver', icon: 'fas fa-eye',
          tooltip: 'Ver Comprobante',
          color: 'text-blue-600 hover:bg-blue-50',
          handler: (row) => {
            const imagen = row.archivo_comprobante_cobro;
            if (!imagen) {
              Swal.fire('Info', 'No hay imagen disponible para este comprobante', 'info');
              return;
            }
            const src = 'data:image/png;base64,' + imagen;
            Swal.fire({
              title: 'Comprobante N° ' + (row.numero_comprobante_cobro || ''),
              imageUrl: src,
              imageWidth: 400,
              imageHeight: 500,
              imageAlt: 'Comprobante',
              confirmButtonText: 'Cerrar',
            });
          }
        },
        {
          id: 'pdf', icon: 'fas fa-file-pdf',
          tooltip: 'PDF',
          color: 'text-red-600 hover:bg-red-50',
          handler: async (row) => {
            try {
              Swal.fire({ title: 'Generando PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
              const pdfUrl = await comprobantesService.generarPdf(row.id_comprobante_cobro);
              Swal.fire({
                title: 'Comprobante N° ' + (row.numero_comprobante_cobro || ''),
                html: `<iframe src="${pdfUrl}" style="width:100%;height:80vh;border:0;border-radius:8px;" title="Comprobante PDF"></iframe>`,
                width: '900px',
                showConfirmButton: false,
                showCloseButton: true,
                customClass: { popup: 'rounded-2xl' }
              });
            } catch (err) {
              Swal.fire('Error', err.message || 'Error al generar el PDF', 'error');
            }
          },
        },
      ],
      bulkActions: [
        {
          id: 'anular-pendientes',
          icon: 'fas fa-redo',
          label: 'Anular Pendientes',
          color: 'bg-rose-100 text-rose-700 hover:bg-rose-200',
          handler: async () => {
            const { value: motivo } = await Swal.fire({
              title: 'Anular Todos los Pendientes',
              text: '¿Seguro que desea anular todos los comprobantes pendientes?',
              input: 'textarea',
              inputPlaceholder: 'Ingrese el motivo...',
              showCancelButton: true,
              confirmButtonText: 'SÍ, ANULAR TODOS',
              confirmButtonColor: '#e11d48',
              cancelButtonText: 'Cancelar',
              inputValidator: (v) => !v && 'Debe ingresar un motivo',
            });
            if (!motivo) return;
            try {
              const res = await comprobantesService.anularPendientes(motivo);
              if (res.success || res === true) {
                Swal.fire('Éxito', 'Comprobantes pendientes anulados correctamente', 'success');
                window.dispatchEvent(new CustomEvent('refresh-list'));
              } else {
                Swal.fire('Error', res.message || res.msg || 'No se pudieron anular los comprobantes', 'error');
              }
            } catch (err) {
              Swal.fire('Error', 'Error al anular los comprobantes', 'error');
            }
          }
        },
      ],
    },
    customParams: (page, pageSize, filters) => ({
      ruc: filters.cedula_busqueda || '',
      nombre: filters.cliente_busqueda || '',
      monto: filters.monto_busqueda || '',
      formapago: filters.formapago || '',
      fechaini: filters.fechaini || '',
      fechalast: filters.fechalast || '',
      mes: filters.comboMes || '',
      anio: filters.comboAnio || '',
      factura: filters.numero_factura || '',
      page: page + 1,
      limit: pageSize,
    }),
  },



  "guias-companias": {
    title: 'Guías Compañías', subtitle: 'Encomiendas de otras compañías',
    icon: 'fas fa-truck-moving', iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
    endpoint: '/guias_companias/listar',
    idField: 'id',
    actions: {
      create: true,
      edit: false,
      delete: false,
      custom: [
        {
          id: 'pdf',
          icon: 'fas fa-file-pdf',
          tooltip: 'Imprimir PDF',
          color: 'text-red-500 hover:border-red-200 hover:bg-red-50',
          // Abre el PDF en un modal con iframe (en lugar de ventana emergente)
          modal: (row) => {
            const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
            const esLlegaSucursal = row.es_guia_llega_sucursal;
            const esGuiaUsuario = row.es_guia_usuario;
            const estado = String(row.estado_guia_companias);

            if (esLlegaSucursal === 1 || esLlegaSucursal === '1') {
              if (estado !== '1') {
                Swal.fire('No disponible', 'Solo puedes ver el PDF de entrega cuando la guía está DESPACHADA.', 'warning');
                return '';
              }
              return `${baseUrl}/php/pdfGuiaEntregasCompania.php?id_guia=${row.id}`;
            }
            if (esGuiaUsuario === 1 || esGuiaUsuario === '1') {
              return `${baseUrl}/php/pdfGuiaRecibesCompania.php?id_guia=${row.id}`;
            }
            Swal.fire('No disponible', 'No se puede determinar el tipo de PDF para esta guía.', 'error');
            return '';
          }
        },
        {
          id: 'entregar',
          icon: 'fas fa-truck',
          tooltip: 'Entregar Guía',
          color: 'text-blue-500 hover:border-blue-200 hover:bg-blue-50',
          showIf: (row) => String(row.es_guia_llega_sucursal) === '1',
          handler: async (row) => {
            if (String(row.estado_guia_companias) === '1') {
              Swal.fire('No permitido', 'Esta guía ya fue entregada.', 'warning');
              return;
            }
            const result = await Swal.fire({
              title: 'Confirmar entrega',
              text: '¿Está seguro que desea marcar esta guía como ENTREGADA?',
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Sí, entregar',
              cancelButtonText: 'Cancelar'
            });
            if (result.isConfirmed) {
              try {
                // We don't have access to context here easily, so we rely on backend extracting user from token
                const res = await api.post('/guias_companias/entregar', { id_guia: row.id });
                if (res.data?.success) {
                  Swal.fire('Éxito', 'Guía entregada correctamente', 'success');
                  // Disparar evento para que GenericListPage refresque el grid
                  window.dispatchEvent(new CustomEvent('refresh-list'));
                } else {
                  Swal.fire('Error', res.data?.msg || 'Error al entregar la guía', 'error');
                }
              } catch (error) {
                Swal.fire('Error', 'No se pudo entregar la guía', 'error');
              }
            }
          }
        },
        {
          id: 'anular',
          icon: 'fas fa-ban',
          tooltip: 'Anular Guía',
          color: 'text-orange-500 hover:border-orange-200 hover:bg-orange-50',
          showIf: (row) => String(row.es_guia_usuario) === '1' && String(row.es_guia_llega_sucursal) !== '1' && String(row.estado_guia_companias) !== '2',
          handler: async (row) => {
            const result = await Swal.fire({
              title: 'Confirmar anulación',
              text: '¿Está seguro que desea ANULAR esta guía?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#ff9800',
              confirmButtonText: 'Sí, anular',
              cancelButtonText: 'Cancelar'
            });
            if (result.isConfirmed) {
              try {
                const res = await api.post('/guias_companias/anular', { id_guia: row.id });
                if (res.data?.success) {
                  Swal.fire('Éxito', 'Guía anulada correctamente', 'success');
                  // Disparar evento para que GenericListPage refresque el grid
                  window.dispatchEvent(new CustomEvent('refresh-list'));
                } else {
                  Swal.fire('Error', res.data?.msg || 'No se pudo anular la guía', 'error');
                }
              } catch (error) {
                Swal.fire('Error', 'No se pudo anular la guía', 'error');
              }
            }
          }
        }
      ]
    },
    formComponent: NuevaGuiaCompaniaForm,
    columns: [
      { key: 'numero_guia', label: 'N° Guía' },
      { key: 'nombre_compania_asociada', label: 'Compañía' },
      {
        key: 'valor_comision', label: 'Comisión', render: (v, r) => (
          <div className="bg-green-50 text-green-800 p-1 rounded font-bold text-xs">
            <div>%: {r.porcentaje_comision}</div>
            <div className="text-sm">Valor: ${v}</div>
            <div>Neto: ${r.valor_neto}</div>
          </div>
        )
      },
      {
        key: 'fecha_procesamiento', label: 'Fechas', render: (v, r) => (
          <div className="text-xs">
            <div><b>Proc:</b> {v}</div>
            <div><b>Entr:</b> {r.fecha_entregada || ''}</div>
          </div>
        )
      },
      { key: 'nombre_sucursal', label: 'Destino' },
      {
        key: 'nombre_cliente', label: 'Remitente', render: (v, r) => (
          <div className="text-xs">
            <div><b>RUC:</b> {r.identificacion_cliente || ''}</div>
            <div><b>Razón:</b> {v || ''}</div>
          </div>
        )
      },
      {
        key: 'estado_guia_companias', label: 'Estado', render: v => {
          if (String(v) === '0') return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">RECEPTADA</span>;
          if (String(v) === '1') return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">DESPACHADA</span>;
          if (String(v) === '2') return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">ANULADA</span>;
          return v;
        }
      },
    ],
    filters: [
      { key: 'numero_guia', label: 'N° Guía', type: 'text' },
      { key: 'fecha_desde', label: 'Desde', type: 'date' },
      { key: 'fecha_hasta', label: 'Hasta', type: 'date' },
      {
        key: 'estado', label: 'Estado', type: 'select', options: [
          { value: '', label: 'TODOS' },
          { value: '0', label: 'RECEPTADA' },
          { value: '1', label: 'DESPACHADA' },
          { value: '2', label: 'ANULADA' },
        ]
      },
    ],
    customParams: (page, pageSize, filters) => ({
      nombre: filters.numero_guia || '',
      fecha_desde: filters.fecha_desde || '',
      fecha_hasta: filters.fecha_hasta || '',
      estado: filters.estado || '',
      page: page + 1,
      limit: pageSize,
    }),
  },

  entregas: {
    title: 'Entrega de Guías', subtitle: 'Guías entregadas al destinatario',
    icon: 'fas fa-hand-holding-usd', iconBg: 'bg-green-100', iconColor: 'text-green-600',
    endpoint: '/guia/guialistadoEntregadas',
    columns: [
      { key: 'gui_numero', label: 'N° Guía' },
      { key: 'ent_fecha', label: 'Fecha Entrega' },
    ],
    filters: [
      { key: 'gui_numero', label: 'N° Guía', type: 'text' },
    ]
  },

  "tipo-cobros": {
    title: 'Tipo de Cobros', subtitle: 'Categorías de cobros disponibles',
    icon: 'fas fa-tags', iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
    endpoint: '/tipo_cobros/tipoCobros',
    idField: 'id_tipo_cobros',
    deleteEndpoint: '/tipo_cobros/tipoCobrosEliminar',
    actions: { create: true, edit: true, delete: true },
    formComponent: (props) => (
      <GenericForm
        {...props}
        idField="id_tipo_cobros"
        endpoint="/tipo_cobros/tipoCobrosInsertar"
        fields={[
          { name: 'nombre_tipo_cobros', label: 'Nombre', type: 'text', required: true },
          { name: 'valor_tipo_cobros', label: 'Valor ($)', type: 'number', required: true, defaultValue: '0' },
          {
            name: 'prioridad_cobros_tipo', label: 'Prioridad', type: 'select', required: true, options: [
              { value: '1', label: 'Alta' },
              { value: '2', label: 'Media' },
              { value: '3', label: 'Baja' },
            ], defaultValue: '3'
          },
          {
            name: 'tipo_cobros_automaticos', label: 'Automático', type: 'select', options: [
              { value: '1', label: 'Sí' },
              { value: '0', label: 'No' },
            ], defaultValue: '0'
          },
          {
            name: 'estado_tipo_cobros', label: 'Estado', type: 'select', required: true, options: [
              { value: '1', label: 'Activo' },
              { value: '0', label: 'Inactivo' },
            ], defaultValue: '1'
          },
        ]}
      />
    ),
    columns: [
      { key: 'nombre_tipo_cobros', label: 'Nombre' },
      { key: 'valor_tipo_cobros', label: 'Valor', render: v => `$ ${parseFloat(v || 0).toFixed(2)}` },
      {
        key: 'prioridad_cobros_tipo', label: 'Prioridad', render: v => {
          if (v == 1) return <span className="text-red-600 font-bold">Alta</span>;
          if (v == 2) return <span className="text-amber-600 font-bold">Media</span>;
          if (v == 3) return <span className="text-slate-500 font-bold">Baja</span>;
          return v || '-';
        }
      },
      {
        key: 'tipo_cobros_automaticos', label: 'Automático', render: v => v == 1
          ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-bold">Sí</span>
          : <span className="text-slate-400">No</span>
      },
      { key: 'estado_tipo_cobros', label: 'Estado', renderType: 'status' },
    ],
    filters: [{ key: 'nombre_tipo_cobros', label: 'Nombre', type: 'text' }]
  },

  anulaciones: {
    isSpecialPage: true,
    title: 'Anulaciones', subtitle: 'Anulación de facturas, guías, comprobantes, egresos/ingresos y boletos',
    icon: 'fas fa-ban', iconBg: 'bg-red-100', iconColor: 'text-red-600',
  },

  viajes: {
    title: 'Listado de Viajes', subtitle: 'Viajes programados y realizados',
    icon: 'fas fa-road', iconBg: 'bg-violet-100', iconColor: 'text-violet-600',
    endpoint: '/viajes/ListadoViajes',
    columns: [
      { key: 'id_viaje', label: 'ID' },
      { key: 'rut_nombre', label: 'Ruta', render: (v, r) => v || r.nombre_ruta || '-' },
      { key: 'placa_buses', label: 'Placa', render: (v, r) => v || r.bus_placa || '-' },
      { key: 'disco_buses', label: 'Disco', render: (v, r) => v || r.bus_disco || '-' },
      { key: 'fecha_salida_viaje', label: 'Fecha Salida', render: v => v ? v.split(' ')[0] : '-' },
      { key: 'hora_salida_viaje', label: 'Hora', render: (v, r) => v || r.hora_salida || '-' },
      { key: 'estado_viaje', label: 'Estado', renderType: 'status' },
    ],
    filters: [
      { key: 'fecha_busqueda', label: 'Fecha', type: 'date' },
      {
        key: 'estado_busqueda', label: 'Estado', type: 'select', options: [
          { value: '1', label: 'Activo' },
          { value: '0', label: 'Inactivo' },
        ]
      },
    ]
  }

};

// Fin de la configuración
