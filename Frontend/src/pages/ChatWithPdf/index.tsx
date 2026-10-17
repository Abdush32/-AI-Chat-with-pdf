import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import documentChatService, {
  DocumentItem,
  DocumentChatSessionItem,
  DocumentMessageItem,
} from "../../services/documentChat";

const ChatWithPdfPage = () => {
  // State for documents & sessions lists
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  
  // Current active session & messages
  const [activeSession, setActiveSession] = useState<DocumentChatSessionItem | null>(null);
  const [activeDocument, setActiveDocument] = useState<DocumentItem | null>(null);
  const [messages, setMessages] = useState<DocumentMessageItem[]>([]);
  
  // Toggle for active message mode ("with_data" vs "without_data")
  const [useDocumentContext, setUseDocumentContext] = useState<boolean>(true);

  // Loaders
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [uploadingPdf, setUploadingPdf] = useState<boolean>(false);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Form & inputs
  const [inputMessage, setInputMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"docs" | "sessions">("docs");

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch user's uploaded documents
  const fetchDocuments = async (autoSelectFirst = false) => {
    setLoadingDocs(true);
    try {
      const res = await documentChatService.listDocuments();
      const docs: DocumentItem[] = res.data?.data?.documents || [];
      setDocuments(docs);

      if (autoSelectFirst && docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0]._id);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to load documents";
      toast.error(errMsg);
    } finally {
      setLoadingDocs(false);
    }
  };

  // 2. Fetch session chat history
  const fetchChatHistory = async (sessionId: string) => {
    setLoadingChat(true);
    try {
      const res = await documentChatService.getChatHistory(sessionId);
      const data = res.data?.data;
      if (data) {
        setActiveSession(data.chatSession);
        setMessages(data.messages || []);

        const docData = data.chatSession?.documentId;
        if (docData && typeof docData === "object") {
          setActiveDocument(docData as DocumentItem);
          setUseDocumentContext(true);
        } else if (docData && typeof docData === "string") {
          const match = documents.find((d) => d._id === docData);
          setActiveDocument(match || null);
          setUseDocumentContext(true);
        } else {
          setActiveDocument(null);
          setUseDocumentContext(false);
        }
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to load chat history";
      toast.error(errMsg);
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    fetchDocuments(true);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendingMessage]);

  // Handle PDF file upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.warn("Only PDF files are supported!");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.warn("File size must be under 25MB!");
      return;
    }

    setUploadingPdf(true);
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await documentChatService.uploadPDF(formData);
      toast.success(res.data?.message || "PDF uploaded and vectorised successfully!");
      
      const newDoc: DocumentItem = res.data?.data?.document;
      const newSession: DocumentChatSessionItem = res.data?.data?.chatSession;

      await fetchDocuments();

      if (newDoc?._id) {
        setSelectedDocId(newDoc._id);
        setActiveDocument(newDoc);
      }

      if (newSession?._id) {
        await fetchChatHistory(newSession._id);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to process PDF";
      toast.error(errMsg);
    } finally {
      setUploadingPdf(false);
    }
  };

  // Create new session (either WITH data or WITHOUT data)
  const handleCreateNewSession = async (mode: "with_data" | "without_data") => {
    try {
      let docIdToUse: string | undefined = undefined;

      if (mode === "with_data") {
        if (!selectedDocId) {
          toast.warn("Please select an uploaded PDF document first, or upload a new PDF!");
          return;
        }
        docIdToUse = selectedDocId;
      }

      const res = await documentChatService.createSession({
        documentId: docIdToUse,
        mode,
        title: mode === "with_data" ? "Chat with PDF" : "General AI Chat",
      });

      const session: DocumentChatSessionItem = res.data?.data?.chatSession;
      if (session?._id) {
        toast.success(mode === "with_data" ? "Started chat session with PDF!" : "Started general AI chat session!");
        await fetchChatHistory(session._id);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to create session";
      toast.error(errMsg);
    }
  };

  // Delete document
  const handleDeleteDocument = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will remove its vectors from ChromaDB.`)) {
      return;
    }

    setDeletingDocId(id);
    try {
      const res = await documentChatService.deleteDocument(id);
      toast.success(res.data?.message || "Document deleted successfully!");
      
      if (selectedDocId === id) {
        setSelectedDocId(null);
        setActiveDocument(null);
        setActiveSession(null);
        setMessages([]);
      }
      
      await fetchDocuments();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to delete document";
      toast.error(errMsg);
    } finally {
      setDeletingDocId(null);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptText = customPrompt || inputMessage.trim();

    if (!promptText) return;

    if (!activeSession) {
      // Auto-create a session
      try {
        const mode = useDocumentContext && selectedDocId ? "with_data" : "without_data";
        const res = await documentChatService.createSession({
          documentId: mode === "with_data" ? selectedDocId! : undefined,
          mode,
        });
        const session: DocumentChatSessionItem = res.data?.data?.chatSession;
        if (session?._id) {
          setActiveSession(session);
          // Send message in newly created session
          await sendMsgToSession(session._id, promptText);
        }
      } catch (err: any) {
        toast.error("Failed to start session.");
      }
      return;
    }

    await sendMsgToSession(activeSession._id, promptText);
  };

  const sendMsgToSession = async (sessionId: string, text: string) => {
    setInputMessage("");
    setSendingMessage(true);

    // Optimistic user message preview
    const tempUserMsg: DocumentMessageItem = {
      _id: `temp_${Date.now()}`,
      chatSessionId: sessionId,
      sender: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await documentChatService.sendMessage(
        sessionId,
        text,
        useDocumentContext
      );
      const { userMessage, aiMessage } = res.data?.data || {};

      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempUserMsg._id ? userMessage : msg)).concat(aiMessage)
      );
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to send message";
      toast.error(errMsg);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id));
    } finally {
      setSendingMessage(false);
    }
  };

  // Helper formatting for file size
  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
      {/* LEFT SIDEBAR: Document & Storage Panel */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 flex flex-col h-full">
        {/* Top Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              📄
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                PDF Knowledge Base
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ChromaDB Vector RAG
              </p>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-gray-900"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            {uploadingPdf ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-blue-600 font-medium">
                  Extracting text & vectorising in ChromaDB...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-2xl">📤</span>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Click or Drag & Drop PDF
                </p>
                <p className="text-[10px] text-gray-400">
                  Auto-indexes vectors for instant search
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Start Chat Mode Action Buttons */}
        <div className="p-3 grid grid-cols-2 gap-2 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => handleCreateNewSession("with_data")}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
          >
            <span>📚</span>
            <span>Chat w/ PDF</span>
          </button>

          <button
            onClick={() => handleCreateNewSession("without_data")}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all"
          >
            <span>💬</span>
            <span>Chat w/o PDF</span>
          </button>
        </div>

        {/* Document List Header */}
        <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center justify-between">
          <span>Uploaded Documents ({documents.length})</span>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-2">
          {loadingDocs ? (
            <div className="p-4 text-center text-xs text-gray-400 animate-pulse">
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              No PDFs uploaded yet. Upload a PDF above to start chatting with your own data!
            </div>
          ) : (
            documents.map((doc) => {
              const isSelected = selectedDocId === doc._id;
              const isDeleting = deletingDocId === doc._id;

              return (
                <div
                  key={doc._id}
                  onClick={() => {
                    setSelectedDocId(doc._id);
                    setActiveDocument(doc);
                    setUseDocumentContext(true);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-sm"
                      : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {doc.title}
                      </h4>
                      <p className="text-[10px] text-gray-400 truncate">
                        {doc.totalChunks} chunks • {formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isDeleting}
                    onClick={(e) => handleDeleteDocument(e, doc._id, doc.title)}
                    className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shrink-0"
                    title="Delete PDF & Vectors"
                  >
                    {isDeleting ? "⏳" : "🗑️"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full bg-gray-50/30 dark:bg-gray-900/40">
        {/* Top Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                  {activeSession ? activeSession.title : "Document AI Assistant"}
                </h3>
                {useDocumentContext && activeDocument && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                    PDF: {activeDocument.title}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {useDocumentContext
                  ? "RAG Mode: Answers ground truth from vector database"
                  : "General Mode: Standard LLM chat without document context"}
              </p>
            </div>
          </div>

          {/* Mode Switcher Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setUseDocumentContext(true)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                useDocumentContext
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              📚 Chat WITH Data
            </button>
            <button
              onClick={() => setUseDocumentContext(false)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                !useDocumentContext
                  ? "bg-gray-700 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              💬 Chat WITHOUT Data
            </button>
          </div>
        </div>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingChat ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-400 animate-pulse">
              Loading chat messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center text-3xl mb-4 shadow-inner">
                {useDocumentContext ? "📄" : "🤖"}
              </div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                {useDocumentContext
                  ? selectedDocId
                    ? `Ask anything about "${activeDocument?.title || "your PDF"}"`
                    : "Upload a PDF to start chatting with your own data!"
                  : "Start a General AI Chat"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mb-6">
                {useDocumentContext
                  ? "ChromaDB will find relevant paragraphs from your PDF and feed them directly to the AI for accurate responses."
                  : "Chat directly with the AI model for general questions, code assistance, and summaries without PDF context."}
              </p>

              {/* Starter Prompts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg w-full">
                {[
                  "Summarize the key points of this document",
                  "What are the main conclusions?",
                  "Explain the core concepts mentioned",
                  "List any important dates or numbers",
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(undefined, prompt)}
                    className="p-3 text-left text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl text-gray-700 dark:text-gray-300 transition-all shadow-sm"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === "user";

              return (
                <div
                  key={msg._id}
                  className={`flex items-start gap-3 ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                      isUser
                        ? "bg-blue-600 text-white"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    {isUser ? "👤" : "🤖"}
                  </div>

                  <div
                    className={`max-w-[75%] rounded-2xl p-4 shadow-sm text-xs leading-relaxed ${
                      isUser
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* RAG Citations & Sources */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                          📌 Sources from ChromaDB ({msg.sources.length} snippets):
                        </p>
                        <div className="space-y-1.5">
                          {msg.sources.map((src, idx) => (
                            <details
                              key={idx}
                              className="text-[11px] bg-gray-50 dark:bg-gray-950 p-2 rounded-lg border border-gray-200/60 dark:border-gray-800"
                            >
                              <summary className="cursor-pointer font-medium text-gray-600 dark:text-gray-400 hover:text-blue-500">
                                Snippet #{src.chunkIndex + 1}
                              </summary>
                              <p className="mt-1 text-gray-500 dark:text-gray-400 italic">
                                "{src.text}"
                              </p>
                            </details>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {sendingMessage && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm animate-pulse">
                🤖
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl rounded-tl-none p-4 shadow-sm text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
                <span>
                  {useDocumentContext
                    ? "Searching vectors in ChromaDB & generating response..."
                    : "Thinking..."}
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <form
            onSubmit={(e) => handleSendMessage(e)}
            className="flex items-center gap-2 bg-gray-50 dark:bg-gray-950 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 focus-within:border-blue-500 transition-all"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                useDocumentContext
                  ? activeDocument
                    ? `Ask a question about "${activeDocument.title}"...`
                    : "Upload a PDF or select one to chat with data..."
                  : "Type a general AI query..."
              }
              className="flex-1 bg-transparent border-none outline-none px-3 text-xs text-gray-900 dark:text-white placeholder-gray-400"
            />

            <button
              type="submit"
              disabled={sendingMessage || !inputMessage.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
            >
              <span>Send</span>
              <span>🚀</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatWithPdfPage;
