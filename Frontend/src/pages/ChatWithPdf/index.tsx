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

  // Loaders & operations
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [uploadingPdf, setUploadingPdf] = useState<boolean>(false);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [clearingChat, setClearingChat] = useState<boolean>(false);

  // Form & inputs
  const [inputMessage, setInputMessage] = useState<string>("");

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDocId = (doc: DocumentItem | null | undefined): string | null => {
    if (!doc) return null;
    return doc.id || doc._id || null;
  };

  const getSessionId = (session: DocumentChatSessionItem | null | undefined): string | null => {
    if (!session) return null;
    return session.id || session._id || null;
  };

  // 1. Fetch user's uploaded documents
  const fetchDocuments = async (autoSelectFirst = false) => {
    setLoadingDocs(true);
    try {
      const res = await documentChatService.listDocuments();
      const docs: DocumentItem[] = res.data?.data?.documents || [];
      setDocuments(docs);

      if (autoSelectFirst && docs.length > 0 && !selectedDocId) {
        const firstId = getDocId(docs[0]);
        if (firstId) {
          setSelectedDocId(firstId);
        }
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
          const docId = getDocId(docData as DocumentItem);
          if (docId) setSelectedDocId(docId);
          setUseDocumentContext(true);
        } else if (docData && typeof docData === "string") {
          const match = documents.find((d) => getDocId(d) === docData);
          setActiveDocument(match || null);
          setSelectedDocId(docData);
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

      const newDocId = getDocId(newDoc);
      if (newDocId) {
        setSelectedDocId(newDocId);
        setActiveDocument(newDoc);
      }

      const newSessionId = getSessionId(newSession);
      if (newSessionId) {
        await fetchChatHistory(newSessionId);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to process PDF";
      toast.error(errMsg);
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Delete document and associated vectors
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

  // Clear / Delete current chat messages
  const handleClearChat = async () => {
    const curSessionId = getSessionId(activeSession);
    if (!curSessionId) {
      setMessages([]);
      toast.info("Chat cleared.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this chat conversation?")) {
      return;
    }

    setClearingChat(true);
    try {
      await documentChatService.clearChatHistory(curSessionId);
      setMessages([]);
      toast.success("Chat conversation deleted successfully!");
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to clear chat";
      toast.error(errMsg);
    } finally {
      setClearingChat(false);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptText = customPrompt || inputMessage.trim();

    if (!promptText) return;

    const curSessionId = getSessionId(activeSession);

    if (!curSessionId) {
      // Auto-create a session
      try {
        const mode = useDocumentContext && selectedDocId ? "with_data" : "without_data";
        const res = await documentChatService.createSession({
          documentId: mode === "with_data" ? selectedDocId! : undefined,
          mode,
        });
        const session: DocumentChatSessionItem = res.data?.data?.chatSession;
        const newSessionId = getSessionId(session);
        if (newSessionId) {
          setActiveSession(session);
          await sendMsgToSession(newSessionId, promptText);
        }
      } catch (err: any) {
        toast.error("Failed to start session.");
      }
      return;
    }

    await sendMsgToSession(curSessionId, promptText);
  };

  const sendMsgToSession = async (sessionId: string, text: string) => {
    setInputMessage("");
    setSendingMessage(true);

    const tempUserId = `temp_u_${Date.now()}`;
    const tempAiId = `temp_ai_${Date.now()}`;

    // 1. Optimistic user message preview
    const tempUserMsg: DocumentMessageItem = {
      id: tempUserId,
      _id: tempUserId,
      chatSessionId: sessionId,
      sender: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    // 2. Optimistic empty AI message for streaming accumulation
    const tempAiMsg: DocumentMessageItem = {
      id: tempAiId,
      _id: tempAiId,
      chatSessionId: sessionId,
      sender: "ai",
      content: "",
      sources: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg, tempAiMsg]);

    await documentChatService.sendMessageStream(
      sessionId,
      text,
      useDocumentContext,
      // onDelta (real-time chunk arrival)
      (delta: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            (msg.id || msg._id) === tempAiId
              ? { ...msg, content: msg.content + delta }
              : msg
          )
        );
      },
      // onSources (ChromaDB snippet citations)
      (sources: any[]) => {
        setMessages((prev) =>
          prev.map((msg) =>
            (msg.id || msg._id) === tempAiId
              ? { ...msg, sources }
              : msg
          )
        );
      },
      // onComplete (Server finished response & persisted record)
      (persistedAiMsg: DocumentMessageItem) => {
        if (persistedAiMsg) {
          setMessages((prev) =>
            prev.map((msg) =>
              (msg.id || msg._id) === tempAiId ? persistedAiMsg : msg
            )
          );
        }
        setSendingMessage(false);
      },
      // onError (fallback to standard or display toast)
      (err: any) => {
        const errMsg = err?.message || "Failed to stream message";
        toast.error(errMsg);
        // Remove empty placeholder on error if nothing was streamed
        setMessages((prev) =>
          prev.filter((m) => (m.id || m._id) !== tempAiId || m.content.length > 0)
        );
        setSendingMessage(false);
      }
    );
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
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileUpload(e.dataTransfer.files[0]);
        }
      }}
      className="flex h-[calc(100vh-80px)] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl relative"
    >
      {/* Hidden File Input for Paperclip/Upload */}
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

      {/* Drag & Drop Fullscreen Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-600/10 backdrop-blur-sm border-2 border-dashed border-blue-500 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 shadow-xl flex items-center justify-center text-3xl mb-3 text-blue-600 animate-bounce">
            📄
          </div>
          <p className="text-base font-semibold text-blue-600 dark:text-blue-400">
            Drop your PDF anywhere to upload and vectorise
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ChromaDB will automatically index your document for instant search
          </p>
        </div>
      )}

      {/* LEFT SIDEBAR: Uploaded Documents Panel */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 flex flex-col h-full">
        {/* Document List Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-xs">
              📁
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
                Uploaded Documents ({documents.length})
              </h2>
            </div>
          </div>

          {/* Quick upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPdf}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:border-blue-500 transition-all text-xs flex items-center gap-1 shadow-sm"
            title="Upload new PDF"
          >
            {uploadingPdf ? (
              <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block"></span>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[11px] font-medium">Add</span>
              </>
            )}
          </button>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {loadingDocs ? (
            <div className="p-4 text-center text-xs text-gray-400 animate-pulse">
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl mt-4">
              <p className="mb-2">No PDFs uploaded yet.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:underline font-medium"
              >
                Upload a PDF
              </button>{" "}
              from the search bar below or drag & drop here to start chatting!
            </div>
          ) : (
            documents.map((doc) => {
              const docId = getDocId(doc);
              const isSelected = selectedDocId === docId;
              const isDeleting = deletingDocId === docId;

              return (
                <div
                  key={docId || doc.title}
                  onClick={() => {
                    if (docId) {
                      setSelectedDocId(docId);
                      setActiveDocument(doc);
                      setUseDocumentContext(true);
                    }
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

                  {/* Actions: Delete file & vectors */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={isDeleting}
                      onClick={(e) => {
                        if (docId) handleDeleteDocument(e, docId, doc.title);
                      }}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                      title="Delete PDF & ChromaDB Vectors"
                    >
                      {isDeleting ? (
                        <span className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
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
                  ? "RAG Mode: Grounded vector search with LangChain & LangGraph"
                  : "General Mode: Standard LLM chat"}
              </p>
            </div>
          </div>

          {/* Right Header Controls: Clear Chat Conversation */}
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                disabled={clearingChat}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-gray-200 dark:border-gray-700 transition-all shadow-sm"
                title="Delete chat conversation"
              >
                {clearingChat ? (
                  <span className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                <span>Delete Chat</span>
              </button>
            )}
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
                    : "Upload a PDF below to start chatting with your own data!"
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
              const msgId = msg.id || msg._id || Math.random().toString();

              return (
                <div
                  key={msgId}
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

        {/* ChatGPT-style Search & File Upload Bar */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <form
            onSubmit={(e) => handleSendMessage(e)}
            className="flex items-center gap-2 bg-gray-50 dark:bg-gray-950 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 focus-within:border-blue-500 transition-all shadow-sm"
          >
            {/* Attachment Button like ChatGPT */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPdf}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all shrink-0"
              title="Attach PDF file"
            >
              {uploadingPdf ? (
                <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block"></span>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              )}
            </button>

            {/* Input field */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                activeDocument
                  ? `Ask anything about "${activeDocument.title}"...`
                  : "Message or upload a PDF to chat..."
              }
              className="flex-1 bg-transparent border-none outline-none px-2 text-xs text-gray-900 dark:text-white placeholder-gray-400"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={sendingMessage || !inputMessage.trim()}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center transition-all shadow-md shrink-0"
              title="Send message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </form>

          {/* Context pill info under input */}
          {activeDocument && (
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Active Document: <strong className="text-gray-600 dark:text-gray-300 truncate">{activeDocument.title}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedDocId(null);
                  setActiveDocument(null);
                  setUseDocumentContext(false);
                }}
                className="text-gray-400 hover:text-red-500 text-[10px] underline ml-2 shrink-0"
              >
                Clear Context
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWithPdfPage;