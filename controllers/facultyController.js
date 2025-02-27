const { PrismaClient } = require("@prisma/client");
const cloudinary = require('cloudinary').v2
const {Stream}=require('stream')
const prisma = new PrismaClient();

const getAllFaculty = async (req, res) => {
    try {
        const faculty = await prisma.faculty.findMany({
            include: { user: true },
        });

        res.status(200).json(faculty);
    } catch (error) {
        console.error("Error fetching faculty:", error);
        res.status(500).json({ error: "Failed to fetch faculty" });
    }
}

const getActiveFaculty=async(req,res)=>{
    try {
        const faculty = await prisma.faculty.findMany({
            where: { user: { status: 'ACTIVE' } }, 
            include: { user: true },
        });

        res.status(200).json(faculty);
    } catch (error) {
        console.error("Error fetching active faculty:", error);
        res.status(500).json({ error: "Failed to fetch active faculty" });
    }
};
//update
const updateFaculty = async (req, res) => {
  try {
    const { id } = idSchema.parse(req.params);
    const data = alumniSchema.partial().parse(req.body);
    const updatedAlumni = await prisma.alumni.update({
      where: { id },
      data,
      include: { user: true },
    });
    res.json(updatedAlumni);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to update faculty' });
  }
};

//update user status
const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        console.log('Received userId:', userId);
        console.log('Received status:', status);
        console.log('Request body:', req.body);

        // Validate status
        if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
            console.log('Invalid status received:', status);
            return res.status(400).json({
                error: 'Invalid status. Status must be either ACTIVE or INACTIVE'
            });
        }

        // Convert userId to number and validate
        const id = parseInt(userId);
        if (isNaN(id)) {
            console.log('Invalid userId:', userId);
            return res.status(400).json({
                error: 'Invalid user ID'
            });
        }

        // Update user status
        const updatedUser = await prisma.user.update({
            where: {
                id: id
            },
            data: {
                status: status
            },
            include: {
                faculty: true,
                alumni: true
            }
        });

        console.log('Updated user:', updatedUser);

        res.status(200).json({
            message: 'User status updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error("Detailed error:", error);
        res.status(400).json({
            error: error.message || 'Failed to update user status'
        });
    }
};

//check faculty availability
const getAvailableFaculty = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ error: "Date parameter is required" });
        }

        const targetDate = new Date(date);
        
        // Get faculty IDs already assigned on this date
        const busyFaculty = await prisma.eventRequest.findMany({
            where: {
                eventDate: {
                    gte: new Date(targetDate.setHours(0, 0, 0, 0)),
                    lt: new Date(targetDate.setHours(23, 59, 59, 999))
                },
                requestStatus: "APPROVED",
                facultyId: { not: null }
            },
            select: { facultyId: true }
        });

        const busyFacultyIds = busyFaculty.map(f => f.facultyId);

        // Get active faculty not in busy list
        const availableFaculty = await prisma.faculty.findMany({
            where: {
                user: { status: 'ACTIVE' },
                id: { notIn: busyFacultyIds }
            },
            include: { user: true }
        });

        res.status(200).json(availableFaculty);
    } catch (error) {
        console.error("Error fetching available faculty:", error);
        res.status(500).json({ error: "Failed to fetch available faculty" });
    }
};

//update faculty profile
const updateFacultyProfile = async (req, res) => {
    try {
      const userId = req.user.userId; // From authentication middleware
      const facultyId = parseInt(req.params.id);
  
      // Verify this faculty belongs to the authenticated user
      const existingFaculty = await prisma.faculty.findFirst({
        where: {
          id: facultyId,
          userId: userId,
        },
        include: {
          user: true
        }
      });
  
      if (!existingFaculty) {
        return res.status(404).json({
          message: "Faculty profile not found or you don't have permission to update it"
        });
      }
  
      // Extract fields from request body
      const {
        designation,
        school,
        password,
        name,
        phone,
        image
      } = req.body;
  
      // Prepare faculty update data
      const facultyUpdateData = {
        designation: designation || existingFaculty.designation,
        school: school || existingFaculty.school,
      };
  
      // Prepare user update data
      const userUpdateData = {
        name: name || existingFaculty.user.name,
        phone: phone || existingFaculty.user.phone,
      };
  
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
  
      // Use transaction to update both faculty and user
      const updatedFaculty = await prisma.$transaction(async (prisma) => {
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
  
        // Then update faculty
        const updatedFaculty = await prisma.faculty.update({
          where: { id: facultyId },
          data: facultyUpdateData,
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
  
        return updatedFaculty;
      });
  
      res.json({
        message: "Profile updated successfully",
        data: updatedFaculty
      });
  
    } catch (error) {
      console.error("Update faculty error:", error);
  
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
  const updateFacultyImage = async (req, res) => {
    try {
      const userId = req.user.userId;
      const facultyId = parseInt(req.params.id);
  
      if (!req.file) {
        return res.status(400).json({
          message: "No image file provided",
        });
      }
  
      // Verify faculty ownership
      const existingFaculty = await prisma.faculty.findFirst({
        where: {
          id: facultyId,
          userId: userId,
        },
      });
  
      if (!existingFaculty) {
        return res.status(404).json({
          message: "Faculty profile not found or you don't have permission to update it",
        });
      }
  
      const file = req.file;
  
      // Upload file to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const bufferStream = new Stream.PassThrough();
        bufferStream.end(file.buffer);
  
        cloudinary.uploader.upload_stream(
          { folder: 'profile' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload failed:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        ).end(file.buffer);
      });
  
      // Update faculty image in database
      await prisma.faculty.update({
        where: { id: facultyId },
        data: { image: result.secure_url },
      });
  
      // Send success response
      return res.status(200).json({
        message: 'Profile image updated successfully',
        imageUrl: result.secure_url,
      });
  
    } catch (error) {
      console.error('Update faculty image error:', error);
      return res.status(500).json({
        message: 'Failed to update profile image',
        error: error.message,
      });
    }
  };

  //getFacultybyId
  const getFacultyById = async (req, res) => {
    try {
      const userId = req.user.userId;
      console.log('User ID from token:', userId);
  
      if (!userId) {
        return res.status(400).json({ error: "User ID is missing or invalid." });
      }
  
      // Find alumni with user details using userId
      const faculty = await prisma.faculty.findUnique({
        where: { userId },
        include: { user: true }, // Include user details
      });
  
      if (!faculty) {
        return res.status(404).json({ error: "Alumni not found." });
      }
  
      res.json(faculty);
    } catch (error) {
      res.status(400).json({ error: error.message || 'Failed to fetch alumni' });
    }
  };
module.exports = {
    getAllFaculty,
    updateFaculty,
    updateUserStatus,
    getActiveFaculty,
    getAvailableFaculty,
    updateFacultyImage,
    updateFacultyProfile,
    getFacultyById
}