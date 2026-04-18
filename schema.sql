-- ============================================================
-- HotelBook — Database Schema
-- Group P5 | hotel_system
-- Database: TiDB Cloud (MySQL-compatible)
-- Generated: 2026-04-18
-- ============================================================

-- Drop tables in safe order (children before parents)
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `booking_details`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `room_images`;
DROP TABLE IF EXISTS `rooms`;
DROP TABLE IF EXISTS `hotel_amenities`;
DROP TABLE IF EXISTS `hotel_images`;
DROP TABLE IF EXISTS `amenities`;
DROP TABLE IF EXISTS `hotels`;
DROP TABLE IF EXISTS `users`;

-- ============================================================
-- Table: users
-- ============================================================
CREATE TABLE `users` (
  `id`          int           NOT NULL AUTO_INCREMENT,
  `name`        varchar(100)  NOT NULL,
  `email`       varchar(150)  NOT NULL,
  `avatar_url`  varchar(500)  DEFAULT NULL,
  `password`    varchar(255)  NOT NULL,
  `role`        enum('admin','user') DEFAULT 'user',
  `created_at`  timestamp     DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  timestamp     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ============================================================
-- Table: hotels
-- ============================================================
CREATE TABLE `hotels` (
  `id`           int           NOT NULL AUTO_INCREMENT,
  `name`         varchar(150)  NOT NULL,
  `description`  text          DEFAULT NULL,
  `city`         varchar(100)  NOT NULL,
  `address`      varchar(255)  NOT NULL,
  `phone_number` varchar(20)   DEFAULT NULL,
  `star_rating`  int           DEFAULT NULL,
  `created_at`   timestamp     DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   timestamp     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_city`        (`city`),
  KEY `idx_star_rating` (`star_rating`),
  KEY `idx_created_at`  (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ============================================================
-- Table: amenities
-- ============================================================
CREATE TABLE `amenities` (
  `id`    int          NOT NULL AUTO_INCREMENT,
  `name`  varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ============================================================
-- Table: hotel_amenities
-- ============================================================
CREATE TABLE `hotel_amenities` (
  `hotel_id`   int NOT NULL,
  `amenity_id` int NOT NULL,
  PRIMARY KEY (`hotel_id`, `amenity_id`),
  KEY `fk_ha_amenity` (`amenity_id`),
  CONSTRAINT `fk_ha_hotel`   FOREIGN KEY (`hotel_id`)   REFERENCES `hotels`    (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ha_amenity` FOREIGN KEY (`amenity_id`) REFERENCES `amenities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ============================================================
-- Table: hotel_images
-- ============================================================
CREATE TABLE `hotel_images` (
  `id`         int          NOT NULL AUTO_INCREMENT,
  `hotel_id`   int          NOT NULL,
  `image_url`  varchar(500) NOT NULL,
  `is_primary` tinyint(1)   DEFAULT '0',
  `sort_order` int          DEFAULT '0',
  `created_at` timestamp    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_hi_hotel` (`hotel_id`),
  CONSTRAINT `fk_hi_hotel` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ============================================================
-- Table: rooms
-- ============================================================
CREATE TABLE `rooms` (
  `id`              int           NOT NULL AUTO_INCREMENT,
  `hotel_id`        int           NOT NULL,
  `room_type`       varchar(100)  NOT NULL,
  `price_per_night` decimal(10,2) NOT NULL,
  `capacity`        int           NOT NULL,
  `total_rooms`     int           NOT NULL,
  `description`     text          DEFAULT NULL,
  `created_at`      timestamp     DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      timestamp     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_r_hotel` (`hotel_id`),
  CONSTRAINT `fk_r_hotel` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ============================================================
-- Table: room_images
-- ============================================================
CREATE TABLE `room_images` (
  `id`         int          NOT NULL AUTO_INCREMENT,
  `room_id`    int          NOT NULL,
  `image_url`  varchar(500) NOT NULL,
  `is_primary` tinyint(1)   DEFAULT '0',
  `sort_order` int          DEFAULT '0',
  `created_at` timestamp    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_ri_room` (`room_id`),
  CONSTRAINT `fk_ri_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ============================================================
-- Table: bookings
-- ============================================================
CREATE TABLE `bookings` (
  `id`               int           NOT NULL AUTO_INCREMENT,
  `user_id`          int           NOT NULL,
  `room_id`          int           DEFAULT NULL,
  `check_in_date`    date          NOT NULL,
  `check_out_date`   date          NOT NULL,
  `number_of_guests` int           DEFAULT NULL,
  `total_price`      decimal(10,2) NOT NULL,
  `status`           enum('pending','confirmed','cancelled') DEFAULT 'pending',
  `payment_status`   enum('unpaid','paid','pay_at_hotel')    NOT NULL DEFAULT 'unpaid',
  `created_at`       timestamp     DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       timestamp     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_b_user_id`       (`user_id`),
  KEY `idx_b_status`        (`status`),
  KEY `idx_b_check_in_date` (`check_in_date`),
  CONSTRAINT `fk_b_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ============================================================
-- Table: booking_details
-- ============================================================
CREATE TABLE `booking_details` (
  `id`              int           NOT NULL AUTO_INCREMENT,
  `booking_id`      int           NOT NULL,
  `room_id`         int           NOT NULL,
  `quantity`        int           NOT NULL,
  `price_per_night` decimal(10,2) DEFAULT NULL,
  `total_price`     decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bd_booking` (`booking_id`),
  KEY `fk_bd_room`    (`room_id`),
  CONSTRAINT `fk_bd_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bd_room`    FOREIGN KEY (`room_id`)    REFERENCES `rooms`    (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ============================================================
-- Table: reviews
-- ============================================================
CREATE TABLE `reviews` (
  `id`         int       NOT NULL AUTO_INCREMENT,
  `user_id`    int       NOT NULL,
  `hotel_id`   int       NOT NULL,
  `rating`     int       NOT NULL,
  `comment`    text      DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_review` (`user_id`, `hotel_id`),
  KEY `fk_rv_hotel` (`hotel_id`),
  CONSTRAINT `fk_rv_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`  (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rv_hotel` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ============================================================
-- Table: notifications
-- ============================================================
CREATE TABLE `notifications` (
  `id`         int          NOT NULL AUTO_INCREMENT,
  `user_id`    int          NOT NULL,
  `type`       varchar(50)  NOT NULL,
  `title`      varchar(255) NOT NULL,
  `message`    text         NOT NULL,
  `is_read`    tinyint(1)   DEFAULT '0',
  `booking_id` int          DEFAULT NULL,
  `created_at` timestamp    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_n_user` (`user_id`),
  CONSTRAINT `fk_n_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ============================================================
-- End of schema
-- ============================================================