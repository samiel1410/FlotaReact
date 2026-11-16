import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/common/Modal';
import AperturaCajaCobrosModal from '../../../components/common/AperturaCajaCobrosModal';
import { dialog } from '../../../components/common/dialog/dialog';
import { api } from '../../../config/axios';
import { cajaCobrosService } from '../../../services/cajaCobros.service';
import { promesaPagoService } from '../../../services/promesaPago.service';
import { getFormasPago } from '../../../services/formapago.service';
import { buildPdfUrl } from '../../../utils/pdfUrlUtils';
import toast from 'react-hot-toast';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
const hoyISO = () => new Date().toISOString().slice(0, 10);
const formatoFecha = (f) => {
  if (!f) return '-';
  const solo = String(f).slice(0, 10);
  const [y, m, d] = solo.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Cobro de una cuota de promesa. Registra cheque/transferencia con banco y
 * referencia, y genera el comprobante en la caja de cobros abierta.
 */
export const PagoPromesaModal = ({ cuota, onClose, onSuccess }) => {
  const saldo = parseFloat(cuota?.saldo ?? cuota?.monto ?? 0);

  const [monto, setMonto] = useState(String(saldo || ''));
  const [formasPago, setFormasPago] = useState([]);
  const [idFormaPago, setIdFormaPago] = useState('');
  const [bancos, setBancos] = useState([]);
  const [idBanco, setIdBanco] = useState('');
  const [referencia, setReferencia] = useState('');
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [observacion, setObservacion] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [caja, setCaja] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);
  const [showApertura, setShowApertura] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const formaSeleccionada = useMemo(
    () => formasPago.find((f) => String(f.id_forma_pago) === String(idFormaPago)) || null,
    [formasPago, idFormaPago]
  );
  const exigeBanco = useMemo(() => {
    if (!formaSeleccionada) return false;
    return Number(formaSeleccionada.tipo_forma_pago) === 3
      || /CHEQUE|TRANSFER/i.test(String(formaSeleccionada.nombre_forma_pago || ''));
  }, [formaSeleccionada]);

  const cargarCaja = useCallback(async () => {
    try {
      const res = await cajaCobrosService.validarCaja();
      setCaja(res.success && res.data?.id_caja ? res.data : null);
    } catch {
      setCaja(null);
    } finally {
      setCargandoCaja(false);
    }
  }, []);

  useEffect(() => {
    cargarCaja();
    getFormasPago({ limit: 100 })
      .then((res) => {
        const lista = (res?.data || []).filter((f) => Number(f.estado_forma_pago_cuenta) === 1);
        setFormasPago(lista);
        const efectivo = lista.find((f) => Number(f.tipo_forma_pago) === 2) || lista[0];
        if (efectivo) setIdFormaPago(String(efectivo.id_forma_pago));
      })
      .catch(() => toast.error('No se pudieron cargar las formas de pago'));

    api.get('/banco/listadoBanco', { params: { limit: 200, page: 1 } })
      .then((res) => setBancos(res?.data?.data || []))
      .catch(() => toast.error('No se pudieron cargar los bancos'));
  }, [cargarCaja]);

  const handleArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setArchivo(null);
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('El archivo no puede superar 4 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setArchivo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valor = parseFloat(monto);
    if (!valor || valor <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }
    if (valor > saldo + 0.01) {
      toast.error(`El monto no puede superar el saldo de la cuota (${formatCurrency(saldo)})`);
      return;
    }
    if (!idFormaPago) {
      toast.error('Seleccione la forma de pago');
      return;
    }
    if (!caja?.id_caja) {
      toast.error('Abra una caja de cobros antes de registrar el pago');
      setShowApertura(true);
      return;
    }
    if (exigeBanco && !idBanco) {
      toast.error('Seleccione el banco del cheque/transferencia');
      return;
    }
    if (exigeBanco && !referencia.trim()) {
      toast.error('Ingrese el número de cheque o la referencia de la transferencia');
      return;
    }

    setGuardando(true);
    try {
      const res = await promesaPagoService.pagar({
        id_promesa_pago_cuota: cuota.id_promesa_pago_cuota,
        monto: valor,
        id_forma_pago: Number(idFormaPago),
        id_banco: idBanco ? Number(idBanco) : null,
        referencia: referencia.trim(),
        fecha_pago: fechaPago,
        observacion: observacion.trim(),
        archivo,
        id_caja: caja.id_caja,
      });

      if (!res.success) {
        toast.error(res.message || 'Error al registrar el pago');
        if (res.requiere_caja) {
          await cargarCaja();
          setShowApertura(true);
        }
        return;
      }

      const comp = res.data?.comprobante;
      const result = await dialog.fire({
        title: res.data?.cuota_completada ? 'Cuota pagada' : 'Abono registrado',
        html: `
          <div style="text-align:left;font-size:13px;line-height:1.7">
            <p>Se registró <b>${formatCurrency(res.data?.monto_pagado)}</b> en la caja <b>#${res.data?.id_caja}</b>.</p>
            <p>Comprobante <b>N° ${comp?.numero_comprobante || '-'}</b></p>
            <p>Forma de pago: <b>${comp?.forma_pago_nombre || '-'}</b></p>
            ${comp?.id_banco ? `<p>Banco: <b>${bancos.find((b) => String(b.id_banco) === String(comp.id_banco))?.nombre_banco || '-'}</b></p>` : ''}
            ${comp?.referencia ? `<p>Referencia: <b>${comp.referencia}</b></p>` : ''}
            ${res.data?.saldo_cuota > 0 ? `<p>Saldo de la cuota: <b>${formatCurrency(res.data.saldo_cuota)}</b></p>` : ''}
          </div>`,
        icon: 'success',
        showCancelButton: Boolean(comp?.numero_comprobante),
        confirmButtonText: comp?.numero_comprobante ? 'Imprimir comprobante' : 'Cerrar',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#059669',
      });

      if (result.isConfirmed && comp?.numero_comprobante) {
        window.open(
          buildPdfUrl(`/php/cobros/imprimirComprobanteCobro.php?numero_comprobante=${comp.numero_comprobante}`),
          '_blank'
        );
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Modal isOpen onClose={onClose} title="Cobrar promesa de pago" width="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Promesa</span>
              <span className="text-[11px] font-bold text-slate-600">
                Cuota {cuota?.numero_cuota || 1} de {cuota?.total_cuotas || 1}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-800">{cuota?.concepto || 'Cuota administrativa'}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span><i className="fas fa-bus mr-1 text-slate-400" />Bus {cuota?.disco_buses || '-'}</span>
              <span><i className="fas fa-user mr-1 text-slate-400" />{cuota?.socio_nombre || '-'}</span>
              <span><i className="fas fa-calendar mr-1 text-slate-400" />{formatoFecha(cuota?.fecha_promesa)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-xs text-slate-500">Saldo de la cuota</span>
              <span className="text-lg font-black font-mono text-rose-600">{formatCurrency(saldo)}</span>
            </div>
          </div>

          {!cargandoCaja && !caja?.id_caja && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <i className="fas fa-exclamation-triangle text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-800">
                No tiene una caja de cobros abierta.
                <button
                  type="button"
                  onClick={() => setShowApertura(true)}
                  className="ml-1 font-bold underline text-amber-900"
                >
                  Aperturar caja
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Monto a cobrar *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={saldo}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full text-sm font-bold text-slate-800 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Fecha de pago</label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Forma de pago *</label>
            <select
              value={idFormaPago}
              onChange={(e) => setIdFormaPago(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            >
              <option value="">Seleccione...</option>
              {formasPago.map((f) => (
                <option key={f.id_forma_pago} value={f.id_forma_pago}>{f.nombre_forma_pago}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Banco {exigeBanco ? '*' : '(opcional)'}
                </label>
                <select
                  value={idBanco}
                  onChange={(e) => setIdBanco(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Seleccione banco...</option>
                  {bancos.map((b) => (
                    <option key={b.id_banco} value={b.id_banco}>
                      {b.nombre_banco}{b.numero_cuenta ? ` · ${b.numero_cuenta}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  N° cheque / referencia {exigeBanco ? '*' : '(opcional)'}
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej. 0012345 / TRANSF-9988"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Observación</label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={2}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Detalle del pago (opcional)"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Foto del cheque / comprobante</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleArchivo}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !caja?.id_caja}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {guardando ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-hand-holding-usd" />}
              Registrar cobro
            </button>
          </div>
        </form>
      </Modal>

      <AperturaCajaCobrosModal
        isOpen={showApertura}
        onClose={() => setShowApertura(false)}
        onSuccess={() => {
          setShowApertura(false);
          cargarCaja();
        }}
      />
    </>
  );
};

export default PagoPromesaModal;
