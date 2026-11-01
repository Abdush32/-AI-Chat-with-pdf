import { Op } from "sequelize";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Document from "../models/document.model.js";
import DocumentChatSession from "../models/documentChatSession.model.js";
import DocumentMessage from "../models/documentMessage.model.js";
import { extractTextFromPDF, splitTextIntoDocuments } from "../services/pdf.service.js";
import {
  storeDocumentsInChroma,
  deleteCollection,
} from "../services/chroma.service.js";
import { langchainChatModel } from "../services/openai.service.js";
import {
  documentChatGraph,
  prepareChatContextAndMessages,
} from "../workflows/documentChat.graph.js";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Upload a PDF file, process text into LangChain Documents with RecursiveCharacterTextSplitter,
 * store vector embeddings in ChromaDB, and create document metadata & initial chat session.
 */
const uploadPDF = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "PDF file is required");
  }

  if (
    req.file.mimetype !== "application/pdf" &&
    !req.file.originalname.toLowerCase().endsWith(".pdf")
  ) {
    throw new ApiError(400, "Only PDF files are supported");
  }

  // 1. Extract text from PDF buffer
  const rawText = await extractTextFromPDF(req.file.buffer);
  if (!rawText || rawText.trim().length === 0) {
    throw new ApiError(400, "Could not extract any readable text from the uploaded PDF");
  }

  // 2. Split into LangChain Documents with RecursiveCharacterTextSplitter (chunkSize: 1000, overlap: 200)
  const originalTitle = req.body.title || req.file.originalname.replace(/\.pdf$/i, "");
  const docs = await splitTextIntoDocuments(
    rawText,
    {
      documentTitle: req.file.originalname,
      title: originalTitle,
      userId: req.user.id,
    },
    1000,
    200
  );

  if (docs.length === 0) {
    throw new ApiError(400, "Failed to create text chunks from PDF");
  }

  // 3. Generate unique collection name for ChromaDB (letters, numbers, underscore only)
  const timestamp = Date.now();
  const sanitizedUserId = req.user.id.replace(/-/g, "");
  const chromaCollectionName = `doc_${sanitizedUserId}_${timestamp}`;

  // 4. Ingest LangChain Documents into ChromaDB using LangChain Chroma integration
  const ids = docs.map((_, idx) => `chunk_${idx}`);
  try {
    await storeDocumentsInChroma(chromaCollectionName, docs, ids);
  } catch (error) {
    console.error("ChromaDB storage error:", error);
    throw new ApiError(
      500,
      "Failed to index document in ChromaDB vector store. Please ensure ChromaDB service is running."
    );
  }

  // 5. Save Document metadata in PostgreSQL
  const document = await Document.create({
    userId: req.user.id,
    title: originalTitle,
    filename: req.file.originalname,
    chromaCollectionName,
    fileSize: req.file.size,
    totalChunks: docs.length,
  });

  // 6. Create default chat session for this document (RAG mode: with_data)
  const chatSession = await DocumentChatSession.create({
    userId: req.user.id,
    documentId: document.id,
    title: `Chat with ${document.title}`,
    mode: "with_data",
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      { document, chatSession },
      "PDF uploaded, vectorised in ChromaDB, and ready for chat!"
    )
  );
});

/**
 * List all uploaded documents for the user.
 */
const listDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.findAll({
    where: { userId: req.user.id },
    order: [["createdAt", "DESC"]],
  });

  return res.status(200).json(
    new ApiResponse(200, { documents }, "Documents retrieved successfully!")
  );
});

/**
 * Delete a document, its ChromaDB collection, associated chat sessions, and messages.
 */
const deleteDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!uuidRegex.test(id)) {
    throw new ApiError(400, "Invalid document ID");
  }

  const document = await Document.findOne({ where: { id, userId: req.user.id } });
  if (!document) {
    throw new ApiError(404, "Document not found");
  }

  // Delete ChromaDB collection
  await deleteCollection(document.chromaCollectionName);

  // Find and clean up associated chat sessions and messages
  const chatSessions = await DocumentChatSession.findAll({
    where: {
      documentId: id,
      userId: req.user.id,
    },
  });
  const sessionIds = chatSessions.map((session) => session.id);

  if (sessionIds.length > 0) {
    await DocumentMessage.destroy({ where: { chatSessionId: { [Op.in]: sessionIds } } });
  }
  await DocumentChatSession.destroy({ where: { documentId: id, userId: req.user.id } });
  await document.destroy();

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Document and associated Chroma vectors deleted successfully!"
    )
  );
});

/**
 * Create a new chat session (either attached to a PDF document or standalone without data).
 */
const createChatSession = asyncHandler(async (req, res) => {
  const { documentId, title, mode } = req.body;

  let validDocId = null;
  let chatMode = mode || "without_data";

  if (documentId) {
    if (!uuidRegex.test(documentId)) {
      throw new ApiError(400, "Invalid document ID");
    }

    const doc = await Document.findOne({ where: { id: documentId, userId: req.user.id } });
    if (!doc) {
      throw new ApiError(404, "Document not found");
    }
    validDocId = doc.id;
    chatMode = "with_data";
  }

  const chatSession = await DocumentChatSession.create({
    userId: req.user.id,
    documentId: validDocId,
    title: title || (validDocId ? "Document Chat" : "General AI Chat"),
    mode: chatMode,
  });

  return res.status(201).json(
    new ApiResponse(201, { chatSession }, "Chat session created successfully!")
  );
});

/**
 * Get chat session history.
 */
const getChatHistory = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!uuidRegex.test(sessionId)) {
    throw new ApiError(400, "Invalid chat session ID");
  }

  const chatSession = await DocumentChatSession.findOne({
    where: {
      id: sessionId,
      userId: req.user.id,
    },
  });

  if (!chatSession) {
    throw new ApiError(404, "Chat session not found");
  }

  if (chatSession.documentId) {
    const doc = await Document.findByPk(chatSession.documentId, {
      attributes: ["title", "filename", "fileSize", "totalChunks"],
    });
    chatSession.dataValues.documentId = doc;
  }

  const messages = await DocumentMessage.findAll({
    where: { chatSessionId: sessionId },
    order: [["createdAt", "ASC"]],
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { chatSession, messages },
      "Chat history retrieved successfully!"
    )
  );
});

/**
 * Send message in chat session.
 * Orchestrated through the LangGraph StateGraph workflow:
 * - WITH DATA: Query Rewriting -> ChromaDB LangChain Retrieval -> Context Construction -> OpenAI Response
 * - WITHOUT DATA: Direct OpenAI General Chat
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { content, useDocument } = req.body;

  if (!uuidRegex.test(sessionId)) {
    throw new ApiError(400, "Invalid chat session ID");
  }

  const chatSession = await DocumentChatSession.findOne({
    where: {
      id: sessionId,
      userId: req.user.id,
    },
  });

  if (!chatSession) {
    throw new ApiError(404, "Chat session not found");
  }

  // Determine chat mode (overridden by useDocument if explicitly sent)
  let activeMode = chatSession.mode;
  if (typeof useDocument === "boolean") {
    activeMode = useDocument ? "with_data" : "without_data";
  }

  // 1. Save user message to PostgreSQL
  const userMessage = await DocumentMessage.create({
    chatSessionId: chatSession.id,
    sender: "user",
    content,
  });

  // 2. Retrieve history (latest 20 messages for context)
  const recentMessages = await DocumentMessage.findAll({
    where: { chatSessionId: chatSession.id },
    order: [["createdAt", "DESC"]],
    limit: 20,
  });

  recentMessages.reverse();

  // Exclude the current message we just inserted from history sent to graph
  const previousHistory = recentMessages
    .filter((msg) => msg.id !== userMessage.id)
    .map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      sender: msg.sender,
      content: msg.content,
    }));

  // 3. Resolve document collection name if in with_data mode
  let chromaCollectionName = null;
  if (activeMode === "with_data" && chatSession.documentId) {
    const document = await Document.findOne({
      where: {
        id: chatSession.documentId,
        userId: req.user.id,
      },
    });
    if (document) {
      chromaCollectionName = document.chromaCollectionName;
    }
  }

  // Check if client requested streaming via query param ?stream=true or body stream: true
  const wantsStream = req.query.stream === "true" || req.body.stream === true;

  if (wantsStream) {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    let fullReply = "";
    let sources = [];

    try {
      // Send user message event first
      res.write(`data: ${JSON.stringify({ event: "user_message", data: userMessage })}\n\n`);

      const prep = await prepareChatContextAndMessages({
        query: content,
        history: previousHistory,
        chatMode: activeMode,
        chromaCollectionName,
      });

      sources = prep.sources || [];
      if (sources.length > 0) {
        res.write(`data: ${JSON.stringify({ event: "sources", data: sources })}\n\n`);
      }

      const stream = await langchainChatModel.stream(prep.messages);

      for await (const chunk of stream) {
        const textChunk = typeof chunk.content === "string" ? chunk.content : chunk.content?.toString() || "";
        if (textChunk) {
          fullReply += textChunk;
          res.write(`data: ${JSON.stringify({ event: "delta", data: textChunk })}\n\n`);
        }
      }

      // Persist AI response
      const aiMessage = await DocumentMessage.create({
        chatSessionId: chatSession.id,
        sender: "ai",
        content: fullReply,
        sources: activeMode === "with_data" ? sources : [],
      });

      res.write(`data: ${JSON.stringify({ event: "done", data: { aiMessage, mode: activeMode } })}\n\n`);
      return res.end();
    } catch (err) {
      console.error("Streaming error:", err);
      res.write(`data: ${JSON.stringify({ event: "error", message: err.message || "Streaming failed" })}\n\n`);
      return res.end();
    }
  }

  // 4. Execute LangGraph workflow with short-term thread/session checkpointing
  let finalGraphState;
  try {
    finalGraphState = await documentChatGraph.invoke(
      {
        query: content,
        sessionId: chatSession.id,
        documentId: chatSession.documentId,
        chromaCollectionName,
        chatMode: activeMode,
        history: previousHistory,
      },
      {
        configurable: {
          thread_id: chatSession.id,
        },
      }
    );
  } catch (error) {
    console.error("LangGraph workflow error:", error);
    throw new ApiError(500, "Failed to process chat workflow: " + (error?.message || error));
  }

  const replyContent = finalGraphState.response || "I apologize, but I could not generate a response.";
  const sources = activeMode === "with_data" ? (finalGraphState.sources || []) : [];

  // 5. Save AI response to PostgreSQL
  const aiMessage = await DocumentMessage.create({
    chatSessionId: chatSession.id,
    sender: "ai",
    content: replyContent,
    sources,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { userMessage, aiMessage, mode: activeMode },
      "Message processed successfully!"
    )
  );
});

/**
 * Clear chat history / delete messages for a given session.
 */
const clearChatHistory = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!uuidRegex.test(sessionId)) {
    throw new ApiError(400, "Invalid chat session ID");
  }

  const chatSession = await DocumentChatSession.findOne({
    where: {
      id: sessionId,
      userId: req.user.id,
    },
  });

  if (!chatSession) {
    throw new ApiError(404, "Chat session not found");
  }

  await DocumentMessage.destroy({
    where: { chatSessionId: sessionId },
  });

  return res.status(200).json(
    new ApiResponse(200, null, "Chat history cleared successfully!")
  );
});

export {
  uploadPDF,
  listDocuments,
  deleteDocument,
  createChatSession,
  getChatHistory,
  clearChatHistory,
  sendMessage,
};
