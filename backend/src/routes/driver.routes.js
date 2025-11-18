const express = require('express');
const router = express.Router();

const { authenticateToken, requireDriver } = require('../middlewares/auth');
const driverController = require('../controllers/driver/driver.controller');

router.use(authenticateToken);
router.use(requireDriver);

router.get('/profile', driverController.getProfile);
router.get('/trips', driverController.listTrips);
router.get('/trips/:id', driverController.getTripDetail);
router.patch('/trips/:id/status', driverController.updateTripStatus);
router.post('/trips/:id/report', driverController.reportTrip);

module.exports = router;
