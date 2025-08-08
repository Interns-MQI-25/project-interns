const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Send registration approval email to user
const sendRegistrationApprovalEmail = async (userEmail, userName) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Registration Approved - Marquardt Inventory Management System',
        html: `
            <h2>Registration Approved</h2>
            <p>Dear ${userName},</p>
            <p>Your registration request has been approved. You can now login to the Inventory Management System.</p>
            <p><a href="https://mqi-ims.uc.r.appspot.com/login">Login Here</a></p>
            <p>Best regards,<br>Marquardt India Team</p>
        `
    };
    
    return transporter.sendMail(mailOptions);
};

// Send registration rejection email to user
const sendRegistrationRejectionEmail = async (userEmail, userName) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Registration Request - Marquardt Inventory Management System',
        html: `
            <h2>Registration Request Update</h2>
            <p>Dear ${userName},</p>
            <p>Your registration request has been reviewed. Please contact the administrator for more information.</p>
            <p>Best regards,<br>Marquardt India Team</p>
        `
    };
    
    return transporter.sendMail(mailOptions);
};

// Send notification to all admins about new registration
const sendNewRegistrationNotification = async (adminEmails, userName, userEmail) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmails.join(','),
        subject: 'New Registration Request - Inventory Management System',
        html: `
            <h2>New Registration Request</h2>
            <p>A new user has registered:</p>
            <ul>
                <li><strong>Name:</strong> ${userName}</li>
                <li><strong>Email:</strong> ${userEmail}</li>
            </ul>
            <p><a href="https://mqi-ims.uc.r.appspot.com/admin/employees">Review Request</a></p>
            <p>Best regards,<br>Inventory Management System</p>
        `
    };
    
    return transporter.sendMail(mailOptions);
};

// Send registration confirmation to user
const sendRegistrationConfirmation = async (userEmail, userName) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Registration Received - Marquardt Inventory Management System',
        html: `
            <h2>Registration Received</h2>
            <p>Dear ${userName},</p>
            <p>Thank you for registering with the Marquardt Inventory Management System.</p>
            <p>Your registration request has been received and is pending admin approval.</p>
            <p>You will receive another email once your account has been reviewed.</p>
            <p>Best regards,<br>Marquardt India Team</p>
        `
    };
    
    return transporter.sendMail(mailOptions);
};

module.exports = {
    sendRegistrationApprovalEmail,
    sendRegistrationRejectionEmail,
    sendNewRegistrationNotification,
    sendRegistrationConfirmation
};