import { api as axios } from '../config/axios';

const BASE_URL = '/companiaasociada';
const LOCACION_URL = '/locacion';
const DESTINO_URL = '/destino';

export const getCompaniasAsociadas = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/companiaasociadaSeleccionPaginadoCombo`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching companias asociadas:', error);
    throw error;
  }
};

export const getCiudades = async () => {
  try {
    const response = await axios.get(`${LOCACION_URL}/seleccionarCiudad`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching ciudades:', error);
    throw error;
  }
};

export const getDestinos = async (params) => {
  try {
    const response = await axios.get(`${DESTINO_URL}/destinoSeleccionPaginado`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching destinos:', error);
    throw error;
  }
};

export const createDestino = async (data) => {
  try {
    const response = await axios.post(`${DESTINO_URL}/crearDestino`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating destino:', error);
    throw error;
  }
};

export const updateDestino = async (id, data) => {
  try {
    const response = await axios.put(`${DESTINO_URL}/actualizarDestino/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating destino:', error);
    throw error;
  }
};

export const deleteDestino = async (id) => {
  try {
    const response = await axios.delete(`${DESTINO_URL}/eliminarDestino/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting destino:', error);
    throw error;
  }
};
