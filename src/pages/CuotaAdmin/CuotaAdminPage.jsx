import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { cobrosService } from '../../services/cobros.service';
import { DateRangePicker } from '../../components/common/DateRangePicker';

const MESES = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;

const formatFecha = (f) => {
  if (!f || f === '0000-00-00' || String(f).startsWith('0000-00-00')) return '-';
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return String(f);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(f);
  }
};

export const CuotaAdminPage = () => {
  // ── Estados de Datos y Paginación ───────────────────────────
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Filtros ──────────────────────────────────────────────────
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'pendiente' | 'parcial' | 'pagado' | 'anulado'
  const [searchTerm, setSearchTerm] = useState('');

  // ── Modales ──────────────────────────────────────────────────
  const [showGenerarModal, setShowGenerarModal] = useState(false);
  const [showPagarModal, setShowPagarModal] = useState(false);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);
  const [montoPagar, setMontoPagar] = useState('');
  const [observacionPago, setObservacionPago] = useState('');
  const [procesandoPago, setProcesandoPago] = useState(false);

  // ── Formulario Generación Masiva ─────────────────────────────
  const now = useMemo(() => new Date(), []);
  const [mesGen, setMesGen] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [anioGen, setAnioGen] = useState(String(now.getFullYear()));
  const [valorGen, setValorGen] = useState('700.00');
  const [generando, setGenerando] = useState(false);

  const years = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));
  }, [now]);

  // ── Cargar Listado de Cuotas ─────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: pageSize,
        page,
        id_tipo_deuda: 3, // Cuota administrativa
      };
      if (filtroEstado && filtroEstado !== 'todos') {
        params.estado = filtroEstado;
      }
      if (fechaDesde && fechaHasta) {
        params.fecha_desde = fechaDesde;
        params.fecha_hasta = fechaHasta;
      }

      const res = await cobrosService.listarDeudas(params);
      if (res.success) {
        // Filtrar estrictamente solo Cuotas Administrativas (excluir cuotas de despacho o cobros operativos)
        const cuotasAdmin = (res.data || []).filter((item) => {
          const c = (item.concepto || '').toUpperCase();
          const t = (item.tipo_nombre || '').toUpperCase();
          const o = (item.observacion || '').toUpperCase();
          if (c.includes('DESPACHO') || t.includes('DESPACHO') || o.includes('DESPACHO')) return false;
          return c.includes('ADMIN') || t.includes('ADMIN') || parseFloat(item.valor_original) > 10;
        });
        setData(cuotasAdmin);
        setTotal(res.total || cuotasAdmin.length);
      } else {
        toast.error(res.message || 'Error al cargar cuotas');
      }
    } catch {
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filtroEstado, fechaDesde, fechaHasta]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Filtrado rápido en memoria por texto y exclusión estricta ──
  const filteredData = useMemo(() => {
    const list = data.filter((item) => {
      const c = (item.concepto || '').toUpperCase();
      const t = (item.tipo_nombre || '').toUpperCase();
      const o = (item.observacion || '').toUpperCase();
      if (c.includes('DESPACHO') || t.includes('DESPACHO') || o.includes('DESPACHO')) return false;
      return true;
    });

    if (!searchTerm.trim()) return list;
    const s = searchTerm.toLowerCase().trim();
    return list.filter((item) => {
      const socio = (item.socio_nombre || '').toLowerCase();
      const bus = String(item.disco_buses || '').toLowerCase();
      const concepto = (item.concepto || '').toLowerCase();
      const observacion = (item.observacion || '').toLowerCase();
      return socio.includes(s) || bus.includes(s) || concepto.includes(s) || observacion.includes(s);
    });
  }, [data, searchTerm]);

  // ── Métricas de resumen ──────────────────────────────────────
  const metrics = useMemo(() => {
    let emitido = 0;
    let pagado = 0;
    let pendiente = 0;

    filteredData.forEach((d) => {
      if (d.estado !== 'anulado') {
        emitido += parseFloat(d.valor_original || 0);
        pagado += parseFloat(d.valor_pagado || 0);
        pendiente += parseFloat(d.saldo_pendiente || 0);
      }
    });

    return { emitido, pagado, pendiente };
  }, [filteredData]);

  // ── Generar Cuota Masiva ─────────────────────────────────────
  const handleGenerarCuota = async (e) => {
    e?.preventDefault();
    const mesObj = MESES.find((m) => m.value === mesGen);
    const confirm = await Swal.fire({
      title: '¿Generar cuota administrativa mensual?',
      html: `
        <div style="text-align:left; font-size:13px; line-height:1.6;">
          Se generará una deuda automática para todos los socios con buses activos.<br><br>
          <b>Periodo:</b> ${mesObj?.label} ${anioGen}<br>
          <b>Valor por socio:</b> $${parseFloat(valorGen).toFixed(2)}<br>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fas fa-check-circle mr-1"></i> Sí, generar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    setGenerando(true);
    try {
      const res = await cobrosService.generarCuotaMensual({
        mes: mesGen,
        anio: anioGen,
        valor: valorGen,
        concepto: `Cuota administrativa ${mesObj?.label} ${anioGen}`,
      });
      if (res.success) {
        Swal.fire({
          title: 'Cuotas Generadas con Éxito',
          html: `Se registraron <b>${res.data?.insertados || 0}</b> cuotas administrativas de un total de <b>${res.data?.total_socios || 0}</b> socios activos.`,
          icon: 'success',
          confirmButtonColor: '#2563eb',
        });
        setShowGenerarModal(false);
        loadData();
      } else {
        Swal.fire('Error', res.message || 'No se pudo generar la cuota', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Error de conexión', 'error');
    } finally {
      setGenerando(false);
    }
  };

  // ── Anular Cuota ─────────────────────────────────────────────
  const handleAnular = async (item) => {
    const { value: motivo } = await Swal.fire({
      title: '¿Anular cuota administrativa?',
      html: `¿Está seguro de anular la cuota de <b>${item.socio_nombre}</b> (Bus ${item.disco_buses}) por <b>${formatCurrency(item.saldo_pendiente)}</b>?`,
      input: 'text',
      inputPlaceholder: 'Ingrese el motivo de anulación...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || !value.trim()) return 'Debe ingresar un motivo para la anulación';
      },
    });

    if (!motivo) return;

    try {
      const res = await cobrosService.anularDeuda({ id_deuda: item.id_deuda, motivo: motivo.trim() });
      if (res.success) {
        toast.success('Cuota administrativa anulada');
        loadData();
      } else {
        toast.error(res.message || 'Error al anular cuota');
      }
    } catch {
      toast.error('Error al anular la cuota');
    }
  };

  // ── Registrar Pago Manual ────────────────────────────────────
  const handleAbrirPago = (item) => {
    setCuotaSeleccionada(item);
    setMontoPagar(String(item.saldo_pendiente || item.valor_original));
    setObservacionPago('');
    setShowPagarModal(true);
  };

  const handleProcesarPago = async (e) => {
    e.preventDefault();
    if (!montoPagar || parseFloat(montoPagar) <= 0) {
      toast.error('Ingrese un monto válido a pagar');
      return;
    }
    setProcesandoPago(true);
    try {
      const res = await cobrosService.pagarDeuda({
        id_deuda: cuotaSeleccionada.id_deuda,
        monto: parseFloat(montoPagar),
        observacion: observacionPago.trim(),
      });
      if (res.success) {
        toast.success('Pago registrado correctamente');
        setShowPagarModal(false);
        loadData();
      } else {
        toast.error(res.message || 'Error al registrar pago');
      }
    } catch {
      toast.error('Error al procesar el pago');
    } finally {
      setProcesandoPago(false);
    }
  };

  const getEstadoBadge = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pagado':
        return (
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
            <i className="fas fa-check-circle text-[9px]" /> Pagado
          </span>
        );
      case 'parcial':
        return (
          <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
            <i className="fas fa-clock text-[9px]" /> Parcial
          </span>
        );
      case 'anulado':
        return (
          <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200 inline-flex items-center gap-1">
            <i className="fas fa-ban text-[9px]" /> Anulado
          </span>
        );
      default:
        return (
          <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-200 inline-flex items-center gap-1">
            <i className="fas fa-exclamation-circle text-[9px]" /> Pendiente
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden font-sans">
      {/* ═══════════════════════════════════════════════════════════
          HEADER SUPERIOR
      ═══════════════════════════════════════════════════════════ */}
      <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm z-20">
        <div className="flex flex-wrap items-center justify-between h-auto sm:h-16 px-6 py-3 sm:py-0 gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-sm">
              <i className="fas fa-calendar-check text-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-extrabold text-slate-800 tracking-tight">
                  Cuotas Administrativas
                </h1>
                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                  {total} registros
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Emisión, consulta y control de recaudación de cuotas administrativas mensuales de socios
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="h-9 px-3 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              title="Actualizar tabla"
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
              <span>Refrescar</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGenerarModal(true)}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <i className="fas fa-plus-circle" />
              <span>Generar Cuota Mensual</span>
            </button>
          </div>
        </div>

        {/* ── BARRA DE FILTROS INTEGRADA ── */}
        <div className="bg-slate-50/80 px-6 py-2.5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* 1. Rango de Fechas Unificado */}
          <div className="w-full">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Rango de Fechas
            </label>
            <DateRangePicker
              startDate={fechaDesde}
              endDate={fechaHasta}
              onChange={({ startDateStr, endDateStr }) => {
                setFechaDesde(startDateStr || '');
                setFechaHasta(endDateStr || startDateStr || '');
              }}
              placeholder="Filtrar por fecha..."
            />
          </div>

          {/* 2. Filtro por Estado */}
          <div className="w-full">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Estado de Cuota
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-semibold"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="parcial">Parciales</option>
              <option value="pagado">Pagados</option>
              <option value="anulado">Anulados</option>
            </select>
          </div>

          {/* 3. Buscador por Texto */}
          <div className="w-full">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Búsqueda Rápida
            </label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar socio, bus, concepto..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* 4. Botón Limpiar Filtros */}
          <div className="w-full flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFechaDesde('');
                setFechaHasta('');
                setFiltroEstado('todos');
                setSearchTerm('');
                setPage(1);
              }}
              className="h-9 w-full text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <i className="fas fa-undo text-[10px] text-slate-400" />
              <span>Limpiar Filtros</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          CUERPO PRINCIPAL: MÉTRICAS Y TABLA DE CUOTAS
      ═══════════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Tarjetas KPI de Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Emitido</p>
              <p className="text-xl font-black font-mono text-blue-700 mt-1">{formatCurrency(metrics.emitido)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base">
              <i className="fas fa-file-invoice-dollar" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Recaudado / Pagado</p>
              <p className="text-xl font-black font-mono text-emerald-600 mt-1">{formatCurrency(metrics.pagado)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
              <i className="fas fa-check-double" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Saldo Pendiente</p>
              <p className="text-xl font-black font-mono text-rose-600 mt-1">{formatCurrency(metrics.pendiente)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base">
              <i className="fas fa-hand-holding-usd" />
            </div>
          </div>
        </div>

        {/* Tabla de Cuotas Administrativas */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <th className="px-4 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3 text-center w-28">Fecha Emisión</th>
                  <th className="px-4 py-3 text-left">Socio Asignado</th>
                  <th className="px-4 py-3 text-center w-24">Bus / Disco</th>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-right w-24">Valor Cuota</th>
                  <th className="px-4 py-3 text-right w-24">Valor Pagado</th>
                  <th className="px-4 py-3 text-right w-28">Saldo Pendiente</th>
                  <th className="px-4 py-3 text-center w-28">Estado</th>
                  <th className="px-4 py-3 text-center w-28">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                      <i className="fas fa-circle-notch fa-spin text-2xl text-blue-600 mb-2" />
                      <p className="text-xs font-semibold">Cargando cuotas administrativas...</p>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 mx-auto mb-3">
                        <i className="fas fa-calendar-times text-2xl" />
                      </div>
                      <p className="text-sm font-bold text-slate-600">No se encontraron cuotas administrativas</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        No hay registros para los filtros seleccionados. Puede generar una nueva cuota con el botón superior.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, idx) => (
                    <tr key={`${item.fuente || 'item'}-${item.id_deuda}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px]">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 font-mono text-[11px]">
                        {formatFecha(item.fecha_creacion)}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        <div className="truncate max-w-[220px]" title={item.socio_nombre}>
                          {item.socio_nombre || 'Sin socio asignado'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-blue-50 text-blue-700 font-black font-mono text-[11px] px-2.5 py-0.5 rounded-md border border-blue-200 shadow-xs">
                          {item.disco_buses ? `Bus ${item.disco_buses}` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        <div className="truncate max-w-[240px]" title={item.concepto}>
                          {item.concepto || 'Cuota administrativa'}
                        </div>
                        {item.observacion && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[240px]" title={item.observacion}>
                            {item.observacion}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black font-mono text-slate-800 text-[12px]">
                        {formatCurrency(item.valor_original)}
                      </td>
                      <td className="px-4 py-3 text-right font-black font-mono text-emerald-600 text-[12px]">
                        {formatCurrency(item.valor_pagado)}
                      </td>
                      <td className="px-4 py-3 text-right font-black font-mono text-rose-600 text-[12px]">
                        {formatCurrency(item.saldo_pendiente)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getEstadoBadge(item.estado)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.estado !== 'pagado' && item.estado !== 'anulado' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAbrirPago(item)}
                                className="w-7 h-7 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center justify-center transition-all shadow-xs"
                                title="Registrar Pago Manual"
                              >
                                <i className="fas fa-hand-holding-usd text-[10px]" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAnular(item)}
                                className="w-7 h-7 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center justify-center transition-all shadow-xs"
                                title="Anular Cuota"
                              >
                                <i className="fas fa-trash-alt text-[10px]" />
                              </button>
                            </>
                          )}
                          {(item.estado === 'pagado' || item.estado === 'anulado') && (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── BARRA DE PAGINACIÓN ── */}
          <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Mostrando <b className="text-slate-700">{filteredData.length}</b> de <b className="text-slate-700">{total}</b> cuotas registradas
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold"
              >
                <option value={10}>10 por pág.</option>
                <option value={25}>25 por pág.</option>
                <option value={50}>50 por pág.</option>
                <option value={100}>100 por pág.</option>
              </select>

              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="h-8 px-3 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-all disabled:opacity-40"
              >
                <i className="fas fa-chevron-left mr-1 text-[10px]" /> Anterior
              </button>

              <span className="px-2 text-xs font-bold text-slate-700 font-mono">
                Pág. {page} de {Math.max(1, Math.ceil(total / pageSize))}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= total || loading}
                className="h-8 px-3 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-all disabled:opacity-40"
              >
                Siguiente <i className="fas fa-chevron-right ml-1 text-[10px]" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════
          MODAL: GENERAR CUOTA MENSUAL
      ═══════════════════════════════════════════════════════════ */}
      {showGenerarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setShowGenerarModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs">
                  <i className="fas fa-calendar-plus text-sm" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Generar Cuota Administrativa Mensual</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Emisión masiva de deudas a todos los socios activos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerarModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            <form onSubmit={handleGenerarCuota} className="p-6 space-y-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5">
                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                  <i className="fas fa-info-circle text-blue-600 mr-1.5" />
                  Se generará una cuota administrativa para <b>todos los socios con buses operativos</b>. La deuda se descontará automáticamente en los despachos de viaje.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mes <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={mesGen}
                    onChange={(e) => setMesGen(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-semibold"
                  >
                    {MESES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Año <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={anioGen}
                    onChange={(e) => setAnioGen(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-semibold"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor por Socio ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={valorGen}
                    onChange={(e) => setValorGen(e.target.value)}
                    required
                    className="w-full h-10 pl-7 pr-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-black font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGenerarModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={generando || !valorGen}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
                >
                  {generando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-play" />}
                  <span>{generando ? 'Generando cuotas...' : 'Generar Cuotas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: REGISTRAR PAGO MANUAL
      ═══════════════════════════════════════════════════════════ */}
      {showPagarModal && cuotaSeleccionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setShowPagarModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
                  <i className="fas fa-hand-holding-usd text-sm" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Registrar Pago de Cuota</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Abono o cancelación de cuota administrativa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPagarModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            <form onSubmit={handleProcesarPago} className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1 text-xs">
                <p className="text-slate-500">Socio: <b className="text-slate-800">{cuotaSeleccionada.socio_nombre}</b></p>
                <p className="text-slate-500">Bus: <b className="text-slate-800">Bus {cuotaSeleccionada.disco_buses}</b></p>
                <p className="text-slate-500">Saldo Pendiente: <b className="text-rose-600 font-mono font-black">{formatCurrency(cuotaSeleccionada.saldo_pendiente)}</b></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monto a Pagar ($) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={cuotaSeleccionada.saldo_pendiente}
                  value={montoPagar}
                  onChange={(e) => setMontoPagar(e.target.value)}
                  required
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-black font-mono text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observación o Comprobante
                </label>
                <textarea
                  rows={2}
                  value={observacionPago}
                  onChange={(e) => setObservacionPago(e.target.value)}
                  placeholder="Ej: Pago en ventanilla / Transferencia..."
                  className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPagarModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoPago || !montoPagar}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
                >
                  {procesandoPago ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
                  <span>{procesandoPago ? 'Procesando...' : 'Confirmar Pago'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuotaAdminPage;