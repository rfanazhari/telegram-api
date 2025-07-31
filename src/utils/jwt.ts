import * as jwt from "jsonwebtoken";
import { Secret, SignOptions } from "jsonwebtoken";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get JWT secret from environment variables
const JWT_SECRET: Secret = process.env.JWT_SECRET || "default_jwt_secret_key";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "1d";

/**
 * Generate a JWT token for a user
 * @param payload Data to include in the token
 * @returns JWT token
 */
export const generateToken = (payload: any): string => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as any,
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

/**
 * Verify a JWT token
 * @param token JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export const verifyToken = (token: string): any | null => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from authorization header
 * @param authHeader Authorization header value
 * @returns Token or null if not found
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  return authHeader.substring(7); // Remove "Bearer " prefix
};