import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import companionService, { CompanionData } from "../../services/companion";

interface Message {
  _id: string;
  chatSessionId: string;
  sender: "user" | "ai";
  content: string;
  createdAt: string;
}

interface Companion {
  _id: string;
  name: string;
  mood: "romantic" | "sad";
  description: string;
  createdAt: string;
}

const Index = () => {
  // Lists and selections
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Loaded companion details and messages
  const [currentCompanion, setCurrentCompanion] = useState<Companion | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Loading/busy states
  const [loadingList, setLoadingList] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Form states for creating a companion
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formMood, setFormMood] = useState<"romantic" | "sad">("romantic");
  const [formDescription, setFormDescription] = useState("");
  const [creatingCompanion, setCreatingCompanion] = useState(false);

  // Message input state
  const [inputMessage, setInputMessage] = useState("");

  // Refs for scroll and interaction
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch list of companions
  const fetchCompanions = async (autoSelectId?: string) => {
    setLoadingList(true);
    try {
      const res = await companionService.listCompanions();
      const list = res.data?.data?.companions || [];
      setCompanions(list);
      
      // Auto-select companion if specified or default to the first one if nothing is selected
      if (autoSelectId) {
        setSelectedId(autoSelectId);
      } else if (list.length > 0 && !selectedId) {
        setSelectedId(list[0]._id);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to load companions";
      toast.error(errMsg);
    } finally {
      setLoadingList(false);
    }
  };

  // Fetch chat history for selected companion
  const fetchChatHistory = async (id: string) => {
    setLoadingChat(true);
    try {
      const res = await companionService.getChat(id);
      const data = res.data?.data;
      if (data) {
        setCurrentCompanion(data.companion);
        setMessages(data.messages || []);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to load chat history";
      toast.error(errMsg);
    } finally {
      setLoadingChat(false);
    }
  };

  // Run on mount
  useEffect(() => {
    fetchCompanions();
  }, []);

  // Fetch chat history when companion selection changes
  useEffect(() => {
    if (selectedId) {
      fetchChatHistory(selectedId);
    } else {
      setCurrentCompanion(null);
      setMessages([]);
    }
  }, [selectedId]);

  // Scroll to bottom when messages or typing status updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendingMessage]);

  // Create a companion
  const handleCreateCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDescription.trim()) {
      toast.warn("Please fill in all fields.");
      return;
    }

    setCreatingCompanion(true);
    try {
      const payload: CompanionData = {
        name: formName.trim(),
        mood: formMood,
        description: formDescription.trim(),
      };
      const res = await companionService.createCompanion(payload);
      const newCompanion = res.data?.data?.companion;
      
      toast.success(res.data?.message || "Companion created successfully!");
      setShowCreateModal(false);
      
      // Clear form
      setFormName("");
      setFormMood("romantic");
      setFormDescription("");

      // Refresh list and select the newly created companion
      if (newCompanion?._id) {
        fetchCompanions(newCompanion._id);
      } else {
        fetchCompanions();
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to create companion";
      toast.error(errMsg);
    } finally {
      setCreatingCompanion(false);
    }
  };

  // Delete a companion
  const handleDeleteCompanion = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // Avoid selecting companion when deleting
    
    if (!window.confirm(`Are you sure you want to delete ${name}? This will erase all chat sessions and messages.`)) {
      return;
    }

    try {
      const res = await companionService.deleteCompanion(id);
      toast.success(res.data?.message || "Companion deleted successfully!");
      
      // If we deleted the currently selected companion, clear selection or fallback
      if (selectedId === id) {
        const remaining = companions.filter((c) => c._id !== id);
        if (remaining.length > 0) {
          setSelectedId(remaining[0]._id);
        } else {
          setSelectedId(null);
          setCurrentCompanion(null);
          setMessages([]);
        }
      }
      
      fetchCompanions();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to delete companion";
      toast.error(errMsg);
    }
  };

  // Send a message to the active companion
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedId) return;

    const messageText = inputMessage.trim();
    setInputMessage(""); // Clear input early for responsive feel

    // Add user message locally for instant update
    const tempUserMsg: Message = {
      _id: `temp-${Date.now()}`,
      chatSessionId: "",
      sender: "user",
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSendingMessage(true);

    try {
      const res = await companionService.sendMessage(selectedId, messageText);
      const data = res.data?.data;
      if (data) {
        // Replace temp message and append AI response
        setMessages((prev) => {
          // Filter out the temp message we just added
          const filtered = prev.filter((m) => m._id !== tempUserMsg._id);
          return [...filtered, data.userMessage, data.aiMessage];
        });
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to send message";
      toast.error(errMsg);
      // Remove temp message on error so state remains clean
      setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id));
    } finally {
      setSendingMessage(false);
    }
  };

  // Filter companions by search query
  const filteredCompanions = companions.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to choose companion avatar gradient based on mood
  const getAvatarGradient = (mood: "romantic" | "sad") => {
    if (mood === "romantic") {
      return "bg-gradient-to-br from-rose-400 via-pink-500 to-red-500 shadow-rose-200 dark:shadow-none";
    }
    return "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 shadow-blue-200 dark:shadow-none";
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
      {/* LEFT SIDEBAR: Companion List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-950 shrink-0">
        {/* Header Search & Actions */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">AI Companions</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 active:bg-brand-700 transition rounded-lg shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search companion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition text-gray-700 dark:text-gray-200"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>
        </div>

        {/* Companion List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-900/50">
          {loadingList && companions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <svg className="w-7 h-7 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs">Loading AI companions...</span>
            </div>
          ) : filteredCompanions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-48 text-gray-400">
              <svg className="w-8 h-8 mb-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">No companions found</p>
              <p className="text-[11px] text-gray-400 mt-1">Try creating a new companion to get started.</p>
            </div>
          ) : (
            filteredCompanions.map((companion) => (
              <div
                key={companion._id}
                onClick={() => setSelectedId(companion._id)}
                className={`flex items-center gap-3 p-3.5 cursor-pointer transition relative group ${
                  selectedId === companion._id
                    ? "bg-brand-25 dark:bg-brand-500/10 border-l-4 border-brand-500"
                    : "hover:bg-gray-50 dark:hover:bg-gray-900/50 border-l-4 border-transparent"
                }`}
              >
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-base shrink-0 ${getAvatarGradient(companion.mood)}`}>
                  {companion.name.charAt(0).toUpperCase()}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{companion.name}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border shrink-0 ${
                      companion.mood === "romantic"
                        ? "bg-rose-50 dark:bg-rose-950/20 text-rose-500 border-rose-100 dark:border-rose-900/30"
                        : "bg-blue-50 dark:bg-blue-950/20 text-blue-500 border-blue-100 dark:border-blue-900/30"
                    }`}>
                      {companion.mood}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">{companion.description}</p>
                </div>

                {/* Delete Button (Visible on Hover) */}
                <button
                  onClick={(e) => handleDeleteCompanion(e, companion._id, companion.name)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition duration-150"
                  title="Delete companion"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-900/30 relative">
        {selectedId ? (
          <>
            {/* Header info */}
            {currentCompanion ? (
              <div className="p-4 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-sm shrink-0 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-lg shrink-0 ${getAvatarGradient(currentCompanion.mood)}`}>
                    {currentCompanion.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">{currentCompanion.name}</h2>
                      <span className="flex h-2 w-2 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="text-[10px] text-green-500 font-medium">Online</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate" title={currentCompanion.description}>
                      {currentCompanion.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                    currentCompanion.mood === "romantic"
                      ? "bg-rose-50 dark:bg-rose-950/20 text-rose-500 border-rose-100 dark:border-rose-900/30"
                      : "bg-blue-50 dark:bg-blue-950/20 text-blue-500 border-blue-100 dark:border-blue-900/30"
                  }`}>
                    Mood: {currentCompanion.mood}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 animate-pulse shrink-0" />
            )}

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingChat && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <svg className="w-7 h-7 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-xs">Loading chat history...</span>
                </div>
              ) : (
                <>
                  <div className="text-center my-2">
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-2 py-1 rounded-full uppercase tracking-wider">
                      Beginning of conversation
                    </span>
                  </div>

                  {messages.map((msg) => {
                    const isUser = msg.sender === "user";
                    const isTemp = msg._id.startsWith("temp-");
                    return (
                      <div key={msg._id} className={`flex gap-3 max-w-[80%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                        {/* Avatar */}
                        {!isUser && currentCompanion && (
                          <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarGradient(currentCompanion.mood)}`}>
                            {currentCompanion.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {isUser && (
                          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-500 dark:text-brand-400 flex items-center justify-center font-bold text-xs shrink-0 border border-brand-200 dark:border-brand-500/30">
                            ME
                          </div>
                        )}

                        {/* Bubble */}
                        <div className="flex flex-col">
                          <div
                            className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words ${
                              isUser
                                ? "bg-brand-500 text-white rounded-tr-none"
                                : "bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-tl-none"
                            } ${isTemp ? "opacity-75" : ""}`}
                          >
                            {msg.content}
                          </div>
                          
                          {/* Timestamp */}
                          <span className={`text-[10px] text-gray-400 mt-1 ${isUser ? "text-right" : "text-left"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* AI Companion Typing Indicator */}
                  {sendingMessage && currentCompanion && (
                    <div className="flex gap-3 max-w-[80%] mr-auto items-end">
                      <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarGradient(currentCompanion.mood)}`}>
                        {currentCompanion.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 h-10 w-16 justify-center">
                        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 flex gap-3 shrink-0 items-center">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={sendingMessage ? `${currentCompanion?.name || "AI"} is writing a reply...` : "Write your message..."}
                disabled={sendingMessage || !currentCompanion}
                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition text-gray-700 dark:text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sendingMessage || !currentCompanion}
                className="p-3 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition shadow-md hover:shadow-lg focus:outline-none shrink-0"
              >
                <svg className="w-5 h-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          /* EMPTY CHAT STATE */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {/* Ambient glowing radial light */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-500/10 dark:bg-brand-500/5 blur-[100px] pointer-events-none rounded-full" />
            
            <div className="relative z-10 max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-tr from-pink-500/10 via-purple-500/10 to-brand-500/10 dark:from-pink-500/5 dark:via-purple-500/5 dark:to-brand-500/5 border border-brand-500/20 dark:border-brand-500/10 rounded-full flex items-center justify-center shadow-lg relative group">
                <svg className="w-9 h-9 text-brand-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </div>

              <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">AI Girlfriend & Companions</h1>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2.5 max-w-sm mx-auto leading-relaxed">
                Connect and converse with AI companions. Customize their personality, mood, and behaviors for a unique chat experience.
              </p>
              
              <div className="mt-8 flex justify-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 active:bg-brand-700 transition rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35"
                >
                  Create New Companion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE COMPANION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-999 flex items-center justify-center p-4">
          {/* Backdrop glassmorphism */}
          <div
            onClick={() => !creatingCompanion && setShowCreateModal(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          />

          {/* Modal Container */}
          <div className="relative bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 transform scale-100 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-950">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Create AI Companion</h3>
              <button
                disabled={creatingCompanion}
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateCompanion} className="mt-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Companion Name
                </label>
                <input
                  type="text"
                  required
                  disabled={creatingCompanion}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Luna"
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition text-gray-700 dark:text-gray-200 disabled:opacity-60"
                />
              </div>

              {/* Mood Select */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Mood / Personality
                </label>
                <select
                  disabled={creatingCompanion}
                  value={formMood}
                  onChange={(e) => setFormMood(e.target.value as "romantic" | "sad")}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition text-gray-700 dark:text-gray-200 disabled:opacity-60"
                >
                  <option value="romantic">Romantic (Sweet, loving, affectionate)</option>
                  <option value="sad">Sad (Melancholic, sensitive, empathetic)</option>
                </select>
              </div>

              {/* Character Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Character Description
                </label>
                <textarea
                  required
                  rows={4}
                  disabled={creatingCompanion}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. A supportive, curious artist who loves discussing poetry and starry nights..."
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition text-gray-700 dark:text-gray-200 disabled:opacity-60 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-950 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={creatingCompanion}
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 active:scale-95 transition rounded-xl disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCompanion}
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 active:bg-brand-700 active:scale-95 transition rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {creatingCompanion ? (
                    <>
                      <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;