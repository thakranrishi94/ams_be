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

module.exports = {
    getAllFaculty
}