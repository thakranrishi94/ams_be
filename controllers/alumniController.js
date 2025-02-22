const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');


// Validation schemas
const alumniSchema = z.object({
  userId: z.number().int().positive(),
  password: z.string().min(8).optional(),
  course: z.string().min(1),
  batch: z.string().min(1),
  designation: z.string().min(1),
  organization: z.string().min(1),
  skills: z.string().min(1),
  image: z.string().url().optional(),
  requestStatus: z.enum(["REJECTED", "PENDING", "APPROVED"]).optional()
});

const idSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

// Get all alumni
const getAllAlumniRequest = async (req, res) => {
  try {
    const alumni = await prisma.alumni.findMany({
      include: { user: true },
    });
    res.json(alumni);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alumni' });
  }
};

const getAllAlumni = async (req, res) => {
  try {
    const alumni = await prisma.alumni.findMany({
      where: {
        requestStatus: 'APPROVED'
      },
      include: {
        user: true
      },
    });
    res.json(alumni);
  } catch (error) {
    console.error('Error fetching approved alumni:', error);
    res.status(500).json({ error: 'Failed to fetch alumni' });
  }
};

// Get alumni by ID
const getAlumniById = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('User ID from token:', userId);

    if (!userId) {
      return res.status(400).json({ error: "User ID is missing or invalid." });
    }

    // Find alumni with user details using userId
    const alumni = await prisma.alumni.findUnique({
      where: { userId },
      include: { user: true }, // Include user details
    });

    if (!alumni) {
      return res.status(404).json({ error: "Alumni not found." });
    }

    res.json(alumni);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to fetch alumni' });
  }
};

// Create new alumni
const createAlumni = async (req, res) => {
  try {
    const data = alumniSchema.parse(req.body);
    const alunmni = await prisma.alumni.create({ data });
    res.status(201).json(alumni);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to create alumni' });
  }
};

// Delete alumni
const deleteAlumni = async (req, res) => {
  try {
    const { id } = idSchema.parse(req.params);
    await prisma.alumni.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to delete alumni' });
  }
};

// Get request status counts
const getRequestStatus = async (req, res) => {
  try {
    const statusCounts = await prisma.alumni.groupBy({
      by: ['requestStatus'],
      _count: {
        requestStatus: true,
      },
    });

    const result = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };

    statusCounts.forEach((status) => {
      result[status.requestStatus] = status._count.requestStatus;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching alumni request status:', error);
    res.status(500).json({ error: 'Failed to fetch alumni request status' });
  }
};

// Get alumni counts by status
const getAlumniCount = async (req, res) => {
  try {
    // Get total number of approved alumni
    const totalApprovedCount = await prisma.alumni.count({
      where: {
        requestStatus: 'APPROVED'
      }
    });

    // Get count of active approved alumni
    const activeCount = await prisma.alumni.count({
      where: {
        requestStatus: 'APPROVED',
        user: {
          status: 'ACTIVE'
        }
      }
    });

    // Get count of inactive approved alumni
    const inactiveCount = await prisma.alumni.count({
      where: {
        requestStatus: 'APPROVED',
        user: {
          status: 'INACTIVE'
        }
      }
    });

    // Get count of pending requests
    const pendingCount = await prisma.alumni.count({
      where: {
        requestStatus: 'PENDING'
      }
    });

    // Get count of rejected requests
    const rejectedCount = await prisma.alumni.count({
      where: {
        requestStatus: 'REJECTED'
      }
    });

    // Return the counts
    res.status(200).json({
      totalApproved: totalApprovedCount,
      active: activeCount,
      inactive: inactiveCount,
      pending: pendingCount,
      rejected: rejectedCount
    });

  } catch (error) {
    console.error('Error fetching alumni counts:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch alumni counts'
    });
  }
};

//update alumni
const updateAlumniProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // From authentication middleware
    const alumniId = parseInt(req.params.id);
    console.log("Alumni ID:", alumniId);

    // First, verify this alumni belongs to the authenticated user
    const existingAlumni = await prisma.alumni.findFirst({
      where: {
        id: alumniId,
        userId: userId,
      },
      include: {
        user: true
      }
    });

    if (!existingAlumni) {
      return res.status(404).json({
        message: "Alumni profile not found or you don't have permission to update it"
      });
    }

    // Extract fields from request body
    const {
      designation,
      organization,
      skills,
      password,
      name,
      phone,
      image
    } = req.body;
    // Prepare alumni update data
    const alumniUpdateData = {
      designation: designation || existingAlumni.designation,
      organization: organization || existingAlumni.organization,
      skills: skills || existingAlumni.skills,
      image: image || existingAlumni.image,
    };

    // Prepare user update data
    const userUpdateData = {
      name: name || existingAlumni.user.name,
      phone: phone || existingAlumni.user.phone,
    };
    console.log(alumniUpdateData)
    console.log(userUpdateData)
    // If password is provided, hash it
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters long"
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      userUpdateData.password = hashedPassword;
    }

    // Use transaction to update both alumni and user
    const updatedAlumni = await prisma.$transaction(async (prisma) => {
      // Update user first
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
        }
      });

      // Then update alumni
      const updatedAlumni = await prisma.alumni.update({
        where: { id: alumniId },
        data: alumniUpdateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              status: true,
            }
          }
        }
      });

      return updatedAlumni;
    });

    res.json({
      message: "Profile updated successfully",
      data: updatedAlumni
    });

  } catch (error) {
    console.error("Update alumni error:", error);
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return res.status(400).json({
        message: `${error.meta.target[0]} is already taken`
      });
    }

    // Handle general errors
    res.status(500).json({
      message: "Failed to update profile",
      error: error.message
    });
  }
};

// Image upload handler
const updateAlumniImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const alumniId = parseInt(req.params.id);
    
    if (!req.file) {
      return res.status(400).json({
        message: "No image file provided"
      });
    }

    // Verify alumni ownership
    const existingAlumni = await prisma.alumni.findFirst({
      where: {
        id: alumniId,
        userId: userId,
      }
    });

    if (!existingAlumni) {
      return res.status(404).json({
        message: "Alumni profile not found or you don't have permission to update it"
      });
    }

    // Update with new image URL
    const updatedAlumni = await prisma.alumni.update({
      where: { id: alumniId },
      data: {
        image: req.file.path // Assuming you're using multer or similar middleware
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          }
        }
      }
    });

    res.json({
      message: "Profile image updated successfully",
      data: updatedAlumni
    });

  } catch (error) {
    console.error("Update alumni image error:", error);
    res.status(500).json({
      message: "Failed to update profile image",
      error: error.message
    });
  }
};


module.exports = {
  getAllAlumni,
  getAlumniById,
  createAlumni,
  updateAlumniProfile,
  updateAlumniImage,
  deleteAlumni,
  getRequestStatus,
  getAlumniCount,
  getAllAlumniRequest
};