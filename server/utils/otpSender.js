// server/utils/otpSender.js
const nodemailer = require('nodemailer');

// Transporter configured for Gmail using environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address from .env
        pass: process.env.EMAIL_PASS  // Your 16-digit App Password from .env
    }
});

const sendOtpEmail = async (toEmail, otp) => {
    // Use the MAIL_FROM_ADDRESS from .env, or fallback to EMAIL_USER
    const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.EMAIL_USER;
    if (!fromAddress) {
        console.error('Error: MAIL_FROM_ADDRESS or EMAIL_USER not set in .env file.');
        return false; // Indicate failure: sender not configured
    }
    if (!process.env.EMAIL_PASS) {
         console.error('Error: EMAIL_PASS (App Password) not set in .env file.');
         return false; // Indicate failure: password not configured
    }

    // Define email options
    const mailOptions = {
        from: `"Your App Name" <${fromAddress}>`, // Set a sender name and use the verified address
        to: toEmail,                             // The recipient's email address
        subject: 'Your Login OTP Code',          // Email subject
        text: `Your OTP code is: ${otp}\nIt will expire in 10 minutes.`, // Plain text body
        html: `<p>Your OTP code is: <strong>${otp}</strong></p><p>It will expire in 10 minutes.</p>` // HTML body
    };

    try {
        console.log(`Attempting to send OTP email via Gmail to: ${toEmail}...`);
        // Actually send the email - THE IMPORTANT CHANGE IS HERE:
        await transporter.sendMail(mailOptions); // <<<--- THIS LINE IS NOW UNCOMMENTED

        console.log(`OTP Email successfully sent (or at least queued by Nodemailer) to ${toEmail}`);
        return true; // Indicate success
    } catch (error) {
        // Log the actual error from Nodemailer/Gmail
        console.error(`Error sending OTP Email via Gmail to ${toEmail}:`, error);
        return false; // Indicate failure
    }
};

const sendOtpSms = async (toPhoneNumber, otp) => {
    // This is still a placeholder, SMS not implemented
    console.log(`--- Sending OTP SMS (Placeholder) ---`);
    console.log(`To: ${toPhoneNumber}`);
    console.log(`OTP: ${otp}`);
    console.log(`----------------------------------`);
    return false; // Return false as it's not implemented
};

// Export the functions
module.exports = { sendOtpEmail, sendOtpSms };