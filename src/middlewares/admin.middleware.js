const logger = require('../utils/logger');

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    logger.warn(`Unauthorized admin access attempt by user ${req.user.id}`, { role: req.user.role });
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.',
    });
  }
  next();
};

module.exports = adminMiddleware;