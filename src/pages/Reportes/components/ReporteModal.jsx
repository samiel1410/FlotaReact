import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../config/axios';
import { CONFIG } from '../../../config/env';
import { reportesService } from '../../../services/reportes.service';
import { GuiaService } from '../../../services/guia.service';
import { AsientosService } from '../../../services/asientos.service';
import toast from 'react-hot-toast';

const MESES = [
  { id: '0', nombre: 'TODOS' },
  { id: '01', nombre: 'Enero' },
  { id: '02', nombre: 'Febrero' },
  { id: '03', nombre: 'Marzo' },
  { id: '04', nombre: 'Abril' },
  { id: '05', nombre: 'Mayo' },
  { id: '06', nombre: 'Junio' },
  { id: '07', nombre: 'Julio' },
  { id: '08', nombre: 'Agosto' },
  { id: '09', nombre: 'Septiembre' },
  { id: '10', nombre: 'Octubre' },
  { id: '11', nombre: 'Noviembre' },
  { id: '12', nombre: 'Diciembre' },
];

const ANIOS = [
  { id: '0', nombre: 'TODOS' },
  { id: '2019', nombre: '2019' },
  { id: '2020', nombre: '2020' },
  { id: '2021', nombre: '2021' },
  { id: '2022', nombre: '2022' },
  { id: '2023', nombre: '2023' },
  { id: '2024', nombre: '2024' },
  { id: '2025', nombre: '2025' },
  { id: '2026', nombre: '2026' },
];

const COBRADA_OPTS = [
  { id: '0', nombre: 'TODOS' },
  { id: 'COBRADA', nombre: 'COBRADA' },
  { id: 'NO COBRADA', nombre: 'NO COBRADAS' },
];

const inputClass = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none transition-all';
const labelClass = 'block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider';

// Animation style inline (no depende de CSS externo)
const fadeInStyle = {
  animation: 'modalFadeIn 0.25s ease-out forwards',
};
const fadeInKeyframes = `
  @keyframes modalFadeIn {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

// ─── HOOK PARA CARGAR COMBOS ──────────────────────────────────────────────
function useCombos() {
  const [combos, setCombos] = useState({
    sucursales: [],
    usuarios: [],
    companias: [],
    formasPago: [],
    buses: [],
    personal: [],
    destinos: [],
    loading: false,
  });

  const cargarCombos = useCallback(async (tipos = []) => {
    setCombos(prev => ({ ...prev, loading: true }));
    const results = {};

    try {
      if (tipos.length === 0 || tipos.includes('sucursales')) {
        const r = await GuiaService.getSucursalesCombo();
        results.sucursales = r?.data || r || [];
      }
    } catch (e) { results.sucursales = []; }

    try {
      if (tipos.length === 0 || tipos.includes('usuarios')) {
        const r = await api.get('/usuario/usuarioSeleccionarCombo');
        results.usuarios = r?.data?.data || r?.data || [];
      }
    } catch (e) { results.usuarios = []; }

    try {
      if (tipos.length === 0 || tipos.includes('companias')) {
        const r = await GuiaService.getCompaniasCombo();
        results.companias = r?.data || r || [];
      }
    } catch (e) { results.companias = []; }

    try {
      if (tipos.length === 0 || tipos.includes('formasPago')) {
        const r = await GuiaService.getFormasPagoCombo();
        results.formasPago = r?.data || r || [];
      }
    } catch (e) { results.formasPago = []; }

    try {
      if (tipos.length === 0 || tipos.includes('buses')) {
        const r = await AsientosService.getBusesParaFiltro();
        results.buses = r?.data || r || [];
      }
    } catch (e) { results.buses = []; }

    try {
      if (tipos.length === 0 || tipos.includes('personal')) {
        const r = await AsientosService.getPersonalParaFiltro();
        results.personal = r?.data || r || [];
      }
    } catch (e) { results.personal = []; }

    try {
      if (tipos.length === 0 || tipos.includes('destinos')) {
        const r = await GuiaService.getDestinosCombo();
        results.destinos = r?.data || r || [];
      }
    } catch (e) { results.destinos = []; }

    results.loading = false;
    setCombos(prev => ({ ...prev, ...results }));
  }, []);

  return { combos, cargarCombos };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
/** Obtiene el nombre mostrado de un select usando el valueKey correcto */
function getRawValueGeneral(val, options, valueKey = 'id') {
  if (!val) return '';
  const found = options.find(o => String(o[valueKey] ?? o.id ?? o.value) === String(val));
  return found?.nombre || found?.label || found?.name || '';
}

/** Construye la URL base para descargas Excel */
function getBaseUrl() {
  return CONFIG.API_URL || api.defaults.baseURL || '';
}

// ─── COMPONENTE SELECT REUTILIZABLE ──────────────────────────────────────
const SelectField = ({ label, value, onChange, options = [], placeholder = 'Seleccionar', valueKey = 'id', displayKey = 'nombre' }) => (
  <div>
    <label className={labelClass}>{label}</label>
    <select value={value} onChange={onChange} className={inputClass}>
      <option value="">{placeholder}</option>
      {options.map((opt, idx) => (
        <option key={opt[valueKey] ?? opt.id ?? idx} value={opt[valueKey] ?? opt.id ?? ''}>
          {opt[displayKey] ?? opt.nombre ?? opt.label ?? opt}
        </option>
      ))}
    </select>
  </div>
);

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────
const ReporteModal = ({ reporte, onClose }) => {
  const { combos, cargarCombos } = useCombos();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  // Filtros comunes
  const [filters, setFilters] = useState({
    sucursal: '',
    usuario: '',
    compania: '',
    forma_pago: '',
    bus: '',
    busero: '',
    cobrada: '0',
    mes: '0',
    anio: '0',
    desde: '',
    hasta: '',
  });

  // Cargar combos según el tipo de reporte
  useEffect(() => {
    const tipo = reporte?.tipo;
    const needed = [];
    if (['guias', 'guias_pdf', 'facturas', 'comprobantes', 'boletos_oficina','guias_entregadas','egresos_ingresos'].includes(tipo)) needed.push('sucursales', 'usuarios');
    if (tipo === 'guias_asociados') needed.push('companias');
    if (tipo === 'comprobantes') needed.push('formasPago');
    if (tipo === 'guias_despacho') needed.push('buses', 'personal');
    cargarCombos(needed);
  }, [reporte?.tipo]);

  // ─── GENERAR REPORTE (vía cola de segundo plano) ───────────────────
  const handleGenerar = async () => {
    setLoading(true);
    const toastId = `reporte-${reporte.id}-${Date.now()}`;
    toast.loading('Encolando reporte en segundo plano...', { id: toastId });

    try {
      // Mapa de tipo → nombre del processor en la cola
      const TIPO_COLA = {
        'guias': 'reporteguias',
        'guias_asociados': 'guias_asociados',
        'facturas': 'reportesfacturas',
        'guias_pdf': 'guias_pdf',
        'comprobantes': 'comprobantes_pdf',
        'guias_despacho': 'despacho_pdf',
        'boletos_oficina': 'reporteguias',
        'guias_entregadas': 'guias_entregadas',
        'egresos_ingresos': 'egresos_ingresos',
      };
      const tipoCola = TIPO_COLA[reporte.tipo];

      if (!tipoCola) {
        toast.error(`Tipo no soportado: ${reporte.tipo}`, { id: toastId });
        setLoading(false);
        return;
      }

      // Parámetros comunes
      const params = {
        idsucursal: filters.sucursal || '0',
        idusuario: filters.usuario || '0',
        idcompania: filters.compania || '0',
        id_forma_pago: filters.forma_pago || '0',
        id_bus: filters.bus || '0',
        id_oficinista: filters.busero || '0',
        cobrada: filters.cobrada,
        mes: filters.mes,
        anio: filters.anio,
        fechaini: filters.desde || undefined,
        fechalast: filters.hasta || undefined,
        nombre_sucursal: getRawValueGeneral(filters.sucursal, combos.sucursales, 'suc_codigo_sucursal'),
        nombre_usuario: getRawValueGeneral(filters.usuario, combos.usuarios, 'id_usuario'),
        nombre_mes: getRawValueGeneral(filters.mes, MESES),
        nombre_compania: getRawValueGeneral(filters.compania, combos.companias, 'id_compania_asociada'),
      };

      // Encolar con polling de progreso
      const result = await reportesService.enqueueAndWait(
        tipoCola,
        params,
        (percent, message) => {
          toast.loading(`${message || 'Generando...'} ${percent}%`, { id: toastId });
        },
        1500,     // Poll cada 1.5s
        300000    // Timeout 5 min para rangos grandes
      );

      // ✅ Reporte generado — ahora abrir/descargar
      if (result?.html) {
        // Reporte PDF/HTML → mostrar previsualización
        setPreview({ html: result.html, title: reporte.title });
        toast.success(`Reporte generado: ${result.total || 0} registros`, { id: toastId });
      } else if (result?.data && (reporte.tipo === 'guias' || reporte.tipo === 'guias_asociados' || reporte.tipo === 'boletos_oficina')) {
        // Reporte Excel → descargar via api.get() con token JWT (no navegación directa)
        const p = new URLSearchParams();
        const appendRaw = (key, field, opts, vk = 'id') => {
          const v = filters[field];
          const raw = getRawValueGeneral(v, opts, vk);
          if (raw) p.append(key, raw);
        };

        let endpoint;
        if (reporte.tipo === 'guias' || reporte.tipo === 'boletos_oficina') {
          endpoint = reporte.tipo === 'boletos_oficina' ? '/reportes/reporteboletosoficina' : '/reportes/reporteguias';
          p.append('idsucursal', filters.sucursal || '0');
          p.append('idusuario', filters.usuario || '0');
          p.append('mes', filters.mes);
          p.append('anio', filters.anio);
          p.append('cobrada', filters.cobrada);
          appendRaw('nombre_sucursal', 'sucursal', combos.sucursales, 'suc_codigo_sucursal');
          appendRaw('nombre_usuario', 'usuario', combos.usuarios, 'id_usuario');
          appendRaw('nombre_mes', 'mes', MESES);
          if (filters.desde) p.append('fechaini', filters.desde);
          if (filters.hasta) p.append('fechalast', filters.hasta);
        } else {
          endpoint = '/reportes/reporteguiasCompania';
          p.append('idcompania', filters.compania || '0');
          p.append('mes', filters.mes);
          p.append('anio', filters.anio);
          appendRaw('nombre_compania', 'compania', combos.companias, 'id_compania_asociada');
          appendRaw('nombre_mes', 'mes', MESES);
          if (filters.desde) p.append('fechaini', filters.desde);
          if (filters.hasta) p.append('fechalast', filters.hasta);
        }

        // Descargar via api.get() (envía token JWT en los headers)
        toast.loading('Descargando reporte...', { id: toastId });
        try {
          const response = await api.get(`${endpoint}?${p.toString()}`, {
            responseType: 'blob'
          });
          // Crear blob URL y disparar descarga
          const blob = new Blob([response.data], {
            type: response.headers['content-type'] || 'application/vnd.ms-excel'
          });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = reporte.tipo === 'guias' ? 'reporte_guias.xls' : reporte.tipo === 'boletos_oficina' ? 'reporte_boletos_oficina.xls' : 'reporte_guias_asociados.xls';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          toast.success('Reporte descargado correctamente', { id: toastId });
        } catch (dlErr) {
          console.error('Error descargando Excel:', dlErr);
          toast.error(`Error al descargar: ${dlErr.message}`, { id: toastId });
        }
      } else {
        toast.success('Reporte generado correctamente', { id: toastId });
      }
    } catch (error) {
      console.error('Error generando reporte:', error);
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // ─── LIMPIAR FILTROS ──────────────────────────────────────────────────
  const handleReset = () => {
    setFilters({
      sucursal: '', usuario: '', compania: '', forma_pago: '',
      bus: '', busero: '', cobrada: '0', mes: '0', anio: '0',
      desde: '', hasta: '',
    });
  };

  // ─── CERRAR PREVIEW ──────────────────────────────────────────────────
  if (preview) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={fadeInStyle}>
        <style>{fadeInKeyframes}</style>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-lg">
                <i className={reporte.icon}></i>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">{preview.title}</h2>
                <p className="text-xs text-slate-500 font-medium">Previsualización del reporte</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const win = window.open('', '_blank');
                  win.document.write(preview.html);
                  win.document.close();
                }}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-external-link-alt"></i>
                Abrir en nueva ventana
              </button>
              <button
                onClick={() => setPreview(null)}
                className="h-10 w-10 bg-white border border-slate-300 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6 bg-white">
            <iframe
              srcDoc={preview.html}
              className="w-full h-full border-0 rounded-lg"
              title="Vista previa del reporte"
              style={{ minHeight: '500px' }}
            />
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => setPreview(null)}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={fadeInStyle}>
      <style>{fadeInKeyframes}</style>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 ${reporte.bg} ${reporte.color} rounded-xl flex items-center justify-center text-lg shadow-sm`}>
              <i className={reporte.icon}></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{reporte.title}</h2>
              <p className="text-xs text-slate-500 font-medium">Filtros del reporte</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 bg-white border border-slate-300 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Guías (Excel y PDF), Facturas, Comprobantes, Boletos Oficina, Guías Entregadas, Egresos/Ingresos: Sucursal + Usuario */}
          {['guias', 'guias_pdf', 'facturas', 'comprobantes', 'boletos_oficina', 'guias_entregadas', 'egresos_ingresos'].includes(reporte.tipo) && (
            <>
              <SelectField label="Sucursal" value={filters.sucursal}
                onChange={e => setFilters(f => ({ ...f, sucursal: e.target.value }))}
                options={combos.sucursales} valueKey="suc_codigo_sucursal" displayKey="nombre_sucursal" />
              <SelectField label="Usuario" value={filters.usuario}
                onChange={e => setFilters(f => ({ ...f, usuario: e.target.value }))}
                options={combos.usuarios} valueKey="id_usuario" displayKey="nombre_usuario" />
            </>
          )}

          {/* Guías Asociados: Compañía */}
          {reporte.tipo === 'guias_asociados' && (
            <SelectField label="Compañía" value={filters.compania}
              onChange={e => setFilters(f => ({ ...f, compania: e.target.value }))}
              options={combos.companias} valueKey="id_compania_asociada" displayKey="nombre_compania_asociada" />
          )}

          {/* Guías Despacho: Bus + Busero */}
          {reporte.tipo === 'guias_despacho' && (
            <>
              <SelectField label="Bus" value={filters.bus}
                onChange={e => setFilters(f => ({ ...f, bus: e.target.value, busero: '' }))}
                options={combos.buses} valueKey="codigo_buses" displayKey="codigo_buses" />
              <SelectField label="Busero" value={filters.busero}
                onChange={e => setFilters(f => ({ ...f, busero: e.target.value }))}
                options={combos.personal} valueKey="per_codigo_personal" displayKey="per_nombres_persona" />
            </>
          )}

          {/* Comprobantes: Forma de Pago */}
          {reporte.tipo === 'comprobantes' && (
            <SelectField label="Forma de Pago" value={filters.forma_pago}
              onChange={e => setFilters(f => ({ ...f, forma_pago: e.target.value }))}
              options={combos.formasPago} valueKey="id_forma_pago" displayKey="nombre_forma_pago" />
          )}

          {/* Guías y Guías PDF: Cobrada */}
          {['guias', 'guias_pdf'].includes(reporte.tipo) && (
            <SelectField label="Cobrada" value={filters.cobrada}
              onChange={e => setFilters(f => ({ ...f, cobrada: e.target.value }))}
              options={COBRADA_OPTS} />
          )}

          {/* Mes / Año (seleccionar limpia fechas) */}
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Mes" value={filters.mes}
              onChange={e => { setFilters(f => ({ ...f, mes: e.target.value, desde: '', hasta: '' })); }}
              options={MESES} />
            <SelectField label="Año" value={filters.anio}
              onChange={e => { setFilters(f => ({ ...f, anio: e.target.value, desde: '', hasta: '' })); }}
              options={ANIOS} />
          </div>

          {/* Desde / Hasta (seleccionar limpia mes/año) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Desde</label>
              <input type="date" value={filters.desde}
                onChange={e => setFilters(f => ({ ...f, desde: e.target.value, mes: '0', anio: '0' }))}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Hasta</label>
              <input type="date" value={filters.hasta}
                onChange={e => setFilters(f => ({ ...f, hasta: e.target.value, mes: '0', anio: '0' }))}
                min={filters.desde || undefined}
                className={inputClass} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button onClick={handleReset}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2">
            <i className="fas fa-undo"></i>
            Limpiar
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
              Cancelar
            </button>
            <button onClick={handleGenerar} disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Generando...</>
              ) : (
                <><i className="fas fa-file-export"></i> Generar reporte</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReporteModal;
