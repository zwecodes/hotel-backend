const Stripe = require('stripe');

let stripe = null;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const err = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in the environment.');
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

/** Convert decimal THB (e.g. 1500.50) to Stripe's smallest unit (satang). */
function toStripeAmount(totalPrice) {
  return Math.round(Number(totalPrice) * 100);
}

module.exports = {
  getStripe,
  toStripeAmount,
};
