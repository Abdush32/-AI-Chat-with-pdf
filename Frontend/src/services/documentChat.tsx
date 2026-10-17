import http from "./http";

export interface DocumentItem {
  _id: string;
  userId: string;
  title: string;
  filename: string;
  chromaCollectionName: string;
  fileSize: number;
  totalChunks: number;
  createdAt: string;
}

export interface DocumentChatSessionItem {
  _id: string;
  userId: string;
  documentId?: DocumentItem | string | null;
  title: string;
  mode: "with_data" | "without_data";
  createdAt: string;
}

export interface DocumentMessageItem {
  _id: string;
  chatSessionId: string;
  sender: "user" | "ai";
  content: string;
  sources?: Array<{
    text: string;
    chunkIndex: number;
  }>;
  createdAt: string;
}

const documentChatService = {
  uploadPDF: (formData: FormData) =>
    http.post("/api/v1/document-chat/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  listDocuments: () => http.get("/api/v1/document-chat/documents"),

  deleteDocument: (id: string) =>
    http.delete(`/api/v1/document-chat/documents/${id}`),

  createSession: (data: {
    documentId?: string;
    title?: string;
    mode?: "with_data" | "without_data";
  }) => http.post("/api/v1/document-chat/session", data),

  getChatHistory: (sessionId: string) =>
    http.get(`/api/v1/document-chat/chat/${sessionId}`),

  sendMessage: (sessionId: string, content: string, useDocument?: boolean) =>
    http.post(`/api/v1/document-chat/chat/${sessionId}/message`, {
      content,
      useDocument,
    }),
};

export default documentChatService;
