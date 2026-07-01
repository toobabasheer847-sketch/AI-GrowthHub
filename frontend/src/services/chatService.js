import apiClient from "@/services/apiClient";
import { getAuthToken } from "@/utils/storage";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

function buildChatWebSocketUrl() {
  const token = getAuthToken();
  const baseUrl = new URL(`${apiBaseUrl.replace(/\/$/, "")}/chat/ws`);
  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";

  if (token) {
    baseUrl.searchParams.set("token", token);
  }

  return baseUrl.toString();
}

const chatService = {
  async getUsers() {
    const response = await apiClient.get("/chat/users");
    return response.data;
  },

  async getConversations() {
    const response = await apiClient.get("/chat/conversations");
    return response.data;
  },

  async createConversation(participantId) {
    const response = await apiClient.post("/chat/conversations", {
      participant_id: participantId,
    });
    return response.data;
  },

  async getMessages(conversationId) {
    const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
    return response.data;
  },

  async sendMessage(conversationId, body) {
    const response = await apiClient.post(`/chat/conversations/${conversationId}/messages`, {
      body,
    });
    return response.data;
  },

  async markConversationRead(conversationId) {
    const response = await apiClient.post(`/chat/conversations/${conversationId}/read`);
    return response.data;
  },

  createSocket() {
    return new WebSocket(buildChatWebSocketUrl());
  },
};

export default chatService;
