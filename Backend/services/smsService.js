const db = require('../config/db');

// Convert Malawi local number to international format
function formatPhone(phone) {
    if (!phone) return null;
    let cleaned = phone.toString().replace(/\s+/g, '').replace(/^\+/, '');

    if (cleaned.startsWith('0')) {
        cleaned = '265' + cleaned.substring(1);
    }

    return cleaned;
}

// Send SMS via Brevo
async function sendSMS(phone, message) {
    const recipient = formatPhone(phone);
    const sender = process.env.BREVO_SENDER || 'ManaseVSLA';
    const apiKey = process.env.BREVO_API_KEY;

    let status = 'failed';
    let providerResponse = null;

    try {
        if (!apiKey) {
            throw new Error('BREVO_API_KEY is missing in .env');
        }

        if (!recipient) {
            throw new Error('Invalid phone number');
        }

        const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify({
                sender: sender,
                recipient: recipient,
                content: message,
                type: 'transactional'
            })
        });

        const result = await response.json();
        providerResponse = result;

        if (response.ok) {
            status = 'sent';
        } else {
            status = 'failed';
            console.error('Brevo SMS Error:', result);
        }
    } catch (error) {
        status = 'failed';
        providerResponse = { error: error.message };
        console.error('SMS Service Error:', error.message);
    }

    // Save to database
    try {
        const [insertResult] = await db.query(
            `INSERT INTO sms_notifications (recipient_phone, message, status, sent_at)
             VALUES (?, ?, ?, NOW())`,
            [phone, message, status]
        );

        return {
            success: status === 'sent',
            smsId: insertResult.insertId,
            status,
            providerResponse
        };
    } catch (dbError) {
        console.error('SMS DB Error:', dbError.message);
        return {
            success: status === 'sent',
            status,
            providerResponse
        };
    }
}

module.exports = { sendSMS, formatPhone };