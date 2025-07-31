import { Telegraf, Context } from "telegraf";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Channel } from "../entities/Channel";
import { Message } from "../entities/Message";
import * as qrcode from "qrcode";
import * as crypto from "crypto";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Interface for login session
interface LoginSession {
  token: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'completed' | 'expired';
  telegramId?: string;
  userId?: number;
}

/**
 * Service for Telegram API integration
 */
export class TelegramService {
  private bot: Telegraf;
  private userRepository = AppDataSource.getRepository(User);
  private channelRepository = AppDataSource.getRepository(Channel);
  private messageRepository = AppDataSource.getRepository(Message);
  private loginSessions: Map<string, LoginSession> = new Map();

  constructor() {
    // Initialize Telegram bot
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN is not defined in environment variables");
    }
    this.bot = new Telegraf(botToken);
    
    // Set up bot command handlers
    this.setupBotCommands();
    
    // Start the bot
    this.bot.launch().catch(err => {
      console.error("Error starting Telegram bot:", err);
    });
    
    // Enable graceful stop
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
  
  /**
   * Set up bot command handlers
   */
  private setupBotCommands() {
    // Handle /start command with deep link parameter
    this.bot.start(async (ctx) => {
      try {
        const startPayload = ctx.startPayload;
        if (startPayload) {
          // If there's a payload, it's a login attempt
          await this.handleLoginAttempt(ctx, startPayload);
        } else {
          // Regular start command
          ctx.reply('Welcome to the Telegram API bot! Scan a QR code to login.');
        }
      } catch (error) {
        console.error("Error handling start command:", error);
        ctx.reply('An error occurred. Please try again.');
      }
    });
  }
  
  /**
   * Handle login attempt from Telegram
   * @param ctx Telegram context
   * @param token Login token from deep link
   */
  private async handleLoginAttempt(ctx: Context, token: string) {
    try {
      const session = this.getLoginSession(token);
      
      if (!session) {
        ctx.reply('Invalid or expired login token. Please try again.');
        return;
      }
      
      if (session.status !== 'pending') {
        ctx.reply('This login session is no longer valid. Please try again.');
        return;
      }
      
      // Get Telegram user ID
      const telegramId = ctx.from?.id.toString();
      if (!telegramId) {
        ctx.reply('Could not identify your Telegram account. Please try again.');
        return;
      }
      
      // Update session with Telegram ID
      session.telegramId = telegramId;
      session.status = 'completed';
      this.loginSessions.set(token, session);
      
      ctx.reply('Login successful! You can now close this chat and return to the application.');
      
      // Find user by session.userId if it exists, otherwise create a new user
      if (session.userId) {
        const user = await this.userRepository.findOne({ where: { id: session.userId } });
        if (user) {
          // Update user's Telegram ID
          user.telegram_id = telegramId;
          await this.userRepository.save(user);
        }
      }
    } catch (error) {
      console.error("Error handling login attempt:", error);
      ctx.reply('An error occurred during login. Please try again.');
    }
  }
  
  /**
   * Generate a unique login token
   * @param userId Optional user ID to associate with the token
   * @returns Login token
   */
  public generateLoginToken(userId?: number): string {
    // Generate a random token
    const token = crypto.randomBytes(16).toString('hex');
    
    // Create a new login session
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes expiry
    
    const session: LoginSession = {
      token,
      createdAt: now,
      expiresAt,
      status: 'pending',
      userId
    };
    
    // Store the session
    this.loginSessions.set(token, session);
    
    // Clean up expired sessions
    this.cleanupExpiredSessions();
    
    return token;
  }
  
  /**
   * Create a deep link with the login token
   * @param token Login token
   * @returns Deep link URL
   */
  public createDeepLink(token: string): string {
    const botUsername = this.bot.botInfo?.username;
    if (!botUsername) {
      throw new Error("Bot username not available. Make sure the bot is properly initialized.");
    }
    
    return `https://t.me/${botUsername}?start=${token}`;
  }
  
  /**
   * Generate a QR code for the deep link
   * @param deepLink Deep link URL
   * @returns QR code data URL
   */
  public async generateQRCode(deepLink: string): Promise<string> {
    try {
      return await qrcode.toDataURL(deepLink);
    } catch (error) {
      console.error("Error generating QR code:", error);
      throw new Error("Failed to generate QR code");
    }
  }
  
  /**
   * Get login session by token
   * @param token Login token
   * @returns Login session or undefined if not found
   */
  public getLoginSession(token: string): LoginSession | undefined {
    const session = this.loginSessions.get(token);
    
    if (session && session.expiresAt < new Date()) {
      // Session has expired
      session.status = 'expired';
      this.loginSessions.set(token, session);
    }
    
    return session;
  }
  
  /**
   * Check login status
   * @param token Login token
   * @returns Login status and Telegram ID if completed
   */
  public checkLoginStatus(token: string) {
    const session = this.getLoginSession(token);
    
    if (!session) {
      return {
        status: "error",
        message: "Invalid login token",
        code: 400
      };
    }
    
    if (session.status === 'expired') {
      return {
        status: "error",
        message: "Login session expired",
        code: 400
      };
    }
    
    if (session.status === 'completed' && session.telegramId) {
      return {
        status: "success",
        data: {
          status: session.status,
          telegramId: session.telegramId
        },
        code: 200
      };
    }
    
    return {
      status: "success",
      data: {
        status: session.status
      },
      code: 200
    };
  }
  
  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions() {
    const now = new Date();
    
    for (const [token, session] of this.loginSessions.entries()) {
      if (session.expiresAt < now) {
        session.status = 'expired';
        
        // Remove sessions that have been expired for more than an hour
        if (session.expiresAt.getTime() + 60 * 60 * 1000 < now.getTime()) {
          this.loginSessions.delete(token);
        }
      }
    }
  }

  /**
   * Get channels for a user
   * @param userId User ID
   * @returns List of channels
   */
  async getChannels(userId: number) {
    try {
      // Get user from database
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return {
          status: "error",
          message: "User not found",
          code: 404
        };
      }

      // Check if user has Telegram ID
      if (!user.telegram_id) {
        return {
          status: "error",
          message: "User not connected to Telegram",
          code: 400
        };
      }

      // In a real implementation, we would use the Telegram API to get channels
      // For this example, we'll just return channels from the database
      const channels = await this.channelRepository.find({ 
        where: { user_id: userId },
        order: { created_at: "DESC" }
      });

      // If no channels found, return mock data for demonstration
      if (channels.length === 0) {
        // Create mock channels for demonstration
        const mockChannels = [
          {
            channel_id: "channel1",
            name: "Example Channel 1",
            user_id: userId
          },
          {
            channel_id: "channel2",
            name: "Example Channel 2",
            user_id: userId
          }
        ];

        // Save mock channels to database
        for (const channelData of mockChannels) {
          const channel = new Channel();
          channel.channel_id = channelData.channel_id;
          channel.name = channelData.name;
          channel.user_id = channelData.user_id;
          await this.channelRepository.save(channel);
        }

        // Get saved channels
        const savedChannels = await this.channelRepository.find({ 
          where: { user_id: userId },
          order: { created_at: "DESC" }
        });

        return {
          status: "success",
          data: savedChannels,
          code: 200
        };
      }

      return {
        status: "success",
        data: channels,
        code: 200
      };
    } catch (error) {
      console.error("Get channels error:", error);
      return {
        status: "error",
        message: "Internal server error",
        code: 500
      };
    }
  }

  /**
   * Get messages for a channel
   * @param userId User ID
   * @param channelId Channel ID
   * @param page Page number
   * @param limit Number of messages per page
   * @returns List of messages
   */
  async getMessages(userId: number, channelId: number, page = 1, limit = 20) {
    try {
      // Get user from database
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return {
          status: "error",
          message: "User not found",
          code: 404
        };
      }

      // Check if user has Telegram ID
      if (!user.telegram_id) {
        return {
          status: "error",
          message: "User not connected to Telegram",
          code: 400
        };
      }

      // Get channel from database
      const channel = await this.channelRepository.findOne({ 
        where: { id: channelId, user_id: userId } 
      });
      
      if (!channel) {
        return {
          status: "error",
          message: "Channel not found",
          code: 404
        };
      }

      // In a real implementation, we would use the Telegram API to get messages
      // For this example, we'll just return messages from the database
      const skip = (page - 1) * limit;
      const messages = await this.messageRepository.find({
        where: { channel_id: channelId },
        order: { timestamp: "DESC" },
        skip,
        take: limit
      });

      // If no messages found, return mock data for demonstration
      if (messages.length === 0) {
        // Create mock messages for demonstration
        const mockMessages = [];
        const now = new Date();
        
        for (let i = 0; i < 5; i++) {
          mockMessages.push({
            message_id: `msg${i + 1}`,
            content: `Example message ${i + 1} for channel ${channelId}`,
            channel_id: channelId,
            user_id: userId,
            timestamp: new Date(now.getTime() - i * 60000) // 1 minute apart
          });
        }

        // Save mock messages to database
        for (const messageData of mockMessages) {
          const message = new Message();
          message.message_id = messageData.message_id;
          message.content = messageData.content;
          message.channel_id = messageData.channel_id;
          message.user_id = messageData.user_id;
          message.timestamp = messageData.timestamp;
          await this.messageRepository.save(message);
        }

        // Get saved messages
        const savedMessages = await this.messageRepository.find({
          where: { channel_id: channelId },
          order: { timestamp: "DESC" },
          skip,
          take: limit
        });

        return {
          status: "success",
          data: {
            messages: savedMessages,
            pagination: {
              page,
              limit,
              total: savedMessages.length
            }
          },
          code: 200
        };
      }

      // Count total messages for pagination
      const total = await this.messageRepository.count({
        where: { channel_id: channelId }
      });

      return {
        status: "success",
        data: {
          messages,
          pagination: {
            page,
            limit,
            total
          }
        },
        code: 200
      };
    } catch (error) {
      console.error("Get messages error:", error);
      return {
        status: "error",
        message: "Internal server error",
        code: 500
      };
    }
  }
}