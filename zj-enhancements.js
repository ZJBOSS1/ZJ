/**
 * zj-enhancements.js — Appearance panel + optional Supabase cloud backup.
 *
 * WHAT CHANGED (vs. the file in hand):
 *   • Deleted `zj_theme_preferences` and its accent selector entirely. The
 *     panel now reads/writes the main app's `zj_theme` and `zj_mode` keys and
 *     applies changes by toggling `data-theme` / `data-mode` on <html> — the
 *     exact mechanism the main theme dialog uses. One theme system, not two.
 *   • Upload and Restore are whitelisted to the 11 specified keys. `zj_images`
 *     (base64 blobs) never leaves the device. Restore validates array-typed
 *     keys before writing.
 *   • `getClient()` no longer calls `saveConfig()` unconditionally. If the
 *     user left the URL/key fields empty, the cached config is used; if
 *     nothing is cached, it throws a clear "Configure Supabase first" error.
 *   • Last-backup age and total localStorage size are shown in the panel.
 *     Warns above 3 MB.
 *   • All Supabase operations have a 20s AbortSignal-style timeout. Loading
 *     state disables buttons during network calls.
 *   • Panel closes on Escape. Buttons route through data-action delegation.
 *
 * CROSS-MODULE CONTRACT (Phase 15 — main.js must add these listeners):
 *   window.addEventListener('zj:theme-change', (e) => {
 *     if (e.detail.theme) setTheme(e.detail.theme, false);
 *     if (e.detail.mode)  setMode(e.detail.mode, false);
 *   });
 *   window.addEventListener('zj:sync', (e) => {
 *     if (e.detail.key === 'theme') setTheme(e.detail.value, false);
 *     if (e.detail.key === 'mode')  setMode(e.detail.value, false);
 *   });
 * The `false` arg means "don't re-save" — App.* is already correct.
 *
 * KNOWN COSMETIC ISSUE (not fixed here, pre-existing): the #zje-open button
 * shares `bottom:20px` with the (rarely visible) PWA install button. Leaving
 * it alone — out of scope for this pass.
 */
(() => {
  "use strict";

  const CONFIG_KEY      = 'zj_cloud_config';
  const ENHANCEMENTS_KEY = 'zj_enhancements'; // was part of zj_theme_preferences
  const BROADCAST_CHANNEL = 'zj-os';
  const CLOUD_TIMEOUT_MS = 20000;
  const STORAGE_WARN_BYTES = 3 * 1024 * 1024;

  const THEMES = [
    ['gold','Gold'], ['blue','Blue'], ['teal','Teal'], ['white','White'],
    ['purple','Purple'], ['rose','Rose'], ['emerald','Emerald'], ['amber','Amber']
  ];

  const UPLOAD_WHITELIST = [
    'zj_notes','zj_todos','zj_habits','zj_bookmarks','zj_notionPages',
    'zj_chats','zj_calcLog','zj_alarms','zj_cities','zj_recentColors','zj_activeCities'
  ];
  const ARRAY_KEYS = new Set(UPLOAD_WHITELIST); // all current whitelist entries are arrays

  let supabaseClient = null;
  let supabaseClientMeta = null; // { url, key }
  let enhancements = readJSON(ENHANCEMENTS_KEY, { aurora: true, reducedMotion: false });
  let channel = null;
  let busy = false;

  function readJSON(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key) ?? 'null'); return v ?? fallback; }
    catch { return fallback; }
  }
  function readRaw(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.warn('zj-enhancements: write failed for', key, e); return false; }
  }

  // ---------- theme / mode (delegated to main app's keys) -----------------
  function readTheme() { const v = readRaw('zj_theme', 'gold'); return THEMES.some(([k]) => k === v) ? v : 'gold'; }
  function readMode()  { const v = readRaw('zj_mode',  'dark'); return v === 'light' ? 'light' : 'dark'; }

  function applyThemeToDom(theme, mode) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', mode);
  }

  function broadcastChange(key, value) {
    if (channel) {
      try { channel.postMessage({ type: 'sync', key, value, ts: Date.now() }); } catch {}
    }
    // Same-tab notification — BroadcastChannel does not echo to sender.
    window.dispatchEvent(new CustomEvent('zj:theme-change',
      { detail: key === 'theme' ? { theme: value } : { mode: value } }));
  }

  function onThemeSelectChange(theme) {
    if (!THEMES.some(([k]) => k === theme)) return;
    writeJSON('zj_theme', theme);
    applyThemeToDom(theme, readMode());
    broadcastChange('theme', theme);
  }
  function onModeSelectChange(mode) {
    if (mode !== 'light' && mode !== 'dark') return;
    writeJSON('zj_mode', mode);
    applyThemeToDom(readTheme(), mode);
    broadcastChange('mode', mode);
  }

  function onAuroraChange(on) {
    enhancements.aurora = !!on;
    writeJSON(ENHANCEMENTS_KEY, enhancements);
    document.documentElement.classList.toggle('zje-no-aurora', !enhancements.aurora);
  }
  function onReducedMotionChange(on) {
    enhancements.reducedMotion = !!on;
    writeJSON(ENHANCEMENTS_KEY, enhancements);
    document.documentElement.classList.toggle('zje-reduced-motion', enhancements.reducedMotion);
  }

  // ---------- storage size -------------------------------------------------
  function storageBytes() {
    let bytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        const val = localStorage.getItem(key) || '';
        bytes += (key.length + val.length) * 2; // UTF-16 code units
      }
    } catch {}
    return bytes;
  }
  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // ---------- Supabase helpers --------------------------------------------
  function withTimeout(promise, ms, label) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + ' timed out after ' + (ms / 1000) + 's')), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  function getConfigFromInputs() {
    return {
      url: (document.querySelector('#zje-supabase-url')?.value || '').trim(),
      key: (document.querySelector('#zje-supabase-key')?.value || '').trim()
    };
  }

  function validateAndSaveConfig(cfg) {
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url)) {
      throw new Error('Enter a valid Supabase project URL first.');
    }
    if (!cfg.key) throw new Error('Enter your Supabase public anon/publishable key.');
    const cleaned = { url: cfg.url.replace(/\/+$/, ''), key: cfg.key };
    writeJSON(CONFIG_KEY, cleaned);
    return cleaned;
  }

  async function loadSupabaseSdk() {
    if (window.supabase?.createClient) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Supabase library failed to load. Check your connection.'));
      document.head.appendChild(script);
    });
  }

  /**
   * Fixed: no unconditional saveConfig(). If inputs are both filled, use
   * them and persist. Otherwise fall back to cached config. If nothing is
   * configured, either return null (requireConfigured=false) or throw a
   * clear error (requireConfigured=true).
   */
  async function getClient({ requireConfigured = true } = {}) {
    const input = getConfigFromInputs();
    let cfg;
    if (input.url && input.key) {
      cfg = validateAndSaveConfig(input);
    } else {
      cfg = readJSON(CONFIG_KEY, null);
      if (!cfg || !cfg.url || !cfg.key) {
        if (requireConfigured) throw new Error('Configure Supabase URL and public key first.');
        return null;
      }
    }

    await loadSupabaseSdk();

    if (!supabaseClient || !supabaseClientMeta
        || supabaseClientMeta.url !== cfg.url || supabaseClientMeta.key !== cfg.key) {
      supabaseClient = window.supabase.createClient(cfg.url, cfg.key);
      supabaseClientMeta = { url: cfg.url, key: cfg.key };
    }
    return supabaseClient;
  }

  // ---------- styles ------------------------------------------------------
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #zje-background { position:fixed; inset:-20%; z-index:-1; pointer-events:none; opacity:.7;
        filter:blur(65px);
        background:radial-gradient(ellipse at 15% 25%, var(--accent-primary), transparent 38%),
                   radial-gradient(ellipse at 80% 30%, #26c6da55, transparent 35%),
                   radial-gradient(ellipse at 55% 85%, #9b70ff44, transparent 40%);
        animation: zje-aurora 24s ease-in-out infinite alternate; }
      @keyframes zje-aurora { from{transform:translate3d(-2%,-1%,0) scale(1);} to{transform:translate3d(2%,2%,0) scale(1.08);} }
      html.zje-no-aurora #zje-background { display:none; }
      html.zje-reduced-motion *, html.zje-reduced-motion *::before, html.zje-reduced-motion *::after {
        animation-duration:.01ms !important; animation-iteration-count:1 !important;
        scroll-behavior:auto !important; transition-duration:.01ms !important; }
      @media (prefers-reduced-motion: reduce) { #zje-background { animation:none; } }
      #zje-open, #zje-panel { font-family:system-ui, sans-serif; box-sizing:border-box; }
      #zje-open { position:fixed; right:20px; bottom:20px; z-index:99998;
        border:1px solid rgba(255,255,255,.2); border-radius:50px; padding:12px 18px;
        color:var(--text-main,#fff); background:var(--bg-card,#202a40); box-shadow:0 8px 30px rgba(0,0,0,.2);
        cursor:pointer; font-weight:600; }
      #zje-panel { position:fixed; right:20px; bottom:78px; z-index:99999;
        width:min(360px, calc(100vw - 32px)); max-height:min(80vh, 700px); overflow:auto; padding:20px;
        border:1px solid rgba(255,255,255,.2); border-radius:20px; color:var(--text-main,#f1f4ff);
        background:var(--bg-card,#111827ed); box-shadow:0 16px 55px rgba(0,0,0,.35);
        backdrop-filter:blur(22px); }
      #zje-panel[hidden] { display:none; }
      #zje-panel h2 { margin:0 0 14px; font-size:19px; }
      #zje-panel h3 { margin:20px 0 8px; font-size:15px; }
      #zje-panel label { display:block; margin:10px 0 5px; font-size:13px; }
      #zje-panel input:not([type="checkbox"]), #zje-panel select {
        box-sizing:border-box; width:100%; min-height:40px; padding:9px;
        border:1px solid var(--border,#8886); border-radius:9px; color:inherit;
        background:var(--bg-input,transparent); font-family:inherit; }
      #zje-panel input[type="checkbox"] { width:17px; height:17px; accent-color:var(--accent-primary,#6c8cff); }
      #zje-panel button { min-height:38px; margin:5px 5px 0 0; padding:8px 11px; border:0; border-radius:9px;
        color:#fff; background:var(--accent-primary,#6c8cff); cursor:pointer; font-weight:600; font-family:inherit; }
      #zje-panel button[disabled] { opacity:.55; cursor:progress; }
      #zje-panel button:focus-visible, #zje-open:focus-visible,
      #zje-panel input:focus-visible, #zje-panel select:focus-visible {
        outline:3px solid var(--accent-primary,#6c8cff); outline-offset:3px; }
      #zje-status { overflow-wrap:anywhere; font-size:13px; line-height:1.5; margin-top:12px; }
      .zje-meta { display:flex; justify-content:space-between; gap:8px; font-size:12px;
        color:var(--text-muted,#94a7ba); padding:6px 0; border-top:1px solid var(--border,#8884); margin-top:8px; }
      .zje-meta strong { color:var(--text-main,#f1f4ff); font-weight:600; }
      .zje-warn { color:#f59e0b; font-weight:600; }
    `;
    document.head.appendChild(style);
  }

  // ---------- panel markup ------------------------------------------------
  function addPanel() {
    const background = document.createElement('div');
    background.id = 'zje-background';
    background.setAttribute('aria-hidden', 'true');
    document.body.prepend(background);

    const open = document.createElement('button');
    open.id = 'zje-open';
    open.type = 'button';
    open.textContent = '✦ Appearance & Sync';
    open.setAttribute('aria-expanded', 'false');
    open.setAttribute('aria-controls', 'zje-panel');

    const panel = document.createElement('section');
    panel.id = 'zje-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Appearance and cloud sync settings');

    const themeOptions = THEMES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

    panel.innerHTML = `
      <h2>ZJ OS Settings</h2>
      <h3>Appearance</h3>
      <label for="zje-mode-select">Mode</label>
      <select id="zje-mode-select" data-action="change-mode">
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
      <label for="zje-theme-select">Theme</label>
      <select id="zje-theme-select" data-action="change-theme">${themeOptions}</select>
      <label><input id="zje-aurora-toggle" type="checkbox" data-action="change-aurora"> Animated aurora background</label>
      <label><input id="zje-motion-toggle" type="checkbox" data-action="change-motion"> Reduce decorative motion</label>
      <div class="zje-meta">
        <span>Local storage</span>
        <span id="zje-storage-size">—</span>
      </div>

      <h3>Optional Cloud Backup</h3>
      <p style="font-size:13px;line-height:1.5">Connect your own Supabase project to back up ZJ OS data. Cloud backup is manual, not real-time synchronization.</p>
      <label for="zje-supabase-url">Supabase project URL</label>
      <input id="zje-supabase-url" type="url" placeholder="https://your-project.supabase.co">
      <label for="zje-supabase-key">Public anon/publishable key</label>
      <input id="zje-supabase-key" type="password" autocomplete="off" placeholder="Your public project key">
      <label for="zje-email">Account email</label>
      <input id="zje-email" type="email" autocomplete="email">
      <label for="zje-password">Account password</label>
      <input id="zje-password" type="password" autocomplete="current-password">
      <div>
        <button type="button" data-action="save-config">Save config</button>
        <button type="button" data-action="signup">Create account</button>
        <button type="button" data-action="login">Sign in</button>
        <button type="button" data-action="logout">Sign out</button>
      </div>
      <div>
        <button type="button" data-action="upload">Upload backup</button>
        <button type="button" data-action="restore">Restore backup</button>
        <button type="button" data-action="refresh-backup">Refresh</button>
      </div>
      <div class="zje-meta">
        <span>Last backup</span>
        <span id="zje-last-backup">—</span>
      </div>
      <div class="zje-meta">
        <span>Cloud</span>
        <span id="zje-cloud-status">Not configured</span>
      </div>
      <p id="zje-status" role="status" aria-live="polite">Cloud sync is not configured. Your existing local data stays on this device.</p>
      <button type="button" data-action="close" style="margin-top:14px;background:var(--bg-section,#202a40);color:var(--text-main,#fff);">Close</button>
    `;

    document.body.append(open, panel);

    const cfg = readJSON(CONFIG_KEY, null);
    if (cfg && cfg.url) panel.querySelector('#zje-supabase-url').value = cfg.url;
    if (cfg && cfg.key) panel.querySelector('#zje-supabase-key').value = cfg.key;

    panel.querySelector('#zje-mode-select').value  = readMode();
    panel.querySelector('#zje-theme-select').value = readTheme();
    panel.querySelector('#zje-aurora-toggle').checked       = !!enhancements.aurora;
    panel.querySelector('#zje-motion-toggle').checked       = !!enhancements.reducedMotion;

    applyThemeToDom(readTheme(), readMode());
    document.documentElement.classList.toggle('zje-no-aurora', !enhancements.aurora);
    document.documentElement.classList.toggle('zje-reduced-motion', !!enhancements.reducedMotion);

    return { open, panel };
  }

  // ---------- status + meta display ---------------------------------------
  function status(msg) {
    const el = document.querySelector('#zje-status');
    if (el) el.textContent = msg;
  }
  function setBusy(on) {
    busy = !!on;
    document.querySelectorAll('#zje-panel [data-action]').forEach(b => {
      if (b.dataset.action !== 'close' && b.tagName === 'BUTTON') b.disabled = busy;
    });
  }
  function updateStorageInfo() {
    const el = document.querySelector('#zje-storage-size');
    if (!el) return;
    const bytes = storageBytes();
    el.textContent = formatBytes(bytes);
    el.classList.toggle('zje-warn', bytes > STORAGE_WARN_BYTES);
    if (bytes > STORAGE_WARN_BYTES) el.title = 'Approaching the 5 MB localStorage limit. Delete old chats or notes.';
    else el.removeAttribute('title');
  }
  function formatAge(isoString) {
    const t = new Date(isoString).getTime();
    if (!Number.isFinite(t)) return 'Unknown';
    const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (sec < 60) return sec + 's ago';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
    return Math.floor(sec / 86400) + 'd ago';
  }
  function updateCloudStatusText() {
    const el = document.querySelector('#zje-cloud-status');
    if (!el) return;
    const cfg = readJSON(CONFIG_KEY, null);
    if (cfg && cfg.url) {
      const slug = cfg.url.replace(/^https:\/\//, '').replace(/\.supabase\.co\/?$/, '');
      el.textContent = 'Configured · ' + slug;
    } else {
      el.textContent = 'Not configured';
    }
  }

  // ---------- last backup (best-effort, silent failure) -------------------
  async function fetchLastBackupIso() {
    try {
      const client = await getClient({ requireConfigured: false });
      if (!client) return null;
      const auth = await withTimeout(client.auth.getUser(), CLOUD_TIMEOUT_MS, 'Sign-in check');
      if (auth.error || !auth.data?.user) return null;
      const q = client.from('zj_user_backups').select('updated_at').eq('user_id', auth.data.user.id).maybeSingle();
      const { data } = await withTimeout(q, CLOUD_TIMEOUT_MS, 'Backup lookup');
      return data?.updated_at || null;
    } catch { return null; }
  }
  async function refreshBackupInfo() {
    updateCloudStatusText();
    updateStorageInfo();
    const el = document.querySelector('#zje-last-backup');
    if (!el) return;
    if (!readJSON(CONFIG_KEY, null)) { el.textContent = 'Not configured'; return; }
    el.textContent = 'Checking…';
    const iso = await fetchLastBackupIso();
    el.textContent = iso ? formatAge(iso) : 'No backup yet';
  }

  // ---------- cloud actions ----------------------------------------------
  async function runCloud(action) {
    if (busy) return;
    try {
      setBusy(true);
      status('Working…');
      const client = await getClient();

      if (action === 'signup' || action === 'login') {
        const email = document.querySelector('#zje-email').value.trim();
        const password = document.querySelector('#zje-password').value;
        if (!email || !password) throw new Error('Enter your account email and password.');
        const op = action === 'signup'
          ? client.auth.signUp({ email, password })
          : client.auth.signInWithPassword({ email, password });
        const result = await withTimeout(op, CLOUD_TIMEOUT_MS, action === 'signup' ? 'Sign-up' : 'Sign-in');
        if (result.error) throw result.error;
        status(action === 'signup'
          ? 'Account created. Confirm your email if Supabase requires it.'
          : 'Signed in successfully.');
        await refreshBackupInfo();
        return;
      }

      if (action === 'logout') {
        const { error } = await withTimeout(client.auth.signOut(), CLOUD_TIMEOUT_MS, 'Sign-out');
        if (error) throw error;
        status('Signed out.');
        await refreshBackupInfo();
        return;
      }

      const auth = await withTimeout(client.auth.getUser(), CLOUD_TIMEOUT_MS, 'User lookup');
      if (auth.error) throw auth.error;
      if (!auth.data?.user) throw new Error('Sign in before using cloud backup.');
      const userId = auth.data.user.id;

      if (action === 'upload') {
        const payload = {};
        let count = 0;
        for (const key of UPLOAD_WHITELIST) {
          const raw = localStorage.getItem(key);
          if (raw === null) continue;
          try { payload[key] = JSON.parse(raw); }
          catch { payload[key] = raw; }
          count++;
        }
        if (count === 0) throw new Error('No ZJ data to upload.');
        const upsert = client.from('zj_user_backups').upsert(
          { user_id: userId, payload, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
        const { error } = await withTimeout(upsert, CLOUD_TIMEOUT_MS, 'Upload');
        if (error) throw error;
        status('Cloud backup uploaded (' + count + ' categories, ' + formatBytes(storageBytes()) + ' local).');
        await refreshBackupInfo();
        return;
      }

      if (action === 'restore') {
        const q = client.from('zj_user_backups').select('payload, updated_at').eq('user_id', userId).maybeSingle();
        const { data, error } = await withTimeout(q, CLOUD_TIMEOUT_MS, 'Restore fetch');
        if (error) throw error;
        if (!data?.payload) throw new Error('No cloud backup was found.');
        if (!confirm('Restore this backup? Matching local ZJ data will be replaced. Continue?')) {
          status('Restore cancelled.');
          return;
        }
        let restored = 0;
        for (const key of UPLOAD_WHITELIST) {
          if (!(key in data.payload)) continue;
          const value = data.payload[key];
          if (ARRAY_KEYS.has(key) && !Array.isArray(value)) {
            console.warn('zj-enhancements: skipping non-array restore for', key);
            continue;
          }
          try { localStorage.setItem(key, JSON.stringify(value)); restored++; }
          catch (e) { console.warn('zj-enhancements: restore write failed for', key, e); }
        }
        status('Backup restored (' + restored + ' categories). Reloading ZJ OS…');
        setTimeout(() => location.reload(), 900);
      }
    } catch (err) {
      status(err && err.message ? err.message : 'An unexpected error occurred.');
    } finally {
      setBusy(false);
    }
  }

  // ---------- event delegation -------------------------------------------
  function bindPanelEvents(open, panel) {
    open.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      open.setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) refreshBackupInfo();
    });

    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || btn.tagName !== 'BUTTON') return;
      const action = btn.dataset.action;
      if (action === 'close') { panel.hidden = true; open.setAttribute('aria-expanded', 'false'); return; }
      if (action === 'save-config') {
        try {
          const cfg = validateAndSaveConfig(getConfigFromInputs());
          supabaseClient = null; supabaseClientMeta = null;
          status('Cloud configuration saved on this device (' + cfg.url.replace(/^https:\/\//, '').replace(/\.supabase\.co\/?$/, '') + ').');
          updateCloudStatusText();
          refreshBackupInfo();
        } catch (err) { status(err.message); }
        return;
      }
      if (action === 'refresh-backup') { refreshBackupInfo(); return; }
      runCloud(action);
    });

    panel.querySelector('#zje-theme-select').addEventListener('change', e => onThemeSelectChange(e.target.value));
    panel.querySelector('#zje-mode-select').addEventListener('change', e => onModeSelectChange(e.target.value));
    panel.querySelector('#zje-aurora-toggle').addEventListener('change', e => onAuroraChange(e.target.checked));
    panel.querySelector('#zje-motion-toggle').addEventListener('change', e => onReducedMotionChange(e.target.checked));

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || panel.hidden) return;
      panel.hidden = true;
      open.setAttribute('aria-expanded', 'false');
    });
  }

  // ---------- cross-tab + external sync ----------------------------------
  function bindSyncListeners() {
    if (typeof BroadcastChannel === 'undefined') return;
    channel = new BroadcastChannel(BROADCAST_CHANNEL);
    channel.addEventListener('message', (ev) => {
      const msg = ev.data;
      if (!msg || msg.type !== 'sync') return;
      if (msg.key === 'theme') {
        document.documentElement.setAttribute('data-theme', THEMES.some(([k]) => k === msg.value) ? msg.value : 'gold');
        const sel = document.querySelector('#zje-theme-select'); if (sel) sel.value = readTheme();
      } else if (msg.key === 'mode') {
        document.documentElement.setAttribute('data-mode', msg.value === 'light' ? 'light' : 'dark');
        const sel = document.querySelector('#zje-mode-select'); if (sel) sel.value = readMode();
      }
    });
  }

  // ---------- init --------------------------------------------------------
  function init() {
    if (!document.body || document.getElementById('zje-panel')) return;

    addStyles();
    const { open, panel } = addPanel();
    bindPanelEvents(open, panel);
    bindSyncListeners();

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        && !readJSON(ENHANCEMENTS_KEY, null)) {
      enhancements.reducedMotion = true;
      writeJSON(ENHANCEMENTS_KEY, enhancements);
      document.documentElement.classList.add('zje-reduced-motion');
      const tog = document.querySelector('#zje-motion-toggle');
      if (tog) tog.checked = true;
    }

    updateCloudStatusText();
    updateStorageInfo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
