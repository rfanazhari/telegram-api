import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
const authController = new AuthController();

/**
 * @route POST /api/auth/login-phone
 * @desc Start phone login process
 * @access Public
 */
router.post("/login-phone", authController.startPhoneLoginValidation, authController.startPhoneLogin);

/**
 * @route POST /api/auth/verify-phone
 * @desc Complete phone login with verification code
 * @access Public
 */
router.post("/verify-phone", authController.completePhoneLoginValidation, authController.completePhoneLogin);

/**
 * @route GET /api/auth/session
 * @desc Get session info
 * @access Private
 */
router.get("/session", authenticate, authController.getSessionInfo);

/**
 * @route POST /api/auth/logout
 * @desc Logout session
 * @access Private
 */
router.post("/logout", authenticate, authController.logout);

export default router;