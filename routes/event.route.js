const express=require("express");
const router=express.Router();
const eventController=require("../controllers/eventController");
const { isAuthenticated, isEventCreator } = require("../middlewares/auth.middleware");

router.get('/',eventController.getEventRequest);

router.get('/upcomingEvents',eventController.upcomingEvents);
router.get('/pastEvents',eventController.pastEvents);
router.get('/rejectedEvents',eventController.rejectedEvents);
//getting event for faculty by faculty id
router.get("/events/upcoming", isAuthenticated, eventController.getUpcomingEventsByFaculty);
router.get("/events/past", isAuthenticated, eventController.getPastEventsByFaculty);
//getting event for alumni by alumni id
router.get("/events/alumni/upcoming", isAuthenticated, eventController.getUpcomingEventsByAlumni);
router.get("/events/alumni/past-events", isAuthenticated, eventController.getPastEventsByAlumni);
//authentication
router.post('/',isAuthenticated,isEventCreator,eventController.createEvent);
router.post('/createEventForAlumniByAdmin',isAuthenticated,isEventCreator,eventController.adminCreateEventForAlumni);
router.put('/:id/status', eventController.updateEventStatus);
router.put('/:id/link',eventController.updateEventLink);
module.exports = router;