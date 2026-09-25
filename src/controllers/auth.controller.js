const authService = require('../services/auth.service');
const logger = require('../utils/logger');
const { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } = require('../utils/cookies');

const authController = {
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and password are required',
        });
      }

      const user = await authService.register(name, email, password);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user,
      });
    } catch (error) {
      logger.error('Register Error', { error: error.message });

      if (
        error.message === 'Email already exists' ||
        error.message.startsWith('Password must be at least')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error during registration',
      });
    }
  },

  async login(req, res) {
    try {
      const { email, password, remember } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      const result = await authService.login(email, password, {
        remember: Boolean(remember),
      });

      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        remember: Boolean(remember),
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: result.user,
      });
    } catch (error) {
      logger.error('Login Error', { error: error.message });

      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error during login',
      });
    }
  },

  async refresh(req, res) {
    try {
      const raw = req.cookies?.[REFRESH_COOKIE];
      const result = await authService.rotateRefreshToken(raw);

      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        remember: false,
      });

      res.status(200).json({
        success: true,
        user: result.user,
      });
    } catch (error) {
      clearAuthCookies(res);
      logger.warn('Refresh failed', { error: error.message });
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please sign in again.',
      });
    }
  },

  async logout(req, res) {
    try {
      const raw = req.cookies?.[REFRESH_COOKIE];
      await authService.revokeRefreshToken(raw);
    } catch (error) {
      logger.warn('Logout revoke failed', { error: error.message });
    }

    clearAuthCookies(res);
    res.status(200).json({ success: true, message: 'Logged out' });
  },

  async me(req, res) {
    try {
      const user = await authService.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.status(200).json({ success: true, user });
    } catch (error) {
      logger.error('Me Error', { error: error.message });
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const result = await authService.requestPasswordReset(email);

      const payload = {
        success: true,
        message: 'If that email exists, a reset link has been created.',
      };

      // Dev convenience — never expose reset URL in production responses
      if (result.resetUrl) {
        payload.dev_reset_url = result.resetUrl;
      }

      res.status(200).json(payload);
    } catch (error) {
      logger.error('Forgot Password Error', { error: error.message });
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required',
        });
      }

      await authService.resetPassword(token, password);
      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: 'Password updated. Please sign in.',
      });
    } catch (error) {
      logger.error('Reset Password Error', { error: error.message });

      if (
        error.message === 'Invalid or expired reset token' ||
        error.message.startsWith('Password must be at least')
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }

      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};

module.exports = authController;
