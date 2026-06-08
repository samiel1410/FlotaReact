import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../config/axios';
import Swal from 'sweetalert2';

// ============================================================
// LISTADO DE COBROS — 3 TABS
// 1. Listado de Cobros
// 2. Cobro Rápido
// 3. Comprobantes de Pago
// ============================================================

// ─── HELPERS ────────────────────────────────────────────────
const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
const getYears = () => {
  const y = new Date().getFullYear();
  return [{ value: '', label: 'Todos' }, ...Array.from({ length: 6 }, (_, i) => ({ value: String(y - i), label: String(y - i) }))];
};
const MONTHS = [
  { value: '', label: 'Todos' }, { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' }, { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' }, { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
];

// ─── TAB: LISTADO DE COBROS ─────────────────────────────────
const ListadoCobros = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [buses, setBuses] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  // Filtros
  const [filters, setFilters] = useState({
    bus_busqueda: '', estado_busqueda: 'all', mes_busqueda: '',
    anio_busqueda: '', fecha_desde: '', fecha_hasta: '', sucursal_busqueda: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: pageSize,
        page,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
      };
      const res = await api.get('/cobro/listadoCobros', { params });
      if (res.data?.success) {
        setData(res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  // Cargar buses y sucursales para filtros
  useEffect(() => {
    api.get('/buses/seleccionarBuses', { params: { limit: 200 } }).then(r => {
      if (r.data?.success) setBuses(r.data.data || []);
    }).catch(() => {});
    api.get('/sucursal/sucursalselect', { params: { limit: 100 } }).then(r => {
      if (r.data?.success) setSucursales(r.data.data || []);
    }).catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  // ─── ACCIONES ────────────────────────────────────────────
  const handleCobrar = async (row) => {
    if (row.estado_cobros == 1) {
      Swal.fire('Aviso', 'El cobro ya está pagado', 'info');
      return;
    }
    // Validar caja aperturada
    try {
      const cajaRes = await api.post('/cajaretenciones/validarcaja');
      if (cajaRes.data?.message != 1) {
        Swal.fire('Aviso', 'No hay una caja aperturada. Abra una caja primero.', 'warning');
        return;
      }
    } catch { /* si no existe el endpoint, continuar */ }

    const { value: formValues } = await Swal.fire({
      title: `Cobrar - ${row.nombre_tipo_cobros}`,
      html: `
        <div style="text-align:left">
          <p><b>Bus:</b> ${row.disco_buses} &nbsp;|&nbsp; <b>Monto:</b> ${formatCurrency(row.monto_cobros)}</p>
          <p><b>Pagado:</b> ${formatCurrency(row.total_pagado)} &nbsp;|&nbsp; <b>Saldo:</b> ${formatCurrency(row.saldo_pendiente)}</p>
          <hr style="margin:12px 0"/>
          <label style="display:block;font-weight:bold;font-size:12px;margin-bottom:4px">Monto a cobrar</label>
          <input id="swal-monto" class="swal2-input" type="number" step="0.01" value="${row.saldo_pendiente}" style="width:100%">
          <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Fecha</label>
          <input id="swal-fecha" class="swal2-input" type="date" value="${new Date().toISOString().split('T')[0]}" style="width:100%">
          <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Concepto</label>
          <input id="swal-concepto" class="swal2-input" value="Pago ${row.nombre_tipo_cobros}" style="width:100%">
          <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Observación</label>
          <textarea id="swal-observacion" class="swal2-textarea" style="width:100%;min-height:60px"></textarea>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Cobrar',
      preConfirm: () => ({
        monto: document.getElementById('swal-monto').value,
        fecha: document.getElementById('swal-fecha').value,
        concepto: document.getElementById('swal-concepto').value,
        observacion: document.getElementById('swal-observacion').value,
      })
    });
    if (!formValues) return;

    try {
      const res = await api.post('/cobro/pagarRetencion', {
        id_cobro: row.id_cobros,
        id_bus: row.id_fkbus_cobros,
        monto: formValues.monto,
        fecha: formValues.fecha,
        concepto: formValues.concepto,
        observacion: formValues.observacion,
        idformapago: 1
      });
      if (res.data?.success) {
        Swal.fire('Éxito', 'Cobro registrado correctamente', 'success');
        loadData();
      } else {
        Swal.fire('Error', res.data?.error || 'Error al procesar el cobro', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handlePdfRetencion = (row) => {
    const url = `/php/pdfRetencion.php?id_cobros=${row.id_cobros}`;
    window.open(url, '_blank');
  };

  const handleImprimir = (row) => {
    const url = `/php/pdfCobroEntregadoA4.php?id_cobros=${row.id_cobros}`;
    window.open(url, '_blank');
  };

  const handleEntregar = async (row) => {
    if (row.estado_cobros != 1) {
      Swal.fire('Aviso', 'El cobro debe estar pagado para entregarlo', 'warning');
      return;
    }
    const { isConfirmed } = await Swal.fire({
      title: '¿Entregar cobro?',
      text: `Confirme la entrega del cobro #${row.id_cobros}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, entregar',
    });
    if (!isConfirmed) return;
    try {
      const res = await api.post('/cobro/entregarCobro', { id_cobros: row.id_cobros });
      if (res.data?.success) {
        Swal.fire('Éxito', 'Cobro entregado correctamente', 'success');
        loadData();
      } else {
        Swal.fire('Error', res.data?.message || 'Error al entregar', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleVerCobrosRealizados = async (row) => {
    try {
      const res = await api.get('/cobro/listadoComprobantesCobro', { params: { id_cobros: row.id_cobros } });
      if (!res.data?.success || !res.data?.data?.length) {
        Swal.fire('Info', 'No hay comprobantes registrados para este cobro', 'info');
        return;
      }
      const detalles = res.data.data.map(c => `
        <tr>
          <td style="padding:4px 8px;border-bottom:1px solid #eee">${c.id_comprobante_cobro_retenciones}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee">${c.fecha_emision_comprobante_cobro?.split(' ')[0] || '-'}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(c.monto_comprobante_cobro)}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee">${c.nombre_forma_pago || '-'}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee">${c.estado_comprobante_cobro}</td>
        </tr>
      `).join('');

      Swal.fire({
        title: `Comprobantes - Cobro #${row.id_cobros}`,
        html: `
          <div style="max-height:400px;overflow-y:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="background:#f8fafc">
                <th style="padding:6px 8px;text-align:left">ID</th>
                <th style="padding:6px 8px;text-align:left">Fecha</th>
                <th style="padding:6px 8px;text-align:right">Monto</th>
                <th style="padding:6px 8px;text-align:left">Forma Pago</th>
                <th style="padding:6px 8px;text-align:left">Estado</th>
              </tr></thead>
              <tbody>${detalles}</tbody>
            </table>
          </div>`,
        width: 700,
        confirmButtonText: 'Cerrar'
      });
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  // ─── RENDER ──────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-700 p-3 rounded-lg shadow">
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const { value: form } = await Swal.fire({
                title: 'Nuevo Cobro',
                html: `
                  <div style="text-align:left">
                    <label style="display:block;font-weight:bold;font-size:12px;margin-bottom:4px">Tipo Cobro</label>
                    <select id="swal-tipo" class="swal2-input" style="width:100%">
                      <option value="">Seleccione...</option>
                    </select>
                    <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Bus</label>
                    <select id="swal-bus" class="swal2-input" style="width:100%">
                      <option value="">Seleccione...</option>
                      ${buses.map(b => `<option value="${b.id_buses}">${b.disco_buses} - ${b.placa_buses || ''}</option>`).join('')}
                    </select>
                    <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Valor ($)</label>
                    <input id="swal-valor" class="swal2-input" type="number" step="0.01" value="0" style="width:100%">
                    <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Observaciones</label>
                    <textarea id="swal-obs" class="swal2-textarea" style="width:100%;min-height:60px"></textarea>
                  </div>`,
                showCancelButton: true,
                confirmButtonText: 'Guardar',
                didOpen: async () => {
                  try {
                    const tcRes = await api.get('/tipo_cobros/tipoCobros');
                    const tipos = tcRes.data?.data || [];
                    const select = document.getElementById('swal-tipo');
                    tipos.forEach(t => {
                      const opt = document.createElement('option');
                      opt.value = t.id_tipo_cobros;
                      opt.textContent = `${t.nombre_tipo_cobros} - $${parseFloat(t.valor_tipo_cobros||0).toFixed(2)}`;
                      select.appendChild(opt);
                    });
                  } catch(e) { console.error(e); }
                },
                preConfirm: () => ({
                  tipo_cobro: document.getElementById('swal-tipo').value,
                  id_bus: document.getElementById('swal-bus').value,
                  valor_retencion: document.getElementById('swal-valor').value,
                  observaciones: document.getElementById('swal-obs').value,
                })
              });
              if (!form) return;
              if (!form.tipo_cobro || !form.id_bus || !form.valor_retencion) {
                Swal.fire('Validación', 'Complete todos los campos requeridos', 'warning');
                return;
              }
              try {
                const res = await api.post('/cobro/agregarCobro', form);
                if (res.data?.success) {
                  Swal.fire('Éxito', 'Cobro creado correctamente', 'success');
                  loadData();
                } else {
                  Swal.fire('Error', res.data?.error || 'Error al crear cobro', 'error');
                }
              } catch (err) {
                Swal.fire('Error', err.message, 'error');
              }
            }}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 transition flex items-center gap-1.5"
          >
            <i className="fas fa-plus-circle"></i> Nuevo Cobro
          </button>
          <button
            onClick={async () => {
              if (selectedRows.length === 0) { Swal.fire('Aviso', 'Seleccione cobros', 'warning'); return; }
              const seleccionados = data.filter(d => selectedRows.includes(d.id_cobros));
              const total = seleccionados.reduce((s, r) => s + parseFloat(r.saldo_pendiente || 0), 0);
              
              const { value: form } = await Swal.fire({
                title: 'Cobrar Masivo',
                html: `
                  <div style="text-align:left;max-height:300px;overflow-y:auto;font-size:12px">
                    <p><b>${seleccionados.length} cobro(s) seleccionado(s)</b></p>
                    <table style="width:100%;border-collapse:collapse;margin:8px 0">
                      <thead><tr style="background:#f8fafc">
                        <th style="padding:4px;text-align:left">ID</th>
                        <th style="padding:4px;text-align:left">Tipo</th>
                        <th style="padding:4px;text-align:right">Saldo</th>
                      </tr></thead>
                      <tbody>
                        ${seleccionados.map(r => `<tr><td style="padding:4px;border-bottom:1px solid #eee">${r.id_cobros}</td><td style="padding:4px;border-bottom:1px solid #eee">${r.nombre_tipo_cobros}</td><td style="padding:4px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">${formatCurrency(r.saldo_pendiente)}</td></tr>`).join('')}
                      </tbody>
                      <tfoot><tr style="font-weight:bold"><td colspan="2" style="padding:6px 4px;text-align:right">TOTAL:</td><td style="padding:6px 4px;text-align:right">${formatCurrency(total)}</td></tr></tfoot>
                    </table>
                    <hr style="margin:8px 0"/>
                    <label style="display:block;font-weight:bold;font-size:12px;margin-bottom:4px">Forma de Pago</label>
                    <input id="swal-fp-masivo" class="swal2-input" placeholder="Forma de pago" value="1" style="width:100%">
                    <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Fecha</label>
                    <input id="swal-fecha-masivo" class="swal2-input" type="date" value="${new Date().toISOString().split('T')[0]}" style="width:100%">
                    <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Concepto</label>
                    <input id="swal-concepto-masivo" class="swal2-input" value="Cobro Masivo" style="width:100%">
                    <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Observación</label>
                    <textarea id="swal-obs-masivo" class="swal2-textarea" style="width:100%;min-height:60px"></textarea>
                  </div>`,
                showCancelButton: true,
                confirmButtonText: 'Cobrar',
                preConfirm: () => ({
                  items: seleccionados.map(r => ({ id: r.id_cobros, a_pagar: r.saldo_pendiente })),
                  total,
                  idformapago: document.getElementById('swal-fp-masivo').value,
                  fecha: document.getElementById('swal-fecha-masivo').value,
                  concepto: document.getElementById('swal-concepto-masivo').value,
                  observacion: document.getElementById('swal-obs-masivo').value,
                })
              });
              if (!form) return;
              try {
                const res = await api.post('/cobro/pagarRetencionMasivo', {
                  items: JSON.stringify(form.items),
                  total: form.total,
                  idformapago: form.idformapago,
                  fecha: form.fecha,
                  concepto: form.concepto,
                  observacion: form.observacion
                });
                if (res.data?.success) {
                  Swal.fire('Éxito', res.data.mensaje || 'Cobro masivo procesado', 'success');
                  setSelectedRows([]);
                  loadData();
                } else {
                  Swal.fire('Error', res.data?.error || 'Error al procesar', 'error');
                }
              } catch (err) {
                Swal.fire('Error', err.message, 'error');
              }
            }}
            disabled={selectedRows.length === 0}
            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-700 disabled:opacity-50 transition flex items-center gap-1.5"
          >
            <i className="fas fa-money-bill-wave"></i> Cobrar Masivo
          </button>
          <button
            onClick={async () => {
              const { value: form } = await Swal.fire({
                title: 'Retenciones Masivas',
                html: `
                  <div style="text-align:left">
                    <label style="display:block;font-weight:bold;font-size:12px;margin-bottom:4px">Tipo Cobro</label>
                    <select id="swal-tipo-rm" class="swal2-input" style="width:100%"></select>
                    <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Valor ($)</label>
                    <input id="swal-valor-rm" class="swal2-input" type="number" step="0.01" value="0" style="width:100%">
                    <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Fecha Cobro</label>
                    <input id="swal-fecha-rm" class="swal2-input" type="date" value="${new Date().toISOString().split('T')[0]}" style="width:100%">
                    <label style="display:block;font-weight:bold;font-size:12px;margin:8px 0 4px">Observaciones</label>
                    <textarea id="swal-obs-rm" class="swal2-textarea" style="width:100%;min-height:60px"></textarea>
                    <hr style="margin:8px 0"/>
                    <p style="font-size:11px;color:#666"><i class="fas fa-info-circle"></i> Se aplicará a todos los buses disponibles</p>
                  </div>`,
                showCancelButton: true,
                confirmButtonText: 'Crear Retenciones',
                didOpen: async () => {
                  try {
                    const tcRes = await api.get('/tipo_cobros/tipoCobros');
                    const tipos = tcRes.data?.data || [];
                    const select = document.getElementById('swal-tipo-rm');
                    select.innerHTML = '<option value="">Seleccione...</option>';
                    tipos.forEach(t => {
                      const opt = document.createElement('option');
                      opt.value = t.id_tipo_cobros;
                      opt.textContent = `${t.nombre_tipo_cobros} - $${parseFloat(t.valor_tipo_cobros||0).toFixed(2)}`;
                      select.appendChild(opt);
                    });
                  } catch(e) { console.error(e); }
                },
                preConfirm: () => ({
                  tipo_cobro: document.getElementById('swal-tipo-rm').value,
                  valor_retencion: document.getElementById('swal-valor-rm').value,
                  fecha_cobro: document.getElementById('swal-fecha-rm').value,
                  observaciones: document.getElementById('swal-obs-rm').value,
                })
              });
              if (!form) return;
              if (!form.tipo_cobro || !form.valor_retencion || !form.fecha_cobro) {
                Swal.fire('Validación', 'Complete todos los campos requeridos', 'warning');
                return;
              }
              try {
                const busesRes = await api.get('/buses/seleccionarBuses', { params: { limit: 500 } });
                const todosBuses = busesRes.data?.data || [];
                const idsBuses = todosBuses.map(b => b.id_buses);
                if (idsBuses.length === 0) {
                  Swal.fire('Error', 'No hay buses registrados', 'error');
                  return;
                }
                const res = await api.post('/cobro/agregarCobroMasivo', {
                  ...form,
                  id_bus: idsBuses
                });
                if (res.data?.success) {
                  Swal.fire('Éxito', res.data.data?.mensaje || 'Retenciones creadas', 'success');
                  loadData();
                } else {
                  Swal.fire('Error', res.data?.error || 'Error al crear retenciones', 'error');
                }
              } catch (err) {
                Swal.fire('Error', err.message, 'error');
              }
            }}
            className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded hover:bg-amber-600 transition flex items-center gap-1.5"
          >
            <i className="fas fa-file-invoice-dollar"></i> Retenciones Masivas
          </button>
        </div>
        <span className="text-white font-bold text-sm"><i className="fas fa-hand-holding-usd mr-2"></i>Gestión de Cobros</span>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
          <i className="fas fa-filter"></i> Búsqueda de Cobros
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Bus</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.bus_busqueda}
              onChange={e => setFilters(f => ({ ...f, bus_busqueda: e.target.value }))}>
              <option value="">Todos</option>
              {buses.map(b => <option key={b.id_buses} value={b.id_buses}>{b.disco_buses}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Estado</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.estado_busqueda}
              onChange={e => setFilters(f => ({ ...f, estado_busqueda: e.target.value }))}>
              <option value="all">Todos</option>
              <option value="cobrado">Cobrado</option>
              <option value="por_cobrar">Por Cobrar</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Mes</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.mes_busqueda}
              onChange={e => setFilters(f => ({ ...f, mes_busqueda: e.target.value }))}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Año</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.anio_busqueda}
              onChange={e => setFilters(f => ({ ...f, anio_busqueda: e.target.value }))}>
              {getYears().map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha Desde</label>
            <input type="date" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.fecha_desde}
              onChange={e => setFilters(f => ({ ...f, fecha_desde: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha Hasta</label>
            <input type="date" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.fecha_hasta}
              onChange={e => setFilters(f => ({ ...f, fecha_hasta: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Sucursal</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filters.sucursal_busqueda}
              onChange={e => setFilters(f => ({ ...f, sucursal_busqueda: e.target.value }))}>
              <option value="">Todas</option>
              {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre_sucursal}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-1">
            <button onClick={loadData} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition flex-1">
              <i className="fas fa-search mr-1"></i> Buscar
            </button>
            <button onClick={() => {
              setFilters({ bus_busqueda: '', estado_busqueda: 'all', mes_busqueda: '', anio_busqueda: '', fecha_desde: '', fecha_hasta: '', sucursal_busqueda: '' });
              setPage(1);
            }} className="px-3 py-1.5 bg-slate-400 text-white text-xs font-bold rounded hover:bg-slate-500 transition">
              <i className="fas fa-eraser"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 text-left w-8">
                  <input type="checkbox" onChange={e => {
                    if (e.target.checked) setSelectedRows(data.map(d => d.id_cobros));
                    else setSelectedRows([]);
                  }} checked={selectedRows.length === data.length && data.length > 0} />
                </th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">ID</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Tipo</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Bus</th>
                <th className="px-3 py-2.5 text-right font-bold text-slate-600">Monto</th>
                <th className="px-3 py-2.5 text-right font-bold text-slate-600">Cobrado</th>
                <th className="px-3 py-2.5 text-right font-bold text-slate-600">Por Cobrar</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Usuario</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Sucursal</th>
                <th className="px-3 py-2.5 text-center font-bold text-slate-600">Estado</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Fecha</th>
                <th className="px-3 py-2.5 text-center w-20 font-bold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-8 text-slate-400">
                  <i className="fas fa-spinner fa-spin text-lg"></i> Cargando...
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-slate-400">
                  <i className="fas fa-inbox text-2xl mb-2 block"></i> No hay cobros registrados
                </td></tr>
              ) : data.map(row => (
                <tr key={row.id_cobros} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selectedRows.includes(row.id_cobros)}
                      onChange={e => {
                        if (e.target.checked) setSelectedRows(p => [...p, row.id_cobros]);
                        else setSelectedRows(p => p.filter(id => id !== row.id_cobros));
                      }} />
                  </td>
                  <td className="px-3 py-2 font-medium">{row.id_cobros}</td>
                  <td className="px-3 py-2">{row.nombre_tipo_cobros}</td>
                  <td className="px-3 py-2 font-bold">{row.disco_buses}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.monto_cobros)}</td>
                  <td className="px-3 py-2 text-right text-emerald-600 font-medium">{formatCurrency(row.total_pagado)}</td>
                  <td className="px-3 py-2 text-right text-amber-600 font-bold">{formatCurrency(row.saldo_pendiente)}</td>
                  <td className="px-3 py-2">{row.nombre_usuario}</td>
                  <td className="px-3 py-2">{row.nombre_sucursal}</td>
                  <td className="px-3 py-2 text-center">
                    {row.estado_cobros == 1
                      ? <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Pagado</span>
                      : row.estado_cobros == 3
                        ? <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">Anulado</span>
                        : <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">No Pagado</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-slate-500">{row.fecha_cobros?.split(' ')[0] || row.fecha_cobros}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => handlePdfRetencion(row)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="PDF Retención">
                        <i className="fas fa-file-pdf text-sm"></i>
                      </button>
                      <button onClick={() => handleImprimir(row)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Imprimir">
                        <i className="fas fa-print text-sm"></i>
                      </button>
                      <button onClick={() => handleCobrar(row)} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded" title="Cobrar">
                        <i className="fas fa-hand-holding-usd text-sm"></i>
                      </button>
                      <button onClick={() => handleVerCobrosRealizados(row)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded" title="Cobros Realizados">
                        <i className="fas fa-receipt text-sm"></i>
                      </button>
                      <button onClick={() => handleEntregar(row)} className="p-1 text-amber-500 hover:bg-amber-50 rounded" title="Entregar">
                        <i className="fas fa-money-bill-wave text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Mostrar:</span>
            <select className="border border-slate-300 rounded px-2 py-1 text-xs" value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>| Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} de {total} registros</span>
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-30">Anterior</button>
            <span className="px-3 py-1 text-xs font-bold text-slate-600">Pág. {page} de {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-30">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TAB: COBRO RÁPIDO ─────────────────────────────────────
const CobroRapido = () => {
  const [cedula, setCedula] = useState('');
  const [numeroBus, setNumeroBus] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const buscar = async () => {
    if (!cedula && !numeroBus) {
      Swal.fire('Aviso', 'Ingrese al menos la cédula o el número de bus', 'warning');
      return;
    }
    setLoading(true);
    setResultados(null);
    try {
      const res = await api.post('/cobro/buscarInfo', { cedula, numero_bus: numeroBus });
      if (res.data?.success) {
        const pendientes = (res.data.data || []).filter(r => r.estado_cobros != 1);
        setResultados({ ...res.data, data: pendientes });
        if (pendientes.length === 0) Swal.fire('Info', 'No se encontraron cobros pendientes', 'info');
      } else {
        Swal.fire('Error', res.data?.message || 'Error al buscar', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const procesarCobro = async () => {
    if (!resultados || !resultados.data?.length) {
      Swal.fire('Aviso', 'No hay cobros pendientes para procesar', 'warning');
      return;
    }
    const { isConfirmed } = await Swal.fire({
      title: '¿Procesar cobro?',
      html: `
        <div style="text-align:left">
          <p><b>Cliente:</b> ${resultados.data[0]?.per_nombres_persona || ''} ${resultados.data[0]?.per_apellidos_personal || ''}</p>
          <p><b>Bus:</b> ${resultados.data[0]?.disco_buses || ''}</p>
          <p><b>Total pendiente:</b> ${formatCurrency(resultados.info_clave?.total_pendiente || 0)}</p>
          <p><b>Cantidad de cobros:</b> ${resultados.data.length}</p>
        </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, procesar',
    });
    if (!isConfirmed) return;

    setProcesando(true);
    const ids = resultados.data.map(r => r.id_cobros);
    try {
      const res = await api.post('/cobro/procesarCobroDetallado', {
        cedula,
        numero_bus: numeroBus,
        ids: JSON.stringify(ids),
        monto: resultados.info_clave?.total_pendiente || 0,
        idformapago: 1,
        fecha_comprobante: new Date().toISOString().split('T')[0],
        concepto: 'Cobro rápido',
        id_bus: resultados.data[0]?.id_fkbus_cobros
      });
      if (res.data?.success) {
        Swal.fire('Éxito', `Cobro procesado correctamente. ${res.data.mensaje || ''}`, 'success');
        setResultados(null);
        setCedula('');
        setNumeroBus('');
      } else {
        Swal.fire('Error', res.data?.error || 'Error al procesar', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
          <i className="fas fa-search text-blue-600"></i> Buscar Información
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cédula</label>
            <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
              placeholder="Ingrese cédula" value={cedula} onChange={e => setCedula(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Número de Bus</label>
            <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Ingrese número de bus" value={numeroBus} onChange={e => setNumeroBus(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={buscar} disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Buscando...</> : <><i className="fas fa-search"></i> Buscar</>}
          </button>
          <button onClick={procesarCobro} disabled={!resultados || procesando || !resultados.data?.length}
            className="px-5 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
            {procesando ? <><i className="fas fa-spinner fa-spin"></i> Procesando...</> : <><i className="fas fa-hand-holding-usd"></i> Procesar Cobro</>}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {resultados && resultados.data?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-800">
              <i className="fas fa-info-circle mr-1"></i> 
              {resultados.data[0]?.per_nombres_persona || ''} {resultados.data[0]?.per_apellidos_personal || ''} 
              {resultados.data[0]?.disco_buses ? ` - Bus: ${resultados.data[0].disco_buses}` : ''}
            </span>
            <span className="text-xs font-bold text-emerald-800">
              Total: {formatCurrency(resultados.info_clave?.total_pendiente || 0)} ({resultados.data.length} cobros)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-slate-600">ID</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-600">Tipo</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-600">Monto</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-600">Pagado</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-600">Saldo</th>
                  <th className="px-3 py-2 text-center font-bold text-slate-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {resultados.data.map(r => (
                  <tr key={r.id_cobros} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">{r.id_cobros}</td>
                    <td className="px-3 py-2">{r.nombre_tipo_cobros}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.monto_cobros)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(r.total_pagado)}</td>
                    <td className="px-3 py-2 text-right text-amber-600 font-bold">{formatCurrency(r.saldo_pendiente)}</td>
                    <td className="px-3 py-2 text-center">
                      {r.estado_cobros == 1
                        ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Pagado</span>
                        : <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">No Pagado</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TAB: COMPROBANTES DE PAGO ─────────────────────────────
const ComprobantesPago = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    numero_comprobante: '', bus_busqueda: '', estado: '', forma_pago: '',
    fecha_desde: '', fecha_hasta: ''
  });
  const [buses, setBuses] = useState([]);
  const [formasPago, setFormasPago] = useState([]);

  const loadData = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/cobro/listadoComprobanteCobros', { params });
      if (res.data?.success) {
        setData(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    api.get('/buses/seleccionarBuses', { params: { limit: 200 } }).then(r => {
      if (r.data?.success) setBuses(r.data.data || []);
    }).catch(() => {});
    api.get('/formapago/formapagoSeleccionPaginado', { params: { limit: 50 } }).then(r => {
      if (r.data?.success) setFormasPago(r.data.data || []);
    }).catch(() => {});
  }, []);

  const verDetalle = (grupo) => {
    const comprobantes = grupo.comprobantes || [];
    if (!comprobantes.length) {
      Swal.fire('Info', 'No hay comprobantes para mostrar', 'info');
      return;
    }
    const filas = comprobantes.map(c => `
      <tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${c.id_comprobante_cobro_retenciones}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${c.fecha_emision_comprobante_cobro?.split(' ')[0] || '-'}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(c.monto_comprobante_cobro)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${c.disco_buses || '-'}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${c.nombre_forma_pago || '-'}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${c.concepto_detalle_comprobante_cobro || '-'}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">
          <span class="${c.estado_comprobante_cobro === 'COBRADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} px-2 py-0.5 rounded text-[10px] font-bold">${c.estado_comprobante_cobro}</span>
        </td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${c.nombre_usuario || ''} ${c.apellido_usuario || ''}</td>
      </tr>
    `).join('');

    const { isConfirmed } = Swal.fire({
      title: `Comprobantes N° ${grupo.numero_comprobante_cobro}`,
      html: `
        <div style="max-height:400px;overflow-y:auto">
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr style="background:#f8fafc">
              <th style="padding:6px 8px;text-align:left">ID</th>
              <th style="padding:6px 8px;text-align:left">Fecha</th>
              <th style="padding:6px 8px;text-align:right">Monto</th>
              <th style="padding:6px 8px;text-align:left">Bus</th>
              <th style="padding:6px 8px;text-align:left">Forma Pago</th>
              <th style="padding:6px 8px;text-align:left">Concepto</th>
              <th style="padding:6px 8px;text-align:left">Estado</th>
              <th style="padding:6px 8px;text-align:left">Usuario</th>
            </tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>`,
      width: 900,
      showCancelButton: true,
      confirmButtonText: 'Imprimir',
      cancelButtonText: 'Cerrar'
    });
    if (isConfirmed) {
      window.open(`/php/cobros/imprimirComprobanteCobro.php?numero_comprobante=${grupo.numero_comprobante_cobro}`, '_blank');
    }
  };

  const anularComprobante = async (id) => {
    const { value: motivo } = await Swal.fire({
      title: 'Anular Comprobante',
      input: 'textarea',
      inputLabel: 'Motivo de anulación',
      inputPlaceholder: 'Ingrese el motivo...',
      showCancelButton: true,
      confirmButtonText: 'Anular',
      confirmButtonColor: '#ef4444',
      inputValidator: v => !v ? 'El motivo es requerido' : null
    });
    if (!motivo) return;
    try {
      const res = await api.post('/cobro/anularComprobanteCobro', {
        id_comprobante_cobro: id,
        motivoAnulacion: motivo
      });
      if (res.data?.success) {
        Swal.fire('Éxito', 'Comprobante anulado correctamente', 'success');
        loadData();
      } else {
        Swal.fire('Error', res.data?.message || 'Error al anular', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
          <i className="fas fa-filter"></i> Filtros de Comprobantes
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">N° Comprobante</label>
            <input type="text" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5"
              value={filtros.numero_comprobante} onChange={e => setFiltros(f => ({ ...f, numero_comprobante: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Bus</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filtros.bus_busqueda}
              onChange={e => setFiltros(f => ({ ...f, bus_busqueda: e.target.value }))}>
              <option value="">Todos</option>
              {buses.map(b => <option key={b.id_buses} value={b.id_buses}>{b.disco_buses}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Estado</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filtros.estado}
              onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}>
              <option value="">Todos</option>
              <option value="COBRADA">Cobrada</option>
              <option value="ANULADA">Anulada</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Forma de Pago</label>
            <select className="w-full text-xs border border-slate-300 rounded px-2 py-1.5" value={filtros.forma_pago}
              onChange={e => setFiltros(f => ({ ...f, forma_pago: e.target.value }))}>
              <option value="">Todas</option>
              {formasPago.map(fp => <option key={fp.id_forma_pago} value={fp.id_forma_pago}>{fp.nombre_forma_pago}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha Desde</label>
            <input type="date" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5"
              value={filtros.fecha_desde} onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha Hasta</label>
            <input type="date" className="w-full text-xs border border-slate-300 rounded px-2 py-1.5"
              value={filtros.fecha_hasta} onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))} />
          </div>
          <div className="flex items-end gap-1">
            <button onClick={() => loadData(filtros)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 flex-1">
              <i className="fas fa-search mr-1"></i>
            </button>
            <button onClick={() => { setFiltros({ numero_comprobante: '', bus_busqueda: '', estado: '', forma_pago: '', fecha_desde: '', fecha_hasta: '' }); loadData(); }}
              className="px-3 py-1.5 bg-slate-400 text-white text-xs font-bold rounded hover:bg-slate-500">
              <i className="fas fa-eraser"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de comprobantes agrupados */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">N° Comprobante</th>
                <th className="px-3 py-2.5 text-center font-bold text-slate-600">Cant. Cobros</th>
                <th className="px-3 py-2.5 text-left font-bold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400">
                  <i className="fas fa-spinner fa-spin text-lg"></i> Cargando...
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400">
                  <i className="fas fa-receipt text-2xl mb-2 block"></i> No hay comprobantes registrados
                </td></tr>
              ) : data.map((grupo, i) => {
                const primerComp = grupo.comprobantes?.[0];
                return (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium">{grupo.numero_comprobante_cobro}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{grupo.cantidad}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => verDetalle(grupo)}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1">
                          <i className="fas fa-eye"></i> Ver Detalles
                        </button>
                        <button onClick={() => window.open(`/php/cobros/imprimirComprobanteCobro.php?numero_comprobante=${grupo.numero_comprobante_cobro}`, '_blank')}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1">
                          <i className="fas fa-print"></i> Imprimir
                        </button>
                        {primerComp?.estado_comprobante_cobro === 'COBRADA' && (
                          <button onClick={() => anularComprobante(primerComp.id_comprobante_cobro_retenciones)}
                            className="px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded hover:bg-red-100 border border-red-200 flex items-center gap-1">
                            <i className="fas fa-ban"></i> Anular
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN: LISTADO DE COBROS ────────────────────────────────
export const CobrosPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 'listado', label: 'Listado de Cobros', icon: 'fas fa-list', component: ListadoCobros },
    { id: 'rapido', label: 'Cobro Rápido', icon: 'fas fa-money-bill-wave', component: CobroRapido },
    { id: 'comprobantes', label: 'Comprobantes de Pago', icon: 'fas fa-file-invoice-dollar', component: ComprobantesPago },
  ];

  const ActiveComponent = tabs[activeTab].component;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
        <i className="fas fa-dollar-sign text-emerald-600"></i>
        Listado de Cobros
      </h1>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-0">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(i)}
            className={`px-5 py-3 text-sm font-bold transition-all relative ${
              activeTab === i
                ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <i className={`${tab.icon} mr-2`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido del tab activo */}
      <div className="min-h-[400px]">
        <ActiveComponent />
      </div>
    </div>
  );
};
