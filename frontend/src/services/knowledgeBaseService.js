import apiClient from "@/services/apiClient";

const knowledgeBaseService = {
  async getDocuments() {
    const response = await apiClient.get("/knowledge-base/documents");
    return response.data;
  },

  async uploadDocument(file, onUploadProgress) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post("/knowledge-base/documents", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress,
    });
    return response.data;
  },

  async askQuestion(question) {
    const response = await apiClient.post("/support/ask", {
      question,
    });
    return response.data;
  },
};

export default knowledgeBaseService;
