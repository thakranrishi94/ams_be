
const express = require('express');
const router = express.Router();
const facultyController = require('../contollers/facultyController');

router.get('/', facultyController.getAllFaculty);


module.exports = router;