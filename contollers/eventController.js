const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");
const prisma = new PrismaClient();

// Updated schema to match Prisma types exactly
const eventRequestSchema = z.object({
    alumniId: z.number().int().positive().nullable(),
    facultyId: z.number().int().positive().nullable(),
    adminId: z.number().int().positive().nullable(),
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
                requestStatus: 'APPROVED'
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
                requestStatus: 'COMPLETED'
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
module.exports = {
    createEvent,
    getEventRequest,
    updateEventStatus,
    upcomingEvents,
    pastEvents,
    rejectedEvents,
};