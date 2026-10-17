import http from "./http";

export interface CompanionData {
  name: string;
  mood: "romantic" | "sad";
  description: string;
}

const companionService = {
  listCompanions: () => http.get("/api/v1/companions/list"),
  
  createCompanion: (data: CompanionData) => http.post("/api/v1/companions/add", data),
  
  deleteCompanion: (id: string) => http.delete(`/api/v1/companions/delete/${id}`),
  
  getChat: (id: string) => http.get(`/api/v1/companions/chat/${id}`),
  
  sendMessage: (id: string, content: string) => 
    http.post(`/api/v1/companions/chat/${id}/message`, { content }),
};

export default companionService;
