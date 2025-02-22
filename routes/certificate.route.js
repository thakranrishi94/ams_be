const express=require('express');
const router=express.Router();
const certificateController=require('../controllers/certificateController');
const {isAuthenticated} = require("../middlewares/auth.middleware");


//Routes
router.post('/generate',certificateController.generateCertificate);

module.exports = router;