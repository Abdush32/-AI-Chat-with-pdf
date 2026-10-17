import { Router } from "express";
import {
  uploadPDF,
  listDocuments,
  deleteDocument,
  createChatSession,
  getChatHistory,
  sendMessage,
} from "../controllers/documentChat.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createSessionSchema,
  sendMessageSchema,
} from "../validations/documentChat.validation.js";

const router = Router();

// Upload PDF & Index Vectors in ChromaDB
router.post("/upload", authenticate, upload.single("pdf"), uploadPDF);

// Document Management
router.get("/documents", authenticate, listDocuments);
router.delete("/documents/:id", authenticate, deleteDocument);

// Chat Sessions & Messaging (Supports Chat WITH data & Chat WITHOUT data)
router.post("/session", authenticate, validate(createSessionSchema), createChatSession);
router.get("/chat/:sessionId", authenticate, getChatHistory);
router.post("/chat/:sessionId/message", authenticate, validate(sendMessageSchema), sendMessage);

export default router;
