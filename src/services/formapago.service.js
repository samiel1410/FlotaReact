import { api as axios } from '../config/axios';

const BASE_URL = '/formapago';

export const getFormasPago = async (params) => {
  try {
    const response = await axios.get(`${BASE_URL}/formapagoSeleccionPaginado`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching formas de pago:', error);
    throw error;
  }
};

export const createFormaPago = async (data) => {
  try {
    const response = await axios.post(`${BASE_URL}/formapagoInsertarActualizar`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating forma de pago:', error);
    throw error;
  }
};

export const updateFormaPago = async (data) => {
  try {
    const response = await axios.post(`${BASE_URL}/formapagoInsertarActualizar`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating forma de pago:', error);
    throw error;
  }
};

export const deleteFormaPago = async (id) => {
  try {
    // Asumiendo un endpoint para eliminar, si no existe, se deberá crear en el backend
    const response = await axios.delete(`${BASE_URL}/eliminarFormaPago/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting forma de pago:', error);
    throw error;
  }
};
