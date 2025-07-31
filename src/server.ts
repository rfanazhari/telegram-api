import { initializeApp } from "./app";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get port from environment variables
const PORT = process.env.PORT || 3000;

// Start the server
const startServer = async () => {
  try {
    const app = await initializeApp();
    
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    // Handle graceful shutdown
    const gracefulShutdown = () => {
      console.log("Shutting down gracefully...");
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });

      // Force close after 10s
      setTimeout(() => {
        console.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();