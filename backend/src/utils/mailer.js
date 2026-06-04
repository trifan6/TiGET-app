const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendPinEmail = async (toEmail, pin) => {
  try {
    await transporter.sendMail({
      from: `"TiGET Security" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Your TiGET Security PIN',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background-color: #15151B; color: #EFEFEF; border-radius: 10px;">
          <h2 style="color: #fff;">Welcome to TiGET</h2>
          <p style="color: #aaa; font-size: 16px;">Here is your 3-Way Authentication PIN:</p>
          <div style="background-color: #242429; padding: 20px; border-radius: 8px; display: inline-block; margin: 20px 0; border: 1px solid #E7462F;">
            <h1 style="color: #E7462F; letter-spacing: 8px; margin: 0; font-size: 32px;">${pin}</h1>
          </div>
          <p style="color: #aaa; font-size: 14px;">Do not share this code with anyone.</p>
        </div>
      `
    });
    console.log(`📧 SUCCESS: Email sent to ${toEmail}`);
  } catch (error) {
    console.error(`🔴 FAILED to send email to ${toEmail}. They probably used a fake email.`);
  }
};

module.exports = { sendPinEmail };