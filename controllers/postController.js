const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

// Configure storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'event_posts',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
      resource_type: 'auto',    // Let Cloudinary detect file type
      access_mode: 'public'     // Set access to public
    }
  });

// Configure multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Check file type based on the field name
    if (file.fieldname === 'brochureImage' || file.fieldname === 'eventImages') {
      const filetypes = /jpeg|jpg|png|gif/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('File upload only supports images (jpeg, jpg, png, gif)'));
    } else if (file.fieldname === 'attendance') {
      const filetypes = /pdf/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Attendance file upload only supports PDF format'));
    } else {
      cb(new Error('Invalid field name'));
    }
  }
});

// Multer fields configuration
const uploadFields = upload.fields([
  { name: 'brochureImage', maxCount: 1 },
  { name: 'eventImages', maxCount: 10 },
  { name: 'attendance', maxCount: 1 }
]);

//create event post
const createEventPost = async (req, res) => {
const facultyId = req.user.userId;
  try {
    // Validate request
    if (!req.body.eventId || !req.body.title || !req.body.description || 
        !req.body.location || !req.body.startTime || !req.body.endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if event exists
    const eventExists = await prisma.eventRequest.findUnique({
      where: { eventRequestId: parseInt(req.body.eventId) }
    });

    if (!eventExists) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if event post already exists for this event
    const existingPost = await prisma.eventPost.findUnique({
      where: { eventId: parseInt(req.body.eventId) }
    });

    if (existingPost) {
      return res.status(400).json({ message: "Event post already exists for this event" });
    }

    // Create data object for event post
    let eventPostData = {
      eventId: parseInt(req.body.eventId),
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      startTime: new Date(`2000-01-01T${req.body.startTime}`),
      endTime: new Date(`2000-01-01T${req.body.endTime}`),
      issuerId: facultyId
    };

    // Handle brochure image if provided
    if (req.files && req.files.brochureImage && req.files.brochureImage[0]) {
      eventPostData.brochureImage = req.files.brochureImage[0].path;
    }

    // Handle attendance file if provided
    if (req.files && req.files.attendance && req.files.attendance[0]) {
      eventPostData.attendance = req.files.attendance[0].path;
    }

    // Create event post with transaction to ensure all related records are created
    const result = await prisma.$transaction(async (prisma) => {
      // Create the event post
      const eventPost = await prisma.eventPost.create({
        data: eventPostData
      });

      // Handle event images if provided
      if (req.files && req.files.eventImages && req.files.eventImages.length > 0) {
        const eventImagesData = req.files.eventImages.map(image => ({
          url: image.path,
          eventPostId: eventPost.id
        }));

        // Create event images
        await prisma.eventImage.createMany({
          data: eventImagesData
        });
      }

      // Return created event post with images
      return await prisma.eventPost.findUnique({
        where: { id: eventPost.id },
        include: { eventImages: true }
      });
    });

    return res.status(201).json({
      message: "Event post created successfully",
      data: result
    });
  } catch (error) {
    console.error("Error creating event post:", error);
    return res.status(500).json({ 
      message: "Failed to create event post", 
      error: error.message 
    });
  }
};

//get post by faculty
const getFacultyPosts = async (req, res) => {
    try {
      const facultyUserId = req.user.userId; // User ID from JWT token
      
      // Find the faculty record using the user ID
      const faculty = await prisma.faculty.findUnique({
        where: {
          userId: facultyUserId,
        },
      });
  
      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty not found"
        });
      }
      const posts = await prisma.eventPost.findMany({
        where: {
          event: {
            facultyId: faculty.id
          }
        },
        include: {
          event: {
            include: {
              faculty: {
                include: {
                  user: true
                }
              },
              alumni: {
                include: {
                  user: true
                }
              }
            }
          },
          eventImages: true
        },
        orderBy: {
          startTime: "desc"
        }
      })
  
      return res.status(200).json(posts);
    } catch (error) {
      console.error("Error fetching faculty posts:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch posts",
        error: error.message,
      });
    }
  };
//get post by ID
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id);

    // Make sure we have a valid integer
    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format. ID must be a number."
      });
    }

    const post = await prisma.eventPost.findUnique({
      where: {
        id: parsedId
      },
      include: {
        event: {
          select: {
            eventRequestId: true,  // This might be your ID field based on other functions
            eventType: true,
            faculty: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        eventImages: {
          select: {
            url: true
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch post",
      error: error.message
    });
  }
};
//Get event by there types
const getEventTypes = async (req, res) => {
    try {
      // Using the local prisma instance
      const eventTypes = await prisma.eventRequest.findMany({
        distinct: ['eventType'],
        select: {
        eventRequestId : true,
        eventType: true
        }
      });
  
      // Transform into the format expected by the frontend
      const formattedEventTypes = eventTypes.map(type => ({
        id: type.id,
        name: type.eventType
      }));
  
      return res.status(200).json(formattedEventTypes);
    } catch (error) {
      console.error("Error fetching event types:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch event types",
        error: error.message
      });
    }
};



// Update an event post
const updatePost = async (req, res) => {
  const facultyId = req.user.userId;
  const postId = parseInt(req.params.id);

  try {
    // First, check if the post exists
    const existingPost = await prisma.eventPost.findUnique({
      where: { id: postId },
      include: {
        event: {
          include: {
            faculty: true
          }
        },
        eventImages: true
      }
    });

    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the faculty owns this post (either as issuer or as the faculty for the event)
    const facultyRecord = await prisma.faculty.findUnique({
      where: { userId: facultyId }
    });

    if (!facultyRecord) {
      return res.status(403).json({ message: "Faculty not found" });
    }

    if (existingPost.issuerId !== facultyId && existingPost.event.facultyId !== facultyRecord.id) {
      return res.status(403).json({ message: "Not authorized to update this post" });
    }

    // Prepare update data
    let updateData = {
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
    };

    // Handle start and end times
    if (req.body.startTime) {
      updateData.startTime = new Date(req.body.startTime);
    }
    
    if (req.body.endTime) {
      updateData.endTime = new Date(req.body.endTime);
    }

    // Handle brochure image if provided
    if (req.files && req.files.brochureImage && req.files.brochureImage[0]) {
      updateData.brochureImage = req.files.brochureImage[0].path;
    } else if (req.body.removeBrochure === 'true') {
      updateData.brochureImage = null;
    }

    // Handle attendance file if provided
    if (req.files && req.files.attendance && req.files.attendance[0]) {
      updateData.attendance = req.files.attendance[0].path;
    } else if (req.body.removeAttendance === 'true') {
      updateData.attendance = null;
    }

    // Use transaction to handle all database operations atomically
    const result = await prisma.$transaction(async (prisma) => {
      // Update the post
      const updatedPost = await prisma.eventPost.update({
        where: { id: postId },
        data: updateData
      });

      // Handle images to delete if specified
      if (req.body.imagesToDelete) {
        try {
          const imagesToDelete = JSON.parse(req.body.imagesToDelete);
          if (Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
            await prisma.eventImage.deleteMany({
              where: {
                id: { in: imagesToDelete },
                eventPostId: postId
              }
            });
          }
        } catch (error) {
          console.error("Error parsing imagesToDelete:", error);
          // Continue with the rest of the update even if this fails
        }
      }

      // Handle new images if provided
      if (req.files && req.files.eventImages && req.files.eventImages.length > 0) {
        const eventImagesData = req.files.eventImages.map(image => ({
          url: image.path,
          eventPostId: postId
        }));
      
        await prisma.eventImage.createMany({
          data: eventImagesData
        });
      }

      // Return updated post with images
      return await prisma.eventPost.findUnique({
        where: { id: postId },
        include: { 
          eventImages: true,
          event: {
            include: {
              faculty: {
                include: {
                  user: true
                }
              },
              alumni: {
                include: {
                  user: true
                }
              }
            }
          } 
        }
      });
    });

    return res.status(200).json({
      message: "Event post updated successfully",
      data: result
    });
  } catch (error) {
    console.error("Error updating event post:", error);
    return res.status(500).json({ 
      message: "Failed to update event post", 
      error: error.message 
    });
  }
};
//get all post for event page

const getAllPosts = async (req, res) => {
  try {
    // Optional query parameters for filtering
    const { category, featured } = req.query;
    
    // Build where clause based on filters
    let whereClause = {};
    
    if (category && category !== 'all') {
      whereClause.event = {
        eventType: category
      };
    }
    
    if (featured === 'true') {
      whereClause.featured = true;
    }
    
    const posts = await prisma.eventPost.findMany({
      where: whereClause,
      include: {
        event: {
          include: {
            faculty: {
              include: {
                user: true
              }
            },
            alumni: {
              include: {
                user: true
              }
            }
          }
        },
        eventImages: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    // Transform data to match frontend expectations
    const formattedPosts = posts.map(post => ({
      id: post.id.toString(),
      title: post.title,
      description: post.description,
      fullDescription: post.description, // Using same description for both fields
      category: post.event.eventType.toLowerCase(),
      images: post.eventImages.map(img => img.url),
      brochure: post.brochureImage || null,
      host: post.event.alumni 
        ? post.event.alumni.user.name 
        : post.event.faculty.user.name,
      location: post.location,
      faculty: post.event.faculty.user.name,
      date: post.event.eventDate.toISOString(),
      time: `${formatTime(post.startTime)} - ${formatTime(post.endTime)}`,
      featured: post.featured || false
    }));
    
    return res.status(200).json(formattedPosts);
  } catch (error) {
    console.error("Error fetching all posts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch posts",
      error: error.message
    });
  }
};

// Helper function to format time
function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

  module.exports = {
  createEventPost,
  uploadFields,
  getFacultyPosts,
  getPostById,
  getEventTypes,
  updatePost,
  getAllPosts
};