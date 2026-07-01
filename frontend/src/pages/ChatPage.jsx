import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import useAuth from "@/hooks/useAuth";
import chatService from "@/services/chatService";

function sortConversations(items) {
  return [...items].sort((left, right) => {
    const leftTimestamp = left.last_message?.created_at || left.created_at;
    const rightTimestamp = right.last_message?.created_at || right.created_at;
    return new Date(rightTimestamp).getTime() - new Date(leftTimestamp).getTime();
  });
}

function formatMessageTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatConversationTime(value) {
  if (!value) {
    return "No activity yet";
  }

  const date = new Date(value);
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();

  if (isSameDay) {
    return formatMessageTime(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function ChatPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [draft, setDraft] = useState("");
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState("");
  const [socketStatus, setSocketStatus] = useState("connecting");
  const [typingByConversation, setTypingByConversation] = useState({});
  const socketRef = useRef(null);
  const selectedConversationIdRef = useRef("");
  const conversationsRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const typingConversationRef = useRef("");

  const currentUserId = user?.id || "";
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );
  const activeMessages = activeConversation ? messagesByConversation[activeConversation.id] || [] : [];
  const activeTyping = activeConversation ? typingByConversation[activeConversation.id] : false;
  const isSocketConnected = socketStatus === "connected";

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const applyPresence = useCallback((userId, isOnline) => {
    setUsers((current) =>
      current.map((item) => (item.id === userId ? { ...item, is_online: isOnline } : item)),
    );
    setConversations((current) =>
      current.map((conversation) =>
        conversation.participant.id === userId
          ? {
              ...conversation,
              participant: {
                ...conversation.participant,
                is_online: isOnline,
              },
            }
          : conversation,
      ),
    );
  }, []);

  const applyReadReceipt = useCallback(
    (conversationId, readerId, readAt) => {
      setMessagesByConversation((current) => {
        const messages = current[conversationId];
        if (!messages) {
          return current;
        }

        return {
          ...current,
          [conversationId]: messages.map((message) => {
            if (readerId === currentUserId) {
              if (message.sender_id === currentUserId || message.read_at) {
                return message;
              }
              return {
                ...message,
                read_at: readAt,
              };
            }

            if (message.sender_id !== currentUserId || message.read_at) {
              return message;
            }

            return {
              ...message,
              read_at: readAt,
            };
          }),
        };
      });

      if (readerId === currentUserId) {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  unread_count: 0,
                }
              : conversation,
          ),
        );
      }
    },
    [currentUserId],
  );

  const sendSocketEvent = useCallback((payload) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  const stopTyping = useCallback(
    (conversationId = typingConversationRef.current) => {
      if (!conversationId) {
        return;
      }

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      if (typingConversationRef.current === conversationId) {
        sendSocketEvent({
          type: "typing_stop",
          conversation_id: conversationId,
        });
        typingConversationRef.current = "";
      }
    },
    [sendSocketEvent],
  );

  const markConversationRead = useCallback(
    async (conversationId) => {
      if (!conversationId) {
        return;
      }

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                unread_count: 0,
              }
            : conversation,
        ),
      );

      const sentOverSocket = sendSocketEvent({
        type: "mark_read",
        conversation_id: conversationId,
      });

      if (sentOverSocket) {
        return;
      }

      try {
        const receipt = await chatService.markConversationRead(conversationId);
        applyReadReceipt(conversationId, currentUserId, receipt.read_at);
      } catch {
        // Keep the UI responsive even if the fallback read call fails.
      }
    },
    [applyReadReceipt, currentUserId, sendSocketEvent],
  );

  const mergeConversation = useCallback((conversation) => {
    setConversations((current) => {
      const next = current.some((item) => item.id === conversation.id)
        ? current.map((item) => (item.id === conversation.id ? { ...item, ...conversation } : item))
        : [conversation, ...current];
      return sortConversations(next);
    });
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const conversationsData = await chatService.getConversations();
      setConversations(sortConversations(conversationsData));
      setSelectedConversationId((current) => current || conversationsData[0]?.id || "");
    } catch (requestError) {
      setPageError(requestError.response?.data?.detail || "Unable to refresh conversations.");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadChatData = async () => {
      setIsLoading(true);
      setPageError("");

      try {
        const [usersData, conversationsData] = await Promise.all([
          chatService.getUsers(),
          chatService.getConversations(),
        ]);

        if (!isMounted) {
          return;
        }

        setUsers(usersData);
        setConversations(sortConversations(conversationsData));
        setSelectedConversationId((current) => current || conversationsData[0]?.id || "");
      } catch (requestError) {
        if (!isMounted) {
          return;
        }
        setPageError(requestError.response?.data?.detail || "Unable to load chat.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadChatData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      return undefined;
    }

    let isMounted = true;

    const loadMessages = async () => {
      if (messagesByConversation[selectedConversationId]) {
        markConversationRead(selectedConversationId);
        return;
      }

      setIsLoadingMessages(true);

      try {
        const messages = await chatService.getMessages(selectedConversationId);
        if (!isMounted) {
          return;
        }

        setMessagesByConversation((current) => ({
          ...current,
          [selectedConversationId]: messages,
        }));
        markConversationRead(selectedConversationId);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }
        setPageError(requestError.response?.data?.detail || "Unable to load messages.");
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [markConversationRead, messagesByConversation, selectedConversationId]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = chatService.createSocket();
    socketRef.current = socket;
    setSocketStatus("connecting");

    socket.onopen = () => {
      setSocketStatus("connected");
    };

    socket.onerror = () => {
      setSocketStatus("error");
    };

    socket.onclose = () => {
      setSocketStatus("disconnected");
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === "connection_ready") {
        setSocketStatus("connected");
        const onlineIds = new Set(payload.online_user_ids || []);
        setUsers((current) =>
          current.map((item) => ({
            ...item,
            is_online: onlineIds.has(item.id),
          })),
        );
        setConversations((current) =>
          current.map((conversation) => ({
            ...conversation,
            participant: {
              ...conversation.participant,
              is_online: onlineIds.has(conversation.participant.id),
            },
          })),
        );
        return;
      }

      if (payload.type === "presence") {
        applyPresence(payload.user_id, payload.is_online);
        return;
      }

      if (payload.type === "typing") {
        setTypingByConversation((current) => ({
          ...current,
          [payload.conversation_id]: Boolean(payload.is_typing),
        }));
        return;
      }

      if (payload.type === "messages_read") {
        applyReadReceipt(payload.conversation_id, payload.user_id, payload.read_at);
        return;
      }

      if (payload.type === "chat_message") {
        const incomingMessage = payload.message;
        const conversationId = payload.conversation_id;
        const isIncoming = incomingMessage.sender_id !== currentUserId;
        const isActiveConversation = selectedConversationIdRef.current === conversationId;
        const hasConversation = conversationsRef.current.some((conversation) => conversation.id === conversationId);

        setMessagesByConversation((current) => {
          const existingMessages = current[conversationId] || [];
          const alreadyExists = existingMessages.some((message) => message.id === incomingMessage.id);
          if (alreadyExists) {
            return current;
          }

          return {
            ...current,
            [conversationId]: [...existingMessages, incomingMessage],
          };
        });

        if (hasConversation) {
          setConversations((current) => {
            const next = current.map((conversation) => {
              if (conversation.id !== conversationId) {
                return conversation;
              }

              return {
                ...conversation,
                last_message: incomingMessage,
                unread_count:
                  isIncoming && !isActiveConversation ? conversation.unread_count + 1 : 0,
              };
            });
            return sortConversations(next);
          });
        } else {
          void refreshConversations();
        }

        if (isIncoming) {
          setTypingByConversation((current) => ({
            ...current,
            [conversationId]: false,
          }));
        }

        if (isIncoming && isActiveConversation) {
          void markConversationRead(conversationId);
        }
        return;
      }

      if (payload.type === "error") {
        setPageError(payload.message || "Unable to process chat event.");
      }
    };

    return () => {
      stopTyping();
      socket.close();
      socketRef.current = null;
    };
  }, [applyPresence, applyReadReceipt, currentUserId, markConversationRead, refreshConversations, stopTyping, token]);

  const handleSelectConversation = (conversationId) => {
    if (conversationId === selectedConversationId) {
      return;
    }

    stopTyping();
    setDraft("");
    if (selectedConversationId) {
      setTypingByConversation((current) => ({
        ...current,
        [selectedConversationId]: false,
      }));
    }
    setSelectedConversationId(conversationId);
  };

  const handleStartConversation = async (participantId) => {
    setIsStartingConversation(participantId);
    setPageError("");

    try {
      const conversation = await chatService.createConversation(participantId);
      mergeConversation(conversation);
      setSelectedConversationId(conversation.id);
    } catch (requestError) {
      setPageError(requestError.response?.data?.detail || "Unable to start conversation.");
    } finally {
      setIsStartingConversation("");
    }
  };

  const handleDraftChange = (event) => {
    const value = event.target.value;
    setDraft(value);

    if (!selectedConversationId) {
      return;
    }

    if (!value.trim()) {
      stopTyping(selectedConversationId);
      return;
    }

    if (typingConversationRef.current !== selectedConversationId) {
      sendSocketEvent({
        type: "typing_start",
        conversation_id: selectedConversationId,
      });
      typingConversationRef.current = selectedConversationId;
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      stopTyping(selectedConversationId);
    }, 1200);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!activeConversation || !draft.trim()) {
      return;
    }

    const messageBody = draft.trim();
    setDraft("");
    stopTyping(activeConversation.id);

    const sentOverSocket = sendSocketEvent({
      type: "send_message",
      conversation_id: activeConversation.id,
      body: messageBody,
    });

    if (sentOverSocket) {
      return;
    }

    try {
      const message = await chatService.sendMessage(activeConversation.id, messageBody);
      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: [...(current[activeConversation.id] || []), message],
      }));
      setConversations((current) =>
        sortConversations(
          current.map((conversation) =>
            conversation.id === activeConversation.id
              ? {
                  ...conversation,
                  last_message: message,
                }
              : conversation,
          ),
        ),
      );
    } catch (requestError) {
      setPageError(requestError.response?.data?.detail || "Unable to send message.");
      setDraft(messageBody);
    }
  };

  const availableUsers = useMemo(() => {
    const conversationParticipantIds = new Set(conversations.map((conversation) => conversation.participant.id));
    return users.filter((item) => !conversationParticipantIds.has(item.id));
  }, [conversations, users]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Realtime Chat</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">One-to-one messaging workspace</h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          Start direct conversations, see who is online, send typing signals, and track read receipts in real time.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
            <p className="mt-2 text-2xl font-semibold capitalize text-slate-950">{socketStatus}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Conversations</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{conversations.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Users Online</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {users.filter((item) => item.is_online).length}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Unread</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {conversations.reduce((total, conversation) => total + conversation.unread_count, 0)}
            </p>
          </div>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{pageError}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Conversations</h2>
                <p className="text-sm text-slate-500">Choose an existing thread.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {isLoading ? (
                <p className="text-sm text-slate-500">Loading conversations...</p>
              ) : conversations.length ? (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      conversation.id === selectedConversationId
                        ? "border-brand-300 bg-brand-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-slate-950">{conversation.participant.name}</span>
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              conversation.participant.is_online ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {conversation.last_message?.body || "No messages yet"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">
                          {formatConversationTime(
                            conversation.last_message?.created_at || conversation.created_at,
                          )}
                        </p>
                        {conversation.unread_count ? (
                          <span className="mt-2 inline-flex min-w-6 items-center justify-center rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                            {conversation.unread_count}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-500">No conversations yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-950">Start New Chat</h2>
            <p className="mt-1 text-sm text-slate-500">Create a direct conversation with any teammate.</p>

            <div className="mt-4 space-y-3">
              {users.length ? (
                users.map((chatUser) => {
                  const hasConversation = conversations.some(
                    (conversation) => conversation.participant.id === chatUser.id,
                  );

                  return (
                    <button
                      key={chatUser.id}
                      type="button"
                      onClick={() =>
                        hasConversation
                          ? handleSelectConversation(
                              conversations.find((conversation) => conversation.participant.id === chatUser.id)?.id || "",
                            )
                          : handleStartConversation(chatUser.id)
                      }
                      disabled={isStartingConversation === chatUser.id}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-slate-950">{chatUser.name}</span>
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              chatUser.is_online ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                        </div>
                        <p className="truncate text-sm text-slate-500">{chatUser.email}</p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                        {hasConversation ? "Open" : isStartingConversation === chatUser.id ? "..." : "Chat"}
                      </span>
                    </button>
                  );
                })
              ) : isLoading ? (
                <p className="text-sm text-slate-500">Loading users...</p>
              ) : (
                <p className="text-sm text-slate-500">No other users are available.</p>
              )}
            </div>

            {availableUsers.length === 0 && users.length > 0 ? (
              <p className="mt-4 text-xs text-slate-400">All available users already have an open conversation.</p>
            ) : null}
          </div>
        </aside>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-soft">
          {activeConversation ? (
            <div className="flex h-full min-h-[720px] flex-col">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-slate-950">{activeConversation.participant.name}</h2>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          activeConversation.participant.is_online ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {activeTyping
                        ? "Typing..."
                        : activeConversation.participant.is_online
                          ? "Online"
                          : "Offline"}
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {isSocketConnected ? "Live" : "Fallback"}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                {isLoadingMessages ? (
                  <p className="text-sm text-slate-500">Loading messages...</p>
                ) : activeMessages.length ? (
                  activeMessages.map((message) => {
                    const isOwnMessage = message.sender_id === currentUserId;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[75%] ${isOwnMessage ? "items-end" : "items-start"} flex flex-col`}>
                          <div
                            className={`rounded-3xl px-4 py-3 text-sm ${
                              isOwnMessage
                                ? "bg-brand-600 text-white"
                                : "border border-slate-200 bg-slate-50 text-slate-900"
                            }`}
                          >
                            {message.body}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatMessageTime(message.created_at)}
                            {isOwnMessage ? ` • ${message.read_at ? "Read" : "Sent"}` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-sm text-slate-500">
                    No messages yet. Send the first message to start the conversation.
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 px-6 py-5">
                <form onSubmit={handleSendMessage} className="space-y-3">
                  <textarea
                    value={draft}
                    onChange={handleDraftChange}
                    rows={3}
                    placeholder={`Message ${activeConversation.participant.name}`}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">
                      {activeTyping ? `${activeConversation.participant.name} is typing...` : "Press send to deliver instantly."}
                    </p>
                    <button
                      type="submit"
                      disabled={!draft.trim()}
                      className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[720px] items-center justify-center px-6 text-center">
              <div className="max-w-md">
                <h2 className="text-2xl font-semibold text-slate-950">Pick a conversation</h2>
                <p className="mt-3 text-slate-500">
                  Select an existing chat or start a new one from the user list to begin messaging.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ChatPage;
