import api from './api';

export const fetchConversations = async (params = {}) => {
  const response = await api.get('/conversations', { params });
  return response.data;
};

export const fetchConversation = async (id) => {
  const response = await api.get(`/conversations/${id}`);
  return response.data;
};

export const createOrOpenConversation = async ({ item_id, recipient_id }) => {
  const response = await api.post('/conversations', { item_id, recipient_id });
  return response.data;
};

export const fetchConversationMessages = async (conversationId, params = {}) => {
  const response = await api.get(`/conversations/${conversationId}/messages`, { params });
  return response.data;
};

export const markConversationRead = async (conversationId) => {
  const response = await api.put(`/conversations/${conversationId}/read`);
  return response.data;
};

export const fetchUnreadConversationSummary = async () => {
  const response = await api.get('/conversations/unread/summary');
  return response.data;
};
