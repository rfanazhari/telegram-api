import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { TelegramClientService } from "../services/telegram-client.service";
import { AppDataSource } from "../config/data-source";
import { Session } from "../entities/Session";
import { generateToken } from "../utils/jwt";

/**
 * Controller for authentication-related routes
 */
export class AuthController {
  private telegramClientService = new TelegramClientService();
  private sessionRepository = AppDataSource.getRepository(Session);
  
  /**
   * Validation rules for starting phone login
   */
  startPhoneLoginValidation = [
    body("phone").notEmpty().withMessage("Phone number is required")
      .matches(/^\+[0-9]{10,15}$/).withMessage("Phone number must be in international format (e.g., +1234567890)")
  ];

  /**
   * Validation rules for completing phone login
   */
  completePhoneLoginValidation = [
    body("sessionId").notEmpty().withMessage("Session ID is required")
      .isInt().withMessage("Session ID must be an integer"),
    body("phoneCode").notEmpty().withMessage("Verification code is required")
      .isString().withMessage("Verification code must be a string"),
    body("phoneCodeHash").notEmpty().withMessage("Phone code hash is required")
      .isString().withMessage("Phone code hash must be a string"),
    body("password").optional().isString().withMessage("Password must be a string")
  ];

  /**
   * Validation rules for login
   */
  loginValidation = [
    body("emailOrMsisdn").notEmpty().withMessage("Email or mobile number is required"),
    body("password").notEmpty().withMessage("Password is required")
  ];

  /**
   * Start phone login process
   */
  startPhoneLogin = async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: "error",
          errors: errors.array()
        });
      }

      const { phone } = req.body;
      const result = await this.telegramClientService.startPhoneLogin(phone);
      
      return res.status(result.code).json({
        status: result.status,
        ...(result.data ? { data: result.data } : { message: result.message })
      });
    } catch (error) {
      console.error("Start phone login controller error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error"
      });
    }
  };

  /**
   * Complete phone login process with verification code
   */
  completePhoneLogin = async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: "error",
          errors: errors.array()
        });
      }

      const { sessionId, phoneCode, phoneCodeHash, password } = req.body;
      const result = await this.telegramClientService.completePhoneLogin(
        sessionId,
        phoneCode,
        phoneCodeHash,
        password
      );
      
      // If login was successful, generate JWT token
      if (result.status === "success" && result.data) {
        const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
        
        if (session) {
          const token = generateToken({
            sessionId: session.id,
            telegramId: session.telegram_id
          });
          
          // Create a new response object with all the data from result.data plus the token
          return res.status(result.code).json({
            status: result.status,
            data: {
              ...result.data,
              token
            }
          });
        }
      }
      
      return res.status(result.code).json({
        status: result.status,
        ...(result.data ? { data: result.data } : { message: result.message })
      });
    } catch (error) {
      console.error("Complete phone login controller error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error"
      });
    }
  };

  /**
   * Get session info
   */
  getSessionInfo = async (req: Request, res: Response) => {
    try {
      const sessionId = (req as any).session.id;
      const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
      
      if (!session) {
        return res.status(404).json({
          status: "error",
          message: "Session not found"
        });
      }
      
      return res.status(200).json({
        status: "success",
        data: {
          id: session.id,
          phone: session.phone,
          telegramId: session.telegram_id,
          isActive: session.is_active,
          lastLogin: session.last_login,
          createdAt: session.created_at,
          updatedAt: session.updated_at
        }
      });
    } catch (error) {
      console.error("Get session info controller error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error"
      });
    }
  };

  /**
   * Logout from Telegram and clear session
   */
  logout = async (req: Request, res: Response) => {
    try {
      const session = (req as any).session;
      
      // Only attempt to logout from Telegram if the session is active and has a session string
      if (session.is_active && session.session_string) {
        // Logout from Telegram
        const result = await this.telegramClientService.logout(session.id);
        
        if (result.status === "error") {
          return res.status(result.code).json({
            status: result.status,
            message: result.message
          });
        }
      } else {
        // If session is not active or doesn't have a session string, just mark it as inactive
        session.is_active = false;
        session.session_string = null;
        await this.sessionRepository.save(session);
      }
      
      return res.status(200).json({
        status: "success",
        message: "Logged out successfully"
      });
    } catch (error) {
      console.error("Logout controller error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error"
      });
    }
  };
}