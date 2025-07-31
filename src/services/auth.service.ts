import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { TelegramService } from "./telegram.service";

/**
 * Service for authentication-related operations
 */
export class AuthService {
  private userRepository = AppDataSource.getRepository(User);
  private telegramService = new TelegramService();

  /**
   * Authenticate a user with email/msisdn and password
   * @param emailOrMsisdn Email or mobile number
   * @param password Plain text password
   * @returns User data and JWT token if authentication is successful
   */
  async login(emailOrMsisdn: string, password: string) {
    try {
      // Find user by email or msisdn
      const user = await this.userRepository.findOne({
        where: [
          { email: emailOrMsisdn },
          { msisdn: emailOrMsisdn }
        ]
      });

      if (!user) {
        return {
          status: "error",
          message: "Invalid credentials",
          code: 401
        };
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return {
          status: "error",
          message: "Invalid credentials",
          code: 401
        };
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        msisdn: user.msisdn
      });

      // Return user data and token
      return {
        status: "success",
        data: {
          user: {
            id: user.id,
            email: user.email,
            msisdn: user.msisdn,
            telegram_id: user.telegram_id
          },
          token
        },
        code: 200
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        status: "error",
        message: "Internal server error",
        code: 500
      };
    }
  }

  /**
   * Login with QR code using Telegram
   * @param userId Optional user ID to associate with the login attempt
   * @returns QR code data URL and token for status checking
   */
  async loginWithQR(userId?: number) {
    try {
      // Generate a unique login token
      const token = this.telegramService.generateLoginToken(userId);
      
      // Create a deep link with the token
      const deepLink = this.telegramService.createDeepLink(token);
      
      // Generate a QR code for the deep link
      const qrCodeDataUrl = await this.telegramService.generateQRCode(deepLink);
      
      return {
        status: "success",
        data: {
          qrCode: qrCodeDataUrl,
          token: token,
          expiresIn: 600 // 10 minutes in seconds
        },
        code: 200
      };
    } catch (error) {
      console.error("Login with QR error:", error);
      return {
        status: "error",
        message: "Failed to generate QR code",
        code: 500
      };
    }
  }
  
  /**
   * Check the status of a QR code login attempt
   * @param token Login token
   * @returns Login status and user data if completed
   */
  async checkLoginStatus(token: string) {
    try {
      // Check login status from Telegram service
      const statusResult = this.telegramService.checkLoginStatus(token);
      
      // If login is completed, get user data and generate JWT token
      if (statusResult.status === "success" && 
          statusResult.data?.status === "completed" && 
          statusResult.data?.telegramId) {
        
        // Find or create user with the Telegram ID
        let user = await this.userRepository.findOne({
          where: { telegram_id: statusResult.data.telegramId }
        });
        
        if (!user) {
          // If no user found with this Telegram ID, create a new one or return error
          return {
            status: "error",
            message: "User not found",
            code: 404
          };
        }
        
        // Generate JWT token
        const token = generateToken({
          userId: user.id,
          email: user.email,
          msisdn: user.msisdn
        });
        
        // Return user data and token
        return {
          status: "success",
          data: {
            loginStatus: "completed",
            user: {
              id: user.id,
              email: user.email,
              msisdn: user.msisdn,
              telegram_id: user.telegram_id
            },
            token
          },
          code: 200
        };
      }
      
      // Return the status from Telegram service
      return statusResult;
    } catch (error) {
      console.error("Check login status error:", error);
      return {
        status: "error",
        message: "Internal server error",
        code: 500
      };
    }
  }

  /**
   * Logout a user (invalidate token)
   * @param userId User ID
   * @returns Success message
   */
  async logout(userId: number) {
    try {
      // In a real implementation, we might add the token to a blacklist
      // or use Redis to store invalidated tokens
      
      return {
        status: "success",
        message: "Logged out successfully",
        code: 200
      };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        status: "error",
        message: "Internal server error",
        code: 500
      };
    }
  }
}