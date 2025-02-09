const express=require("express");
const router=express.Router();
const eventController=require("../contollers/eventController")

router.get('/',eventController.getEventRequest);

router.get('/upcomingEvents',eventController.upcomingEvents);
router.get('/pastEvents',eventController.pastEvents);


router.post('/',eventController.createEvent);
router.put('/:id/status', eventController.updateEventStatus);
module.exports = router;