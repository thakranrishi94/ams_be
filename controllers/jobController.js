const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


const createJobOpportunity = async (req, res) => {
  try {
    // Find the alumni associated with the logged-in user
    const alumni = await prisma.alumni.findUnique({
      where: { userId: req.user.userId }
    });

    if (!alumni) {
      return res.status(404).json({ error: "Alumni profile not found" });
    }

    const {
      title,
      company,
      location,
      jobType,
      description,
      requirements,
      salaryRange,
      applicationLink,
      lastDateToApply
    } = req.body;

    const newJobOpportunity = await prisma.jobOpportunity.create({
      data: {
        alumniId: alumni.id,
        title,
        company,
        location,
        jobType,
        description,
        requirements,
        salaryRange,
        applicationLink,
        lastDateToApply: new Date(lastDateToApply),
        requestStatus: "PENDING"
      }
    });

    return res.status(201).json(newJobOpportunity);
  } catch (error) {
    console.error("Job Opportunity Creation Error:", error);
    return res.status(500).json({ error: "Failed to create job opportunity" });
  }
};
//get all job opportunities
const getJobOpportunities = async (req, res) => {
  try {
    const jobOpportunities = await prisma.jobOpportunity.findMany({
      include: {
        alumni: {
          select: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    
    return res.status(200).json(jobOpportunities);
  } catch (error) {
    console.error("Job Opportunities Fetch Error:", error);
    return res.status(500).json({ error: "Failed to fetch job opportunities" });
  }
};
//get alumni shared opportunities
const getMyJobOpportunities = async (req, res) => {
  try {
    // Check if UserId exists in req.user
    const userId = req.user.userId || req.user.UserId; 
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    const alumni = await prisma.alumni.findUnique({
      where: { userId },
      select: { id: true },
    });
    
    if (!alumni) {
      return res.status(404).json({ error: "Alumni profile not found" });
    }
    
    // Rest of your code remains the same
    const jobOpportunities = await prisma.jobOpportunity.findMany({
      where: {
        alumniId: alumni.id
      },
      include: {
        alumni: {
          select: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    
    return res.status(200).json(jobOpportunities);
  } catch (error) {
    console.error("My Job Opportunities Fetch Error:", error);
    return res.status(500).json({ error: "Failed to fetch your job opportunities" });
  }
};
// New methods for admin panel
const getAllJobOpportunities = async (req, res) => {
  try {
    const jobOpportunities = await prisma.jobOpportunity.findMany({
      include: {
        alumni: {
          select: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json(jobOpportunities);
  } catch (error) {
    console.error("Job Opportunities Fetch Error:", error);
    return res.status(500).json({ error: "Failed to fetch job opportunities" });
  }
};
//update by admin
const updateJobOpportunityStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { requestStatus } = req.body;

    // Validate request status
    if (!["PENDING", "APPROVED", "REJECTED"].includes(requestStatus)) {
      return res.status(400).json({ error: "Invalid request status" });
    }

    const updatedJobOpportunity = await prisma.jobOpportunity.update({
      where: { id: parseInt(jobId) },
      data: { 
        requestStatus,
        updatedAt: new Date()
      },
      include: {
        alumni: {
          select: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return res.status(200).json(updatedJobOpportunity);
  } catch (error) {
    console.error("Job Opportunity Status Update Error:", error);
    return res.status(500).json({ error: "Failed to update job opportunity status" });
  }
};
//update by alumni
const updateJobOpportunity = async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.userId || req.user.UserId; 
    
    // Get alumni ID
    const alumni = await prisma.alumni.findUnique({
      where: { userId },
      select: { id: true },
    });
    
    if (!alumni) {
      return res.status(404).json({ error: "Alumni profile not found" });
    }
    
    // Check if the job exists and belongs to the user
    const existingJob = await prisma.jobOpportunity.findUnique({
      where: { id: jobId },
      select: { alumniId: true }
    });
    
    if (!existingJob) {
      return res.status(404).json({ error: "Job opportunity not found" });
    }
    
    if (existingJob.alumniId !== alumni.id) {
      return res.status(403).json({ error: "You are not authorized to update this job opportunity" });
    }
    
    const {
      title,
      company,
      location,
      jobType,
      description,
      requirements,
      salaryRange,
      applicationLink,
      lastDateToApply
    } = req.body;
    
    // Validate required fields
    if (!title || !company || !location || !jobType || !description || !requirements || !lastDateToApply) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const updatedJob = await prisma.jobOpportunity.update({
      where: { id: jobId },
      data: {
        title,
        company,
        location,
        jobType,
        description,
        requirements,
        salaryRange,
        applicationLink,
        lastDateToApply: new Date(lastDateToApply)
      }
    });
    
    return res.status(200).json(updatedJob);
  } catch (error) {
    console.error("Job Opportunity Update Error:", error);
    return res.status(500).json({ error: "Failed to update job opportunity" });
  }
};

const getAllJobOpportunitiesForStudent = async (req, res) => {
  try {
    const currentDate = new Date();
    const oneMonthFromNow = new Date(currentDate);
    oneMonthFromNow.setMonth(currentDate.getMonth() + 1);
    const jobOpportunities = await prisma.jobOpportunity.findMany({
      where: {
        lastDateToApply: {
          lt: oneMonthFromNow
        },
        requestStatus: "APPROVED" // Only approved jobs
      },
      include: {
        alumni: {
          select: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json(jobOpportunities);
  } catch (error) {
    console.error("Job Opportunities Fetch Error:", error);
    return res.status(500).json({ error: "Failed to fetch job opportunities" });
  }
};
module.exports={
createJobOpportunity,
getMyJobOpportunities,
getAllJobOpportunities,
updateJobOpportunityStatus,
updateJobOpportunity,
getJobOpportunities,
getAllJobOpportunitiesForStudent,
}