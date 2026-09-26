const logger = require('../utils/logger');
const paymentService = require('../services/payment.service');
const { getStripe } = require('../config/stripe');

/**
 * Stripe webhook handler.
 * Must be mounted with express.raw({ type: 'application/json' }).
 */
async function stripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ success: false, message: 'Webhook not configured' });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    logger.warn('Stripe webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const result = await paymentService.handleWebhookEvent(event);
    logger.info('Stripe webhook processed', { type: event.type, result });
    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook handler error', {
      type: event.type,
      error: error.message,
    });
    res.status(500).json({ success: false, message: 'Webhook handler failed' });
  }
}

module.exports = stripeWebhook;
