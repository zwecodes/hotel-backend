-- Phase 2: Stripe payment columns on bookings
-- Run once against an existing database. Do not re-run if columns already exist.

ALTER TABLE `bookings`
  ADD COLUMN `stripe_checkout_session_id` varchar(255) DEFAULT NULL,
  ADD COLUMN `stripe_payment_intent_id` varchar(255) DEFAULT NULL;

ALTER TABLE `bookings`
  ADD UNIQUE KEY `uq_stripe_checkout_session` (`stripe_checkout_session_id`);

ALTER TABLE `bookings`
  ADD UNIQUE KEY `uq_stripe_payment_intent` (`stripe_payment_intent_id`);
