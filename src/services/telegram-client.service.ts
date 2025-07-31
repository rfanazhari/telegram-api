import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { AppDataSource } from "../config/data-source";
import { Session } from "../entities/Session";
import { Channel } from "../entities/Channel";
import { Message } from "../entities/Message";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get Telegram API credentials from environment variables
const API_ID = parseInt(process.env.TELEGRAM_API_ID || "0", 10);
const API_HASH = process.env.TELEGRAM_API_HASH || "";

if (!API_ID || !API_HASH) {
  throw new Error("TELEGRAM_API_ID and TELEGRAM_API_HASH must be defined in environment variables");
}

/**
 * Service for Telegram client integration using gramjs
 */
export class TelegramClientService {
  private sessionRepository = AppDataSource.getRepository(Session);
  private channelRepository = AppDataSource.getRepository(Channel);
  private messageRepository = AppDataSource.getRepository(Message);

  /**
   * Create a new Telegram client with the given session string
   * @param sessionString Session string (optional)
   * @returns TelegramClient instance
   */
  private createClient(sessionString?: string): TelegramClient {
    const stringSession = new StringSession(sessionString || "");
    return new TelegramClient(stringSession, API_ID, API_HASH, {
      connectionRetries: 5,
    });
  }

  /**
   * Start the login process with a phone number
   * @param phone Phone number with country code (e.g., +1234567890)
   * @returns Code hash and phone code length for verification
   */
  async startPhoneLogin(phone: string) {
    try {
      // Create a new client with an empty session
      const client = this.createClient();
      
      // Connect to Telegram
      await client.connect();
      
      // Start the login process
      const result = await client.sendCode(
        { apiId: API_ID, apiHash: API_HASH },
        phone
      );
      
      // Store the phone code hash for later verification
      const phoneCodeHash = result.phoneCodeHash;
      
      // Create or update session in database
      let session = await this.sessionRepository.findOne({ where: { phone } });
      
      if (!session) {
        // Create new session
        session = new Session();
        session.phone = phone;
        session.is_active = false;
      }
      
      // Save session
      await this.sessionRepository.save(session);
      
      // Disconnect client
      await client.disconnect();
      
      return {
        status: "success",
        data: {
          phoneCodeHash,
          phoneCodeLength: 5, // Default length for Telegram verification codes
          sessionId: session.id,
        },
        code: 200,
      };
    } catch (error) {
      console.error("Start phone login error:", error);
      return {
        status: "error",
        message: (error as Error).message || "Failed to start phone login",
        code: 500,
      };
    }
  }

  /**
   * Complete the login process with the verification code
   * @param sessionId Session ID
   * @param phoneCode Verification code received via SMS/Telegram
   * @param phoneCodeHash Phone code hash from startPhoneLogin
   * @param password 2FA password (if enabled)
   * @returns Session data
   */
  async completePhoneLogin(
    sessionId: number,
    phoneCode: string,
    phoneCodeHash: string,
    password?: string
  ) {
    try {
      // Get session from database
      const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
      
      if (!session) {
        return {
          status: "error",
          message: "Session not found",
          code: 404,
        };
      }
      
      // Create a new client with an empty session
      const client = this.createClient();
      
      // Connect to Telegram
      await client.connect();
      
      // Sign in with the phone code
      let user;
      try {
        // Use the correct signInUser method with API credentials
        user = await client.signInUser(
          { apiId: API_ID, apiHash: API_HASH },
          {
            phoneNumber: async () => session.phone,
            phoneCode: async () => phoneCode,
            onError: (err) => console.log(err),
          }
        );
      } catch (error) {
        // Check if 2FA is required
        if ((error as Error).message.includes("PASSWORD_REQUIRED") && password) {
          // Use the correct signInWithPassword method with API credentials
          user = await client.signInWithPassword(
            { apiId: API_ID, apiHash: API_HASH },
            {
              password: async () => password || "",
              onError: (err) => console.log(err),
            }
          );
        } else {
          return {
            status: "error",
            message: (error as Error).message || "Failed to complete phone login",
            code: 500,
          };
        }
      }
      
      // Get the session string
      // StringSession.save() returns a string, but TypeScript might infer it as void
      const sessionString: string = client.session.save() as unknown as string;
      
      // Update session in database
      session.session_string = sessionString;
      session.telegram_id = user.id.toString();
      session.is_active = true;
      session.last_login = new Date();
      
      await this.sessionRepository.save(session);
      
      // Disconnect client
      await client.disconnect();
      
      return {
        status: "success",
        data: {
          sessionId: session.id,
          telegramId: session.telegram_id,
        },
        code: 200,
      };
    } catch (error) {
      console.error("Complete phone login error:", error);
      return {
        status: "error",
        message: (error as Error).message || "Failed to complete phone login",
        code: 500,
      };
    }
  }

  /**
   * Get channels for a session
   * @param sessionId Session ID
   * @returns List of channels
   */
  async getChannels(sessionId: number) {
    try {
      // Get session from database
      const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
      
      if (!session) {
        return {
          status: "error",
          message: "Session not found",
          code: 404,
        };
      }
      
      if (!session.session_string) {
        return {
          status: "error",
          message: "Session not authenticated",
          code: 400,
        };
      }
      
      // Create a client with the session string
      const client = this.createClient(session.session_string);
      
      // Connect to Telegram
      await client.connect();
      
      // Get dialogs (chats, channels, etc.)
      const dialogs = await client.getDialogs({});
      
      // Filter for channels and supergroups
      const channels = dialogs.filter(dialog => {
        const entity = dialog.entity;
        if (!entity) return false;
        
        return entity.className === "Channel" || 
               (entity.className === "Chat" && (entity as any).megagroup);
      });
      
      // Save channels to database
      const savedChannels = [];
      
      for (const dialog of channels) {
        const entity = dialog.entity;
        if (!entity) continue; // Skip if entity is undefined
        
        // Check if channel already exists in database
        let channel = await this.channelRepository.findOne({
          where: {
            channel_id: entity.id.toString(),
            session_id: session.id,
          },
        });
        
        if (!channel) {
          // Create new channel
          channel = new Channel();
          channel.channel_id = entity.id.toString();
          channel.session_id = session.id;
        }
        
        // Update channel name
        channel.name = (entity as any).title; // Use type assertion for title property
        
        // Save channel
        await this.channelRepository.save(channel);
        savedChannels.push(channel);
      }
      
      // Disconnect client
      await client.disconnect();
      
      return {
        status: "success",
        data: savedChannels,
        code: 200,
      };
    } catch (error) {
      console.error("Get channels error:", error);
      return {
        status: "error",
        message: (error as Error).message || "Failed to get channels",
        code: 500,
      };
    }
  }

  /**
   * Get messages for a channel
   * @param sessionId Session ID
   * @param channelId Channel ID
   * @param limit Number of messages to retrieve
   * @param offsetId Message ID to start from
   * @returns List of messages
   */
  async getMessages(
    sessionId: number,
    channelId: number,
    limit = 20,
    offsetId = 0
  ) {
    try {
      // Get session from database
      const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
      
      if (!session) {
        return {
          status: "error",
          message: "Session not found",
          code: 404,
        };
      }
      
      if (!session.session_string) {
        return {
          status: "error",
          message: "Session not authenticated",
          code: 400,
        };
      }
      
      // Get channel from database
      const channel = await this.channelRepository.findOne({
        where: { id: channelId, session_id: session.id },
      });
      
      if (!channel) {
        return {
          status: "error",
          message: "Channel not found",
          code: 404,
        };
      }
      
      // Create a client with the session string
      const client = this.createClient(session.session_string);
      
      // Connect to Telegram
      await client.connect();
      
      // Get messages from channel
      const messages = await client.getMessages(channel.channel_id, {
        limit,
        offsetId,
      });
      
      // Save messages to database
      const savedMessages = [];
      
      for (const msg of messages) {
        if (!msg.message) continue; // Skip empty messages
        
        // Check if message already exists in database
        let message = await this.messageRepository.findOne({
          where: {
            message_id: msg.id.toString(),
            channel_id: channel.id,
          },
        });
        
        if (!message) {
          // Create new message
          message = new Message();
          message.message_id = msg.id.toString();
          message.channel_id = channel.id;
          message.session_id = session.id;
        }
        
        // Update message content
        message.content = msg.message;
        message.timestamp = new Date(msg.date * 1000);
        
        // Save message
        await this.messageRepository.save(message);
        savedMessages.push(message);
      }
      
      // Disconnect client
      await client.disconnect();
      
      return {
        status: "success",
        data: {
          messages: savedMessages,
          pagination: {
            limit,
            offsetId,
            hasMore: messages.length === limit,
          },
        },
        code: 200,
      };
    } catch (error) {
      console.error("Get messages error:", error);
      return {
        status: "error",
        message: (error as Error).message || "Failed to get messages",
        code: 500,
      };
    }
  }

  /**
   * Logout from Telegram
   * @param sessionId Session ID
   * @returns Success status
   */
  async logout(sessionId: number) {
    try {
      // Get session from database
      const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
      
      if (!session) {
        return {
          status: "error",
          message: "Session not found",
          code: 404,
        };
      }
      
      if (!session.session_string) {
        return {
          status: "error",
          message: "Session not authenticated",
          code: 400,
        };
      }
      
      // Create a client with the session string
      const client = this.createClient(session.session_string);
      
      // Connect to Telegram
      await client.connect();
      
      // Use type assertion to tell TypeScript that signOut exists on the client
      await (client as any).signOut();
      
      // Update session in database
      session.session_string = ""; // Use empty string instead of null
      session.is_active = false;
      
      await this.sessionRepository.save(session);
      
      return {
        status: "success",
        message: "Logged out successfully",
        code: 200,
      };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        status: "error",
        message: (error as Error).message || "Failed to logout",
        code: 500,
      };
    }
  }
}