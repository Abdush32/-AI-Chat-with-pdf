import { Op } from "sequelize";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Companion from "../models/companion.model.js";
import ChatSession from "../models/chatSession.model.js";
import Message from "../models/message.model.js";
import { generateCompanionReply } from "../services/openai.service.js";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Create a new companion and associated chat session.
 */
const createCompanion = asyncHandler(async (req, res) => {
  const { name, mood, description } = req.body;

  const companion = await Companion.create({
    userId: req.user.id,
    name,
    mood,
    description,
  });

  const chatSession = await ChatSession.create({
    userId: req.user.id,
    companionId: companion.id,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      { companion, chatSession },
      "Companion created successfully!"
    )
  );
});

/**
 * List all companions owned by the user.
 */
const listCompanions = asyncHandler(async (req, res) => {
  const companions = await Companion.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']]
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { companions },
      "Companions retrieved successfully!"
    )
  );
});

/**
 * Delete a companion, their chat sessions, and all messages.
 */
const deleteCompanion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!uuidRegex.test(id)) {
    throw new ApiError(400, "Invalid companion ID");
  }

  const companion = await Companion.findOne({ where: { id, userId: req.user.id } });
  if (!companion) {
    throw new ApiError(404, "Companion not found");
  }

  // Find associated chat sessions
  const chatSessions = await ChatSession.findAll({ where: { companionId: id, userId: req.user.id } });
  const chatSessionIds = chatSessions.map((session) => session.id);

  // Delete all messages associated with those chat sessions
  if (chatSessionIds.length > 0) {
    await Message.destroy({ where: { chatSessionId: { [Op.in]: chatSessionIds } } });
  }

  // Delete the chat sessions
  await ChatSession.destroy({ where: { companionId: id, userId: req.user.id } });

  // Delete the companion
  await companion.destroy();

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Companion and all associated chats and messages deleted successfully!"
    )
  );
});

/**
 * Retrieve companion details and the previous chat messages.
 */
const getChat = asyncHandler(async (req, res) => {
  const { id } = req.params; // Companion ID

  if (!uuidRegex.test(id)) {
    throw new ApiError(400, "Invalid companion ID");
  }

  const companion = await Companion.findOne({ where: { id, userId: req.user.id } });
  if (!companion) {
    throw new ApiError(404, "Companion not found");
  }

  let chatSession = await ChatSession.findOne({ where: { companionId: id, userId: req.user.id } });
  if (!chatSession) {
    chatSession = await ChatSession.create({
      userId: req.user.id,
      companionId: id,
    });
  }

  const messages = await Message.findAll({
    where: { chatSessionId: chatSession.id },
    order: [['createdAt', 'ASC']]
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { companion, chatSession, messages },
      "Chat history retrieved successfully!"
    )
  );
});

/**
 * Send a user message and generate/save the AI companion's reply.
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params; // Companion ID
  const { content } = req.body;

  if (!uuidRegex.test(id)) {
    throw new ApiError(400, "Invalid companion ID");
  }

  const companion = await Companion.findOne({ where: { id, userId: req.user.id } });
  if (!companion) {
    throw new ApiError(404, "Companion not found");
  }

  let chatSession = await ChatSession.findOne({ where: { companionId: id, userId: req.user.id } });
  if (!chatSession) {
    chatSession = await ChatSession.create({
      userId: req.user.id,
      companionId: id,
    });
  }

  // 1. Create and save the user message
  const userMessage = await Message.create({
    chatSessionId: chatSession.id,
    sender: "user",
    content,
  });

  // 2. Fetch the latest 15-20 messages to send to OpenAI for context
  const recentMessages = await Message.findAll({
    where: { chatSessionId: chatSession.id },
    order: [['createdAt', 'DESC']],
    limit: 20
  });

  // Reverse to maintain chronological order (oldest to newest) for OpenAI API context
  recentMessages.reverse();

  // Map to the required OpenAI API history format
  const history = recentMessages.map((msg) => ({
    role: msg.sender === "user" ? "user" : "assistant",
    content: msg.content,
  }));

  // 3. Call OpenAI service to generate a reply
  let replyContent;
  try {
    replyContent = await generateCompanionReply(
      companion.name,
      companion.mood,
      companion.description,
      history
    );
  } catch (error) {
    console.error("Error generating companion reply:", error);
    throw new ApiError(
      500,
      "Failed to generate AI reply. Please check if the OpenAI API key is valid or has sufficient quota."
    );
  }

  // 4. Create and save the AI message
  const aiMessage = await Message.create({
    chatSessionId: chatSession.id,
    sender: "ai",
    content: replyContent,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { userMessage, aiMessage },
      "Message processed successfully!"
    )
  );
});

export { createCompanion, listCompanions, deleteCompanion, getChat, sendMessage };
