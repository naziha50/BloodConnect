const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/donors?blood_group=O+&radius=10&lat=xx&lng=xx
router.get('/', async (req, res) => {
  const { blood_group, availability } = req.query;
  let query  = 'SELECT id, name, phone, blood_group, address, is_available FROM users WHERE 1=1';
  const vals = [];

  if (blood_group) { vals.push(blood_group); query += ` AND blood_group = $${vals.length}`; }
  if (availability === 'available')   query += ' AND is_available = true';
  if (availability === 'unavailable') query += ' AND is_available = false';

  const result = await pool.query(query, vals);
  res.json(result.rows);
});

module.exports = router;