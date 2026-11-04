import React from 'react';
import { PagoDeudaModal } from '../../../components/common/PagoDeudaModal';

export const PagarMultaModal = ({ multa, onClose, onSuccess }) => (
  <PagoDeudaModal
    item={multa}
    titulo={`Registrar cobro en ventanilla — Multa #${multa?.id_deuda ?? ''}`}
    onClose={onClose}
    onSuccess={onSuccess}
  />
);

export default PagarMultaModal;
