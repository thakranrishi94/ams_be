
const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');

router.get('/', facultyController.getAllFaculty);
router.get('/active-faculty',facultyController.getActiveFaculty);
router.get('/available-faculty', facultyController.getAvailableFaculty);
//update faculty
router.put('/:id', facultyController.updateFaculty);
//update faculty status
router.put('/users/:userId/status', facultyController.updateUserStatus);

module.exports = router;