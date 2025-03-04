const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('cloudinary').v2;
const PDFDocument = require('pdfkit');
const path = require('path');

async function generateAndUploadPDF(name) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        });
  
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', async () => {
          const pdfBuffer = Buffer.concat(chunks);
          
          // Simplified upload configuration
          const uploadStream = cloudinary.uploader.upload_stream(
            { 
              folder: 'certificates',
              resource_type: 'raw',
              public_id: `certificate-${Date.now()}`,  // Ensure unique filename
              use_filename: false // Let Cloudinary handle the filename
            },
            (error, result) => {
              if (error) {
                console.error('Upload error:', error);
                reject(error);
              } else {
                // Use the secure_url directly without modifications
                resolve(result.secure_url);
              }
            }
          );
  
          uploadStream.end(pdfBuffer);
        });
  
        // PDF generation code remains the same
        const templatePath = path.join(__dirname, '../assets', 'certificate-template.png');
        doc.image(templatePath, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
        });
  
        const FontPath = path.join(__dirname, '../assets', 'Silentha.ttf');
        doc.registerFont('Silentha', FontPath);
        doc.font('Silentha')
           .fontSize(50)
           .fillColor('#9e6407')
           .text(name, 50, 270, {
             width: doc.page.width,
             align: 'center'
           });
  
        doc.end();
      } catch (error) {
        console.error('PDF generation error:', error);
        reject(error);
      }
    });
  }

 async function saveCertificate(req, res) {
  try {
    const { eventId, alumniId } = req.body;
    
    // Verify faculty authorization from token
    const facultyId = req.user.userId;
    if (req.user.role !== 'FACULTY') {
      return res.status(403).json({
        message: 'Only faculty members can issue certificates'
      });
    }

    // First verify event exists
    const event = await prisma.eventRequest.findUnique({
      where: { 
        eventRequestId: eventId 
      },
      include: {
        alumni: {
          include: {
            user: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if certificate exists - using findUnique with the unique constraint
    const existingCertificate = await prisma.certificate.findUnique({
      where: {
        eventId_alumniId: {
          eventId: eventId,
          alumniId: alumniId
        }
      }
    });

    if (existingCertificate) {
      return res.status(400).json({ 
        message: 'Certificate already issued for this event',
        certificateUrl: existingCertificate.certificateUrl 
      });
    }

    // Generate and upload certificate
    const recipientName = event.alumni?.user?.name || 'Participant';
    const certificateUrl = await generateAndUploadPDF(recipientName);

    // Create certificate
    const certificate = await prisma.certificate.create({
      data: {
        eventId: eventId,
        alumniId: alumniId,
        certificateUrl: certificateUrl,
        issuerId: facultyId
      }
    });

    res.status(201).json({
      message: 'Certificate issued successfully',
      certificate
    });

  } catch (error) {
    console.error('Error in saveCertificate:', error);
    res.status(500).json({
      message: 'Failed to issue certificate',
      error: error.message
    });
  }
}
  
  // Updated getUserCertificates function to match schema
  const getUserCertificates = async (req, res) => {
    try {
      const alumniId = req.params.alumniId || 1; // Get alumniId from params or default to 1
  
      const certificates = await prisma.certificate.findMany({
        where: {
          alumniId: alumniId
        },
        include: {
          alumni: {
            include: {
              user: true
            }
          },
          event: {
            select: {
              eventRequestId: true,
              eventTitle: true,
              eventDescription: true,
              eventType: true,
              eventDate: true,
              eventTime: true,
              eventDuration: true,
              targetAudience: true,
              requestStatus: true
            }
          }
        },
        orderBy: {
          issuedAt: 'desc'
        }
      });
  
      if (!certificates.length) {
        return res.status(404).json({
          success: false,
          message: 'No certificates found for this user'
        });
      }
  
      return res.status(200).json({
        success: true,
        data: certificates,
        message: 'Certificates retrieved successfully'
      });
  
    } catch (error) {
      console.error('Error fetching certificates:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching certificates',
        error: error.message
      });
    }
  };
  //get certificate by faculty
  const getCertificatesByFaculty = async (req, res) => {
    try {
      const facultyUserId = req.user.userId; // User ID from JWT token
      console.log(req.params.id);
      // Find the faculty record using the user ID
      const faculty = await prisma.faculty.findUnique({
        where: {
          userId: facultyUserId,
        },
      });
  
      if (!faculty) {
        return res.status(404).json({ message: "Faculty not found" });
      }
  
      // Get certificates where this faculty is the issuer
      const certificates = await prisma.certificate.findMany({
        where: {
          issuerId: facultyUserId,
        },
        include: {
          event: {
            select: {
              eventTitle: true,
              eventType: true,
              eventDate: true,
            },
          },
          alumni: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
              course: true,
              batch: true,
            },
          },
        },
        orderBy: {
          issuedAt: 'desc',
        },
      });
  
      // Format the response data
      const formattedCertificates = certificates.map(cert => ({
        id: cert.id,
        eventId: cert.eventId,
        eventName: cert.event.eventTitle,
        eventType: cert.event.eventType,
        eventDate: cert.event.eventDate,
        alumniId: cert.alumniId,
        alumniName: cert.alumni.user.name,
        alumniEmail: cert.alumni.user.email,
        alumniCourse: cert.alumni.course,
        alumniBatch: cert.alumni.batch,
        certificateUrl: cert.certificateUrl,
        issuedAt: cert.issuedAt,
      }));
  
      return res.status(200).json({
        success: true,
        data: formattedCertificates,
      });
    } catch (error) {
      console.error("Error fetching faculty certificates:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch certificates",
        error: error.message,
      });
    }
  };
  //get certificate by alumni
  const getCertificatesByAlumni = async (req, res) => {
    try {
        const userId = req.user.userId; // Get user ID from token

        // Find the alumni record using the user ID
        const alumni = await prisma.alumni.findUnique({
            where: {
                userId: userId,
            },
            select: {
                id: true, // Get only the alumni ID
            }
        });

        if (!alumni) {
            return res.status(404).json({ message: "Alumni not found" });
        }

        // Fetch certificates associated with the alumni ID
        const certificates = await prisma.certificate.findMany({
            where: {
                alumniId: alumni.id,
            },
            include: {
                event: {
                    select: {
                        eventTitle: true,
                        eventType: true,
                        eventDate: true,
                    },
                },
                alumni: {
                    select: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                        course: true,
                        batch: true,
                    },
                },
            },
            orderBy: {
                issuedAt: 'desc',
            },
        });

        // Format the response data
        const formattedCertificates = certificates.map(cert => ({
            id: cert.id,
            eventId: cert.eventId,
            eventName: cert.event.eventTitle,
            eventType: cert.event.eventType,
            eventDate: cert.event.eventDate,
            alumniId: cert.alumniId,
            alumniName: cert.alumni.user.name,
            alumniEmail: cert.alumni.user.email,
            alumniCourse: cert.alumni.course,
            alumniBatch: cert.alumni.batch,
            certificateUrl: cert.certificateUrl,
            issuedAt: cert.issuedAt,
        }));

        return res.status(200).json({
            success: true,
            data: formattedCertificates,
        });
    } catch (error) {
        console.error("Error fetching alumni certificates:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch certificates",
            error: error.message,
        });
    }
};
module.exports = { 
  saveCertificate,
  getUserCertificates,
  getCertificatesByFaculty,
  getCertificatesByAlumni
 };