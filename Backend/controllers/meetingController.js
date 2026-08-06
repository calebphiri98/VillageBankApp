const db = require('../config/db');

// Create a new meeting and record attendance
const createMeeting = async (req, res) => {
    const { meeting_date, cycle_id, notes, attendance } = req.body;
    const recorded_by = req.user.id;

    try {
        if (!meeting_date) {
            return res.status(400).json({ message: 'Meeting date is required' });
        }

        // Create the meeting
        const [meetingResult] = await db.query(
            `INSERT INTO meetings (meeting_date, cycle_id, notes, recorded_by)
             VALUES (?, ?, ?, ?)`,
            [meeting_date, cycle_id || null, notes || null, recorded_by]
        );

        const meetingId = meetingResult.insertId;

        // Record attendance if provided
        if (attendance && Array.isArray(attendance) && attendance.length > 0) {
            for (const item of attendance) {
                await db.query(
                    `INSERT INTO attendance (meeting_id, member_id, status)
                     VALUES (?, ?, ?)`,
                    [meetingId, item.member_id, item.status || 'present']
                );
            }
        }

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'CREATE_MEETING', 'meetings', ?, ?)`,
            [recorded_by, meetingId, `Meeting on ${meeting_date}`]
        );

        // ===== AUTOMATIC SMS to all active members =====
        const { sendSMS } = require('../utils/smsService');
        const [members] = await db.query(`
            SELECT u.full_name, u.phone 
            FROM members m
            JOIN users u ON m.user_id = u.id
            WHERE m.status = 'active' AND u.phone IS NOT NULL
        `);

        for (const member of members) {
            const message = `Dear ${member.full_name}, a VSLA meeting is scheduled on ${meeting_date}. Please attend. - Manase VSLA`;
            await sendSMS(member.phone, message, recorded_by);
        }

        res.status(201).json({
            message: 'Meeting created successfully',
            meetingId: meetingId,
            sms_sent_to: members.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating meeting', error: error.message });
    }
};
// Get all meetings
const getAllMeetings = async (req, res) => {
    try {
        const [meetings] = await db.query(`
            SELECT m.id, m.meeting_date, m.notes, m.cycle_id,
                   u.full_name as recorded_by_name
            FROM meetings m
            LEFT JOIN users u ON m.recorded_by = u.id
            ORDER BY m.meeting_date DESC
        `);
        res.json(meetings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching meetings', error: error.message });
    }
};

// Get a specific meeting with attendance
const getMeetingById = async (req, res) => {
    try {
        const meetingId = req.params.id;

        // Get meeting details
        const [meetings] = await db.query(`
            SELECT m.id, m.meeting_date, m.notes, m.cycle_id,
                   u.full_name as recorded_by_name
            FROM meetings m
            LEFT JOIN users u ON m.recorded_by = u.id
            WHERE m.id = ?
        `, [meetingId]);

        if (meetings.length === 0) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Get attendance
        const [attendance] = await db.query(`
            SELECT a.id, a.status, m.membership_number, u.full_name
            FROM attendance a
            JOIN members m ON a.member_id = m.id
            JOIN users u ON m.user_id = u.id
            WHERE a.meeting_id = ?
        `, [meetingId]);

        res.json({
            meeting: meetings[0],
            attendance: attendance
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching meeting', error: error.message });
    }
};

// Get attendance summary of a member
const getMemberAttendance = async (req, res) => {
    try {
        const [records] = await db.query(`
            SELECT a.status, m.meeting_date
            FROM attendance a
            JOIN meetings m ON a.meeting_id = m.id
            WHERE a.member_id = ?
            ORDER BY m.meeting_date DESC
        `, [req.params.memberId]);

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching member attendance', error: error.message });
    }
};

module.exports = {
    createMeeting,
    getAllMeetings,
    getMeetingById,
    getMemberAttendance
};