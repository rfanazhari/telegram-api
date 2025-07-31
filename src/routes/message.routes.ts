import { Router } from "express";
import { MessageController } from "../controllers/message.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
const messageController = new MessageController();

/**
 * @route GET /api/messages/:channelId
 * @desc Get messages for a channel
 * @access Private
 */
router.get(
  "/:channelId",
  authenticate,
  messageController.getMessagesValidation,
  messageController.getMessages
);

export default router;