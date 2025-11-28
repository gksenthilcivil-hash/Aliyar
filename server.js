const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, 'bookings.db');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Failed to connect to SQLite database:', err.message);
        process.exit(1);
    }
    console.log(`Connected to SQLite database at ${DB_PATH}`);
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            name TEXT NOT NULL,
            rooms INTEGER NOT NULL,
            roomNumbers TEXT NOT NULL,
            remarks TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

const mapRow = (row) => ({
    ...row,
    roomNumbers: row.roomNumbers ? JSON.parse(row.roomNumbers) : []
});

app.get('/api/health', (req, res) => {
    db.get('SELECT 1 as ok', [], (err) => {
        if (err) {
            return res.status(500).json({ status: 'error', message: err.message });
        }
        res.json({ status: 'ok' });
    });
});

app.get('/api/bookings', (req, res) => {
    db.all('SELECT * FROM bookings ORDER BY date ASC, createdAt ASC', [], (err, rows) => {
        if (err) {
            console.error('Failed to read bookings:', err);
            return res.status(500).json({ message: 'Failed to load bookings' });
        }
        res.json(rows.map(mapRow));
    });
});

app.post('/api/bookings', (req, res) => {
    const payload = sanitizeBookingPayload(req.body);
    if (!payload.valid) {
        return res.status(400).json({ message: payload.message });
    }

    const booking = payload.booking;
    const stmt = db.prepare(`
        INSERT INTO bookings (id, date, name, rooms, roomNumbers, remarks, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(
        booking.id,
        booking.date,
        booking.name,
        booking.rooms,
        JSON.stringify(booking.roomNumbers || []),
        booking.remarks || '',
        function (err) {
            if (err) {
                console.error('Failed to create booking:', err);
                return res.status(500).json({ message: 'Failed to create booking' });
            }
            res.status(201).json(booking);
        }
    );
    stmt.finalize();
});

app.put('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const payload = sanitizeBookingPayload({ ...req.body, id });
    if (!payload.valid) {
        return res.status(400).json({ message: payload.message });
    }

    const booking = payload.booking;
    const stmt = db.prepare(`
        UPDATE bookings
        SET date = ?, name = ?, rooms = ?, roomNumbers = ?, remarks = ?
        WHERE id = ?
    `);
    stmt.run(
        booking.date,
        booking.name,
        booking.rooms,
        JSON.stringify(booking.roomNumbers || []),
        booking.remarks || '',
        booking.id,
        function (err) {
            if (err) {
                console.error('Failed to update booking:', err);
                return res.status(500).json({ message: 'Failed to update booking' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Booking not found' });
            }
            res.json(booking);
        }
    );
    stmt.finalize();
});

app.delete('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM bookings WHERE id = ?');
    stmt.run(id, function (err) {
        if (err) {
            console.error('Failed to delete booking:', err);
            return res.status(500).json({ message: 'Failed to delete booking' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.status(204).send();
    });
    stmt.finalize();
});

app.use(express.static(__dirname));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
});

function sanitizeBookingPayload(body) {
    if (!body) {
        return { valid: false, message: 'Missing booking data' };
    }

    const booking = {
        id: body.id || generateId(),
        date: body.date,
        name: body.name,
        rooms: Number(body.rooms),
        roomNumbers: Array.isArray(body.roomNumbers) ? body.roomNumbers : [],
        remarks: body.remarks || ''
    };

    if (!booking.date || !booking.name || !booking.rooms) {
        return { valid: false, message: 'Date, guest name, and number of rooms are required.' };
    }

    if (booking.rooms < 1 || booking.rooms > 3) {
        return { valid: false, message: 'Number of rooms must be between 1 and 3.' };
    }

    return { valid: true, booking };
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

