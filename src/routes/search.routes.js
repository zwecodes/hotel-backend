const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {

    const {
      check_in,
      check_out,
      city,
      capacity,
      min_price,
      max_price,
      sort,
      page = 1,
      limit = 10
    } = req.query;

    if (!check_in || !check_out) {
      return res.status(400).json({
        success: false,
        message: 'Check-in and check-out dates are required'
      });
    }

    const offset = (page - 1) * limit;

    let query = `
  SELECT 
    r.id,
    r.room_type,
    r.price_per_night,
    r.capacity,
    r.total_rooms,

    h.id AS hotel_id,
    h.name AS hotel_name,
    h.city,
    h.address,
    h.star_rating,

    IFNULL(AVG(rev.rating), 0) AS average_rating,

    (
      r.total_rooms - IFNULL((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.room_id = r.id
        AND b.status != 'cancelled'
        AND (
          b.check_in_date < ?
          AND b.check_out_date > ?
        )
      ), 0)
    ) AS available_rooms

  FROM rooms r
  JOIN hotels h ON r.hotel_id = h.id
  LEFT JOIN reviews rev ON rev.hotel_id = h.id

  WHERE 1=1
`;

    let params = [check_out, check_in];

    /* FILTERS */

    if (city) {
      query += ` AND h.city = ?`;
      params.push(city);
    }

    if (capacity) {
      query += ` AND r.capacity >= ?`;
      params.push(capacity);
    }

    if (min_price) {
      query += ` AND r.price_per_night >= ?`;
      params.push(min_price);
    }

    if (max_price) {
      query += ` AND r.price_per_night <= ?`;
      params.push(max_price);
    }

/* GROUP BY (required for AVG rating) */
query += `
GROUP BY 
  r.id,
  r.room_type,
  r.price_per_night,
  r.capacity,
  r.total_rooms,
  h.id,
  h.name,
  h.city,
  h.address,
  h.star_rating
`;



/* SORTING */

if (sort === 'price_asc') {
  query += ` ORDER BY r.price_per_night ASC`;

} else if (sort === 'price_desc') {
  query += ` ORDER BY r.price_per_night DESC`;

} else if (sort === 'rating_desc') {
  query += ` ORDER BY average_rating DESC`;

} else if (sort === 'rating_asc') {
  query += ` ORDER BY average_rating ASC`;

} else {
  query += ` ORDER BY h.star_rating DESC`;
}



    /* PAGINATION */

    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [rooms] = await pool.query(query, params);

    /* FILTER AVAILABLE ROOMS */

    const availableRooms = rooms.filter(room => room.available_rooms > 0);

    /* COUNT QUERY (for pagination info) */

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM rooms r
      JOIN hotels h ON r.hotel_id = h.id
      WHERE 1=1
    `;

    let countParams = [];

    if (city) {
      countQuery += ` AND h.city = ?`;
      countParams.push(city);
    }

    if (capacity) {
      countQuery += ` AND r.capacity >= ?`;
      countParams.push(capacity);
    }

    if (min_price) {
      countQuery += ` AND r.price_per_night >= ?`;
      countParams.push(min_price);
    }

    if (max_price) {
      countQuery += ` AND r.price_per_night <= ?`;
      countParams.push(max_price);
    }

    const [countResult] = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total: countResult[0].total,
      count: availableRooms.length,
      data: availableRooms
    });

  } catch (error) {
    console.error('Search Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;