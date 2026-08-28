import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { normalizeRole, normalizeSignupInput } from '../Auth/auth.js';
import crypto from 'crypto';
import { sendEmail } from '../email.js';
import logger from '../logger.js';

const createVerificationCode = () => String(crypto.randomInt(100000, 1000000));
const hashVerificationCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

const sendVerificationCode = async (user) => {
  const code = createVerificationCode();
  await db('users').where({ id: user.id }).update({
    email_verification_code_hash: hashVerificationCode(code),
    email_verification_expires_at: new Date(Date.now() + 15 * 60 * 1000),
  });
  await sendEmail({
    email: user.email,
    subject: 'Verify your GoCart email',
    message: `Your GoCart verification code is ${code}. It expires in 15 minutes.`,
  });
};

export const signup = async (req, res) => {
  const normalizedInput = normalizeSignupInput(req.body);
  const { email, password, first_name, last_name, phone_number, role } = normalizedInput;
  const normalizedRole = normalizeRole(role || 'customer');

  if (!['customer', 'merchant'].includes(normalizedRole)) {
    return res.status(400).json({ message: 'Only customer or merchant signup is allowed' });
  }

  try {
    const userExists = await db('users').where({ email }).first();
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [user] = await db('users').insert({
      email,
      password_hash,
      first_name,
      last_name,
      phone_number,
      role: normalizedRole,
    }).returning(['id', 'email', 'first_name', 'last_name', 'role']);

    await db('carts').insert({ user_id: user.id, ...(req.tenantId ? { tenant_id: req.tenantId } : {}) });
    await sendVerificationCode(user);

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user });
  } catch (err) {
    logger.error('Signup failed', { error: err, email, requestId: req.id });
    console.error('Signup failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyEmail = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const code = String(req.body?.code || '').trim();
  if (!email || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Email and six-digit verification code are required' });
  }

  try {
    const user = await db('users').where({ email }).first();
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.email_verified_at) return res.json({ message: 'Email already verified', verified: true });
    if (!user.email_verification_expires_at || new Date(user.email_verification_expires_at) < new Date()) {
      return res.status(400).json({ message: 'Verification code expired' });
    }
    if (hashVerificationCode(code) !== user.email_verification_code_hash) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    await db('users').where({ id: user.id }).update({
      email_verified_at: db.fn.now(),
      email_verification_code_hash: null,
      email_verification_expires_at: null,
    });
    return res.json({ message: 'Email verified successfully', verified: true });
  } catch (error) {
    console.error('Email verification failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const resendVerification = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const user = await db('users').where({ email }).first();
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.email_verified_at) return res.json({ message: 'Email already verified', verified: true });
    await sendVerificationCode(user);
    return res.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('Verification resend failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db('users').where({ email }).whereNull('deleted_at').first();
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (normalizeRole(user.role) === 'merchant' && !user.email_verified_at) {
      return res.status(403).json({ message: 'Please verify your email before merchant access', code: 'EMAIL_NOT_VERIFIED' });
    }

    const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    // Store refresh token
    await db('refresh_tokens').insert({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        image_url: user.image_url,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const storedToken = await db('refresh_tokens').where({ token: refreshToken, user_id: decoded.id }).first();
    
    if (!storedToken || new Date() > new Date(storedToken.expires_at)) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // include current role in new access token
    const user = await db('users').where({ id: decoded.id }).first();
    const accessToken = jwt.sign({ id: decoded.id, role: user ? user.role : undefined }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    await db('refresh_tokens').where({ token: refreshToken, user_id: decoded.id }).del();
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await db('users').where({ email }).first();
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const code = String(crypto.randomInt(1000, 10000));
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    await db('password_reset_otps').where({ user_id: user.id, used_at: null }).update({ used_at: new Date() });
    await db('password_reset_otps').insert({
      user_id: user.id,
      email: user.email,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });
    await sendEmail({
      email: user.email,
      subject: 'Your password reset code',
      message: `Your password reset code is ${code}. It expires in 10 minutes.`,
    });
    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, code } = req.body;
  try {
    const otp = await db('password_reset_otps')
      .where({ email, used_at: null })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();
    if (!otp || otp.attempts >= 5) return res.status(400).json({ message: 'Invalid or expired code' });
    const codeHash = crypto.createHash('sha256').update(String(code || '')).digest('hex');
    if (codeHash !== otp.code_hash) {
      await db('password_reset_otps').where({ id: otp.id }).increment('attempts', 1);
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    await db('password_reset_otps').where({ id: otp.id }).update({ used_at: new Date() });
    const resetToken = jwt.sign({ id: otp.user_id, purpose: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
    return res.json({ message: 'Code verified successfully', resetToken });
  } catch (err) {
    console.error('OTP verification failed', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const resendOtp = async (req, res) => {
  return forgotPassword(req, res);
};

export const resetPassword = async (req, res) => {
  const { token, new_password } = req.body;
  try {
    if (!token || !new_password || String(new_password).length < 8) {
      return res.status(400).json({ message: 'Token and a password of at least 8 characters are required' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'password-reset') return res.status(401).json({ message: 'Invalid reset token' });
    const password_hash = await bcrypt.hash(new_password, 10);
    await db('users').where({ id: decoded.id }).update({ password_hash });
    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired reset token' });
  }
};
