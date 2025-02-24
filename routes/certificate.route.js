const express=require('express');
const router=express.Router();
const certificateController=require('../controllers/certificateController');
const {isAuthenticated} = require("../middlewares/auth.middleware");


//Routes
router.get('/certificates',certificateController.getUserCertificates)
router.post('/issue', isAuthenticated, certificateController.saveCertificate);

module.exports = router;