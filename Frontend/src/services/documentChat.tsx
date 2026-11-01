import http from "./http";
import { store } from "../redux/store";

export interface DocumentItem {
  id: string;
  _id?: string;
  userId: string;
  title: string;
  filename: string;
  chromaCollectionName: string;
  fileSize: number;
  totalChunks: number;
  createdAt: string;
}

export interface DocumentChatSessionItem {
  id: string;
  _id?: string;
  userId: string;
  documentId?: DocumentItem | string | null;
  title: string;
  mode: "with_data" | "without_data";
  createdAt: string;
}

export interface DocumentMessageItem {
  id: string;
  _id?: string;
  chatSessionId: string;
  sender: "user" | "ai";
  content: string;
  sources?: Array<{
    text: string;
    chunkIndex: number;
    documentTitle?: string;
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

  clearChatHistory: (sessionId: string) =>
    http.delete(`/api/v1/document-chat/chat/${sessionId}/messages`),

  sendMessage: (sessionId: string, content: string, useDocument?: boolean) =>
    http.post(`/api/v1/document-chat/chat/${sessionId}/message`, {
      content,
      useDocument,
    }),

  sendMessageStream: async (
    sessionId: string,
    content: string,
    useDocument: boolean,
    onDelta: (text: string) => void,
    onSources?: (sources: any[]) => void,
    onComplete?: (aiMessage: DocumentMessageItem) => void,
    onError?: (error: any) => void
  ) => {
    let baseUrl = "";
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      baseUrl = "http://localhost:3000";
    }

    // Grab auth token directly from Redux store, exactly as http.tsx does
    let token = "";
    try {
      token = (store.getState() as any)?.auth?.details?.accessToken || "";
    } catch {
      // ignore
    }

    if (!token) {
      try {
        const persistedState = localStorage.getItem("persist:root");
        if (persistedState) {
          const parsed = JSON.parse(persistedState);
          const auth = JSON.parse(parsed.auth || "{}");
          token = auth?.details?.accessToken || "";
        }
      } catch {
        // ignore
      }
    }

    try {
      const response = await fetch(
        `${baseUrl}/api/v1/document-chat/chat/${sessionId}/message?stream=true`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            content,
            useDocument,
            stream: true,
          }),
        }
      );

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || `Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body available for streaming");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              if (parsed.event === "delta") {
                onDelta(parsed.data);
              } else if (parsed.event === "sources") {
                onSources?.(parsed.data);
              } else if (parsed.event === "done") {
                onComplete?.(parsed.data?.aiMessage);
              } else if (parsed.event === "error") {
                onError?.(new Error(parsed.message));
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
      }
    } catch (err: any) {
      onError?.(err);
    }
  },
};

export default documentChatService;
