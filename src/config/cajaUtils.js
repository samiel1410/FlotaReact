import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { api } from './axios';

export const DENOMINACIONES = [
  { key: '100', label: 'Billetes $100', field: '100' },
  { key: '50', label: 'Billetes $50', field: '50' },
  { key: '20', label: 'Billetes $20', field: '20' },
  { key: '10', label: 'Billetes $10', field: '10' },
  { key: '5', label: 'Billetes $5', field: '5' },
  { key: '1', label: 'Billetes $1', field: '1' },
  { key: 'moneda_1d', label: 'Monedas $1', field: 'moneda_caja' },
  { key: 'moneda_50', label: 'Monedas $0.50', field: 'moneda_50' },
  { key: 'moneda_25', label: 'Monedas $0.25', field: 'moneda_25' },
  { key: 'moneda_10', label: 'Monedas $0.10', field: 'moneda_10' },
  { key: 'moneda_5', label: 'Monedas $0.05', field: 'moneda_5' },
  { key: 'moneda_01', label: 'Monedas $0.01', field: 'moneda_1' },
];

export const multipliers = {
  '100': 100, '50': 50, '20': 20, '10': 10, '5': 5, '1': 1,
  'moneda_1d': 1, 'moneda_50': 0.50, 'moneda_25': 0.25,
  'moneda_10': 0.10, 'moneda_5': 0.05, 'moneda_01': 0.01
};

export const denomToHtml = (prefix) => DENOMINACIONES.map(d => `
  <div style="flex:0 0 calc(50% - 4px)">
    <label style="display:block;font-weight:bold;font-size:11px;margin-bottom:2px;color:#374151">${d.label}</label>
    <input id="${prefix}-${d.key}" class="swal2-input" type="number" min="0" step="0.01" value="0"
      style="width:100%;padding:6px 10px;font-size:13px;text-align:right" />
  </div>`).join('');

export const denomPreConfirm = (prefix) => {
  const formData = {};
  DENOMINACIONES.forEach(d => {
    formData[`${prefix}_${d.field}`] = parseFloat(document.getElementById(`${prefix}-${d.key}`)?.value || '0') || 0;
  });
  return formData;
};

export const denomCalcular = (prefix) => {
  let total = 0;
  DENOMINACIONES.forEach(d => {
    const el = document.getElementById(`${prefix}-${d.key}`);
    if (el) total += (parseFloat(el.value) || 0) * (multipliers[d.key] || 1);
  });
  const totalEl = document.getElementById(`${prefix}-total`);
  if (totalEl) totalEl.value = total.toFixed(2);
};

export const denomDidOpen = (prefix) => {
  const recalcular = () => denomCalcular(prefix);
  DENOMINACIONES.forEach(d => {
    const el = document.getElementById(`${prefix}-${d.key}`);
    if (el) { el.addEventListener('input', recalcular); el.addEventListener('change', recalcular); }
  });
  recalcular();
};

export const createAperturaAction = (endpointUrl) => {
  return {
    id: 'nueva_apertura',
    label: 'NUEVA APERTURA',
    icon: 'fas fa-plus',
    color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    handler: async () => {
      const { value: form, isDismissed } = await Swal.fire({
        title: 'Nueva Apertura de Caja',
        width: 600,
        html: `
          <div style="text-align:left">
            <div style="display:flex;gap:8px;flex-wrap:wrap">${denomToHtml('ap')}</div>
            <hr style="margin:12px 0"/>
            <div style="display:flex;align-items:center;gap:12px">
              <div style="flex:1">
                <label style="display:block;font-weight:bold;font-size:12px;margin-bottom:2px;color:#374151">Total ($)</label>
                <input id="ap-total" class="swal2-input" type="text" readonly value="0.00" style="width:100%;padding:8px;font-size:14px;font-weight:bold;text-align:right;background:#f3f4f6" />
              </div>
              <div style="flex:0 0 auto;padding-top:18px">
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                  <input type="checkbox" id="ap-cero" /> $0.00
                </label>
              </div>
            </div>
          </div>`,
        showCancelButton: true,
        confirmButtonText: 'Guardar Apertura',
        confirmButtonColor: '#4f9d40',
        didOpen: () => {
          denomDidOpen('ap');
          document.getElementById('ap-cero')?.addEventListener('change', function () {
            DENOMINACIONES.forEach(d => {
              const el = document.getElementById(`ap-${d.key}`);
              if (el) { el.value = '0'; el.readOnly = this.checked; el.style.background = this.checked ? '#f3f4f6' : ''; }
            });
            document.getElementById('ap-total').value = '0.00';
            if (!this.checked) denomCalcular('ap');
          });
        },
        preConfirm: () => ({
          apertura_total_caja: parseFloat(document.getElementById('ap-total')?.value || '0') || 0,
          ...denomPreConfirm('ap')
        })
      });
      if (!form || isDismissed) return;
      try {
        const res = await api.post(endpointUrl, form);
        if (res.data?.success) {
          toast.success('Caja aperturada');
          window.dispatchEvent(new CustomEvent('refresh-list'));
        } else {
          toast.error(res.data?.message || 'Error al aperturar');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error al aperturar');
      }
    }
  };
};

export const createBuscarCajaAction = () => {
  return {
    id: 'buscar_mi_caja',
    label: 'BUSCAR MI CAJA ABIERTA',
    icon: 'fas fa-door-open',
    color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    handler: async () => {
      window.dispatchEvent(new CustomEvent('set-caja-filter', { detail: { estado: 'APERTURADA' } }));
      toast.success('Buscando cajas aperturadas...', { duration: 1500 });
    }
  };
};

export const createCerrarAction = (idField, endpointUrl) => {
  return {
    id: 'cerrar', icon: 'fas fa-sign-out-alt', tooltip: 'Cerrar Caja',
    color: 'text-rose-600 hover:bg-rose-50',
    showIf: (row) => row.estado_caja === 'APERTURADA',
    handler: async (row) => {
      const { value: form, isDismissed } = await Swal.fire({
        title: `Cierre #${row.numero_caja}`,
        width: 650,
        html: `
          <div style="text-align:left">
            <h3 style="font-weight:bold;font-size:14px;margin-bottom:10px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:5px;">
              Ingrese el monto del cierre (Monedas y Billetes)
            </h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap">${denomToHtml('ci')}</div>
            <hr style="margin:12px 0"/>
            <div style="display:flex;align-items:center;gap:12px">
              <div style="flex:1">
                <label style="display:block;font-weight:bold;font-size:12px;margin-bottom:2px;color:#374151">Total Cierre ($)</label>
                <input id="ci-total" class="swal2-input" type="text" readonly value="0.00" style="width:100%;padding:8px;font-size:14px;font-weight:bold;text-align:right;background:#f3f4f6" />
              </div>
            </div>
            <hr style="margin:12px 0"/>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <div style="flex:1;min-width:200px">
                <label style="display:block;font-weight:bold;font-size:11px">N° Comprobante</label>
                <input id="ci-num" class="swal2-input" style="width:100%;padding:6px 10px;font-size:13px"/>
              </div>
              <div style="flex:1;min-width:200px">
                <label style="display:block;font-weight:bold;font-size:11px">Banco</label>
                <input id="ci-banco" class="swal2-input" style="width:100%;padding:6px 10px;font-size:13px"/>
              </div>
            </div>
          </div>`,
        showCancelButton: true,
        confirmButtonText: 'Sí, cerrar',
        confirmButtonColor: '#e11d48',
        cancelButtonText: 'Cancelar',
        didOpen: () => denomDidOpen('ci'),
        preConfirm: () => ({
          id_caja: row[idField],
          cierre_total_caja: parseFloat(document.getElementById('ci-total')?.value || '0') || 0,
          numero_comprobante_cierre: document.getElementById('ci-num')?.value || '',
          banco_cierre: document.getElementById('ci-banco')?.value || '',
          ...denomPreConfirm('ci')
        })
      });
      if (!form || isDismissed) return;
      try {
        const res = await api.post(endpointUrl, form);
        if (res.data?.success) {
          const estado = res.data.estado_cuadre || (res.data.data?.estado_cuadre);
          const diff = res.data.valor_diferencia || (res.data.data?.valor_diferencia);
          let msg = 'Caja cerrada';
          if (estado === 'CUADRADO') msg += ' ✅';
          else if (estado === 'FALTANTE') msg += `. Faltante $${diff}`;
          else if (estado === 'SOBRANTE') msg += `. Sobrante $${diff}`;
          
          Swal.fire('Éxito', msg, 'success');
          window.dispatchEvent(new CustomEvent('refresh-list'));
        } else {
          Swal.fire('Error', res.data?.message || 'No se pudo cerrar', 'error');
        }
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || 'Error al cerrar la caja', 'error');
      }
    }
  };
};
