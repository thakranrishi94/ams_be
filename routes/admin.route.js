const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated } = require('../middlewares/auth.middleware');

router.put('/update-password',isAuthenticated,adminController.updateAdminPassword);

module.exports = router;