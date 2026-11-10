import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { despachoService } from '../../../services/despacho.service';

const money = (valor) => `$${(Number(valor) || 0).toFixed(2)}`;

/**
 * Finaliza un despacho (estado 2) y, opcionalmente, registra un ahorro.
 * El ahorro se descuenta como EGRESO en la caja de encomiendas del usuario.
 */
export const FinalizarDespachoModal = ({ despacho, onClose, onSuccess }) => {
  const [saving, setSaving] = useState(false);
  const [ahorrar, setAhorrar] = useState(false);
  const [tipoAhorro, setTipoAhorro] = useState('PORCENTAJE');
  const [valorAhorro, setValorAhorro] = useState('');

  const baseGuias = Number(despacho?.total_guias_valor) || 0;
  const valorNumerico = Number(valorAhorro) || 0;

  const montoAhorro = useMemo(() => {
    if (!ahorrar || valorNumerico <= 0) return 0;
    const monto = tipoAhorro === 'PORCENTAJE'
      ? (baseGuias * valorNumerico) / 100
      : valorNumerico;
    return Math.round(monto * 100) / 100;
  }, [ahorrar, tipoAhorro, valorNumerico, baseGuias]);

  const handleFinalizar = async () => {
    if (ahorrar) {
      if (!(valorNumerico > 0)) {
        toast.error('Ingrese el porcentaje o el valor del ahorro');
        return;
      }
      if (tipoAhorro === 'PORCENTAJE' && valorNumerico > 100) {
        toast.error('El porcentaje no puede superar el 100%');
        return;
      }
      if (!(montoAhorro > 0)) {
        toast.error('El monto del ahorro debe ser mayor a 0');
        return;
      }
      if (baseGuias > 0 && montoAhorro > baseGuias) {
        toast.error('El ahorro no puede superar el total de las guías del despacho');
        return;
      }
    }

    const confirmacion = await Swal.fire({
      title: '¿Finalizar despacho?',
      html: ahorrar
        ? `Se finalizará el despacho <b>#${despacho.numero_despacho_maestro || despacho.id_despacho_maestro}</b> y se registrará un egreso de <b>${money(montoAhorro)}</b> en su caja de encomiendas.`
        : `Se finalizará el despacho <b>#${despacho.numero_despacho_maestro || despacho.id_despacho_maestro}</b>. Luego ya no podrá editarlo ni agregar guías.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5'
    });
    if (!confirmacion.isConfirmed) return;

    setSaving(true);
    try {
      const res = await despachoService.finalizar({
        id_despacho_maestro: despacho.id_despacho_maestro,
        ahorrar,
        tipo_ahorro: ahorrar ? tipoAhorro : '',
        valor_ahorro: ahorrar ? valorNumerico : 0
      });

      if (res?.success) {
        toast.success(
          Number(res.monto_ahorro) > 0
            ? `Despacho finalizado. Ahorro registrado: ${money(res.monto_ahorro)}`
            : 'Despacho finalizado'
        );
        if (onSuccess) onSuccess();
        onClose();
      } else if (res?.requiere_caja) {
        await Swal.fire({
          icon: 'warning',
          title: 'Sin caja aperturada',
          text: res.mensaje || 'Debe aperturar su caja de encomiendas antes de registrar el ahorro.',
          confirmButtonColor: '#4f46e5'
        });
      } else {
        toast.error(res?.mensaje || 'No se pudo finalizar el despacho');
      }
    } catch (err) {
      console.error('Error finalizando despacho:', err);
      toast.error('Error al finalizar el despacho');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-white font-bold flex items-center gap-2">
            <i className="fas fa-flag-checkered text-emerald-400"></i>
            FINALIZAR DESPACHO N# {despacho.numero_despacho_maestro || despacho.id_despacho_maestro}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          {/* Resumen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Guías despachadas</div>
              <div className="text-lg font-black text-slate-800">{despacho.encomiendas || 0}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total guías</div>
              <div className="text-lg font-black text-slate-800">{money(baseGuias)}</div>
            </div>
          </div>

          <div className="text-xs text-slate-600 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <i className="fas fa-lock text-amber-500 mt-0.5"></i>
            <span>
              Al finalizar, el despacho queda cerrado: no podrá editarlo ni agregar más guías.
              El PDF se habilita una vez finalizado.
            </span>
          </div>

          {/* Ahorro */}
          <div className="border border-slate-200 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ahorrar}
                onChange={(e) => {
                  const activo = e.target.checked;
                  setAhorrar(activo);
                  if (activo && !(baseGuias > 0)) setTipoAhorro('VALOR');
                }}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-bold text-slate-800">
                <i className="fas fa-piggy-bank text-emerald-600 mr-1.5"></i>
                Ahorrar en este despacho
              </span>
            </label>

            {ahorrar && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setTipoAhorro('PORCENTAJE'); setValorAhorro(''); }}
                    className={`h-9 rounded-lg text-[11px] font-black uppercase tracking-widest border transition-all ${
                      tipoAhorro === 'PORCENTAJE'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <i className="fas fa-percent mr-1"></i> Porcentaje
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTipoAhorro('VALOR'); setValorAhorro(''); }}
                    className={`h-9 rounded-lg text-[11px] font-black uppercase tracking-widest border transition-all ${
                      tipoAhorro === 'VALOR'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <i className="fas fa-dollar-sign mr-1"></i> Valor
                  </button>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    {tipoAhorro === 'PORCENTAJE' ? 'Porcentaje de ahorro (%)' : 'Valor del ahorro ($)'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-black">
                      {tipoAhorro === 'PORCENTAJE' ? '%' : '$'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={valorAhorro}
                      onChange={(e) => setValorAhorro(e.target.value)}
                      placeholder={tipoAhorro === 'PORCENTAJE' ? 'Ej: 5' : 'Ej: 10.50'}
                      className="w-full h-9 pl-8 pr-3 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Egreso en caja</span>
                  <span className="text-base font-black text-emerald-700">{money(montoAhorro)}</span>
                </div>

                <p className="text-[10px] text-slate-500">
                  <i className="fas fa-info-circle mr-1"></i>
                  El egreso se registra en su caja de encomiendas aperturada y queda pendiente de aprobación.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="h-9 px-4 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-all disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={handleFinalizar}
            disabled={saving}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-flag-checkered"></i>}
            Finalizar despacho
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalizarDespachoModal;
