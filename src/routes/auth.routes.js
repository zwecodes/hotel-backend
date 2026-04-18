const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const logger = require('../utils/logger');

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit hit on login', { ip: req.ip });
    res.status(429).json(options.message);
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Please try again in an hour.' },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit hit on register', { ip: req.ip });
    res.status(429).json(options.message);
  },
});

// ── Validation middleware ─────────────────────────────────
const validateLogin = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const validateRegister = [
  body('name').trim().notEmpty().withMessage('Full name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters').escape(),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

// ── Routes ────────────────────────────────────────────────
router.post('/login', loginLimiter, validateLogin, handleValidation, authController.login);
router.post('/register', registerLimiter, validateRegister, handleValidation, authController.register);

router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

module.exports = router;