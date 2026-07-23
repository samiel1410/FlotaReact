import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../config/axios';

/**
 * Componente de Edición de Caja para usar en openCustomModal de GenericListPage.
 * Se renderiza sin wrapper overlay propio (lo gestiona GenericListPage Modal).
 */
export default function EditarCajaModal({ 
  caja, 
  onClose,
  onCancel,
  endpointApertura = '/caja/editarApertura',
  endpointCierre = '/caja/editarCierre',
  endpointDetalle = '/caja/detalleCaja',
  onSuccess 
}) {
  const handleClose = onClose || onCancel || (() => {});
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'movimiento'
  
  // Datos apertura/cierre
  const [aperturaTotal, setAperturaTotal] = useState('');
  const [cierreTotal, setCierreTotal] = useState('');
  const [sucursal, setSucursal] = useState('');
  const [usuario, setUsuario] = useState('');
  const [loading, setLoading] = useState(false);

  // Formulario nuevo movimiento (Ingreso / Egreso)
  const [tipoMov, setTipoMov] = useState('INGRESO');
  const [montoMov, setMontoMov] = useState('');
  const [socioMov, setSocioMov] = useState('');
  const [docMov, setDocMov] = useState('');
  const [obsMov, setObsMov] = useState('');

  useEffect(() => {
    if (caja) {
      setAperturaTotal(caja.apertura_total_caja ?? caja.monto_apertura ?? '');
      setCierreTotal(caja.cierre_total_caja ?? caja.monto_cierre ?? '');
      setSucursal(caja.nombre_sucursal || caja.sucursal || '');
      setUsuario(caja.usuario || '');
    }
  }, [caja]);

  if (!caja) return null;

  const idCaja = caja.id_caja || caja.id_caja_boleteria || caja.id_caja_retenciones;

  // Guardar cambios generales (Apertura / Cierre)
  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        id_caja: idCaja,
        apertura_total_caja: parseFloat(aperturaTotal) || 0,
        cierre_total_caja: parseFloat(cierreTotal) || 0,
        nombre_sucursal: sucursal,
        usuario: usuario
      };

      const res = await api.post(endpointApertura, payload);
      if (res.data?.success || res.data?.status === 'success') {
        toast.success('Información de caja actualizada');
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        toast.error(res.data?.message || res.data?.mensaje || 'Error al actualizar caja');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error de comunicación');
    } finally {
      setLoading(false);
    }
  };

  // Agregar nuevo movimiento (Ingreso / Egreso)
  const handleSaveMovimiento = async (e) => {
    e.preventDefault();
    if (!montoMov || parseFloat(montoMov) <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        id_fkcaja: idCaja,
        id_caja: idCaja,
        tipo_caja_detalle: tipoMov,
        monto_caja_detalle: parseFloat(montoMov),
        nombre_socio: socioMov,
        numero_documento: docMov,
        observacion_caja_detalle: obsMov
      };

      const res = await api.post(endpointDetalle, payload);
      if (res.data?.success || res.data?.status === 'success') {
        toast.success(`Movimiento (${tipoMov}) registrado con éxito`);
        setMontoMov('');
        setSocioMov('');
        setDocMov('');
        setObsMov('');
        if (onSuccess) onSuccess();
        setActiveTab('general');
      } else {
        toast.error(res.data?.message || res.data?.mensaje || 'Error al registrar movimiento');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar movimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'general'
              ? 'border-amber-500 text-amber-700 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <i className="fas fa-sliders-h mr-1.5"></i> Apertura / Cierre
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movimiento')}
          className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'movimiento'
              ? 'border-amber-500 text-amber-700 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <i className="fas fa-plus-circle mr-1.5"></i> Agregar Movimiento
        </button>
      </div>

      {/* Contenido Formulario General */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Monto Apertura ($)</label>
              <input
                type="number"
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                value={aperturaTotal}
                onChange={(e) => setAperturaTotal(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Monto Cierre ($)</label>
              <input
                type="number"
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                value={cierreTotal}
                onChange={(e) => setCierreTotal(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Sucursal</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              value={sucursal}
              onChange={(e) => setSucursal(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Usuario Asignado</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm flex items-center gap-1.5"
            >
              {loading && <i className="fas fa-spinner fa-spin"></i>}
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      )}

      {/* Contenido Formulario Nuevo Movimiento */}
      {activeTab === 'movimiento' && (
        <form onSubmit={handleSaveMovimiento} className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Movimiento</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              value={tipoMov}
              onChange={(e) => setTipoMov(e.target.value)}
            >
              <option value="INGRESO">INGRESO (+)</option>
              <option value="EGRESO">EGRESO (-)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Monto ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-right text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              value={montoMov}
              onChange={(e) => setMontoMov(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Socio / Persona</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              value={socioMov}
              onChange={(e) => setSocioMov(e.target.value)}
              placeholder="Nombre del socio o beneficiario"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">N° Documento / Referencia</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              value={docMov}
              onChange={(e) => setDocMov(e.target.value)}
              placeholder="N° Comprobante, Factura, Recibo..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Observación</label>
            <textarea
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              value={obsMov}
              onChange={(e) => setObsMov(e.target.value)}
              placeholder="Motivo o detalle de la transacción..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm flex items-center gap-1.5"
            >
              {loading && <i className="fas fa-spinner fa-spin"></i>}
              <span>Registrar Movimiento</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
