const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");
const prisma = new PrismaClient();
const emailService=require('../services/emailService')
// Updated schema to match Prisma types exactly
const eventRequestSchema = z.object({
    alumniId: z.number().int().positive().nullable(),
    facultyId: z.number().int().positive().nullable(),
    adminId: z.number().int().positive().nullable().optional(),
    eventTitle: z.string().min(1).max(255),
    eventDescription: z.string().min(1),
    eventType: z.enum(["WEBINAR", "WORKSHOP", "SEMINAR", "LECTURE"]),
    eventDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid date format. Use ISO-8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)",
    }).transform((date) => new Date(date)),
    eventTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: "Invalid time format (HH:MM)",
    }).transform((time) => {
        const now = new Date();
        const [hours, minutes] = time.split(":").map(Number);
        now.setHours(hours, minutes, 0, 0);
        return now.toISOString();
    }),
    eventDuration: z.string().min(1).max(50),
    eventLink: z.string().url().optional().nullable(),
    targetAudience: z.string().min(1).max(255),
    requestStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
    eventAgenda: z.string().min(1),
    specialRequirements: z.string().min(1),
});
const updateEventLinkSchema = z.object({
    eventLink: z.string().url("Invalid URL format").nullable().optional(),
});
const updateEventStatusSchema = z.object({
    requestStatus: z.enum(["APPROVED", "REJECTED"]),
    facultyId: z.number().int().positive().nullable().optional(),
});

const idSchema = z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
});

const createEvent = async (req, res) => {
    try {
        const data = eventRequestSchema.parse(req.body);
        if(req.user.role==='ADMIN'){
        data.adminId=req.user.userId;
        }
        else if(req.user.role==='ALUMNI'){
          const userId = req.user.userId;
          //   console.log('User ID from token:', userId)
            if (!userId) {
              return res.status(400).json({ error: "User ID is missing or invalid." });
            }
            // Find alumni ID using userId
            const alumni = await prisma.alumni.findUnique({
              where: { userId },
              select: { id: true },
            });
          data.alumniId=alumni.id;
        }
        const event = await prisma.eventRequest.create({
            data: {
                ...data,
                eventDate: new Date(data.eventDate).toISOString(),
                eventTime: new Date(data.eventTime).toISOString(),
            },
            include: {
                alumni: {
                    include: {
                        user: true
                    }
                },
                faculty: {
                    include: {
                        user: true
                    }
                }
            }
        });

        res.status(201).json({ success: true, message: "Event created successfully", event });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error("Error creating event:", error);
        res.status(500).json({ error: "Failed to create Event" });
    }
};

const getEventRequest = async (req, res) => {
    try {
        const eventRequests = await prisma.eventRequest.findMany({
            where: {
                requestStatus: 'PENDING'
            },
            include: {
                alumni: {
                    include: {
                        user: true
                    }
                },
                faculty: {
                    include: {
                        user: true
                    }
                }
            }
        });

        res.status(200).json(eventRequests);
    } catch (error) {
        console.error("Error fetching eventRequest:", error);
        res.status(500).json({ error: "Failed to fetch eventRequest" });
    }
};

const updateEventStatus = async (req, res) => {
    try {
        // Validate the event ID from the request params
        const { id } = idSchema.parse(req.params);

        // Validate the request body (status and facultyId)
        const { requestStatus, facultyId } = updateEventStatusSchema.parse(req.body);

        // Check if the event exists
        const event = await prisma.eventRequest.findUnique({
            where: { eventRequestId: id },
        });

        if (!event) {
            return res.status(404).json({ error: "Event request not found" });
        }

        // Additional validation for APPROVED status
        if (requestStatus === "APPROVED" && !facultyId) {
            return res.status(400).json({
                error: "Faculty ID is required when approving an event",
            });
        }

        // Check if the faculty exists (only if facultyId is provided)
        if (facultyId) {
            const faculty = await prisma.faculty.findUnique({
                where: { id: facultyId },
            });

            if (!faculty) {
                return res.status(404).json({ error: "Faculty member not found" });
            }
        }

        // Update the event status and facultyId
        const updatedEvent = await prisma.eventRequest.update({
            where: { eventRequestId: id },
            data: {
                requestStatus: requestStatus,
                facultyId: requestStatus === "APPROVED" ? facultyId : null,
            },
            include: {
                alumni: {
                    include: {
                        user: true,
                    },
                },
                faculty: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        await emailService.sendEventStatusEmails(updatedEvent);
        res.status(200).json({
            success: true,
            message: `Event ${requestStatus.toLowerCase()} successfully`,
            event: updatedEvent,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error("Error updating event status:", error);
        res.status(500).json({ error: "Failed to update event status" });
    }
};
//get all approved request

const upcomingEvents=async (req,res)=>{
    try {
        const eventRequests = await prisma.eventRequest.findMany({
            where: {
                requestStatus: 'APPROVED',
                eventDate: {
                  gte: new Date(),
                },
            },
            include: {
                alumni: {
                    include: {
                        user: true
                    }
                },
                faculty: {
                    include: {
                        user: true
                    }
                }
            }
        });

        res.status(200).json(eventRequests);
    } catch (error) {
        console.error("Error fetching eventRequest:", error);
        res.status(500).json({ error: "Failed to fetch eventRequest" });
    }
};

//get past events
const pastEvents=async (req,res)=>{
    try {
        const eventRequests = await prisma.eventRequest.findMany({
            where: {
                // requestStatus: 'COMPLETED',
                eventDate: {
                  lt: new Date(),
                },
            },
            include: {
                alumni: {
                    include: {
                        user: true
                    }
                },
                faculty: {
                    include: {
                        user: true
                    }
                }
            }
        });

        res.status(200).json(eventRequests);
    } catch (error) {
        console.error("Error fetching eventRequest:", error);
        res.status(500).json({ error: "Failed to fetch eventRequest" });
    }
};
//get past events
const rejectedEvents= async (req,res)=>{
    try {
        const eventRequests = await prisma.eventRequest.findMany({
            where: {
                requestStatus: 'REJECTED'
            },
            include: {
                alumni: {
                    include: {
                        user: true
                    }
                },
                faculty: {
                    include: {
                        user: true
                    }
                }
            }
        });

        res.status(200).json(eventRequests);
    } catch (error) {
        console.error("Error fetching eventRequest:", error);
        res.status(500).json({ error: "Failed to fetch eventRequest" });
    }
}
//get event by faculty id
const getUpcomingEventsByFaculty = async (req, res) => {
    try {
      const userId = req.user.userId;
    //   console.log('User ID from token:', userId);
  
      if (!userId) {
        return res.status(400).json({ error: "User ID is missing or invalid." });
      }
  
      // Find faculty ID using userId
      const faculty = await prisma.faculty.findUnique({
        where: { userId },
        select: { id: true },
      });
      
    //   console.log('Faculty found:', faculty);
  
      if (!faculty) {
        return res.status(404).json({ error: "Faculty not found." });
      }
  
      // Fetch events where facultyId matches
      const events = await prisma.eventRequest.findMany({
        where: {
          facultyId: faculty.id,
          eventDate: {
            gte: new Date(),
          },
        },
        include: {
          alumni: {
            select: { user: { select: { name: true } } },
          },
          faculty: {
            select: { user: { select: { name: true } } },
          },
        },
        orderBy: {
          eventDate: "asc",
        },
      });
  
    //   console.log(`Found ${events.length} events for faculty ID ${faculty.id}`);
      res.json(events);
    } catch (error) {
      console.error("Error fetching faculty events:", error);
      res.status(500).json({ 
        error: "Failed to fetch faculty events",
        details: error.message 
      });
    }
  };

//get past events by faculty id
const getPastEventsByFaculty = async (req, res) => {
    try {
      const userId = req.user.userId;
    //   console.log('User ID from token:', userId);
  
      if (!userId) {
        return res.status(400).json({ error: "User ID is missing or invalid." });
      }
  
      // Find faculty ID using userId
      const faculty = await prisma.faculty.findUnique({
        where: { userId },
        select: { id: true },
      });
      
      console.log('Faculty found:', faculty);
  
      if (!faculty) {
        return res.status(404).json({ error: "Faculty not found." });
      }
  
      // Fetch events where facultyId matches
      const events = await prisma.eventRequest.findMany({
        where: {
          facultyId: faculty.id,
          eventDate: {
            lt: new Date(),
          },
        },
        include: {
          alumni: {
            select: { user: { select: { name: true } } },
          },
          faculty: {
            select: { user: { select: { name: true } } },
          },
        },
        orderBy: {
          eventDate: "asc",
        },
      });
  
    //   console.log(`Found ${events.length} events for faculty ID ${faculty.id}`);
      res.json(events);
    } catch (error) {
      console.error("Error fetching faculty events:", error);
      res.status(500).json({ 
        error: "Failed to fetch faculty events",
        details: error.message 
      });
    }
  };

//get upcoming event by alumni id
const getUpcomingEventsByAlumni = async (req, res) => {
    try {
      const userId = req.user.userId;
    //   console.log('User ID from token:', userId);
  
      if (!userId) {
        return res.status(400).json({ error: "User ID is missing or invalid." });
      }
  
      // Find faculty ID using userId
      const alumni = await prisma.alumni.findUnique({
        where: { userId },
        select: { id: true },
      });
      
    //   console.log('Faculty found:', faculty);
  
      if (!alumni) {
        return res.status(404).json({ error: "Faculty not found." });
      }
  
      // Fetch events where facultyId matches
      const events = await prisma.eventRequest.findMany({
        where: {
          alumniId: alumni.id,
          facultyId: {
            not: null, 
          },
          eventDate: {
            gte: new Date(),
          },
        },
        include: {
          alumni: {
            select: { user: { select: { name: true } } },
          },
          faculty: {
            select: { user: { select: { name: true } } },
          },
        },
        orderBy: {
          eventDate: "asc",
        },
      });
  
    //   console.log(`Found ${events.length} events for faculty ID ${faculty.id}`);
      res.json(events);
    } catch (error) {
      console.error("Error fetching faculty events:", error);
      res.status(500).json({ 
        error: "Failed to fetch faculty events",
        details: error.message 
      });
    }
  };
//get past events by faculty id
const getPastEventsByAlumni = async (req, res) => {
    try {
        const userId = req.user.userId;
      //   console.log('User ID from token:', userId);
    
        if (!userId) {
          return res.status(400).json({ error: "User ID is missing or invalid." });
        }
    
        // Find faculty ID using userId
        const alumni = await prisma.alumni.findUnique({
          where: { userId },
          select: { id: true },
        });
        
        console.log('Alumni found:', alumni.id);
    
        if (!alumni) {
          return res.status(404).json({ error: "Alumni not found." });
        }
    
        // Fetch events where facultyId matches
        const events = await prisma.eventRequest.findMany({
          where: {
            alumniId: alumni.id,
            
          facultyId: {
            not: null, 
          },
            eventDate: {
                lt: new Date(),
            },
          },
          include: {
            alumni: {
              select: { user: { select: { name: true } } },
            },
            faculty: {
              select: { user: { select: { name: true } } },
            },
          },
          orderBy: {
            eventDate: "asc",
          },
        });
    
      //   console.log(`Found ${events.length} events for faculty ID ${faculty.id}`);
        res.json(events);
      } catch (error) {
        console.error("Error fetching faculty events:", error);
        res.status(500).json({ 
          error: "Failed to fetch faculty events",
          details: error.message 
        });
      }
  };
//update link
const updateEventLink = async (req, res) => {
    try {
        const { id } = idSchema.parse(req.params)
        const { eventLink }=updateEventLinkSchema.parse(req.body)

        const event = await prisma.eventRequest.findUnique({
            where: { eventRequestId: id },
        });

        if (!event) {
            return res.status(404).json({ error: "Event request not found" });
        }

        const updatedEvent = await prisma.eventRequest.update({
            where: { eventRequestId: id },
            data: {
                eventLink: eventLink,
            },
            include: {
                alumni: {
                    include: { user: true },
                },
                faculty: {
                    include: { user: true },
                },
            },
        });

        res.status(200).json({
            success: true,
            message: "Event link updated successfully",
            event: updatedEvent,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error("Error updating event link:", error);
        res.status(500).json({ error: "Failed to update event link" });
    }
};

//create event for alumni by admin

const adminCreateEventForAlumni = async (req, res) => {
  try {
    // Validate input data
    const data = eventRequestSchema.parse(req.body);
    
    // Check if admin is creating the event
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Only admin can create events on behalf of alumni" });
    }
    
    // Parse date string safely
    let eventDate;
    try {
      // Parse the date string (format: 'yyyy-MM-dd')
      eventDate = new Date(data.eventDate);
      
      // Check if date is valid
      if (isNaN(eventDate.getTime())) {
        throw new Error("Invalid date format");
      }
    } catch (err) {
      return res.status(400).json({ error: "Invalid event date format" });
    }
    
    // Create event with the selected alumniId
    const event = await prisma.eventRequest.create({
      data: {
        alumniId: data.alumniId,
        facultyId: null,
        eventTitle: data.eventTitle,
        eventDescription: data.eventDescription,
        eventType: data.eventType,
        eventDate: eventDate, // Using the parsed Date object
        eventTime: data.eventTime, // Store as string in HH:MM format
        eventDuration: data.eventDuration,
        targetAudience: data.targetAudience,
        eventAgenda: data.eventAgenda,
        specialRequirements: data.specialRequirements,
        requestStatus: "PENDING"
      },
      include: {
        alumni: {
          include: {
            user: true
          }
        },
        faculty: {
          include: {
            user: true
          }
        }
      }
    });

    res.status(201).json({ 
      success: true, 
      message: "Alumni event created successfully", 
      event 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating alumni event:", error);
    res.status(500).json({ error: "Failed to create alumni event" });
  }
};

module.exports = {
    createEvent,
    getEventRequest,
    updateEventStatus,
    upcomingEvents,
    pastEvents,
    rejectedEvents,
    getUpcomingEventsByFaculty,
    updateEventLink,
    getPastEventsByFaculty,
    getUpcomingEventsByAlumni,
    getPastEventsByAlumni,
    adminCreateEventForAlumni,
};