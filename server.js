const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Sessions ───────────────────────────────────────────────────────

// GET all sessions (with coord + pin counts)
app.get('/api/sessions', (req, res) => {
  try {
    const sessions = db.getAllSessions();
    // Attach coords to each session
    const result = sessions.map(s => ({
      ...s,
      coords: db.getSessionCoords.all(s.id)
    }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create a new session
app.post('/api/sessions', (req, res) => {
  try {
    const { id, color } = req.body;
    if (!id || !color) return res.status(400).json({ error: 'id and color required' });
    db.createSession(id, color);
    res.json({ id, color, started_at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST batch coords to a session
app.post('/api/sessions/:id/coords', (req, res) => {
  try {
    const { coords } = req.body;
    if (!Array.isArray(coords) || coords.length === 0)
      return res.status(400).json({ error: 'coords array required' });
    db.insertCoordsBatch(req.params.id, coords);
    res.json({ saved: coords.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH end a session
app.patch('/api/sessions/:id/end', (req, res) => {
  try {
    db.endSession(req.params.id);
    res.json({ ended: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Pins ───────────────────────────────────────────────────────────

// GET all pins
app.get('/api/pins', (req, res) => {
  try {
    res.json(db.getAllPins());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create a pin
app.post('/api/pins', (req, res) => {
  try {
    const pin = req.body;
    if (!pin.id || !pin.lat || !pin.lng)
      return res.status(400).json({ error: 'id, lat, lng required' });
    db.createPin(pin);
    res.json({ ...pin, created_at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE a pin
app.delete('/api/pins/:id', (req, res) => {
  try {
    db.deletePin(req.params.id);
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Health check ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Catch-all → serve frontend ─────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CanvassTrack running on http://localhost:${PORT}`);
});
