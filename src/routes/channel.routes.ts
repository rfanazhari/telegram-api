import { Router } from "express";
import { ChannelController } from "../controllers/channel.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
const channelController = new ChannelController();

/**
 * @route GET /api/channels
 * @desc Get channels for the authenticated user
 * @access Private
 */
router.get("/", authenticate, channelController.getChannels);

export default router;