const { createNotification } = require('../services/notificationService');
const {
  ensureMessagingSchema,
  assertParticipant,
  sendMessageInConversation,
} = require('../services/messageService');

const roomNameForConversation = (conversationId) => `conversation:${conversationId}`;

const registerMessageSocketHandlers = (io) => {
  io.on('connection', async (socket) => {
    await ensureMessagingSchema();

    socket.on('conversation:join', async (payload = {}, callback) => {
      const conversationId = Number.parseInt(payload.conversationId, 10);

      if (!Number.isInteger(conversationId) || conversationId < 1) {
        if (callback) callback({ ok: false, message: 'Invalid conversation id.' });
        return;
      }

      const hasAccess = await assertParticipant(conversationId, socket.user.id);

      if (!hasAccess) {
        if (callback) callback({ ok: false, message: 'Forbidden' });
        return;
      }

      await socket.join(roomNameForConversation(conversationId));
      if (callback) callback({ ok: true });
    });

    socket.on('conversation:leave', async (payload = {}, callback) => {
      const conversationId = Number.parseInt(payload.conversationId, 10);

      if (!Number.isInteger(conversationId) || conversationId < 1) {
        if (callback) callback({ ok: false, message: 'Invalid conversation id.' });
        return;
      }

      await socket.leave(roomNameForConversation(conversationId));
      if (callback) callback({ ok: true });
    });

    socket.on('message:send', async (payload = {}, callback) => {
      const conversationId = Number.parseInt(payload.conversationId, 10);

      if (!Number.isInteger(conversationId) || conversationId < 1) {
        if (callback) callback({ ok: false, message: 'Invalid conversation id.' });
        return;
      }

      try {
        const sentPayload = await sendMessageInConversation({
          conversationId,
          senderId: socket.user.id,
          message: payload.message,
        });

        io.to(roomNameForConversation(conversationId)).emit('message:new', {
          conversationId,
          message: sentPayload.message,
        });

        if (sentPayload.recipientId && sentPayload.recipientUnreadCount === 1) {
          const roomSockets = await io.in(roomNameForConversation(conversationId)).fetchSockets();
          const recipientActiveInRoom = roomSockets.some((roomSocket) => roomSocket?.user?.id === sentPayload.recipientId);

          if (!recipientActiveInRoom) {
            const preview = sentPayload.message.message.length > 110
              ? `${sentPayload.message.message.slice(0, 107)}...`
              : sentPayload.message.message;

            await createNotification(
              sentPayload.recipientId,
              `New message from ${sentPayload.senderName}`,
              preview,
              'system',
              sentPayload.itemId || null,
              null
            );
          }
        }

        if (callback) callback({ ok: true, message: sentPayload.message });
      } catch (error) {
        if (callback) callback({ ok: false, message: error.message || 'Message could not be sent.' });
      }
    });
  });
};

module.exports = {
  registerMessageSocketHandlers,
  roomNameForConversation,
};
