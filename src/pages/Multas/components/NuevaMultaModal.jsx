import React, { useState } from 'react';
import { api } from '../../../config/axios';
import toast from 'react-hot-toast';
import Modal from '../../../components/common/Modal';
import SocioBusSelector from '../../../components/common/SocioBusSelector';
import SearchableSelect from '../../../components/common/SearchableSelect';
import { cobrosService } from '../../../services/cobros.service';
import { TIPOS_MULTA } from '../utils/multasConstants';

export const NuevaMultaModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ id_socio: '', id_bus: '', tipo_multa: '', valor: '10', observacion: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const { id_socio, id_bus, tipo_multa, valor } = form;
    if (!id_socio || !id_bus || !tipo_multa || !valor || parseFloat(valor) <= 0) {
      toast.error('Complete todos los campos obligatorios con un valor válido');
      return;
    }
    setLoading(true);
    try {
      const res = await cobrosService.agregarMulta({ ...form, concepto: `Multa por ${form.tipo_multa}` });
      if (res.success) {
        toast.success('Multa registrada exitosamente');
        if (res.notificacion?.telefono) {
          api.post('/whatsapp/enviar', { number: res.notificacion.telefono, message: res.notificacion.mensaje }).catch(() => {});
        }
        onSuccess();
      } else {
        toast.error(res.message || 'Error al registrar multa');
      }
    } catch (err) {
      toast.error(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const tipoOptions = TIPOS_MULTA.map(t => ({ value: t, label: t }));

  return (
    <Modal isOpen={true} onClose={onClose} title="Registrar Nueva Multa" width="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2.5">
          <i className="fas fa-exclamation-triangle text-rose-500 mt-0.5 shrink-0 text-sm"></i>
          <div>
            <p className="font-bold">Prioridad de Descuento (1° Máxima)</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Las multas tienen prioridad 1 y se deducirán automáticamente al 100% de la recaudación del próximo despacho del socio/unidad.
            </p>
          </div>
        </div>

        <SocioBusSelector
          idSocio={form.id_socio}
          idBus={form.id_bus}
          onSocioChange={v => handleChange('id_socio', v)}
          onBusChange={v => handleChange('id_bus', v)}
        />

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Tipo / Motivo de Multa <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            options={tipoOptions}
            value={form.tipo_multa}
            onChange={(val) => handleChange('tipo_multa', val || '')}
            placeholder="Seleccione el motivo de la multa..."
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Valor de la Multa ($) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
              value={form.valor}
              onChange={e => handleChange('valor', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Observación adicional</label>
          <textarea
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400 resize-none"
            rows={2}
            value={form.observacion}
            onChange={e => handleChange('observacion', e.target.value)}
            placeholder="Detalles adicionales, ruta, reporte o causa..."
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
            ) : (
              <><i className="fas fa-save"></i> Guardar Multa</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NuevaMultaModal;
