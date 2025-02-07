const { PrismaClient } = require("@prisma/client");

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
module.exports = {
    getAllFaculty,
    updateFaculty,
    updateUserStatus
}