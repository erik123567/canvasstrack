<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>CanvassTrack</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
html, body { height: 100%; background: #000; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #fff; }
#map { position: fixed; top: 0; left: 0; right: 0; bottom: 88px; z-index: 1; }

#toppill {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
  z-index: 100; background: rgba(0,0,0,.82); backdrop-filter: blur(12px);
  border-radius: 30px; padding: 10px 18px;
  display: flex; align-items: center; gap: 10px;
  border: 1px solid rgba(255,255,255,.13); white-space: nowrap; pointer-events: none;
}
.logo { font-size: 14px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #f5a623; }
.logo span { color: #fff; }
#dot { width: 8px; height: 8px; border-radius: 50%; background: #3a3a3a; transition: all .3s; }
#dot.on { background: #f5a623; box-shadow: 0 0 7px #f5a623; animation: blink 1.3s infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }
@keyframes spin { to { transform: rotate(360deg); } }
#timer { font-size: 13px; font-weight: 700; color: #f5a623; visibility: hidden; min-width: 36px; }
#timer.show { visibility: visible; }

#toast {
  position: fixed; bottom: 160px; left: 50%; transform: translateX(-50%);
  z-index: 200; background: rgba(20,20,20,.92); color: #fff;
  border-radius: 22px; padding: 10px 20px; font-size: 14px; font-weight: 600;
  max-width: 88vw; text-align: center; white-space: normal;
  opacity: 0; pointer-events: none; transition: opacity .25s;
  border: 1px solid rgba(255,255,255,.1);
}
#toast.show { opacity: 1; }

#bottom {
  position: fixed; bottom: 0; left: 0; right: 0; height: 88px; z-index: 300;
  background: #0a0a0a; border-top: 1px solid #1c1c1c;
  display: flex; align-items: center; gap: 10px; padding: 0 16px 8px;
}
#trackBtn {
  flex: 1; height: 56px; border: none; border-radius: 14px; cursor: pointer;
  font-size: 16px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;
  background: #f5a623; color: #000; transition: transform .1s, background .2s;
}
#trackBtn:active { transform: scale(.97); }
#trackBtn.stop { background: #e03b3b; color: #fff; }
#trackBtn:disabled { opacity: .6; transform: none !important; cursor: default; }
.icon-btn {
  width: 60px; height: 56px; border: none; border-radius: 14px; cursor: pointer;
  font-size: 22px; background: #1c1c1c; border: 1.5px solid #2c2c2c;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: transform .1s;
}
.icon-btn:active { transform: scale(.95); }
#pinBtn { display: none; }
#pinBtn.show { display: flex; }

/* ── History Panel ── */
#hist-panel {
  position: fixed; inset: 0; z-index: 400;
  background: #0d0d0d; display: none; flex-direction: column;
}
#hist-panel.open { display: flex; }
#hist-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 56px 20px 16px; border-bottom: 1px solid #1c1c1c; flex-shrink: 0;
}
.hist-title { font-size: 22px; font-weight: 900; }
#hist-close {
  width: 36px; height: 36px; border-radius: 50%; background: #1c1c1c;
  border: none; color: #888; font-size: 18px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
#hist-tabs { display: flex; border-bottom: 1px solid #1c1c1c; flex-shrink: 0; }
.htab {
  flex: 1; padding: 14px 8px; text-align: center;
  font-size: 13px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase;
  color: #444; cursor: pointer; border-bottom: 2px solid transparent; transition: all .2s;
}
.htab.active { color: #f5a623; border-bottom-color: #f5a623; }
#hist-body { flex: 1; overflow-y: auto; padding: 16px; }

.route-card {
  background: #161616; border: 1px solid #222; border-radius: 14px;
  padding: 14px 16px; margin-bottom: 10px; cursor: pointer;
  display: flex; align-items: center; gap: 14px; transition: border-color .15s;
}
.route-card:active { border-color: #f5a623; }
.route-swatch { width: 10px; height: 44px; border-radius: 5px; flex-shrink: 0; }
.route-info { flex: 1; }
.route-date { font-size: 14px; font-weight: 700; }
.route-meta { font-size: 12px; color: #444; margin-top: 3px; }

.pin-card {
  background: #161616; border: 1px solid #222; border-radius: 14px;
  padding: 13px 15px; margin-bottom: 10px;
}
.pin-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
.pin-addr { font-size: 14px; font-weight: 700; flex: 1; }
.pin-badge {
  font-size: 11px; font-weight: 800; padding: 4px 10px;
  border-radius: 12px; flex-shrink: 0; text-transform: uppercase; letter-spacing: .5px;
}
.pin-edit-btn {
  width: 32px; height: 32px; border-radius: 8px; background: #222; border: 1px solid #2a2a2a;
  color: #666; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all .15s;
}
.pin-edit-btn:active { background: #2a2a2a; color: #f5a623; }
.pin-notes { font-size: 13px; color: #555; margin-bottom: 8px; }
.pin-thumb { width: 72px; height: 72px; object-fit: cover; border-radius: 10px; flex-shrink: 0; }
.pin-time { font-size: 11px; color: #333; }

#coverage-wrap { display: none; }
#coverage-wrap.active { display: block; position: relative; }
#coverage-map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
#coverage-hint-text { position:absolute; bottom:16px; left:50%; transform:translateX(-50%); z-index:1000; background:rgba(0,0,0,.8); color:#fff; padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid rgba(255,255,255,.1); pointer-events:none; white-space:nowrap; }


.empty-state { text-align: center; padding: 60px 20px; color: #333; }
.empty-icon { font-size: 40px; margin-bottom: 12px; }
.empty-text { font-size: 15px; line-height: 1.6; }

/* ── Pin Sheet (new + edit) ── */
#sheet-bg {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,.55); backdrop-filter: blur(5px);
  display: none; align-items: flex-end;
}
#sheet-bg.open { display: flex; }
#sheet {
  width: 100%; background: #161616; border-radius: 22px 22px 0 0;
  border-top: 1px solid rgba(255,255,255,.08);
  padding: 10px 18px 48px; animation: slideup .22s ease;
  max-height: 92vh; overflow-y: auto;
}
@keyframes slideup { from{transform:translateY(28px);opacity:0} to{transform:none;opacity:1} }
.handle { width: 36px; height: 4px; background: #2a2a2a; border-radius: 2px; margin: 0 auto 16px; }

.sheet-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
.stitle { font-size: 17px; font-weight: 800; }
#delete-pin-btn {
  padding: 6px 12px; background: transparent; border: 1px solid #3a1a1a;
  color: #e03b3b; border-radius: 8px; font-size: 13px; font-weight: 700;
  cursor: pointer; display: none;
}
#delete-pin-btn.show { display: block; }
#delete-pin-btn:active { background: #1a0a0a; }

.saddr-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
#saddr-input {
  flex: 1; background: #0d0d0d; border: 1px solid #252525; border-radius: 11px;
  color: #fff; font-family: inherit; font-size: 14px; padding: 10px 13px; outline: none;
}
#saddr-input:focus { border-color: #f5a623; }

.field-label { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #444; margin-bottom: 8px; }
.stags { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
.tag { padding: 8px 13px; border-radius: 20px; font-size: 13px; font-weight: 700; border: 1.5px solid #252525; cursor: pointer; transition: all .15s; }
.tag[data-s="Dropped Lit"]    { color: #f5a623; }
.tag[data-s="No Answer"]      { color: #555; }
.tag[data-s="Spoke to Owner"] { color: #4a9eff; }
.tag[data-s="Interested"]     { color: #00c9a7; }
.tag[data-s="Appointment"]    { color: #a855f7; }
.tag.sel { background: rgba(255,255,255,.06); border-color: currentColor; }
#notes {
  width: 100%; background: #0d0d0d; border: 1px solid #252525; border-radius: 11px;
  color: #fff; font-family: inherit; font-size: 15px; padding: 11px 13px;
  resize: none; height: 76px; outline: none; margin-bottom: 13px;
}
#notes::placeholder { color: #333; }
#notes:focus { border-color: #f5a623; }

.photo-section { margin-bottom: 14px; }
#photo-input { display: none; }
#photo-preview-wrap { display: none; position: relative; margin-bottom: 8px; }
#photo-preview { width: 100%; max-height: 200px; object-fit: cover; border-radius: 12px; display: block; }
#photo-remove {
  position: absolute; top: 8px; right: 8px; width: 28px; height: 28px;
  border-radius: 50%; background: rgba(0,0,0,.7); border: none; color: #fff;
  font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
#photo-btn {
  width: 100%; padding: 13px; background: #1a1a1a; border: 1.5px dashed #2a2a2a;
  border-radius: 12px; color: #555; font-size: 14px; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
}
#photo-btn:active { background: #222; }

.sbtns { display: flex; gap: 10px; }
.bsave { flex:1; padding:15px; background:#f5a623; color:#000; border:none; border-radius:12px; font-size:16px; font-weight:800; cursor:pointer; }
.bcancel { padding:15px 18px; background:#1c1c1c; color:#555; border:none; border-radius:12px; font-size:15px; cursor:pointer; }

/* Follow button */
#follow-btn {
  position: fixed; bottom: 160px; right: 16px; z-index: 300;
  width: 48px; height: 48px; border-radius: 50%;
  background: #0a0a0a; border: 2px solid #f5a623;
  color: #f5a623; font-size: 20px; cursor: pointer;
  display: none; align-items: center; justify-content: center;
  box-shadow: 0 2px 12px rgba(0,0,0,.6);
  transition: transform .1s;
}
#follow-btn.show { display: flex; }
#follow-btn:active { transform: scale(.93); }


/* ── Pin Detail Sheet ── */
#detail-bg {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,.55); backdrop-filter: blur(5px);
  display: none; align-items: flex-end;
}
#detail-bg.open { display: flex; }
#detail-sheet {
  width: 100%; background: #161616; border-radius: 22px 22px 0 0;
  border-top: 1px solid rgba(255,255,255,.08);
  max-height: 88vh; overflow-y: auto;
  animation: slideup .22s ease;
}
#detail-photo {
  width: 100%; max-height: 240px; object-fit: cover;
  border-radius: 22px 22px 0 0; display: none;
}
#detail-photo.show { display: block; }
.detail-body { padding: 18px 18px 48px; }
.detail-handle { width: 36px; height: 4px; background: #2a2a2a; border-radius: 2px; margin: 0 auto 16px; }
.detail-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.detail-addr { font-size: 19px; font-weight: 800; flex: 1; line-height: 1.25; }
.detail-badge {
  font-size: 11px; font-weight: 800; padding: 5px 11px;
  border-radius: 12px; flex-shrink: 0; text-transform: uppercase; letter-spacing: .5px;
  margin-top: 2px;
}
.detail-notes { font-size: 15px; color: #888; margin: 12px 0 16px; line-height: 1.5; }
.detail-meta { font-size: 12px; color: #3a3a3a; margin-bottom: 24px; }
.detail-btns { display: flex; gap: 10px; }
.detail-edit { flex: 1; padding: 15px; background: #f5a623; color: #000; border: none; border-radius: 12px; font-size: 16px; font-weight: 800; cursor: pointer; }
.detail-delete { padding: 15px 18px; background: transparent; border: 1px solid #3a1a1a; color: #e03b3b; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; }





/* ── Shared Route Code Display ── */
.share-code-display {
  background: #0d0d0d; border: 1.5px solid #252525; border-radius: 12px;
  padding: 16px; text-align: center; margin: 12px 0 8px;
}
.share-code-text {
  font-size: 30px; font-weight: 900; letter-spacing: 6px; color: #f5a623;
  font-family: 'SF Mono', 'Courier New', monospace;
}
.share-code-hint { font-size: 11px; color: #444; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }

/* Coverage add button */
#coverage-add-btn {
  position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); z-index: 9999;
  padding: 10px 22px; background: rgba(0,0,0,.88); border-radius: 24px;
  border: 1px solid #f5a623; color: #f5a623;
  font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap;
  display: none;
}
#coverage-add-btn.show { display: block; }
#coverage-add-btn:active { background: rgba(20,20,20,.95); }

/* Imported routes list */
.imported-card {
  background: #161616; border: 1px solid #222; border-radius: 12px;
  padding: 13px 15px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;
}
.imported-swatch { width: 8px; height: 36px; border-radius: 4px; flex-shrink: 0; }
.imported-info { flex: 1; }
.imported-owner { font-size: 13px; font-weight: 700; color: #fff; }
.imported-meta { font-size: 11px; color: #444; margin-top: 2px; }
.imported-remove { background: none; border: none; color: #333; font-size: 18px; cursor: pointer; padding: 4px; }
.imported-remove:active { color: #e03b3b; }

/* ── Settings Panel ── */
#settings-panel {
  position: fixed; inset: 0; z-index: 400;
  background: #0d0d0d; display: none; flex-direction: column;
  overflow-y: auto;
}
#settings-panel.open { display: flex; }

#settings-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 56px 20px 20px; flex-shrink: 0;
}
.settings-title { font-size: 22px; font-weight: 900; }
#settings-close {
  width: 36px; height: 36px; border-radius: 50%; background: #1c1c1c;
  border: none; color: #888; font-size: 18px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.settings-body { padding: 0 16px 48px; flex: 1; }

.settings-section {
  margin-bottom: 28px;
}
.settings-section-label {
  font-size: 11px; font-weight: 700; letter-spacing: 1.2px;
  text-transform: uppercase; color: #444; margin-bottom: 10px; padding-left: 4px;
}
.settings-card {
  background: #161616; border: 1px solid #222; border-radius: 16px;
  overflow: hidden;
}
.settings-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid #1c1c1c;
  gap: 12px;
}
.settings-row:last-child { border-bottom: none; }
.settings-row-label { font-size: 14px; font-weight: 600; color: #fff; }
.settings-row-value { font-size: 14px; color: #555; text-align: right; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.settings-row-action {
  font-size: 14px; font-weight: 700; color: #f5a623; cursor: pointer;
  background: none; border: none; padding: 0; flex-shrink: 0;
}
.settings-row-action:active { opacity: .7; }

/* Change password form — hidden by default */
#pw-form {
  padding: 0 18px 18px; display: none; flex-direction: column; gap: 10px;
  border-top: 1px solid #1c1c1c;
}
#pw-form.open { display: flex; }
.pw-input {
  width: 100%; background: #0d0d0d; border: 1px solid #252525; border-radius: 10px;
  color: #fff; font-family: inherit; font-size: 15px; padding: 12px 14px; outline: none;
}
.pw-input:focus { border-color: #f5a623; }
.pw-error { font-size: 12px; color: #e03b3b; display: none; }
.pw-error.show { display: block; }
.pw-success { font-size: 12px; color: #00c9a7; display: none; }
.pw-success.show { display: block; }
.pw-save-btn {
  padding: 13px; background: #f5a623; color: #000; border: none;
  border-radius: 10px; font-size: 15px; font-weight: 800; cursor: pointer;
}
.pw-save-btn:active { transform: scale(.98); }

/* Logout button */
.logout-btn {
  width: 100%; padding: 18px; background: transparent;
  border: 1.5px solid #3a1a1a; border-radius: 14px;
  color: #e03b3b; font-size: 16px; font-weight: 800;
  cursor: pointer; transition: background .15s; margin-top: 8px;
}
.logout-btn:active { background: rgba(224,59,59,.1); }

.settings-version {
  text-align: center; font-size: 12px; color: #2a2a2a;
  padding: 24px 0 8px;
}


/* ── Custom Confirm Sheet ── */
#confirm-bg {
  position: fixed; inset: 0; z-index: 3000;
  background: rgba(0,0,0,.6); backdrop-filter: blur(4px);
  display: none; align-items: flex-end;
}
#confirm-bg.open { display: flex; }
#confirm-sheet {
  width: 100%; background: #161616; border-radius: 22px 22px 0 0;
  border-top: 1px solid rgba(255,255,255,.08);
  padding: 20px 20px 48px; animation: slideup .2s ease;
}
#confirm-msg { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 20px; text-align: center; line-height: 1.4; }
#confirm-ok  { width:100%; padding:16px; background:#e03b3b; color:#fff; border:none; border-radius:13px; font-size:16px; font-weight:800; cursor:pointer; margin-bottom:10px; }
#confirm-cancel { width:100%; padding:15px; background:#1c1c1c; color:#666; border:none; border-radius:13px; font-size:15px; cursor:pointer; }



/* ── Storm overlay ── */
#storm-bar {
  position: fixed; bottom: 160px; left: 50%; transform: translateX(-50%);
  z-index: 201; display: none; align-items: center; gap: 8px;
  background: rgba(0,0,0,.88); backdrop-filter: blur(10px);
  padding: 9px 14px; border-radius: 30px;
  border: 1px solid rgba(255,255,255,.12);
  white-space: nowrap;
}
#storm-bar.show { display: flex; }
.storm-type-btn {
  padding: 4px 9px; border-radius: 14px; font-size: 14px;
  border: 1.5px solid transparent; cursor: pointer; background: transparent;
  transition: all .15s; opacity: .35;
}
.storm-type-btn.active { opacity: 1; background: rgba(255,255,255,.06); }
.storm-days-btn {
  padding: 5px 11px; border-radius: 16px; font-size: 12px; font-weight: 800;
  border: 1.5px solid transparent; cursor: pointer; background: transparent;
  color: #555; transition: all .15s;
}
.storm-days-btn.active { border-color: #e03b3b; color: #e03b3b; background: rgba(224,59,59,.1); }
#storm-loading { font-size: 12px; color: #f5a623; display: none; }

/* ── Coverage date filter ── */
#cov-filter {
  position: absolute; top: 12px; left: 12px; z-index: 1000;
  display: flex; gap: 5px; flex-wrap: wrap;
}
.cov-day-btn {
  padding: 5px 10px; border-radius: 14px; font-size: 11px; font-weight: 800;
  border: 1.5px solid rgba(255,255,255,.2); cursor: pointer;
  background: rgba(0,0,0,.8); color: #555; transition: all .15s;
  backdrop-filter: blur(8px);
}
.cov-day-btn.active { border-color: #f5a623; color: #f5a623; background: rgba(0,0,0,.9); }

/* Storm legend */
#storm-legend {
  position: absolute; bottom: 12px; left: 12px; z-index: 1000;
  background: rgba(0,0,0,.82); border-radius: 10px; padding: 8px 12px;
  font-size: 11px; display: none; flex-direction: column; gap: 4px;
  border: 1px solid rgba(255,255,255,.1);
}
#storm-legend.show { display: flex; }
.legend-row { display: flex; align-items: center; gap: 7px; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }


/* ── Storms tab ── */
.storm-tab-days {
  padding: 4px 9px; border-radius: 12px; font-size: 11px; font-weight: 800;
  border: 1px solid #2a2a2a; color: #444; background: transparent; cursor: pointer;
}
.storm-tab-days.active { border-color: #e03b3b; color: #e03b3b; background: rgba(224,59,59,.1); }
.storm-tab-type { transition: opacity .15s; }
.storm-tab-type:not(.active) { opacity: .35; }

.storm-event-card {
  background: #161616; border: 1px solid #222; border-radius: 12px;
  padding: 11px 13px; margin-bottom: 8px; cursor: pointer;
  display: flex; align-items: flex-start; gap: 10px;
}
.storm-event-card:active { border-color: rgba(255,255,255,.2); }
.storm-event-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
.storm-event-info { flex: 1; min-width: 0; }
.storm-event-size { font-size: 14px; font-weight: 800; }
.storm-event-loc { font-size: 12px; color: #555; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.storm-event-date { font-size: 11px; color: #333; margin-top: 3px; }
.storm-event-dist { font-size: 11px; font-weight: 700; flex-shrink: 0; }

/* ── Map status filter ── */
#map-filter {
  position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
  z-index: 200; display: none; gap: 6px; flex-wrap: nowrap;
  background: rgba(0,0,0,.82); backdrop-filter: blur(10px);
  padding: 8px 10px; border-radius: 30px;
  border: 1px solid rgba(255,255,255,.1);
}
#map-filter.show { display: flex; }
.filt-btn {
  padding: 6px 12px; border-radius: 20px; border: 1.5px solid transparent;
  font-size: 11px; font-weight: 800; cursor: pointer;
  background: transparent; letter-spacing: .5px; text-transform: uppercase;
  transition: all .15s; white-space: nowrap;
}
.filt-btn.active { opacity: 1; }
.filt-btn:not(.active) { opacity: .4; }

/* ── Follow-up badge ── */
.followup-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 700; padding: 3px 8px;
  border-radius: 10px; margin-top: 4px;
}
.followup-badge.due { background: rgba(224,59,59,.15); color: #e03b3b; border: 1px solid rgba(224,59,59,.3); }
.followup-badge.upcoming { background: rgba(245,166,35,.1); color: #f5a623; border: 1px solid rgba(245,166,35,.2); }
.followup-badge.done { background: rgba(85,96,111,.1); color: #55606f; border: 1px solid rgba(85,96,111,.2); }

/* ── Call button in detail ── */
.call-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; background: rgba(0,201,167,.1);
  border: 1px solid rgba(0,201,167,.3); border-radius: 12px;
  color: #00c9a7; font-size: 15px; font-weight: 700;
  cursor: pointer; margin-bottom: 12px; text-decoration: none;
}
.call-btn:active { background: rgba(0,201,167,.2); }

/* ── Due today section in history ── */
.due-today-header {
  font-size: 12px; font-weight: 800; letter-spacing: 1px;
  text-transform: uppercase; color: #e03b3b; margin: 0 0 10px;
  display: flex; align-items: center; gap: 6px;
}

/* ── Auth Screen ── */
#auth-screen {
  position: fixed; inset: 0; z-index: 1000;
  background: #0a0a0a;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 32px 24px;
}
#auth-screen.hidden { display: none; }

.auth-logo { font-size: 26px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #f5a623; margin-bottom: 4px; }
.auth-logo span { color: #fff; }
.auth-sub { font-size: 13px; color: #444; margin-bottom: 40px; letter-spacing: .5px; }

.auth-card {
  width: 100%; max-width: 360px;
  background: #161616; border-radius: 20px;
  border: 1px solid #222; padding: 24px;
}
.auth-tabs { display: flex; margin-bottom: 24px; background: #0d0d0d; border-radius: 10px; padding: 3px; }
.auth-tab {
  flex: 1; padding: 10px; text-align: center; font-size: 14px; font-weight: 700;
  color: #444; cursor: pointer; border-radius: 8px; transition: all .2s;
}
.auth-tab.active { background: #f5a623; color: #000; }

.auth-field { margin-bottom: 14px; }
.auth-field label { display: block; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #444; margin-bottom: 6px; }
.auth-field input {
  width: 100%; background: #0d0d0d; border: 1px solid #252525; border-radius: 10px;
  color: #fff; font-family: inherit; font-size: 16px; padding: 13px 14px; outline: none;
  transition: border-color .2s; -webkit-appearance: none;
}
.auth-field input:focus { border-color: #f5a623; }

.auth-btn {
  width: 100%; padding: 15px; background: #f5a623; color: #000;
  border: none; border-radius: 12px; font-size: 16px; font-weight: 900;
  letter-spacing: .5px; cursor: pointer; margin-top: 6px;
  transition: transform .1s;
}
.auth-btn:active { transform: scale(.98); }
.auth-error { font-size: 13px; color: #e03b3b; text-align: center; margin-top: 12px; min-height: 18px; }

/* User badge in top pill */
#user-name-badge {
  font-size: 11px; color: #888; cursor: pointer; padding: 2px 0;
  pointer-events: all;
}
#user-name-badge:hover { color: #f5a623; }

/* ── Pin Drop Mode ── */
#pin-crosshair {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) translateY(-20px);
  z-index: 250;
  pointer-events: none;
  display: none;
  flex-direction: column;
  align-items: center;
}
#pin-crosshair.active { display: flex; }
#pin-crosshair svg {
  width: 52px; height: 52px;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,.8));
}
#pin-crosshair-stem {
  width: 3px; height: 16px;
  background: linear-gradient(#f5a623, transparent);
  border-radius: 2px;
}

#pin-confirm-bar {
  position: fixed;
  bottom: 100px; left: 16px; right: 16px;
  z-index: 350;
  display: none;
  gap: 10px;
}
#pin-confirm-bar.active { display: flex; }
#pin-confirm-btn {
  flex: 1; padding: 16px; border: none; border-radius: 14px;
  background: #f5a623; color: #000;
  font-size: 16px; font-weight: 900; letter-spacing: .5px;
  cursor: pointer; transition: transform .1s;
}
#pin-confirm-btn:active { transform: scale(.97); }
#pin-cancel-btn {
  width: 56px; padding: 16px; border: none; border-radius: 14px;
  background: #1c1c1c; border: 1.5px solid #2c2c2c;
  color: #888; font-size: 20px; cursor: pointer;
}
#pin-cancel-btn:active { transform: scale(.97); }

.you-ring { width:16px; height:16px; border-radius:50%; background:#0066ff; border:3px solid #fff; box-shadow:0 0 0 5px rgba(0,102,255,.3),0 2px 8px rgba(0,0,0,.5); }
.pin-drop { width:14px; height:14px; border-radius:50% 50% 50% 0; border:2.5px solid #fff; transform:rotate(-45deg); box-shadow:0 3px 10px rgba(0,0,0,.7); }
.leaflet-popup-content-wrapper { background:#161616; color:#fff; border-radius:12px; border:1px solid #252525; box-shadow:0 6px 24px rgba(0,0,0,.7); }
.leaflet-popup-tip { background:#161616; }
.leaflet-popup-content { margin:12px 14px; font-family:-apple-system,sans-serif; }
</style>
</head>
<body>


<!-- Auth Screen -->
<div id="auth-screen">
  <div class="auth-logo">Canvass<span>Track</span></div>
  <div class="auth-sub">Roofing Sales Canvassing</div>
  <div class="auth-card">
    <div class="auth-tabs">
      <div class="auth-tab active" data-auth="login">Log In</div>
      <div class="auth-tab" data-auth="register">Sign Up</div>
    </div>

    <!-- Login form -->
    <div id="login-form">
      <div class="auth-field"><label>Email</label><input type="email" id="login-email" placeholder="you@email.com" autocomplete="email"/></div>
      <div class="auth-field"><label>Password</label><input type="password" id="login-password" placeholder="Password" autocomplete="current-password"/></div>
      <button class="auth-btn" id="login-btn">Log In</button>
    </div>

    <!-- Register form -->
    <div id="register-form" style="display:none">
      <div class="auth-field"><label>Name</label><input type="text" id="reg-name" placeholder="Your name" autocomplete="name"/></div>
      <div class="auth-field"><label>Email</label><input type="email" id="reg-email" placeholder="you@email.com" autocomplete="email"/></div>
      <div class="auth-field"><label>Password</label><input type="password" id="reg-password" placeholder="Min. 6 characters" autocomplete="new-password"/></div>
      <button class="auth-btn" id="register-btn">Create Account</button>
    </div>

    <div class="auth-error" id="auth-error"></div>
    <div id="forgot-link" style="text-align:center;margin-top:12px;font-size:13px;color:#444;cursor:pointer">Forgot password?</div>
  </div>
</div>

<!-- Forgot password sheet -->
<div id="forgot-bg" style="position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,.7);backdrop-filter:blur(5px);display:none;align-items:flex-end">
  <div style="width:100%;background:#161616;border-radius:22px 22px 0 0;border-top:1px solid rgba(255,255,255,.08);padding:20px 20px 48px">
    <div style="width:36px;height:4px;background:#2a2a2a;border-radius:2px;margin:0 auto 18px"></div>
    <div style="font-size:17px;font-weight:800;margin-bottom:8px">Reset Password</div>
    <div style="font-size:13px;color:#555;margin-bottom:16px">Enter your email and we'll send a reset code</div>
    <input type="email" id="forgot-email" style="width:100%;background:#0d0d0d;border:1px solid #252525;border-radius:10px;color:#fff;font-family:inherit;font-size:15px;padding:12px 14px;outline:none;margin-bottom:10px" placeholder="your@email.com"/>
    <div id="forgot-error" style="font-size:12px;color:#e03b3b;margin-bottom:10px;display:none"></div>
    <div id="forgot-success" style="font-size:13px;color:#00c9a7;margin-bottom:10px;display:none;line-height:1.5"></div>
    <button id="forgot-submit" style="width:100%;padding:15px;background:#f5a623;color:#000;border:none;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;margin-bottom:10px">Send Reset Code</button>
    <button id="forgot-close" style="width:100%;padding:14px;background:transparent;border:1px solid #222;border-radius:12px;color:#555;font-size:15px;cursor:pointer">Cancel</button>
  </div>
</div>

<div id="map"></div>
<div id="loading-overlay" style="position:fixed;inset:0;z-index:999;background:#0a0a0a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
  <div class="auth-logo">Canvass<span>Track</span></div>
  <div style="width:32px;height:32px;border:3px solid #1c1c1c;border-top-color:#f5a623;border-radius:50%;animation:spin .8s linear infinite"></div>
</div>
<div id="toppill">
  <div class="logo">Canvass<span>Track</span></div>
  <div id="dot"></div>
  <div id="timer"></div>
</div>
<div id="toast"></div>

<button id="follow-btn" title="Re-center on my location">◎</button>

<!-- Storm controls -->
<div id="storm-bar">
  <button class="storm-type-btn active" data-stype="hail" style="color:#f5e623;border-color:#f5e62366">⛈️</button>
  <button class="storm-type-btn active" data-stype="wind" style="color:#4a9eff;border-color:#4a9eff66">💨</button>
  <button class="storm-type-btn active" data-stype="tornado" style="color:#a855f7;border-color:#a855f766">🌪️</button>
  <div style="width:1px;height:20px;background:#222;margin:0 2px"></div>
  <button class="storm-days-btn active" data-days="7">7d</button>
  <button class="storm-days-btn" data-days="14">14d</button>
  <button class="storm-days-btn" data-days="30">30d</button>
  <button class="storm-days-btn" data-days="90">90d</button>
  <span id="storm-loading" style="font-size:12px;color:#f5a623;display:none">⟳</span>
  <button id="storm-close-btn" style="background:none;border:none;color:#555;font-size:16px;cursor:pointer;padding:0 0 0 2px">✕</button>
</div>

<!-- Map filter bar -->
<div id="map-filter">
  <button class="filt-btn active" data-status="all" style="color:#fff;border-color:rgba(255,255,255,.3)">All</button>
  <button class="filt-btn active" data-status="Dropped Lit" style="color:#f5a623;border-color:#f5a623">Lit</button>
  <button class="filt-btn active" data-status="No Answer" style="color:#666;border-color:#666">No Ans</button>
  <button class="filt-btn active" data-status="Spoke to Owner" style="color:#4a9eff;border-color:#4a9eff">Spoke</button>
  <button class="filt-btn active" data-status="Interested" style="color:#00c9a7;border-color:#00c9a7">Interest</button>
  <button class="filt-btn active" data-status="Appointment" style="color:#a855f7;border-color:#a855f7">Appt</button>
</div>


<!-- Pin drop crosshair -->
<div id="pin-crosshair">
  <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="26" r="10" stroke="#f5a623" stroke-width="2.5"/>
    <line x1="26" y1="4"  x2="26" y2="14" stroke="#f5a623" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="26" y1="38" x2="26" y2="48" stroke="#f5a623" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="4"  y1="26" x2="14" y2="26" stroke="#f5a623" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="38" y1="26" x2="48" y2="26" stroke="#f5a623" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="26" cy="26" r="3" fill="#f5a623"/>
  </svg>
  <div id="pin-crosshair-stem"></div>
</div>

<!-- Pin drop confirm bar -->
<div id="pin-confirm-bar">
  <button id="pin-cancel-btn">✕</button>
  <button id="pin-confirm-btn">📍 Log this stop</button>
</div>

<div id="bottom">
  <button class="icon-btn" id="settingsBtn">⚙️</button>
  <button id="trackBtn">▶ Start Tracking</button>
  <button class="icon-btn" id="historyBtn">📋</button>
  <button class="icon-btn" id="stormBtn" title="Storm data">⛈️</button>
  <button class="icon-btn" id="filterBtn" title="Filter pins">🔍</button>
  <button class="icon-btn" id="pinBtn">📍</button>
</div>


<!-- Settings Panel -->
<div id="settings-panel">
  <div id="settings-header">
    <div class="settings-title">Settings</div>
    <button id="settings-close">✕</button>
  </div>
  <div class="settings-body">

    <!-- Account -->
    <div class="settings-section">
      <div class="settings-section-label">Account</div>
      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row-label">Name</div>
          <div class="settings-row-value" id="settings-name">—</div>
        </div>
        <div class="settings-row">
          <div class="settings-row-label">Email</div>
          <div class="settings-row-value" id="settings-email">—</div>
        </div>
        <div class="settings-row">
          <div class="settings-row-label">Password</div>
          <button class="settings-row-action" id="pw-toggle-btn">Change</button>
        </div>
        <div id="pw-form">
          <input class="pw-input" type="password" id="pw-current" placeholder="Current password" autocomplete="current-password"/>
          <input class="pw-input" type="password" id="pw-new" placeholder="New password (min. 6 chars)" autocomplete="new-password"/>
          <input class="pw-input" type="password" id="pw-confirm" placeholder="Confirm new password" autocomplete="new-password"/>
          <div class="pw-error" id="pw-error"></div>
          <div class="pw-success" id="pw-success">Password updated successfully!</div>
          <button class="pw-save-btn" id="pw-save-btn">Update Password</button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="settings-section">
      <div class="settings-section-label">Your Data</div>
      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row-label">Total Routes</div>
          <div class="settings-row-value" id="settings-routes">—</div>
        </div>
        <div class="settings-row">
          <div class="settings-row-label">Total Pins</div>
          <div class="settings-row-value" id="settings-pins">—</div>
        </div>
        <div class="settings-row">
          <div class="settings-row-label">Photos Taken</div>
          <div class="settings-row-value" id="settings-photos">—</div>
        </div>
      </div>
    </div>

    <!-- Logout -->
    <div class="settings-section">
      <div class="settings-section-label">Session</div>
      <div class="settings-card">
        <div class="settings-row" style="cursor:pointer" id="settings-logout-row">
          <div class="settings-row-label" style="color:#e03b3b">Log Out</div>
          <div style="color:#e03b3b;font-size:18px">→</div>
        </div>
      </div>
    </div>

    <div class="settings-version">CanvassTrack · Prototype</div>
  </div>
</div>

<button id="coverage-add-btn">＋ Add Route</button>

<!-- History Panel -->
<div id="hist-panel">
  <div id="hist-header">
    <div class="hist-title">History</div>
    <button id="hist-close">✕</button>
  </div>
  <div id="hist-tabs">
    <div class="htab active" data-tab="routes">Routes</div>
    <div class="htab" data-tab="pins">Touch Points</div>
    <div class="htab" data-tab="coverage">Coverage</div>
    <div class="htab" data-tab="storms">⛈️ Storms</div>
  </div>
  <div id="hist-body"></div>
  <div id="coverage-wrap">
    <div id="coverage-map"></div>
    <div id="cov-filter">
      <button class="cov-day-btn active" data-cdays="30">30 days</button>
      <button class="cov-day-btn" data-cdays="90">90 days</button>
      <button class="cov-day-btn" data-cdays="365">1 year</button>
      <button class="cov-day-btn" data-cdays="9999">All time</button>
    </div>
    <div id="coverage-hint-text">Your routes + shared routes</div>
    <div id="storm-legend">
      <div style="font-size:10px;color:#888;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px">Storm Events</div>
      <div style="font-size:10px;color:#666;margin-bottom:3px;font-weight:700">⛈️ HAIL (circles)</div>
      <div class="legend-row"><div class="legend-dot" style="background:#f5e623"></div><span style="color:#ccc">1.0–1.5" quarter</span></div>
      <div class="legend-row"><div class="legend-dot" style="background:#f5a623"></div><span style="color:#ccc">1.5–2.0" golf ball</span></div>
      <div class="legend-row"><div class="legend-dot" style="background:#e03b3b"></div><span style="color:#ccc">2.0"+ baseball</span></div>
      <div style="font-size:10px;color:#666;margin:5px 0 3px;font-weight:700">💨 WIND (diamonds)</div>
      <div class="legend-row"><div style="width:10px;height:10px;background:#4a9eff;transform:rotate(45deg);flex-shrink:0"></div><span style="color:#ccc">50–65kt (~58–75mph)</span></div>
      <div class="legend-row"><div style="width:10px;height:10px;background:#0066ff;transform:rotate(45deg);flex-shrink:0"></div><span style="color:#ccc">65kt+ (~75mph+)</span></div>
      <div style="font-size:10px;color:#666;margin:5px 0 3px;font-weight:700">🌪️ TORNADO (triangles)</div>
      <div class="legend-row"><div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #d4a0ff;flex-shrink:0"></div><span style="color:#ccc">EF0–EF1</span></div>
      <div class="legend-row"><div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #a855f7;flex-shrink:0"></div><span style="color:#ccc">EF2–EF3</span></div>
      <div class="legend-row"><div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #7c3aed;flex-shrink:0"></div><span style="color:#ccc">EF4–EF5</span></div>
    </div>
  </div>

  <!-- Storms tab panel -->
  <div id="storms-wrap" style="display:none;flex-direction:column;flex:1;overflow:hidden;position:absolute;top:0;left:0;right:0;bottom:0;background:#0d0d0d">
    <div style="padding:10px 14px 8px;display:flex;align-items:center;gap:7px;flex-wrap:nowrap;border-bottom:1px solid #1c1c1c;flex-shrink:0;overflow-x:auto">
      <button class="storm-tab-type active" data-stt="hail" style="padding:5px 10px;border-radius:14px;font-size:12px;font-weight:800;border:1.5px solid #f5e62366;color:#f5e623;background:rgba(245,230,35,.08);cursor:pointer;white-space:nowrap">⛈️ Hail</button>
      <button class="storm-tab-type active" data-stt="wind" style="padding:5px 10px;border-radius:14px;font-size:12px;font-weight:800;border:1.5px solid #4a9eff66;color:#4a9eff;background:rgba(74,158,255,.08);cursor:pointer;white-space:nowrap">💨 Wind</button>
      <button class="storm-tab-type active" data-stt="tornado" style="padding:5px 10px;border-radius:14px;font-size:12px;font-weight:800;border:1.5px solid #a855f766;color:#a855f7;background:rgba(168,85,247,.08);cursor:pointer;white-space:nowrap">🌪️ Tornado</button>
      <div style="margin-left:auto;display:flex;gap:4px;flex-shrink:0">
        <button class="storm-tab-days active" data-std="30">30d</button>
        <button class="storm-tab-days" data-std="90">90d</button>
        <button class="storm-tab-days" data-std="180">6mo</button>
        <button class="storm-tab-days" data-std="365">1yr</button>
      </div>
    </div>
    <div style="padding:6px 14px;font-size:11px;color:#444;flex-shrink:0;border-bottom:1px solid #1a1a1a" id="storms-meta">Tap to load storm data</div>
    <div id="storms-map" style="flex:0 0 40%;min-height:0;position:relative"></div>
    <div id="storms-list" style="flex:1;overflow-y:auto;padding:8px 12px 80px"></div>
  </div>
</div>



<!-- Custom Confirm Sheet -->
<div id="confirm-bg">
  <div id="confirm-sheet">
    <div id="confirm-msg"></div>
    <button id="confirm-ok">Confirm</button>
    <button id="confirm-cancel">Cancel</button>
  </div>
</div>

<!-- Pin Detail Sheet -->
<div id="detail-bg">
  <div id="detail-sheet">
    <img id="detail-photo" src="" alt="roof photo"/>
    <div class="detail-body">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="detail-handle" style="margin:0"></div>
        <button id="detail-close-btn" style="width:32px;height:32px;border-radius:50%;background:#222;border:1px solid #2a2a2a;color:#888;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
      </div>
      <div class="detail-top">
        <div class="detail-addr" id="detail-addr"></div>
        <span class="detail-badge" id="detail-badge"></span>
      </div>
      <div id="detail-contact" style="display:none;margin:10px 0 4px"></div>
      <div class="detail-notes" id="detail-notes"></div>
      <div class="detail-meta" id="detail-meta"></div>
      <div id="detail-followup" style="margin-bottom:16px"></div>
      <div class="detail-btns">
        <button class="detail-edit" id="detail-edit-btn">✏️ Edit</button>
        <button class="detail-delete" id="detail-delete-btn">🗑 Delete</button>
      </div>
    </div>
  </div>
</div>

<!-- Pin Sheet -->
<div id="sheet-bg">
  <div id="sheet">
    <div class="handle"></div>
    <div class="sheet-header">
      <div class="stitle" id="sheet-title">📍 Log this stop</div>
      <button id="delete-pin-btn">🗑 Delete</button>
    </div>

    <div class="field-label" style="margin-top:10px">Address</div>
    <div class="saddr-row">
      <input type="text" id="saddr-input" placeholder="123 Main St"/>
    </div>

    <div class="field-label">Status</div>
    <div class="stags">
      <div class="tag" data-s="Dropped Lit">Dropped Lit</div>
      <div class="tag" data-s="No Answer">No Answer</div>
      <div class="tag" data-s="Spoke to Owner">Spoke to Owner</div>
      <div class="tag" data-s="Interested">Interested</div>
      <div class="tag" data-s="Appointment">Appointment</div>
    </div>

    <div class="field-label">Interaction Date</div>
    <div class="saddr-row" style="margin-bottom:14px">
      <input type="date" id="interaction-date-input" style="flex:1;background:#0d0d0d;border:1px solid #252525;border-radius:11px;color:#fff;font-family:inherit;font-size:14px;padding:10px 13px;outline:none;color-scheme:dark"/>
    </div>

    <div class="field-label">Owner Name</div>
    <div class="saddr-row" style="margin-bottom:14px">
      <input type="text" id="owner-name-input" placeholder="John Smith" style="flex:1;background:#0d0d0d;border:1px solid #252525;border-radius:11px;color:#fff;font-family:inherit;font-size:14px;padding:10px 13px;outline:none"/>
    </div>

    <div class="field-label">Phone</div>
    <div class="saddr-row" style="margin-bottom:14px">
      <input type="tel" id="phone-input" placeholder="(555) 123-4567" style="flex:1;background:#0d0d0d;border:1px solid #252525;border-radius:11px;color:#fff;font-family:inherit;font-size:14px;padding:10px 13px;outline:none"/>
    </div>

    <div class="field-label">Follow-up Date</div>
    <div class="saddr-row" style="margin-bottom:14px">
      <input type="date" id="followup-input" style="flex:1;background:#0d0d0d;border:1px solid #252525;border-radius:11px;color:#fff;font-family:inherit;font-size:14px;padding:10px 13px;outline:none;color-scheme:dark"/>
    </div>

    <div class="field-label">Notes</div>
    <textarea id="notes" placeholder="Roof age, damage, notes…"></textarea>

    <div class="photo-section">
      <div class="field-label">Photo</div>
      <div id="photo-preview-wrap">
        <img id="photo-preview" src="" alt=""/>
        <button id="photo-remove">✕</button>
      </div>
      <div style="display:flex;gap:8px">
        <button id="photo-btn-camera" onclick="document.getElementById('photo-input-camera').click()" style="flex:1;padding:12px;background:#1a1a1a;border:1.5px dashed #2a2a2a;border-radius:12px;color:#555;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">📷 Camera</button>
        <button id="photo-btn" onclick="document.getElementById('photo-input').click()" style="flex:1;padding:12px;background:#1a1a1a;border:1.5px dashed #2a2a2a;border-radius:12px;color:#555;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">🖼 Gallery</button>
      </div>
      <input type="file" id="photo-input-camera" accept="image/*" capture="environment" style="display:none"/>
      <input type="file" id="photo-input" accept="image/*"/>
    </div>

    <div class="sbtns">
      <button class="bcancel" id="bcancel">Cancel</button>
      <button class="bsave" id="bsave">Save</button>
    </div>
  </div>
</div>

<script>
const STATUS_COLORS={'Dropped Lit':'#f5a623','No Answer':'#666','Spoke to Owner':'#4a9eff','Interested':'#00c9a7','Appointment':'#a855f7'};
const SESSION_COLORS=['#f5a623','#00c9a7','#4a9eff','#e03b3b','#a855f7','#f97316'];
// Auth token stored in localStorage
let authToken = localStorage.getItem('ct_token') || null;
let currentUser = JSON.parse(localStorage.getItem('ct_user') || 'null');

function authHeaders(extra={}) {
  return { 'Content-Type': 'application/json', ...(authToken ? { 'Authorization': 'Bearer ' + authToken } : {}), ...extra };
}

const api={
  get:   p    => fetch(p, { headers: authHeaders() }).then(r=>r.json()),
  post:  (p,b)=> fetch(p,{method:'POST',  headers:authHeaders(), body:JSON.stringify(b)}).then(r=>r.json()),
  patch: (p,b)=> fetch(p,{method:'PATCH', headers:authHeaders(), body:b?JSON.stringify(b):undefined}).then(r=>r.json()),
  del:   p    => fetch(p,{method:'DELETE', headers:authHeaders()}).then(r=>r.json()),
};

let map,coverageMap,youMarker;
let tracking=false,watchId=null,curSession=null,curLine=null;
let startTime=null,timerInt=null;
let sessions=[],pins=[],allLines=[],allPinMarkers=[];
let coordBuffer=[],pendingLL=null,selStatus='',pendingPhoto=null;
let editingPin=null; // null = new pin, object = editing existing
let histTab='routes',coverageMapInit=false;
let importedRoutes=[], importedPins=[];
let followMode=true; // auto-center map on user while tracking

// Map
map=L.map('map',{zoomControl:false,attributionControl:false}).setView([38.85,-76.53],13);
addSatTiles(map);
L.control.zoom({position:'topright'}).addTo(map);
// map click disabled — use pin button flow
map.on('dragstart',()=>{ if(tracking){ followMode=false; showFollowBtn(true); } });

function addSatTiles(m){
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(m);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,opacity:.9}).addTo(m);
}

let tT;
function toast(msg,ms=2800){
  const el=document.getElementById('toast');
  el.textContent=msg;el.classList.add('show');
  clearTimeout(tT);tT=setTimeout(()=>el.classList.remove('show'),ms);
}

async function load(){
  try{
    // Load all data in parallel — sessions, pins, and shared routes
    const [sessData, pinData, sharedData] = await Promise.all([
      api.get('/api/sessions'),
      api.get('/api/pins'),
      api.get('/api/coverage/shared').catch(()=>({sessions:[],pins:[]}))
    ]);
    sessions       = sessData  || [];
    pins           = pinData   || [];
    importedRoutes = sharedData.sessions || [];
    importedPins   = sharedData.pins     || [];
    renderAll();
    const ov=document.getElementById('loading-overlay'); if(ov) ov.style.display='none';
  }catch(e){ console.error('load error',e); const ov=document.getElementById('loading-overlay'); if(ov) ov.style.display='none'; }
}

function sCol(i){return SESSION_COLORS[i%SESSION_COLORS.length];}

function renderAll(){
  allLines.forEach(l=>map.removeLayer(l));
  allPinMarkers.forEach(m=>map.removeLayer(m));
  allLines=[];allPinMarkers=[];
  sessions.forEach((s,i)=>{
    if(s.coords&&s.coords.length>1){
      const pl=L.polyline(s.coords.map(c=>[c.lat,c.lng]),{color:s.color||sCol(i),weight:6,opacity:1}).addTo(map);
      allLines.push(pl);
    }
  });
  pins.forEach(p=>drawPin(p));
  // Draw imported/shared pins on main map too
  importedPins.forEach(p=>drawSharedPin(p));
}

function drawPin(pin){
  const c=STATUS_COLORS[pin.status]||'#f5a623';
  let iconHtml, iconSize, iconAnchor;
  if(pin.photo){
    // Show circular thumbnail above a pin stem
    iconHtml=`
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none">
        <div style="
          width:44px;height:44px;border-radius:50%;
          border:3px solid ${c};
          background:url('${pin.photo}') center/cover;
          box-shadow:0 3px 10px rgba(0,0,0,.7);
          flex-shrink:0;
        "></div>
        <div style="width:3px;height:8px;background:${c};border-radius:0 0 2px 2px;margin-top:-1px"></div>
        <div style="width:7px;height:7px;border-radius:50%;background:${c};margin-top:-2px;box-shadow:0 2px 4px rgba(0,0,0,.5)"></div>
      </div>`;
    iconSize=[44,62];iconAnchor=[22,62];
  } else {
    iconHtml=`<div class="pin-drop" style="background:${c}"></div>`;
    iconSize=[14,14];iconAnchor=[7,14];
  }
  const icon=L.divIcon({html:iconHtml,iconSize,iconAnchor,className:''});
  const m=L.marker([pin.lat,pin.lng],{icon})
    .on('click',()=>openDetail(pin.id))
    .addTo(map);
  allPinMarkers.push(m);
  return m;
}



// Draw a shared (imported) pin on the main map — different style to distinguish
function drawSharedPin(pin){
  const c = STATUS_COLORS[pin.status]||'#00c9a7';
  const icon = L.divIcon({
    html:`<div class="pin-drop" style="background:${c};opacity:0.85;border-color:rgba(255,255,255,.6)"></div>`,
    iconSize:[14,14], iconAnchor:[7,14], className:''
  });
  const m = L.marker([pin.lat,pin.lng],{icon})
    .bindPopup(`<div style="min-width:130px">
      <b style="font-size:14px">${pin.address||'Stop'}</b><br>
      <span style="color:${c};font-weight:700;font-size:12px">${pin.status||'–'}</span><br>
      <span style="color:#888;font-size:11px">📤 from ${pin.owner_name||'Partner'}</span>
      ${pin.notes?`<br><span style="color:#999;font-size:12px">${pin.notes}</span>`:''}
    </div>`)
    .addTo(map);
  allPinMarkers.push(m);
}

function setYou(lat,lng){
  if(youMarker)map.removeLayer(youMarker);
  const icon=L.divIcon({html:'<div class="you-ring"></div>',iconSize:[16,16],iconAnchor:[8,8],className:''});
  youMarker=L.marker([lat,lng],{icon,zIndexOffset:9999}).addTo(map);
}



// ── Custom confirm (replaces browser confirm()) ────────────────────
let confirmCallback = null;
function showConfirm(msg, onConfirm, confirmLabel='Confirm'){
  confirmCallback = onConfirm;
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-ok').textContent = confirmLabel;
  document.getElementById('confirm-bg').classList.add('open');
}
document.getElementById('confirm-ok').addEventListener('click',()=>{
  document.getElementById('confirm-bg').classList.remove('open');
  if(confirmCallback){ confirmCallback(); confirmCallback=null; }
});
document.getElementById('confirm-cancel').addEventListener('click',()=>{
  document.getElementById('confirm-bg').classList.remove('open');
  confirmCallback=null;
});

// ── Pin Detail Sheet ─────────────────────────────────────────────
let detailPinId = null;

function openDetail(pinId){
  const pin = pins.find(p=>p.id===pinId);
  if(!pin) return;
  detailPinId = pinId;
  const c = STATUS_COLORS[pin.status]||'#f5a623';
  const d = new Date(pin.created_at||Date.now());

  document.getElementById('detail-addr').textContent = pin.address||'Unnamed stop';
  const badge = document.getElementById('detail-badge');
  badge.textContent = pin.status||'–';
  badge.style.cssText = `background:${c}22;color:${c};border:1px solid ${c}44`;

  const notesEl = document.getElementById('detail-notes');
  notesEl.textContent = pin.notes||'';
  notesEl.style.display = pin.notes ? 'block' : 'none';

  const interactionStr = pin.interaction_date ? formatDate(pin.interaction_date) : d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  document.getElementById('detail-meta').textContent = '📅 Interacted: ' + interactionStr;

  const photo = document.getElementById('detail-photo');
  if(pin.photo){ photo.src=pin.photo; photo.classList.add('show'); }
  else { photo.src=''; photo.classList.remove('show'); }

  // Contact info
  const contactEl = document.getElementById('detail-contact');
  if(pin.owner_name || pin.phone){
    contactEl.style.display='block';
    let html = '';
    if(pin.owner_name) html += `<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:4px">👤 ${pin.owner_name}</div>`;
    if(pin.phone) html += `<a href="tel:${pin.phone}" class="call-btn">📞 ${pin.phone} <span style="font-size:12px;opacity:.7">Tap to call</span></a>`;
    contactEl.innerHTML = html;
  } else { contactEl.style.display='none'; }

  // Follow-up date
  const fuEl = document.getElementById('detail-followup');
  if(pin.followup_date){
    const today = new Date().toISOString().split('T')[0];
    const fu = pin.followup_date;
    let cls, label;
    if(fu < today){ cls='due'; label='⚠️ Follow-up overdue: '+formatDate(fu); }
    else if(fu === today){ cls='due'; label='🔴 Follow up TODAY: '+formatDate(fu); }
    else { cls='upcoming'; label='📅 Follow up: '+formatDate(fu); }
    fuEl.innerHTML = `<div class="followup-badge ${cls}">${label}</div>`;
  } else { fuEl.innerHTML=''; }

  document.getElementById('detail-bg').classList.add('open');
}

function followupBadge(dateStr){
  if(!dateStr) return '';
  const today = new Date().toISOString().split('T')[0];
  if(dateStr < today) return `<div class="followup-badge due">⚠️ Overdue: ${formatDate(dateStr)}</div>`;
  if(dateStr === today) return `<div class="followup-badge due">🔴 Follow up TODAY</div>`;
  return `<div class="followup-badge upcoming">📅 ${formatDate(dateStr)}</div>`;
}

function formatDate(dateStr){
  const d = new Date(dateStr+'T12:00:00');
  return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
}

function closeDetail(){
  document.getElementById('detail-bg').classList.remove('open');
  detailPinId=null;
}
document.getElementById('detail-close-btn').addEventListener('click', closeDetail);
document.getElementById('detail-bg').addEventListener('click',e=>{
  if(e.target===document.getElementById('detail-bg')) closeDetail();
});

document.getElementById('detail-edit-btn').addEventListener('click',()=>{
  const pin=pins.find(p=>p.id===detailPinId);
  if(!pin)return;
  document.getElementById('detail-bg').classList.remove('open');
  openSheet({lat:pin.lat,lng:pin.lng},pin);
  detailPinId=null;
});

document.getElementById('detail-delete-btn').addEventListener('click',async()=>{
  const pin=pins.find(p=>p.id===detailPinId);
  if(!pin)return;
  showConfirm('Delete this pin?', async ()=>{
    try{
      const pid=detailPinId;
      await api.del('/api/pins/'+pid);
      pins=pins.filter(p=>p.id!==pid);
      renderAll();
      if(document.getElementById('hist-panel').classList.contains('open'))renderHistTab(histTab);
      toast('Pin deleted');
    }catch(e){toast('Could not delete',3000);}
    document.getElementById('detail-bg').classList.remove('open');
    detailPinId=null;
  }, 'Delete');
});

// ── Tracking ──────────────────────────────────────────────────────
document.getElementById('trackBtn').addEventListener('click',()=>tracking?stopT():startT());

function startT(){
  if(!('geolocation' in navigator)){toast('GPS not available');return;}
  document.getElementById('trackBtn').textContent='Getting GPS…';
  document.getElementById('trackBtn').disabled=true;
  toast('Getting your location…',3000);
  navigator.geolocation.getCurrentPosition(async pos=>{
    const{latitude:lat,longitude:lng}=pos.coords;
    const id=Date.now()+'';const color=sCol(sessions.length);
    try{await api.post('/api/sessions',{id,color});}catch(e){}
    curSession={id,color,coords:[],started_at:new Date().toISOString()};
    curLine=L.polyline([],{color,weight:6,opacity:1}).addTo(map);
    tracking=true;
    document.getElementById('trackBtn').textContent='⏹ Stop Tracking';
    document.getElementById('trackBtn').classList.add('stop');
    document.getElementById('dot').classList.add('on');
    document.getElementById('timer').classList.add('show');
    document.getElementById('pinBtn').classList.add('show');
    startTime=Date.now();timerInt=setInterval(tickTimer,1000);
    map.setView([lat,lng],16);setYou(lat,lng);
    watchId=navigator.geolocation.watchPosition(onPos,onPosErr,{enableHighAccuracy:true,maximumAge:2000,timeout:20000});
    followMode=true;
    document.getElementById('trackBtn').disabled=false;
    toast('Tracking • tap map or 📍 to log a stop');
  },err=>{
    const m={1:'Location denied — Settings → Privacy → Location Services',2:'GPS unavailable',3:'GPS timed out'};
    document.getElementById('trackBtn').textContent='▶ Start Tracking';
    document.getElementById('trackBtn').disabled=false;
    toast(m[err.code]||'GPS error',5000);
  },{enableHighAccuracy:true,timeout:15000});
}

function onPos(pos){
  const{latitude:lat,longitude:lng}=pos.coords;
  setYou(lat,lng);
  if(followMode) map.setView([lat,lng],map.getZoom(),{animate:true,duration:0.5});
  if(!curSession)return;
  const coord={lat,lng,ts:new Date().toISOString()};
  curSession.coords.push(coord);curLine.addLatLng([lat,lng]);
  coordBuffer.push(coord);if(coordBuffer.length>=8)flushCoords();
}
function onPosErr(err){toast({1:'Location denied',2:'GPS unavailable',3:'GPS timed out'}[err.code]||'GPS error',3000);}

async function flushCoords(){
  if(!curSession||!coordBuffer.length)return;
  const batch=[...coordBuffer];coordBuffer=[];
  try{await api.post(`/api/sessions/${curSession.id}/coords`,{coords:batch});}
  catch(e){coordBuffer=[...batch,...coordBuffer];}
}

async function stopT(){
  if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;}
  clearInterval(timerInt);timerInt=null;await flushCoords();
  if(curSession){
    try{await api.patch(`/api/sessions/${curSession.id}/end`);}catch(e){}
    sessions.push({...curSession});if(curLine)allLines.push(curLine);
    toast(`Route saved — ${curSession.coords.length} points`);
  }
  tracking=false;curSession=null;curLine=null;startTime=null;coordBuffer=[];
  document.getElementById('trackBtn').textContent='▶ Start Tracking';
  document.getElementById('trackBtn').classList.remove('stop');
  document.getElementById('dot').classList.remove('on');
  document.getElementById('timer').classList.remove('show');
  document.getElementById('timer').textContent='';
  document.getElementById('pinBtn').classList.remove('show');
  followMode=true; showFollowBtn(false);
}

function tickTimer(){
  if(!startTime)return;
  const s=Math.floor((Date.now()-startTime)/1000);
  document.getElementById('timer').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}



// ── Settings Panel ────────────────────────────────────────────────
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('settings-close').addEventListener('click', () => {
  document.getElementById('settings-panel').classList.remove('open');
});

function openSettings() {
  // Populate account info
  if(currentUser){
    document.getElementById('settings-name').textContent  = currentUser.name  || '—';
    document.getElementById('settings-email').textContent = currentUser.email || '—';
  }
  // Populate stats
  document.getElementById('settings-routes').textContent = sessions.length + (importedRoutes.length ? ` (+${importedRoutes.length} shared)` : '');
  document.getElementById('settings-pins').textContent   = pins.length + (importedPins.length ? ` (+${importedPins.length} shared)` : '');
  document.getElementById('settings-photos').textContent = pins.filter(p=>p.photo).length;
  // Reset password form
  closePwForm();
  document.getElementById('settings-panel').classList.add('open');
}

// Password change
document.getElementById('pw-toggle-btn').addEventListener('click', () => {
  const form = document.getElementById('pw-form');
  if(form.classList.contains('open')){
    closePwForm();
    document.getElementById('pw-toggle-btn').textContent = 'Change';
  } else {
    form.classList.add('open');
    document.getElementById('pw-toggle-btn').textContent = 'Cancel';
    document.getElementById('pw-current').focus();
  }
});

function closePwForm(){
  const form = document.getElementById('pw-form');
  form.classList.remove('open');
  document.getElementById('pw-current').value  = '';
  document.getElementById('pw-new').value      = '';
  document.getElementById('pw-confirm').value  = '';
  document.getElementById('pw-error').classList.remove('show');
  document.getElementById('pw-success').classList.remove('show');
  document.getElementById('pw-toggle-btn').textContent = 'Change';
}

document.getElementById('pw-save-btn').addEventListener('click', async () => {
  const current  = document.getElementById('pw-current').value;
  const newPw    = document.getElementById('pw-new').value;
  const confirm  = document.getElementById('pw-confirm').value;
  const errEl    = document.getElementById('pw-error');
  const okEl     = document.getElementById('pw-success');
  errEl.classList.remove('show'); okEl.classList.remove('show');

  if(!current || !newPw || !confirm){ errEl.textContent='Fill in all fields'; errEl.classList.add('show'); return; }
  if(newPw.length < 6){ errEl.textContent='New password must be at least 6 characters'; errEl.classList.add('show'); return; }
  if(newPw !== confirm){ errEl.textContent='New passwords do not match'; errEl.classList.add('show'); return; }

  document.getElementById('pw-save-btn').textContent = 'Updating…';
  try {
    const res = await fetch('/api/auth/password', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ currentPassword: current, newPassword: newPw })
    });
    const data = await res.json();
    if(!res.ok){ errEl.textContent = data.error || 'Update failed'; errEl.classList.add('show'); }
    else {
      okEl.classList.add('show');
      document.getElementById('pw-current').value = '';
      document.getElementById('pw-new').value     = '';
      document.getElementById('pw-confirm').value = '';
      setTimeout(closePwForm, 2000);
    }
  } catch(e) { errEl.textContent='Network error'; errEl.classList.add('show'); }
  document.getElementById('pw-save-btn').textContent = 'Update Password';
});

// Logout
document.getElementById('settings-logout-row').addEventListener('click', () => {
  showConfirm('Log out of CanvassTrack?', ()=>{
  authToken = null; currentUser = null;
  localStorage.removeItem('ct_token');
  localStorage.removeItem('ct_user');
  document.getElementById('settings-panel').classList.remove('open');
  // Reset app state
  sessions=[]; pins=[]; renderAll();
  showAuthScreen();
  }, 'Log Out');
});


// ── Session Sharing ───────────────────────────────────────────────
const SHARED_COLORS = ['#00c9a7','#4a9eff','#a855f7','#ec4899','#22d3ee','#f97316'];

async function loadImportedRoutes(){
  try {
    const data = await api.get('/api/coverage/shared');
    importedRoutes = data.sessions || [];
    importedPins   = data.pins    || [];
  } catch(e){ importedRoutes=[]; importedPins=[]; }
}

// Share a specific session — called from history route card
async function shareSession(sessionId){
  try {
    const res = await api.post(`/api/sessions/${sessionId}/share`, {});
    if(res.error){ toast(res.error, 3000); return; }
    // Show the code in a simple prompt-style modal
    showShareCode(res.code);
  } catch(e){ toast('Could not generate share code', 3000); }
}

function showShareCode(code){
  // Reuse the sheet-bg overlay for the share code display
  const bg = document.createElement('div');
  bg.style.cssText = 'position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.65);backdrop-filter:blur(5px);display:flex;align-items:flex-end';
  bg.innerHTML = `
    <div style="width:100%;background:#161616;border-radius:22px 22px 0 0;border-top:1px solid rgba(255,255,255,.08);padding:20px 20px 48px">
      <div style="width:36px;height:4px;background:#2a2a2a;border-radius:2px;margin:0 auto 18px"></div>
      <div style="font-size:17px;font-weight:800;margin-bottom:6px">📤 Share This Route</div>
      <div style="font-size:13px;color:#555;margin-bottom:16px">Give this code to your partner — they'll enter it on their Coverage map</div>
      <div class="share-code-display">
        <div class="share-code-text">${code}</div>
        <div class="share-code-hint">Share code — valid until route is deleted</div>
      </div>
      <button onclick="navigator.clipboard&&navigator.clipboard.writeText('${code}')" style="width:100%;padding:14px;background:#1c1c1c;border:1.5px solid #2c2c2c;border-radius:12px;color:#f5a623;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px">📋 Copy Code</button>
      <button id="share-close-btn" style="width:100%;padding:14px;background:transparent;border:1px solid #222;border-radius:12px;color:#555;font-size:15px;cursor:pointer">Done</button>
    </div>`;
  document.body.appendChild(bg);
  bg.querySelector('#share-close-btn').addEventListener('click', ()=>bg.remove());
  bg.addEventListener('click', e=>{ if(e.target===bg) bg.remove(); });
}

// Coverage map + Add Route button
document.getElementById('coverage-add-btn').addEventListener('click', ()=>{
  const bg = document.createElement('div');
  bg.style.cssText = 'position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.65);backdrop-filter:blur(5px);display:flex;align-items:flex-end';
  bg.innerHTML = `
    <div style="width:100%;background:#161616;border-radius:22px 22px 0 0;border-top:1px solid rgba(255,255,255,.08);padding:20px 20px 48px">
      <div style="width:36px;height:4px;background:#2a2a2a;border-radius:2px;margin:0 auto 18px"></div>
      <div style="font-size:17px;font-weight:800;margin-bottom:6px">＋ Add a Route</div>
      <div style="font-size:13px;color:#555;margin-bottom:16px">Enter the share code from your partner to add their route to your coverage map</div>
      <input id="import-code-input" style="width:100%;background:#0d0d0d;border:1px solid #252525;border-radius:11px;color:#fff;font-family:inherit;font-size:26px;font-weight:900;letter-spacing:6px;text-align:center;text-transform:uppercase;padding:14px;outline:none;margin-bottom:12px" placeholder="XXXXXX" maxlength="6"/>
      <div id="import-error" style="font-size:12px;color:#e03b3b;margin-bottom:10px;display:none"></div>
      <button id="import-confirm-btn" style="width:100%;padding:15px;background:#f5a623;color:#000;border:none;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;margin-bottom:10px">Add to My Coverage</button>
      <button id="import-cancel-btn" style="width:100%;padding:14px;background:transparent;border:1px solid #222;border-radius:12px;color:#555;font-size:15px;cursor:pointer">Cancel</button>
    </div>`;
  document.body.appendChild(bg);

  bg.querySelector('#import-cancel-btn').addEventListener('click',()=>bg.remove());
  bg.addEventListener('click',e=>{ if(e.target===bg) bg.remove(); });
  bg.querySelector('#import-confirm-btn').addEventListener('click', async ()=>{
    const code = bg.querySelector('#import-code-input').value.trim().toUpperCase();
    const errEl = bg.querySelector('#import-error');
    errEl.style.display='none';
    if(!code||code.length!==6){ errEl.textContent='Enter the 6-character code'; errEl.style.display='block'; return; }
    bg.querySelector('#import-confirm-btn').textContent='Adding…';
    try {
      const res = await api.post('/api/coverage/import', { code });
      if(res.error){ errEl.textContent=res.error; errEl.style.display='block'; bg.querySelector('#import-confirm-btn').textContent='Add to My Coverage'; return; }
      toast(`Route from ${res.owner_name} added — check Routes & Touch Points tabs`);
      await load(); // reload everything including shared data
      initCoverageMap();
      bg.remove();
    } catch(e){ errEl.textContent='Network error'; errEl.style.display='block'; bg.querySelector('#import-confirm-btn').textContent='Add to My Coverage'; }
  });

  setTimeout(()=>bg.querySelector('#import-code-input').focus(), 100);
});



// ── Forgot password ────────────────────────────────────────────────
document.getElementById('forgot-link').addEventListener('click',()=>{
  document.getElementById('forgot-bg').style.display='flex';
  document.getElementById('forgot-error').style.display='none';
  document.getElementById('forgot-success').style.display='none';
  document.getElementById('forgot-email').value='';
});
document.getElementById('forgot-close').addEventListener('click',()=>{
  document.getElementById('forgot-bg').style.display='none';
});
document.getElementById('forgot-submit').addEventListener('click', async ()=>{
  const email = document.getElementById('forgot-email').value.trim();
  const errEl = document.getElementById('forgot-error');
  const okEl  = document.getElementById('forgot-success');
  errEl.style.display='none'; okEl.style.display='none';
  if(!email){ errEl.textContent='Enter your email'; errEl.style.display='block'; return; }
  document.getElementById('forgot-submit').textContent='Sending…';
  try{
    const res = await fetch('/api/auth/forgot', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email})
    });
    const data = await res.json();
    if(!res.ok){ errEl.textContent=data.error||'Error'; errEl.style.display='block'; }
    else { okEl.textContent='If that email exists, a reset code has been sent. Check with your admin.'; okEl.style.display='block'; }
  }catch(e){ errEl.textContent='Network error'; errEl.style.display='block'; }
  document.getElementById('forgot-submit').textContent='Send Reset Code';
});



// ── Storm Overlay ─────────────────────────────────────────────────
let stormMarkers = [], stormDays = 7, stormVisible = false;
let activeStormTypes = new Set(['hail','wind','tornado']);

document.getElementById('stormBtn').addEventListener('click', () => {
  if(stormVisible){ hideStorm(); return; }
  document.getElementById('storm-bar').classList.add('show');
  stormVisible = true;
  loadStorm();
});

document.getElementById('storm-close-btn').addEventListener('click', hideStorm);

function hideStorm(){
  stormVisible = false;
  document.getElementById('storm-bar').classList.remove('show');
  document.getElementById('storm-legend').classList.remove('show');
  stormMarkers.forEach(m => map.removeLayer(m));
  stormMarkers = [];
}

// Type toggles
document.querySelectorAll('.storm-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.stype;
    if(activeStormTypes.has(t)){ activeStormTypes.delete(t); btn.classList.remove('active'); }
    else { activeStormTypes.add(t); btn.classList.add('active'); }
    if(stormVisible) loadStorm();
  });
});

// Day range
document.querySelectorAll('.storm-days-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.storm-days-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    stormDays = parseInt(btn.dataset.days);
    if(stormVisible) loadStorm();
  });
});

async function loadStorm(){
  const loadEl = document.getElementById('storm-loading');
  loadEl.style.display = 'block';
  stormMarkers.forEach(m => map.removeLayer(m));
  stormMarkers = [];
  try{
    const events = await api.get('/api/storm/events?days=' + stormDays);
    loadEl.style.display = 'none';
    if(!events || events.error){ toast('Could not load storm data', 3000); return; }

    const today = new Date();
    let counts = { hail:0, wind:0, tornado:0 };

    events.forEach(ev => {
      if(!activeStormTypes.has(ev.type)) return;
      counts[ev.type] = (counts[ev.type]||0) + 1;

      const ageDays = (today - new Date(ev.date)) / 86400000;
      const opacity = Math.max(0.2, 1 - ageDays / (stormDays * 1.2));
      let marker;

      if(ev.type === 'hail'){
        let color, radius;
        if(ev.mag >= 2.0)     { color='#e03b3b'; radius=16; }
        else if(ev.mag >= 1.5){ color='#f5a623'; radius=11; }
        else                  { color='#f5e623'; radius=7; }
        marker = L.circleMarker([ev.lat, ev.lng], {
          radius, color, fillColor:color,
          fillOpacity: opacity*.65, opacity, weight:1.5
        }).bindPopup(`
          <div style="min-width:160px">
            <div style="font-weight:800;font-size:14px;margin-bottom:3px">⛈️ ${ev.mag}" Hail</div>
            <div style="color:#aaa;font-size:12px">${ev.location}${ev.county?', '+ev.county:''}, ${ev.state}</div>
            <div style="color:#f5a623;font-size:12px;margin-top:4px">${formatDate(ev.date)}</div>
          </div>`);

      } else if(ev.type === 'wind'){
        const color = ev.mag >= 75 ? '#0066ff' : '#4a9eff'; // 75mph+ = dark blue
        const mph = Math.round(ev.mag); // IEM reports wind in mph already
        // Diamond shape using rotated square divIcon
        const iconHtml = `<div style="width:12px;height:12px;background:${color};transform:rotate(45deg);opacity:${opacity};border:1.5px solid rgba(255,255,255,.4)"></div>`;
        marker = L.marker([ev.lat, ev.lng], {
          icon: L.divIcon({ html:iconHtml, iconSize:[12,12], iconAnchor:[6,6], className:'' })
        }).bindPopup(`
          <div style="min-width:160px">
            <div style="font-weight:800;font-size:14px;margin-bottom:3px">💨 ${mph}mph Wind</div>
            <div style="color:#aaa;font-size:12px">${ev.location}${ev.county?', '+ev.county:''}, ${ev.state}</div>
            <div style="color:#4a9eff;font-size:12px;margin-top:4px">${formatDate(ev.date)}</div>
          </div>`);

      } else if(ev.type === 'tornado'){
        const ef = ev.mag;
        let color;
        if(ef >= 4)      color='#7c3aed';
        else if(ef >= 2) color='#a855f7';
        else             color='#d4a0ff';
        const label = ef === 0 ? 'EF0' : `EF${ef}`;
        // Triangle using CSS borders
        const iconHtml = `<div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:14px solid ${color};opacity:${Math.max(opacity,.4)};filter:drop-shadow(0 1px 3px rgba(0,0,0,.5))"></div>`;
        marker = L.marker([ev.lat, ev.lng], {
          icon: L.divIcon({ html:iconHtml, iconSize:[16,14], iconAnchor:[8,14], className:'' })
        }).bindPopup(`
          <div style="min-width:160px">
            <div style="font-weight:800;font-size:14px;margin-bottom:3px">🌪️ ${label} Tornado</div>
            <div style="color:#aaa;font-size:12px">${ev.location}${ev.county?', '+ev.county:''}, ${ev.state}</div>
            <div style="color:#a855f7;font-size:12px;margin-top:4px">${formatDate(ev.date)}</div>
          </div>`);
      }

      if(marker){ marker.addTo(map); stormMarkers.push(marker); }
    });

    document.getElementById('storm-legend').classList.add('show');
    const parts = [];
    if(counts.hail)    parts.push(`${counts.hail} hail`);
    if(counts.wind)    parts.push(`${counts.wind} wind`);
    if(counts.tornado) parts.push(`${counts.tornado} tornado`);
    toast(parts.length ? parts.join(' · ') + ` events (${stormDays}d)` : `No events in last ${stormDays} days`, 3000);

  } catch(e){ loadEl.style.display='none'; toast('Storm data unavailable', 3000); }
}


// ── Storms Tab ────────────────────────────────────────────────────
let stormsMap = null, stormsMapInit = false;
let stormTabDays = 30, stormTabTypes = new Set(['hail','wind','tornado']);
let allStormEvents = null, stormEventsLoading = false;

// Type toggle buttons in storms tab
document.querySelectorAll('.storm-tab-type').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.stt;
    if(stormTabTypes.has(t)){ stormTabTypes.delete(t); btn.classList.remove('active'); }
    else { stormTabTypes.add(t); btn.classList.add('active'); }
    renderStormsTab();
  });
});

// Day range buttons in storms tab
document.querySelectorAll('.storm-tab-days').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.storm-tab-days').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    stormTabDays = parseInt(btn.dataset.std);
    allStormEvents = null; // force reload
    renderStormsTab();
  });
});

async function loadStormEvents() {
  if(allStormEvents !== null) return allStormEvents;
  if(stormEventsLoading) return null;
  stormEventsLoading = true;
  try {
    const events = await api.get('/api/storm/events?days=' + stormTabDays);
    allStormEvents = events || [];
    stormEventsLoading = false;
    return allStormEvents;
  } catch(e) {
    stormEventsLoading = false;
    return [];
  }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLng = (lng2-lng1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function milesFromKm(km) { return km * 0.621371; }

async function renderStormsTab() {
  const wrap = document.getElementById('storms-wrap');
  const meta = document.getElementById('storms-meta');
  const list = document.getElementById('storms-list');
  if(!wrap) return;

  // Init storms map
  const mapDiv = document.getElementById('storms-map');
  if(!stormsMapInit && mapDiv) {
    // Size the map
    const panelH = document.getElementById('hist-panel').offsetHeight;
    const headerH = document.getElementById('hist-header').offsetHeight;
    const tabsH   = document.getElementById('hist-tabs').offsetHeight;
    const ctrlH   = 80; // controls row + meta row
    mapDiv.style.height = Math.floor((panelH - headerH - tabsH - ctrlH) * 0.42) + 'px';
    stormsMap = L.map('storms-map', { zoomControl: true, attributionControl: false });
    addSatTiles(stormsMap);
    stormsMapInit = true;
  }
  setTimeout(() => { if(stormsMap) stormsMap.invalidateSize(); }, 100);

  meta.textContent = 'Loading storm data…';
  list.innerHTML = '';

  const events = await loadStormEvents();
  if(!events) { meta.textContent = 'Could not load storm data'; return; }

  // Get user position for distance sorting
  const userPos = youMarker ? youMarker.getLatLng() : null;

  // Filter by type and days
  const cutoff = new Date(Date.now() - stormTabDays * 86400000).toISOString().split('T')[0];
  let filtered = events.filter(e =>
    stormTabTypes.has(e.type) && e.date >= cutoff
  );

  // Add distance if we have position, sort by distance
  if(userPos) {
    filtered = filtered.map(e => ({
      ...e,
      distKm: haversineKm(userPos.lat, userPos.lng, e.lat, e.lng)
    })).sort((a,b) => a.distKm - b.distKm);
  } else {
    // Sort by date descending if no position
    filtered.sort((a,b) => b.date.localeCompare(a.date));
  }

  // Update meta
  const nearCount = userPos ? filtered.filter(e => e.distKm < 80).length : filtered.length;
  meta.textContent = `${filtered.length} events · ${nearCount} within 50mi · ${stormTabDays}d window`;

  // Draw on storms map
  stormsMap.eachLayer(l => { if(l instanceof L.CircleMarker || l instanceof L.Marker) stormsMap.removeLayer(l); });
  const allCoords = [];
  const today = new Date();
  filtered.forEach(ev => {
    const ageDays = (today - new Date(ev.date)) / 86400000;
    const opacity = Math.max(0.2, 1 - ageDays / (stormTabDays * 1.2));
    let marker;
    if(ev.type === 'hail') {
      let color = ev.mag >= 2.0 ? '#e03b3b' : ev.mag >= 1.5 ? '#f5a623' : '#f5e623';
      let radius = ev.mag >= 2.0 ? 14 : ev.mag >= 1.5 ? 10 : 7;
      marker = L.circleMarker([ev.lat, ev.lng], { radius, color, fillColor:color, fillOpacity:opacity*.6, opacity, weight:1.5 });
    } else if(ev.type === 'wind') {
      const color = ev.mag >= 75 ? '#0066ff' : '#4a9eff';
      marker = L.marker([ev.lat, ev.lng], { icon: L.divIcon({ html:`<div style="width:10px;height:10px;background:${color};transform:rotate(45deg);opacity:${opacity};border:1px solid rgba(255,255,255,.4)"></div>`, iconSize:[10,10], iconAnchor:[5,5], className:'' }) });
    } else {
      const color = ev.mag >= 4 ? '#7c3aed' : ev.mag >= 2 ? '#a855f7' : '#d4a0ff';
      marker = L.marker([ev.lat, ev.lng], { icon: L.divIcon({ html:`<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:13px solid ${color};opacity:${Math.max(opacity,.4)}"></div>`, iconSize:[14,13], iconAnchor:[7,13], className:'' }) });
    }
    if(marker) { marker.addTo(stormsMap); allCoords.push([ev.lat, ev.lng]); }
  });

  // Show user position on storm map
  if(userPos) {
    L.marker([userPos.lat, userPos.lng], {
      icon: L.divIcon({ html:'<div class="you-ring"></div>', iconSize:[16,16], iconAnchor:[8,8], className:'' }),
      zIndexOffset: 9999
    }).addTo(stormsMap);
    // Center on user
    if(allCoords.length > 0) {
      // Find events within 100mi and fit to those
      const nearby = filtered.filter(e => e.distKm && e.distKm < 160);
      if(nearby.length > 0) {
        const nearCoords = nearby.map(e => [e.lat, e.lng]);
        nearCoords.push([userPos.lat, userPos.lng]);
        stormsMap.fitBounds(L.latLngBounds(nearCoords), { padding:[20,20] });
      } else {
        stormsMap.setView([userPos.lat, userPos.lng], 7);
      }
    } else {
      stormsMap.setView([userPos.lat, userPos.lng], 8);
    }
  } else if(allCoords.length > 0) {
    stormsMap.fitBounds(L.latLngBounds(allCoords), { padding:[20,20] });
  }

  // Build list — show nearest first
  if(!filtered.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🌤️</div><div class="empty-text">No storm events found<br>in this time range.</div></div>';
    return;
  }

  // Show nearby first with a divider, then further away
  const nearby50 = filtered.filter(e => !e.distKm || e.distKm < 80);
  const farther  = filtered.filter(e => e.distKm && e.distKm >= 80);

  function makeEventCard(ev) {
    const card = document.createElement('div');
    card.className = 'storm-event-card';
    let icon, sizeLabel, color;
    if(ev.type === 'hail') {
      icon = '⛈️';
      const sizeNames = ev.mag >= 2.75 ? 'baseball' : ev.mag >= 1.75 ? 'golf ball' : ev.mag >= 1.5 ? 'ping pong' : ev.mag >= 1.0 ? 'quarter' : 'penny';
      sizeLabel = ev.mag + '" — ' + sizeNames;
      color = ev.mag >= 2.0 ? '#e03b3b' : ev.mag >= 1.5 ? '#f5a623' : '#f5e623';
    } else if(ev.type === 'wind') {
      icon = '💨';
      sizeLabel = ev.mag + 'mph wind';
      color = ev.mag >= 75 ? '#0066ff' : '#4a9eff';
    } else {
      icon = '🌪️';
      sizeLabel = 'EF' + (ev.mag || '0') + ' Tornado';
      color = '#a855f7';
    }
    const distStr = ev.distKm ? Math.round(milesFromKm(ev.distKm)) + ' mi away' : '';
    card.innerHTML = `
      <div class="storm-event-icon">${icon}</div>
      <div class="storm-event-info">
        <div class="storm-event-size" style="color:${color}">${sizeLabel}</div>
        <div class="storm-event-loc">${ev.location}${ev.county ? ', ' + ev.county : ''}, ${ev.state}</div>
        <div class="storm-event-date">${formatDate(ev.date)}</div>
      </div>
      ${distStr ? `<div class="storm-event-dist" style="color:#555">${distStr}</div>` : ''}
    `;
    card.addEventListener('click', () => {
      if(stormsMap) stormsMap.setView([ev.lat, ev.lng], 12);
      document.getElementById('storms-list').scrollIntoView({ behavior:'smooth' });
    });
    return card;
  }

  if(nearby50.length > 0) {
    if(userPos) {
      const hdr = document.createElement('div');
      hdr.style.cssText = 'font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#e03b3b;margin-bottom:8px';
      hdr.textContent = '📍 Near You (' + nearby50.length + ')';
      list.appendChild(hdr);
    }
    nearby50.forEach(ev => list.appendChild(makeEventCard(ev)));
  }

  if(farther.length > 0 && userPos) {
    const hdr2 = document.createElement('div');
    hdr2.style.cssText = 'font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#333;margin:14px 0 8px';
    hdr2.textContent = 'Further Away (' + farther.length + ')';
    list.appendChild(hdr2);
    farther.slice(0, 50).forEach(ev => list.appendChild(makeEventCard(ev))); // cap at 50
    if(farther.length > 50) {
      const more = document.createElement('div');
      more.style.cssText = 'text-align:center;font-size:12px;color:#333;padding:12px';
      more.textContent = (farther.length - 50) + ' more events not shown';
      list.appendChild(more);
    }
  }
}

// ── Coverage date filter ───────────────────────────────────────────
let covDays = 30;

document.querySelectorAll('.cov-day-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cov-day-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    covDays = parseInt(btn.dataset.cdays);
    initCoverageMap();
  });
});

// ── Map status filter ─────────────────────────────────────────────
let activeFilters = new Set(['all','Dropped Lit','No Answer','Spoke to Owner','Interested','Appointment']);

document.getElementById('filterBtn').addEventListener('click',()=>{
  const bar = document.getElementById('map-filter');
  bar.classList.toggle('show');
});

document.querySelectorAll('.filt-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const status = btn.dataset.status;
    if(status === 'all'){
      const allOn = activeFilters.has('all');
      if(allOn){
        activeFilters.clear();
        document.querySelectorAll('.filt-btn').forEach(b=>b.classList.remove('active'));
      } else {
        activeFilters = new Set(['all','Dropped Lit','No Answer','Spoke to Owner','Interested','Appointment']);
        document.querySelectorAll('.filt-btn').forEach(b=>b.classList.add('active'));
      }
    } else {
      if(activeFilters.has(status)){ activeFilters.delete(status); btn.classList.remove('active'); }
      else { activeFilters.add(status); btn.classList.add('active'); }
      // Update "all" state
      const allStatuses = ['Dropped Lit','No Answer','Spoke to Owner','Interested','Appointment'];
      if(allStatuses.every(s=>activeFilters.has(s))){ activeFilters.add('all'); document.querySelector('.filt-btn[data-status="all"]').classList.add('active'); }
      else { activeFilters.delete('all'); document.querySelector('.filt-btn[data-status="all"]').classList.remove('active'); }
    }
    applyFilter();
  });
});

function applyFilter(){
  allPinMarkers.forEach((marker, idx) => {
    const pin = [...pins, ...importedPins][idx];
    if(!pin) return;
    const status = pin.status || 'Dropped Lit';
    const visible = activeFilters.has('all') || activeFilters.has(status);
    if(visible){ if(!map.hasLayer(marker)) marker.addTo(map); }
    else { if(map.hasLayer(marker)) map.removeLayer(marker); }
  });
}

// ── Auth ──────────────────────────────────────────────────────────
function showAuthScreen(){ document.getElementById('auth-screen').classList.remove('hidden'); }
function hideAuthScreen(){ document.getElementById('auth-screen').classList.add('hidden'); }

function setUser(token, user){
  authToken = token;
  currentUser = user;
  localStorage.setItem('ct_token', token);
  localStorage.setItem('ct_user', JSON.stringify(user));
  const badge = document.getElementById('user-name-badge');
  if(badge) badge.textContent = user.name;
  hideAuthScreen();
}


// Tab switching
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('login-form').style.display = tab.dataset.auth === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab.dataset.auth === 'register' ? 'block' : 'none';
    document.getElementById('forgot-link').style.display = tab.dataset.auth === 'login' ? 'block' : 'none';
    document.getElementById('auth-error').textContent = '';
  });
});

// Login
document.getElementById('login-btn').addEventListener('click', async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('auth-error');
  errEl.textContent = '';
  if(!email || !password){ errEl.textContent = 'Please fill in all fields'; return; }
  document.getElementById('login-btn').textContent = 'Logging in…';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(!res.ok){ errEl.textContent = data.error || 'Login failed'; }
    else { setUser(data.token, data.user); sessions=[]; pins=[]; load(); }
  } catch(e) { errEl.textContent = 'Network error — try again'; }
  document.getElementById('login-btn').textContent = 'Log In';
});

// Enter key on login and register forms
['login-email','login-password'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if(e.key === 'Enter') document.getElementById('login-btn').click();
  });
});
['reg-name','reg-email','reg-password'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if(e.key === 'Enter') document.getElementById('register-btn').click();
  });
});

// Register
document.getElementById('register-btn').addEventListener('click', async () => {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('auth-error');
  errEl.textContent = '';
  if(!name || !email || !password){ errEl.textContent = 'Please fill in all fields'; return; }
  document.getElementById('register-btn').textContent = 'Creating account…';
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if(!res.ok){ errEl.textContent = data.error || 'Registration failed'; }
    else { setUser(data.token, data.user); sessions=[]; pins=[]; load(); }
  } catch(e) { errEl.textContent = 'Network error — try again'; }
  document.getElementById('register-btn').textContent = 'Create Account';
});

// Check if already logged in on startup
async function initAuth(){
  if(authToken && currentUser){
    try {
      const res = await fetch('/api/auth/me', { headers: authHeaders() });
      if(res.ok){
        const user = await res.json();
        setUser(authToken, user);
        load();
        return;
      }
    } catch(e) {}
    // Token invalid — clear and show login
    localStorage.removeItem('ct_token');
    localStorage.removeItem('ct_user');
    authToken = null; currentUser = null;
  }
  showAuthScreen();
}

// ── Pin Drop Mode ────────────────────────────────────────────────
let dropMode = false;

function enterDropMode(){
  dropMode = true;
  document.getElementById('pin-crosshair').classList.add('active');
  document.getElementById('pin-confirm-bar').classList.add('active');
  document.getElementById('pinBtn').style.background = '#f5a623';
  document.getElementById('pinBtn').style.color = '#000';
  document.getElementById('pinBtn').textContent = '📍';
  followMode = false; // pause auto-follow so map stays still
  toast('Drag map to the house, then tap Log', 3500);
}

function exitDropMode(){
  dropMode = false;
  document.getElementById('pin-crosshair').classList.remove('active');
  document.getElementById('pin-confirm-bar').classList.remove('active');
  document.getElementById('pinBtn').style.background = '';
  document.getElementById('pinBtn').style.color = '';
  document.getElementById('pinBtn').textContent = '📍';
  followMode = true;
  showFollowBtn(false);
}

document.getElementById('pinBtn').addEventListener('click',()=>{
  if(!tracking) return;
  if(dropMode){ exitDropMode(); return; }
  enterDropMode();
});

document.getElementById('pin-cancel-btn').addEventListener('click',()=>{
  exitDropMode();
  toast('Pin cancelled');
});

document.getElementById('pin-confirm-btn').addEventListener('click',()=>{
  const center = map.getCenter();
  exitDropMode();
  openSheet({ lat: center.lat, lng: center.lng }, null);
});

// ── Photo ─────────────────────────────────────────────────────────
document.getElementById('photo-input-camera').addEventListener('change', function(){ handlePhotoFile(this); });
document.getElementById('photo-input').addEventListener('change',function(){
  handlePhotoFile(this);
});

function handlePhotoFile(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      const MAX=1000;let w=img.width,h=img.height;
      if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      pendingPhoto=canvas.toDataURL('image/jpeg',0.75);
      document.getElementById('photo-preview').src=pendingPhoto;
      document.getElementById('photo-preview-wrap').style.display='block';
      document.getElementById('photo-btn').style.display='none';
      document.getElementById('photo-btn-camera').style.display='none';
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

document.getElementById('photo-remove').addEventListener('click',()=>{
  pendingPhoto=null;
  document.getElementById('photo-preview-wrap').style.display='none';
  document.getElementById('photo-btn').style.display='flex';
  document.getElementById('photo-btn-camera').style.display='flex';
  document.getElementById('photo-input').value='';
  document.getElementById('photo-input-camera').value='';
});

// ── Pin sheet — handles both NEW and EDIT ─────────────────────────
// latlng: {lat,lng}  existingPin: null = new, object = editing
function openSheet(latlng, existingPin){
  editingPin = existingPin;
  pendingLL  = latlng;
  pendingPhoto = null;

  // Reset photo UI
  document.getElementById('photo-preview-wrap').style.display='none';
  document.getElementById('photo-btn').style.display='flex';
  document.getElementById('photo-btn-camera').style.display='flex';
  document.getElementById('photo-input').value='';
  document.getElementById('photo-input-camera').value='';

  if(existingPin){
    // Edit mode — pre-fill everything
    document.getElementById('sheet-title').textContent='✏️ Edit Stop';
    document.getElementById('delete-pin-btn').classList.add('show');
    document.getElementById('saddr-input').value=existingPin.address||'';
    document.getElementById('interaction-date-input').value=existingPin.interaction_date||new Date().toISOString().split('T')[0];
    document.getElementById('owner-name-input').value=existingPin.owner_name||'';
    document.getElementById('phone-input').value=existingPin.phone||'';
    document.getElementById('followup-input').value=existingPin.followup_date||'';
    document.getElementById('notes').value=existingPin.notes||'';
    selStatus=existingPin.status||'';
    document.querySelectorAll('.tag').forEach(t=>{
      t.classList.toggle('sel',t.dataset.s===selStatus);
    });
    if(existingPin.photo){
      pendingPhoto=existingPin.photo;
      document.getElementById('photo-preview').src=existingPin.photo;
      document.getElementById('photo-preview-wrap').style.display='block';
      document.getElementById('photo-btn').style.display='none';
    }
  } else {
    // New pin mode
    document.getElementById('sheet-title').textContent='📍 Log this stop';
    document.getElementById('delete-pin-btn').classList.remove('show');
    document.getElementById('saddr-input').value='';
    document.getElementById('interaction-date-input').value=new Date().toISOString().split('T')[0];
    document.getElementById('owner-name-input').value='';
    document.getElementById('phone-input').value='';
    document.getElementById('followup-input').value='';
    document.getElementById('notes').value='';
    selStatus='';
    document.querySelectorAll('.tag').forEach(t=>t.classList.remove('sel'));
    // Auto-fill address
    document.getElementById('saddr-input').value='Getting address…';
    reverseGeocode(latlng.lat,latlng.lng).then(a=>{
      document.getElementById('saddr-input').value=a==='Unknown location'?'':a;
    });
  }

  document.getElementById('sheet-bg').classList.add('open');
}

document.querySelectorAll('.tag').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.tag').forEach(x=>x.classList.remove('sel'));
    t.classList.add('sel');selStatus=t.dataset.s;
  });
});

document.getElementById('bcancel').addEventListener('click',()=>{
  document.getElementById('sheet-bg').classList.remove('open');
  pendingLL=null;pendingPhoto=null;editingPin=null;
});

document.getElementById('sheet-bg').addEventListener('click',e=>{
  if(e.target===document.getElementById('sheet-bg')){
    document.getElementById('sheet-bg').classList.remove('open');
    pendingLL=null;pendingPhoto=null;editingPin=null;
  }
});

document.getElementById('bsave').addEventListener('click',async()=>{
  const rawAddr=document.getElementById('saddr-input').value.trim();
  const addr=(rawAddr==='Getting address…'||rawAddr==='Getting address...')?'':rawAddr;
  const notes=document.getElementById('notes').value.trim();
  const status=selStatus||'Dropped Lit';
  const photo=pendingPhoto||null;

  if(editingPin){
    // UPDATE existing pin
    const updated={...editingPin,address:addr,status,notes,photo,owner_name,phone,followup_date,interaction_date};
    try{
      await api.patch('/api/pins/'+editingPin.id,{address:addr,status,notes,photo,owner_name,phone,followup_date,interaction_date});
      // Update local array
      const idx=pins.findIndex(p=>p.id===editingPin.id);
      if(idx>=0)pins[idx]=updated;
      // Redraw all pins on map
      renderAll();
      // Refresh history if open
      if(document.getElementById('hist-panel').classList.contains('open'))renderHistTab(histTab);
      toast('Pin updated ✓');
    }catch(e){toast('Could not update',3000);}
  } else {
    // CREATE new pin
    if(!pendingLL)return;
    const pin={
      id:Date.now()+'',lat:pendingLL.lat,lng:pendingLL.lng,
      address:addr,status,notes,photo,owner_name,phone,followup_date,interaction_date,
      sessionId:curSession?curSession.id:null
    };
    try{
      const saved=await api.post('/api/pins',pin);
      pins.push(saved);drawPin(saved);
      toast('Pin saved ✓');
    }catch(e){toast('Could not save',3000);}
  }

  document.getElementById('sheet-bg').classList.remove('open');
  pendingLL=null;pendingPhoto=null;editingPin=null;
});

// Delete pin
document.getElementById('delete-pin-btn').addEventListener('click',async()=>{
  if(!editingPin)return;
  showConfirm('Delete this pin?', async ()=>{
    try{
      const pinId = editingPin.id;
      await api.del('/api/pins/'+pinId);
      pins=pins.filter(p=>p.id!==pinId);
      renderAll();
      if(document.getElementById('hist-panel').classList.contains('open'))renderHistTab(histTab);
      toast('Pin deleted');
    }catch(e){ toast('Could not delete',3000); }
    document.getElementById('sheet-bg').classList.remove('open');
    pendingLL=null; pendingPhoto=null; editingPin=null;
  }, 'Delete');
});

// ── History ───────────────────────────────────────────────────────
document.getElementById('historyBtn').addEventListener('click',()=>{
  document.getElementById('hist-panel').classList.add('open');renderHistTab(histTab);
});
document.getElementById('hist-close').addEventListener('click',()=>{
  document.getElementById('hist-panel').classList.remove('open');
  document.getElementById('coverage-add-btn').classList.remove('show');
  const sw = document.getElementById('storms-wrap'); if(sw) sw.style.display='none';
});
document.querySelectorAll('.htab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.htab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');histTab=tab.dataset.tab;renderHistTab(histTab);
  });
});

function renderHistTab(tab){
  const body=document.getElementById('hist-body');
  const cov=document.getElementById('coverage-wrap');
  const stormsWrap = document.getElementById('storms-wrap');

  if(tab==='storms'){
    body.style.display='none';
    cov.classList.remove('active');
    document.getElementById('coverage-add-btn').classList.remove('show');
    stormsWrap.style.display='flex';
    setTimeout(renderStormsTab, 50);
    return;
  }

  stormsWrap.style.display='none';

  if(tab==='coverage'){
    body.style.display='none';cov.classList.add('active');document.getElementById('coverage-add-btn').classList.add('show');setTimeout(()=>{ initCoverageMap(); },50);return;
  }
  body.style.display='block';cov.classList.remove('active');document.getElementById('coverage-add-btn').classList.remove('show');

  if(tab==='routes'){
    if(!sessions.length){body.innerHTML=`<div class="empty-state"><div class="empty-icon">🗺️</div><div class="empty-text">No routes yet.<br>Start tracking to record your first run.</div></div>`;return;}
    body.innerHTML='';
    [...sessions].reverse().forEach((s,ri)=>{
      const idx=sessions.length-1-ri;
      const d=new Date(s.started_at);
      const coords=s.coords||[];
      const pc=pins.filter(p=>p.session_id===s.id||p.sessionId===s.id).length;
      const card=document.createElement('div');card.className='route-card';
      card.innerHTML=`<div class="route-swatch" style="background:${s.color||sCol(idx)}"></div><div class="route-info"><div class="route-date">${d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div><div class="route-meta">${d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})} · ${coords.length} pts · ${pc} pin${pc!==1?'s':''}</div></div><button class="shr-btn" style="background:transparent;border:1px solid #f5a623;color:#f5a623;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:800;cursor:pointer;flex-shrink:0;margin-left:4px">Share</button>`;
      card.querySelector('.shr-btn').addEventListener('click',e=>{ e.stopPropagation(); shareSession(s.id); });
      card.addEventListener('click',()=>{
        document.getElementById('hist-panel').classList.remove('open');
        if(coords.length>1)map.fitBounds(L.latLngBounds(coords.map(c=>[c.lat,c.lng])),{padding:[40,40]});
      });
      body.appendChild(card);
    });

    // Imported/shared routes from partners
    importedRoutes.forEach((r,i)=>{
      const d = new Date(r.started_at||Date.now());
      const color = SHARED_COLORS[i % SHARED_COLORS.length];
      const coords = r.coords||[];
      const rc = document.createElement('div'); rc.className='route-card';
      rc.style.borderColor = '#1c2a2a';
      rc.innerHTML=`
        <div class="route-swatch" style="background:${color};opacity:.7"></div>
        <div class="route-info">
          <div class="route-date">${d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
          <div class="route-meta">${d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})} · ${coords.length} pts</div>
          <div style="font-size:11px;color:${color};font-weight:700;margin-top:3px">📤 Shared by ${r.owner_name||'Partner'}</div>
        </div>
        <button class="remove-shared-btn" data-sid="${r.session_id}" style="background:none;border:none;color:#444;font-size:20px;cursor:pointer;padding:4px 8px;flex-shrink:0" title="Remove">✕</button>`;
      rc.querySelector('.remove-shared-btn').addEventListener('click', async e=>{
        e.stopPropagation();
        showConfirm('Remove this shared route from your coverage?', async ()=>{
          try{
            await api.del('/api/coverage/shared/'+r.session_id);
            await load(); renderHistTab('routes'); initCoverageMap();
            toast('Shared route removed');
          }catch(ex){ toast('Could not remove',3000); }
        });
      });
      rc.addEventListener('click',()=>{
        document.getElementById('hist-panel').classList.remove('open');
        if(coords.length>1) map.fitBounds(L.latLngBounds(coords.map(c=>[c.lat,c.lng])),{padding:[40,40]});
      });
      body.appendChild(rc);
    });
  }

  if(tab==='pins'){
    const today = new Date().toISOString().split('T')[0];
    const dueToday = pins.filter(p=>p.followup_date && p.followup_date <= today);
    const allPins = [...pins, ...importedPins.map(p=>({...p, _shared:true}))];
    if(!allPins.length){body.innerHTML=`<div class="empty-state"><div class="empty-icon">📍</div><div class="empty-text">No touch points yet.<br>Tap 📍 or tap the map while tracking to log a stop.</div></div>`;return;}
    body.innerHTML='';
    // Due today / overdue section
    if(dueToday.length){
      const hdr = document.createElement('div'); hdr.className='due-today-header';
      hdr.innerHTML=`🔴 Follow-up Due (${dueToday.length})`;
      body.appendChild(hdr);
      dueToday.sort((a,b)=>a.followup_date.localeCompare(b.followup_date)).forEach(pin=>{
        const c2=STATUS_COLORS[pin.status]||'#f5a623';
        const d2=document.createElement('div');d2.className='pin-card';d2.style.borderColor='#e03b3b44';
        d2.innerHTML=`<div style="display:flex;gap:12px;align-items:flex-start"><div style="flex:1;min-width:0"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px"><div class="pin-addr">${pin.address||'Unnamed stop'}</div><button class="pin-edit-btn" style="flex-shrink:0;min-width:44px;min-height:44px">✏️</button></div><span class="pin-badge" style="background:${c2}22;color:${c2};border:1px solid ${c2}44;display:inline-block;margin-bottom:4px">${pin.status||'–'}</span>${pin.owner_name?`<div style="font-size:12px;color:#888">👤 ${pin.owner_name}</div>`:''} ${pin.phone?`<div style="font-size:12px;color:#888">📞 ${pin.phone}</div>`:''} ${followupBadge(pin.followup_date)}</div></div>`;
        d2.querySelector('.pin-edit-btn').addEventListener('click',e=>{e.stopPropagation();document.getElementById('hist-panel').classList.remove('open');openSheet({lat:pin.lat,lng:pin.lng},pin);});
        d2.addEventListener('click',e=>{if(e.target.classList.contains('pin-edit-btn'))return;document.getElementById('hist-panel').classList.remove('open');map.setView([pin.lat,pin.lng],18);});
        body.appendChild(d2);
      });
      const sep=document.createElement('div');sep.style.cssText='height:1px;background:#1c1c1c;margin:12px 0 14px';body.appendChild(sep);
    }
    [...allPins].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).forEach(pin=>{
      const c = STATUS_COLORS[pin.status]||'#f5a623';
      const d = new Date(pin.created_at||Date.now());
      const isShared = !!pin._shared;
      const card = document.createElement('div'); card.className='pin-card';
      card.innerHTML=`
        <div style="display:flex;gap:12px;align-items:flex-start">
          ${pin.photo ? `<img class="pin-thumb" src="${pin.photo}" alt="roof"/>` : ''}
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:5px">
              <div class="pin-addr">${pin.address||'Unnamed stop'}</div>
              ${isShared ? '' : `<button class="pin-edit-btn" data-id="${pin.id}" style="flex-shrink:0;min-width:44px;min-height:44px">✏️</button>`}
            </div>
            <span class="pin-badge" style="background:${c}22;color:${c};border:1px solid ${c}44;display:inline-block;margin-bottom:6px">${pin.status||'–'}</span>
            ${pin.notes ? `<div class="pin-notes">${pin.notes}</div>` : ''}
            ${pin.owner_name && !isShared ? `<div style="font-size:12px;color:#888;margin-top:3px">👤 ${pin.owner_name}</div>` : ''}
            ${pin.phone && !isShared ? `<div style="font-size:12px;color:#888">📞 ${pin.phone}</div>` : ''}
            ${pin.followup_date && !isShared ? followupBadge(pin.followup_date) : ''}
            ${isShared ? `<div style="font-size:11px;color:#00c9a7;font-weight:700;margin-top:4px">📤 Shared by ${pin.owner_name||'Partner'}</div>` : ''}
            <div class="pin-time" style="margin-top:6px">${pin.interaction_date ? '📅 '+formatDate(pin.interaction_date) : d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
          </div>
        </div>
      `;
      card.addEventListener('click',e=>{
        if(e.target.classList.contains('pin-edit-btn')) return;
        document.getElementById('hist-panel').classList.remove('open');
        map.setView([pin.lat,pin.lng],18);
      });
      if(!isShared){
        const editBtn = card.querySelector('.pin-edit-btn');
        if(editBtn) editBtn.addEventListener('click',e=>{
          e.stopPropagation();
          document.getElementById('hist-panel').classList.remove('open');
          openSheet({lat:pin.lat,lng:pin.lng},pin);
        });
      }
      body.appendChild(card);
    });
  }
}

function initCoverageMap(){
  // Size the container explicitly
  const header = document.getElementById('hist-header');
  const tabs   = document.getElementById('hist-tabs');
  const wrap   = document.getElementById('coverage-wrap');
  const h = window.innerHeight - (header ? header.offsetHeight : 0) - (tabs ? tabs.offsetHeight : 0);
  wrap.style.height = h + 'px';
  wrap.style.width  = '100%';

  if(!coverageMapInit){
    coverageMap = L.map('coverage-map', {zoomControl:true, attributionControl:false});
    addSatTiles(coverageMap);
    coverageMapInit = true;
  }

  // Clear old layers
  coverageMap.eachLayer(l=>{ if(l instanceof L.Polyline || l instanceof L.Marker) coverageMap.removeLayer(l); });

  const allCoords = [];

  // My own routes — colored and faded by age
  const now = Date.now();
  const cutoff = new Date(now - covDays * 86400000).toISOString();
  sessions
    .filter(s => !covDays || covDays >= 9999 || (s.started_at >= cutoff))
    .forEach(s=>{
      if(s.coords && s.coords.length > 1){
        const lls = s.coords.map(c=>[c.lat,c.lng]);
        const ageDays = (now - new Date(s.started_at)) / 86400000;
        // Color: fresh=orange, medium=yellow, old=grey
        let color, opacity;
        if(ageDays <= 30)      { color='#f5a623'; opacity=.95; }
        else if(ageDays <= 90) { color='#a87a1a'; opacity=.6; }
        else                   { color='#555'; opacity=.4; }
        L.polyline(lls, {color, weight:4, opacity}).addTo(coverageMap);
        lls.forEach(ll=>allCoords.push(ll));
      }
    });

  // Age legend
  const existingLegend = coverageMap.getContainer().querySelector('.cov-age-legend');
  if(!existingLegend){
    const legendDiv = document.createElement('div');
    legendDiv.className='cov-age-legend';
    legendDiv.style.cssText='position:absolute;bottom:40px;right:12px;z-index:1000;background:rgba(0,0,0,.82);border-radius:10px;padding:8px 12px;font-size:11px;border:1px solid rgba(255,255,255,.1)';
    legendDiv.innerHTML=`
      <div style="font-size:10px;color:#888;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Route Age</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><div style="width:24px;height:3px;background:#f5a623;border-radius:2px"></div><span style="color:#ccc">0–30 days</span></div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><div style="width:24px;height:3px;background:#a87a1a;border-radius:2px"></div><span style="color:#ccc">30–90 days</span></div>
      <div style="display:flex;align-items:center;gap:6px"><div style="width:24px;height:3px;background:#555;border-radius:2px"></div><span style="color:#ccc">90+ days</span></div>
    `;
    coverageMap.getContainer().appendChild(legendDiv);
  }

  // Shared/imported routes — dashed in different colors
  importedRoutes.forEach((r,i)=>{
    if(r.coords && r.coords.length > 1){
      const color = SHARED_COLORS[i % SHARED_COLORS.length];
      const lls = r.coords.map(c=>[c.lat,c.lng]);
      L.polyline(lls, {color, weight:4, opacity:.8, dashArray:'8,4'}).addTo(coverageMap);
      lls.forEach(ll=>allCoords.push(ll));

    }
  });

  // My pins
  pins.forEach(pin=>{
    const c = STATUS_COLORS[pin.status]||'#f5a623';
    let iconHtml, iconSize, iconAnchor;
    if(pin.photo){
      iconHtml=`<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none"><div style="width:44px;height:44px;border-radius:50%;border:3px solid ${c};background:url('${pin.photo}') center/cover;box-shadow:0 3px 10px rgba(0,0,0,.7)"></div><div style="width:3px;height:8px;background:${c};margin-top:-1px"></div><div style="width:7px;height:7px;border-radius:50%;background:${c};margin-top:-2px"></div></div>`;
      iconSize=[44,62]; iconAnchor=[22,62];
    } else {
      iconHtml=`<div class="pin-drop" style="background:${c}"></div>`;
      iconSize=[14,14]; iconAnchor=[7,14];
    }
    L.marker([pin.lat,pin.lng], {icon:L.divIcon({html:iconHtml,iconSize,iconAnchor,className:''})})
      .on('click',()=>{ document.getElementById('hist-panel').classList.remove('open'); setTimeout(()=>openDetail(pin.id),200); })
      .addTo(coverageMap);
  });

  if(allCoords.length > 0) coverageMap.fitBounds(L.latLngBounds(allCoords),{padding:[40,40]});
  else coverageMap.setView([38.85,-76.53],13);

  setTimeout(()=>coverageMap.invalidateSize(), 150);
}


async function reverseGeocode(lat,lng){
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,{headers:{'Accept-Language':'en'}});
    const d=await r.json();const a=d.address||{};
    const parts=[a.house_number&&a.road?`${a.house_number} ${a.road}`:a.road,a.city||a.town||a.village||a.county].filter(Boolean);
    return parts.join(', ')||'Unknown location';
  }catch(e){return 'Unknown location';}
}

// Follow button
function showFollowBtn(show){
  document.getElementById('follow-btn').classList.toggle('show', show);
}
document.getElementById('follow-btn').addEventListener('click',()=>{
  followMode=true;
  showFollowBtn(false);
  if(youMarker){
    const ll=youMarker.getLatLng();
    map.setView([ll.lat,ll.lng],map.getZoom(),{animate:true});
  }
});

initAuth();
</script>
</body>
</html>
