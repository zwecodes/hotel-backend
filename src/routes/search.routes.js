const express = require('express');
const pool = require('../config/db');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/search
 * Search hotels with availability check, filtering, sorting, and pagination.
 */
router.get('/', async (req, res) => {
  try {
    const {
      check_in,
      check_out,
      keyword,
      star_rating,
      capacity,
      min_price,
      max_price,
      sort,
      page  = 1,
      limit = 10,
    } = req.query;

    if (!check_in || !check_out) {
      return res.status(400).json({
        success: false,
        message: 'check_in and check_out dates are required',
      });
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const filterConditions = [];
    const filterParams     = [];

    if (keyword) {
      filterConditions.push(`(h.name COLLATE utf8mb4_general_ci LIKE ? OR h.city COLLATE utf8mb4_general_ci LIKE ?)`);
      filterParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (star_rating) {
      filterConditions.push(`h.star_rating = ?`);
      filterParams.push(parseInt(star_rating));
    }
    if (capacity) {
      filterConditions.push(`r.capacity >= ?`);
      filterParams.push(parseInt(capacity));
    }
    if (min_price) {
      filterConditions.push(`r.price_per_night >= ?`);
      filterParams.push(parseFloat(min_price));
    }
    if (max_price) {
      filterConditions.push(`r.price_per_night <= ?`);
      filterParams.push(parseFloat(max_price));
    }

    const whereClause = filterConditions.length > 0
      ? `AND ${filterConditions.join(' AND ')}`
      : '';

    let orderClause;
    switch (sort) {
      case 'price_asc':   orderClause = 'price_from ASC';      break;
      case 'price_desc':  orderClause = 'price_from DESC';     break;
      case 'rating_desc': orderClause = 'average_rating DESC'; break;
      default:            orderClause = 'h.star_rating DESC';  break;
    }

    const mainQuery = `
      SELECT
        h.id                              AS hotel_id,
        h.name                            AS hotel_name,
        h.city,
        h.address,
        h.star_rating,
        (SELECT hi.image_url FROM hotel_images hi
         WHERE hi.hotel_id = h.id AND hi.is_primary = 1
         LIMIT 1)                         AS primary_image_url,
        ROUND(IFNULL(AVG(DISTINCT rev.rating), 0), 1) AS average_rating,
        COUNT(DISTINCT rev.id)            AS total_reviews,
        MIN(r.price_per_night)            AS price_from,
        COUNT(DISTINCT CASE
          WHEN (
            r.total_rooms - COALESCE((
              SELECT SUM(bd.quantity)
              FROM booking_details bd
              JOIN bookings b ON bd.booking_id = b.id
              WHERE bd.room_id = r.id
                AND b.status != 'cancelled'
                AND b.check_in_date  < ?
                AND b.check_out_date > ?
            ), 0)
          ) > 0 THEN r.id
        END) AS available_rooms_count
      FROM hotels h
      JOIN rooms r ON r.hotel_id = h.id
      LEFT JOIN reviews rev ON rev.hotel_id = h.id
      WHERE 1=1 ${whereClause}
      GROUP BY h.id, h.name, h.city, h.address, h.star_rating
      HAVING available_rooms_count > 0
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const mainParams = [check_out, check_in, ...filterParams, limitNum, offset];

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT h.id
        FROM hotels h
        JOIN rooms r ON r.hotel_id = h.id
        WHERE 1=1 ${whereClause}
        GROUP BY h.id
        HAVING COUNT(DISTINCT CASE
          WHEN (
            r.total_rooms - COALESCE((
              SELECT SUM(bd.quantity)
              FROM booking_details bd
              JOIN bookings b ON bd.booking_id = b.id
              WHERE bd.room_id = r.id
                AND b.status != 'cancelled'
                AND b.check_in_date  < ?
                AND b.check_out_date > ?
            ), 0)
          ) > 0 THEN r.id
        END) > 0
      ) AS available_hotels
    `;

    const countParams = [...filterParams, check_out, check_in];

    const [[hotels], [countResult]] = await Promise.all([
      pool.query(mainQuery, mainParams),
      pool.query(countQuery, countParams),
    ]);

    const total = countResult[0].total;

    res.json({
      success: true,
      page: pageNum,
      limit: limitNum,
      total,
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    logger.error('Search Error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;