// routes/alumniRoutes.js
const express = require('express');
const router = express.Router();
const alumniController = require('../contollers/alumniController');

// Get all alumni
router.get('/', alumniController.getAllAlumni);

router.get('/request-status', alumniController.getRequestStatus);

router.get('/alumni-status',alumniController.getAlumniCount);

router.get('/alumniRequest',alumniController.getAllAlumniRequest)

// Get a single alumni by ID
router.get('/:id', alumniController.getAlumniById);

// Create a new alumni
router.post('/', alumniController.createAlumni);

// Update an alumni by ID
router.put('/:id', alumniController.updateAlumni);

// Delete an alumni by ID
router.delete('/:id', alumniController.deleteAlumni);


module.exports = router;