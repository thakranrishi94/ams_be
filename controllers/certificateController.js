const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('cloudinary').v2;
const PDFDocument = require('pdfkit');
const path = require('path');

// // Configure Cloudinary
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });

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
          
          // Updated Cloudinary upload configuration
          const uploadStream = cloudinary.uploader.upload_stream(
            { 
              folder: 'certificates',
              resource_type: 'auto',  // Changed from 'raw' to 'auto'
              format: 'pdf',
              type: 'upload',
              access_mode: 'public',  // Ensure public access
              content_type: 'application/pdf',  // Specify content type
              flags: 'attachment'  // This helps with viewing in browser
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                // Use the secure_url property and ensure it's served as PDF
                const viewableUrl = result.secure_url.replace('/upload/', '/upload/fl_attachment/');
                resolve(viewableUrl);
              }
            }
          );
  
          uploadStream.end(pdfBuffer);
        });
  
        // Rest of your PDF generation code remains the same
        const templatePath = path.join(__dirname, '../assets', 'certificate-template.png');
        doc.image(templatePath, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
        });
  
        const FontPath = path.join(__dirname, '../assets', 'Silentha.ttf');
        doc.registerFont('Silentha', FontPath);
        doc.font('Silentha')
           .fontSize(50)
           .fillColor('#000')
           .text(name, 0, 270, {
             width: doc.page.width,
             align: 'center'
           });
  
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
async function saveCertificate(req, res) {
  try {
    const { eventId, userId } = req.body;
    
    // Verify faculty authorization from token
    const facultyId = req.user.userId;
    if (req.user.role !== 'FACULTY') {
      return res.status(403).json({
        message: 'Only faculty members can issue certificates'
      });
    }

    // Verify event exists and is completed
    const event = await prisma.eventRequest.findUnique({
      where: { eventRequestId: eventId },
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

    if (event.requestStatus !== 'COMPLETED') {
      return res.status(400).json({ message: 'Certificates can only be issued for completed events' });
    }

    // Check if certificate already exists
    const existingCertificate = await prisma.certificate.findUnique({
      where: {
        eventId_userId: {
          eventId: eventId,
          userId: userId
        }
      }
    });

    if (existingCertificate) {
      return res.status(400).json({ message: 'Certificate already issued for this user' });
    }

    // Generate and upload certificate
    const recipientName = event.alumni?.user?.name || 'Participant';
    const certificateUrl = await generateAndUploadPDF(recipientName);

    // Save certificate details to database
    const certificate = await prisma.certificate.create({
      data: {
        eventId: eventId,
        userId: userId,
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

module.exports = { saveCertificate };