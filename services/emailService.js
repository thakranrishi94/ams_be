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
    eventDescription,
    requestStatus,
    alumni,
    faculty
  } = updatedEvent;

  // Format date for better readability
  const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : 'Not specified';

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
- Date: ${formattedDate}
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
    const facultyMessage = `Dear ${faculty.user.name},

You have been assigned to oversee the following event:

Event Details:
- Title: ${eventTitle}
- Date: ${formattedDate}
- Description: ${eventDescription}

Requester Information:
- Name: ${alumni.user.name}
- Email: ${alumni.user.email}
- Phone: ${alumni.user.phone || "Not provided"}

Please coordinate with the alumni regarding the event preparations and requirements. You can contact them directly using the information provided above.

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

module.exports = {
  sendAlumniStatusEmail,
  sendAlumniRegistrationEmail,
  sendFacultyOnboardingEmail,
  sendEventStatusEmails
};
