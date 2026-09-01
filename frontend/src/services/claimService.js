import api from './api';

export const fetchClaimSummary = async () => {
  const response = await api.get('/claims/summary');
  return response.data;
};

export const fetchIncomingClaims = async () => {
  const response = await api.get('/claims/incoming');
  return response.data;
};

export const fetchMyClaims = async () => {
  const response = await api.get('/claims/my');
  return response.data;
};

export const fetchClaimDetail = async (id) => {
  const response = await api.get(`/claims/${id}`);
  return response.data;
};

export const submitClaim = async (payload) => {
  const response = await api.post('/claims', payload);
  return response.data;
};

export const acceptClaim = async (id) => {
  const response = await api.put(`/claims/${id}/accept`);
  return response.data;
};

export const rejectClaim = async (id) => {
  const response = await api.put(`/claims/${id}/reject`);
  return response.data;
};