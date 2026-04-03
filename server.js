const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const path    = require('path');
const db      = require('./database');

const app    = express();
const PORT   = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'canvasstrack-dev-secret-change-in-prod';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth middleware ────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, SECRET);
    req.userId = payload.userId;
    next();
  } catch(e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Auth routes ────────────────────────────────────────────────────

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = db.getUserByEmail(email.toLowerCase().trim());
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const id = Date.now() + Math.random().toString(36).slice(2);
    db.createUser(id, name.trim(), email.toLowerCase().trim(), hashed);

    const token = jwt.sign({ userId: id }, SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id, name: name.trim(), email: email.toLowerCase().trim() } });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = db.getUserByEmail(email.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Get current user
app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    const user = db.getUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Sessions (protected) ───────────────────────────────────────────
app.get('/api/sessions', requireAuth, (req, res) => {
  try { res.json(db.getUserSessions(req.userId)); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sessions', requireAuth, (req, res) => {
  try {
    const { id, color } = req.body;
    if (!id || !color) return res.status(400).json({ error: 'id and color required' });
    db.createSession(id, req.userId, color);
    res.json({ id, color, started_at: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sessions/:id/coords', requireAuth, (req, res) => {
  try {
    const { coords } = req.body;
    if (!Array.isArray(coords) || !coords.length)
      return res.status(400).json({ error: 'coords array required' });
    db.insertCoordsBatch(req.params.id, coords);
    res.json({ saved: coords.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/sessions/:id/end', requireAuth, (req, res) => {
  try { db.endSession(req.params.id, req.userId); res.json({ ended: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Pins (protected) ──────────────────────────────────────────────
app.get('/api/pins', requireAuth, (req, res) => {
  try { res.json(db.getUserPins(req.userId)); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pins', requireAuth, (req, res) => {
  try {
    const pin = req.body;
    if (!pin.id || !pin.lat || !pin.lng)
      return res.status(400).json({ error: 'id, lat, lng required' });
    db.createPin(pin, req.userId);
    res.json({ ...pin, user_id: req.userId, created_at: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/pins/:id', requireAuth, (req, res) => {
  try {
    db.updatePin({ id: req.params.id, ...req.body }, req.userId);
    res.json({ updated: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/pins/:id', requireAuth, (req, res) => {
  try { db.deletePin(req.params.id, req.userId); res.json({ deleted: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Shared Routes ─────────────────────────────────────────────────

// Generate a share code for a session
app.post('/api/sessions/:id/share', requireAuth, (req, res) => {
  try {
    // Check if already has a code
    const existing = db.getShareCodeForSession(req.params.id, req.userId);
    if (existing) return res.json({ code: existing.share_code });

    // Generate unique 6-char code
    let code, tries = 0;
    do {
      code = Math.random().toString(36).slice(2, 8).toUpperCase();
      tries++;
    } while (db.getSharedByCode(code) && tries < 10);

    db.createShareCode(code, req.params.id, req.userId);
    res.json({ code });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Import a shared route by code
app.post('/api/coverage/import', requireAuth, (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Share code required' });

    const shared = db.getSharedByCode(code.trim());
    if (!shared) return res.status(404).json({ error: 'Route not found — check the code' });
    if (shared.created_by === req.userId)
      return res.status(400).json({ error: "That's your own route!" });

    db.importRoute(req.userId, shared.session_id, code.toUpperCase(), shared.owner_name);
    res.json({ imported: true, owner_name: shared.owner_name });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Get all imported routes + their pins
app.get('/api/coverage/shared', requireAuth, (req, res) => {
  try {
    res.json({
      sessions: db.getImportedRoutes(req.userId),
      pins:     db.getImportedPins(req.userId),
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Remove an imported route
app.delete('/api/coverage/shared/:sessionId', requireAuth, (req, res) => {
  try {
    db.removeImportedRoute(req.userId, req.params.sessionId);
    res.json({ removed: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`CanvassTrack running on http://localhost:${PORT}`));
