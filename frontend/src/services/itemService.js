import api, { API_ORIGIN } from './api';

export const getItemImageUrl = (imagePath) => {
  if (!imagePath) {
    return '';
  }

  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  return `${API_ORIGIN}${imagePath}`;
};

export const fetchItems = async (params = {}) => {
  const response = await api.get('/items', { params });
  return response.data;
};

export const fetchItem = async (id) => {
  const response = await api.get(`/items/${id}`);
  return response.data;
};

export const fetchMyItems = async () => {
  const response = await api.get('/items/me');
  return response.data;
};

export const fetchUserListings = async () => {
  const response = await api.get('/items/user/listings');
  return response.data;
};

export const createItem = async (formData) => {
  const response = await api.post('/items', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

export const updateItem = async (id, formData) => {
  const response = await api.put(`/items/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

export const deleteItem = async (id) => {
  const response = await api.delete(`/items/${id}`);
  return response.data;
};

export const updateItemStatus = async (id, resolved) => {
  const response = await api.put(`/items/${id}/status`, { resolved });
  return response.data;
};
