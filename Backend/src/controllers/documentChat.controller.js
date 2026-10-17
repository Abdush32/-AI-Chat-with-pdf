import { Op } from "sequelize";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Document from "../models/document.model.js";
import DocumentChatSession from "../models/documentChatSession.model.js";
import DocumentMessage from "../models/documentMessage.model.js";
import { extractTextFromPDF, chunkText } from "../services/pdf.service.js";
import {
  storeChunksInChroma,
  queryChroma,
  deleteCollection,
} from "../services/chroma.service.js";
import {
  generateEmbeddings,
  generateDocumentChatReply,
} from "../services/openai.service.js";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Upload a PDF file, process text chunks, store vector embeddings in ChromaDB,
 * and create document metadata & initial chat session.
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

  // 2. Chunk text
  const chunks = chunkText(rawText, 1000, 200);
  if (chunks.length === 0) {
    throw new ApiError(400, "Failed to create text chunks from PDF");
  }

  // 3. Generate embeddings for all chunks via OpenAI
  const embeddings = await generateEmbeddings(chunks);

  // 4. Generate unique collection name for ChromaDB (letters, numbers, underscore only)
  const timestamp = Date.now();
  const sanitizedUserId = req.user.id.replace(/-/g, '');
  const chromaCollectionName = `doc_${sanitizedUserId}_${timestamp}`;

  // 5. Store chunks & embeddings in ChromaDB
  const ids = chunks.map((_, idx) => `chunk_${idx}`);
  const metadatas = chunks.map((_, idx) => ({
    chunkIndex: idx,
    documentTitle: req.file.originalname,
  }));

  try {
    await storeChunksInChroma(
      chromaCollectionName,
      chunks,
      embeddings,
      metadatas,
      ids
    );
  } catch (error) {
    console.error("ChromaDB storage error:", error);
    throw new ApiError(
      500,
      "Failed to index document in ChromaDB vector store. Please ensure ChromaDB service is running."
    );
  }

  // 6. Save Document metadata in MongoDB
  const title = req.body.title || req.file.originalname.replace(/\.pdf$/i, "");
  const document = await Document.create({
    userId: req.user.id,
    title,
    filename: req.file.originalname,
    chromaCollectionName,
    fileSize: req.file.size,
    totalChunks: chunks.length,
  });

  // 7. Create default chat session for this document (RAG mode)
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
    order: [['createdAt', 'DESC']]
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
    }
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
    }
  });

  if (!chatSession) {
    throw new ApiError(404, "Chat session not found");
  }

  if (chatSession.documentId) {
    const doc = await Document.findByPk(chatSession.documentId, {
      attributes: ['title', 'filename', 'fileSize', 'totalChunks']
    });
    chatSession.dataValues.documentId = doc;
  }

  const messages = await DocumentMessage.findAll({
    where: { chatSessionId: sessionId },
    order: [['createdAt', 'ASC']]
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
 * Send message in chat session. Supports both:
 * - WITH DATA (RAG mode using ChromaDB vector search)
 * - WITHOUT DATA (Standard LLM chat without PDF document)
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
    }
  });

  if (!chatSession) {
    throw new ApiError(404, "Chat session not found");
  }

  // Determine chat mode (overridden by useDocument if explicitly sent)
  let activeMode = chatSession.mode;
  if (typeof useDocument === "boolean") {
    activeMode = useDocument ? "with_data" : "without_data";
  }

  // 1. Save user message
  const userMessage = await DocumentMessage.create({
    chatSessionId: chatSession.id,
    sender: "user",
    content,
  });

  // 2. Retrieve history (latest 20 messages for conversational context)
  const recentMessages = await DocumentMessage.findAll({
    where: { chatSessionId: chatSession.id },
    order: [['createdAt', 'DESC']],
    limit: 20
  });

  recentMessages.reverse();

  const history = recentMessages.map((msg) => ({
    role: msg.sender === "user" ? "user" : "assistant",
    content: msg.content,
  }));

  let contextChunks = [];
  let sources = [];

  // 3. If chatting WITH data and a document is associated with this session
  if (activeMode === "with_data" && chatSession.documentId) {
    const document = await Document.findOne({
      where: {
        id: chatSession.documentId,
        userId: req.user.id,
      }
    });

    if (document) {
      try {
        // Embed user query
        const queryEmbeddings = await generateEmbeddings([content]);
        const queryEmbedding = queryEmbeddings[0];

        // Search ChromaDB for relevant vector matches
        contextChunks = await queryChroma(
          document.chromaCollectionName,
          queryEmbedding,
          4
        );

        sources = contextChunks.map((chunk) => ({
          text: chunk.text,
          chunkIndex: chunk.metadata?.chunkIndex ?? 0,
        }));
      } catch (error) {
        console.error("Vector search in ChromaDB failed:", error);
        // Fallback to basic chat if vector search fails
      }
    }
  }

  // 4. Generate AI response using OpenAI service
  let replyContent;
  try {
    replyContent = await generateDocumentChatReply({
      prompt: content,
      contextChunks,
      history: history.slice(0, -1), // History excluding current prompt
      mode: activeMode,
    });
  } catch (error) {
    console.error("Error generating chat reply:", error);
    throw new ApiError(500, "Failed to generate AI response. Check OpenAI API configuration.");
  }

  // 5. Save AI response
  const aiMessage = await DocumentMessage.create({
    chatSessionId: chatSession.id,
    sender: "ai",
    content: replyContent,
    sources: activeMode === "with_data" ? sources : [],
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { userMessage, aiMessage, mode: activeMode },
      "Message processed successfully!"
    )
  );
});

export {
  uploadPDF,
  listDocuments,
  deleteDocument,
  createChatSession,
  getChatHistory,
  sendMessage,
};
