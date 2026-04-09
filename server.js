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
    // Migrate any legacy (pre-auth) data to this user on first login
    db.migrateLegacyData(user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Forgot password — in production this would email a reset link
// For now it logs the request and returns success (admin can use /api/auth/admin-reset)
app.post('/api/auth/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = db.getUserByEmail(email.toLowerCase().trim());
    // Always return success to avoid email enumeration
    console.log(`Password reset requested for: ${email} - exists: ${!!user}`);
    res.json({ sent: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Admin reset (use this manually if needed: POST /api/auth/admin-reset with {email, newPassword, adminKey})
app.post('/api/auth/admin-reset', async (req, res) => {
  try {
    const { email, newPassword, adminKey } = req.body;
    if (adminKey !== (process.env.ADMIN_KEY || 'canvasstrack-admin')) 
      return res.status(403).json({ error: 'Invalid admin key' });
    const user = db.getUserByEmail(email?.toLowerCase().trim());
    if (!user) return res.status(404).json({ error: 'User not found' });
    const hashed = await bcrypt.hash(newPassword, 10);
    db.updatePassword(user.id, hashed);
    res.json({ reset: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
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

// Change password
app.patch('/api/auth/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Current and new password required' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const user = db.getUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const fullUser = db.getUserByEmail(user.email);
    const match = await bcrypt.compare(currentPassword, fullUser.password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 10);
    db.updatePassword(req.userId, hashed);
    res.json({ updated: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
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
    db.createPin(pin, req.userId); // pin includes owner_name, phone, followup_date
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


// ── Storm Data (Iowa Env. Mesonet — mirrors NOAA/NWS) ─────────────
// IEM provides a proper REST API for NWS storm reports: hail, wind, tornadoes
// Single request for a date range vs 270 individual NOAA CSV fetches
const https = require('https');
let stormCache = { data: null, fetchedAt: 0 }; // cleared on each deploy

function fetchJSON(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? require('https') : require('http');
    const req = lib.get(url, { headers: { 'User-Agent': 'CanvassTrack/1.0' } }, res => {
      // Follow redirects
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        console.log('Redirecting to:', redirectUrl);
        res.resume(); // discard response body
        return fetchJSON(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
      }
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error('HTTP ' + res.statusCode + ': ' + raw.slice(0, 200)));
        }
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(new Error('JSON parse error — got: ' + raw.slice(0, 150))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function iemTypeToCanvass(p) {
  // IEM single-char type codes
  // IEM ignores type= URL filter so we get all types and filter here
  const code = p.type || '';
  if (code === 'H') return 'hail';
  if (code === 'T') return 'tornado';
  // Wind: G=wind gust, D=wind damage, W=high wind, N=non-tstm wind dmg
  if (code === 'G' || code === 'D' || code === 'W' || code === 'N') return 'wind';
  // Fallback: parse typetext string
  const txt = (p.typetext || '').toUpperCase();
  if (txt === 'HAIL') return 'hail';
  if (txt === 'TORNADO') return 'tornado';
  if (txt.includes('WND') || txt.includes('WIND')) return 'wind';
  return null; // floods, snow, etc. filtered out
}

function parseIEMFeatures(features) {
  return features.map(f => {
    try {
      const p = f.properties || {};
      const type = iemTypeToCanvass(p);
      if (!type) return null;
      const coords = f.geometry && f.geometry.coordinates;
      if (!coords || coords.length < 2) return null;
      const lng = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      if (isNaN(lat) || isNaN(lng)) return null;
      // magnitude: inches for hail, mph for wind, EF# for tornado
      const mag = parseFloat(p.magnitude) || 0;
      if (type === 'hail' && mag < 0.75) return null; // ≥0.75" (penny) = insurance threshold
      if (type === 'wind' && mag < 45)  return null;   // ≥45mph — lower to catch more damage events
      // IEM date field is 'valid' (UTC ISO string)
      const dateStr = (p.valid || '').split('T')[0] || new Date().toISOString().split('T')[0];
      return {
        type, date: dateStr, mag,
        location: p.city  || '',
        county:   p.county || '',
        state:    p.st    || p.state || '',
        lat, lng
      };
    } catch(err) { return null; }
  }).filter(Boolean);
}

app.get('/api/storm/events', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const now  = Date.now();

    // Cache for 1 hour
    if (stormCache.data && now - stormCache.fetchedAt < 3600000) {
      const cutoff = new Date(now - days * 86400000).toISOString().split('T')[0];
      return res.json(stormCache.data.filter(e => e.date >= cutoff));
    }

    // Build ISO date strings for IEM API (no milliseconds)
    const ets = new Date();
    const sts = new Date(now - 365 * 86400000);
    const toISOSimple = d => d.toISOString().split('.')[0] + 'Z';

    // IEM LSR API — correct endpoint is lsr.geojson (no 's')
    // Filter to storm-damage types only: H=hail, T=tornado, D=wind damage, G=wind gust
    // Nationwide, 90 days
    const url = 'https://mesonet.agron.iastate.edu/geojson/lsr.geojson' +
      '?sts=' + toISOSimple(sts) +
      '&ets=' + toISOSimple(ets) +
      '&type=H&type=T&type=D&type=G&type=W';  // W=high wind

    console.log('Fetching IEM storm data...');
    const geojson = await fetchJSON(url);

    if (!geojson || typeof geojson !== 'object') {
      throw new Error('IEM returned non-JSON response');
    }
    const features = geojson.features || [];
    console.log('IEM returned ' + features.length + ' raw features');

    const all = parseIEMFeatures(features);
    console.log('Parsed ' + all.length + ' qualifying storm events');

    stormCache = { data: all, fetchedAt: now };
    const cutoff = new Date(now - days * 86400000).toISOString().split('T')[0];
    res.json(all.filter(e => e.date >= cutoff));

  } catch(e) {
    console.error('Storm fetch error:', e.message);
    res.status(500).json({ error: 'Could not fetch storm data: ' + e.message });
  }
});


// Debug endpoint — check what IEM actually returns
app.get('/api/storm/debug', async (req, res) => {
  try {
    const ets = new Date();
    const sts = new Date(Date.now() - 7 * 86400000);
    const toISO = d => d.toISOString().split('.')[0] + 'Z';
    const url = 'https://mesonet.agron.iastate.edu/geojson/lsr.geojson?sts=' + toISO(sts) + '&ets=' + toISO(ets) + '&type=H&type=T&type=D&type=G&type=W';  // W=high wind
    const raw = await new Promise((resolve, reject) => {
      const req2 = require('https').get(url, { headers: { 'User-Agent': 'CanvassTrack/1.0' } }, r => {
        let d = '';
        r.on('data', chunk => d += chunk);
        r.on('end', () => resolve({ status: r.statusCode, location: r.headers.location, body: d.slice(0, 500), contentType: r.headers['content-type'] }));
      });
      req2.on('error', e => reject(e));
      req2.setTimeout(10000, () => { req2.destroy(); reject(new Error('timeout')); });
    });
    res.json(raw);
  } catch(e) { res.json({ error: e.message }); }
});


// Stats endpoint — shows raw IEM data breakdown for debugging
app.get('/api/storm/stats', async (req, res) => {
  try {
    if (!stormCache.data) {
      return res.json({ error: 'No data cached yet — hit /api/storm/events?days=30 first' });
    }
    const byType = {};
    const raw = stormCache.data;
    raw.forEach(e => { byType[e.type] = (byType[e.type]||0)+1; });

    // Also show what gets filtered at each threshold
    const hailAll   = raw.filter(e=>e.type==='hail');
    const windAll   = raw.filter(e=>e.type==='wind');
    const tornAll   = raw.filter(e=>e.type==='tornado');

    res.json({
      total_cached: raw.length,
      by_type: byType,
      hail:    { total: hailAll.length, ge075: hailAll.filter(e=>e.mag>=0.75).length, ge1: hailAll.filter(e=>e.mag>=1.0).length, ge175: hailAll.filter(e=>e.mag>=1.75).length },
      wind:    { total: windAll.length, ge45: windAll.filter(e=>e.mag>=45).length, ge58: windAll.filter(e=>e.mag>=58).length, ge75: windAll.filter(e=>e.mag>=75).length },
      tornado: { total: tornAll.length },
      date_range: { oldest: raw.map(e=>e.date).sort()[0], newest: raw.map(e=>e.date).sort().reverse()[0] }
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/storm/hail', (req, res) => res.redirect('/api/storm/events?' + new URLSearchParams(req.query).toString()));


// ── Stats ─────────────────────────────────────────────────────────
app.get('/api/stats', requireAuth, (req, res) => {
  try {
    const userId = req.userId;
    const sessions = db.getUserSessions(userId);
    const pins     = db.getUserPins(userId);
    const now      = new Date();

    // Helper: date string YYYY-MM-DD
    const toDate = d => new Date(d).toISOString().split('T')[0];
    const todayStr    = now.toISOString().split('T')[0];
    const weekAgo     = new Date(now - 7  * 86400000).toISOString().split('T')[0];
    const monthAgo    = new Date(now - 30 * 86400000).toISOString().split('T')[0];

    // ── Today ──
    const todaySessions = sessions.filter(s => toDate(s.started_at) === todayStr);
    const todayPins     = pins.filter(p => toDate(p.created_at) === todayStr);

    // ── This week ──
    const weekSessions = sessions.filter(s => toDate(s.started_at) >= weekAgo);
    const weekPins     = pins.filter(p => toDate(p.created_at) >= weekAgo);

    // ── This month ──
    const monthPins    = pins.filter(p => toDate(p.created_at) >= monthAgo);

    // ── Status breakdown helper ──
    const statusCount = arr => arr.reduce((acc, p) => {
      acc[p.status || 'Unknown'] = (acc[p.status || 'Unknown'] || 0) + 1;
      return acc;
    }, {});

    // ── Daily breakdown for chart (last 30 days) ──
    const dailyMap = {};
    for (let d = 29; d >= 0; d--) {
      const dt = new Date(now - d * 86400000).toISOString().split('T')[0];
      dailyMap[dt] = { date: dt, pins: 0, interested: 0, appointments: 0, routes: 0 };
    }
    pins.filter(p => toDate(p.created_at) >= monthAgo).forEach(p => {
      const d = toDate(p.created_at);
      if (dailyMap[d]) {
        dailyMap[d].pins++;
        if (p.status === 'Interested')   dailyMap[d].interested++;
        if (p.status === 'Appointment')  dailyMap[d].appointments++;
      }
    });
    sessions.filter(s => toDate(s.started_at) >= monthAgo).forEach(s => {
      const d = toDate(s.started_at);
      if (dailyMap[d]) dailyMap[d].routes++;
    });
    const daily = Object.values(dailyMap);

    // ── Conversion rate ──
    const convRate = arr => {
      if (!arr.length) return 0;
      const hot = arr.filter(p => p.status === 'Interested' || p.status === 'Appointment').length;
      return Math.round((hot / arr.length) * 100);
    };

    // ── Follow-up stats ──
    const overdue  = pins.filter(p => p.followup_date && p.followup_date < todayStr).length;
    const dueToday = pins.filter(p => p.followup_date === todayStr).length;
    const upcoming = pins.filter(p => p.followup_date && p.followup_date > todayStr).length;

    // ── Best day ──
    const byDay = {};
    pins.forEach(p => {
      const d = toDate(p.created_at);
      byDay[d] = (byDay[d] || 0) + 1;
    });
    const bestDay = Object.entries(byDay).sort((a,b) => b[1]-a[1])[0];

    res.json({
      today: {
        routes:      todaySessions.length,
        pins:        todayPins.length,
        statuses:    statusCount(todayPins),
        convRate:    convRate(todayPins),
      },
      week: {
        routes:   weekSessions.length,
        pins:     weekPins.length,
        statuses: statusCount(weekPins),
        convRate: convRate(weekPins),
      },
      month: {
        pins:     monthPins.length,
        statuses: statusCount(monthPins),
        convRate: convRate(monthPins),
      },
      allTime: {
        routes:   sessions.length,
        pins:     pins.length,
        statuses: statusCount(pins),
        convRate: convRate(pins),
        bestDay:  bestDay ? { date: bestDay[0], count: bestDay[1] } : null,
      },
      followUps: { overdue, dueToday, upcoming },
      daily, // 30-day breakdown for chart
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


// ── Route Cleanup (OSRM Map Matching) ────────────────────────────
app.post('/api/sessions/:id/snap', requireAuth, async (req, res) => {
  try {
    const session = db.getUserSessions(req.userId).find(s => s.id === req.params.id);
    if(!session) return res.status(404).json({ error: 'Session not found' });

    const coords = session.coords;
    if(!coords || coords.length < 2)
      return res.status(400).json({ error: 'Not enough GPS points to snap' });

    // OSRM match API — free, no key needed
    // Chunk into batches of 100 (OSRM limit per request)
    const CHUNK = 100;
    const snapped = [];

    for(let i = 0; i < coords.length; i += CHUNK) {
      const chunk = coords.slice(i, Math.min(i + CHUNK, coords.length));
      // OSRM format: lng,lat;lng,lat (note: longitude first)
      const coordStr  = chunk.map(c => `${c.lng},${c.lat}`).join(';');
      const radiusStr = chunk.map(() => '35').join(';'); // 35m GPS tolerance

      const url = `https://router.project-osrm.org/match/v1/driving/${coordStr}` +
        `?overview=full&geometries=geojson&radiuses=${radiusStr}&tidy=true`;

      try {
        const data = await fetchJSON(url);
        if(data.code !== 'Ok' || !data.matchings?.length) {
          // OSRM couldn't snap this chunk — keep original points
          chunk.forEach(c => snapped.push(c));
          continue;
        }
        // Extract snapped coordinates from all matchings
        for(const matching of data.matchings) {
          const pts = matching.geometry.coordinates; // [lng, lat] pairs
          pts.forEach((pt, idx) => {
            snapped.push({
              lat: pt[1],
              lng: pt[0],
              recorded_at: chunk[Math.min(idx, chunk.length-1)].recorded_at
            });
          });
        }
      } catch(e) {
        // OSRM failed for this chunk — keep originals
        console.log('OSRM chunk failed:', e.message);
        chunk.forEach(co => snapped.push(co));
      }
    }

    // Save snapped coords back to DB
    db.replaceSessionCoords(session.id, snapped);
    res.json({ snapped: snapped.length, original: coords.length });

  } catch(e) {
    console.error('Snap error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`CanvassTrack running on http://localhost:${PORT}`);
  // Pre-warm storm cache so first user tap is instant
  setTimeout(async () => {
    try {
      console.log('Pre-warming storm cache...');
      const ets = new Date();
      const sts = new Date(Date.now() - 365 * 86400000);
      const toISOSimple = d => d.toISOString().split('.')[0] + 'Z';
      const url = 'https://mesonet.agron.iastate.edu/geojson/lsr.geojson' +
        '?sts=' + toISOSimple(sts) + '&ets=' + toISOSimple(ets) +
        '&type=H&type=T&type=D&type=G&type=W';
      const geojson = await fetchJSON(url);
      const features = geojson.features || [];
      const all = parseIEMFeatures(features);
      stormCache = { data: all, fetchedAt: Date.now() };
      console.log(`Storm cache ready: ${all.length} events`);
    } catch(e) {
      console.log('Storm pre-warm failed (will retry on first request):', e.message);
    }
  }, 5000); // wait 5s after startup
});
