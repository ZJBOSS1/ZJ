
(() => {
  "use strict";

  const CONFIG_KEY = "zj_cloud_config";
  const THEME_KEY = "zj_theme_preferences";
  let supabaseClient = null;

  const defaults = {
    theme: "dark",
    accent: "#6c8cff",
    aurora: true,
    reducedMotion: false
  };

  function readJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  let preferences = {
    ...defaults,
    ...readJSON(THEME_KEY, {})
  };

  function savePreferences() {
    localStorage.setItem(THEME_KEY, JSON.stringify(preferences));
  }

  function applyTheme() {
    const root = document.documentElement;

    root.dataset.zjTheme = preferences.theme;
    root.style.setProperty("--zj-enhancement-accent", preferences.accent);

    root.classList.toggle("zje-no-aurora", !preferences.aurora);
    root.classList.toggle("zje-reduced-motion", preferences.reducedMotion);

    document.querySelector("#zje-theme-select").value =
      preferences.theme;
    document.querySelector("#zje-accent-select").value =
      preferences.accent;
    document.querySelector("#zje-aurora-toggle").checked =
      preferences.aurora;
    document.querySelector("#zje-motion-toggle").checked =
      preferences.reducedMotion;

    savePreferences();
  }

  function addStyles() {
    const style = document.createElement("style");

    style.textContent = `
      #zje-background {
        position: fixed;
        inset: -20%;
        z-index: -1;
        pointer-events: none;
        opacity: .7;
        filter: blur(65px);
        background:
          radial-gradient(ellipse at 15% 25%,
            var(--zj-enhancement-accent), transparent 38%),
          radial-gradient(ellipse at 80% 30%,
            #26c6da55, transparent 35%),
          radial-gradient(ellipse at 55% 85%,
            #9b70ff44, transparent 40%);
        animation: zje-aurora 24s ease-in-out infinite alternate;
      }

      @keyframes zje-aurora {
        from { transform: translate3d(-2%, -1%, 0) scale(1); }
        to   { transform: translate3d(2%, 2%, 0) scale(1.08); }
      }

      html.zje-no-aurora #zje-background {
        display: none;
      }

      html.zje-reduced-motion *,
      html.zje-reduced-motion *::before,
      html.zje-reduced-motion *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: .01ms !important;
      }

      @media (prefers-reduced-motion: reduce) {
        #zje-background { animation: none; }
      }

      #zje-open, #zje-panel {
        font-family: system-ui, sans-serif;
        box-sizing: border-box;
      }

      #zje-open {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 99998;
        border: 1px solid #ffffff35;
        border-radius: 50px;
        padding: 12px 18px;
        color: white;
        background: #202a40;
        box-shadow: 0 8px 30px #0003;
        cursor: pointer;
      }

      #zje-panel {
        position: fixed;
        right: 20px;
        bottom: 78px;
        z-index: 99999;
        width: min(360px, calc(100vw - 32px));
        max-height: min(75vh, 650px);
        overflow: auto;
        padding: 20px;
        border: 1px solid #ffffff30;
        border-radius: 20px;
        color: var(--zje-text);
        background: var(--zje-panel);
        box-shadow: 0 16px 55px #0005;
        backdrop-filter: blur(22px);
      }

      #zje-panel[hidden] { display: none; }

      #zje-panel h2 { margin: 0 0 14px; font-size: 19px; }
      #zje-panel h3 { margin: 20px 0 8px; font-size: 15px; }
      #zje-panel label {
        display: block;
        margin: 10px 0 5px;
        font-size: 13px;
      }

      #zje-panel input:not([type="checkbox"]),
      #zje-panel select {
        box-sizing: border-box;
        width: 100%;
        min-height: 40px;
        padding: 9px;
        border: 1px solid #8886;
        border-radius: 9px;
        color: inherit;
        background: transparent;
      }

      #zje-panel input[type="checkbox"] {
        width: 17px;
        height: 17px;
        accent-color: var(--zj-enhancement-accent);
      }

      #zje-panel button {
        min-height: 38px;
        margin: 5px 5px 0 0;
        padding: 8px 11px;
        border: 0;
        border-radius: 9px;
        color: white;
        background: var(--zj-enhancement-accent);
        cursor: pointer;
      }

      #zje-panel button:focus-visible,
      #zje-open:focus-visible,
      #zje-panel input:focus-visible,
      #zje-panel select:focus-visible {
        outline: 3px solid var(--zj-enhancement-accent);
        outline-offset: 3px;
      }

      #zje-status {
        overflow-wrap: anywhere;
        font-size: 13px;
        line-height: 1.5;
      }

      html[data-zj-theme="dark"] {
        color-scheme: dark;
        --zje-text: #f1f4ff;
        --zje-panel: #111827ed;
      }

      html[data-zj-theme="light"] {
        color-scheme: light;
        --zje-text: #182033;
        --zje-panel: #ffffffed;
      }
    `;

    document.head.appendChild(style);
  }

  function addPanel() {
    const background = document.createElement("div");
    background.id = "zje-background";
    background.setAttribute("aria-hidden", "true");
    document.body.prepend(background);

    const open = document.createElement("button");
    open.id = "zje-open";
    open.type = "button";
    open.textContent = "✦ Appearance & Sync";
    open.setAttribute("aria-expanded", "false");
    open.setAttribute("aria-controls", "zje-panel");

    const panel = document.createElement("section");
    panel.id = "zje-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Appearance and cloud sync settings");

    panel.innerHTML = `
      <h2>ZJ OS Settings</h2>

      <h3>Appearance</h3>

      <label for="zje-theme-select">Theme</label>
      <select id="zje-theme-select">
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>

      <label for="zje-accent-select">Accent color</label>
      <select id="zje-accent-select">
        <option value="#6c8cff">Ocean blue</option>
        <option value="#26c6da">Teal</option>
        <option value="#9b70ff">Purple</option>
        <option value="#36b37e">Emerald</option>
        <option value="#ff8a65">Sunset</option>
        <option value="#ec4899">Rose</option>
      </select>

      <label>
        <input id="zje-aurora-toggle" type="checkbox">
        Animated aurora background
      </label>

      <label>
        <input id="zje-motion-toggle" type="checkbox">
        Reduce decorative motion
      </label>

      <h3>Optional Cloud Backup</h3>

      <p style="font-size:13px;line-height:1.5">
        Connect your own Supabase project to back up ZJ OS data.
        Cloud backup is manual, not real-time synchronization.
      </p>

      <label for="zje-supabase-url">Supabase project URL</label>
      <input id="zje-supabase-url"
        type="url" placeholder="https://your-project.supabase.co">

      <label for="zje-supabase-key">Public anon/publishable key</label>
      <input id="zje-supabase-key"
        type="password" autocomplete="off"
        placeholder="Your public project key">

      <label for="zje-email">Account email</label>
      <input id="zje-email" type="email" autocomplete="email">

      <label for="zje-password">Account password</label>
      <input id="zje-password" type="password"
        autocomplete="current-password">

      <div>
        <button id="zje-save-config" type="button">Save config</button>
        <button id="zje-signup" type="button">Create account</button>
        <button id="zje-login" type="button">Sign in</button>
        <button id="zje-logout" type="button">Sign out</button>
      </div>

      <div>
        <button id="zje-upload" type="button">Upload backup</button>
        <button id="zje-restore" type="button">Restore backup</button>
      </div>

      <p id="zje-status" role="status" aria-live="polite">
        Cloud sync is not configured. Your existing local data stays on
        this device.
      </p>

      <button id="zje-close" type="button">Close</button>
    `;

    document.body.append(open, panel);

    open.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      open.setAttribute("aria-expanded", String(!panel.hidden));
    });

    panel.querySelector("#zje-close").addEventListener("click", () => {
      panel.hidden = true;
      open.setAttribute("aria-expanded", "false");
    });

    panel.querySelector("#zje-theme-select").addEventListener("change", e => {
      preferences.theme = e.target.value;
      applyTheme();
    });

    panel.querySelector("#zje-accent-select").addEventListener("change", e => {
      preferences.accent = e.target.value;
      applyTheme();
    });

    panel.querySelector("#zje-aurora-toggle").addEventListener("change", e => {
      preferences.aurora = e.target.checked;
      applyTheme();
    });

    panel.querySelector("#zje-motion-toggle").addEventListener("change", e => {
      preferences.reducedMotion = e.target.checked;
      applyTheme();
    });

    const config = readJSON(CONFIG_KEY, {});
    panel.querySelector("#zje-supabase-url").value = config.url || "";
    panel.querySelector("#zje-supabase-key").value = config.key || "";
    applyTheme();
  }

  function status(message) {
    document.querySelector("#zje-status").textContent = message;
  }

  function getConfig() {
    return {
      url: document.querySelector("#zje-supabase-url").value.trim(),
      key: document.querySelector("#zje-supabase-key").value.trim()
    };
  }

  function saveConfig() {
    const config = getConfig();

    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url)) {
      throw new Error("Enter a valid Supabase project URL first.");
    }

    if (!config.key) {
      throw new Error("Enter your Supabase public anon/publishable key.");
    }

    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    supabaseClient = null;
    return config;
  }

  async function getClient() {
    const config = saveConfig();

    if (!window.supabase?.createClient) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.onload = resolve;
        script.onerror = () => reject(
          new Error("Supabase library failed to load. Check your connection.")
        );
        document.head.appendChild(script);
      });
    }

    if (!supabaseClient) {
      supabaseClient = window.supabase.createClient(config.url, config.key);
    }

    return supabaseClient;
  }

  async function runCloud(action) {
    try {
      status("Working…");
      const client = await getClient();

      if (action === "signup" || action === "login") {
        const email = document.querySelector("#zje-email").value.trim();
        const password = document.querySelector("#zje-password").value;

        if (!email || !password) {
          throw new Error("Enter your account email and password.");
        }

        const result = action === "signup"
          ? await client.auth.signUp({ email, password })
          : await client.auth.signInWithPassword({ email, password });

        if (result.error) throw result.error;

        status(action === "signup"
          ? "Account request submitted. Confirm your email if Supabase requires it."
          : "Signed in successfully.");
        return;
      }

      if (action === "logout") {
        const { error } = await client.auth.signOut();
        if (error) throw error;
        status("Signed out.");
        return;
      }

      const { data: authData, error: authError } =
        await client.auth.getUser();

      if (authError) throw authError;
      if (!authData.user) throw new Error("Sign in before using cloud backup.");

      if (action === "upload") {
        const payload = {};

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);

          if (key && key.startsWith("zj_") && key !== CONFIG_KEY) {
            const raw = localStorage.getItem(key);
            try {
              payload[key] = JSON.parse(raw);
            } catch {
              payload[key] = raw;
            }
          }
        }

        const { error } = await client.from("zj_user_backups").upsert({
          user_id: authData.user.id,
          payload,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

        if (error) throw error;
        status("Cloud backup uploaded successfully.");
      }

      if (action === "restore") {
        const { data, error } = await client
          .from("zj_user_backups")
          .select("payload, updated_at")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (error) throw error;
        if (!data?.payload) throw new Error("No cloud backup was found.");

        if (!confirm(
          "Restore this backup? Matching local ZJ data will be replaced."
        )) {
          status("Restore cancelled.");
          return;
        }

        for (const [key, value] of Object.entries(data.payload)) {
          if (/^zj_[a-zA-Z0-9_-]+$/.test(key) && key !== CONFIG_KEY) {
            localStorage.setItem(key, JSON.stringify(value));
          }
        }

        status("Backup restored. Reloading ZJ OS…");
        setTimeout(() => location.reload(), 1000);
      }
    } catch (error) {
      status(error.message || "An unexpected error occurred.");
    }
  }

  function bindCloudButtons() {
    const actions = {
      "zje-save-config": () => {
        try {
          saveConfig();
          status("Cloud configuration saved on this device.");
        } catch (error) {
          status(error.message);
        }
      },
      "zje-signup": () => runCloud("signup"),
      "zje-login": () => runCloud("login"),
      "zje-logout": () => runCloud("logout"),
      "zje-upload": () => runCloud("upload"),
      "zje-restore": () => runCloud("restore")
    };

    for (const [id, action] of Object.entries(actions)) {
      document.getElementById(id).addEventListener("click", action);
    }
  }

  function init() {
    if (!document.body || document.getElementById("zje-panel")) return;

    addStyles();
    addPanel();
    bindCloudButtons();

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      preferences.reducedMotion = true;
      applyTheme();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
