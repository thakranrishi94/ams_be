
const express = require('express');
const router = express.Router();
const facultyController = require('../contollers/facultyController');

router.get('/', facultyController.getAllFaculty);
//update faculty
router.put('/:id', facultyController.updateFaculty);
//update faculty status
router.put('/users/:userId/status', facultyController.updateUserStatus);

module.exports = router;