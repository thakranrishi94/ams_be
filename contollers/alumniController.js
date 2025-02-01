const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const prisma = new PrismaClient();

// Validation schemas
const alumniSchema = z.object({
  userId: z.number().int().positive(),
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
const getAllAlumni = async (req, res) => {
  try {
    const alumni = await prisma.alumni.findMany({
      include: { user: true },
    });
    res.json(alumni);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alumni' });
  }
};

// Get alumni by ID
const getAlumniById = async (req, res) => {
  try {
    const { id } = idSchema.parse(req.params);
    const alumni = await prisma.alumni.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!alumni) return res.status(404).json({ error: 'Alumni not found' });
    res.json(alumni);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to fetch alumni' });
  }
};

// Create new alumni
const createAlumni = async (req, res) => {
  try {
    const data = alumniSchema.parse(req.body);
    const alumni = await prisma.alumni.create({ data });
    res.status(201).json(alumni);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to create alumni' });
  }
};

// Update alumni
const updateAlumni = async (req, res) => {
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
    res.status(400).json({ error: error.message || 'Failed to update alumni' });
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
    // Get total number of alumni
    const totalCount = await prisma.alumni.count();

    // Get count of active alumni
    const activeCount = await prisma.alumni.count({
      where: {
        user: {
          status: 'ACTIVE'
        }
      }
    });

    // Get count of inactive alumni
    const inactiveCount = await prisma.alumni.count({
      where: {
        user: {
          status: 'INACTIVE'
        }
      }
    });

    // Return the counts
    res.status(200).json({
      total: totalCount,
      active: activeCount,
      inactive: inactiveCount
    });

  } catch (error) {
    console.error('Error fetching alumni counts:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch alumni counts'
    });
  }
};

module.exports = {
  getAllAlumni,
  getAlumniById,
  createAlumni,
  updateAlumni,
  deleteAlumni,
  getRequestStatus,
  getAlumniCount
};