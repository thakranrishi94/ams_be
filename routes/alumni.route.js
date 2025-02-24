// routes/alumniRoutes.js
const express = require('express');
const router = express.Router();
const alumniController = require('../controllers/alumniController');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const multer = require('multer');
const storage=multer.memoryStorage();
const upload = multer({storage});

// Get all alumni
router.get('/', alumniController.getAllAlumni);

router.get('/request-status', alumniController.getRequestStatus);

router.get('/alumni-status',alumniController.getAlumniCount);

router.get('/alumniRequest',alumniController.getAllAlumniRequest)

// Get a single alumni by ID
router.get('/byId', isAuthenticated, alumniController.getAlumniById);

// Create a new alumni
router.post('/', alumniController.createAlumni);

// Update an alumni by ID
router.put('/update-status/:id',alumniController.updateAlumniStatus);
router.put('/update/:id',isAuthenticated, upload.none(),alumniController.updateAlumniProfile);
router.post('/update/:id/image',isAuthenticated, upload.single('image'), alumniController.updateAlumniImage);

// Delete an alumni by ID
router.delete('/:id', alumniController.deleteAlumni);


module.exports = router;