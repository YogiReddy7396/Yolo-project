const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
    }
});

/**
 * Send waste detection alert email to authorities
 * @param {Object} options
 * @param {string} options.label - Detected waste category
 * @param {string} options.severity - Severity level (Low/Medium/High)
 * @param {number} options.totalItems - Number of waste items detected
 * @param {number} options.confidence - Detection confidence (0-1)
 * @param {string} options.taggedImagePath - Absolute path to tagged image file
 * @param {number|null} options.latitude - GPS latitude
 * @param {number|null} options.longitude - GPS longitude
 * @param {string} options.username - User who submitted the detection
 */
async function sendAlertEmail({ label, severity, totalItems, confidence, taggedImagePath, latitude, longitude, username }) {
    // Don't send email if no waste detected or SMTP not configured
    if (label === 'No Waste Detected') return;
    if (!process.env.SMTP_EMAIL || process.env.SMTP_EMAIL === 'your-email@gmail.com') {
        console.log('⚠️  Email not configured. Skipping alert email.');
        return;
    }

    const recipient = process.env.ALERT_RECIPIENT || 'sbm-mud@nic.in';
    const mapsLink = (latitude && longitude)
        ? `https://www.google.com/maps?q=${latitude},${longitude}`
        : 'Location not available';

    const locationText = (latitude && longitude)
        ? `📍 GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        : '📍 Location: Not available';

    const confidencePercent = (confidence * 100).toFixed(1);
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fffe; border-radius: 12px; overflow: hidden; border: 1px solid #d1fae5;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #065f46, #10b981); padding: 24px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🌿 EcoSight Alert</h1>
            <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">Automated Waste Detection Report</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
            
            <!-- Severity Banner -->
            <div style="background: ${severity === 'High' ? '#fef2f2' : severity === 'Medium' ? '#fffbeb' : '#f0fdf4'}; 
                        border-left: 4px solid ${severity === 'High' ? '#ef4444' : severity === 'Medium' ? '#f59e0b' : '#22c55e'}; 
                        padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
                <strong style="color: ${severity === 'High' ? '#dc2626' : severity === 'Medium' ? '#d97706' : '#16a34a'};">
                    ⚠️ Severity: ${severity} (${totalItems} item${totalItems !== 1 ? 's' : ''} detected)
                </strong>
            </div>

            <!-- Detection Info -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 8px 0; color: #6b7280; width: 140px;">🗂️ Category:</td>
                    <td style="padding: 8px 0; font-weight: 600;">${label}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">📊 Confidence:</td>
                    <td style="padding: 8px 0; font-weight: 600;">${confidencePercent}%</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">🔢 Items Found:</td>
                    <td style="padding: 8px 0; font-weight: 600;">${totalItems}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">${locationText.split(':')[0]}:</td>
                    <td style="padding: 8px 0; font-weight: 600;">
                        ${(latitude && longitude)
            ? `<a href="${mapsLink}" style="color: #059669; text-decoration: underline;">${latitude.toFixed(6)}, ${longitude.toFixed(6)} — Open in Maps</a>`
            : 'Not available'}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">🕐 Timestamp:</td>
                    <td style="padding: 8px 0; font-weight: 600;">${timestamp}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">👤 Reported by:</td>
                    <td style="padding: 8px 0; font-weight: 600;">${username || 'EcoSight User'}</td>
                </tr>
            </table>

            <p style="color: #6b7280; font-size: 13px; margin-top: 5px;">📎 The detected image is attached to this email.</p>
        </div>

        <!-- Footer -->
        <div style="background: #f0fdf4; padding: 16px 30px; text-align: center; border-top: 1px solid #d1fae5;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This alert was generated by <strong>EcoSight</strong> — AI-Powered Waste Detection System
            </p>
        </div>
    </div>
    `;

    const mailOptions = {
        from: `"EcoSight Alert" <${process.env.SMTP_EMAIL}>`,
        to: recipient,
        subject: `🚨 EcoSight: ${severity} Severity Waste Detected — ${label}`,
        html: htmlBody,
        attachments: []
    };

    // Attach tagged image if it exists
    if (taggedImagePath) {
        const fs = require('fs');
        if (fs.existsSync(taggedImagePath)) {
            mailOptions.attachments.push({
                filename: path.basename(taggedImagePath),
                path: taggedImagePath,
                cid: 'detection-image'
            });
        }
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Alert email sent to ${recipient}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send alert email:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { sendAlertEmail };
