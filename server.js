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

// Get single pin with full data
app.get('/api/pins/:id', requireAuth, (req, res) => {
  try {
    const pins = db.getUserPins(req.userId);
    const pin = pins.find(p => p.id === req.params.id);
    if(!pin) return res.status(404).json({ error: 'Pin not found' });
    res.json(pin);
  } catch(e) { res.status(500).json({ error: e.message }); }
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


// ── Storm Data (NOAA SPC — MD/VA/PA focused, 3-year history) ─────
// Source: https://www.spc.noaa.gov/wcm/data/{year}_{type}.csv
// Hail, wind, tornado for MD, VA, PA, DE, WV — 13x more data than IEM for this region
const https = require('https');
const TARGET_STATES = new Set(['MD', 'VA', 'PA', 'DE', 'WV', 'DC']);
let stormCache = { data: null, fetchedAt: 0 };
const STORM_TTL = 24 * 60 * 60 * 1000; // 24hr — historical data doesn't change

// Generic fetch helper
function fetchJSON(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? require('https') : require('http');
    const req = lib.get(url, { headers: { 'User-Agent': 'CanvassTrack/1.0' } }, res => {
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        res.resume();
        return fetchJSON(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
      }
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(new Error('JSON parse error: ' + raw.slice(0, 100))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// Fetch plain text (for CSV)
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : require('http');
    const req = lib.get(url, { headers: { 'User-Agent': 'CanvassTrack/1.0' } }, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => resolve(raw));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchSPCcsv(year, type) {
  const url = `https://www.spc.noaa.gov/wcm/data/${year}_${type}.csv`;
  try {
    const text = await fetchText(url);
    const lines = text.trim().split('\n');
    const hdr   = lines[0].split(',');
    const stIdx   = hdr.indexOf('st');
    const slatIdx = hdr.indexOf('slat');
    const slonIdx = hdr.indexOf('slon');
    const magIdx  = hdr.indexOf('mag');
    const dateIdx = hdr.indexOf('date');

    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const p = lines[i].split(',');
      const state = (p[stIdx] || '').trim();
      if (!TARGET_STATES.has(state)) continue;

      const lat = parseFloat(p[slatIdx]);
      const lng = parseFloat(p[slonIdx]);
      const mag = parseFloat(p[magIdx]) || 0;
      const date = (p[dateIdx] || '').split(' ')[0];
      if (!lat || !lng || !date || isNaN(lat) || isNaN(lng)) continue;

      // Magnitude thresholds — err on lower side to catch more events
      if (type === 'hail' && mag < 0.75) continue;
      if (type === 'wind' && mag < 40)   continue;

      results.push({
        type: type === 'torn' ? 'tornado' : type,
        mag: Math.round(mag * 100) / 100,
        lat, lng, date, state,
        location: '',
        county: '',
      });
    }
    console.log(`SPC ${year} ${type}: ${results.length} events in target states`);
    return results;
  } catch(e) {
    console.warn(`SPC fetch failed ${year}/${type}:`, e.message);
    return [];
  }
}

async function loadSPCData() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];
  const types = ['hail', 'wind', 'torn'];
  const allResults = [];
  for (const year of years) {
    for (const type of types) {
      const events = await fetchSPCcsv(year, type);
      allResults.push(...events);
    }
  }
  // Deduplicate
  const seen = new Set();
  const deduped = allResults.filter(e => {
    const key = `${e.type}|${e.lat.toFixed(2)}|${e.lng.toFixed(2)}|${e.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`SPC total: ${deduped.length} unique events in MD/VA/PA/DE/WV`);
  return deduped;
}

app.get('/api/storm/events', requireAuth, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365); // 1 year max — claim filing limit
    if (!stormCache.data || (Date.now() - stormCache.fetchedAt) > STORM_TTL) {
      console.log('Loading SPC storm data...');
      stormCache.data = await loadSPCData();
      stormCache.fetchedAt = Date.now();
    }
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    res.json(stormCache.data.filter(e => e.date >= cutoff));
  } catch(e) {
    console.error('Storm events error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Debug endpoint
app.get('/api/storm/debug', requireAuth, async (req, res) => {
  res.json({
    cached: !!stormCache.data,
    cachedAt: stormCache.fetchedAt ? new Date(stormCache.fetchedAt).toISOString() : null,
    totalEvents: stormCache.data?.length || 0,
    targetStates: [...TARGET_STATES],
  });
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
    const allPins  = db.getUserPins(userId);
    // Strip photos to prevent 15MB stats query timeout
    const pins = allPins.map(p => ({...p, photo: null}));
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

    // ── Daily breakdown — 90 days ──
    const ninetyAgo = new Date(now - 90 * 86400000).toISOString().split('T')[0];
    const dailyMap = {};
    for (let d = 89; d >= 0; d--) {
      const dt = new Date(now - d * 86400000).toISOString().split('T')[0];
      dailyMap[dt] = { date: dt, pins: 0, interested: 0, appointments: 0, spoke: 0, dropped: 0, routes: 0 };
    }
    pins.filter(p => toDate(p.created_at) >= ninetyAgo).forEach(p => {
      const d = toDate(p.created_at);
      if (dailyMap[d]) {
        dailyMap[d].pins++;
        if (p.status === 'Interested')    dailyMap[d].interested++;
        if (p.status === 'Appointment')   dailyMap[d].appointments++;
        if (p.status === 'Spoke to Owner') dailyMap[d].spoke++;
        if (p.status === 'Dropped Lit')   dailyMap[d].dropped++;
      }
    });
    sessions.filter(s => toDate(s.started_at) >= ninetyAgo).forEach(s => {
      const d = toDate(s.started_at);
      if (dailyMap[d]) dailyMap[d].routes++;
    });
    const daily = Object.values(dailyMap);

    // ── Weekly breakdown — last 12 weeks ──
    const weeklyMap = {};
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(now - (w * 7 + now.getDay()) * 86400000);
      const wk = weekStart.toISOString().split('T')[0];
      weeklyMap[wk] = { week: wk, pins: 0, interested: 0, appointments: 0, routes: 0 };
    }
    const getWeekStart = d => {
      const dt = new Date(d);
      dt.setDate(dt.getDate() - dt.getDay());
      return dt.toISOString().split('T')[0];
    };
    pins.forEach(p => {
      const wk = getWeekStart(p.created_at);
      if (weeklyMap[wk]) {
        weeklyMap[wk].pins++;
        if (p.status === 'Interested')  weeklyMap[wk].interested++;
        if (p.status === 'Appointment') weeklyMap[wk].appointments++;
      }
    });
    sessions.forEach(s => {
      const wk = getWeekStart(s.started_at);
      if (weeklyMap[wk]) weeklyMap[wk].routes++;
    });
    const weekly = Object.values(weeklyMap);

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
      daily,   // 90-day daily breakdown
      weekly,  // 12-week breakdown
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


// ── Pin Photos ────────────────────────────────────────────────────

// Get photos for a pin
app.get('/api/pins/:id/photos', requireAuth, (req, res) => {
  try {
    res.json(db.getPinPhotos(req.params.id));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Add a damage photo to a pin
app.post('/api/pins/:id/photos', requireAuth, (req, res) => {
  try {
    const { photo, caption } = req.body;
    if(!photo) return res.status(400).json({ error: 'photo required' });
    const id = Date.now() + Math.random().toString(36).slice(2);
    db.addPinPhoto(id, req.params.id, req.userId, photo, caption);
    res.json({ id, pin_id: req.params.id, photo, caption, created_at: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Delete a damage photo
app.delete('/api/pins/:pinId/photos/:photoId', requireAuth, (req, res) => {
  try {
    db.deletePinPhoto(req.params.photoId, req.userId);
    res.json({ deleted: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
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
      // SPC pre-warm handled by loadSPCData
      stormCache.data = await loadSPCData();
      stormCache.fetchedAt = Date.now();
      console.log(`Storm cache ready: ${all.length} events`);
    } catch(e) {
      console.log('Storm pre-warm failed (will retry on first request):', e.message);
    }
  }, 5000); // wait 5s after startup
});
