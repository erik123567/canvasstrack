const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'canvasstrack.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    color       TEXT NOT NULL,
    started_at  TEXT NOT NULL,
    ended_at    TEXT,
    active      INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS coords (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    recorded_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS pins (
    id          TEXT PRIMARY KEY,
    session_id  TEXT,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    address     TEXT,
    status      TEXT DEFAULT 'Dropped Lit',
    notes       TEXT,
    created_at  TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_coords_session ON coords(session_id);
  CREATE INDEX IF NOT EXISTS idx_pins_session   ON pins(session_id);
`);

// ── Sessions ───────────────────────────────────────────────────────
const createSession = db.prepare(`
  INSERT INTO sessions (id, color, started_at) VALUES (?, ?, ?)
`);

const endSession = db.prepare(`
  UPDATE sessions SET ended_at = ?, active = 0 WHERE id = ?
`);

const getAllSessions = db.prepare(`
  SELECT s.*,
    COUNT(DISTINCT c.id) as coord_count,
    COUNT(DISTINCT p.id) as pin_count
  FROM sessions s
  LEFT JOIN coords c ON c.session_id = s.id
  LEFT JOIN pins   p ON p.session_id = s.id
  GROUP BY s.id
  ORDER BY s.started_at DESC
`);

const getSessionCoords = db.prepare(`
  SELECT lat, lng, recorded_at FROM coords WHERE session_id = ? ORDER BY recorded_at ASC
`);

// ── Coords ─────────────────────────────────────────────────────────
const insertCoordsBatch = db.transaction((sessionId, coords) => {
  const stmt = db.prepare(`INSERT INTO coords (session_id, lat, lng, recorded_at) VALUES (?, ?, ?, ?)`);
  for (const c of coords) {
    stmt.run(sessionId, c.lat, c.lng, c.ts || new Date().toISOString());
  }
});

// ── Pins ───────────────────────────────────────────────────────────
const createPin = db.prepare(`
  INSERT INTO pins (id, session_id, lat, lng, address, status, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const getAllPins = db.prepare(`
  SELECT * FROM pins ORDER BY created_at DESC
`);

const deletePin = db.prepare(`DELETE FROM pins WHERE id = ?`);

module.exports = {
  createSession: (id, color) => createSession.run(id, color, new Date().toISOString()),
  endSession:    (id) => endSession.run(new Date().toISOString(), id),
  getAllSessions: () => getAllSessions.all(),
  getSessionCoords,
  insertCoordsBatch,
  createPin: (pin) => createPin.run(
    pin.id, pin.sessionId || null, pin.lat, pin.lng,
    pin.address || null, pin.status || 'Dropped Lit',
    pin.notes || null, new Date().toISOString()
  ),
  getAllPins: () => getAllPins.all(),
  deletePin: (id) => deletePin.run(id),
};
