const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logger = require('../utils/logger');
const {
  ACCESS_MAX_AGE_MS,
  REFRESH_MAX_AGE_MS,
  REMEMBER_MAX_AGE_MS,
} = require('../utils/cookies');

const MIN_PASSWORD_LENGTH = 10;

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url || null,
  };
}

const authService = {
  MIN_PASSWORD_LENGTH,

  async register(name, email, password) {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new Error('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    return {
      id: result.insertId,
      name,
      email,
    };
  },

  async login(email, password, { remember = false } = {}) {
    const [users] = await pool.query(
      'SELECT id, name, email, password, role, avatar_url FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT secret not configured');
    }

    const accessToken = signAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, { remember });

    return {
      accessToken,
      refreshToken,
      user: publicUser(user),
    };
  },

  async createRefreshToken(userId, { remember = false } = {}) {
    const raw = crypto.randomBytes(48).toString('hex');
    const tokenHash = hashToken(raw);
    const maxAge = remember ? REMEMBER_MAX_AGE_MS : REFRESH_MAX_AGE_MS;
    const expiresAt = new Date(Date.now() + maxAge);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
      [userId, tokenHash, expiresAt]
    );

    return raw;
  },

  async rotateRefreshToken(rawRefreshToken) {
    if (!rawRefreshToken) {
      throw new Error('No refresh token');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT id, user_id, expires_at, revoked_at
         FROM refresh_tokens
         WHERE token_hash = ?
         FOR UPDATE`,
        [tokenHash]
      );

      if (rows.length === 0) {
        throw new Error('Invalid refresh token');
      }

      const stored = rows[0];

      if (stored.revoked_at) {
        throw new Error('Refresh token revoked');
      }

      if (new Date(stored.expires_at) <= new Date()) {
        throw new Error('Refresh token expired');
      }

      await connection.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?`,
        [stored.id]
      );

      const [users] = await connection.query(
        `SELECT id, name, email, role, avatar_url FROM users WHERE id = ?`,
        [stored.user_id]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];
      const accessToken = signAccessToken(user);

      const newRaw = crypto.randomBytes(48).toString('hex');
      const newHash = hashToken(newRaw);
      const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);

      await connection.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
        [user.id, newHash, expiresAt]
      );

      await connection.commit();

      return {
        accessToken,
        refreshToken: newRaw,
        user: publicUser(user),
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async revokeRefreshToken(rawRefreshToken) {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE token_hash = ? AND revoked_at IS NULL`,
      [tokenHash]
    );
  },

  async revokeAllRefreshTokens(userId) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = ? AND revoked_at IS NULL`,
      [userId]
    );
  },

  async getUserById(userId) {
    const [users] = await pool.query(
      `SELECT id, name, email, role, avatar_url FROM users WHERE id = ?`,
      [userId]
    );
    if (users.length === 0) return null;
    return publicUser(users[0]);
  },

  async requestPasswordReset(email, frontendBaseUrl) {
    const [users] = await pool.query(
      `SELECT id, email FROM users WHERE email = ?`,
      [email]
    );

    // Always succeed outwardly — do not leak whether the email exists
    if (users.length === 0) {
      return { queued: false };
    }

    const user = users[0];
    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `UPDATE password_reset_tokens SET used_at = NOW()
       WHERE user_id = ? AND used_at IS NULL`,
      [user.id]
    );

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
      [user.id, tokenHash, expiresAt]
    );

    const base = (frontendBaseUrl || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${base}/auth/reset-password?token=${raw}`;

    // No mail provider yet — log link in non-production so you can test the flow
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Password reset link (dev only)', { email: user.email, resetUrl });
    } else {
      logger.info('Password reset token created', { userId: user.id });
    }

    return { queued: true, resetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined };
  },

  async resetPassword(rawToken, newPassword) {
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const tokenHash = hashToken(rawToken);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT id, user_id, expires_at, used_at
         FROM password_reset_tokens
         WHERE token_hash = ?
         FOR UPDATE`,
        [tokenHash]
      );

      if (rows.length === 0) {
        throw new Error('Invalid or expired reset token');
      }

      const stored = rows[0];

      if (stored.used_at || new Date(stored.expires_at) <= new Date()) {
        throw new Error('Invalid or expired reset token');
      }

      const hashed = await bcrypt.hash(newPassword, 12);

      await connection.query(
        `UPDATE users SET password = ? WHERE id = ?`,
        [hashed, stored.user_id]
      );

      await connection.query(
        `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?`,
        [stored.id]
      );

      await connection.query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE user_id = ? AND revoked_at IS NULL`,
        [stored.user_id]
      );

      await connection.commit();
      return { userId: stored.user_id };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },
};

module.exports = authService;
