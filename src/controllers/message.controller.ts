import { Request, Response } from "express";
import { TelegramClientService } from "../services/telegram-client.service";
import { query, validationResult } from "express-validator";

/**
 * Controller for message-related routes
 */
export class MessageController {
  private telegramClientService = new TelegramClientService();

  /**
   * Validation rules for getting messages
   */
  getMessagesValidation = [
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("offsetId").optional().isInt({ min: 0 }).withMessage("Offset ID must be a non-negative integer")
  ];

  /**
   * Get messages for a channel
   */
  getMessages = async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: "error",
          errors: errors.array()
        });
      }

      const session = (req as any).session;
      const channelId = parseInt(req.params.channelId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offsetId = req.query.offsetId ? parseInt(req.query.offsetId as string) : 0;

      if (isNaN(channelId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid channel ID"
        });
      }

      const result = await this.telegramClientService.getMessages(session.id, channelId, limit, offsetId);
      
      return res.status(result.code).json({
        status: result.status,
        ...(result.data ? { data: result.data } : { message: result.message })
      });
    } catch (error) {
      console.error("Get messages controller error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error"
      });
    }
  };
}