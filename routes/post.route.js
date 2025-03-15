const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { isAuthenticated } = require("../middlewares/auth.middleware");

// Specific routes first
router.post('/create-post', isAuthenticated, postController.uploadFields, postController.createEventPost);
router.get('/get-faculty-post', isAuthenticated, postController.getFacultyPosts);
router.get('/event/types', postController.getEventTypes);
router.get('/all', postController.getAllPosts); // Moved before /:id
router.put('/update/:id', isAuthenticated, postController.uploadFields, postController.updatePost);

// Parameterized route last
router.get('/:id', postController.getPostById);

module.exports = router;