
const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const multer = require('multer');
const storage=multer.memoryStorage();
const upload = multer({storage});


router.get('/', facultyController.getAllFaculty);
router.get('/active-faculty',facultyController.getActiveFaculty);
router.get('/available-faculty', facultyController.getAvailableFaculty);
//update faculty
router.put('/:id', facultyController.updateFaculty);

router.get('/byId', isAuthenticated, facultyController.getFacultyById);
router.put('/update-profile/:id', isAuthenticated, upload.none(), facultyController.updateFacultyProfile);
router.post('/update-image/:id', isAuthenticated, upload.single('image'), facultyController.updateFacultyImage);
//update faculty status
router.put('/users/:userId/status', facultyController.updateUserStatus);

module.exports = router;