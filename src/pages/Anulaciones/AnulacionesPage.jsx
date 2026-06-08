import React, { useState, useRef, useCallback, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useListado } from '../../hooks/useListado';

import { api } from '../../config/axios';
import {
  anularFacturasTodas,
  anularFacturasSeleccionadas,
  cancelarAnulacionFactura,
  anularGuiasTodas,
  anularGuiasSeleccionadas,
  cancelarAnulacionGuia,
  anularComprobantesTodas,
  anularComprobantesSeleccionadas,
  cancelarAnulacionComprobante,
  anularEgresosTodas,
  anularEgresosSeleccionadas,
  cancelarAnulacionEgreso,
} from '../../services/anulaciones.service';

const PAGE_SIZE = 25;

const MESES = [
  { value: '', label: 'Todos' },
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

const ANIOS = [
  { value: '', label: 'Todos' },
  { value: '2019', label: '2019' }, { value: '2020', label: '2020' },
  { value: '2021', label: '2021' }, { value: '2022', label: '2022' },
  { value: '2023', label: '2023' }, { value: '2024', label: '2024' },
  { value: '2025', label: '2025' }, { value: '2026', label: '2026' },
];

// ─────────────── Helper: formulario de motivo ───────────────
const mostrarMotivoModal = async (titulo, texto) => {
  return Swal.fire({
    title: titulo,
    text: texto,
    input: 'textarea',
    inputPlaceholder: 'Ingrese el motivo...',
    showCancelButton: true,
    confirmButtonText: 'SÍ, ANULAR',
    confirmButtonColor: '#e11d48',
    cancelButtonText: 'Cancelar',
    inputValidator: (v) => !v?.trim() && 'Debe ingresar un motivo',
  });
};

// ─────────────── Helper: cancelar anulación modal ───────────────
const mostrarCancelarModal = async (titulo, entidad) => {
  const { value: motivo } = await Swal.fire({
    title: titulo || 'Cancelar Anulación',
    input: 'textarea',
    inputPlaceholder: `Ingrese el motivo de cancelación de la anulación del ${entidad}...`,
    showCancelButton: true,
    confirmButtonText: 'CONFIRMAR',
    confirmButtonColor: '#f59e0b',
    cancelButtonText: 'Cancelar',
    inputValidator: (v) => !v?.trim() && 'Debe ingresar un motivo',
  });
  return motivo;
};

// ─────────────── Tab: Facturas ───────────────
const TABS = [
  {
    id: 'facturas',
    label: 'FACTURAS',
    endpoint: '/factura/facturalistadoPendientes',
    idField: 'id_factura',
    icon: 'fa-file-invoice',
    color: 'border-l-blue-500',
    customParams: (page, size, f) => ({
      nombrecliente: f.nombre_busqueda || '',
      rucliente: f.ruc_busqueda || '',
      fechaini: f.fechaini || '',
      fechalast: f.fechalast || '',
      mes: f.comboMes || '',
      anio: f.comboAnio || '',
      factura: f.factura_busqueda || '',
      numeroguia: f.numero_guia_busqueda || '',
      idusuario: f.idusuario || '',
      page: page + 1,
      limit: size,
    }),
    filters: [
      { k: 'nombre_busqueda', l: 'Nombre', t: 'text' },
      { k: 'ruc_busqueda', l: 'RUC', t: 'text' },
      { k: 'comboMes', l: 'Mes', t: 'select', opts: MESES },
      { k: 'comboAnio', l: 'Año', t: 'select', opts: ANIOS },
      { k: 'fechaini', l: 'Desde', t: 'date' },
      { k: 'fechalast', l: 'Hasta', t: 'date' },
      { k: 'factura_busqueda', l: 'Factura', t: 'text' },
      { k: 'numero_guia_busqueda', l: 'N° Guía', t: 'text' },
    ],
    columns: [
      { k: 'secuencial_factura', l: '#FACTURA', w: 'w-20' },
      { k: 'numero_guia', l: 'GUÍA', w: 'w-20', r: (v) => v || '-' },
      { k: 'fecha_factura', l: 'FECHA', w: 'w-24', r: (v) => v ? v.split(' ')[0] : '-' },
      {
        k: 'cliente', l: 'CLIENTE', flex: true,
        r: (_, r) => {
          const ruc = r.ruc_cliente_factura || '';
          const nom = r.nombre_cliente_factura || '';
          return (!ruc && !nom) ? <span className="text-slate-300">—</span> : (
            <div className="text-[9px] leading-tight">
              <div className="text-slate-400"><b>RUC:</b> {ruc}</div>
              <div><b>Razón Social:</b> {nom}</div>
            </div>
          );
        },
      },
      { k: 'total_factura', l: 'TOTAL', w: 'w-20 text-right', r: (v) => `$${parseFloat(v||0).toFixed(2)}` },
      { k: 'motivo_anulacion_factura', l: 'MOTIVO', flex: true, r: (v) => v || <span className="text-slate-300">—</span> },
      { k: 'cobrado', l: 'COBRADO', w: 'w-20 text-right', r: (v) => `$${parseFloat(v||0).toFixed(2)}` },
      { k: 'por_cobrar', l: 'POR COBRAR', w: 'w-20 text-right', r: (v) => `$${parseFloat(v||0).toFixed(2)}` },
      {
        k: 'estado_cobro', l: 'ESTADO', w: 'w-24',
        r: (v) => {
          if (!v) return <span className="text-slate-300">—</span>;
          if (v === 'COBRADA') return <span className="text-green-700 font-bold text-[10px]">COBRADA</span>;
          return <span className="text-red-700 font-bold text-[10px]">NO COBRADA</span>;
        },
      },
    ],
    canSelect: (row) => row.estado_factura == 3 && row.estado_sincroinizacion == 0,
    rowClass: (row) => {
      if (row.estado_factura == 2) return 'bg-red-50';
      if (row.estado_factura == 3) return 'bg-amber-50';
      if (row.estado_factura == 0) return 'bg-blue-50';
      return '';
    },
    anularTodas: async (motivo) => {
      const r = await anularFacturasTodas(motivo);
      return r.success;
    },
    anularSeleccionadas: async (seleccionados, motivo) => {
      const ids = seleccionados.map(s => s.id_factura);
      const r = await anularFacturasSeleccionadas(ids, motivo);
      return r.success;
    },
    cancelarAnulacion: async (row, motivo) => {
      const r = await cancelarAnulacionFactura(row.id_factura, motivo);
      return r.success;
    },
  },
  {
    id: 'guias',
    label: 'GUÍAS',
    endpoint: '/guia/guialistadoPendientes',
    idField: 'id_guia',
    icon: 'fa-truck',
    color: 'border-l-emerald-500',
    customParams: (page, size, f) => ({
      rucremitente: f.cedula_remitente || '',
      rucreceptor: f.cedula_destinatario || '',
      nombreremitente: f.nombre_remitente || '',
      nombrereceptor: f.nombre_destinatario || '',
      fechaini: f.fechaini || '',
      fechalast: f.fechalast || '',
      mes: f.comboMes || '',
      anio: f.comboAnio || '',
      factura: f.numero_factura || '',
      numeroguia: f.numero_guia || '',
      idusuario: f.idusuario || '',
      numero_guia_manual: f.numero_guia_manual || '',
      page: page + 1,
      limit: size,
    }),
    filters: [
      { k: 'cedula_remitente', l: 'Céd. Remitente', t: 'text' },
      { k: 'cedula_destinatario', l: 'Céd. Destinatario', t: 'text' },
      { k: 'numero_factura', l: 'Factura', t: 'text' },
      { k: 'nombre_remitente', l: 'Remitente', t: 'text' },
      { k: 'nombre_destinatario', l: 'Destinatario', t: 'text' },
      { k: 'comboMes', l: 'Mes', t: 'select', opts: MESES },
      { k: 'comboAnio', l: 'Año', t: 'select', opts: ANIOS },
      { k: 'fechaini', l: 'Desde', t: 'date' },
      { k: 'fechalast', l: 'Hasta', t: 'date' },
      { k: 'numero_guia', l: 'Guía', t: 'text' },
      { k: 'numero_guia_manual', l: 'Guía Manual', t: 'text' },
    ],
    columns: [
      { k: 'numero_guia_final', l: 'GUÍA', w: 'w-20' },
      {
        k: 'cliente_remitente', l: 'CLIENTE REMITENTE', flex: true,
        r: (_, r) => {
          const ruc = r.cedula_cliente_remitente || '';
          const nom = r.nombre_cliente_remitente || '';
          return (!ruc && !nom) ? <span className="text-slate-300">—</span> : (
            <div className="text-[9px] leading-tight">
              <div className="text-slate-400"><b>RUC:</b> {ruc}</div>
              <div><b>Razón Social:</b> {nom}</div>
            </div>
          );
        },
      },
      {
        k: 'cliente_destinatario', l: 'CLIENTE DESTINATARIO', flex: true,
        r: (_, r) => {
          const ruc = r.cedula_cliente_receptor || '';
          const nom = r.nombre_cliente_receptor || '';
          return (!ruc && !nom) ? <span className="text-slate-300">—</span> : (
            <div className="text-[9px] leading-tight">
              <div className="text-slate-400"><b>RUC:</b> {ruc}</div>
              <div><b>Razón Social:</b> {nom}</div>
            </div>
          );
        },
      },
      {
        k: 'salida_destino', l: 'SALIDA/DESTINO', w: 'w-28',
        r: (_, r) => {
          const o = r.origen_guia || '';
          const d = r.destino_guia || '';
          return (!o && !d) ? <span className="text-slate-300">—</span> : (
            <div className="text-[9px] leading-tight">
              <div><b>Salida:</b> {o}</div>
              <div><b>Destino:</b> {d}</div>
            </div>
          );
        },
      },
      { k: 'motivo_anulacion_guia', l: 'MOTIVO', w: 'w-24', r: (v) => v || <span className="text-slate-300">—</span> },
      { k: 'total_guia', l: 'TOTAL', w: 'w-20 text-right', r: (v) => `$${parseFloat(v||0).toFixed(2)}` },
      { k: 'cobrado', l: 'COBRADO', w: 'w-20 text-right', r: (v) => `$${parseFloat(v||0).toFixed(2)}` },
      { k: 'por_cobrar', l: 'POR COBRAR', w: 'w-20 text-right', r: (v) => `$${parseFloat(v||0).toFixed(2)}` },
      {
        k: 'estado_cobro_guia', l: 'ESTADO', w: 'w-24',
        r: (v) => {
          if (!v) return <span className="text-slate-300">—</span>;
          if (v === 'COBRADA') return <span className="text-green-700 font-bold text-[10px]">COBRADA</span>;
          return <span className="text-red-700 font-bold text-[10px]">NO COBRADA</span>;
        },
      },
      { k: 'fecha_guia', l: 'FECHA', w: 'w-24', r: (v) => v ? v.split(' ')[0] : '-' },
    ],
    canSelect: (row) => row.estado_guia == 3,
    rowClass: (row) => {
      if (row.estado_guia == 2) return 'bg-red-50';
      if (row.estado_guia == 3) return 'bg-amber-50';
      return '';
    },
    anularTodas: async (motivo) => {
      const r = await anularGuiasTodas(motivo);
      return r.success;
    },
    anularSeleccionadas: async (seleccionados, motivo) => {
      const ids = seleccionados.map(s => s.id_guia);
      const r = await anularGuiasSeleccionadas(ids, motivo);
      return r.success;
    },
    cancelarAnulacion: async (row, motivo) => {
      const r = await cancelarAnulacionGuia(row.id_guia, motivo);
      return r.success;
    },
  },
  {
    id: 'comprobantes',
    label: 'COMPROBANTES',
    endpoint: '/comprobantecobro/comprobantescobrolistadoPendientes',
    idField: 'id_comprobante_cobro',
    icon: 'fa-receipt',
    color: 'border-l-purple-500',
    customParams: (page, size, f) => ({
      ruc: f.cedula_busqueda || '',
      nombre: f.cliente_busqueda || '',
      monto: f.monto_busqueda || '',
      formapago: f.formapago || '',
      fechaini: f.fechaini || '',
      fechalast: f.fechalast || '',
      mes: f.comboMes || '',
      anio: f.comboAnio || '',
      factura: f.numero_factura || '',
      page: page + 1,
      limit: size,
    }),
    filters: [
      { k: 'cedula_busqueda', l: 'RUC', t: 'text' },
      { k: 'cliente_busqueda', l: 'Cliente', t: 'text' },
      { k: 'monto_busqueda', l: 'Monto', t: 'text' },
      { k: 'comboMes', l: 'Mes', t: 'select', opts: MESES },
      { k: 'comboAnio', l: 'Año', t: 'select', opts: ANIOS },
      { k: 'fechaini', l: 'Desde', t: 'date' },
      { k: 'fechalast', l: 'Hasta', t: 'date' },
      { k: 'numero_factura', l: 'Factura', t: 'text' },
      {
        k: 'formapago', l: 'F.Pago', t: 'select',
        opts: [
          { value: '', label: 'Todas' },
          { value: '1', label: 'Efectivo' },
          { value: '2', label: 'Transferencia' },
          { value: '3', label: 'Cheque' },
          { value: '4', label: 'Tarjeta' },
        ],
      },
    ],
    columns: [
      { k: 'numero_comprobante_cobro', l: 'NÚMERO', w: 'w-20' },
      { k: 'fecha_emision_comprobante_cobro', l: 'F.EMISIÓN', w: 'w-24', r: (v) => v ? v.split(' ')[0] : '-' },
      {
        k: 'documento', l: 'DOCUMENTO', w: 'w-28',
        r: (_, r) => {
          const str = [r.punto_emision_sucursal, r.punto_emision_factura, r.numero_factura].filter(Boolean).join('-');
          return str ? <span className="text-[10px]"><span className="text-slate-400">Factura:</span> {str}</span> : <span className="text-slate-300">—</span>;
        },
      },
      {
        k: 'cliente', l: 'CLIENTE', flex: true,
        r: (_, r) => {
          const ruc = r.identificacion_cliente || '';
          const nom = r.nombre_cliente || '';
          return (!ruc && !nom) ? <span className="text-slate-300">—</span> : (
            <div className="text-[9px] leading-tight">
              <div className="text-slate-400"><b>RUC:</b> {ruc}</div>
              <div><b>Cliente:</b> {nom}</div>
            </div>
          );
        },
      },
      { k: 'nombre_forma_pago', l: 'F.PAGO', w: 'w-20', r: (v) => v || <span className="text-slate-300">—</span> },
      { k: 'concepto_detalle_comprobante_cobro', l: 'DETALLE', flex: true, r: (v) => v || <span className="text-slate-300">—</span> },
      { k: 'monto_comprobante_cobro', l: 'MONTO', w: 'w-20 text-right', r: (v) => `$${parseFloat(v||0).toFixed(2)}` },
      {
        k: 'motivo_anulacion', l: 'MOTIVO', flex: true,
        r: (v) => v || <span className="text-slate-300">—</span>,
      },
    ],
    canSelect: (row) => row.estado_comprobante_cobro === 'PENDIENTE',
    rowClass: (row) => {
      if (row.estado_comprobante_cobro === 'ANULADA') return 'bg-red-50';
      if (row.estado_comprobante_cobro === 'PENDIENTE') return 'bg-amber-50';
      return '';
    },
    anularTodas: async (motivo) => {
      const r = await anularComprobantesTodas(motivo);
      return r.success;
    },
    anularSeleccionadas: async (seleccionados, motivo) => {
      const ids = seleccionados.map(s => s.id_comprobante_cobro);
      const r = await anularComprobantesSeleccionadas(ids, motivo);
      return r.success;
    },
    cancelarAnulacion: async (row, motivo) => {
      const r = await cancelarAnulacionComprobante(row.id_comprobante_cobro, motivo);
      return r.success;
    },
  },
  {
    id: 'egresos',
    label: 'EGRESOS/INGRESOS',
    endpoint: '/caja/listadodetallecajaPendientes',
    idField: 'id_caja_detalle',
    icon: 'fa-money-bill-wave',
    color: 'border-l-amber-500',
    customParams: (page, size, f) => ({
      tipo: f.tipo || '',
      monto: f.monto_busqueda || '',
      mes: f.comboMes || '',
      anio: f.comboAnio || '',
      desde: f.desde || '',
      hasta: f.hasta || '',
      page: page + 1,
      limit: size,
    }),
    filters: [
      {
        k: 'tipo', l: 'Tipo', t: 'select',
        opts: [
          { value: '', label: 'Todos' },
          { value: 'Egreso', label: 'Egreso' },
          { value: 'Ingreso', label: 'Ingreso' },
        ],
      },
      { k: 'monto_busqueda', l: 'Monto', t: 'text' },
      { k: 'comboMes', l: 'Mes', t: 'select', opts: MESES },
      { k: 'comboAnio', l: 'Año', t: 'select', opts: ANIOS },
      { k: 'desde', l: 'Desde', t: 'date' },
      { k: 'hasta', l: 'Hasta', t: 'date' },
    ],
    columns: [
      { k: 'fecha_caja_detalle', l: 'FECHA Y HORA', w: 'w-32', r: (v) => v || '-' },
      { k: 'tipo_caja_detalle', l: 'TIPO', w: 'w-20' },
      { k: 'monto_caja_detalle', l: 'MONTO', w: 'w-20 text-right', r: (v) => `$${parseFloat(v||0).toFixed(2)}` },
      { k: 'nombre_socio_caja_detalle', l: 'SOCIO', w: 'w-24', r: (v) => v || '-' },
      { k: 'numero_documento_caja_detalle', l: '# DOCUMENTO', w: 'w-20', r: (v) => v || '-' },
      { k: 'usuario', l: 'USUARIO', w: 'w-24', r: (v) => v || '-' },
      { k: 'motivo_anulacion_detalle_caja', l: 'MOTIVO', flex: true, r: (v) => v || <span className="text-slate-300">—</span> },
      { k: 'observacion_caja_detalle', l: 'OBSERVACIÓN', flex: true, r: (v) => v || <span className="text-slate-300">—</span> },
    ],
    canSelect: (row) => row.estado_caja_detalle === 'PENDIENTE',
    rowClass: (row) => {
      if (row.estado_caja_detalle === 'ANULADA') return 'bg-red-50';
      if (row.estado_caja_detalle === 'PENDIENTE') return 'bg-amber-50';
      return '';
    },
    anularTodas: async (motivo) => {
      const r = await anularEgresosTodas(motivo);
      return r.success;
    },
    anularSeleccionadas: async (seleccionados, motivo) => {
      const ids = seleccionados.map(s => s.id_caja_detalle);
      const r = await anularEgresosSeleccionadas(ids, motivo);
      return r.success;
    },
    cancelarAnulacion: async (row, motivo) => {
      const r = await cancelarAnulacionEgreso(row.id_caja_detalle, motivo);
      return r.success;
    },
  },
  {
    id: 'boletos',
    label: 'BOLETOS',
    endpoint: '/boleteria/boleteriaListado',
    idField: 'id_anular_bolteria',
    icon: 'fa-ticket-alt',
    color: 'border-l-rose-500',
    customParams: (page, size, f) => ({
      factura: f.factura_busqueda || '',
      ruc: f.ruc_busqueda || '',
      mes: f.comboMes || '',
      anio: f.comboAnio || '',
      desde: f.desde || '',
      hasta: f.hasta || '',
      page: page + 1,
      limit: size,
    }),
    filters: [
      { k: 'factura_busqueda', l: 'Factura', t: 'text' },
      { k: 'ruc_busqueda', l: 'RUC', t: 'text' },
      { k: 'comboMes', l: 'Mes', t: 'select', opts: MESES },
      { k: 'comboAnio', l: 'Año', t: 'select', opts: ANIOS },
      { k: 'desde', l: 'Desde', t: 'date' },
      { k: 'hasta', l: 'Hasta', t: 'date' },
    ],
    columns: [
      { k: 'numero_anulacion_bolteria', l: '#FACTURA', w: 'w-20' },
      { k: 'fecha_factura_anulacion_boleteria', l: 'FECHA', w: 'w-24', r: (v) => v ? v.split(' ')[0] : '-' },
      {
        k: 'cliente', l: 'CLIENTE', flex: true,
        r: (_, r) => {
          const ruc = r.ruc_anular_bolteria || '';
          const nom = r.cliente_anular_bolteria || '';
          return (!ruc && !nom) ? <span className="text-slate-300">—</span> : (
            <div className="text-[9px] leading-tight">
              <div className="text-slate-400"><b>RUC:</b> {ruc}</div>
              <div><b>Razón Social:</b> {nom}</div>
            </div>
          );
        },
      },
      { k: 'total_anular_boleteria', l: 'TOTAL', w: 'w-20 text-right', r: (v) => `$${parseFloat(v||0).toFixed(2)}` },
      { k: 'motivo_anulacion_boleteria', l: 'MOTIVO', flex: true, r: (v) => v || <span className="text-slate-300">—</span> },
    ],
    canSelect: (row) => row.estado_anular_boleteria == 0,
    rowClass: (row) => {
      if (row.estado_anular_boleteria == 1) return 'bg-red-50';
      if (row.estado_anular_boleteria == 0) return 'bg-amber-50';
      if (row.estado_anular_boleteria == 2) return 'bg-orange-50';
      return '';
    },
    anularTodas: async (motivo) => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await api.post('/boleteria/anularboletostodas', {
        motivo_anulacion: motivo,
        id_usuario_anulacion: user?.id_usuario || user?.id || '',
      });
      return res.data?.success;
    },
    anularSeleccionadas: async (seleccionados, motivo) => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const claves = seleccionados.map(s => `'${s.clave_acceso_anular_boleteria}'`).join(', ');
      const res = await api.post('/boleteria/anularboletosseleccionados', {
        clave_acceso: claves,
        motivo: motivo,
        id_usuario_anulacion: user?.id_usuario || user?.id || '',
      });
      return res.data?.success;
    },
    cancelarAnulacion: async (row, motivo) => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await api.post('/boleteria/cancelarAnulacion', {
        id_boleto: row.id_anular_bolteria,
        motivo: motivo,
        id_usuario_anulacion: user?.id_usuario || user?.id || '',
      });
      return res.data?.success;
    },
  },
];

// ─────────────── Componente Tab interno ───────────────
const TabContent = ({ tab }) => {
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showCancelBtns, setShowCancelBtns] = useState({});

  const buildCustomParams = useCallback(
    (page, size) => tab.customParams(page, size, filters),
    [tab, filters]
  );

  const { data, loading, total, fetch: fetchData } = useListado(tab.endpoint, {}, buildCustomParams);

  // Cargar datos al montar el tab
  useEffect(() => {
    fetchData({}, 0);
  }, []); // eslint-disable-line

  const totalPages = Math.ceil((total || 0) / PAGE_SIZE);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchData(filters, 0);
  };

  const handleClear = () => {
    setFilters({});
    setCurrentPage(1);
    setSelected(new Set());
    fetchData({}, 0);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seleccionados = (data || []).filter(d => selected.has(d.id || d[Object.keys(d)[0]]));

  // ── Anular Todas ──
  const handleAnularTodas = async () => {
    const result = await mostrarMotivoModal(
      'Anular Todos',
      `¿Seguro que desea anular todos los ${tab.label.toLowerCase()} pendientes?`
    );
    if (!result.isConfirmed || !result.value) return;
    try {
      const ok = await tab.anularTodas(result.value);
      if (ok) {
        Swal.fire('Éxito', `${tab.label} anulados correctamente`, 'success');
        handleClear();
      } else {
        Swal.fire('Error', 'No se pudieron anular', 'error');
      }
    } catch {
      Swal.fire('Error', 'Error al anular', 'error');
    }
  };

  // ── Anular Seleccionadas ──
  const handleAnularSeleccionadas = async () => {
    if (seleccionados.length === 0) {
      Swal.fire('Info', 'No ha seleccionado ningún registro', 'info');
      return;
    }
    const result = await mostrarMotivoModal(
      'Anular Seleccionados',
      `¿Seguro que desea anular los ${seleccionados.length} registros seleccionados?`
    );
    if (!result.isConfirmed || !result.value) return;
    try {
      const ok = await tab.anularSeleccionadas(seleccionados, result.value);
      if (ok) {
        Swal.fire('Éxito', `${tab.label} anulados correctamente`, 'success');
        handleClear();
      } else {
        Swal.fire('Error', 'No se pudieron anular', 'error');
      }
    } catch {
      Swal.fire('Error', 'Error al anular', 'error');
    }
  };

  // ── Cancelar Anulación (individual) ──
  const handleCancelarAnulacion = async (row) => {
    const motivo = await mostrarCancelarModal(
      'Cancelar Anulación',
      tab.label.toLowerCase()
    );
    if (!motivo) return;
    try {
      const ok = await tab.cancelarAnulacion(row, motivo);
      if (ok) {
        Swal.fire('Éxito', 'Anulación cancelada correctamente', 'success');
        handleClear();
      } else {
        Swal.fire('Error', 'No se pudo cancelar la anulación', 'error');
      }
    } catch {
      Swal.fire('Error', 'Error al cancelar anulación', 'error');
    }
  };

  const getRowId = (row, idx) => {
    const idField = tab.idField || 'id';
    return row[idField] || row.id || idx;
  };

  return (
    <div className="space-y-3">
      {/* ─── Filtros ─── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          <i className={`fas ${tab.icon} mr-1.5`}></i>
          Busqueda de {tab.label}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {tab.filters.map((fi) => (
            <div key={fi.k} className="flex flex-col">
              <label className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">{fi.l}</label>
              {fi.t === 'select' ? (
                <select
                  value={filters[fi.k] ?? ''}
                  onChange={(e) => handleFilterChange(fi.k, e.target.value)}
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                >
                  {(fi.opts || []).map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : fi.t === 'date' ? (
                <input
                  type="date"
                  value={filters[fi.k] ?? ''}
                  onChange={(e) => handleFilterChange(fi.k, e.target.value)}
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={filters[fi.k] ?? ''}
                  onChange={(e) => handleFilterChange(fi.k, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={fi.l}
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleSearch} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors">
            <i className="fas fa-search text-[10px]"></i> Buscar
          </button>
          <button onClick={handleClear} className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-300 transition-colors">
            <i className="fas fa-eraser text-[10px]"></i> Limpiar
          </button>
        </div>
      </div>

      {/* ─── Botones de acción ─── */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleAnularTodas} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
          <i className="fas fa-circle text-[8px]"></i> Anular Todas
        </button>
        <button onClick={handleAnularSeleccionadas} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
          <i className="fas fa-list text-[10px]"></i> Anular Seleccionadas ({seleccionados.length})
        </button>
      </div>

      {/* ─── Grid ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-2 py-2 w-8">
                    <span className="text-slate-400 text-[9px] font-bold">✓</span>
                  </th>
                  {tab.columns.map(col => (
                    <th key={col.k} className={`px-2 py-2 text-left font-bold text-slate-500 uppercase tracking-wider ${col.w || ''} ${col.r === 'text-right' ? 'text-right' : ''}`}>
                      {col.l}
                    </th>
                  ))}
                  <th className="px-2 py-2 w-16 text-center font-bold text-slate-500 uppercase tracking-wider">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).length === 0 ? (
                  <tr><td colSpan={tab.columns.length + 2} className="text-center py-8 text-slate-400">Sin datos para mostrar</td></tr>
                ) : (
                  (data || []).map((row, idx) => {
                    const rowId = getRowId(row, idx);
                    const canSelect = tab.canSelect ? tab.canSelect(row) : true;
                    const isSelected = selected.has(rowId);
                    return (
                      <tr key={rowId} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${tab.rowClass ? tab.rowClass(row) : ''} ${isSelected ? 'bg-blue-50' : ''}`}>
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canSelect}
                            onChange={() => canSelect && toggleSelect(rowId)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                          />
                        </td>
                        {tab.columns.map(col => (
                          <td key={col.k} className={`px-2 py-1.5 ${col.r === 'text-right' ? 'text-right' : ''}`}>
                            {col.r ? col.r(row[col.k], row) : (row[col.k] ?? <span className="text-slate-300">—</span>)}
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-center">
                          <button
                            onClick={() => handleCancelarAnulacion(row)}
                            title="Cancelar Anulación"
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition-colors"
                          >
                            <i className="fas fa-times-circle text-sm"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Paginación ─── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px]">
            <span className="text-slate-500">
              Mostrando {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, total || 0)} de {total || 0}
            </span>
            <div className="flex gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => { setCurrentPage(p => p - 1); fetchData(filters, currentPage - 2); }}
                className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100 transition-colors"
              >
                <i className="fas fa-chevron-left text-[9px]"></i>
              </button>
              <span className="px-2 py-1 font-bold text-slate-600">{currentPage}</span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => { setCurrentPage(p => p + 1); fetchData(filters, currentPage); }}
                className="px-2 py-1 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100 transition-colors"
              >
                <i className="fas fa-chevron-right text-[9px]"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────── Page principal ───────────────
export const AnulacionesPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <i className="fas fa-ban text-red-600 text-lg"></i>
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-800">Anulaciones</h1>
          <p className="text-[11px] text-slate-500">Anulación de facturas, guías, comprobantes, egresos/ingresos y boletos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-0">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border-b-2 ${
              activeTab === i
                ? `border-blue-500 text-blue-700 bg-blue-50/50 ${tab.color}`
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <i className={`fas ${tab.icon} mr-1.5`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fadeIn">
        <TabContent key={activeTab} tab={TABS[activeTab]} />
      </div>
    </div>
  );
};
