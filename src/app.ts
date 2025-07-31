import express, { Application, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { initializeDataSource } from "./config/data-source";

// Import routes
import authRoutes from "./routes/auth.routes";
import channelRoutes from "./routes/channel.routes";
import messageRoutes from "./routes/message.routes";

// Load environment variables
dotenv.config();

// Initialize Express application
const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to Telegram API" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/messages", messageRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: "Internal Server Error",
  });
});

// Initialize database connection
export const initializeApp = async (): Promise<Application> => {
  try {
    await initializeDataSource();
    console.log("Database connection established");
    return app;
  } catch (error) {
    console.error("Failed to initialize application:", error);
    throw error;
  }
};

export default app;