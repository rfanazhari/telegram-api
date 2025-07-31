import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt";
import { AppDataSource } from "../config/data-source";
import { Session } from "../entities/Session";

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }

    // Get session from database
    const sessionRepository = AppDataSource.getRepository(Session);
    const session = await sessionRepository.findOne({ where: { id: decoded.sessionId } });

    if (!session) {
      return res.status(401).json({
        status: "error",
        message: "Session not found",
      });
    }

    // Check if session is active
    if (!session.is_active) {
      return res.status(401).json({
        status: "error",
        message: "Session is not active",
      });
    }

    // Attach session to request object
    (req as any).session = session;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};