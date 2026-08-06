const { sendSMS } = require('../utils/smsService');

// Send a test / manual SMS
const sendTestSMS = async (req, res) => {
    const { phone, message } = req.body;
    const sent_by = req.user.id;

    try {
        if (!phone || !message) {
            return res.status(400).json({ message: 'Phone number and message are required' });
        }

        const result = await sendSMS(phone, message, sent_by);

        if (result.success) {
            res.json({
                message: 'SMS sent successfully (simulated)',
                smsId: result.messageId
            });
        } else {
            res.status(500).json({ message: 'Failed to send SMS', error: result.error });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error sending SMS', error: error.message });
    }
};

// Get SMS history
const getSMSHistory = async (req, res) => {
    try {
        const db = require('../config/db');
        const [messages] = await db.query(`
            SELECT id, recipient_phone, message, status, sent_at
            FROM sms_notifications
            ORDER BY sent_at DESC
            LIMIT 50
        `);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching SMS history', error: error.message });
    }
};

module.exports = {
    sendTestSMS,
    getSMSHistory
};