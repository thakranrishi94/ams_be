const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendAlumniStatusEmail = async (email, name, status) => {
  console.log(`Preparing to send email. Status: ${status}, Recipient: ${email}`);

  const subject = status === "APPROVED" ? "Alumni Approval Notification" : "Alumni Rejection Notification";
  const message =
      status === "APPROVED"
          ? `Dear ${name},\n\nCongratulations! Your alumni request has been approved.\n\nBest Regards,\nAdmin KR Mangalam University`
          : `Dear ${name},\n\nWe regret to inform you that your alumni request has been rejected.\n\nBest Regards,\nAdmin KR Mangalam University`;

  try {
      console.log("Creating email transport...");
      const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
          },
      });

      console.log("Sending email...");
      await transporter.sendMail({
          from: `"KR Mangalam University" <${process.env.EMAIL_USER}>`,
          to: email,
          subject,
          text: message,
      });

      console.log(`✅ Email successfully sent to ${email}`);
  } catch (error) {
      console.error("❌ Error sending email:", error.message);
  }
};

const sendAlumniRegistrationEmail = async (email, name, user_password) => {
  const subject = "Alumni Registration Successful - KR Mangalam University";
  const message = `Dear ${name},

Thank you for registering as an alumni at KR Mangalam University.

Your request is under review. Once approved by the admin, you will be able to access all alumni features.

Your login credentials:
Email: ${email}
Password: ${user_password}

Best Regards,
KR Mangalam University`;

  try {
      await transporter.sendMail({
          from: `"KR Mangalam University" <${process.env.EMAIL_USER}>`,
          to: email,
          subject,
          text: message,
      });
      console.log(`✅ Email sent to Alumni: ${email}`);
  } catch (error) {
      console.error(`❌ Error sending alumni registration email:`, error);
  }
};

/**
 * Send an email to faculty after being onboarded by the admin.
 */
const sendFacultyOnboardingEmail = async (email, name, designation, school, user_password) => {
  const subject = "Welcome to KR Mangalam University - Faculty Onboarding";
  const message = `Dear ${name},

Congratulations! You have been onboarded as a faculty member at KR Mangalam University.

Your Designation: ${designation}
School: ${school}
Your login credentials:
Email: ${email}
Password: ${user_password}

Please log in to the portal to access faculty features.

Best Regards,
KR Mangalam University`;

  try {
      await transporter.sendMail({
          from: `"KR Mangalam University" <${process.env.EMAIL_USER}>`,
          to: email,
          subject,
          text: message,
      });
      console.log(`✅ Email sent to Faculty: ${email}`);
  } catch (error) {
      console.error(`❌ Error sending faculty onboarding email:`, error);
  }
};
const sendEventStatusEmails = async (updatedEvent) => {
  // Extract necessary information from the updated event
  const { 
    eventTitle, 
    eventDate, 
    eventTime,
    eventDescription,
    requestStatus,
    alumni,
    faculty
  } = updatedEvent;

  // Format date properly accounting for timezone
  let formattedDateTime;
  if (eventDate) {
    // Create a date object from eventDate
    const date = new Date(eventDate);
    
    // If you have eventTime as a separate field and it's a string, parse and apply it
    if (eventTime && typeof eventTime === 'string') {
      try {
        const [hours, minutes] = eventTime.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);
      } catch (error) {
        console.error("Error parsing eventTime:", error);
        // If there's an error parsing the time, just use the date
      }
    } else if (eventTime instanceof Date) {
      // If eventTime is already a Date object
      date.setHours(eventTime.getHours(), eventTime.getMinutes(), 0, 0);
    }
    
    // Use specific formatting
    formattedDateTime = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata', // Adjust if needed
    });
    
    // Append the time separately
    if (eventTime) {
      let timeStr;
      if (typeof eventTime === 'string') {
        timeStr = formatTimeString(eventTime);
      } else if (eventTime instanceof Date) {
        const hours = eventTime.getHours();
        const minutes = eventTime.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        timeStr = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      } else {
        // If eventTime is neither a string nor a Date, use a default format
        timeStr = "Time not specified";
      }
      formattedDateTime += ` at ${timeStr}`;
    }
  } else {
    formattedDateTime = 'Not specified';
  }

  // Send email to the alumni
  if (alumni && alumni.user && alumni.user.email) {
    // Different email content based on status
    let alumniSubject, alumniMessage;
    
    if (requestStatus === "APPROVED") {
      alumniSubject = "Your Event Request Has Been Approved - KR Mangalam University";
      alumniMessage = `Dear ${alumni.user.name},

Great news! Your event request "${eventTitle}" has been approved.

Event Details:
- Title: ${eventTitle}
- Date: ${formattedDateTime}
- Description: ${eventDescription}

A faculty member has been assigned to assist with your event. You may be contacted by them for further coordination.

Thank you for your contribution to our university community.

Best Regards,
KR Mangalam University`;
    } else if (requestStatus === "REJECTED") {
      alumniSubject = "Update on Your Event Request - KR Mangalam University";
      alumniMessage = `Dear ${alumni.user.name},

We have reviewed your event request "${eventTitle}" and regret to inform you that we are unable to proceed with it at this time.

If you would like to discuss this further or submit a revised request, please feel free to contact the alumni relations office.

We appreciate your understanding and continued engagement with KR Mangalam University.

Best Regards,
KR Mangalam University`;
    }

    // Send the email to alumni
    try {
      await transporter.sendMail({
        from: `"KR Mangalam University" <${process.env.EMAIL_USER}>`,
        to: alumni.user.email,
        subject: alumniSubject,
        text: alumniMessage,
      });
      console.log(`✅ Event ${requestStatus.toLowerCase()} email sent to Alumni: ${alumni.user.email}`);
    } catch (error) {
      console.error(`❌ Error sending alumni event ${requestStatus.toLowerCase()} email:`, error);
    }
  }

  // Send email to the assigned faculty only if approved
  if (requestStatus === "APPROVED" && faculty && faculty.user && faculty.user.email) {
    const facultySubject = "New Event Assignment - KR Mangalam University";
    
    // Handle the case when there's no alumni (admin-created event)
    const requesterInfo = alumni && alumni.user ? 
      `Requester Information:
- Name: ${alumni.user.name}
- Email: ${alumni.user.email}
- Phone: ${alumni.user.phone || "Not provided"}` : 
      `Requester Information:
- Event created by: Admin`;
    
    const facultyMessage = `Dear ${faculty.user.name},

You have been assigned to oversee the following event:

Event Details:
- Title: ${eventTitle}
- Date: ${formattedDateTime}
- Description: ${eventDescription}

${requesterInfo}

Please coordinate with the ${alumni ? 'alumni' : 'admin'} regarding the event preparations and requirements.

Thank you for your dedication to our university events.

Best Regards,
KR Mangalam University`;

    try {
      await transporter.sendMail({
        from: `"KR Mangalam University" <${process.env.EMAIL_USER}>`,
        to: faculty.user.email,
        subject: facultySubject,
        text: facultyMessage,
      });
      console.log(`✅ Event assignment email sent to Faculty: ${faculty.user.email}`);
    } catch (error) {
      console.error(`❌ Error sending faculty event assignment email:`, error);
    }
  }
};

// Helper function to format time string - safely handle different formats
function formatTimeString(timeStr) {
  try {
    // If timeStr is in HH:MM:SS format
    const timeParts = timeStr.split(':');
    let hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    console.error("Error formatting time string:", error);
    return "Time format error";
  }
}

module.exports = {
  sendAlumniStatusEmail,
  sendAlumniRegistrationEmail,
  sendFacultyOnboardingEmail,
  sendEventStatusEmails
};
