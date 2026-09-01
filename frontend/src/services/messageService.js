import api from './api';

export const sendMessageToConversation = async (conversationId, message) => {
  const response = await api.post(`/conversations/${conversationId}/messages`, { message });
  return response.data;
};

export const sendMessage = async ({ conversation_id, message }) => {
  const response = await api.post('/messages', { conversation_id, message });
  return response.data;
};
