# CanvassTrack

Roofing canvass route tracker — Express + SQLite backend, mobile-first frontend.

## Local dev

```bash
npm install
npm run dev     # runs on http://localhost:3000
```

## Deploy to Railway (free, HTTPS, 5 min setup)

1. Push this folder to a GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub
3. Select your repo — Railway auto-detects Node.js
4. Click Deploy
5. Go to Settings → Networking → Generate Domain
6. Your app is live at https://your-app.railway.app

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/sessions | All sessions with coords + pin counts |
| POST | /api/sessions | Create session `{id, color}` |
| POST | /api/sessions/:id/coords | Add GPS coords `{coords: [{lat,lng,ts}]}` |
| PATCH | /api/sessions/:id/end | End session |
| GET | /api/pins | All pins |
| POST | /api/pins | Create pin |
| DELETE | /api/pins/:id | Delete pin |
