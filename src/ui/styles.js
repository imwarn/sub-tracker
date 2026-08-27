/**
 * Inline CSS for the single-page app.
 */

export function getStyles() {
  return `    * { box-sizing: border-box; }
    body {
      background: linear-gradient(-45deg, #0f172a, #1e3a5f, #164e63, #1e293b);
      background-size: 400% 400%;
      animation: gradient 20s ease infinite;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    @keyframes gradient { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
    .glass { background:rgba(255,255,255,0.08); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.12); }
    .glass-card { background:rgba(255,255,255,0.1); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.15); transition:transform 0.2s,box-shadow 0.2s; }
    .glass-card:hover { transform:translateY(-3px); box-shadow:0 12px 32px rgba(0,0,0,0.25); }
    .glass-input { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#f1f5f9; }
    .glass-input::placeholder { color:rgba(255,255,255,0.4); }
    .glass-input:focus { outline:none; border-color:#38bdf8; box-shadow:0 0 0 2px rgba(56,189,248,0.2); }
    .btn-primary { background:linear-gradient(135deg,#0ea5e9,#2563eb); transition:all 0.2s; }
    .btn-primary:hover { filter:brightness(1.1); transform:translateY(-1px); }
    .status-active { color:#4ade80; } .status-warning { color:#fbbf24; }
    .status-danger { color:#f87171; } .status-expired { color:#ef4444; }
    .modal-overlay { background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); }
    .toast-container { position:fixed; top:1rem; left:50%; transform:translateX(-50%); z-index:99999; display:flex; flex-direction:column; gap:0.5rem; pointer-events:none; }
    .toast { pointer-events:auto; padding:0.75rem 1.25rem; border-radius:0.75rem; font-size:0.875rem; font-weight:500; color:#fff; backdrop-filter:blur(12px); animation:toastIn 0.3s ease; max-width:24rem; text-align:center; box-shadow:0 8px 24px rgba(0,0,0,0.3); }
    .toast-success { background:rgba(16,185,129,0.92); }
    .toast-error { background:rgba(239,68,68,0.92); }
    .toast-info { background:rgba(56,189,248,0.92); }
    @keyframes toastIn { from{opacity:0;transform:translateY(-1rem)} to{opacity:1;transform:translateY(0)} }
    @keyframes toastOut { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-1rem)} }
    .fade-in { animation:fadeIn 0.25s ease; }
    @keyframes fadeIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
    .tab-active { background:rgba(56,189,248,0.2); color:#38bdf8; border-color:#38bdf8; }
    ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:3px; }
    .list-row { transition:background 0.15s; } .list-row:hover { background:rgba(255,255,255,0.05); }
    .cal-day { min-height:80px; } .cal-day:hover { background:rgba(56,189,248,0.08); }
    .cal-event { font-size:0.65rem; padding:1px 4px; border-radius:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    select.glass-input option { background:#1e293b; color:#f1f5f9; }
    .fab-btn { box-shadow: 0 8px 20px rgba(14,165,233,0.4); }
    .fab-btn:active { transform: scale(0.95); }
    .tag-badge { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:0.75rem; padding:0.35rem 0.75rem; display:inline-flex; align-items:center; gap:0.5rem; font-size:0.8125rem; }
    .tag-badge:hover { border-color:rgba(56,189,248,0.4); }
    .custom-dropdown-list { max-height:220px; overflow-y:auto; z-index:60; background:#0f172a; border:1px solid rgba(255,255,255,0.15); box-shadow:0 12px 32px rgba(0,0,0,0.5); }
    .custom-dropdown-item { padding:0.6rem 0.85rem; cursor:pointer; transition:background 0.15s; display:flex; align-items:center; justify-content:space-between; }
    .custom-dropdown-item:hover, .custom-dropdown-item.active { background:rgba(56,189,248,0.18); color:#38bdf8; }
    /* Mobile responsive overrides */
    @media (max-width: 639px) {
      .cal-day { min-height:52px; padding:2px; }
      .cal-event { font-size:0.55rem; padding:0 2px; border-radius:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; display:block; }
      .glass-card { padding:14px !important; }
      .glass-card .btn-touch { min-height:36px; min-width:36px; }
      /* Prevent iOS zoom on input focus (font < 16px triggers zoom) */
      input, select, textarea { font-size: 16px !important; }
      /* Safe area insets for notched devices */
      body { padding-bottom: calc(env(safe-area-inset-bottom) + 1rem); }
    }
`;
}
