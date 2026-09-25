-- Phase 1: refresh + password-reset tokens
-- Safe to run on an existing database (no DROP).
-- Apply once: mysql ... < migrations/001_auth_tokens.sql

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id`         int           NOT NULL AUTO_INCREMENT,
  `user_id`    int           NOT NULL,
  `token_hash` char(64)      NOT NULL,
  `expires_at` datetime      NOT NULL,
  `revoked_at` datetime      DEFAULT NULL,
  `created_at` timestamp     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refresh_token_hash` (`token_hash`),
  KEY `idx_refresh_user` (`user_id`),
  KEY `idx_refresh_expires` (`expires_at`),
  CONSTRAINT `fk_refresh_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id`         int           NOT NULL AUTO_INCREMENT,
  `user_id`    int           NOT NULL,
  `token_hash` char(64)      NOT NULL,
  `expires_at` datetime      NOT NULL,
  `used_at`    datetime      DEFAULT NULL,
  `created_at` timestamp     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reset_token_hash` (`token_hash`),
  KEY `idx_reset_user` (`user_id`),
  CONSTRAINT `fk_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
