import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow/ChatWindow';
import ConversationList from '../components/ConversationList/ConversationList';
import { useAuth } from '../context/AuthContext';
import {
  fetchConversation,
  fetchConversationMessages,
  fetchConversations,
  markConversationRead,
} from '../services/conversationService';
import { sendMessageToConversation } from '../services/messageService';
import { getMessagingSocket } from '../services/socketService';

const PAGE_SIZE = 12;
const MESSAGE_PAGE_SIZE = 30;

const dedupeMessages = (messages) => {
  const seen = new Set();

  return messages.filter((message) => {
    if (seen.has(message.id)) {
      return false;
    }

    seen.add(message.id);
    return true;
  });
};

const mergeMessages = (previousMessages, incomingMessages, prepend = false) => {
  const combined = prepend
    ? [...incomingMessages, ...previousMessages]
    : [...previousMessages, ...incomingMessages];

  return dedupeMessages(combined).sort((a, b) => {
    const firstTime = new Date(a.created_at).getTime();
    const secondTime = new Date(b.created_at).getTime();

    if (firstTime === secondTime) {
      return a.id - b.id;
    }

    return firstTime - secondTime;
  });
};

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [conversationsPage, setConversationsPage] = useState(1);
  const [conversationsTotalPages, setConversationsTotalPages] = useState(0);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [sending, setSending] = useState(false);
  const [messagePage, setMessagePage] = useState(1);
  const [messageTotalPages, setMessageTotalPages] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const socketRef = useRef(null);

  const selectedConversationId = useMemo(() => {
    const value = searchParams.get('conversation');
    const parsed = Number.parseInt(value || '', 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const refreshConversations = async () => {
    const response = await fetchConversations({ page: 1, limit: PAGE_SIZE });
    setConversations(response.conversations || []);
    setConversationsPage(response.currentPage || 1);
    setConversationsTotalPages(response.totalPages || 0);
  };

  useEffect(() => {
    let cancelled = false;

    const loadConversations = async () => {
      setListLoading(true);
      setListError('');

      try {
        const response = await fetchConversations({ page: 1, limit: PAGE_SIZE });

        if (cancelled) return;

        setConversations(response.conversations || []);
        setConversationsPage(response.currentPage || 1);
        setConversationsTotalPages(response.totalPages || 0);
      } catch (requestError) {
        if (cancelled) return;

        setListError(requestError?.response?.data?.message || 'Unable to load conversations.');
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    };

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setMessagePage(1);
      setMessageTotalPages(0);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      setMessagesLoading(true);
      setMessagesError('');

      try {
        const [conversationResponse, messagesResponse] = await Promise.all([
          fetchConversation(selectedConversationId),
          fetchConversationMessages(selectedConversationId, { page: 1, limit: MESSAGE_PAGE_SIZE }),
        ]);

        if (cancelled) return;

        const conversation = conversationResponse.conversation;

        setConversations((previous) => {
          const exists = previous.some((entry) => entry.id === conversation.id);

          if (!exists) {
            return [
              {
                ...conversation,
                item: conversation.item || {
                  id: conversation.item_id,
                  title: conversation.item_title,
                  item_type: conversation.item_type,
                  item_status: conversation.item_status,
                  resolved: Boolean(conversation.resolved),
                },
                unread_count: 0,
              },
              ...previous,
            ];
          }

          return previous.map((entry) => {
            if (entry.id !== conversation.id) {
              return entry;
            }

            return {
              ...entry,
              ...conversation,
              unread_count: 0,
              item: conversation.item || entry.item,
            };
          });
        });

        setMessages(messagesResponse.messages || []);
        setMessagePage(messagesResponse.currentPage || 1);
        setMessageTotalPages(messagesResponse.totalPages || 0);

        await markConversationRead(selectedConversationId);

        setConversations((previous) =>
          previous.map((entry) =>
            entry.id === selectedConversationId ? { ...entry, unread_count: 0 } : entry
          )
        );
      } catch (requestError) {
        if (cancelled) return;

        setMessagesError(
          requestError?.response?.status === 403
            ? 'This conversation is unavailable.'
            : requestError?.response?.data?.message || 'Unable to load messages.'
        );
      } finally {
        if (!cancelled) {
          setMessagesLoading(false);
        }
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedConversationId]);

  useEffect(() => {
    const socket = getMessagingSocket();
    socketRef.current = socket;

    if (!socket) {
      return undefined;
    }

    const handleIncomingMessage = (payload) => {
      if (!payload?.message || !payload?.conversationId) {
        return;
      }

      const incomingConversationId = Number(payload.conversationId);

      setConversations((previous) =>
        previous
          .map((entry) => {
            if (entry.id !== incomingConversationId) {
              return entry;
            }

            const shouldIncreaseUnread = incomingConversationId !== selectedConversationId && Number(payload.message.sender_id) !== Number(user?.id);
            const nextUnread = shouldIncreaseUnread ? Number(entry.unread_count || 0) + 1 : Number(entry.unread_count || 0);

            return {
              ...entry,
              last_message: payload.message,
              updated_at: payload.message.created_at,
              unread_count: nextUnread,
            };
          })
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      );

      if (incomingConversationId === selectedConversationId) {
        setMessages((previous) => mergeMessages(previous, [payload.message]));

        if (Number(payload.message.sender_id) !== Number(user?.id)) {
          markConversationRead(incomingConversationId).catch(() => {
            // Read sync best-effort; UI refresh will reconcile.
          });
        }
      }
    };

    socket.on('message:new', handleIncomingMessage);

    return () => {
      socket.off('message:new', handleIncomingMessage);
    };
  }, [selectedConversationId, user?.id]);

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket || !selectedConversationId) {
      return undefined;
    }

    socket.emit('conversation:join', { conversationId: selectedConversationId });

    return () => {
      socket.emit('conversation:leave', { conversationId: selectedConversationId });
    };
  }, [selectedConversationId]);

  const selectConversation = (conversation) => {
    if (!conversation?.id) {
      return;
    }

    setSearchParams({ conversation: String(conversation.id) });
    setMobileView('chat');
  };

  const sendMessage = async (text) => {
    if (!selectedConversationId) {
      return;
    }

    setSending(true);
    setMessagesError('');

    try {
      const response = await sendMessageToConversation(selectedConversationId, text);
      const sentMessage = response.sentMessage;

      if (sentMessage) {
        setMessages((previous) => mergeMessages(previous, [sentMessage]));

        setConversations((previous) =>
          previous
            .map((entry) =>
              entry.id === selectedConversationId
                ? {
                    ...entry,
                    last_message: sentMessage,
                    updated_at: sentMessage.created_at,
                  }
                : entry
            )
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        );
      }
    } catch (requestError) {
      setMessagesError(requestError?.response?.data?.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!selectedConversationId || messagePage >= messageTotalPages) {
      return;
    }

    setLoadingOlder(true);

    try {
      const nextPage = messagePage + 1;
      const response = await fetchConversationMessages(selectedConversationId, {
        page: nextPage,
        limit: MESSAGE_PAGE_SIZE,
      });

      setMessages((previous) => mergeMessages(previous, response.messages || [], true));
      setMessagePage(response.currentPage || nextPage);
      setMessageTotalPages(response.totalPages || messageTotalPages);
    } catch {
      setMessagesError('Unable to load messages.');
    } finally {
      setLoadingOlder(false);
    }
  };

  const loadMoreConversations = async () => {
    if (conversationsPage >= conversationsTotalPages) {
      return;
    }

    const nextPage = conversationsPage + 1;

    try {
      const response = await fetchConversations({ page: nextPage, limit: PAGE_SIZE });
      const incoming = response.conversations || [];

      setConversations((previous) => {
        const seen = new Set(previous.map((entry) => entry.id));
        const merged = [...previous, ...incoming.filter((entry) => !seen.has(entry.id))];
        return merged;
      });

      setConversationsPage(response.currentPage || nextPage);
      setConversationsTotalPages(response.totalPages || conversationsTotalPages);
    } catch {
      // Keep list stable if pagination fails.
    }
  };

  const showMobileChat = mobileView === 'chat' && selectedConversationId;

  return (
    <section className="page-card messages-page">
      <div className="section-header section-header-row">
        <div>
          <h1>Messages</h1>
          <p className="muted">Campus conversations for lost & found and marketplace items.</p>
        </div>
      </div>

      {listError ? <div className="form-alert">{listError}</div> : null}

      <div className={`messages-layout ${showMobileChat ? 'messages-layout-show-chat' : ''}`.trim()}>
        <aside className="messages-conversations-panel">
          <ConversationList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={selectConversation}
            loading={listLoading}
            emptyDescription="No conversations yet. Start from an item page using Message Seller, Contact Finder, or Contact Owner."
          />

          {conversationsTotalPages > conversationsPage ? (
            <div className="messages-load-more-conversations">
              <button type="button" className="btn btn-secondary" onClick={loadMoreConversations}>
                Load More
              </button>
            </div>
          ) : null}
        </aside>

        <ChatWindow
          user={user}
          conversation={selectedConversation}
          messages={messages}
          loading={messagesLoading}
          sending={sending}
          error={messagesError}
          hasMore={messageTotalPages > messagePage}
          loadingMore={loadingOlder}
          onBack={() => {
            setMobileView('list');
            navigate('/messages');
          }}
          onSend={sendMessage}
          onLoadMore={loadOlderMessages}
        />
      </div>
    </section>
  );
};

export default Messages;
