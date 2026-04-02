const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(process.env.DB_PATH || path.join(__dirname, 'canvasstrack.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    color       TEXT NOT NULL,
    started_at  TEXT NOT NULL,
    ended_at    TEXT,
    active      INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
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
    user_id     TEXT NOT NULL,
    session_id  TEXT,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    address     TEXT,
    status      TEXT DEFAULT 'Dropped Lit',
    notes       TEXT,
    photo       TEXT,
    created_at  TEXT NOT NULL,
    FOREIGN KEY (user_id)    REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_coords_session  ON coords(session_id);
  CREATE INDEX IF NOT EXISTS idx_pins_user       ON pins(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user   ON sessions(user_id);
`);

// Migrate existing tables if upgrading from no-auth version
try { db.exec(`ALTER TABLE sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT 'legacy'`); } catch(e) {}
try { db.exec(`ALTER TABLE pins ADD COLUMN user_id TEXT NOT NULL DEFAULT 'legacy'`); } catch(e) {}
try { db.exec(`ALTER TABLE pins ADD COLUMN photo TEXT`); } catch(e) {}

// ── Users ──────────────────────────────────────────────────────────
const createUser    = db.prepare(`INSERT INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)`);
const getUserByEmail = db.prepare(`SELECT * FROM users WHERE email = ?`);
const getUserById   = db.prepare(`SELECT id, name, email, created_at FROM users WHERE id = ?`);

// ── Sessions ───────────────────────────────────────────────────────
const createSession = db.prepare(`INSERT INTO sessions (id, user_id, color, started_at) VALUES (?, ?, ?, ?)`);
const endSession    = db.prepare(`UPDATE sessions SET ended_at = ?, active = 0 WHERE id = ? AND user_id = ?`);
const getUserSessions = db.prepare(`
  SELECT s.*, COUNT(DISTINCT c.id) as coord_count, COUNT(DISTINCT p.id) as pin_count
  FROM sessions s
  LEFT JOIN coords c ON c.session_id = s.id
  LEFT JOIN pins   p ON p.session_id = s.id
  WHERE s.user_id = ?
  GROUP BY s.id ORDER BY s.started_at DESC
`);
const getSessionCoords = db.prepare(`SELECT lat, lng, recorded_at FROM coords WHERE session_id = ? ORDER BY recorded_at ASC`);

const insertCoordsBatch = db.transaction((sessionId, coords) => {
  const stmt = db.prepare(`INSERT INTO coords (session_id, lat, lng, recorded_at) VALUES (?, ?, ?, ?)`);
  for (const c of coords) stmt.run(sessionId, c.lat, c.lng, c.ts || new Date().toISOString());
});

// ── Pins ───────────────────────────────────────────────────────────
const createPin = db.prepare(`
  INSERT INTO pins (id, user_id, session_id, lat, lng, address, status, notes, photo, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const updatePin = db.prepare(`
  UPDATE pins SET address = ?, status = ?, notes = ?, photo = ? WHERE id = ? AND user_id = ?
`);
const getUserPins = db.prepare(`SELECT * FROM pins WHERE user_id = ? ORDER BY created_at DESC`);
const deletePin   = db.prepare(`DELETE FROM pins WHERE id = ? AND user_id = ?`);

module.exports = {
  // Users
  createUser: (id, name, email, hashedPassword) =>
    createUser.run(id, name, email, hashedPassword, new Date().toISOString()),
  getUserByEmail: (email) => getUserByEmail.get(email),
  getUserById:    (id)    => getUserById.get(id),

  // Sessions
  createSession: (id, userId, color) => createSession.run(id, userId, color, new Date().toISOString()),
  endSession:    (id, userId) => endSession.run(new Date().toISOString(), id, userId),
  getUserSessions: (userId) => getUserSessions.all(userId).map(s => ({
    ...s, coords: getSessionCoords.all(s.id)
  })),
  insertCoordsBatch,

  // Pins
  createPin: (pin, userId) => createPin.run(
    pin.id, userId, pin.sessionId || null, pin.lat, pin.lng,
    pin.address || null, pin.status || 'Dropped Lit',
    pin.notes || null, pin.photo || null, new Date().toISOString()
  ),
  updatePin: (pin, userId) => updatePin.run(
    pin.address || null, pin.status || 'Dropped Lit',
    pin.notes || null, pin.photo || null, pin.id, userId
  ),
  getUserPins: (userId) => getUserPins.all(userId),
  deletePin:   (id, userId) => deletePin.run(id, userId),
};
