import React, { useState, useEffect } from 'react';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';

export const TipoCobroForm = ({
  initialData,
  endpoint = '/tipo_cobros/tipoCobrosInsertar',
  idField = 'id_tipo_cobros',
  onSubmit,
  onCancel,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [sucursalesList, setSucursalesList] = useState([]);
  const [loadingSucursales, setLoadingSucursales] = useState(false);
  const [busquedaSucursal, setBusquedaSucursal] = useState('');

  // Form states
  const [nombre, setNombre] = useState(initialData?.nombre_tipo_cobros || '');
  const [valor, setValor] = useState(initialData?.valor_tipo_cobros ?? '0');
  const [prioridad, setPrioridad] = useState(String(initialData?.prioridad_cobros_tipo ?? '3'));
  const [automatico, setAutomatico] = useState(String(initialData?.tipo_cobros_automaticos ?? '0'));
  const [cobrarUnaVez, setCobrarUnaVez] = useState(String(initialData?.cobrar_una_vez_dia ?? '0'));
  const [cobroTotal, setCobroTotal] = useState(String(initialData?.cobro_total_despacho ?? '0'));
  const [estado, setEstado] = useState(String(initialData?.estado_tipo_cobros ?? '1'));
  
  // Asignación de sucursales
  const [aplicaTodas, setAplicaTodas] = useState(
    initialData ? Number(initialData.aplica_todas_sucursales ?? 1) === 1 : true
  );
  const [selectedSucursales, setSelectedSucursales] = useState(
    initialData?.sucursales ? initialData.sucursales.map(s => Number(s)) : []
  );

  useEffect(() => {
    cargarSucursales();
  }, []);

  const cargarSucursales = async () => {
    try {
      setLoadingSucursales(true);
      const res = await api.get('/sucursal/sucursalselect');
      if (res.data?.data && Array.isArray(res.data.data)) {
        setSucursalesList(res.data.data);
      }
    } catch (err) {
      console.error('Error cargando sucursales:', err);
    } finally {
      setLoadingSucursales(false);
    }
  };

  const toggleSucursal = (id) => {
    const numId = Number(id);
    if (selectedSucursales.includes(numId)) {
      setSelectedSucursales(selectedSucursales.filter(s => s !== numId));
    } else {
      setSelectedSucursales([...selectedSucursales, numId]);
    }
  };

  const selectAllSucursales = () => {
    setSelectedSucursales(sucursalesList.map(s => Number(s.id_sucursal)));
  };

  const deselectAllSucursales = () => {
    setSelectedSucursales([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!nombre.trim()) {
      toast.error('El nombre del tipo de cobro es obligatorio');
      return;
    }

    if (!aplicaTodas && selectedSucursales.length === 0) {
      toast.error('Debe seleccionar al menos una oficina o marcar "Todas las oficinas"');
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = initialData && initialData[idField];
      const payload = {
        nombre_tipo_cobros: nombre.trim(),
        valor_tipo_cobros: parseFloat(valor || 0),
        prioridad_cobros_tipo: parseInt(prioridad),
        tipo_cobros_automaticos: parseInt(automatico),
        cobrar_una_vez_dia: parseInt(cobrarUnaVez),
        cobro_total_despacho: parseInt(cobroTotal),
        estado_tipo_cobros: parseInt(estado),
        aplica_todas_sucursales: aplicaTodas ? 1 : 0,
        sucursales: aplicaTodas ? [] : selectedSucursales,
      };

      if (isEdit) {
        payload[idField] = initialData[idField];
      }

      const res = await api.post(endpoint, payload);

      if (res.data?.success) {
        toast.success(isEdit ? 'Tipo de cobro actualizado correctamente' : 'Tipo de cobro creado correctamente');
        onSubmit?.();
      } else {
        toast.error(res.data?.mensaje || res.data?.error || 'Error al guardar el tipo de cobro');
      }
    } catch (err) {
      console.error('Error saving tipo cobro:', err);
      toast.error(err.response?.data?.mensaje || err.message || 'Error al procesar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSucursales = sucursalesList.filter(s => 
    (s.nombre_sucursal || '').toLowerCase().includes(busquedaSucursal.toLowerCase()) ||
    (s.ciudad_sucursal || '').toLowerCase().includes(busquedaSucursal.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Datos Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
            Nombre del Cobro <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Dólar Unión Tungurahua, Cuota Adm..."
            required
            className="w-full h-9 px-3 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-bold text-slate-700 placeholder:text-slate-300 transition-all"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
            Valor por Defecto ($) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-[11px] font-bold text-slate-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
              className="w-full h-9 pl-7 pr-3 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-bold text-slate-700 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
            Orden de Cobro / Prioridad <span className="text-rose-500">*</span>
          </label>
          <select
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
            className="w-full h-9 px-3 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-bold text-slate-700 transition-all"
          >
            <option value="1">Orden 1 — Primero en cobrarse (Máxima prioridad / Multas)</option>
            <option value="2">Orden 2 — Segundo en cobrarse</option>
            <option value="3">Orden 3 — Tercero en cobrarse</option>
            <option value="4">Orden 4 — Cuarto en cobrarse</option>
            <option value="5">Orden 5 — Quinto en cobrarse</option>
            <option value="6">Orden 6 — Sexto en cobrarse</option>
            <option value="7">Orden 7 — Séptimo en cobrarse</option>
            <option value="8">Orden 8 — Octavo en cobrarse</option>
            <option value="9">Orden 9 — Noveno en cobrarse</option>
            <option value="10">Orden 10 — Al final (Menor prioridad)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
            Automático en Despacho
          </label>
          <select
            value={automatico}
            onChange={(e) => setAutomatico(e.target.value)}
            className="w-full h-9 px-3 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-bold text-slate-700 transition-all"
          >
            <option value="1">Sí — Se genera automáticamente en cada despacho</option>
            <option value="0">No — Solo se cobra si fue asignado manualmente</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
            Frecuencia
          </label>
          <select
            value={cobrarUnaVez}
            onChange={(e) => setCobrarUnaVez(e.target.value)}
            className="w-full h-9 px-3 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-bold text-slate-700 transition-all"
          >
            <option value="0">Cobrar en cada viaje / despacho</option>
            <option value="1">Solo 1 vez al día por bus (aunque haga varios viajes)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
            Tope de Retención
          </label>
          <select
            value={cobroTotal}
            onChange={(e) => setCobroTotal(e.target.value)}
            className="w-full h-9 px-3 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-bold text-slate-700 transition-all"
          >
            <option value="0">Limitado al % de retención de la agencia</option>
            <option value="1">Deduce hasta el 100% de la recaudación de boletos</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
            Estado
          </label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full h-9 px-3 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-bold text-slate-700 transition-all"
          >
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
          </select>
        </div>
      </div>

      {/* ── SECCIÓN DE SUCURSALES / OFICINAS ─────────────────────────────────── */}
      <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">
              <i className="fas fa-building"></i>
            </div>
            <div>
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                Oficinas / Sucursales que cobran este rubro
              </h3>
              <p className="text-[9px] text-slate-500 font-medium">
                Defina si este cobro aplica a nivel global o sólo en oficinas específicas
              </p>
            </div>
          </div>

          <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => setAplicaTodas(true)}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                aplicaTodas
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fas fa-globe mr-1"></i> Todas las oficinas
            </button>
            <button
              type="button"
              onClick={() => setAplicaTodas(false)}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                !aplicaTodas
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fas fa-filter mr-1"></i> Oficinas específicas
            </button>
          </div>
        </div>

        {!aplicaTodas && (
          <div className="pt-2 border-t border-slate-200/80 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <i className="fas fa-search absolute left-2.5 top-2.5 text-slate-400 text-[10px]"></i>
                <input
                  type="text"
                  value={busquedaSucursal}
                  onChange={(e) => setBusquedaSucursal(e.target.value)}
                  placeholder="Buscar oficina por nombre o ciudad..."
                  className="w-full h-8 pl-7 pr-3 text-[10px] border border-slate-200 rounded-lg bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={selectAllSucursales}
                  className="h-8 px-2.5 text-[9px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                >
                  Marcar todas
                </button>
                <button
                  type="button"
                  onClick={deselectAllSucursales}
                  className="h-8 px-2.5 text-[9px] font-bold bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                >
                  Limpiar
                </button>
                <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-200">
                  {selectedSucursales.length} seleccionada(s)
                </span>
              </div>
            </div>

            {loadingSucursales ? (
              <div className="p-4 text-center text-slate-400 text-[10px] font-bold">
                <i className="fas fa-spinner fa-spin mr-1"></i> Cargando oficinas...
              </div>
            ) : filteredSucursales.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-[10px] font-bold bg-white rounded-lg border border-slate-100">
                No se encontraron oficinas que coincidan con la búsqueda
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                {filteredSucursales.map((suc) => {
                  const isChecked = selectedSucursales.includes(Number(suc.id_sucursal));
                  return (
                    <div
                      key={suc.id_sucursal}
                      onClick={() => toggleSucursal(suc.id_sucursal)}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'border-indigo-400 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-400/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                        isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isChecked && <i className="fas fa-check text-[9px]"></i>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-bold leading-tight truncate ${isChecked ? 'text-indigo-900 font-black' : 'text-slate-800'}`}>
                          {suc.nombre_sucursal}
                        </p>
                        <p className="text-[8.5px] text-slate-400 font-medium truncate mt-0.5">
                          {suc.ciudad_sucursal || 'Sin ciudad'} {suc.punto_emision_sucursal ? `(P.E: ${suc.punto_emision_sucursal})` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-5 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
        >
          CANCELAR
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={`h-9 px-5 text-[10px] font-black text-white rounded-lg shadow-md transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2 ${
            submitting
              ? 'bg-indigo-400 cursor-not-allowed shadow-none'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
          }`}
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {initialData?.[idField] ? 'ACTUALIZANDO...' : 'GUARDANDO...'}
            </>
          ) : (
            initialData?.[idField] ? 'ACTUALIZAR TIPO DE COBRO' : 'GUARDAR TIPO DE COBRO'
          )}
        </button>
      </div>
    </form>
  );
};

export default TipoCobroForm;
