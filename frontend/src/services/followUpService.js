import apiClient from "@/services/apiClient";

const followUpService = {
  async scheduleFollowUp(payload) {
    const { data } = await apiClient.post("/follow-ups/schedule", payload);
    return data;
  },
  async generateDraft(followUpId, payload = {}) {
    const { data } = await apiClient.post(`/follow-ups/${followUpId}/generate-draft`, payload);
    return data;
  },
  async sendFollowUp(followUpId) {
    const { data } = await apiClient.post(`/follow-ups/${followUpId}/send`);
    return data;
  },
  async getFollowUpsForLead(leadId) {
    const { data } = await apiClient.get(`/follow-ups/lead/${leadId}`);
    return data;
  },
};

export default followUpService;
