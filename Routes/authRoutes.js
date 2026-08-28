import express from 'express';
import { signup, login, refresh, forgotPassword, verifyOtp, resendOtp, resetPassword, logout, verifyEmail, resendVerification } from '../Controllers/authController.js';
import { validateSignup, validateLogin } from '../Validation/validation.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, first_name]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               first_name: { type: string }
 *               last_name: { type: string }
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/signup', validateSignup, signup);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', validateLogin, login);
router.post('/refresh', refresh);

router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);

export default router;
