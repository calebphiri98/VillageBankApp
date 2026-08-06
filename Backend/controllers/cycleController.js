const db = require('../config/db');

// Create a new cycle
const createCycle = async (req, res) => {
    const { cycle_name, start_date, end_date } = req.body;
    const created_by = req.user.id;

    try {
        if (!cycle_name || !start_date) {
            return res.status(400).json({ message: 'Cycle name and start date are required' });
        }

        const [result] = await db.query(
            `INSERT INTO cycles (cycle_name, start_date, end_date, status)
             VALUES (?, ?, ?, 'active')`,
            [cycle_name, start_date, end_date || null]
        );

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'CREATE_CYCLE', 'cycles', ?, ?)`,
            [created_by, result.insertId, `Cycle: ${cycle_name}`]
        );

        res.status(201).json({
            message: 'Cycle created successfully',
            cycleId: result.insertId
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating cycle', error: error.message });
    }
};

// Get all cycles
const getAllCycles = async (req, res) => {
    try {
        const [cycles] = await db.query(`
            SELECT id, cycle_name, start_date, end_date, status, created_at
            FROM cycles
            ORDER BY id DESC
        `);
        res.json(cycles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cycles', error: error.message });
    }
};

// Get the current active cycle
const getActiveCycle = async (req, res) => {
    try {
        const [cycles] = await db.query(`
            SELECT id, cycle_name, start_date, end_date, status
            FROM cycles
            WHERE status = 'active'
            ORDER BY id DESC
            LIMIT 1
        `);

        if (cycles.length === 0) {
            return res.status(404).json({ message: 'No active cycle found' });
        }

        res.json(cycles[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching active cycle', error: error.message });
    }
};

// Close a cycle
const closeCycle = async (req, res) => {
    const cycleId = req.params.id;
    const closed_by = req.user.id;

    try {
        const [result] = await db.query(
            `UPDATE cycles 
             SET status = 'completed', end_date = CURDATE()
             WHERE id = ? AND status = 'active'`,
            [cycleId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Active cycle not found' });
        }

        // Audit log
        await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES (?, 'CLOSE_CYCLE', 'cycles', ?, 'Cycle closed')`,
            [closed_by, cycleId]
        );

        res.json({ message: 'Cycle closed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error closing cycle', error: error.message });
    }
};

// Get a specific cycle
const getCycleById = async (req, res) => {
    try {
        const [cycles] = await db.query(
            `SELECT id, cycle_name, start_date, end_date, status FROM cycles WHERE id = ?`,
            [req.params.id]
        );

        if (cycles.length === 0) {
            return res.status(404).json({ message: 'Cycle not found' });
        }

        res.json(cycles[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cycle', error: error.message });
    }
};

module.exports = {
    createCycle,
    getAllCycles,
    getActiveCycle,
    closeCycle,
    getCycleById
};