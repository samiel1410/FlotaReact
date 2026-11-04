import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import AperturaCajaCobrosModal from './AperturaCajaCobrosModal';
import { dialog } from './dialog/dialog';
import { cobrosService } from '../../services/cobros.service';
import { cajaCobrosService } from '../../services/cajaCobros.service';
import { getFormasPago } from '../../services/formapago.service';
import { buildPdfUrl } from '../../utils/pdfUrlUtils';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;

/**
 * Registro de un pago de deuda (cuota administrativa, multa, cartera del
 * socio). El pago se guarda en la caja de cobros aperturada para que entre
 * al cuadre/arqueo y se pueda depositar.
 */
export const PagoDeudaModal = ({ item, titulo = 'Registrar pago', onClose, onSuccess }) => {
  const saldo = parseFloat(item?.saldo_pendiente ?? item?.valor_original ?? 0);

  const [monto, setMonto] = useState(() => String(saldo || ''));
  const [formasPago, setFormasPago] = useState([]);
  const [idFormaPago, setIdFormaPago] = useState('');
  const [numeroCheque, setNumeroCheque] = useState('');
  const [bancoCheque, setBancoCheque] = useState('');
  const [observacion, setObservacion] = useState('');
  const [caja, setCaja] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);
  const [showApertura, setShowApertura] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const formaSeleccionada = useMemo(
    () => formasPago.find((f) => String(f.id_forma_pago) === String(idFormaPago)) || null,
    [formasPago, idFormaPago]
  );
  const esCheque = Number(formaSeleccionada?.tipo_forma_pago) === 3;

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
        const lista = (res?.data || []).filter(
          (f) => Number(f.estado_forma_pago_cuenta) === 1
        );
        setFormasPago(lista);
        const efectivo = lista.find((f) => Number(f.tipo_forma_pago) === 2) || lista[0];
        if (efectivo) setIdFormaPago(String(efectivo.id_forma_pago));
      })
      .catch(() => toast.error('No se pudieron cargar las formas de pago'));
  }, [cargarCaja]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valor = parseFloat(monto);
    if (!valor || valor <= 0) {
      toast.error('Ingrese un monto válido a pagar');
      return;
    }
    if (valor > saldo) {
      toast.error('El monto no puede superar el saldo pendiente');
      return;
    }
    if (!idFormaPago) {
      toast.error('Seleccione la forma de pago');
      return;
    }
    if (!caja?.id_caja) {
      toast.error('Abra una caja de cobros antes de registrar el pago');
      return;
    }
    if (esCheque && !numeroCheque.trim()) {
      toast.error('Ingrese el número de cheque');
      return;
    }

    const partes = [];
    if (observacion.trim()) partes.push(observacion.trim());
    if (esCheque) {
      partes.push(`Cheque N° ${numeroCheque.trim()}`);
      if (bancoCheque.trim()) partes.push(`Banco ${bancoCheque.trim()}`);
    }

    setGuardando(true);
    try {
      const res = await cobrosService.pagarDeuda({
        id_deuda: item.id_deuda,
        monto: valor,
        observacion: partes.join(' | '),
        fuente: item.fuente || 'deuda',
        forma_pago: Number(idFormaPago),
        id_caja: caja.id_caja
      });

      if (!res.success) {
        toast.error(res.message || 'Error al registrar el pago');
        if (res.requiere_caja) cargarCaja();
        return;
      }

      const comp = res.data?.comprobante;
      if (comp?.numero_comprobante) {
        const r = await dialog.fire({
          title: 'Pago registrado',
          html: `Se generó el comprobante <b>N° ${comp.numero_comprobante}</b> por <b>${formatCurrency(res.data.monto_pagado)}</b> en la caja <b>#${caja.id_caja}</b>.`,
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Imprimir comprobante',
          cancelButtonText: 'Cerrar',
          confirmButtonColor: '#059669'
        });
        if (r.isConfirmed) {
          window.open(buildPdfUrl(`/php/cobros/imprimirComprobanteCobro.php?numero_comprobante=${comp.numero_comprobante}`), '_blank');
        }
      } else {
        toast.success('Pago registrado correctamente');
      }

      onSuccess?.();
      onClose?.();
    } catch {
      toast.error('Error al procesar el pago');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title={titulo} width="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1 text-xs">
            {item?.socio_nombre && (
              <p className="text-slate-500">Socio: <b className="text-slate-800">{item.socio_nombre}</b></p>
            )}
            {item?.disco_buses && (
              <p className="text-slate-500">Bus: <b className="text-slate-800">Bus {item.disco_buses}</b></p>
            )}
            {item?.concepto && (
              <p className="text-slate-500">Concepto: <b className="text-slate-800">{item.concepto}</b></p>
            )}
            <p className="text-slate-500">Saldo pendiente: <b className="text-rose-600 font-mono font-black">{formatCurrency(saldo)}</b></p>
          </div>

          <div className={`rounded-xl border p-3 text-xs flex items-center justify-between gap-3 ${
            caja?.id_caja
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <span className="font-semibold">
              <i className={`fas ${caja?.id_caja ? 'fa-lock-open' : 'fa-triangle-exclamation'} mr-1.5`} />
              {cargandoCaja
                ? 'Verificando caja...'
                : caja?.id_caja
                  ? `Caja de cobros abierta #${caja.id_caja}`
                  : 'No hay caja de cobros aperturada'}
            </span>
            {!cargandoCaja && !caja?.id_caja && (
              <button
                type="button"
                onClick={() => setShowApertura(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold whitespace-nowrap"
              >
                Aperturar caja
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Monto a pagar ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={saldo}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-black font-mono text-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Forma de pago <span className="text-rose-500">*</span>
              </label>
              <select
                value={idFormaPago}
                onChange={(e) => setIdFormaPago(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-semibold"
              >
                <option value="">Seleccionar</option>
                {formasPago.map((f) => (
                  <option key={f.id_forma_pago} value={f.id_forma_pago}>{f.nombre_forma_pago}</option>
                ))}
              </select>
            </div>
          </div>

          {esCheque && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  N° de cheque <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={numeroCheque}
                  onChange={(e) => setNumeroCheque(e.target.value)}
                  required
                  placeholder="Ej: 0012345"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Banco</label>
                <input
                  type="text"
                  value={bancoCheque}
                  onChange={(e) => setBancoCheque(e.target.value)}
                  placeholder="Ej: Pichincha"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Observación</label>
            <textarea
              rows={2}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej: pago en ventanilla, transferencia..."
              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !monto || !caja?.id_caja}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
            >
              {guardando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
              <span>{guardando ? 'Procesando...' : 'Confirmar pago'}</span>
            </button>
          </div>
        </form>
      </Modal>

      <AperturaCajaCobrosModal
        isOpen={showApertura}
        onClose={() => setShowApertura(false)}
        onSuccess={() => {
          setShowApertura(false);
          setCargandoCaja(true);
          cargarCaja();
        }}
      />
    </>
  );
};

export default PagoDeudaModal;
