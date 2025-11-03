const express = require('express');
const router = express.Router();
const { getLocations } = require('../controllers/common/location.controller');

router.get('/', getLocations);

module.exports = router;
