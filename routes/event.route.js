const express=require("express");
const router=express.Router();
const eventController=require("../contollers/eventController");
const { isAuthenticated, isEventCreator } = require("../middlewares/auth.middleware");

router.get('/',eventController.getEventRequest);

router.get('/upcomingEvents',eventController.upcomingEvents);
router.get('/pastEvents',eventController.pastEvents);
router.get('/rejectedEvents',eventController.rejectedEvents);
router.get("/events/upcoming", isAuthenticated, eventController.getUpcomingEventsByFaculty);
router.get("/events/past", isAuthenticated, eventController.getPastEventsByFaculty);

router.post('/',isAuthenticated,isEventCreator,eventController.createEvent);
router.put('/:id/status', eventController.updateEventStatus);
router.put('/:id/link',eventController.updateEventLink);
module.exports = router;