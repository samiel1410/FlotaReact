import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { api } from './axios';
import { CajaDenominacionesForm } from '../pages/CajaBoleteria/components/CajaDenominacionesForm';

export const createAperturaAction = (endpointUrl) => {
  return {
    id: 'nueva_apertura',
    label: 'NUEVA APERTURA',
    icon: 'fas fa-plus',
    color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    handler: (ctx) => {
      if (ctx && ctx.openCustomModal) {
        ctx.openCustomModal(
          CajaDenominacionesForm,
          {
            mode: 'apertura',
            onSubmit: async (formData) => {
              try {
                const res = await api.post(endpointUrl, formData);
                if (res.data?.success) {
                  toast.success('Caja aperturada');
                  ctx.closeCustomModal();
                  if (ctx.refreshList) ctx.refreshList();
                } else {
                  toast.error(res.data?.message || 'Error al aperturar');
                }
              } catch (error) {
                toast.error(error.response?.data?.message || 'Error al aperturar');
              }
            }
          },
          'Nueva Apertura de Caja'
        );
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
    handler: () => {
      // apertura=1 indica al backend que filtre por el usuario autenticado en el JWT
      window.dispatchEvent(new CustomEvent('set-caja-filter', { detail: { apertura: '1', estado: '', desde: '', hasta: '' } }));
      toast.success('Buscando tu caja abierta...', { duration: 1500 });
    }
  };
};

export const createCerrarAction = (idField, endpointUrl) => {
  return {
    id: 'cerrar', icon: 'fas fa-sign-out-alt', tooltip: 'Cerrar Caja',
    color: 'text-rose-600 hover:bg-rose-50',
    showIf: (row) => row.estado_caja === 'APERTURADA',
    handler: (row, ctx) => {
      if (ctx && ctx.openCustomModal) {
        ctx.openCustomModal(
          CajaDenominacionesForm,
          {
            mode: 'cierre',
            cajaActual: row,
            onSubmit: async (formData) => {
              try {
                const payload = { ...formData, id_caja: row[idField] };
                const res = await api.post(endpointUrl, payload);
                if (res.data?.success) {
                  const estado = res.data.estado_cuadre || res.data.data?.estado_cuadre;
                  const diff   = res.data.valor_diferencia || res.data.data?.valor_diferencia;
                  let msg = 'Caja cerrada';
                  if (estado === 'CUADRADO') msg += ' ✅';
                  else if (estado === 'FALTANTE') msg += `. Faltante $${diff}`;
                  else if (estado === 'SOBRANTE') msg += `. Sobrante $${diff}`;

                  Swal.fire('Éxito', msg, 'success');
                  ctx.closeCustomModal();
                  if (ctx.refreshList) ctx.refreshList();
                } else {
                  Swal.fire('Error', res.data?.message || 'No se pudo cerrar', 'error');
                }
              } catch (error) {
                Swal.fire('Error', error.response?.data?.message || 'Error al cerrar la caja', 'error');
              }
            }
          },
          `Cierre Caja #${row.numero_caja || row.id_caja_boleteria || row.id_caja || ''}`
        );
      }
    }
  };
};
