/**
 * @fileoverview Email Service Utility - Handles all email notifications and communications
 * 
 * This module provides email functionality for the inventory management system including
 * registration notifications, approval/rejection emails, and administrative communications.
 * Uses Nodemailer with Gmail SMTP for reliable email delivery.
 * 
 * @author Priyanshu Kumar Sharma
 * @version 1.0.0
 * @requires nodemailer - Email sending library for Node.js
 * @requires process.env.EMAIL_USER - Gmail account for sending emails
 * @requires process.env.EMAIL_PASS - Gmail app password for authentication
 */

const nodemailer = require('nodemailer');

/**
 * Email Transporter Configuration
 * 
 * Creates and configures Nodemailer transporter using Gmail SMTP service.
 * Utilizes environment variables for secure credential management.
 * 
 * @constant {nodemailer.Transporter} transporter - Configured email transporter
 */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send Registration Approval Email
 * 
 * Sends approval notification email to users whose registration requests have been approved.
 * Includes login link and welcome message with company branding.
 * 
 * @async
 * @function sendRegistrationApprovalEmail
 * @param {string} userEmail - Recipient's email address
 * @param {string} userName - Recipient's full name for personalization
 * @returns {Promise<Object>} Email send result from Nodemailer
 * @throws {Error} When email sending fails
 * 
 * @example
 * // Send approval email to new user
 * await sendRegistrationApprovalEmail('user@company.com', 'John Doe');
 */
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

/**
 * Send Registration Rejection Email
 * 
 * Sends rejection notification email to users whose registration requests have been denied.
 * Provides polite rejection message with contact information for further inquiries.
 * 
 * @async
 * @function sendRegistrationRejectionEmail
 * @param {string} userEmail - Recipient's email address
 * @param {string} userName - Recipient's full name for personalization
 * @returns {Promise<Object>} Email send result from Nodemailer
 * @throws {Error} When email sending fails
 * 
 * @example
 * // Send rejection email to user
 * await sendRegistrationRejectionEmail('user@company.com', 'John Doe');
 */
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

/**
 * Send New Registration Notification to Admins
 * 
 * Notifies all system administrators about new registration requests requiring review.
 * Includes applicant details and direct link to admin review interface.
 * 
 * @async
 * @function sendNewRegistrationNotification
 * @param {string[]} adminEmails - Array of administrator email addresses
 * @param {string} userName - Applicant's full name
 * @param {string} userEmail - Applicant's email address
 * @returns {Promise<Object>} Email send result from Nodemailer
 * @throws {Error} When email sending fails
 * 
 * @example
 * // Notify admins of new registration
 * await sendNewRegistrationNotification(['admin1@company.com'], 'John Doe', 'john@example.com');
 */
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

/**
 * Send Registration Confirmation to User
 * 
 * Sends confirmation email to users after successful registration submission.
 * Informs users that their request is pending admin approval and sets expectations.
 * 
 * @async
 * @function sendRegistrationConfirmation
 * @param {string} userEmail - Recipient's email address
 * @param {string} userName - Recipient's full name for personalization
 * @returns {Promise<Object>} Email send result from Nodemailer
 * @throws {Error} When email sending fails
 * 
 * @example
 * // Send confirmation to new registrant
 * await sendRegistrationConfirmation('user@company.com', 'John Doe');
 */
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

// Send reminder email to monitors about pending product requests
const sendProductRequestReminder = async (monitorEmails, pendingCount) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: monitorEmails.join(','),
        subject: `Reminder: ${pendingCount} Pending Product Request${pendingCount > 1 ? 's' : ''} - MQI Inventory`,
        html: `
            <h2>📋 Pending Product Requests Reminder</h2>
            <p>Dear Monitor,</p>
            <p>You have <strong>${pendingCount}</strong> pending product request${pendingCount > 1 ? 's' : ''} awaiting your approval.</p>
            <p><a href="https://mqi-ims.uc.r.appspot.com/monitor/approvals" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Requests</a></p>
            <p>Best regards,<br>Marquardt India Inventory System</p>
        `
    };
    
    return transporter.sendMail(mailOptions);
};

// Send reminder email to monitors about pending return requests
// const sendReturnRequestReminder = async (monitorEmails, pendingCount) => {
//     const mailOptions = {
//         from: process.env.EMAIL_USER,
//         to: monitorEmails.join(','),
//         subject: `Reminder: ${pendingCount} Pending Return Request${pendingCount > 1 ? 's' : ''} - MQI Inventory`,
//         html: `
//             <h2>🔄 Pending Return Requests Reminder</h2>
//             <p>Dear Monitor,</p>
//             <p>You have <strong>${pendingCount}</strong> pending return request${pendingCount > 1 ? 's' : ''} awaiting your approval.</p>
//             <p><a href="https://mqi-ims.uc.r.appspot.com/monitor/approvals" style="background-color: #F59E0B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Returns</a></p>
//             <p>Best regards,<br>Marquardt India Inventory System</p>
//         `
//     };
    
//     return transporter.sendMail(mailOptions);
// };

module.exports = {
    sendRegistrationApprovalEmail,
    sendRegistrationRejectionEmail,
    sendNewRegistrationNotification,
    sendRegistrationConfirmation,
    sendProductRequestReminder
};