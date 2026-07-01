import apiClient from "@/services/apiClient";

const leadService = {
  async getLeads() {
    const { data } = await apiClient.get("/leads");
    return data;
  },
  async createLead(payload) {
    const { data } = await apiClient.post("/leads", payload);
    return data;
  },
  async updateLead(leadId, payload) {
    const { data } = await apiClient.put(`/leads/${leadId}`, payload);
    return data;
  },
  async deleteLead(leadId) {
    await apiClient.delete(`/leads/${leadId}`);
  },
};

export default leadService;
