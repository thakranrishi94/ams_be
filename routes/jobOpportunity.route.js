const express=require("express");
const router=express.Router();
const jobController=require("../controllers/jobController");
const { isAuthenticated} = require("../middlewares/auth.middleware");


router.get('/get-opportunities',jobController.getJobOpportunities);
router.get('/my-opportunities',isAuthenticated,jobController.getMyJobOpportunities);
router.get('/job-opportunities/admin',isAuthenticated,jobController.getAllJobOpportunities);
router.put('/job-opportunities/:jobId/status',isAuthenticated,jobController.updateJobOpportunityStatus);
router.put('/job-opportunities/:id/update-by-alumni',isAuthenticated,jobController.updateJobOpportunity);
router.post('/',isAuthenticated,jobController.createJobOpportunity);
module.exports = router;
