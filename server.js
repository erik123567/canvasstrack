const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // allow large base64 photos
app.use(express.static(path.join(__dirname, 'public')));

// ── Sessions ───────────────────────────────────────────────────────
app.get('/api/sessions', (req, res) => {
  try { res.json(db.getAllSessions()); } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sessions', (req, res) => {
  try {
    const { id, color } = req.body;
    if (!id || !color) return res.status(400).json({ error: 'id and color required' });
    db.createSession(id, color);
    res.json({ id, color, started_at: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sessions/:id/coords', (req, res) => {
  try {
    const { coords } = req.body;
    if (!Array.isArray(coords) || !coords.length) return res.status(400).json({ error: 'coords array required' });
    db.insertCoordsBatch(req.params.id, coords);
    res.json({ saved: coords.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/sessions/:id/end', (req, res) => {
  try { db.endSession(req.params.id); res.json({ ended: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Pins ───────────────────────────────────────────────────────────
app.get('/api/pins', (req, res) => {
  try { res.json(db.getAllPins()); } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pins', (req, res) => {
  try {
    const pin = req.body;
    if (!pin.id || !pin.lat || !pin.lng) return res.status(400).json({ error: 'id, lat, lng required' });
    db.createPin(pin);
    res.json({ ...pin, created_at: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Edit a pin
app.patch('/api/pins/:id', (req, res) => {
  try {
    const pin = { id: req.params.id, ...req.body };
    db.updatePin(pin);
    res.json({ updated: true, ...pin });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/pins/:id', (req, res) => {
  try { db.deletePin(req.params.id); res.json({ deleted: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`CanvassTrack running on http://localhost:${PORT}`));
