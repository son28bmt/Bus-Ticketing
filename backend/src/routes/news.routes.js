const express = require('express');
const router = express.Router();
const {
  getPublishedNews,
  getNewsBySlug
} = require('../controllers/news.controller');

// ✅ Public news routes
router.get('/', getPublishedNews); // GET /api/news?page=1&limit=10&category=TRAFFIC
router.get('/:slug', getNewsBySlug); // GET /api/news/slug-bai-viet

module.exports = router;