const db = require('../config/db');

/**
 * Simulate sending an SMS
 * Later this can be replaced with real Africa's Talking code
 */
const sendSMS = async (phone, message, sent_by = null) => {
    try {
        // Save to database
        const [result] = await db.query(
            `INSERT INTO sms_notifications (recipient_phone, message, status, sent_by)
             VALUES (?, ?, 'sent', ?)`,
            [phone, message, sent_by]
        );

        // Log to console (simulation)
        console.log('=================================');
        console.log('📱 SMS SIMULATION');
        console.log('To      :', phone);
        console.log('Message :', message);
        console.log('=================================');

        return {
            success: true,
            messageId: result.insertId,
            message: 'SMS simulated and logged successfully'
        };
    } catch (error) {
        console.error('SMS Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = { sendSMS };