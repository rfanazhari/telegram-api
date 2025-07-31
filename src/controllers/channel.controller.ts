import { Request, Response } from "express";
import { TelegramClientService } from "../services/telegram-client.service";

/**
 * Controller for channel-related routes
 */
export class ChannelController {
  private telegramClientService = new TelegramClientService();

  /**
   * Get channels for the authenticated session
   */
  getChannels = async (req: Request, res: Response) => {
    try {
      const session = (req as any).session;
      const result = await this.telegramClientService.getChannels(session.id);
      
      return res.status(result.code).json({
        status: result.status,
        ...(result.data ? { data: result.data } : { message: result.message })
      });
    } catch (error) {
      console.error("Get channels controller error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error"
      });
    }
  };
}