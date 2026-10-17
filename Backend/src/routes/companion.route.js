import { Router } from "express";
import {
  createCompanion,
  listCompanions,
  deleteCompanion,
  getChat,
  sendMessage,
} from "../controllers/companion.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createCompanionSchema,
  sendMessageSchema,
} from "../validations/companion.validation.js";

const router = Router();

router.post("/add", authenticate, validate(createCompanionSchema), createCompanion);
router.get("/list", authenticate, listCompanions);
router.delete("/delete/:id", authenticate, deleteCompanion);
router.get("/chat/:id", authenticate, getChat);
router.post("/chat/:id/message", authenticate, validate(sendMessageSchema), sendMessage);

export default router;
