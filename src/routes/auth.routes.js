const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authService = require('../services/auth.service');
const logger = require('../utils/logger');

const router = express.Router();
const minPw = authService.MIN_PASSWORD_LENGTH;

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

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset requests. Please try again later.' },
});

const validateLogin = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const validateRegister = [
  body('name').trim().notEmpty().withMessage('Full name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters').escape(),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: minPw }).withMessage(`Password must be at least ${minPw} characters`),
];

const validateForgot = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address').normalizeEmail(),
];

const validateReset = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: minPw }).withMessage(`Password must be at least ${minPw} characters`),
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

router.post('/login', loginLimiter, validateLogin, handleValidation, authController.login);
router.post('/register', registerLimiter, validateRegister, handleValidation, authController.register);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);
router.post('/forgot-password', forgotLimiter, validateForgot, handleValidation, authController.forgotPassword);
router.post('/reset-password', forgotLimiter, validateReset, handleValidation, authController.resetPassword);

module.exports = router;
