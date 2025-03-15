const nodemailer=require('nodemailer');
const transport=nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS,
    },
});
const sendAlumniStatusEmail=async(email,name,status)=>{
    const subject= status==="APPROVED"?"Alumni Approval Notification":
    "Alumni Rejection Notification";
    const message =
    status === "APPROVED"
      ? `Dear ${name},\n\nCongratulations! Your alumni request has been approved.\n\nBest Regards,\nAdmin KR Mangalam University`
      : `Dear ${name},\n\nWe regret to inform you that your alumni request has been rejected.\n\nBest Regards,\nAdmin KR Mangalam University`;

  try {
    await transporter.sendMail({
      from: '"KR Mangalm University" rishabhrajput2542001@gmail.com',
      to: email,
      subject,
      text: message,
    });
    console.log(`Email sent to ${email} for ${status} status.`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = sendAlumniStatusEmail;
