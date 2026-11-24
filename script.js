/* ZJ OS — complete application script (single file). Original execution order kept:
   1) inline classic scripts, 2) main app module, 3) feature modules. */

/* ===== inline script #1 ===== */
(() => {
            const status = document.getElementById('zj-network-status');
            const installButton = document.getElementById('zj-install-button');
            let installPrompt = null;
            const updateNetworkStatus = () => {
                status.style.display = navigator.onLine ? 'none' : 'block';
                document.documentElement.dataset.connection = navigator.onLine ? 'online' : 'offline';
            };
            window.addEventListener('online', updateNetworkStatus);
            window.addEventListener('offline', updateNetworkStatus);
            updateNetworkStatus();
            window.addEventListener('beforeinstallprompt', event => {
                event.preventDefault(); installPrompt = event; installButton.style.display = 'block';
            });
            installButton.addEventListener('click', async () => {
                if (!installPrompt) return;
                installPrompt.prompt();
                try { await installPrompt.userChoice; } catch (_) {}
                installPrompt = null; installButton.style.display = 'none';
            });
            window.addEventListener('appinstalled', () => {
                installButton.style.display = 'none'; installPrompt = null;
                if (typeof toast === 'function') toast('ZJ OS installed successfully.', 'success');
            });
            if ('serviceWorker' in navigator && window.isSecureContext) {
                window.addEventListener('load', async () => {
                    try {
                        const swUrl = new URL('./sw.js', location.href);
                        const check = await fetch(swUrl.href, { cache: 'no-store' });
                        const mime = (check.headers.get('content-type') || '').toLowerCase();
                        const isJavaScript = /(?:text|application)\/(?:java|ecma)script/.test(mime);

                        if (!check.ok || !isJavaScript) {
                            console.info('zj-os: offline caching is unavailable here because ./sw.js is missing or is not served as JavaScript.');
                            return;
                        }

                        await navigator.serviceWorker.register(swUrl.href);
                    } catch (error) {
                        console.info('zj-os: service worker was not registered; the app can still run online.', error);
                    }
                }, { once: true });
            }
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                document.documentElement.dataset.reducedMotion = 'true';
            }
        })();

/* ===== inline script #2 ===== */
(function missedBindings() {
            document.addEventListener('keydown', (event) => {
                const t = event.target;
                const typing = t && (t.matches?.('input, textarea, select') || t.isContentEditable);
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'j' && !typing) {
                    event.preventDefault();
                    window.openAssistant?.();
                }
            });

            document.addEventListener('keydown', (event) => {
                if (event.key !== '?') return;
                const t = event.target;
                if (t && (t.matches?.('input, textarea, select') || t.isContentEditable)) return;
                window.toast?.('Ctrl+K: Search · Ctrl+J: Assistant · G then T/N/W/C/H/P: Tabs · ?: Help', 'info');
            });

            document.addEventListener('keydown', (event) => {
                const onCalc = document.getElementById('tab-calculator')?.classList.contains('active')
                    || document.getElementById('tab-dashboard')?.classList.contains('active');
                if (!onCalc) return;
                const t = event.target;
                if (t && (t.matches?.('input, textarea, select') || t.isContentEditable)) return;
                if (/^[0-9.+\-*/()]$/.test(event.key)) { event.preventDefault(); window.calcInput?.(event.key); }
                else if (event.key === 'Enter') { event.preventDefault(); window.calcInput?.('='); }
                else if (event.key === 'Backspace') { event.preventDefault(); window.calcInput?.('DEL'); }
                else if (event.key === 'Escape') { event.preventDefault(); window.calcInput?.('AC'); }
            });

            document.addEventListener('DOMContentLoaded', () => {
                const A = window.__zj_app;
                const S = window.__zj_save;
                const sound = document.getElementById('toggle-sound');
                if (sound && A && S) {
                    sound.checked = !!A.sound;
                    sound.addEventListener('change', (e) => { A.sound = e.target.checked; S(); });
                }
                ['timer-h', 'timer-m', 'timer-s'].forEach((id) => {
                    document.getElementById(id)?.addEventListener('input', () => { if (!A?.timerRunning) window.updateTimerDisplay?.(); });
                });
                ['pwd-length', 'pwd-upper', 'pwd-lower', 'pwd-num', 'pwd-sym', 'pwd-ambiguous', 'pwd-no-repeat'].forEach((id) => {
                    document.getElementById(id)?.addEventListener('input', () => {
                        const out = document.getElementById('pwd-output');
                        const text = out?.textContent || '';
                        if (text && text !== 'Click "Generate"' && text !== 'Select options') window.generatePassword?.();
                    });
                });
            });

            (function battery() {
                function update() {
                    if (!navigator.getBattery) return;
                    navigator.getBattery().then((b) => {
                        const el = document.getElementById('sys-battery');
                        if (el) el.textContent = Math.round(b.level * 100) + '%';
                    }).catch(() => {});
                }
                update();
                setInterval(update, 5000);
            })();

        })();

/* ===== inline script #3 ===== */
(function () {
  'use strict';
  const root = document.documentElement;
  root.setAttribute('data-theme', 'gold');
  root.setAttribute('data-mode', 'dark');

  // Add a subtle pointer glow to the main workspace on capable devices.
  const finePointer = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (finePointer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.addEventListener('pointermove', function (event) {
      const area = document.querySelector('.content-area');
      if (!area) return;
      area.style.setProperty('--pointer-x', (event.clientX / Math.max(innerWidth, 1) * 100) + '%');
      area.style.setProperty('--pointer-y', (event.clientY / Math.max(innerHeight, 1) * 100) + '%');
    }, { passive: true });
  }

  // Ripple feedback for primary interactive controls.
  document.addEventListener('click', function (event) {
    const target = event.target.closest('.btn,.btn-icon,.dashboard-action,.nav-item,.calc-btn');
    if (!target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'zj-ui-ripple';
    ripple.style.left = (event.clientX - rect.left) + 'px';
    ripple.style.top = (event.clientY - rect.top) + 'px';
    target.appendChild(ripple);
    window.setTimeout(function () { ripple.remove(); }, 650);
  }, { passive: true });

  // Respect the device motion preference if it changes while the app is open.
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function syncMotion() { root.classList.toggle('zj-reduced-motion', motionQuery.matches); }
  syncMotion();
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', syncMotion);
})();

/* ===== inline script #4 id=zj-dashboard-live-data ===== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = String(value); };
  const setWidth = (id, value) => { const el = $(id); if (el) el.style.width = Math.max(0, Math.min(100, Number(value) || 0)) + '%'; };
  const dailyQuotes = [
    'Small steps, repeated daily, create remarkable change.',
    'Your future is shaped by what you do today.',
    'Focus on progress, not perfection.',
    'Discipline is choosing what matters most over what feels easiest.',
    'Start where you are. Use what you have. Do what you can.',
    'A clear plan turns ambition into action.',
    'Consistency makes ordinary effort extraordinary.',
    'Make today useful, and tomorrow becomes stronger.',
    'The secret of getting ahead is getting started.',
    'You do not need more time. You need a clear priority.',
    'Great things are built one focused session at a time.',
    'Protect your attention. It creates your direction.',
    'Every finished task is a promise kept to yourself.',
    'Dream boldly, plan carefully, act consistently.',
    'A little better every day adds up to a lot.',
    'Do the work today that your future self will thank you for.',
    'Clarity comes from taking the next step.',
    'Turn your goals into habits, and habits into results.',
    'Your pace is yours. Keep moving forward.',
    'Begin with purpose. Continue with patience.',
    'The best way to make progress is to keep showing up.',
    'Less distraction. More intention. Better results.',
    'Build a routine that makes your goals easier to reach.',
    'Action is the bridge between plans and results.',
    'Use your energy on what you can influence.',
    'One meaningful action can change the direction of a day.',
    'Stay curious, stay focused, keep improving.',
    'Success grows where preparation meets opportunity.',
    'Make room for deep work and meaningful rest.',
    'Your next chapter starts with the next decision.'
  ];
  let quoteDay = '';
  function updateDailyQuote(force) {
    const now = new Date();
    const dayKey = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    if (!force && dayKey === quoteDay) return;
    quoteDay = dayKey;
    const start = new Date(now.getFullYear(),0,0);
    const dayOfYear = Math.floor((new Date(now.getFullYear(),now.getMonth(),now.getDate()) - start) / 86400000);
    const index = ((dayOfYear + now.getFullYear()) % dailyQuotes.length);
    const quote = $('zj-daily-quote');
    const label = $('zj-daily-quote-date');
    if (quote) {
      quote.classList.add('quote-changing');
      window.setTimeout(() => {
        quote.textContent = dailyQuotes[index];
        quote.classList.remove('quote-changing');
      }, 260);
    }
    if (label) label.textContent = 'QUOTE OF THE DAY  ·  ' + now.toLocaleDateString(undefined,{month:'long',day:'numeric'}).toUpperCase();
  }
  const safeDate = (value) => {
    if (!value) return '';
    const d = new Date(value.length === 10 ? value + 'T12:00:00' : value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, {month:'short',day:'numeric'});
  };
  function clock() {
    const now = new Date();
    const date = $('zj-dashboard-date');
    const time = $('zj-dashboard-clock');
    if (date) date.textContent = now.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric',year:'numeric'});
    if (time) {
      const parts = now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',hour12:true}).split(' ');
      time.innerHTML = '';
      time.append(document.createTextNode(parts[0] || ''));
      const small = document.createElement('small'); small.textContent = ' ' + (parts[1] || '');
      time.appendChild(small);
    }
  }
  function appData() {
    const app = window.App || window.__zj_app || {};
    const todos = Array.isArray(app.todos) ? app.todos : [];
    const notes = Array.isArray(app.notes) ? app.notes : [];
    const habits = Array.isArray(app.habits) ? app.habits : [];
    const done = todos.filter(t => !!t.done).length;
    const pct = todos.length ? Math.round(done / todos.length * 100) : 0;
    const focus = Number(app.pomoSessions || 0);
    setText('zj-stat-tasks', todos.length);
    setText('zj-stat-done', done);
    setText('zj-stat-notes', notes.length);
    setText('zj-stat-habits', habits.length);
    setText('zj-stat-tasks-foot', todos.length ? (todos.length - done) + ' still to do' : 'Add your first task');
    setText('zj-stat-done-foot', pct + '% of your tasks completed');
    setText('zj-stat-habits-foot', habits.length ? 'Habits in your tracker' : 'Start building a routine');
    setWidth('zj-stat-tasks-bar', todos.length ? 100 : 0);
    setWidth('zj-stat-done-bar', pct);
    setWidth('zj-stat-notes-bar', Math.min(100, notes.length * 10));
    setWidth('zj-stat-habits-bar', Math.min(100, habits.length * 12));
    setText('zj-ring-tasks', pct + '%');
    setText('zj-ring-habits', habits.length);
    setText('zj-ring-notes', notes.length);
    setText('zj-ring-focus', focus);
    const taskRing = document.querySelector('.ring-cyan'); if (taskRing) taskRing.style.setProperty('--ring-progress', pct + '%');
    const habitRing = document.querySelector('.ring-teal'); if (habitRing) habitRing.style.setProperty('--ring-progress', Math.min(100,habits.length*10) + '%');
    const noteRing = document.querySelector('.ring-gold'); if (noteRing) noteRing.style.setProperty('--ring-progress', Math.min(100,notes.length*5) + '%');
    const focusRing = document.querySelector('.ring-purple'); if (focusRing) focusRing.style.setProperty('--ring-progress', Math.min(100,focus*10) + '%');
    setWidth('zj-progress-tasks', pct); setText('zj-progress-tasks-label', pct + '%');
    setWidth('zj-progress-notes', Math.min(100,notes.length*10)); setText('zj-progress-notes-label', notes.length);
    setWidth('zj-progress-habits', Math.min(100,habits.length*10)); setText('zj-progress-habits-label', habits.length);
    setWidth('zj-progress-focus', Math.min(100,focus*10)); setText('zj-progress-focus-label', focus);

    const upcoming = $('zj-dashboard-upcoming');
    if (upcoming) {
      upcoming.replaceChildren();
      const pending = todos.filter(t => !t.done).sort((a,b) => {
        const da = a.due ? new Date(a.due).getTime() : Infinity;
        const db = b.due ? new Date(b.due).getTime() : Infinity;
        return da-db;
      }).slice(0,5);
      if (!pending.length) {
        const empty = document.createElement('div'); empty.className='zj-rail-empty'; empty.textContent='No pending tasks. Add a task to see it here.'; upcoming.appendChild(empty);
      } else pending.forEach(task => {
        const row = document.createElement('div'); row.className='zj-upcoming-item';
        const dot = document.createElement('i'); dot.className='zj-task-dot ' + (task.priority==='high'?'high':task.priority==='low'?'low':'');
        const copy = document.createElement('div'); copy.className='zj-upcoming-copy';
        const title = document.createElement('b'); title.textContent=task.text || 'Untitled task';
        const meta = document.createElement('small'); meta.textContent=(task.priority || 'medium') + (task.due ? ' · ' + safeDate(task.due) : ' priority');
        copy.append(title,meta);
        const open = document.createElement('button'); open.className='zj-item-open'; open.type='button'; open.setAttribute('aria-label','Open tasks'); open.innerHTML='<i data-lucide="chevron-right"></i>'; open.addEventListener('click',()=>window.switchTab?.('todo'));
        row.append(dot,copy,open); upcoming.appendChild(row);
      });
    }
    const recent = $('zj-dashboard-recent');
    if (recent) {
      recent.replaceChildren();
      const latest = notes.slice().sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,4);
      if (!latest.length) {
        const empty = document.createElement('div'); empty.className='zj-rail-empty'; empty.textContent='No notes yet. Capture your first idea above.'; recent.appendChild(empty);
      } else latest.forEach(note => {
        const row=document.createElement('div');row.className='zj-recent-item';
        const icon=document.createElement('span');icon.className='zj-recent-icon';icon.innerHTML='<i data-lucide="file-text"></i>';
        const copy=document.createElement('div');copy.className='zj-recent-copy';
        const title=document.createElement('b');title.textContent=note.title||'Untitled note';
        const meta=document.createElement('small');meta.textContent=safeDate(note.createdAt)||'Saved note';
        copy.append(title,meta);row.append(icon,copy);recent.appendChild(row);
      });
    }
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }
  window.zjDashboardSaveQuickNote = function () {
    const field = $('zj-dashboard-quick-note');
    const content = (field?.value || '').trim();
    if (!content) { window.toast?.('Write a note first','warning'); field?.focus(); return; }
    if (typeof window.openNoteDialog !== 'function' || typeof window.saveNote !== 'function') {
      window.toast?.('Open Notes to save this item','warning'); window.switchTab?.('notes'); return;
    }
    window.openNoteDialog();
    const title = $('note-title'), body = $('note-content');
    if (title) title.value = content.split(/\r?\n/)[0].slice(0,80) || 'Quick note';
    if (body) body.value = content;
    window.saveNote();
    if (field) field.value = '';
    appData();
  };
  function refresh() { clock(); updateDailyQuote(false); appData(); }
  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('load', refresh);
  window.addEventListener('zj:tab-change', (e)=>{ if(e.detail?.tab==='dashboard') refresh(); });
  document.addEventListener('click', (e)=>{ if(e.target.closest('.nav-item,[data-tab],.zj-quick-tile')) setTimeout(appData,80); });
  setInterval(refresh, 15000);
  clock();
  updateDailyQuote(true);
})();

        /* ZJ OS brand + reliability patch — v3 runtime fixes */
        window.addEventListener('online', () => { try { toast('Connection restored','success'); } catch (_) {} });

/* ===== inline script #5 id=zj-practical-upgrades ===== */
(function(){
'use strict';
const $ = (id)=>document.getElementById(id);
const safe = (s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem('zj_pro_'+k));return v??d}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem('zj_pro_'+k,JSON.stringify(v));return true}catch(e){console.error(e);return false}};
const notify=(m)=>{if(typeof window.toast==='function')window.toast(m,'info');else alert(m)};
const panel=(title,sub,body)=>`<div class="zj-upgrade-panel"><div class="zj-upgrade-head"><div><div class="zj-upgrade-title">${title}</div><div class="zj-upgrade-sub">${sub}</div></div></div>${body}</div>`;

/* Calendar: local events, ICS import/export, Google Calendar handoff.
   True Google two-way sync requires OAuth client credentials and a hosted redirect URI. */
function initCalendarPlus(){
 const root=$('tab-calendar'); if(!root||$('zj-calendar-plus'))return;
 const host=document.createElement('div');host.id='zj-calendar-plus';
 host.innerHTML=panel('Events & calendar connections','Events are saved locally. Import/export standard .ics files, or send an event to Google Calendar.',`
 <div class="zj-upgrade-grid">
  <input class="zj-upgrade-field" id="zj-event-title" placeholder="Event title">
  <input class="zj-upgrade-field" id="zj-event-date" type="date">
  <input class="zj-upgrade-field" id="zj-event-time" type="time" value="09:00">
  <input class="zj-upgrade-field" id="zj-event-end" type="time" value="10:00">
 </div>
 <textarea class="zj-upgrade-field" id="zj-event-notes" rows="2" placeholder="Notes or location" style="margin-top:8px"></textarea>
 <div class="zj-upgrade-actions" style="margin-top:9px">
  <button class="zj-upgrade-btn" id="zj-event-add">＋ Add event</button>
  <button class="zj-upgrade-btn" id="zj-ics-export">Export .ics</button>
  <button class="zj-upgrade-btn" id="zj-ics-import">Import .ics</button>
  <input type="file" id="zj-ics-file" accept=".ics,text/calendar" hidden>
 </div><div class="zj-upgrade-muted" style="margin-top:9px">Google Calendar: use the Google button on an event to open its prefilled event page. Automatic two-way sync is not active until Google OAuth credentials and redirect URL are configured.</div>
 <div id="zj-events-list"></div>`);
 root.appendChild(host);
 $('zj-event-date').value=new Date().toISOString().slice(0,10);
 const events=()=>read('calendar_events',[]);
 const render=()=>{
  const list=$('zj-events-list');if(!list)return;
  const rows=events().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  list.innerHTML=rows.length?rows.map(e=>`<div class="zj-event-row"><div style="min-width:0"><div style="font-size:12px;font-weight:700;color:var(--color-text-primary)">${safe(e.title)}</div><div class="zj-upgrade-muted">${safe(e.date)} · ${safe(e.time)}${e.notes?' · '+safe(e.notes):''}</div></div><div class="zj-upgrade-actions"><button class="zj-upgrade-btn" data-gcal="${safe(e.id)}">Google</button><button class="zj-upgrade-btn" data-del-event="${safe(e.id)}">Delete</button></div></div>`).join(''):'<div class="zj-upgrade-muted">No events yet. Add your first event above.</div>';
 };
 $('zj-event-add').onclick=()=>{
  const title=$('zj-event-title').value.trim(),date=$('zj-event-date').value,time=$('zj-event-time').value,end=$('zj-event-end').value;
  if(!title||!date||!time||!end)return notify('Enter a title, date, start time and end time.');
  if(end<=time)return notify('End time must be later than start time.');
  const arr=events();arr.push({id:crypto.randomUUID?.()||String(Date.now()),title,date,time,end,notes:$('zj-event-notes').value.trim()});write('calendar_events',arr);
  $('zj-event-title').value='';$('zj-event-notes').value='';render();notify('Event saved on this device.');
 };
 $('zj-events-list').addEventListener('click',e=>{
  const g=e.target.closest('[data-gcal]'),d=e.target.closest('[data-del-event]');
  if(g){const ev=events().find(x=>x.id===g.dataset.gcal);if(!ev)return;const start=ev.date.replaceAll('-','')+'T'+ev.time.replace(':','')+'00';const end=ev.date.replaceAll('-','')+'T'+ev.end.replace(':','')+'00';const url=new URL('https://calendar.google.com/calendar/render');url.searchParams.set('action','TEMPLATE');url.searchParams.set('text',ev.title);url.searchParams.set('dates',start+'/'+end);url.searchParams.set('details',ev.notes||'');window.open(url.toString(),'_blank','noopener');}
  if(d){write('calendar_events',events().filter(x=>x.id!==d.dataset.delEvent));render();}
 });
 const icsDate=(date,time)=>date.replaceAll('-','')+'T'+time.replace(':','')+'00';
 $('zj-ics-export').onclick=()=>{
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ZJ OS//Calendar//EN'];
  events().forEach(e=>{lines.push('BEGIN:VEVENT','UID:'+e.id+'@zjos','DTSTART:'+icsDate(e.date,e.time),'DTEND:'+icsDate(e.date,e.end),'SUMMARY:'+String(e.title).replace(/[\\,;]/g,'\\$&'),'DESCRIPTION:'+String(e.notes||'').replace(/\n/g,'\\n'),'END:VEVENT')});
  lines.push('END:VCALENDAR');const blob=new Blob([lines.join('\r\n')],{type:'text/calendar'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='zj-os-calendar.ics';a.click();URL.revokeObjectURL(a.href);
 };
 $('zj-ics-import').onclick=()=>$('zj-ics-file').click();
 $('zj-ics-file').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;const raw=await file.text();const chunks=raw.split(/BEGIN:VEVENT/i).slice(1);const arr=events();
  for(const chunk of chunks){const get=(key)=>{const m=chunk.match(new RegExp('(?:^|\\n)'+key+'[^:]*:([^\\r\\n]+)','i'));return m?.[1]?.trim()||''};const dt=get('DTSTART').replace(/[^0-9T]/g,'');const de=get('DTEND').replace(/[^0-9T]/g,'');const date=dt.slice(0,8);if(date.length!==8)continue;const fmt=x=>x.slice(0,4)+'-'+x.slice(4,6)+'-'+x.slice(6,8);arr.push({id:crypto.randomUUID?.()||String(Date.now()+arr.length),title:get('SUMMARY').replace(/\\,/g,','),date:fmt(date),time:dt.slice(9,13).replace(/(..)(..)/,'$1:$2')||'09:00',end:de.slice(9,13).replace(/(..)(..)/,'$1:$2')||'10:00',notes:get('DESCRIPTION')});}
  write('calendar_events',arr);render();notify('Calendar file imported.');e.target.value='';
 };
 render();
}

/* AQI from Open-Meteo Air Quality, matched to the selected weather location. */
async function loadAQI(){
 const root=$('tab-weather');if(!root||$('zj-aqi-card'))return;
 const target=root.querySelector('.card');if(!target)return;
 const card=document.createElement('div');card.id='zj-aqi-card';card.className='zj-upgrade-panel';card.innerHTML='<div class="zj-upgrade-head"><div><div class="zj-upgrade-title">Air quality</div><div class="zj-upgrade-sub" id="zj-aqi-status">Waiting for weather location…</div></div><div style="font-size:24px;font-weight:800;color:var(--color-accent-text)" id="zj-aqi-value">--</div></div><div class="zj-upgrade-muted" id="zj-aqi-desc">US AQI and PM2.5 readings are provided by Open-Meteo.</div>';
 target.appendChild(card);
 try{
  $('zj-aqi-status').textContent='Finding weather location…';
  const query=$('weather-full-input')?.value?.trim()||'Hyderabad';let latitude,longitude;
  const coords=query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if(coords){latitude=Number(coords[1]);longitude=Number(coords[2]);}else{
   const geo=new URL('https://geocoding-api.open-meteo.com/v1/search');geo.search=new URLSearchParams({name:query,count:'1',language:'en',format:'json'}).toString();
   const gr=await fetch(geo);if(!gr.ok)throw Error('Location lookup failed');const gj=await gr.json();const place=gj.results?.[0];if(!place)throw Error('Location not found');latitude=place.latitude;longitude=place.longitude;
  }
  $('zj-aqi-status').textContent='Updating…';
  const u=new URL('https://air-quality-api.open-meteo.com/v1/air-quality');u.search=new URLSearchParams({latitude,longitude,current:'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone',timezone:'auto'}).toString();
  const r=await fetch(u);if(!r.ok)throw Error('AQI service unavailable');const j=await r.json();const c=j.current||{};const aqi=Number(c.us_aqi);
  $('zj-aqi-value').textContent=Number.isFinite(aqi)?String(Math.round(aqi)):'--';
  const level=!Number.isFinite(aqi)?'Unavailable':aqi<=50?'Good':aqi<=100?'Moderate':aqi<=150?'Unhealthy for sensitive groups':aqi<=200?'Unhealthy':aqi<=300?'Very unhealthy':'Hazardous';
  $('zj-aqi-status').textContent=level+' · US AQI';$('zj-aqi-desc').textContent='PM2.5 '+(c.pm2_5??'--')+' µg/m³ · PM10 '+(c.pm10??'--')+' µg/m³. AQI categories are indicative, not medical advice.';
 }catch(err){$('zj-aqi-status').textContent='Could not load AQI. Refresh after loading a weather location.';}
}
window.addEventListener('zj:tab-change',e=>{if(e.detail?.tab==='weather')loadAQI()});
window.addEventListener('zj:weather-updated',loadAQI);

/* Full-year habit heatmap using recorded completion dates. */
function initHabitYear(){
 const root=$('tab-habits');if(!root||$('zj-habit-year'))return;
 const el=document.createElement('div');el.id='zj-habit-year';el.className='zj-upgrade-panel';
 el.innerHTML='<div class="zj-upgrade-head"><div><div class="zj-upgrade-title">Year at a glance</div><div class="zj-upgrade-sub">Daily completions across all habits · last 365 days</div></div><span class="zj-upgrade-muted" id="zj-heat-total"></span></div><div class="zj-heatmap" id="zj-heatmap"></div><div class="zj-upgrade-muted" style="margin-top:8px">Darker squares indicate more habits completed that day. Keep checking in to build your history.</div>';
 root.querySelector('.card')?.appendChild(el);renderHabitYear();
}
function renderHabitYear(){
 const map=$('zj-heatmap');if(!map)return;const counts=new Map();let total=0;
 (window.App?.habits||window.__zj_app?.habits||[]).forEach(h=>(Array.isArray(h.history)?h.history:[]).forEach(d=>{const key=typeof d==='string'?d:(d?.date||d?.day||'');if(/^\d{4}-\d{2}-\d{2}$/.test(key)){counts.set(key,(counts.get(key)||0)+1);total++;}}));
 const today=new Date();const start=new Date(today);start.setDate(today.getDate()-364);map.replaceChildren();
 for(let i=0;i<365;i++){const d=new Date(start);d.setDate(start.getDate()+i);const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const n=counts.get(key)||0;const cell=document.createElement('span');cell.className='zj-heat';cell.dataset.level=n?String(Math.min(4,Math.ceil(n/Math.max(1,(window.App?.habits||window.__zj_app?.habits||[]).length)*4))):'0';cell.title=key+': '+n+' completions';map.appendChild(cell);}
 const t=$('zj-heat-total');if(t)t.textContent=total+' recorded check-ins';
}

/* Encrypted password vault. AES-GCM key is derived from a master passphrase;
   only ciphertext/salt/IV are stored. The master passphrase is never persisted. */
let vaultKey=null,vaultItems=[];
async function deriveVaultKey(pass,salt){
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function initVault(){
 const root=$('tab-password');if(!root||$('zj-vault'))return;
 const el=document.createElement('div');el.id='zj-vault';el.className='zj-upgrade-panel';
 el.innerHTML='<div class="zj-upgrade-head"><div><div class="zj-upgrade-title">Encrypted password vault</div><div class="zj-upgrade-sub">Local AES-256-GCM encryption. Your master passphrase cannot be recovered.</div></div><span class="zj-upgrade-muted" id="zj-vault-state">Locked</span></div><div id="zj-vault-lock"><input class="zj-upgrade-field" id="zj-vault-master" type="password" autocomplete="new-password" placeholder="Create or enter master passphrase (12+ characters)"><button class="zj-upgrade-btn" id="zj-vault-unlock" style="margin-top:8px">Create / unlock vault</button></div><div id="zj-vault-content" hidden><div class="zj-upgrade-grid"><input class="zj-upgrade-field" id="zj-vault-site" placeholder="Website or service"><input class="zj-upgrade-field" id="zj-vault-user" placeholder="Username or email"><input class="zj-upgrade-field" id="zj-vault-pass" type="password" placeholder="Password"><input class="zj-upgrade-field" id="zj-vault-note" placeholder="Optional note"></div><div class="zj-upgrade-actions" style="margin-top:8px"><button class="zj-upgrade-btn" id="zj-vault-save">＋ Save credential</button><button class="zj-upgrade-btn" id="zj-vault-lock-btn">Lock vault</button></div><div id="zj-vault-list"></div></div>';
 root.querySelector('.card')?.appendChild(el);
 $('zj-vault-unlock').onclick=async()=>{
  const pass=$('zj-vault-master').value;if(pass.length<12){notify('Use a master passphrase with at least 12 characters.');return;}
  try{
   const saved=read('vault_cipher',null);
   if(!saved){const salt=crypto.getRandomValues(new Uint8Array(16));vaultKey=await deriveVaultKey(pass,salt);const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},vaultKey,new TextEncoder().encode('[]'));write('vault_cipher',{salt:Array.from(salt),iv:Array.from(iv),data:Array.from(new Uint8Array(data))});vaultItems=[];}
   else{vaultKey=await deriveVaultKey(pass,new Uint8Array(saved.salt));const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(saved.iv)},vaultKey,new Uint8Array(saved.data));vaultItems=JSON.parse(new TextDecoder().decode(plain));}
   $('zj-vault-state').textContent='Unlocked';$('zj-vault-lock').hidden=true;$('zj-vault-content').hidden=false;renderVault();
  }catch(e){vaultKey=null;notify('Could not unlock. Check your master passphrase.');}
 };
 async function persistVault(){
  if(!vaultKey)return;const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},vaultKey,new TextEncoder().encode(JSON.stringify(vaultItems)));const old=read('vault_cipher',{});write('vault_cipher',{salt:old.salt,iv:Array.from(iv),data:Array.from(new Uint8Array(data))});
 }
 function renderVault(){
  $('zj-vault-list').innerHTML=vaultItems.length?vaultItems.map((x,i)=>`<div class="zj-vault-row"><div style="min-width:0"><div style="font-size:12px;font-weight:700;color:var(--color-text-primary)">${safe(x.site)}</div><div class="zj-upgrade-muted">${safe(x.user)}</div></div><div class="zj-upgrade-actions"><button class="zj-upgrade-btn" data-vault-copy="${i}">Copy</button><button class="zj-upgrade-btn" data-vault-del="${i}">Delete</button></div></div>`).join(''):'<div class="zj-upgrade-muted" style="margin-top:10px">No saved credentials yet.</div>';
 }
 $('zj-vault-save').onclick=async()=>{const site=$('zj-vault-site').value.trim(),user=$('zj-vault-user').value.trim(),pass=$('zj-vault-pass').value;if(!site||!pass)return notify('Website and password are required.');vaultItems.push({site,user,pass,note:$('zj-vault-note').value});await persistVault();['site','user','pass','note'].forEach(k=>$('zj-vault-'+k).value='');renderVault();};
 $('zj-vault-list').onclick=async e=>{const c=e.target.closest('[data-vault-copy]'),d=e.target.closest('[data-vault-del]');if(c){await navigator.clipboard.writeText(vaultItems[+c.dataset.vaultCopy].pass);notify('Password copied.');}if(d){vaultItems.splice(+d.dataset.vaultDel,1);await persistVault();renderVault();}};
 $('zj-vault-lock-btn').onclick=()=>{vaultKey=null;vaultItems=[];$('zj-vault-content').hidden=true;$('zj-vault-lock').hidden=false;$('zj-vault-master').value='';$('zj-vault-state').textContent='Locked';};
}

/* Practical workspace block toolbar: adds supported native block types. */
function initWorkspaceTools(){
 const root=$('tab-notion'),editor=root?.querySelector('.notion-editor-container');if(!editor||$('zj-workspace-tools'))return;
 const tools=document.createElement('div');tools.id='zj-workspace-tools';tools.className='zj-workspace-tools';
 tools.innerHTML=['text','h1','bullet','todo','quote','code','divider','image','table'].map(t=>`<button class="zj-upgrade-btn" data-add-block="${t}">${({text:'Text',h1:'Heading',bullet:'List',todo:'Checklist',quote:'Quote',code:'Code',divider:'Divider',image:'Image URL',table:'Table'}[t])}</button>`).join('');
 editor.insertBefore(tools,editor.querySelector('#notion-blocks'));
 tools.addEventListener('click',e=>{
  const b=e.target.closest('[data-add-block]');if(!b)return;const type=b.dataset.addBlock;
  if(type==='image'){const url=prompt('Paste an HTTPS image URL');if(!url)return;if(!/^https:\/\//i.test(url))return notify('Only HTTPS image URLs are allowed.');const page=window.App?.notionPages?.find(p=>p.id===window.App.activePage);if(!page)return notify('Create or select a workspace page first.');page.blocks.push({id:crypto.randomUUID?.()||String(Date.now()),type:'image',content:url});window.save?.();window.loadActivePage?.();return;}
  if(type==='table'){const page=window.App?.notionPages?.find(p=>p.id===window.App.activePage);if(!page)return notify('Create or select a workspace page first.');page.blocks.push({id:crypto.randomUUID?.()||String(Date.now()),type:'text',content:'| Column 1 | Column 2 |\\n| --- | --- |\\n| Value | Value |'});window.save?.();window.loadActivePage?.();return;}
  window.addNotionBlock?.(type);
 });
}

/* Small usability polish: live status and accessible motion-safe entrance. */
function initPolish(){
 document.querySelectorAll('.tab-content').forEach(el=>{el.addEventListener('animationend',()=>el.classList.remove('zj-entering'));});
 const style=document.createElement('style');style.textContent='.tab-content.active{animation:zjSoftEnter .24s ease both}@keyframes zjSoftEnter{from{opacity:.72;transform:translateY(5px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.tab-content.active{animation:none!important}}';document.head.appendChild(style);
}
function boot(){
 initCalendarPlus();initHabitYear();initVault();initWorkspaceTools();initPolish();
 const weatherTab=$('tab-weather');if(weatherTab){const obs=new MutationObserver(()=>{const p=window.zjWeatherPlaceSelections?.full;if(p?.latitude)loadAQI()});obs.observe(weatherTab,{attributes:true,attributeFilter:['class']});}
 window.addEventListener('zj:tab-change',e=>{if(e.detail?.tab==='habits')renderHabitYear();});
 const oldRender=window.renderHabits;if(typeof oldRender==='function'&&!oldRender.__zjWrapped){const wrapped=function(){const r=oldRender.apply(this,arguments);renderHabitYear();return r};wrapped.__zjWrapped=true;window.renderHabits=wrapped;}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* ===== main app (was <script type="module">) ===== */
;(async function () {
"use strict";
// Failsafe + timing
console.time('zj-os boot');
setTimeout(() => {
  const p = document.getElementById('preloader');
  if (p && !p.classList.contains('hidden')) {
    p.classList.add('hidden');
    setTimeout(() => { p.style.display = 'none'; }, 500);
    console.warn('zj-os: boot timeout after 5s — check Console for the real error');
  }
}, 5000);

        /* ============ js/state.js ============ */
        const ZJStorage = {
          get(key, fallback = null) {
            try {
              const v = localStorage.getItem('zj_' + key);
              return v ? JSON.parse(v) : fallback;
            } catch (e) {
              console.warn('ZJStorage read error:', e);
              return fallback;
            }
          },
          set(key, value) {
            try {
              localStorage.setItem('zj_' + key, JSON.stringify(value));
              return true;
            } catch (e) {
              if (e && e.name === 'QuotaExceededError') {
                // FIX: was `import('./utils.js').then(...)` — replace with direct call.
                try { toast('ZJStorage full. Clear some data.', 'error'); } catch (_) {}
              } else {
                console.warn('ZJStorage write error:', e);
              }
              return false;
            }
          },
        };

        const App = {
          notes:        ZJStorage.get('notes', []),
          todos:        ZJStorage.get('todos', []),
          alarms:       ZJStorage.get('alarms', []),
          images:       ZJStorage.get('images', []),
          chats:        ZJStorage.get('chats', []),
          notionPages:  ZJStorage.get('notionPages', []),
          habits:       ZJStorage.get('habits', []),
          bookmarks:    ZJStorage.get('bookmarks', []),
          cities:       ZJStorage.get('cities', ['Hyderabad']),
          recentColors: ZJStorage.get('recentColors', []),
          activeChat:   ZJStorage.get('activeChat', null),
          activePage:   ZJStorage.get('activePage', null),
          theme:        'gold',
          mode:         'dark',
          sound:        ZJStorage.get('sound', true),
          tempUnit:     ZJStorage.get('tempUnit', 'C'),
          clock24h:     ZJStorage.get('clock24h', true),

          calcVal:     '0', calcHist: '', calcMemory: 0,
          calcLog:     ZJStorage.get('calcLog', []),
          todoFilter:  'all',

          pomoTime:    25 * 60, pomoRunning: false, pomoEnd: 0, pomoInterval: null,
          pomoDuration: 25 * 60,
          pomoSessions: ZJStorage.get('pomoSessions', 0),
          pomoLastDate: ZJStorage.get('pomoLastDate', new Date().toDateString()),

          timerRunning: false, timerInt: null, timerEnd: 0, timerTotalMs: 0,
        };

        const PERSISTED = [
          'notes','todos','alarms','images','chats','notionPages','habits','bookmarks',
          'cities','recentColors','activeChat','activePage','theme','mode','sound',
          'tempUnit','clock24h','calcLog','pomoSessions','pomoLastDate',
        ];

        const channel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('zj-os') : null;

        let suppressEcho = false;

        function persistNow() {
          suppressEcho = true;
          for (const key of PERSISTED) {
            if (ZJStorage.set(key, App[key]) && channel) {
              try { channel.postMessage({ type: 'sync', key, value: App[key], ts: Date.now() }); } catch {}
            }
          }
          setTimeout(() => { suppressEcho = false; }, 0);
        }

        let saveTimer = null;
        function save() {
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(persistNow, 400);
        }

        function saveNow() {
          if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
          persistNow();
        }

        if (channel) {
          channel.addEventListener('message', (ev) => {
            const msg = ev.data;
            if (!msg || msg.type !== 'sync' || suppressEcho) return;
            if (!PERSISTED.includes(msg.key)) return;
            App[msg.key] = msg.value;
            window.dispatchEvent(new CustomEvent('zj:sync', { detail: msg }));
          });
        }

        /* ============ js/utils.js ============ */
        function escapeHtml(s) {
          const d = document.createElement('div');
          d.textContent = String(s ?? '');
          return d.innerHTML;
        }

        // Safe Markdown renderer for ZJ Bot. It intentionally supports a useful
        // CommonMark-style subset without allowing raw HTML or executable URLs.
        // All text is HTML-escaped; only tags emitted by this renderer reach innerHTML.
        function zjMarkdownEscapeHtml(value) {
          return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
          })[char]);
        }

        function zjMarkdownSafeUrl(value) {
          const raw = String(value || '').trim();
          if (!raw || /[\u0000-\u001f\u007f]/.test(raw)) return null;
          try {
            const parsed = new URL(raw, window.location.href);
            if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) return null;
            return parsed.href;
          } catch (_) {
            return null;
          }
        }

        function zjMarkdownInline(value) {
          const codeTokens = [];
          const linkTokens = [];
          let source = String(value ?? '').replace(/`([^`]+)`/g, (_, code) => {
            const token = `\u0000ZJCODE${codeTokens.length}\u0000`;
            codeTokens.push('<code>' + zjMarkdownEscapeHtml(code) + '</code>');
            return token;
          });

          // Images are deliberately rendered as alt text; chat must not fetch remote images.
          source = source.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
          source = source.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, destination) => {
            const safeUrl = zjMarkdownSafeUrl(destination);
            if (!safeUrl) return label;
            const token = `\u0000ZJLINK${linkTokens.length}\u0000`;
            linkTokens.push('<a href="' + zjMarkdownEscapeHtml(safeUrl) + '" target="_blank" rel="noopener noreferrer">' + zjMarkdownInline(label) + '</a>');
            return token;
          });

          source = zjMarkdownEscapeHtml(source);
          source = source
            .replace(/\*\*(?=\S)(.+?\S)\*\*/g, '<strong>$1</strong>')
            .replace(/__(?=\S)(.+?\S)__/g, '<strong>$1</strong>')
            .replace(/~~(?=\S)(.+?\S)~~/g, '<del>$1</del>')
            .replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>')
            .replace(/(?<!_)_(?!\s)(.+?)(?<!\s)_(?!_)/g, '<em>$1</em>');

          source = source.replace(/\u0000ZJCODE(\d+)\u0000/g, (_, index) => codeTokens[Number(index)] || '');
          return source.replace(/\u0000ZJLINK(\d+)\u0000/g, (_, index) => linkTokens[Number(index)] || '');
        }

        function zjMarkdownSplitTableRow(line) {
          return String(line).trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
        }

        function zjMarkdownRenderBlocks(markdown) {
          const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n');
          const output = [];
          let i = 0;

          const isListLine = (line) => /^\s*(?:[-+*]|\d+[.)])\s+/.test(line);
          const isSpecial = (line) => !line.trim() || /^\s{0,3}(#{1,6})\s+/.test(line) || /^\s{0,3}```/.test(line) || /^\s{0,3}>/.test(line) || /^\s{0,3}(?:[-*_]\s*){3,}$/.test(line) || isListLine(line);

          function renderList(start) {
            const first = lines[start];
            const baseIndent = (first.match(/^\s*/) || [''])[0].length;
            const ordered = /^\s*\d+[.)]\s+/.test(first);
            const tag = ordered ? 'ol' : 'ul';
            const items = [];
            let cursor = start;

            while (cursor < lines.length) {
              const line = lines[cursor];
              const indent = (line.match(/^\s*/) || [''])[0].length;
              const match = line.match(/^\s*(?:([-+*])|(\d+[.)]))\s+(.*)$/);
              if (!match || indent !== baseIndent || Boolean(match[2]) !== ordered) break;
              let itemText = match[3];
              cursor++;
              const continuation = [];
              while (cursor < lines.length) {
                const next = lines[cursor];
                if (!next.trim()) {
                  if (cursor + 1 < lines.length && (lines[cursor + 1].match(/^\s*/) || [''])[0].length > baseIndent) {
                    continuation.push(''); cursor++; continue;
                  }
                  break;
                }
                const nextIndent = (next.match(/^\s*/) || [''])[0].length;
                if (nextIndent <= baseIndent && isListLine(next)) break;
                if (nextIndent <= baseIndent) break;
                continuation.push(next.slice(Math.min(nextIndent, baseIndent + 2)));
                cursor++;
              }
              let nested = '';
              const nestedStart = continuation.findIndex((part) => isListLine(part));
              if (nestedStart >= 0) {
                const nestedLines = continuation.slice(nestedStart).join('\n');
                nested = zjMarkdownRenderBlocks(nestedLines);
                continuation.length = nestedStart;
              }
              const detail = continuation.join('\n').trim();
              items.push('<li>' + zjMarkdownInline(itemText) + (detail ? '<br>' + zjMarkdownRenderBlocks(detail) : '') + nested + '</li>');
            }
            return { html: '<' + tag + '>' + items.join('') + '</' + tag + '>', next: cursor };
          }

          while (i < lines.length) {
            const line = lines[i];
            if (!line.trim()) { i++; continue; }

            const fence = line.match(/^\s{0,3}```\s*([\w+-]*)\s*$/);
            if (fence) {
              const code = [];
              i++;
              while (i < lines.length && !/^\s{0,3}```\s*$/.test(lines[i])) code.push(lines[i++]);
              if (i < lines.length) i++;
              const language = fence[1] ? ' class="language-' + zjMarkdownEscapeHtml(fence[1]) + '"' : '';
              output.push('<pre><code' + language + '>' + zjMarkdownEscapeHtml(code.join('\n')) + '</code></pre>');
              continue;
            }

            const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
            if (heading) {
              const level = heading[1].length;
              output.push('<h' + level + '>' + zjMarkdownInline(heading[2]) + '</h' + level + '>');
              i++; continue;
            }

            if (/^\s{0,3}(?:[-*_]\s*){3,}$/.test(line)) {
              output.push('<hr>'); i++; continue;
            }

            if (/^\s{0,3}>/.test(line)) {
              const quote = [];
              while (i < lines.length && /^\s{0,3}>/.test(lines[i])) quote.push(lines[i++].replace(/^\s{0,3}>\s?/, ''));
              output.push('<blockquote>' + zjMarkdownRenderBlocks(quote.join('\n')) + '</blockquote>');
              continue;
            }

            if (isListLine(line)) {
              const list = renderList(i);
              output.push(list.html); i = Math.max(list.next, i + 1); continue;
            }

            if (i + 1 < lines.length && line.includes('|') && /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1])) {
              const headers = zjMarkdownSplitTableRow(line);
              i += 2;
              const rows = [];
              while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(zjMarkdownSplitTableRow(lines[i++]));
              output.push('<div class="zj-md-table-wrap"><table><thead><tr>' + headers.map((cell) => '<th>' + zjMarkdownInline(cell) + '</th>').join('') + '</tr></thead><tbody>' + rows.map((row) => '<tr>' + headers.map((_, index) => '<td>' + zjMarkdownInline(row[index] || '') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
              continue;
            }

            const paragraph = [line.trim()];
            i++;
            while (i < lines.length && !isSpecial(lines[i])) paragraph.push(lines[i++].trim());
            output.push('<p>' + paragraph.map(zjMarkdownInline).join('<br>') + '</p>');
          }
          return output.join('\n');
        }

        function parseMd(text) {
          return zjMarkdownRenderBlocks(String(text ?? ''));
        }

        function downloadText(filename, content, type = 'text/plain') {
          const blob = new Blob([content], { type });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        function formatTime(date = new Date(), clock24h = true) {
          const h = date.getHours(), m = date.getMinutes(), s = date.getSeconds();
          if (clock24h) {
            return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
          }
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 || 12;
          return String(h12).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') + ' ' + ampm;
        }

        function createEmptyState(icon, title, subtitle) {
          return `<div class="empty-state">
            <div class="empty-icon-wrapper"><i data-lucide="${escapeHtml(icon)}"></i></div>
            <p>${escapeHtml(title)}</p>
            <small>${escapeHtml(subtitle)}</small>
          </div>`;
        }

        function toast(msg, type = 'info', action = null) {
          const icons = { success: 'check-circle', error: 'alert-circle', warning: 'alert-triangle', info: 'info' };
          const container = document.getElementById('toast-container');
          if (!container) return;
          const t = document.createElement('div');
          t.className = `toast ${type}`;
          const icon = document.createElement('i'); icon.setAttribute('data-lucide', icons[type] || 'info');
          const label = document.createElement('span'); label.textContent = String(msg);
          t.append(icon, label);
          if (action && action.label) {
            const btn = document.createElement('button');
            btn.textContent = action.label;
            btn.style.cssText = 'margin-left:auto;background:transparent;border:none;color:var(--accent-electric);font-weight:700;cursor:pointer;font-size:11px;';
            btn.addEventListener('click', () => { try { action.onClick(); } finally { t.remove(); } });
            t.appendChild(btn);
          }
          container.appendChild(t);
          if (window.lucide) window.lucide.createIcons();
          setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, action ? 6000 : 2500);
        }

        function confirmAction(title, message, cb) {
          const t = document.getElementById('confirm-title');
          const m = document.getElementById('confirm-message');
          const ok = document.getElementById('confirm-ok');
          const d = document.getElementById('confirm-dialog');
          if (!t || !m || !ok || !d) return;
          t.textContent = title;
          m.textContent = message;
          ok.onclick = () => { cb(); d.close(); };
          d.showModal();
        }

        let audioCtx = null;
        function playSound(freq = 800, dur = 0.08, type = 'sine', vol = 0.03, enabled = true) {
          if (!enabled) return;
          try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + dur);
          } catch (_) {}
        }

        function animateValue(obj, start, end, duration, isPercent = false) {
          if (!obj) return;
          let startTs = null;
          const step = (ts) => {
            if (!startTs) startTs = ts;
            const p = Math.min((ts - startTs) / duration, 1);
            const v = Math.floor(p * (end - start) + start);
            obj.textContent = v + (isPercent ? '%' : '');
            if (p < 1) requestAnimationFrame(step);
            else obj.textContent = end + (isPercent ? '%' : '');
          };
          requestAnimationFrame(step);
        }

        function triggerElectricPulse(el) {
          if (!el) return;
          el.classList.remove('electric-pulse');
          void el.offsetWidth;
          el.classList.add('electric-pulse');
          setTimeout(() => el.classList.remove('electric-pulse'), 500);
        }

        /* ============ js/calculator.js ============ */
        const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };

        function tokenize(src) {
          const out = [];
          let i = 0;
          while (i < src.length) {
            const c = src[i];
            if (/\s/.test(c)) { i++; continue; }
            if (/[0-9.]/.test(c)) {
              let j = i;
              while (j < src.length && /[0-9.]/.test(src[j])) j++;
              const num = Number(src.slice(i, j));
              if (Number.isNaN(num)) throw new Error(`Bad number at ${i}`);
              out.push({ t: 'num', v: num }); i = j; continue;
            }
            if (src.startsWith('**', i)) { out.push({ t: 'op', v: '^' }); i += 2; continue; }
            if ('+-*/%^()'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
            throw new Error(`Unexpected character: ${c}`);
          }
          return out;
        }

        function toRPN(tokens) {
          const out = [], stack = [];
          let prev = null;
          for (const tok of tokens) {
            if (tok.t === 'num') { out.push(tok); prev = tok; continue; }
            if (tok.v === '(') { stack.push(tok); prev = tok; continue; }
            if (tok.v === ')') {
              while (stack.length && stack[stack.length - 1].v !== '(') out.push(stack.pop());
              if (!stack.length) throw new Error('Unbalanced )');
              stack.pop(); prev = tok; continue;
            }
            const unary = (tok.v === '-' || tok.v === '+') && (!prev || (prev.t === 'op' && prev.v !== ')'));
            if (unary) {
              out.push({ t: 'num', v: 0 });
              stack.push({ t: 'op', v: tok.v, unary: true });
              prev = tok; continue;
            }
            const p = PREC[tok.v];
            while (stack.length) {
              const top = stack[stack.length - 1];
              if (top.v === '(') break;
              const tp = top.unary ? 4 : PREC[top.v];
              if (tp > p || (tp === p && tok.v !== '^')) out.push(stack.pop());
              else break;
            }
            stack.push({ ...tok, prec: p });
            prev = tok;
          }
          while (stack.length) {
            const top = stack.pop();
            if (top.v === '(') throw new Error('Unbalanced (');
            out.push(top);
          }
          return out;
        }

        function MathParser(input) {
          const rpn = toRPN(tokenize(String(input)));
          const st = [];
          for (const tok of rpn) {
            if (tok.t === 'num') { st.push(tok.v); continue; }
            if (tok.unary) { const a = st.pop(); st.push(tok.v === '-' ? -a : a); continue; }
            const b = st.pop(), a = st.pop();
            if (a === undefined || b === undefined) throw new Error('Malformed expression');
            switch (tok.v) {
              case '+': st.push(a + b); break;
              case '-': st.push(a - b); break;
              case '*': st.push(a * b); break;
              case '/': st.push(b === 0 ? Infinity : a / b); break;
              case '%': st.push(a % b); break;
              case '^': st.push(Math.pow(a, b)); break;
              default: throw new Error(`Bad operator: ${tok.v}`);
            }
          }
          if (st.length !== 1) throw new Error('Malformed expression');
          return st[0];
        }

        function formatNumber(n) {
          if (!Number.isFinite(n)) return String(n);
          if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toLocaleString();
          return Number(n.toPrecision(12)).toLocaleString();
        }

        function calcInput(ch, A, saveFn) {
          // FIX: no dynamic import — playSound, triggerElectricPulse, toast are in scope.
          playSound(800, 0.05, 'sine', 0.02, A.sound);
          triggerElectricPulse(document.querySelector('.calc-grid .calc-btn:hover'));

          if (ch === '*') ch = '×';
          if (ch === '/') ch = '÷';

          if (ch === 'MC') { A.calcMemory = 0; toast('Memory cleared'); }
          else if (ch === 'MR') { A.calcVal = String(A.calcMemory); }
          else if (ch === 'M+') { A.calcMemory += parseFloat(A.calcVal) || 0; toast('Added to memory', 'success'); }
          else if (ch === 'M-') { A.calcMemory -= parseFloat(A.calcVal) || 0; toast('Subtracted', 'success'); }
          else if (ch === 'AC') { A.calcVal = '0'; A.calcHist = ''; }
          else if (ch === 'DEL') A.calcVal = A.calcVal.length > 1 ? A.calcVal.slice(0, -1) : '0';
          else if (ch === '=') {
            try {
              A.calcHist = A.calcVal + ' =';
              const expr = A.calcVal.replace(/×/g, '*').replace(/÷/g, '/');
              const result = MathParser(expr);
              if (!Number.isFinite(result)) throw new Error('Cannot divide by zero');
              A.calcVal = Number(result.toPrecision(12)).toString();
              A.calcLog.unshift({ expr: A.calcHist, result: A.calcVal, ts: Date.now() });
              if (A.calcLog.length > 50) A.calcLog.pop();
              saveFn();
              playSound(1200, 0.1, 'triangle', 0.05, A.sound);
            } catch (e) {
              A.calcVal = 'Error';
              toast(e.message || 'Invalid expression', 'error');
              playSound(200, 0.2, 'sawtooth', 0.05, A.sound);
            }
          } else if (ch === '%') {
            try {
              const expr = A.calcVal.replace(/×/g, '*').replace(/÷/g, '/');
              A.calcVal = (MathParser(expr) / 100).toString();
            } catch (_) { A.calcVal = 'Error'; }
          } else {
            if (A.calcVal === '0' && ch !== '.') A.calcVal = ch;
            else if (A.calcVal === 'Error') A.calcVal = ch;
            else A.calcVal += ch;
          }

          const w = document.getElementById('calc-val-widget');
          const h = document.getElementById('calc-hist-widget');
          if (w) w.textContent = formatNumber(A.calcVal);
          if (h) h.textContent = A.calcHist;
          const f = document.getElementById('calc-val-full');
          const fh = document.getElementById('calc-hist-full');
          if (f) f.textContent = formatNumber(A.calcVal);
          if (fh) fh.textContent = A.calcHist;
        }

        function scientificCalc(kind, A, saveFn, radians) {
          // FIX: no dynamic import.
          const x = Number(A.calcVal);
          if (!Number.isFinite(x)) { toast('Enter a valid number first', 'error'); return; }
          const a = radians ? x : x * Math.PI / 180;
          let y;
          switch (kind) {
            case 'sin': y = Math.sin(a); break;
            case 'cos': y = Math.cos(a); break;
            case 'tan': y = Math.tan(a); break;
            case 'sqrt': if (x < 0) return toast('Square root requires a non-negative number', 'error'); y = Math.sqrt(x); break;
            case 'log': if (x <= 0) return toast('Log requires a positive number', 'error'); y = Math.log10(x); break;
            case 'ln': if (x <= 0) return toast('Natural log requires a positive number', 'error'); y = Math.log(x); break;
            case 'square': y = x * x; break;
            case 'reciprocal': if (x === 0) return toast('Cannot divide by zero', 'error'); y = 1 / x; break;
            case 'abs': y = Math.abs(x); break;
            case 'factorial':
              if (x < 0 || !Number.isInteger(x) || x > 170) return toast('Factorial supports integers from 0 to 170', 'error');
              y = 1; for (let i = 2; i <= x; i++) y *= i; break;
            default: return;
          }
          if (!Number.isFinite(y)) return toast('Result is outside supported numeric range', 'error');
          A.calcHist = `${kind}(${A.calcVal}) =`;
          A.calcVal = Number(y.toPrecision(12)).toString();
          A.calcLog.unshift({ expr: A.calcHist, result: A.calcVal, ts: Date.now() });
          A.calcLog = A.calcLog.slice(0, 100);
          saveFn();
          ['calc-val-widget','calc-val-full'].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = formatNumber(A.calcVal); });
          ['calc-hist-widget','calc-hist-full'].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = A.calcHist; });
        }

        /* ============ js/converter.js ============ */
        const TABLES = {
          length:      { m:['Meters',1], km:['Kilometers',1000], cm:['Centimeters',0.01], mm:['Millimeters',0.001], mi:['Miles',1609.344], ft:['Feet',0.3048], in:['Inches',0.0254], yd:['Yards',0.9144] },
          weight:      { kg:['Kilograms',1], g:['Grams',0.001], mg:['Milligrams',0.000001], lb:['Pounds',0.45359237], oz:['Ounces',0.028349523125], t:['Tonnes',1000] },
          volume:      { l:['Liters',1], ml:['Milliliters',0.001], m3:['Cubic meters',1000], gal:['Gallons (US)',3.785411784], qt:['Quarts',0.946352946] },
          temperature: { c:['Celsius'], f:['Fahrenheit'], k:['Kelvin'] },
          data:        { b:['Bytes',1], kb:['Kilobytes',1024], mb:['Megabytes',1048576], gb:['Gigabytes',1073741824], tb:['Terabytes',1099511627776] },
          speed:       { mps:['Meters/second',1], kph:['Kilometers/hour',0.277778], mph:['Miles/hour',0.44704], knot:['Knots',0.514444] },
          area:        { m2:['Square meters',1], km2:['Square km',1000000], ha:['Hectares',10000], acre:['Acres',4046.8564224], ft2:['Square feet',0.09290304] },
          time:        { s:['Seconds',1], min:['Minutes',60], h:['Hours',3600], d:['Days',86400], wk:['Weeks',604800] },
        };

        function convertValue(value, from, to, category = 'length') {
          const v = Number(value);
          if (Number.isNaN(v)) throw new Error('value is not a number');
          if (from === to) return v;
          if (category === 'temperature') {
            const toC = from === 'c' ? v : from === 'f' ? (v - 32) * 5 / 9 : v - 273.15;
            return to === 'c' ? toC : to === 'f' ? toC * 9 / 5 + 32 : toC + 273.15;
          }
          const t = TABLES[category];
          if (!t || !(from in t) || !(to in t)) throw new Error(`Unsupported conversion: ${category} ${from}→${to}`);
          return v * t[from][1] / t[to][1];
        }

        function updateConverter() {
          const catEl = document.getElementById('conv-category');
          const fromSel = document.getElementById('conv-from-unit');
          const toSel = document.getElementById('conv-to-unit');
          if (!catEl || !fromSel || !toSel) return;
          const cat = catEl.value;
          const units = TABLES[cat];
          const keys = Object.keys(units);
          fromSel.innerHTML = keys.map(k => `<option value="${k}">${units[k][0]}</option>`).join('');
          toSel.innerHTML = keys.map(k => `<option value="${k}">${units[k][0]}</option>`).join('');
          fromSel.value = keys[0];
          toSel.value = keys[1] || keys[0];
          runConvert();
        }

        function runConvert() {
          const catEl = document.getElementById('conv-category');
          const fromEl = document.getElementById('conv-from-unit');
          const toEl = document.getElementById('conv-to-unit');
          const valEl = document.getElementById('conv-from-val');
          const outEl = document.getElementById('conv-to-val');
          if (!catEl || !fromEl || !toEl || !valEl || !outEl) return;
          try {
            const val = parseFloat(valEl.value) || 0;
            outEl.value = Number(convertValue(val, fromEl.value, toEl.value, catEl.value).toFixed(6));
          } catch (_) {
            outEl.value = '';
          }
        }

        function swapConverter() {
          const from = document.getElementById('conv-from-unit');
          const to = document.getElementById('conv-to-unit');
          const fromVal = document.getElementById('conv-from-val');
          const toVal = document.getElementById('conv-to-val');
          if (!from || !to || !fromVal || !toVal) return;
          const t = from.value; from.value = to.value; to.value = t;
          fromVal.value = toVal.value;
          runConvert();
        }

        /* ============ js/password.js ============ */
        const LOWER = 'abcdefghijklmnopqrstuvwxyz';
        const UPPER = LOWER.toUpperCase();
        const NUM = '0123456789';
        const SYM = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const AMBIGUOUS = /[O0Il1]/g;

        function pickFrom(pool) {
          const buf = new Uint32Array(1);
          crypto.getRandomValues(buf);
          return pool[buf[0] % pool.length];
        }

        function generatePassword(opts = {}) {
          const {
            length = 16, upper = true, lower = true, numbers = true, symbols = true,
            excludeAmbiguous = false, noRepeat = false,
          } = opts;
          if (!Number.isInteger(length) || length < 4 || length > 128) {
            throw new Error('length must be an integer between 4 and 128');
          }
          let pools = [];
          if (lower) pools.push(LOWER);
          if (upper) pools.push(UPPER);
          if (numbers) pools.push(NUM);
          if (symbols) pools.push(SYM);
          if (!pools.length) throw new Error('at least one character class required');

          let all = pools.join('');
          if (excludeAmbiguous) {
            all = all.replace(AMBIGUOUS, '');
            pools = pools.map(p => p.replace(AMBIGUOUS, '')).filter(Boolean);
          }

          const required = pools.map(pickFrom);
          const rest = Array.from({ length: length - required.length }, () => pickFrom(all));
          let chars = [...required, ...rest];
          for (let i = chars.length - 1; i > 0; i--) {
            const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
            [chars[i], chars[j]] = [chars[j], chars[i]];
          }

          if (noRepeat) {
            const unique = [...new Set(all.split(''))];
            if (length > unique.length) throw new Error('No-repeat mode can generate at most ' + unique.length + ' unique characters with the selected options.');
            const selected = [];
            const seen = new Set();
            for (const pool of pools) {
              const candidates = [...new Set(pool.split(''))].filter(ch => !seen.has(ch));
              if (candidates.length && selected.length < length) {
                const ch = candidates[Math.floor(Math.random() * candidates.length)];
                selected.push(ch); seen.add(ch);
              }
            }
            const restPool = unique.filter(ch => !seen.has(ch));
            while (selected.length < length) {
              const idx = Math.floor(Math.random() * restPool.length);
              selected.push(restPool.splice(idx, 1)[0]);
            }
            chars = selected;
            for (let i = chars.length - 1; i > 0; i--) {
              const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
              [chars[i], chars[j]] = [chars[j], chars[i]];
            }
          }
          return chars.join('');
        }

        function generatePassphrase() {
          const words = ['amber','orbit','river','maple','cobalt','tiger','comet','harbor','velvet','meadow','pixel','thunder','willow','lantern','summit','coral','planet','silver','forest','rocket','puzzle','breeze','copper','falcon','canvas','sunset','marble','signal','ocean','bright'];
          const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length];
          const num = 100 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900);
          return `${pick()}-${pick()}-${pick()}-${pick()}-${num}`;
        }

        /* ============ js/tabs.js ============ */
        const ZJ_TABS = new Set([
          'dashboard', 'notion', 'habits', 'calendar',
          'calculator', 'weather', 'clock', 'gallery',
          'notes', 'todo', 'bookmarks', 'pomodoro', 'converter',
          'password', 'colorpicker',
          'chatbot',
        ]);

        let zjActiveTab = 'dashboard';

        function switchTab(tab) {
          if (!ZJ_TABS.has(tab)) {
            console.warn('zj-os: unknown tab "' + tab + '"');
            return;
          }
          if (window.innerWidth < 1024) {
            document.getElementById('sidebar')?.classList.remove('open');
          }
          if (tab === zjActiveTab) return;
          playSound(600, 0.05, 'sine', 0.05, App?.sound);
          document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
          document.querySelectorAll('.nav-item').forEach((el) => el.classList.remove('active'));
          document.getElementById('tab-' + tab)?.classList.add('active');
          document.querySelector('.nav-item[data-tab="' + tab + '"]')?.classList.add('active');
          const previous = zjActiveTab;
          zjActiveTab = tab;
          window.dispatchEvent(new CustomEvent('zj:tab-change', { detail: { tab, previous } }));
        }

        function bindTabActions() {
          document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action^="tab:"]');
            if (!el) return;
            e.preventDefault();
            switchTab(el.dataset.action.slice('tab:'.length));
          });
        }

        let zjGArmed = false;
        let zjGTimer = null;

        const ZJ_GO_MAP = {
          d: 'dashboard', t: 'todo', n: 'notes', w: 'notion',
          c: 'chatbot', h: 'habits', p: 'pomodoro',
        };

        function zjDisarmG() {
          zjGArmed = false;
          if (zjGTimer) { clearTimeout(zjGTimer); zjGTimer = null; }
        }

        function bindTabShortcuts() {
          document.addEventListener('keydown', (e) => {
            const t = e.target;
            if (t && (t.matches?.('input, textarea, select') || t.isContentEditable)) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (zjGArmed) {
              const k = e.key.toLowerCase();
              zjDisarmG();
              if (ZJ_GO_MAP[k]) { e.preventDefault(); switchTab(ZJ_GO_MAP[k]); return; }
              if (k === 's') { e.preventDefault(); document.getElementById('settings-dialog')?.showModal(); return; }
              return;
            }
            if (e.key.toLowerCase() === 'g') {
              zjGArmed = true;
              zjGTimer = setTimeout(zjDisarmG, 1500);
            }
          });
        }

        /* ============ js/notes.js ============ */
        let zjNotesEditingId = null;
        let zjNotesSearchQuery = '';
        let zjNotesActiveTag = null;
        let zjNotesActiveFolder = '';          // '' = all, '__fav' = favourites, '__none' = unfiled, else folder name
        let zjNotesAutosaveTimer = null;
        let zjNotesLastSavedAt = null;
        const ZJ_NOTE_TEMPLATES = {
          blank:     { label: 'Blank note',    title: '', content: '' },
          meeting:   { label: 'Meeting notes', title: 'Meeting notes', content: 'Attendees:\n\n## Agenda\n- \n\n## Notes\n- \n\n## Action items\n- [ ] ' },
          daily:     { label: 'Daily journal', title: 'Daily journal', content: '## Highlights\n- \n\n## To do tomorrow\n- [ ] \n\n## Gratitude\n- ' },
          checklist: { label: 'Checklist',     title: 'Checklist', content: '- [ ] \n- [ ] \n- [ ] ' },
          project:   { label: 'Project plan',  title: 'Project plan', content: '## Goal\n\n## Milestones\n- [ ] \n\n## Risks\n- ' },
        };

        function renderNotes() {
          zjNotesNormalize();
          const grid = document.getElementById('notes-grid');
          if (!grid) return;
          zjNotesRenderFolderChips();
          zjNotesRenderTagChips();
          const filtered = zjNotesApplyFilters(App.notes);
          grid.replaceChildren();
          if (filtered.length === 0) {
            const wrap = document.createElement('div');
            wrap.style.gridColumn = '1 / -1';
            const filtering = zjNotesSearchQuery || zjNotesActiveTag !== null || zjNotesActiveFolder !== '';
            wrap.innerHTML = createEmptyState(
              'sticky-note',
              App.notes.length === 0 ? 'No notes yet' : (filtering ? 'No notes match your filter' : 'No notes'),
              App.notes.length === 0 ? 'Capture your thoughts and ideas' : 'Try a different search, folder or tag.'
            );
            grid.appendChild(wrap);
          } else {
            for (const note of filtered) grid.appendChild(zjNotesBuildCard(note));
          }
          if (window.lucide) window.lucide.createIcons();
        }
        function zjNotesFillEditor(note) {
          zjNotesSetInputValue('note-title', note ? note.title || '' : '');
          zjNotesSetInputValue('note-content', note ? note.content || '' : '');
          zjNotesSetInputValue('note-tags', note ? zjNotesGetTags(note).join(', ') : '');
          zjNotesSetInputValue('note-folder', note ? note.folder || '' : '');
          zjNotesSetInputValue('note-date', note ? note.date || '' : '');
          zjNotesSetInputValue('note-template', 'blank');
          const fav = document.getElementById('note-fav');
          if (fav) { fav.setAttribute('aria-pressed', note && note.favorite ? 'true' : 'false'); fav.classList.toggle('on', !!(note && note.favorite)); }
          const tw = document.getElementById('note-template-wrap');
          if (tw) tw.hidden = !!note;
          const dl = document.getElementById('note-folder-list');
          if (dl) dl.replaceChildren(...zjNotesFolders().map((f) => { const o = document.createElement('option'); o.value = f; return o; }));
          const pv = document.getElementById('note-preview'); if (pv) { pv.hidden = true; pv.replaceChildren(); }
          const ta = document.getElementById('note-content'); if (ta) ta.hidden = false;
          document.getElementById('note-preview-btn')?.setAttribute('aria-pressed', 'false');
          zjNotesSetSaveState(note ? 'saved' : 'new');
        }

        function openNoteDialog() {
          zjNotesEditingId = null;
          const title = document.getElementById('note-dialog-title');
          if (title) title.textContent = 'New Note';
          zjNotesFillEditor(null);
          const dlg = document.getElementById('note-dialog');
          if (dlg && !dlg.open) dlg.showModal();
        }
        function editNote(id) {
          const note = App.notes.find((n) => n.id === id);
          if (!note) return;
          zjNotesEditingId = id;
          const title = document.getElementById('note-dialog-title');
          if (title) title.textContent = 'Edit Note';
          zjNotesFillEditor(note);
          const dlg = document.getElementById('note-dialog');
          if (dlg && !dlg.open) dlg.showModal();
        }
        function zjNotesReadEditor() {
          const val = (id) => document.getElementById(id)?.value || '';
          return {
            title: val('note-title').trim(),
            content: val('note-content'),                       // never trimmed while typing
            tags: val('note-tags').split(',').map((t) => t.trim()).filter(Boolean),
            folder: val('note-folder').trim().slice(0, 40),
            date: /^\d{4}-\d{2}-\d{2}$/.test(val('note-date')) ? val('note-date') : '',
            favorite: document.getElementById('note-fav')?.getAttribute('aria-pressed') === 'true',
          };
        }

        function zjNotesSetSaveState(state) {
          const el = document.getElementById('note-save-state');
          if (!el) return;
          const t = zjNotesLastSavedAt ? zjNotesLastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          el.dataset.state = state === 'dirty' || state === 'saving' ? 'dirty' : 'saved';
          el.textContent = state === 'dirty' ? 'Unsaved changes' : state === 'saving' ? 'Saving...' : state === 'new' ? 'Autosave on' : (t ? 'Saved ' + t : 'Saved');
        }

        /* Writes the editor into the note (creating it on first content). Safe to call repeatedly. */
        function zjNotesCommit() {
          const d = zjNotesReadEditor();
          if (!d.title && !d.content.trim()) return false;       // nothing to save yet
          let title = d.title;
          if (!title) {
            title = (d.content.split('\n').find((l) => l.trim()) || 'Untitled').replace(/^[#>\-\s\[\]x]+/i, '').trim().slice(0, 48) || 'Untitled';
            zjNotesSetInputValue('note-title', title);
          }
          const now = new Date().toISOString();
          let note = zjNotesEditingId ? App.notes.find((n) => n.id === zjNotesEditingId) : null;
          if (note) {
            note.title = title; note.content = d.content; note.tags = d.tags; note.folder = d.folder;
            note.favorite = d.favorite; note.updatedAt = now;
            if (d.date) note.date = d.date; else delete note.date;
          } else {
            note = { id: zjNotesMakeId(), title, content: d.content, tags: d.tags, pinned: false, createdAt: now, updatedAt: now, folder: d.folder, favorite: d.favorite };
            if (d.date) note.date = d.date;
            App.notes.unshift(note);
            zjNotesEditingId = note.id;
            const h = document.getElementById('note-dialog-title'); if (h) h.textContent = 'Edit Note';
            const tw = document.getElementById('note-template-wrap'); if (tw) tw.hidden = true;
          }
          save();
          zjNotesLastSavedAt = new Date();
          renderNotes();
          return true;
        }

        function zjNotesScheduleAutosave() {
          zjNotesSetSaveState('dirty');
          clearTimeout(zjNotesAutosaveTimer);
          zjNotesAutosaveTimer = setTimeout(() => {
            zjNotesAutosaveTimer = null;
            if (!document.getElementById('note-dialog')?.open) return;
            zjNotesSetSaveState(zjNotesCommit() ? 'saved' : 'new');
          }, 700);
        }

        function saveNote() {
          clearTimeout(zjNotesAutosaveTimer); zjNotesAutosaveTimer = null;
          const hadId = !!zjNotesEditingId;
          const saved = zjNotesCommit();
          document.getElementById('note-dialog')?.close();
          if (saved) toast(hadId ? 'Note saved' : 'Note saved', 'success');
          zjNotesEditingId = null;
        }

        function zjNotesFlushOnClose() {       // dialog closed by Esc / X / backdrop: keep what was typed
          if (zjNotesAutosaveTimer) { clearTimeout(zjNotesAutosaveTimer); zjNotesAutosaveTimer = null; zjNotesCommit(); }
          zjNotesEditingId = null;
        }

        function zjNotesApplyTemplate(key) {
          const t = ZJ_NOTE_TEMPLATES[key];
          if (!t || zjNotesEditingId) return;
          zjNotesSetInputValue('note-title', t.title);
          zjNotesSetInputValue('note-content', t.content);
          if (t.content || t.title) zjNotesScheduleAutosave();
        }

        function zjNotesFormat(kind) {
          const ta = document.getElementById('note-content'); if (!ta || ta.hidden) return;
          const a = ta.selectionStart, b = ta.selectionEnd, v = ta.value, sel = v.slice(a, b);
          const wrap = { bold: ['**', '**', 'bold text'], italic: ['_', '_', 'italic text'], code: ['`', '`', 'code'] }[kind];
          let out, from, to;
          if (wrap) { const inner = sel || wrap[2]; out = wrap[0] + inner + wrap[1]; from = a + wrap[0].length; to = from + inner.length; }
          else {
            const pre = { h: '## ', ul: '- ', todo: '- [ ] ' }[kind] || '';
            const ls = v.lastIndexOf('\n', a - 1) + 1;
            out = null; ta.value = v.slice(0, ls) + pre + v.slice(ls); from = a + pre.length; to = b + pre.length;
          }
          if (out !== null) ta.value = v.slice(0, a) + out + v.slice(b);
          ta.focus(); ta.setSelectionRange(from, to);
          zjNotesScheduleAutosave();
        }

        /* Safe Markdown subset: everything is HTML-escaped first, then a few patterns are re-introduced. */
        function zjNotesRenderMd(text) {
          const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
          const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|\W)_(.+?)_(?=\W|$)/g, '$1<em>$2</em>').replace(/`(.+?)`/g, '<code>$1</code>');
          const out = [];
          for (const line of String(text).split('\n')) {
            let m;
            if ((m = line.match(/^#{1,3}\s+(.*)$/))) out.push('<h4>' + inline(m[1]) + '</h4>');
            else if ((m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s?(.*)$/))) out.push('<div class="zjn-check"><span aria-hidden="true">' + (m[1] === ' ' ? '☐' : '☑') + '</span> ' + inline(m[2]) + '</div>');
            else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) out.push('<div class="zjn-li">• ' + inline(m[1]) + '</div>');
            else out.push(line.trim() ? '<p>' + inline(line) + '</p>' : '<br>');
          }
          return out.join('');
        }

        function zjNotesTogglePreview() {
          const ta = document.getElementById('note-content'), pv = document.getElementById('note-preview'), btn = document.getElementById('note-preview-btn');
          if (!ta || !pv) return;
          const on = pv.hidden;
          if (on) pv.innerHTML = zjNotesRenderMd(ta.value);
          pv.hidden = !on; ta.hidden = on;
          btn?.setAttribute('aria-pressed', on ? 'true' : 'false');
        }

        function zjNotesToggleFavEditor() {
          const b = document.getElementById('note-fav'); if (!b) return;
          const on = b.getAttribute('aria-pressed') !== 'true';
          b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('on', on);
          zjNotesScheduleAutosave();
        }

        function zjNotesCreateTask(noteId) {
          const id = noteId || zjNotesEditingId;
          if (!id) { zjNotesCommit(); }
          const note = App.notes.find((n) => n.id === (id || zjNotesEditingId));
          if (!note) { toast('Add a title or some text first.', 'warning'); return; }
          const task = { id: zjTodosMakeId(), text: String(note.title || 'Untitled').slice(0, 200), done: false, priority: 'medium', due: note.date || '', recurrence: 'none', tags: [], subtasks: [], noteId: note.id, createdAt: new Date().toISOString() };
          App.todos.unshift(task);
          note.taskIds = Array.isArray(note.taskIds) ? note.taskIds.concat(task.id) : [task.id];
          save(); renderTodos(); renderNotes();
          toast('Task created from note', 'success');
        }

        function zjNotesToggleFavorite(id) {
          const n = App.notes.find((x) => x.id === id); if (!n) return;
          n.favorite = !n.favorite; save(); renderNotes();
        }
        function searchNotes(q) { zjNotesSearchQuery = String(q || ''); renderNotes(); }

        function togglePinNote(id) {
          const note = App.notes.find((n) => n.id === id);
          if (!note) return;
          note.pinned = !note.pinned;
          save();
          renderNotes();
        }

        function deleteNote(id) {
          const idx = App.notes.findIndex((n) => n.id === id);
          if (idx < 0) return;
          const removed = App.notes.splice(idx, 1)[0];
          save();
          renderNotes();
          toast('Deleted note: ' + String(removed.title || 'Untitled'), 'warning', {
            label: 'Undo',
            onClick: () => {
              App.notes.splice(Math.min(idx, App.notes.length), 0, removed);
              save();
              renderNotes();
            },
          });
        }

        function bindNoteActions() {
          document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action || '';
            if (action === 'note-new') { e.preventDefault(); openNoteDialog(); return; }
            if (action === 'note-clear-tag') { e.preventDefault(); zjNotesActiveTag = null; renderNotes(); return; }
            if (action.startsWith('note-tag:')) { e.preventDefault(); zjNotesActiveTag = action.slice(9) || null; renderNotes(); return; }
            if (action.startsWith('note-edit:')) { e.preventDefault(); editNote(action.slice(10)); return; }
            if (action.startsWith('note-pin:')) { e.preventDefault(); togglePinNote(action.slice(9)); return; }
            if (action.startsWith('note-fav:')) { e.preventDefault(); zjNotesToggleFavorite(action.slice(9)); return; }
            if (action.startsWith('note-task:')) { e.preventDefault(); zjNotesCreateTask(action.slice(10)); return; }
            if (action.startsWith('note-folder:')) { e.preventDefault(); zjNotesActiveFolder = action.slice(12); renderNotes(); return; }
            if (action.startsWith('note-delete:')) { e.preventDefault(); deleteNote(action.slice(12)); return; }
          });
          let lastGTime = 0;
          document.addEventListener('keydown', (e) => { if ((e.key || '').toLowerCase() === 'g') lastGTime = Date.now(); }, true);
          document.addEventListener('keydown', (e) => {
            if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
            if ((e.key || '').toLowerCase() !== 'n') return;
            if (Date.now() - lastGTime < 1500) return;
            if (!document.getElementById('tab-notes')?.classList.contains('active')) return;
            const t = e.target;
            if (t && (t.matches?.('input, textarea, select') || t.isContentEditable)) return;
            e.preventDefault();
            openNoteDialog();
          });
          window.addEventListener('zj:sync', (e) => { if (e.detail?.key === 'notes') renderNotes(); });
          // Autosave + editor helpers
          const dlg = document.getElementById('note-dialog');
          ['note-title', 'note-content', 'note-tags', 'note-folder', 'note-date'].forEach((id) => document.getElementById(id)?.addEventListener('input', zjNotesScheduleAutosave));
          document.getElementById('note-date')?.addEventListener('change', zjNotesScheduleAutosave);
          document.getElementById('note-template')?.addEventListener('change', (ev) => zjNotesApplyTemplate(ev.target.value));
          document.getElementById('note-fav')?.addEventListener('click', zjNotesToggleFavEditor);
          document.getElementById('note-preview-btn')?.addEventListener('click', zjNotesTogglePreview);
          document.getElementById('note-task-btn')?.addEventListener('click', () => zjNotesCreateTask(null));
          document.getElementById('note-toolbar')?.addEventListener('click', (ev) => { const b = ev.target.closest('[data-fmt]'); if (b) zjNotesFormat(b.dataset.fmt); });
          dlg?.addEventListener('close', zjNotesFlushOnClose);
        }

        function zjNotesGetTags(note) {
          if (!note) return [];
          const t = note.tags;
          if (Array.isArray(t)) return t.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
          if (typeof t === 'string') return t.split(',').map((s) => s.trim()).filter(Boolean);
          return [];
        }

        function zjNotesNormalize() {
          if (!Array.isArray(App.notes)) { App.notes = []; save(); }
        }

        function zjNotesFolders() {
          const set = new Set();
          for (const n of App.notes) if (n && typeof n.folder === 'string' && n.folder.trim()) set.add(n.folder.trim());
          return [...set].sort((a, b) => a.localeCompare(b));
        }

        function zjNotesApplyFilters(notes) {
          let out = notes;
          if (zjNotesSearchQuery) {
            const q = zjNotesSearchQuery.toLowerCase();
            out = out.filter((n) => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q) ||
              zjNotesGetTags(n).some((t) => t.toLowerCase().includes(q)) || String(n.folder || '').toLowerCase().includes(q));
          }
          if (zjNotesActiveTag !== null) out = out.filter((n) => zjNotesGetTags(n).includes(zjNotesActiveTag));
          if (zjNotesActiveFolder === '__fav') out = out.filter((n) => n.favorite);
          else if (zjNotesActiveFolder === '__none') out = out.filter((n) => !(n.folder && n.folder.trim()));
          else if (zjNotesActiveFolder) out = out.filter((n) => (n.folder || '').trim() === zjNotesActiveFolder);
          return out.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        }
        function zjNotesRenderFolderChips() {
          let el = document.getElementById('notes-folder-chips');
          const grid = document.getElementById('notes-grid');
          if (!el && grid && grid.parentNode) {
            el = document.createElement('div'); el.id = 'notes-folder-chips'; el.className = 'zjn-chips'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Folders');
            grid.parentNode.insertBefore(el, grid);
          }
          if (!el) return;
          const folders = zjNotesFolders();
          const hasFav = App.notes.some((n) => n.favorite);
          if (zjNotesActiveFolder && zjNotesActiveFolder !== '__fav' && zjNotesActiveFolder !== '__none' && !folders.includes(zjNotesActiveFolder)) zjNotesActiveFolder = '';
          el.replaceChildren();
          if (!folders.length && !hasFav) { el.hidden = true; return; }
          el.hidden = false;
          const mk = (label, key) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'zjn-chip' + (zjNotesActiveFolder === key ? ' active' : ''); b.textContent = label; b.dataset.action = 'note-folder:' + key; b.setAttribute('aria-pressed', zjNotesActiveFolder === key ? 'true' : 'false'); return b; };
          el.appendChild(mk('All notes', ''));
          if (hasFav) el.appendChild(mk('★ Favorites', '__fav'));
          for (const f of folders) el.appendChild(mk('📁 ' + f, f));
          if (folders.length && App.notes.some((n) => !(n.folder && n.folder.trim()))) el.appendChild(mk('Unfiled', '__none'));
        }

        function zjNotesRenderTagChips() {
          const container = zjNotesEnsureTagChipsContainer();
          if (!container) return;
          const allTags = new Set();
          for (const note of App.notes) for (const tag of zjNotesGetTags(note)) allTags.add(tag);
          container.replaceChildren();
          if (allTags.size === 0) { container.hidden = true; return; }
          container.hidden = false;
          container.appendChild(zjNotesMakeTagChip('All tags', null, zjNotesActiveTag === null));
          for (const tag of [...allTags].sort((a, b) => a.localeCompare(b))) container.appendChild(zjNotesMakeTagChip('#' + tag, tag, zjNotesActiveTag === tag));
        }
        function zjNotesEnsureTagChipsContainer() {
          let el = document.getElementById('notes-tag-chips');
          if (el) return el;
          const grid = document.getElementById('notes-grid');
          if (!grid || !grid.parentNode) return null;
          el = document.createElement('div');
          el.id = 'notes-tag-chips'; el.className = 'zjn-chips'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Tags');
          grid.parentNode.insertBefore(el, grid);
          return el;
        }
        function zjNotesMakeTagChip(label, tag, isActive) {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'zjn-chip' + (isActive ? ' active' : '');
          chip.textContent = label;
          chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
          chip.dataset.action = tag === null ? 'note-clear-tag' : 'note-tag:' + tag;
          return chip;
        }
        function zjNotesBuildCard(note) {
          const card = document.createElement('article');
          card.className = 'card zjn-card';
          const header = document.createElement('div');
          header.className = 'zjn-head';
          const title = document.createElement('button');
          title.type = 'button'; title.className = 'zjn-title'; title.dataset.action = 'note-edit:' + note.id;
          title.textContent = (note.pinned ? '📌 ' : '') + String(note.title || 'Untitled');
          title.setAttribute('aria-label', 'Open note ' + String(note.title || 'Untitled'));
          header.appendChild(title);
          const actions = document.createElement('div');
          actions.className = 'zjn-actions';
          actions.appendChild(zjNotesMakeIconBtn(note.favorite ? 'star' : 'star', 'note-fav:' + note.id, note.favorite ? 'Remove from favorites' : 'Add to favorites', !!note.favorite));
          actions.appendChild(zjNotesMakeIconBtn('pin', 'note-pin:' + note.id, note.pinned ? 'Unpin note' : 'Pin note', !!note.pinned));
          actions.appendChild(zjNotesMakeIconBtn('square-check', 'note-task:' + note.id, 'Create task from note'));
          actions.appendChild(zjNotesMakeIconBtn('trash-2', 'note-delete:' + note.id, 'Delete note'));
          header.appendChild(actions);
          card.appendChild(header);
          const body = document.createElement('div');
          body.className = 'zjn-body';
          body.textContent = String(note.content || '').substring(0, 160);
          card.appendChild(body);
          const meta = document.createElement('div');
          meta.className = 'zjn-meta';
          const add = (txt, cls) => { const sp = document.createElement('span'); sp.className = cls || 'zjn-badge'; sp.textContent = txt; meta.appendChild(sp); };
          if (note.folder && String(note.folder).trim()) add('📁 ' + String(note.folder).trim());
          if (note.date) add('📅 ' + note.date);
          for (const tag of zjNotesGetTags(note)) add('#' + tag, 'zjn-badge zjn-tag');
          if (meta.childNodes.length) card.appendChild(meta);
          return card;
        }
        function zjNotesMakeIconBtn(iconName, action, label, pressed) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-icon zjn-icon' + (pressed ? ' on' : '');
          btn.dataset.action = action;
          btn.setAttribute('aria-label', label);
          if (pressed !== undefined) btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
          btn.title = label;
          const i = document.createElement('i');
          i.setAttribute('data-lucide', iconName);
          btn.appendChild(i);
          return btn;
        }
        function zjNotesSetInputValue(id, value) {
          const el = document.getElementById(id);
          if (el) el.value = String(value ?? '');
        }

        function zjNotesMakeId() {
          if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
          return Date.now().toString();
        }

        /* ============ js/todos.js ============ */
        let zjTodosSearchQuery = '';
        let zjTodosActiveTag = null;
        let zjTodosOpenSubtaskInputFor = null;

        function renderTodos() {
          zjTodosNormalize();
          const list = document.getElementById('todo-list');
          if (!list) return;
          zjTodosRenderTagChips();
          let filtered = App.todos;
          if (App.todoFilter === 'active') filtered = filtered.filter((t) => !t.done);
          if (App.todoFilter === 'done') filtered = filtered.filter((t) => t.done);
          if (zjTodosSearchQuery) {
            const q = zjTodosSearchQuery.toLowerCase();
            filtered = filtered.filter((t) => (t.text || '').toLowerCase().includes(q) || zjTodosGetTags(t).some((tag) => tag.toLowerCase().includes(q)));
          }
          if (zjTodosActiveTag !== null) filtered = filtered.filter((t) => zjTodosGetTags(t).includes(zjTodosActiveTag));
          filtered = zjTodosApplySort(filtered);
          if (filtered.length === 0) {
            list.replaceChildren();
            const wrap = document.createElement('div');
            let emptyTitle, emptySub;
            if (App.todos.length === 0) { emptyTitle = 'No tasks yet'; emptySub = 'Add your first task above to get started.'; }
            else if (zjTodosSearchQuery || zjTodosActiveTag !== null) { emptyTitle = 'No search results'; emptySub = 'Try a different search or clear the tag filter.'; }
            else if (App.todoFilter === 'active') { emptyTitle = 'No active tasks'; emptySub = 'Everything is done. Nice work!'; }
            else if (App.todoFilter === 'done') { emptyTitle = 'No completed tasks'; emptySub = 'Completed tasks will show up here.'; }
            else { emptyTitle = 'No tasks match your filter'; emptySub = 'Try a different filter.'; }
            wrap.innerHTML = createEmptyState('check-square', emptyTitle, emptySub);
            list.appendChild(wrap);
            if (window.lucide) window.lucide.createIcons();
            zjTodosUpdateStats();
            return;
          }
          list.replaceChildren();
          for (const todo of filtered) list.appendChild(zjTodosBuildItem(todo));
          if (window.lucide) window.lucide.createIcons();
          zjTodosUpdateStats();
        }

        // Sort preference is a UI setting kept in its own key (zj_todoSort); task data is never reordered in storage.
        function zjTodosApplySort(arr) {
          let mode = 'newest';
          try { mode = localStorage.getItem('zj_todoSort') || 'newest'; } catch (_) {}
          if (mode === 'newest') return arr;
          const pr = { high: 0, medium: 1, low: 2 };
          const out = arr.slice();
          if (mode === 'due') out.sort((a, b) => (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99'));
          else if (mode === 'priority') out.sort((a, b) => (pr[a.priority] ?? 1) - (pr[b.priority] ?? 1));
          else if (mode === 'alpha') out.sort((a, b) => String(a.text || '').localeCompare(String(b.text || ''), undefined, { sensitivity: 'base' }));
          return out;
        }
        function zjTodosSetSearch(q) { zjTodosSearchQuery = String(q || '').trim(); renderTodos(); }

        function addTodo(e) {
          e?.preventDefault?.();
          const text = (document.getElementById('todo-input')?.value || '').trim();
          const priority = document.getElementById('todo-priority')?.value || 'medium';
          const due = document.getElementById('todo-due')?.value || '';
          const errEl = document.getElementById('todo-form-error');
          if (!text) {
            if (errEl) { errEl.textContent = 'Enter a task title to add a task.'; errEl.hidden = false; }
            const inp = document.getElementById('todo-input');
            if (inp) { inp.setAttribute('aria-invalid', 'true'); inp.focus(); }
            return;
          }
          if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
          document.getElementById('todo-input')?.removeAttribute('aria-invalid');
          App.todos.unshift({ id: zjTodosMakeId(), text, done: false, priority, due, recurrence: 'none', tags: [], subtasks: [], createdAt: new Date().toISOString() });
          save();
          renderTodos();
          zjTodosSetInputValue('todo-input', '');
          zjTodosSetInputValue('todo-due', '');
          toast('Task saved', 'success');
          playSound(1000, 0.1, 'sine', 0.05, App.sound);
        }

        function editTodo(id) {
          const todo = App.todos.find((t) => t.id === id);
          if (!todo) return;
          zjTodosEnsureEditDialog();
          zjTodosSetInputValue('todo-edit-text', todo.text || '');
          zjTodosSetInputValue('todo-edit-due', todo.due || '');
          zjTodosSetInputValue('todo-edit-priority', todo.priority || 'medium');
          zjTodosSetInputValue('todo-edit-recurrence', todo.recurrence || 'none');
          zjTodosSetInputValue('todo-edit-tags', zjTodosGetTags(todo).join(', '));
          const dlg = document.getElementById('todo-edit-dialog');
          if (dlg) { dlg.dataset.todoId = id; dlg.showModal(); }
        }

        function toggleTodo(id) {
          const todo = App.todos.find((t) => t.id === id);
          if (!todo) return;
          const wasDone = todo.done;
          todo.done = !todo.done;
          todo.completedAt = todo.done ? new Date().toISOString() : null;
          if (todo.done && !wasDone) {
            zjTodosMaybeSpawnNextRecurrence(todo);
            playSound(1200, 0.1, 'triangle', 0.05, App.sound);
            triggerElectricPulse(document.querySelector('[data-action="todo-toggle:' + zjTodosCssEscape(id) + '"]'));
          }
          save();
          renderTodos();
        }

        function deleteTodo(id) {
          const idx = App.todos.findIndex((t) => t.id === id);
          if (idx < 0) return;
          const removed = App.todos.splice(idx, 1)[0];
          save();
          renderTodos();
          if (removed.spawnedNextId) {
            const parent = App.todos.find((t) => t.spawnedNextId === removed.id);
            if (parent) parent.spawnedNextId = null;
          }
          toast('Deleted task: ' + String(removed.text || '').slice(0, 40), 'warning', {
            label: 'Undo',
            onClick: () => { App.todos.splice(Math.min(idx, App.todos.length), 0, removed); save(); renderTodos(); },
          });
        }

        function filterTodos(f, evt) {
          App.todoFilter = f;
          const tabs = document.querySelectorAll('#tab-todo .tab');
          tabs.forEach((t) => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
          const hit = evt && evt.target && evt.target.closest ? evt.target.closest('.tab') : null;
          if (hit) { hit.classList.add('active'); hit.setAttribute('aria-selected', 'true'); }
          renderTodos();
        }

        function bindTodoActions() {
          zjTodosEnsureEditDialog();
          zjTodosWireEditDialog();
          document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action || '';
            if (action.startsWith('todo-toggle:')) { e.preventDefault(); toggleTodo(action.slice(12)); return; }
            if (action.startsWith('todo-edit:')) { e.preventDefault(); editTodo(action.slice(10)); return; }
            if (action.startsWith('todo-delete:')) { e.preventDefault(); deleteTodo(action.slice(12)); return; }
            if (action.startsWith('todo-sub-open:')) {
              e.preventDefault();
              zjTodosOpenSubtaskInputFor = action.slice(14);
              renderTodos();
              requestAnimationFrame(() => document.querySelector('[data-subtask-input]')?.focus());
              return;
            }
            if (action === 'todo-sub-cancel') { e.preventDefault(); zjTodosOpenSubtaskInputFor = null; renderTodos(); return; }
            if (action.startsWith('todo-sub-toggle:')) { e.preventDefault(); const [, tid, sid] = action.split(':'); zjTodosToggleSubtask(tid, sid); return; }
            if (action.startsWith('todo-sub-delete:')) { e.preventDefault(); const [, tid, sid] = action.split(':'); zjTodosDeleteSubtask(tid, sid); return; }
            if (action === 'todo-clear-tag') { e.preventDefault(); zjTodosActiveTag = null; renderTodos(); return; }
            if (action.startsWith('todo-tag:')) { e.preventDefault(); zjTodosActiveTag = action.slice(9) || null; renderTodos(); return; }
            if (action === 'todo-edit-cancel') { e.preventDefault(); document.getElementById('todo-edit-dialog')?.close(); return; }
            if (action === 'todo-edit-save') { e.preventDefault(); zjTodosSaveEditDialog(); return; }
          });
          document.addEventListener('keydown', (e) => {
            if (!e.target.matches?.('[data-subtask-input]')) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              const tid = e.target.dataset.subtaskInput;
              const text = e.target.value.trim();
              if (text) zjTodosAddSubtask(tid, text);
            } else if (e.key === 'Escape') {
              e.preventDefault(); zjTodosOpenSubtaskInputFor = null; renderTodos();
            }
          });
          let lastGTime = 0;
          document.addEventListener('keydown', (e) => { if ((e.key || '').toLowerCase() === 'g') lastGTime = Date.now(); }, true);
          document.addEventListener('keydown', (e) => {
            if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
            if ((e.key || '').toLowerCase() !== 'n') return;
            if (Date.now() - lastGTime < 1500) return;
            if (!document.getElementById('tab-todo')?.classList.contains('active')) return;
            const t = e.target;
            if (t && (t.matches?.('input, textarea, select') || t.isContentEditable)) return;
            e.preventDefault();
            document.getElementById('todo-input')?.focus();
          });
          window.addEventListener('zj:sync', (e) => { if (e.detail?.key === 'todos') renderTodos(); });
        }

        function zjTodosGetTags(todo) {
          if (!todo) return [];
          const t = todo.tags;
          if (Array.isArray(t)) return t.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
          if (typeof t === 'string') return t.split(',').map((s) => s.trim()).filter(Boolean);
          return [];
        }

        function zjTodosNormalize() {
          if (!Array.isArray(App.todos)) { App.todos = []; save(); return; }
          for (const t of App.todos) {
            if (!Array.isArray(t.subtasks)) t.subtasks = [];
            if (!Array.isArray(t.tags)) t.tags = zjTodosGetTags(t);
            if (!t.recurrence) t.recurrence = 'none';
          }
        }

        function zjTodosBuildItem(todo) {
          const wrapper = document.createElement('div');
          wrapper.style.marginBottom = '6px';
          const item = document.createElement('div');
          item.className = 'list-item';
          const left = document.createElement('div');
          left.style.cssText = 'display:flex;align-items:center;gap:10px;flex:1;';
          const check = document.createElement('div');
          check.setAttribute('role', 'checkbox');
          check.setAttribute('tabindex', '0');
          check.setAttribute('aria-checked', String(!!todo.done));
          check.style.cssText = 'width:16px;height:16px;border-radius:4px;flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
            'border:1.5px solid ' + (todo.done ? 'var(--accent-electric)' : 'var(--border)') + ';' +
            'background:' + (todo.done ? 'var(--accent-electric)' : 'transparent') + ';';
          check.dataset.action = 'todo-toggle:' + todo.id;
          if (todo.done) {
            const i = document.createElement('i');
            i.setAttribute('data-lucide', 'check');
            i.style.cssText = 'width:10px;height:10px;color:var(--bg-main);';
            check.appendChild(i);
          }
          check.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleTodo(todo.id); }
          });
          const body = document.createElement('div');
          body.style.cssText = 'flex:1;min-width:0;';
          const title = document.createElement('div');
          title.style.cssText = 'font-size:13px;margin-bottom:2px;color:' + (todo.done ? 'var(--text-dim)' : 'var(--text-main)') + ';text-decoration:' + (todo.done ? 'line-through' : 'none') + ';';
          title.textContent = String(todo.text || '');
          const meta = document.createElement('div');
          meta.style.cssText = 'font-size:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
          const prio = document.createElement('span');
          prio.style.cssText = 'text-transform:uppercase;font-weight:600;letter-spacing:.05em;color:' + (todo.priority === 'high' ? 'var(--color-solar)' : todo.priority === 'medium' ? 'var(--warning)' : 'var(--text-muted)') + ';';
          prio.textContent = String(todo.priority || 'medium');
          meta.appendChild(prio);
          if (todo.due) {
            const dueDate = new Date(todo.due + 'T12:00:00');
            if (!Number.isNaN(dueDate.getTime())) {
              const overdue = !todo.done && dueDate < new Date(new Date().toDateString());
              const dueEl = document.createElement('span');
              dueEl.style.color = overdue ? 'var(--danger)' : 'var(--text-muted)';
              dueEl.textContent = (overdue ? '⚠ ' : '') + dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              meta.appendChild(dueEl);
            }
          }
          const subs = Array.isArray(todo.subtasks) ? todo.subtasks : [];
          if (subs.length > 0) {
            const doneCount = subs.filter((s) => s.done).length;
            const progress = document.createElement('span');
            progress.style.cssText = 'color:var(--text-dim);font-weight:600;';
            progress.textContent = doneCount + '/' + subs.length;
            meta.appendChild(progress);
          }
          if (todo.recurrence && todo.recurrence !== 'none') {
            const rec = document.createElement('span');
            rec.style.color = 'var(--accent-secondary)';
            rec.textContent = '🔁 ' + todo.recurrence;
            meta.appendChild(rec);
          }
          for (const tag of zjTodosGetTags(todo)) {
            const chip = document.createElement('span');
            chip.style.cssText = 'padding:1px 6px;background:rgba(var(--rgb-primary),.1);color:var(--accent-electric);border-radius:8px;font-size:9px;';
            chip.textContent = '#' + tag;
            meta.appendChild(chip);
          }
          body.append(title, meta);
          left.append(check, body);
          const actions = document.createElement('div');
          actions.style.cssText = 'display:flex;gap:2px;';
          actions.appendChild(zjTodosMakeIconBtn('edit-2', 'todo-edit:' + todo.id, 'Edit task'));
          actions.appendChild(zjTodosMakeIconBtn('list-plus', 'todo-sub-open:' + todo.id, 'Add subtask'));
          actions.appendChild(zjTodosMakeIconBtn('trash-2', 'todo-delete:' + todo.id, 'Delete task'));
          item.append(left, actions);
          wrapper.appendChild(item);
          if (subs.length > 0) wrapper.appendChild(zjTodosBuildSubtaskList(todo, subs));
          if (zjTodosOpenSubtaskInputFor === todo.id) {
            const inputRow = document.createElement('div');
            inputRow.style.cssText = 'display:flex;gap:6px;margin-top:4px;padding-left:26px;';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input';
            input.placeholder = 'Subtask text — Enter to add, Esc to cancel';
            input.dataset.subtaskInput = todo.id;
            input.style.cssText = 'flex:1;font-size:12px;';
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'btn btn-secondary btn-sm';
            cancel.dataset.action = 'todo-sub-cancel';
            cancel.textContent = 'Cancel';
            inputRow.append(input, cancel);
            wrapper.appendChild(inputRow);
          }
          return wrapper;
        }

        function zjTodosBuildSubtaskList(todo, subs) {
          const list = document.createElement('div');
          list.style.cssText = 'padding-left:26px;margin-top:4px;display:flex;flex-direction:column;gap:3px;';
          for (const sub of subs) {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;color:' + (sub.done ? 'var(--text-dim)' : 'var(--text-main)') + ';';
            const chk = document.createElement('div');
            chk.style.cssText = 'width:12px;height:12px;border-radius:3px;flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
              'border:1.5px solid ' + (sub.done ? 'var(--accent-electric)' : 'var(--border)') + ';' +
              'background:' + (sub.done ? 'var(--accent-electric)' : 'transparent') + ';';
            chk.dataset.action = 'todo-sub-toggle:' + todo.id + ':' + sub.id;
            if (sub.done) {
              const i = document.createElement('i');
              i.setAttribute('data-lucide', 'check');
              i.style.cssText = 'width:8px;height:8px;color:var(--bg-main);';
              chk.appendChild(i);
            }
            const text = document.createElement('span');
            text.style.cssText = 'flex:1;' + (sub.done ? 'text-decoration:line-through;' : '');
            text.textContent = String(sub.text || '');
            const del = document.createElement('button');
            del.type = 'button';
            del.style.cssText = 'background:transparent;border:none;color:var(--text-dim);cursor:pointer;font-size:14px;line-height:1;padding:0 2px;';
            del.dataset.action = 'todo-sub-delete:' + todo.id + ':' + sub.id;
            del.textContent = '×';
            del.title = 'Delete subtask';
            row.append(chk, text, del);
            list.appendChild(row);
          }
          return list;
        }

        function zjTodosMakeIconBtn(iconName, action, label) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-icon';
          btn.style.cssText = 'width:24px;height:24px;';
          btn.dataset.action = action;
          btn.setAttribute('aria-label', label);
          btn.title = label;
          const i = document.createElement('i');
          i.setAttribute('data-lucide', iconName);
          i.style.cssText = 'width:10px;height:10px;';
          btn.appendChild(i);
          return btn;
        }

        function zjTodosAddSubtask(todoId, text) {
          const todo = App.todos.find((t) => t.id === todoId);
          if (!todo) return;
          if (!Array.isArray(todo.subtasks)) todo.subtasks = [];
          todo.subtasks.push({ id: zjTodosMakeId(), text, done: false });
          zjTodosOpenSubtaskInputFor = todoId;
          save();
          renderTodos();
          requestAnimationFrame(() => document.querySelector('[data-subtask-input]')?.focus());
        }

        function zjTodosToggleSubtask(todoId, subId) {
          const todo = App.todos.find((t) => t.id === todoId);
          if (!todo || !Array.isArray(todo.subtasks)) return;
          const sub = todo.subtasks.find((s) => s.id === subId);
          if (!sub) return;
          sub.done = !sub.done;
          if (sub.done && !todo.done && todo.subtasks.length > 0) {
            const allDone = todo.subtasks.every((s) => s.done);
            if (allDone) toast('All subtasks complete. Mark parent done?', 'success', { label: 'Complete', onClick: () => toggleTodo(todoId) });
          }
          save();
          renderTodos();
        }

        function zjTodosDeleteSubtask(todoId, subId) {
          const todo = App.todos.find((t) => t.id === todoId);
          if (!todo || !Array.isArray(todo.subtasks)) return;
          todo.subtasks = todo.subtasks.filter((s) => s.id !== subId);
          save();
          renderTodos();
        }

        function zjTodosMaybeSpawnNextRecurrence(todo) {
          if (!todo.recurrence || todo.recurrence === 'none') return;
          if (!todo.due) return;
          if (todo.spawnedNextId && App.todos.some((t) => t.id === todo.spawnedNextId)) return;
          const nextDue = zjTodosComputeNextDue(todo.due, todo.recurrence);
          if (!nextDue) return;
          const next = {
            id: zjTodosMakeId(), text: todo.text, done: false,
            priority: todo.priority || 'medium', due: nextDue,
            recurrence: todo.recurrence, tags: zjTodosGetTags(todo),
            subtasks: (Array.isArray(todo.subtasks) ? todo.subtasks : []).map((s) => ({ id: zjTodosMakeId(), text: s.text, done: false })),
            createdAt: new Date().toISOString(),
          };
          App.todos.unshift(next);
          todo.spawnedNextId = next.id;
          toast('Recurring task rescheduled for ' + zjTodosFormatDueShort(nextDue), 'info');
        }

        function zjTodosComputeNextDue(currentIso, recurrence) {
          const d = new Date(currentIso + 'T12:00:00Z');
          if (Number.isNaN(d.getTime())) return null;
          switch (recurrence) {
            case 'daily': d.setUTCDate(d.getUTCDate() + 1); break;
            case 'weekdays':
              d.setUTCDate(d.getUTCDate() + 1);
              while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
              break;
            case 'weekly': d.setUTCDate(d.getUTCDate() + 7); break;
            case 'monthly': d.setUTCMonth(d.getUTCMonth() + 1); break;
            default: return null;
          }
          return d.toISOString().slice(0, 10);
        }

        function zjTodosFormatDueShort(iso) {
          const d = new Date(iso + 'T12:00:00');
          return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        function zjTodosEnsureEditDialog() {
          if (document.getElementById('todo-edit-dialog')) return;
          const dialog = document.createElement('dialog');
          dialog.id = 'todo-edit-dialog';
          dialog.innerHTML = `
            <div class="modal-header">
              <div class="modal-title">Edit Task</div>
              <button type="button" class="btn-icon" data-action="todo-edit-cancel" style="width:28px;height:28px;" aria-label="Close">
                <i data-lucide="x" style="width:12px;height:12px;"></i>
              </button>
            </div>
            <div class="modal-body">
              <div style="display:flex;flex-direction:column;gap:10px;">
                <input type="text" id="todo-edit-text" class="input" placeholder="Task text">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                  <div>
                    <label class="text-xs text-muted" style="display:block;margin-bottom:4px;">Due date</label>
                    <input type="date" id="todo-edit-due" class="input">
                  </div>
                  <div>
                    <label class="text-xs text-muted" style="display:block;margin-bottom:4px;">Priority</label>
                    <select id="todo-edit-priority" class="input">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="text-xs text-muted" style="display:block;margin-bottom:4px;">Repeat</label>
                  <select id="todo-edit-recurrence" class="input">
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-muted" style="display:block;margin-bottom:4px;">Tags (comma-separated)</label>
                  <input type="text" id="todo-edit-tags" class="input" placeholder="work, urgent">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-action="todo-edit-cancel">Cancel</button>
              <button type="button" class="btn btn-primary" data-action="todo-edit-save">Save</button>
            </div>
          `;
          document.body.appendChild(dialog);
          if (window.lucide) window.lucide.createIcons();
        }

        function zjTodosWireEditDialog() {
          const dialog = document.getElementById('todo-edit-dialog');
          if (!dialog || dialog.dataset.wired === '1') return;
          dialog.dataset.wired = '1';
          dialog.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.matches?.('input[type="text"], input[type="date"]')) {
              e.preventDefault();
              zjTodosSaveEditDialog();
            }
          });
        }

        function zjTodosSaveEditDialog() {
          const dialog = document.getElementById('todo-edit-dialog');
          if (!dialog) return;
          const id = dialog.dataset.todoId;
          const todo = App.todos.find((t) => t.id === id);
          if (!todo) { dialog.close(); return; }
          const text = (document.getElementById('todo-edit-text')?.value || '').trim();
          if (!text) { toast('Task text required', 'error'); return; }
          todo.text = text;
          todo.due = document.getElementById('todo-edit-due')?.value || '';
          todo.priority = document.getElementById('todo-edit-priority')?.value || 'medium';
          todo.recurrence = document.getElementById('todo-edit-recurrence')?.value || 'none';
          todo.tags = (document.getElementById('todo-edit-tags')?.value || '').split(',').map((s) => s.trim()).filter(Boolean);
          if (todo.recurrence !== 'none' && !todo.due) {
            todo.due = zjTodosTodayIso();
            toast('Recurring tasks need a due date — set to today.', 'info');
          }
          save();
          renderTodos();
          dialog.close();
          toast('Task updated', 'success');
        }

        function zjTodosRenderTagChips() {
          const container = zjTodosEnsureTagChipsContainer();
          if (!container) return;
          const allTags = new Set();
          for (const t of App.todos) for (const tag of zjTodosGetTags(t)) allTags.add(tag);
          container.replaceChildren();
          if (allTags.size === 0) { container.style.display = 'none'; return; }
          container.style.display = 'flex';
          container.appendChild(zjTodosMakeTagChip('All', null, zjTodosActiveTag === null));
          for (const tag of [...allTags].sort((a, b) => a.localeCompare(b))) {
            container.appendChild(zjTodosMakeTagChip(tag, tag, zjTodosActiveTag === tag));
          }
        }

        function zjTodosEnsureTagChipsContainer() {
          let el = document.getElementById('todo-tag-chips');
          if (el) return el;
          const list = document.getElementById('todo-list');
          if (!list || !list.parentNode) return null;
          el = document.createElement('div');
          el.id = 'todo-tag-chips';
          el.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;';
          list.parentNode.insertBefore(el, list);
          return el;
        }

        function zjTodosMakeTagChip(label, tag, isActive) {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.textContent = label;
          chip.style.cssText = [
            'padding:4px 10px','font-size:11px','border-radius:999px','cursor:pointer','transition:all .2s','font-family:inherit',
            'border:1px solid ' + (isActive ? 'var(--accent-electric)' : 'var(--border)'),
            'background:' + (isActive ? 'rgba(var(--rgb-primary),.1)' : 'transparent'),
            'color:' + (isActive ? 'var(--accent-electric)' : 'var(--text-muted)'),
          ].join(';');
          chip.dataset.action = tag === null ? 'todo-clear-tag' : 'todo-tag:' + tag;
          return chip;
        }

        function zjTodosUpdateStats() {
          window.dispatchEvent(new Event('zj:todos-rendered'));
          const total = App.todos.length;
          const done = App.todos.filter((t) => t.done).length;
          const week = App.todos.filter((t) => t.done && t.completedAt && Date.now() - new Date(t.completedAt).getTime() < 7 * 86400000).length;
          const rate = total > 0 ? Math.round((done / total) * 100) : 0;
          animateValue(document.getElementById('todo-stat-total'), 0, total, 600);
          animateValue(document.getElementById('todo-stat-done'), 0, done, 600);
          animateValue(document.getElementById('todo-stat-week'), 0, week, 600);
          animateValue(document.getElementById('todo-stat-rate'), 0, rate, 600, true);
        }

        function zjTodosSetInputValue(id, value) {
          const el = document.getElementById(id);
          if (el) el.value = String(value ?? '');
        }

        function zjTodosMakeId() {
          return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Date.now().toString();
        }

        function zjTodosTodayIso() {
          const d = new Date();
          return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }

        function zjTodosCssEscape(s) {
          return (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
        }

        /* ============ js/habits.js ============ */
        function renderHabits() {
          zjHabitsNormalize();
          const list = document.getElementById('habit-list');
          if (!list) return;
          const today = zjHabitsTodayString();
          const doneCount = App.habits.filter((h) => h.lastDone === today).length;
          const badge = document.getElementById('habit-badge');
          if (badge) badge.textContent = String(doneCount);
          if (App.habits.length === 0) {
            list.replaceChildren();
            const wrap = document.createElement('div');
            wrap.innerHTML = createEmptyState('target', 'No habits yet', 'Track daily habits and build streaks');
            list.appendChild(wrap);
            if (window.lucide) window.lucide.createIcons();
            updateHabitInsights();
            return;
          }
          list.replaceChildren();
          for (const habit of App.habits) list.appendChild(zjHabitsBuildItem(habit, today));
          if (window.lucide) window.lucide.createIcons();
          updateHabitInsights();
        }

        function saveHabit() {
          const name = (document.getElementById('habit-name')?.value || '').trim();
          const icon = (document.getElementById('habit-icon')?.value || '').trim();
          if (!name) { toast('Name required', 'error'); return; }
          App.habits.push({ id: zjHabitsMakeId(), name, icon, streak: 0, longestStreak: 0, lastDone: null, history: [], createdAt: new Date().toISOString() });
          save();
          renderHabits();
          document.getElementById('habit-dialog')?.close();
          const nameEl = document.getElementById('habit-name'); if (nameEl) nameEl.value = '';
          const iconEl = document.getElementById('habit-icon'); if (iconEl) iconEl.value = '';
          toast('Habit created', 'success');
          playSound(1000, 0.1, 'sine', 0.05, App.sound);
        }

        function toggleHabit(id) {
          const habit = App.habits.find((h) => h.id === id);
          if (!habit) return;
          const today = zjHabitsTodayString();
          if (habit.lastDone === today) {
            habit.lastDone = null;
            habit.history = (habit.history || []).filter((d) => d !== today);
          } else {
            habit.lastDone = today;
            habit.history = [...(habit.history || []), today];
            playSound(1200, 0.15, 'triangle', 0.05, App.sound);
            triggerElectricPulse(document.querySelector('[data-action="habit-toggle:' + zjHabitsCssEscape(id) + '"]'));
          }
          zjHabitsRecomputeStreaks(habit);
          save();
          renderHabits();
        }

        function deleteHabit(id) {
          const idx = App.habits.findIndex((h) => h.id === id);
          if (idx < 0) return;
          const removed = App.habits.splice(idx, 1)[0];
          save();
          renderHabits();
          toast('Deleted habit: ' + String(removed.name || '').slice(0, 40), 'warning', {
            label: 'Undo',
            onClick: () => { App.habits.splice(Math.min(idx, App.habits.length), 0, removed); save(); renderHabits(); },
          });
        }

        function exportHabitData(format) {
          const habits = App.habits || [];
          if (format === 'json') {
            downloadText('zj-habits.json', JSON.stringify(habits, null, 2), 'application/json');
            return;
          }
          const header = ['name', 'icon', 'streak', 'longestStreak', 'lastDone', 'history', 'createdAt'];
          const rows = habits.map((h) => [h.name || '', h.icon || '', h.streak || 0, h.longestStreak || 0, h.lastDone || '', Array.isArray(h.history) ? h.history.join(';') : '', h.createdAt || '']);
          const csv = [header, ...rows].map((r) => r.map(zjHabitsCsvCell).join(',')).join('\n');
          downloadText('zj-habits.csv', csv, 'text/csv');
        }

        function openHabitReflection() {
          const el = document.getElementById('habit-reflection');
          if (!el) return;
          const habits = App.habits || [];
          const today = zjHabitsTodayString();
          const done = habits.filter((h) => h.lastDone === today).length;
          const top = [...habits].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];
          el.replaceChildren();
          const strong = document.createElement('strong');
          strong.textContent = 'This week, reflect: ';
          el.appendChild(strong);
          el.appendChild(document.createTextNode('What made habits easier or harder? You completed ' + done + ' of ' + habits.length + ' habits today.'));
          if (top && (top.streak || 0) > 0) {
            el.appendChild(document.createTextNode(' Your longest current streak is "' + String(top.name || '') + '" at ' + top.streak + ' day' + (top.streak === 1 ? '' : 's') + '.'));
          }
          el.appendChild(document.createTextNode(' Choose one small adjustment for tomorrow.'));
        }

        function updateHabitInsights() {
          const el = document.getElementById('habit-insights');
          if (!el) return;
          const habits = App.habits || [];
          if (habits.length === 0) { el.textContent = 'Track habits to see your progress.'; return; }
          const today = zjHabitsTodayString();
          const done = habits.filter((h) => h.lastDone === today).length;
          const completions = habits.reduce((n, h) => n + (Array.isArray(h.history) ? h.history.length : 0), 0);
          const best = habits.reduce((a, h) => ((h.streak || 0) > (a?.streak || 0) ? h : a), null);
          const parts = [
            done + '/' + habits.length + ' habits completed today',
            completions + ' total recorded completions',
            best && (best.streak || 0) > 0 ? 'longest active streak: ' + best.streak + ' day' + (best.streak === 1 ? '' : 's') + ' (' + best.name + ')' : 'start a streak today',
            'Data stays in this browser profile.',
          ];
          el.textContent = parts.join(' · ');
        }

        function bindHabitActions() {
          document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action || '';
            if (action.startsWith('habit-toggle:')) { e.preventDefault(); toggleHabit(action.slice(13)); return; }
            if (action.startsWith('habit-delete:')) { e.preventDefault(); deleteHabit(action.slice(13)); return; }
          });
          window.addEventListener('zj:sync', (e) => { if (e.detail?.key === 'habits') renderHabits(); });
        }

        function zjHabitsBuildItem(habit, today) {
          const isDoneToday = habit.lastDone === today;
          const item = document.createElement('div');
          item.className = 'habit-item' + (isDoneToday ? ' done-today' : '');
          const check = document.createElement('button');
          check.type = 'button';
          check.className = 'habit-check' + (isDoneToday ? ' done' : '');
          check.dataset.action = 'habit-toggle:' + habit.id;
          check.setAttribute('aria-label', isDoneToday ? 'Uncheck ' + habit.name : 'Check in ' + habit.name);
          check.setAttribute('aria-pressed', String(isDoneToday));
          if (isDoneToday) {
            const i = document.createElement('i');
            i.setAttribute('data-lucide', 'check');
            i.style.cssText = 'width:14px;height:14px;';
            check.appendChild(i);
          }
          const info = document.createElement('div');
          info.className = 'habit-info';
          const nameEl = document.createElement('div');
          nameEl.className = 'habit-name';
          nameEl.textContent = (habit.icon || '🎯') + ' ' + (habit.name || '');
          const streakEl = document.createElement('div');
          streakEl.className = 'habit-streak';
          const streak = habit.streak || 0;
          streakEl.textContent = '🔥 ' + streak + ' day' + (streak === 1 ? '' : 's') + ' streak';
          const weekEl = document.createElement('div');
          weekEl.className = 'habit-week';
          const history = new Set(Array.isArray(habit.history) ? habit.history : []);
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const day = document.createElement('div');
            day.className = 'habit-day' + (history.has(d.toDateString()) ? ' done' : '');
            day.textContent = String(d.getDate());
            weekEl.appendChild(day);
          }
          info.append(nameEl, streakEl, weekEl);
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'btn-icon';
          delBtn.style.cssText = 'width:24px;height:24px;flex-shrink:0;';
          delBtn.dataset.action = 'habit-delete:' + habit.id;
          delBtn.setAttribute('aria-label', 'Delete ' + habit.name);
          delBtn.title = 'Delete habit';
          const delIcon = document.createElement('i');
          delIcon.setAttribute('data-lucide', 'trash-2');
          delIcon.style.cssText = 'width:10px;height:10px;';
          delBtn.appendChild(delIcon);
          item.append(check, info, delBtn);
          return item;
        }

        function zjHabitsNormalize() {
          if (!Array.isArray(App.habits)) { App.habits = []; save(); return; }
          for (const habit of App.habits) {
            if (!Array.isArray(habit.history)) habit.history = [];
            if (typeof habit.lastDone !== 'string') habit.lastDone = null;
            zjHabitsRecomputeStreaks(habit);
          }
        }

        function zjHabitsRecomputeStreaks(habit) {
          const history = new Set(Array.isArray(habit.history) ? habit.history : []);
          const today = zjHabitsTodayString();
          let streak = 0;
          const cursor = new Date();
          if (!history.has(today)) cursor.setDate(cursor.getDate() - 1);
          const maxWalk = history.size + 1;
          while (history.has(cursor.toDateString()) && streak < maxWalk) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
          }
          habit.streak = streak;
          let longest = 0;
          for (const dateStr of history) {
            const start = new Date(dateStr);
            if (Number.isNaN(start.getTime())) continue;
            const prev = new Date(start);
            prev.setDate(prev.getDate() - 1);
            if (history.has(prev.toDateString())) continue;
            let len = 0;
            const walk = new Date(start);
            while (history.has(walk.toDateString()) && len < maxWalk) {
              len++;
              walk.setDate(walk.getDate() + 1);
            }
            if (len > longest) longest = len;
          }
          habit.longestStreak = Math.max(habit.longestStreak || 0, longest);
        }

        function zjHabitsTodayString() { return new Date().toDateString(); }

        function zjHabitsMakeId() {
          return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Date.now().toString();
        }

        function zjHabitsCsvCell(v) {
          const s = String(v ?? '');
          return '"' + s.replace(/"/g, '""') + '"';
        }

        function zjHabitsCssEscape(s) {
          return (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
        }

        /* ============ js/bookmarks.js ============ */
        let zjBookmarksSearch = '';
        let zjBookmarksActiveTag = null;
        const ZJ_BOOKMARKS_ALLOWED_SCHEMES = new Set(['http:', 'https:']);

        function renderBookmarks() {
          zjBookmarksNormalize();
          const list = document.getElementById('bookmark-list');
          if (!list) return;
          zjBookmarksRenderTagChips();
          const filtered = zjBookmarksApplyFilters(App.bookmarks);
          if (filtered.length === 0) {
            list.replaceChildren();
            const wrap = document.createElement('div');
            wrap.innerHTML = createEmptyState(
              'bookmark',
              App.bookmarks.length === 0 ? 'No bookmarks yet' : 'No bookmarks match your filter',
              App.bookmarks.length === 0 ? 'Save links for quick access' : 'Try a different search or clear the tag filter'
            );
            list.appendChild(wrap);
            if (window.lucide) window.lucide.createIcons();
            return;
          }
          list.replaceChildren();
          for (const bookmark of filtered) list.appendChild(zjBookmarksBuildItem(bookmark));
          if (window.lucide) window.lucide.createIcons();
        }

        function saveBookmark() {
          const rawTitle = (document.getElementById('bookmark-title')?.value || '').trim();
          const rawUrl = (document.getElementById('bookmark-url')?.value || '').trim();
          const rawTags = (document.getElementById('bookmark-tags')?.value || '').trim();
          if (!rawTitle || !rawUrl) { toast('Title and URL are required', 'error'); return; }
          const url = zjBookmarksNormalizeUrl(rawUrl);
          if (!url) { toast('Enter a valid http:// or https:// URL', 'error'); return; }
          const tags = rawTags.split(',').map((s) => s.trim()).filter(Boolean);
          App.bookmarks.push({ id: zjBookmarksMakeId(), title: rawTitle, url, tags, createdAt: new Date().toISOString() });
          save();
          renderBookmarks();
          document.getElementById('bookmark-dialog')?.close();
          ['bookmark-title', 'bookmark-url', 'bookmark-tags'].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
          toast('Bookmark saved', 'success');
        }

        function searchBookmarks(q) { zjBookmarksSearch = String(q || ''); renderBookmarks(); }

        function deleteBookmark(id) {
          const idx = App.bookmarks.findIndex((b) => b.id === id);
          if (idx < 0) return;
          const removed = App.bookmarks.splice(idx, 1)[0];
          save();
          renderBookmarks();
          toast('Deleted bookmark: ' + String(removed.title || '').slice(0, 40), 'warning', {
            label: 'Undo',
            onClick: () => { App.bookmarks.splice(Math.min(idx, App.bookmarks.length), 0, removed); save(); renderBookmarks(); },
          });
        }

        function bindBookmarkActions() {
          document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action || '';
            if (action.startsWith('bookmark-delete:')) { e.preventDefault(); deleteBookmark(action.slice(16)); return; }
            if (action === 'bookmark-clear-tag') { e.preventDefault(); zjBookmarksActiveTag = null; renderBookmarks(); return; }
            if (action.startsWith('bookmark-tag:')) { e.preventDefault(); zjBookmarksActiveTag = action.slice(13) || null; renderBookmarks(); return; }
          });
          let lastGTime = 0;
          document.addEventListener('keydown', (e) => { if ((e.key || '').toLowerCase() === 'g') lastGTime = Date.now(); }, true);
          document.addEventListener('keydown', (e) => {
            if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
            if ((e.key || '').toLowerCase() !== 'n') return;
            if (Date.now() - lastGTime < 1500) return;
            if (!document.getElementById('tab-bookmarks')?.classList.contains('active')) return;
            const t = e.target;
            if (t && (t.matches?.('input, textarea, select') || t.isContentEditable)) return;
            e.preventDefault();
            document.getElementById('bookmark-dialog')?.showModal();
          });
          window.addEventListener('zj:sync', (e) => { if (e.detail?.key === 'bookmarks') renderBookmarks(); });
        }

        function zjBookmarksGetTags(bookmark) {
          if (!bookmark) return [];
          const t = bookmark.tags;
          if (Array.isArray(t)) return t.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
          if (typeof t === 'string') return t.split(',').map((s) => s.trim()).filter(Boolean);
          return [];
        }

        function zjBookmarksNormalizeUrl(raw) {
          let s = String(raw || '').trim();
          if (!s) return null;
          if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s) && !/\s/.test(s) && s.includes('.')) s = 'https://' + s;
          try {
            const u = new URL(s);
            if (!ZJ_BOOKMARKS_ALLOWED_SCHEMES.has(u.protocol)) return null;
            if (!u.hostname) return null;
            return u.toString();
          } catch (_) { return null; }
        }

        function zjBookmarksHostnameOf(url) {
          try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return ''; }
        }

        function zjBookmarksNormalize() {
          if (!Array.isArray(App.bookmarks)) { App.bookmarks = []; save(); return; }
          for (const b of App.bookmarks) { if (!Array.isArray(b.tags)) b.tags = zjBookmarksGetTags(b); }
        }

        function zjBookmarksApplyFilters(bookmarks) {
          let out = bookmarks;
          if (zjBookmarksSearch) {
            const q = zjBookmarksSearch.toLowerCase();
            out = out.filter((b) => (b.title || '').toLowerCase().includes(q) || (b.url || '').toLowerCase().includes(q) || zjBookmarksGetTags(b).some((t) => t.toLowerCase().includes(q)));
          }
          if (zjBookmarksActiveTag !== null) out = out.filter((b) => zjBookmarksGetTags(b).includes(zjBookmarksActiveTag));
          return out;
        }

        function zjBookmarksBuildItem(bookmark) {
          const item = document.createElement('div');
          item.className = 'bookmark-item';
          const icon = document.createElement('div');
          icon.className = 'bookmark-icon';
          const iconSvg = document.createElement('i');
          iconSvg.setAttribute('data-lucide', 'link');
          iconSvg.style.cssText = 'width:14px;height:14px;';
          icon.appendChild(iconSvg);
          const info = document.createElement('div');
          info.className = 'bookmark-info';
          const title = document.createElement('div');
          title.className = 'bookmark-title';
          title.textContent = String(bookmark.title || 'Untitled');
          const host = zjBookmarksHostnameOf(bookmark.url);
          if (host) {
            const source = document.createElement('span');
            source.style.cssText = 'font-size:9px;color:var(--text-dim);font-weight:400;margin-left:6px;text-transform:lowercase;letter-spacing:0;';
            source.textContent = '· ' + host;
            title.appendChild(source);
          }
          const url = document.createElement('a');
          url.className = 'bookmark-url';
          url.href = bookmark.url;
          url.target = '_blank';
          url.rel = 'noopener noreferrer';
          url.textContent = String(bookmark.url || '');
          info.append(title, url);
          const tags = zjBookmarksGetTags(bookmark);
          if (tags.length) {
            const tagsRow = document.createElement('div');
            tagsRow.className = 'bookmark-tags';
            for (const tag of tags) {
              const chip = document.createElement('span');
              chip.className = 'bookmark-tag';
              chip.textContent = tag;
              tagsRow.appendChild(chip);
            }
            info.appendChild(tagsRow);
          }
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'btn-icon';
          delBtn.style.cssText = 'width:24px;height:24px;flex-shrink:0;';
          delBtn.dataset.action = 'bookmark-delete:' + bookmark.id;
          delBtn.setAttribute('aria-label', 'Delete ' + (bookmark.title || 'bookmark'));
          delBtn.title = 'Delete bookmark';
          const delIcon = document.createElement('i');
          delIcon.setAttribute('data-lucide', 'trash-2');
          delIcon.style.cssText = 'width:10px;height:10px;';
          delBtn.appendChild(delIcon);
          item.append(icon, info, delBtn);
          return item;
        }

        function zjBookmarksRenderTagChips() {
          const container = zjBookmarksEnsureTagChipsContainer();
          if (!container) return;
          const allTags = new Set();
          for (const b of App.bookmarks) for (const tag of zjBookmarksGetTags(b)) allTags.add(tag);
          container.replaceChildren();
          if (allTags.size === 0) { container.style.display = 'none'; return; }
          container.style.display = 'flex';
          container.appendChild(zjBookmarksMakeTagChip('All', null, zjBookmarksActiveTag === null));
          for (const tag of [...allTags].sort((a, b) => a.localeCompare(b))) {
            container.appendChild(zjBookmarksMakeTagChip(tag, tag, zjBookmarksActiveTag === tag));
          }
        }

        function zjBookmarksEnsureTagChipsContainer() {
          let el = document.getElementById('bookmark-tag-chips');
          if (el) return el;
          const list = document.getElementById('bookmark-list');
          if (!list || !list.parentNode) return null;
          el = document.createElement('div');
          el.id = 'bookmark-tag-chips';
          el.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;';
          list.parentNode.insertBefore(el, list);
          return el;
        }

        function zjBookmarksMakeTagChip(label, tag, isActive) {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.textContent = label;
          chip.style.cssText = [
            'padding:4px 10px','font-size:11px','border-radius:999px','cursor:pointer','transition:all .2s','font-family:inherit',
            'border:1px solid ' + (isActive ? 'var(--accent-electric)' : 'var(--border)'),
            'background:' + (isActive ? 'rgba(var(--rgb-primary),.1)' : 'transparent'),
            'color:' + (isActive ? 'var(--accent-electric)' : 'var(--text-muted)'),
          ].join(';');
          chip.dataset.action = tag === null ? 'bookmark-clear-tag' : 'bookmark-tag:' + tag;
          return chip;
        }

        function zjBookmarksMakeId() {
          return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Date.now().toString();
        }

        /* ============ js/gallery.js ============ */
        const ZJ_GALLERY_DEFAULTS = [
          { id: 'default-portrait', title: 'Portrait', caption: 'Neural Interface', source: 'url', url: 'ZJPP.jpeg', fallback: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80', isDefault: true },
          { id: 'default-bmw', title: 'BMW M-Series', caption: 'Cyber Vehicle', source: 'url', url: 'bmw.jpeg', fallback: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80', isDefault: true },
        ];
        const ZJ_GALLERY_TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

        let zjGalleryIdbPromise = null;

        // Native IndexedDB adapter: avoids relying on an external CDN module.
        // It provides the same get/set/del/keys methods used by the Gallery.
        function zjGalleryLoadIdb() {
          if (!zjGalleryIdbPromise) {
            zjGalleryIdbPromise = new Promise((resolve) => {
              if (!('indexedDB' in window)) {
                console.warn('zj-os: IndexedDB is unavailable; Gallery will use its small-image fallback.');
                resolve(null);
                return;
              }

              let request;
              try {
                request = window.indexedDB.open('zj-os-gallery', 1);
              } catch (err) {
                console.warn('zj-os: could not open Gallery storage:', err);
                resolve(null);
                return;
              }

              request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('images')) {
                  db.createObjectStore('images');
                }
              };

              request.onsuccess = () => {
                const db = request.result;
                const run = (mode, operation) => new Promise((resolveOp, rejectOp) => {
                  let tx;
                  try {
                    tx = db.transaction('images', mode);
                    const req = operation(tx.objectStore('images'));
                    req.onsuccess = () => resolveOp(req.result);
                    req.onerror = () => rejectOp(req.error || new Error('IndexedDB request failed'));
                    tx.onerror = () => rejectOp(tx.error || new Error('IndexedDB transaction failed'));
                    tx.onabort = () => rejectOp(tx.error || new Error('IndexedDB transaction aborted'));
                  } catch (err) {
                    rejectOp(err);
                  }
                });

                resolve({
                  get: (key) => run('readonly', (store) => store.get(key)),
                  set: (key, value) => run('readwrite', (store) => store.put(value, key)).then(() => true),
                  del: (key) => run('readwrite', (store) => store.delete(key)).then(() => true),
                  keys: () => run('readonly', (store) => store.getAllKeys())
                });
              };

              request.onerror = () => {
                console.warn('zj-os: native IndexedDB could not be opened:', request.error);
                resolve(null);
              };

              request.onblocked = () => {
                console.warn('zj-os: Gallery storage upgrade is blocked by another open tab.');
              };
            });
          }
          return zjGalleryIdbPromise;
        }

        const zjGalleryBlobCache = new Map();
        let zjGalleryFilterQuery = '';
        let zjGallerySortMode = 'default';
        let zjGalleryLightboxIndex = -1;
        let zjGalleryReadyPromise = null;

        function zjGalleryEnsureReady() {
          if (!zjGalleryReadyPromise) {
            zjGalleryReadyPromise = (async () => {
              try { await zjGalleryMigrateIfNeeded(); } catch (err) { console.warn('zj-os: gallery migration failed', err); }
              zjGalleryCleanupOrphans().catch((err) => console.warn('zj-os: orphan cleanup failed', err));
            })();
          }
          return zjGalleryReadyPromise;
        }

        async function zjGalleryMigrateIfNeeded() {
          if (!Array.isArray(App.images)) App.images = [];
          const idb = await zjGalleryLoadIdb();
          const arr = App.images.slice();
          let mutated = false;
          for (let i = 0; i < arr.length; i++) {
            const e = arr[i];
            if (!e || typeof e !== 'object') continue;
            if ('source' in e) continue;
            const url = typeof e.url === 'string' ? e.url : '';
            const id = zjGalleryNewId();
            if (url.startsWith('data:')) {
              if (!idb) { arr[i] = { id, title: e.title || 'Untitled', caption: e.caption || '', source: 'url', url }; mutated = true; continue; }
              try { await idb.set(id, url); arr[i] = { id, title: e.title || 'Untitled', caption: e.caption || '', source: 'idb' }; mutated = true; }
              catch (err) { console.warn('zj-os: gallery migration failed', err); }
            } else if (url) {
              arr[i] = { id, title: e.title || 'Untitled', caption: e.caption || '', source: 'url', url };
              mutated = true;
            }
          }
          const customs = arr.filter((e) => e && !e.isDefault);
          const portrait = arr.find((e) => e && e.id === ZJ_GALLERY_DEFAULTS[0].id) || { ...ZJ_GALLERY_DEFAULTS[0] };
          const bmw = arr.find((e) => e && e.id === ZJ_GALLERY_DEFAULTS[1].id) || { ...ZJ_GALLERY_DEFAULTS[1] };
          const rebuilt = [portrait, bmw, ...customs];
          if (mutated || rebuilt.length !== App.images.length) { App.images = rebuilt; save(); }
          else App.images = rebuilt;
        }

        async function zjGalleryCleanupOrphans() {
          const idb = await zjGalleryLoadIdb();
          if (!idb) return;
          const allIds = await idb.keys();
          const inUse = new Set((App.images || []).filter((e) => e && e.source === 'idb').map((e) => e.id));
          for (const id of allIds) if (!inUse.has(id)) { try { await idb.del(id); } catch (_) {} }
        }

        async function zjGalleryGetImageSrc(entry) {
          if (!entry) return '';
          if (typeof entry.url === 'string' && entry.url) return window.ZJ_IMAGE(entry.url);
          if (entry.source === 'idb' && entry.id) {
            if (zjGalleryBlobCache.has(entry.id)) return zjGalleryBlobCache.get(entry.id);
            const idb = await zjGalleryLoadIdb();
            if (!idb) return '';
            try {
              const blob = await idb.get(entry.id);
              if (typeof blob === 'string') { zjGalleryBlobCache.set(entry.id, blob); return blob; }
            } catch (err) { console.warn('zj-os: gallery blob load failed', err); }
          }
          return '';
        }

        function zjGalleryComputeView() {
          let view = (App.images || []).slice();
          if (zjGalleryFilterQuery) {
            const q = zjGalleryFilterQuery.toLowerCase();
            view = view.filter((e) => (e.title || '').toLowerCase().includes(q) || (e.caption || '').toLowerCase().includes(q));
          }
          if (zjGallerySortMode === 'name') view = view.slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));
          return view;
        }

        async function renderGallery() {
          await zjGalleryEnsureReady();
          const grid = document.getElementById('gallery-full-grid');
          if (!grid) return;
          const view = zjGalleryComputeView();
          if (view.length === 0) {
            grid.replaceChildren();
            const wrap = document.createElement('div');
            wrap.style.gridColumn = '1 / -1';
            wrap.innerHTML = createEmptyState('image', (App.images || []).length === 0 ? 'No images yet' : 'No images match your filter', (App.images || []).length === 0 ? 'Add a URL or upload a photo' : 'Try a different search');
            grid.appendChild(wrap);
            if (window.lucide) window.lucide.createIcons();
            return;
          }
          grid.replaceChildren();
          for (const entry of view) grid.appendChild(zjGalleryBuildItem(entry));
          if (window.lucide) window.lucide.createIcons();
          for (const entry of view) {
            if (entry.source === 'url' && entry.url) continue;
            zjGalleryGetImageSrc(entry).then((src) => {
              if (!src) return;
              const img = grid.querySelector('img[data-gallery-id="' + zjGalleryCssEscape(entry.id) + '"]');
              if (img) img.src = src;
            });
          }
        }

        function zjGalleryBuildItem(entry) {
          const item = document.createElement('div');
          item.className = 'gallery-item';
          item.style.height = '180px';
          item.dataset.action = 'gallery-open:' + entry.id;
          item.style.cursor = 'pointer';
          const img = document.createElement('img');
          img.alt = String(entry.title || '');
          img.dataset.galleryId = entry.id || '';
          if (entry.source === 'url' && entry.url) {
            img.src = window.ZJ_IMAGE(entry.url);
            img.addEventListener('error', () => { if (entry.fallback) img.src = entry.fallback; }, { once: true });
          }
          item.appendChild(img);
          const overlay = document.createElement('div');
          overlay.className = 'gallery-overlay';
          const overlayText = document.createElement('div');
          overlayText.className = 'gallery-overlay-text';
          overlayText.textContent = String(entry.title || 'Untitled');
          overlay.appendChild(overlayText);
          if (entry.caption) {
            const cap = document.createElement('div');
            cap.className = 'gallery-overlay-caption';
            cap.textContent = String(entry.caption);
            overlay.appendChild(cap);
          }
          item.appendChild(overlay);
          if (!entry.isDefault) {
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'btn-icon';
            delBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:24px;height:24px;background:rgba(var(--rgb-sidebar),0.85);z-index:2;';
            delBtn.dataset.action = 'gallery-delete:' + entry.id;
            delBtn.setAttribute('aria-label', 'Delete image');
            delBtn.title = 'Delete image';
            const delIcon = document.createElement('i');
            delIcon.setAttribute('data-lucide', 'trash-2');
            delIcon.style.cssText = 'width:10px;height:10px;';
            delBtn.appendChild(delIcon);
            item.appendChild(delBtn);
          }
          return item;
        }

        async function openLightbox(arg) {
          await zjGalleryEnsureReady();
          const arr = App.images || [];
          let idx = -1;
          if (typeof arg === 'number') idx = arg;
          else if (typeof arg === 'string') idx = arr.findIndex((e) => e && e.id === arg);
          if (idx < 0 || idx >= arr.length) return;
          zjGalleryLightboxIndex = idx;
          const entry = arr[idx];
          const imgEl = document.getElementById('lightbox-img');
          const capEl = document.getElementById('lightbox-caption');
          if (!imgEl) return;
          imgEl.src = ZJ_GALLERY_TRANSPARENT;
          imgEl.alt = String(entry.title || '');
          const src = await zjGalleryGetImageSrc(entry);
          if (src) { imgEl.src = src; imgEl.alt = String(entry.title || ''); }
          else imgEl.alt = 'Image unavailable';
          if (capEl) capEl.textContent = String(entry.title || '') + (entry.caption ? ' — ' + entry.caption : '');
          document.getElementById('lightbox')?.classList.add('active');
        }

        function closeLightbox() {
          document.getElementById('lightbox')?.classList.remove('active');
          zjGalleryLightboxIndex = -1;
        }

        async function nextImage() {
          const n = (App.images || []).length;
          if (n === 0 || zjGalleryLightboxIndex < 0) return;
          await openLightbox((zjGalleryLightboxIndex + 1) % n);
        }

        async function prevImage() {
          const n = (App.images || []).length;
          if (n === 0 || zjGalleryLightboxIndex < 0) return;
          await openLightbox((zjGalleryLightboxIndex - 1 + n) % n);
        }

        async function handleImageUpload(event) {
          const input = event.target;
          const files = Array.from(input?.files || []);
          if (input) input.value = '';
          if (files.length === 0) return;
          await zjGalleryEnsureReady();
          const idb = await zjGalleryLoadIdb();
          let succeeded = 0, failed = 0;
          for (const file of files) {
            try {
              const dataUrl = await zjGalleryReadFileAsDataURL(file);
              const id = zjGalleryNewId();
              const title = (file.name || 'Uploaded').replace(/\.[^.]+$/, '').trim() || 'Uploaded';
              if (idb) {
                await idb.set(id, dataUrl);
                zjGalleryBlobCache.set(id, dataUrl);
                App.images.push({ id, title, caption: 'Uploaded', source: 'idb' });
              } else {
                if (dataUrl.length > 500000) throw new Error('Image too large');
                App.images.push({ id, title, caption: 'Uploaded', source: 'url', url: dataUrl });
              }
              succeeded++;
            } catch (err) { console.error('zj-os: image upload failed', err); failed++; }
          }
          save();
          await renderGallery();
          if (succeeded > 0) toast(succeeded + ' image' + (succeeded === 1 ? '' : 's') + ' uploaded', 'success');
          if (failed > 0) toast(failed + ' image' + (failed === 1 ? '' : 's') + ' failed to upload', 'error');
        }

        function addCustomImage() {
          const title = (document.getElementById('image-title')?.value || '').trim();
          const rawUrl = (document.getElementById('image-url')?.value || '').trim();
          const caption = (document.getElementById('image-caption')?.value || '').trim();
          if (!title || !rawUrl) { toast('Title and URL are required', 'error'); return; }
          if (!/^https?:\/\//i.test(rawUrl)) { toast('Enter an http:// or https:// URL', 'error'); return; }
          try { new URL(rawUrl); } catch { toast('Enter a valid URL', 'error'); return; }
          App.images.push({ id: zjGalleryNewId(), title, caption, source: 'url', url: rawUrl });
          save();
          renderGallery();
          document.getElementById('add-image-dialog')?.close();
          ['image-title', 'image-url', 'image-caption'].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
          toast('Image added', 'success');
        }

        async function zjGalleryDeleteById(id) {
          const idx = (App.images || []).findIndex((e) => e && e.id === id);
          if (idx < 0) return;
          const entry = App.images[idx];
          if (entry.isDefault) return;
          App.images.splice(idx, 1);
          save();
          await renderGallery();
          const deletedId = entry.id;
          setTimeout(async () => {
            const stillGone = !(App.images || []).some((e) => e && e.id === deletedId);
            if (!stillGone) return;
            zjGalleryBlobCache.delete(deletedId);
            const idb = await zjGalleryLoadIdb();
            if (idb) try { await idb.del(deletedId); } catch (_) {}
          }, 10000);
          toast('Deleted image: ' + String(entry.title || 'Untitled').slice(0, 40), 'warning', {
            label: 'Undo',
            onClick: () => { App.images.splice(Math.min(idx, App.images.length), 0, entry); save(); renderGallery(); },
          });
        }

        function filterGalleryItems(q) { zjGalleryFilterQuery = String(q || ''); renderGallery(); }

        function sortGalleryItems(mode) { zjGallerySortMode = mode === 'name' ? 'name' : 'default'; renderGallery(); }

        function exportGalleryIndex() {
          const items = (App.images || []).map((e) => ({ id: e.id, title: e.title, caption: e.caption || '', source: e.source, url: e.source === 'url' ? e.url : undefined, isDefault: !!e.isDefault }));
          downloadText('zj-gallery-index.json', JSON.stringify(items, null, 2), 'application/json');
        }

        function bindGalleryActions() {
          document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action || '';
            if (action.startsWith('gallery-open:')) { e.preventDefault(); openLightbox(action.slice(13)); return; }
            if (action.startsWith('gallery-delete:')) { e.preventDefault(); zjGalleryDeleteById(action.slice(15)); return; }
          });
          window.addEventListener('zj:sync', (e) => {
            if (e.detail?.key === 'images') {
              const ids = new Set((App.images || []).map((x) => x && x.id));
              for (const k of zjGalleryBlobCache.keys()) if (!ids.has(k)) zjGalleryBlobCache.delete(k);
              renderGallery();
            }
          });
        }

        function zjGalleryReadFileAsDataURL(file) {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('read failed'));
            reader.readAsDataURL(file);
          });
        }

        function zjGalleryNewId() {
          return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        }

        function zjGalleryCssEscape(s) {
          return (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
        }

        /* ============ js/notion.js ============ */
        const ZJ_NOTION_BLOCK_TYPES = [
          { type: 'text',    icon: 'T',    label: 'Text' },
          { type: 'h1',      icon: 'H1',   label: 'Heading 1' },
          { type: 'h2',      icon: 'H2',   label: 'Heading 2' },
          { type: 'h3',      icon: 'H3',   label: 'Heading 3' },
          { type: 'bullet',  icon: '•',    label: 'Bulleted List' },
          { type: 'number',  icon: '1.',   label: 'Numbered List' },
          { type: 'todo',    icon: '☐',    label: 'To-do' },
          { type: 'quote',   icon: '"',    label: 'Quote' },
          { type: 'code',    icon: '{ }',  label: 'Code' },
          { type: 'callout', icon: '💡',    label: 'Callout' },
          { type: 'toggle',  icon: '▸',    label: 'Toggle' },
          { type: 'divider', icon: '—',    label: 'Divider' },
        ];

        let zjNotionPageSearchQuery = '';
        let zjNotionTitleRenderTimer = null;
        let zjNotionActiveMenu = null;
        let zjNotionSuppressNextClick = false;
        let zjNotionDrag = null;

        function renderNotionPages() {
          zjNotionNormalizePages();
          const list = document.getElementById('notion-pages-list');
          if (!list) return;
          const pages = App.notionPages;
          if (pages.length === 0) {
            list.replaceChildren();
            const wrap = document.createElement('div');
            wrap.innerHTML = createEmptyState('file-text', 'No pages', 'Create your first page');
            list.appendChild(wrap);
            if (window.lucide) window.lucide.createIcons();
            return;
          }
          const q = zjNotionPageSearchQuery.toLowerCase();
          list.replaceChildren();
          for (const page of pages) {
            if (q && !(page.title || '').toLowerCase().includes(q)) continue;
            list.appendChild(zjNotionBuildPageItem(page));
          }
          if (q && list.children.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding:12px;font-size:11px;color:var(--text-dim);text-align:center;';
            empty.textContent = 'No pages match "' + zjNotionPageSearchQuery + '"';
            list.appendChild(empty);
          }
          if (window.lucide) window.lucide.createIcons();
        }

        function createNotionPage() {
          const p = { id: zjNotionMakeId(), title: 'Untitled', icon: '📄', blocks: [{ id: zjNotionMakeId(), type: 'text', content: '', checked: false }] };
          App.notionPages.unshift(p);
          App.activePage = p.id;
          save();
          renderNotionPages();
          loadActivePage();
          toast('Page created', 'success');
        }

        function selectPage(id) {
          if (!App.notionPages.some((p) => p.id === id)) return;
          App.activePage = id;
          save();
          renderNotionPages();
          loadActivePage();
        }

        function deletePage(id) {
          const idx = App.notionPages.findIndex((p) => p.id === id);
          if (idx < 0) return;
          const removed = App.notionPages.splice(idx, 1)[0];
          if (App.activePage === id) App.activePage = App.notionPages[0]?.id || null;
          save();
          renderNotionPages();
          loadActivePage();
          toast('Deleted page: ' + String(removed.title || 'Untitled').slice(0, 40), 'warning', {
            label: 'Undo',
            onClick: () => {
              App.notionPages.splice(Math.min(idx, App.notionPages.length), 0, removed);
              if (!App.activePage) App.activePage = removed.id;
              save(); renderNotionPages(); loadActivePage();
            },
          });
        }

        function duplicateActiveNotionPage() {
          const page = App.notionPages.find((p) => p.id === App.activePage);
          if (!page) { toast('Select a page first', 'error'); return; }
          const clone = { id: zjNotionMakeId(), title: (page.title || 'Untitled') + ' (copy)', icon: page.icon || '📄', blocks: page.blocks.map((b) => ({ ...b, id: zjNotionMakeId() })) };
          App.notionPages.unshift(clone);
          App.activePage = clone.id;
          save();
          renderNotionPages();
          loadActivePage();
          toast('Page duplicated', 'success');
        }

        function saveNotionTitle(v) {
          const page = App.notionPages.find((p) => p.id === App.activePage);
          if (!page) return;
          page.title = String(v || '').trim() || 'Untitled';
          save();
          if (zjNotionTitleRenderTimer) clearTimeout(zjNotionTitleRenderTimer);
          zjNotionTitleRenderTimer = setTimeout(renderNotionPages, 400);
        }

        function filterNotionPages(q) { zjNotionPageSearchQuery = String(q || ''); renderNotionPages(); }

        function exportNotionPage() {
          const page = App.notionPages.find((p) => p.id === App.activePage);
          if (!page) return;
          const md = zjNotionPageToMarkdown(page);
          const filename = (page.title || 'untitled').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 60) + '.md';
          downloadText(filename, md, 'text/markdown');
          toast('Exported', 'success');
        }

        function exportAllNotionPages() {
          const md = App.notionPages.map(zjNotionPageToMarkdown).join('\n\n---\n\n');
          downloadText('zj-workspace-export.md', md || '# No pages\n', 'text/markdown');
          toast('Exported all pages', 'success');
        }

        function loadActivePage() {
          const page = App.notionPages.find((p) => p.id === App.activePage);
          const titleInput = document.getElementById('notion-title');
          const blocksEl = document.getElementById('notion-blocks');
          const iconEl = document.getElementById('notion-page-icon');
          if (!page) {
            if (titleInput) titleInput.value = '';
            if (iconEl) iconEl.textContent = '📄';
            if (blocksEl) {
              blocksEl.replaceChildren();
              const wrap = document.createElement('div');
              wrap.innerHTML = createEmptyState('file-text', 'No page selected', 'Create a page to start writing');
              blocksEl.appendChild(wrap);
              if (window.lucide) window.lucide.createIcons();
            }
            return;
          }
          if (titleInput) titleInput.value = page.title === 'Untitled' ? '' : page.title;
          if (iconEl) iconEl.textContent = page.icon || '📄';
          zjNotionRenderBlocks(page);
        }

        function addNotionBlock(type) {
          if (!type) type = 'text';
          const page = App.notionPages.find((p) => p.id === App.activePage);
          if (!page) return;
          page.blocks.push({ id: zjNotionMakeId(), type, content: '', checked: false });
          save();
          zjNotionRenderBlocks(page);
        }

        function addBlockAfter(id) {
          const page = App.notionPages.find((p) => p.id === App.activePage);
          if (!page) return;
          const i = page.blocks.findIndex((b) => b.id === id);
          if (i < 0) return;
          const nb = { id: zjNotionMakeId(), type: 'text', content: '', checked: false };
          page.blocks.splice(i + 1, 0, nb);
          save();
          zjNotionRenderBlocks(page);
          setTimeout(() => document.querySelector('.notion-block-row[data-id="' + zjNotionCssEscape(nb.id) + '"] .block-content')?.focus(), 30);
        }

        function zjNotionBuildPageItem(page) {
          const item = document.createElement('div');
          item.className = 'notion-page-item' + (page.id === App.activePage ? ' active' : '');
          item.dataset.action = 'notion-select:' + page.id;
          item.setAttribute('role', 'button');
          item.setAttribute('tabindex', '0');
          const icon = document.createElement('span');
          icon.textContent = page.icon || '📄';
          const title = document.createElement('span');
          title.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          title.textContent = page.title || 'Untitled';
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'btn-icon';
          del.style.cssText = 'width:18px;height:18px;flex-shrink:0;';
          del.dataset.action = 'notion-delete:' + page.id;
          del.setAttribute('aria-label', 'Delete page');
          del.title = 'Delete page';
          const i = document.createElement('i');
          i.setAttribute('data-lucide', 'x');
          i.style.cssText = 'width:9px;height:9px;';
          del.appendChild(i);
          item.append(icon, title, del);
          return item;
        }

        function zjNotionRenderBlocks(page) {
          const el = document.getElementById('notion-blocks');
          if (!el) return;
          el.replaceChildren();
          for (const block of page.blocks) el.appendChild(zjNotionBuildBlockRow(block, page));
          if (window.lucide) window.lucide.createIcons();
        }

        function zjNotionBuildBlockRow(block, page) {
          const row = document.createElement('div');
          row.className = 'notion-block-row';
          row.dataset.id = block.id;
          const handle = document.createElement('div');
          handle.className = 'block-handle';
          const grip = document.createElement('button');
          grip.type = 'button';
          grip.title = 'Drag to reorder · click for menu';
          grip.dataset.dragHandle = '1';
          const gripIcon = document.createElement('i');
          gripIcon.setAttribute('data-lucide', 'grip-vertical');
          gripIcon.style.cssText = 'width:11px;height:11px;';
          grip.appendChild(gripIcon);
          zjNotionAttachDragAndMenu(grip, block);
          const plus = document.createElement('button');
          plus.type = 'button';
          plus.title = 'Add block below';
          plus.dataset.action = 'notion-add-after:' + block.id;
          const plusIcon = document.createElement('i');
          plusIcon.setAttribute('data-lucide', 'plus');
          plusIcon.style.cssText = 'width:11px;height:11px;';
          plus.appendChild(plusIcon);
          handle.append(grip, plus);
          row.appendChild(handle);
          if (block.type === 'image') {
            const wrap = document.createElement('div'); wrap.style.cssText = 'flex:1;min-width:0;display:grid;gap:7px;';
            const src = String(block.content || '').trim();
            if (/^https:\/\//i.test(src)) { const img = document.createElement('img'); img.src = src; img.alt = 'Workspace image'; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; img.style.cssText = 'max-width:100%;max-height:320px;object-fit:contain;border-radius:10px;border:1px solid var(--border);'; img.onerror = () => { img.replaceWith(document.createTextNode('Image could not be loaded. Check the URL.')); }; wrap.appendChild(img); }
            wrap.appendChild(zjNotionMakeContent(block, page, 'block-content', 'Paste an HTTPS image URL'));
            row.appendChild(wrap); return row;
          }
          if (block.type === 'table') {
            const box = document.createElement('div'); box.style.cssText = 'flex:1;min-width:0;padding:9px;border:1px solid var(--border);border-radius:9px;background:var(--bg-input);';
            const hint = document.createElement('div'); hint.textContent = 'Table data (pipe-separated Markdown)'; hint.style.cssText = 'font-size:10px;color:var(--text-muted);margin-bottom:5px;';
            box.append(hint, zjNotionMakeContent(block, page, 'block-content block-code', '| Column 1 | Column 2 |\n| --- | --- |'));
            row.appendChild(box); return row;
          }
          if (block.type === 'divider') {
            const hr = document.createElement('hr');
            hr.style.cssText = 'flex:1;border:none;border-top:1px solid var(--border);margin:10px 0;';
            row.appendChild(hr);
            return row;
          }
          if (block.type === 'todo') {
            const cb = document.createElement('div');
            cb.className = 'notion-todo-checkbox' + (block.checked ? ' checked' : '');
            cb.setAttribute('role', 'checkbox');
            cb.setAttribute('tabindex', '0');
            cb.setAttribute('aria-checked', String(!!block.checked));
            cb.addEventListener('click', () => { block.checked = !block.checked; save(); zjNotionRenderBlocks(page); });
            cb.addEventListener('keydown', (e) => {
              if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); block.checked = !block.checked; save(); zjNotionRenderBlocks(page); }
            });
            row.appendChild(cb);
            row.appendChild(zjNotionMakeContent(block, page, 'notion-todo-content' + (block.checked ? ' done' : ''), 'To-do'));
            return row;
          }
          if (block.type === 'callout') { row.appendChild(zjNotionMakeContent(block, page, 'block-content block-callout', '💡 Callout')); return row; }
          if (block.type === 'toggle') {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'flex:1;display:flex;align-items:flex-start;gap:2px;';
            const toggleBtn = document.createElement('span');
            toggleBtn.className = 'block-toggle' + (block.open ? ' open' : '');
            toggleBtn.setAttribute('role', 'button');
            toggleBtn.setAttribute('tabindex', '0');
            toggleBtn.setAttribute('aria-label', block.open ? 'Collapse' : 'Expand');
            toggleBtn.addEventListener('click', () => { block.open = !block.open; save(); zjNotionRenderBlocks(page); });
            const arrow = document.createElement('span');
            arrow.className = 'block-toggle-icon';
            arrow.textContent = '▸';
            toggleBtn.appendChild(arrow);
            wrapper.append(toggleBtn, zjNotionMakeContent(block, page, 'block-content', 'Toggle header'));
            row.appendChild(wrapper);
            return row;
          }
          row.appendChild(zjNotionMakeContent(block, page, 'block-content block-' + block.type, zjNotionPlaceholderFor(block.type)));
          return row;
        }

        function zjNotionMakeContent(block, page, className, placeholder) {
          const c = document.createElement('div');
          c.className = className;
          c.contentEditable = 'true';
          c.dataset.placeholder = placeholder;
          c.textContent = block.content || '';
          c.addEventListener('input', () => { block.content = c.textContent || ''; save(); });
          c.addEventListener('keydown', (e) => zjNotionHandleBlockKey(e, block, page));
          return c;
        }

        function zjNotionHandleBlockKey(e, block, page) {
          if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'i') && block.type !== 'code') {
            e.preventDefault();
            const before = e.key === 'b' ? '**' : '*';
            if (zjNotionWrapSelection(e.target, before, before)) { block.content = e.target.textContent || ''; save(); }
            return;
          }
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const i = page.blocks.findIndex((b) => b.id === block.id);
            const nb = { id: zjNotionMakeId(), type: ['bullet', 'number', 'todo'].includes(block.type) ? block.type : 'text', content: '', checked: false };
            page.blocks.splice(i + 1, 0, nb);
            save();
            zjNotionRenderBlocks(page);
            setTimeout(() => document.querySelector('.notion-block-row[data-id="' + zjNotionCssEscape(nb.id) + '"] .block-content')?.focus(), 30);
            return;
          }
          if (e.key === 'Backspace' && !(block.content || '').trim()) {
            e.preventDefault();
            if (page.blocks.length <= 1) return;
            const i = page.blocks.findIndex((b) => b.id === block.id);
            page.blocks.splice(i, 1);
            save();
            zjNotionRenderBlocks(page);
            setTimeout(() => {
              const prev = page.blocks[i - 1];
              if (prev) document.querySelector('.notion-block-row[data-id="' + zjNotionCssEscape(prev.id) + '"] .block-content')?.focus();
            }, 30);
            return;
          }
          if (e.key === '/' && !(block.content || '').trim()) { e.preventDefault(); showBlockMenu(block.id, e); }
        }

        function zjNotionWrapSelection(el, before, after) {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return false;
          const range = sel.getRangeAt(0);
          if (!el.contains(range.commonAncestorContainer) && !el.contains(range.startContainer)) return false;
          if (range.collapsed) {
            const node = document.createTextNode(before + after);
            range.insertNode(node);
            range.setStart(node, before.length);
            range.setEnd(node, before.length);
            sel.removeAllRanges();
            sel.addRange(range);
            return true;
          }
          const text = range.toString();
          range.deleteContents();
          const node = document.createTextNode(before + text + after);
          range.insertNode(node);
          range.setStart(node, before.length);
          range.setEnd(node, before.length + text.length);
          sel.removeAllRanges();
          sel.addRange(range);
          return true;
        }

        function showBlockMenu(id, evt) {
          zjNotionCloseBlockMenu();
          const target = (evt && (evt.currentTarget || evt.target)) || document.querySelector('.notion-block-row[data-id="' + zjNotionCssEscape(id) + '"]');
          if (!target) return;
          const r = target.getBoundingClientRect();
          const menu = document.createElement('div');
          menu.className = 'block-type-menu';
          menu.dataset.blockId = id;
          menu.style.left = Math.min(r.left, window.innerWidth - 220) + 'px';
          menu.style.top = Math.min(r.bottom + 4, window.innerHeight - 400) + 'px';
          menu.innerHTML = ZJ_NOTION_BLOCK_TYPES.map((bt) =>
            '<button type="button" class="block-type-option" data-action="notion-block-type:' + bt.type + '">' +
              '<span class="block-type-icon">' + bt.icon + '</span><span>' + bt.label + '</span>' +
            '</button>'
          ).join('');
          document.body.appendChild(menu);
          zjNotionActiveMenu = menu;
        }

        function zjNotionCloseBlockMenu() {
          if (zjNotionActiveMenu) { zjNotionActiveMenu.remove(); zjNotionActiveMenu = null; }
        }

        function changeBlockType(id, type) {
          const page = App.notionPages.find((p) => p.id === App.activePage);
          if (!page) return;
          const block = page.blocks.find((b) => b.id === id);
          if (!block) return;
          block.type = type;
          save();
          zjNotionRenderBlocks(page);
          zjNotionCloseBlockMenu();
        }

        function zjNotionAttachDragAndMenu(gripBtn, block) {
          gripBtn.addEventListener('click', (e) => {
            if (zjNotionSuppressNextClick) { zjNotionSuppressNextClick = false; return; }
            e.stopPropagation();
            e.preventDefault();
            showBlockMenu(block.id, e);
          });
          gripBtn.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            const rowEl = e.currentTarget.closest('.notion-block-row');
            if (!rowEl) return;
            zjNotionDrag = { blockId: block.id, startY: e.clientY, rowEl, active: false, targetId: null };
            try { rowEl.setPointerCapture(e.pointerId); } catch (_) {}
            document.addEventListener('pointermove', zjNotionOnDragMove);
            document.addEventListener('pointerup', zjNotionOnDragEnd);
            document.addEventListener('pointercancel', zjNotionOnDragEnd);
          });
        }

        function zjNotionOnDragMove(e) {
          if (!zjNotionDrag) return;
          const dy = e.clientY - zjNotionDrag.startY;
          if (!zjNotionDrag.active && Math.abs(dy) < 5) return;
          if (!zjNotionDrag.active) { zjNotionDrag.active = true; zjNotionDrag.rowEl.style.opacity = '0.5'; }
          const rows = [...document.querySelectorAll('.notion-block-row')];
          rows.forEach((r) => r.classList.remove('drag-target'));
          let targetRow = null;
          for (const r of rows) {
            const rect = r.getBoundingClientRect();
            if (e.clientY >= rect.top && e.clientY <= rect.bottom) { targetRow = r; break; }
          }
          if (targetRow && targetRow !== zjNotionDrag.rowEl) { targetRow.classList.add('drag-target'); zjNotionDrag.targetId = targetRow.dataset.id; }
          else zjNotionDrag.targetId = null;
        }

        function zjNotionOnDragEnd(_e) {
          if (!zjNotionDrag) return;
          const { blockId, rowEl, active, targetId } = zjNotionDrag;
          rowEl.style.opacity = '';
          document.querySelectorAll('.drag-target').forEach((r) => r.classList.remove('drag-target'));
          document.removeEventListener('pointermove', zjNotionOnDragMove);
          document.removeEventListener('pointerup', zjNotionOnDragEnd);
          document.removeEventListener('pointercancel', zjNotionOnDragEnd);
          zjNotionDrag = null;
          if (!active) return;
          zjNotionSuppressNextClick = true;
          if (!targetId || targetId === blockId) return;
          const page = App.notionPages.find((p) => p.id === App.activePage);
          if (!page) return;
          const from = page.blocks.findIndex((b) => b.id === blockId);
          const to = page.blocks.findIndex((b) => b.id === targetId);
          if (from < 0 || to < 0 || from === to) return;
          const moved = page.blocks.splice(from, 1)[0];
          page.blocks.splice(to, 0, moved);
          save();
          zjNotionRenderBlocks(page);
        }

        function bindNotionActions() {
          document.addEventListener('click', (e) => {
            if (zjNotionActiveMenu && !e.target.closest('.block-type-menu') && !e.target.closest('[data-drag-handle]')) zjNotionCloseBlockMenu();
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action || '';
            if (action.startsWith('notion-select:')) { e.preventDefault(); selectPage(action.slice(14)); return; }
            if (action.startsWith('notion-delete:')) { e.preventDefault(); e.stopPropagation(); deletePage(action.slice(14)); return; }
            if (action.startsWith('notion-add-after:')) { e.preventDefault(); addBlockAfter(action.slice(17)); return; }
            if (action.startsWith('notion-block-type:')) {
              e.preventDefault();
              const type = action.slice(18);
              const id = zjNotionActiveMenu?.dataset.blockId;
              if (id) changeBlockType(id, type);
              return;
            }
          });
          document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && zjNotionActiveMenu) zjNotionCloseBlockMenu(); });
          window.addEventListener('zj:sync', (e) => {
            const k = e.detail?.key;
            if (k === 'notionPages' || k === 'activePage') { renderNotionPages(); loadActivePage(); }
          });
        }

        function zjNotionNormalizePages() {
          if (!Array.isArray(App.notionPages)) { App.notionPages = []; save(); return; }
          for (const page of App.notionPages) {
            if (!Array.isArray(page.blocks) || page.blocks.length === 0) page.blocks = [{ id: zjNotionMakeId(), type: 'text', content: '', checked: false }];
            if (typeof page.icon !== 'string') page.icon = '📄';
          }
        }

        function zjNotionPlaceholderFor(t) {
          return { text: 'Type / for commands...', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', bullet: 'List item', number: 'List item', quote: 'Quote', code: 'Code' }[t] || '';
        }

        function zjNotionPageToMarkdown(page) {
          let md = '# ' + (page.title || 'Untitled') + '\n\n';
          for (const b of page.blocks) {
            const c = b.content || '';
            if (b.type === 'h1') md += '# ' + c + '\n\n';
            else if (b.type === 'h2') md += '## ' + c + '\n\n';
            else if (b.type === 'h3') md += '### ' + c + '\n\n';
            else if (b.type === 'bullet') md += '- ' + c + '\n';
            else if (b.type === 'number') md += '1. ' + c + '\n';
            else if (b.type === 'todo') md += '- [' + (b.checked ? 'x' : ' ') + '] ' + c + '\n';
            else if (b.type === 'quote') md += '> ' + c + '\n\n';
            else if (b.type === 'code') md += '```\n' + c + '\n```\n\n';
            else if (b.type === 'divider') md += '---\n\n';
            else if (c) md += c + '\n\n';
          }
          return md;
        }

        function zjNotionMakeId() {
          return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        }

        function zjNotionCssEscape(s) {
          return (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
        }

        /* ============ js/pomodoro.js ============ */
        const ZJ_POMO_RING_CIRCUMFERENCE = 553;
        const ZJ_POMO_DEFAULT_DURATION_SEC = 25 * 60;

        function initPomodoro() {
          const A = App;
          if (!Number.isFinite(A.pomoDuration) || A.pomoDuration <= 0) A.pomoDuration = ZJ_POMO_DEFAULT_DURATION_SEC;
          if (!A.pomoRunning) A.pomoTime = A.pomoDuration;
          zjPomoApplyDayRollover();
          zjPomoSyncDisplay();
          zjPomoSyncSessionCounter();
        }

        function setPomoDuration(min) {
          const A = App;
          if (A.pomoRunning) { toast('Pause the current session before changing duration', 'warning'); return; }
          const totalSec = Math.max(1, Math.floor(Number(min) * 60));
          A.pomoDuration = totalSec;
          A.pomoTime = totalSec;
          zjPomoSyncDisplay();
          zjPomoSyncRing(A.pomoTime, A.pomoDuration);
        }

        function startPomodoro() {
          const A = App;
          if (A.pomoRunning) return;
          if (!Number.isFinite(A.pomoTime) || A.pomoTime <= 0) A.pomoTime = A.pomoDuration || ZJ_POMO_DEFAULT_DURATION_SEC;
          A.pomoRunning = true;
          A.pomoEnd = Date.now() + A.pomoTime * 1000;
          zjPomoSyncRing(A.pomoTime, A.pomoDuration);
          if (A.pomoInterval) clearInterval(A.pomoInterval);
          A.pomoInterval = setInterval(zjPomoTick, 250);
        }

        function pausePomodoro() {
          const A = App;
          if (A.pomoInterval) { clearInterval(A.pomoInterval); A.pomoInterval = null; }
          A.pomoRunning = false;
        }

        function resetPomodoro() {
          const A = App;
          pausePomodoro();
          A.pomoTime = A.pomoDuration || ZJ_POMO_DEFAULT_DURATION_SEC;
          zjPomoSyncDisplay();
          zjPomoSyncRing(A.pomoTime, A.pomoDuration);
        }

        function zjPomoTick() {
          const A = App;
          const remainingMs = Math.max(0, A.pomoEnd - Date.now());
          const remainingSec = Math.ceil(remainingMs / 1000);
          A.pomoTime = remainingSec;
          zjPomoSyncDisplay();
          zjPomoSyncRing(remainingSec, A.pomoDuration);
          if (remainingMs <= 0) zjPomoCompleteSession();
        }

        function zjPomoCompleteSession() {
          const A = App;
          pausePomodoro();
          zjPomoApplyDayRollover();
          A.pomoSessions = (A.pomoSessions || 0) + 1;
          A.pomoLastDate = zjPomoTodayString();
          save();
          zjPomoSyncSessionCounter();
          playSound(1200, 1, 'triangle', 0.2, A.sound);
          toast('Pomodoro complete! 🎉', 'success');
          const card = document.querySelector('.pomodoro-card');
          if (card) triggerElectricPulse(card);
          A.pomoTime = A.pomoDuration || ZJ_POMO_DEFAULT_DURATION_SEC;
          zjPomoSyncDisplay();
          zjPomoSyncRing(A.pomoTime, A.pomoDuration);
        }

        function zjPomoSyncDisplay() {
          const A = App;
          const el = document.getElementById('pomo-time');
          if (!el) return;
          const sec = Math.max(0, Math.floor(A.pomoTime || 0));
          const mm = String(Math.floor(sec / 60)).padStart(2, '0');
          const ss = String(sec % 60).padStart(2, '0');
          el.textContent = mm + ':' + ss;
        }

        function zjPomoSyncRing(remaining, total) {
          const ring = document.getElementById('pomo-ring');
          if (!ring) return;
          const t = Number.isFinite(total) && total > 0 ? total : ZJ_POMO_DEFAULT_DURATION_SEC;
          const r = Number.isFinite(remaining) ? Math.max(0, Math.min(remaining, t)) : t;
          const offset = ZJ_POMO_RING_CIRCUMFERENCE * (1 - r / t);
          ring.style.strokeDashoffset = String(offset);
        }

        function zjPomoSyncSessionCounter() {
          const el = document.getElementById('pomo-sessions');
          if (el) el.textContent = String(App.pomoSessions || 0);
        }

        function zjPomoApplyDayRollover() {
          const A = App;
          const today = zjPomoTodayString();
          if (A.pomoLastDate !== today) { A.pomoSessions = 0; A.pomoLastDate = today; save(); }
        }

        function bindPomodoroShortcuts() {
          let lastGTime = 0;
          document.addEventListener('keydown', (e) => { if ((e.key || '').toLowerCase() === 'g') lastGTime = Date.now(); }, true);
          document.addEventListener('keydown', (e) => {
            if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
            if (Date.now() - lastGTime < 1500) return;
            if (!document.getElementById('tab-pomodoro')?.classList.contains('active')) return;
            const t = e.target;
            if (t && (t.matches?.('input, textarea, select') || t.isContentEditable)) return;
            if (e.key === ' ') { e.preventDefault(); if (App.pomoRunning) pausePomodoro(); else startPomodoro(); return; }
            if ((e.key || '').toLowerCase() === 'r') { e.preventDefault(); resetPomodoro(); return; }
          });
        }

        function bindPomodoroSync() {
          window.addEventListener('zj:sync', (e) => {
            if (e.detail?.key === 'pomoSessions') zjPomoSyncSessionCounter();
            if (e.detail?.key === 'pomoLastDate') { zjPomoApplyDayRollover(); zjPomoSyncSessionCounter(); }
          });
        }

        function zjPomoTodayString() {
          const d = new Date();
          return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }

        /* ============ js/clock.js ============ */

        // FIX: use module-scoped ZJStorage (custom wrapper) — was `window.ZJStorage` (native, no .get).


        let zjClockTickTimer = null;
        // Main analog/digital clock only. World clock, alarms, timer and stopwatch live in js/zj-clock.js.
        function initClock() {
          buildClockTicks();
          const fmtBtn = document.getElementById('clock-format-btn');
          if (fmtBtn) fmtBtn.textContent = App.clock24h ? '24h' : '12h';
          updateClock();
          if (zjClockTickTimer) clearInterval(zjClockTickTimer);
          zjClockTickTimer = setInterval(updateClock, 1000);
        }

        function buildClockTicks() {
          const g = document.getElementById('clock-ticks');
          if (!g) return;
          g.replaceChildren();
          for (let i = 0; i < 12; i++) {
            const a = (i * 30) * Math.PI / 180;
            const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l.setAttribute('x1', String(100 + 85 * Math.sin(a)));
            l.setAttribute('y1', String(100 - 85 * Math.cos(a)));
            l.setAttribute('x2', String(100 + 90 * Math.sin(a)));
            l.setAttribute('y2', String(100 - 90 * Math.cos(a)));
            l.setAttribute('stroke', 'var(--text-dim)');
            l.setAttribute('stroke-width', '2');
            l.setAttribute('stroke-linecap', 'round');
            g.appendChild(l);
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', String(100 + 69 * Math.sin(a)));
            label.setAttribute('y', String(100 - 69 * Math.cos(a) + 4));
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-size', '10');
            label.setAttribute('font-weight', '700');
            label.setAttribute('fill', 'var(--text-dim)');
            label.textContent = String(i === 0 ? 12 : i);
            g.appendChild(label);
          }
        }

        function updateClock() {
          const now = new Date();
          const h = now.getHours() % 12;
          const m = now.getMinutes();
          const s = now.getSeconds();
          const hh = document.getElementById('clock-hour');
          const mh = document.getElementById('clock-min');
          const sh = document.getElementById('clock-sec');
          if (hh) hh.setAttribute('transform', 'rotate(' + (h * 30 + m * 0.5) + ' 100 100)');
          if (mh) mh.setAttribute('transform', 'rotate(' + (m * 6 + s * 0.1) + ' 100 100)');
          if (sh) sh.setAttribute('transform', 'rotate(' + (s * 6) + ' 100 100)');
          const timeStr = zjClockFormatTime(now, App.clock24h);
          const heroEl = document.getElementById('hero-clock');
          if (heroEl) heroEl.textContent = timeStr;
          const mainTime = document.getElementById('clock-time-main');
          if (mainTime) mainTime.textContent = timeStr;
          const mainDate = document.getElementById('clock-date-main');
          if (mainDate) mainDate.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }

        function toggleClockFormat() {
          App.clock24h = !App.clock24h;
          save();
          const btn = document.getElementById('clock-format-btn');
          if (btn) btn.textContent = App.clock24h ? '24h' : '12h';
          updateClock();
          window.dispatchEvent(new CustomEvent('zj:clock-format'));
        }

        function zjClockFormatTime(date, clock24h) {
          const h = date.getHours(), m = date.getMinutes(), s = date.getSeconds();
          if (clock24h) return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 || 12;
          return String(h12).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ' ' + ampm;
        }

        function zjClockMakeId() {
          return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        }

        /* ============ js/weather.js ============ */
        const ZJ_WEATHER_DEFAULT_CITY = 'Hyderabad';
        const ZJ_WEATHER_CACHE_TTL = 5 * 60 * 1000;
        const ZJ_WEATHER_TIMEOUT = 12000;
        const ZJ_WEATHER_MAX_CHOICES = 8;

        const zjWeatherPlaceSelections = { widget: null, full: null };
        const zjWeatherSearchControllers = { widget: null, full: null };
        const zjWeatherPendingChoices = { widget: [], full: [] };
        const zjWeatherGenerations = { widget: 0, full: 0 };
        const zjWeatherLastRendered = { widget: null, full: null };
        const zjWeatherResponseCache = new Map();
        let zjWeatherStaleNotice = false;

        function initWeather() {
          zjWeatherNormalizeSavedCities();
          renderSavedCities();
          zjWeatherRenderRecent();
          zjWeatherSetUnitLabels(App.tempUnit);
          fetchWeather('widget');
          fetchWeather('full');
        }

        function bindWeatherActions() {
          document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action || '';
            if (action.startsWith('weather-open-city:')) { e.preventDefault(); openSavedWeatherCity(Number(action.slice(18))); return; }
            if (action.startsWith('weather-remove-city:')) { e.preventDefault(); e.stopPropagation(); removeCity(Number(action.slice(20))); return; }
            if (action.startsWith('weather-select-city:')) {
              e.preventDefault();
              const parts = action.split(':');
              const target = parts[1];
              const index = Number(parts[2]);
              if (target === 'widget' || target === 'full') selectWeatherCity(target, index);
              return;
            }
          });
          window.addEventListener('zj:sync', (e) => { if (e.detail?.key === 'cities') renderSavedCities(); });
        }

        async function fetchWeather(target, selectedPlace) {
          if (selectedPlace === undefined) selectedPlace = null;
          if (target !== 'widget' && target !== 'full') return;
          const input = document.getElementById(target === 'widget' ? 'weather-widget-input' : 'weather-full-input');
          if (!input) return;
          const query = (input.value || '').trim() || ZJ_WEATHER_DEFAULT_CITY;
          const gen = ++zjWeatherGenerations[target];
          zjWeatherSetSkeleton(target, true);
          zjWeatherClearCityResults(target);
          try {
            let place = (selectedPlace && zjWeatherNormalizePlace(selectedPlace)) || zjWeatherResolveFromPreviousSelection(target, query);
            if (!place) {
              const coords = zjWeatherParseCoords(query);
              if (coords) place = { latitude: coords.latitude, longitude: coords.longitude, name: 'Your location', country_code: '', country: '', admin1: '', timezone: '' };
              else {
                const choices = await zjWeatherGeocode(query, target);
                if (gen !== zjWeatherGenerations[target]) return;
                if (choices.length === 0) { zjWeatherShowNotFound(target, query); return; }
                if (choices.length > 1) {
                  zjWeatherPendingChoices[target] = choices;
                  zjWeatherPresentChoices(target, choices, query);
                  return;
                }
                place = choices[0];
              }
            }
            zjWeatherPlaceSelections[target] = place;
            const weatherData = await zjWeatherGetWeather(place.latitude, place.longitude);
            if (gen !== zjWeatherGenerations[target]) return;
            if (!weatherData) throw new Error('Empty weather response');
            zjWeatherLastRendered[target] = { weatherData, place, unit: App.tempUnit };
            zjWeatherRenderWeather(target, weatherData, place);
          } catch (err) {
            if (err?.name === 'AbortError' || err?.name === 'TimeoutError') return;
            if (gen !== zjWeatherGenerations[target]) return;
            console.warn('zj-os: weather fetch failed', err);
            zjWeatherShowError(target, err?.message || 'Could not load weather.');
            toast(err?.message || 'Could not load weather. Check your connection.', 'error');
          }
        }

        function selectWeatherCity(target, index) {
          const place = zjWeatherPendingChoices[target]?.[index];
          if (!place) return;
          zjWeatherPlaceSelections[target] = place;
          const input = document.getElementById(target === 'widget' ? 'weather-widget-input' : 'weather-full-input');
          if (input) input.value = place.latitude + ', ' + place.longitude;
          fetchWeather(target, place);
        }

        function saveCurrentWeatherCity() {
          const place = zjWeatherPlaceSelections.full;
          if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) { toast('Search and select a city before saving it.', 'error'); return; }
          const label = zjWeatherFormatPlace(place) || 'Saved city';
          const exists = App.cities.some((c) => {
            if (c && typeof c === 'object') return Math.abs(Number(c.latitude) - place.latitude) < 0.0001 && Math.abs(Number(c.longitude) - place.longitude) < 0.0001;
            return String(c) === label;
          });
          if (exists) { toast('This city is already saved.', 'info'); return; }
          App.cities.push({ ...place, label });
          save();
          renderSavedCities();
          toast('City saved.', 'success');
        }

        function autoLocate() {
          if (!navigator.geolocation) { toast('Geolocation not supported', 'error'); return; }
          toast('Locating…', 'info');
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const latitude = pos.coords.latitude;
              const longitude = pos.coords.longitude;
              const place = { latitude, longitude, name: 'Your location', country_code: '', country: '', admin1: '', timezone: '' };
              const widgetInput = document.getElementById('weather-widget-input');
              const fullInput = document.getElementById('weather-full-input');
              const coordStr = latitude + ', ' + longitude;
              if (widgetInput) widgetInput.value = coordStr;
              if (fullInput) fullInput.value = coordStr;
              fetchWeather('widget', place);
              fetchWeather('full', place);
              toast('Located', 'success');
            },
            () => toast('Location denied', 'error'),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        }

        function toggleTempUnit() {
          App.tempUnit = App.tempUnit === 'C' ? 'F' : 'C';
          save();
          zjWeatherSetUnitLabels(App.tempUnit);
          for (const target of ['widget', 'full']) {
            const cached = zjWeatherLastRendered[target];
            if (cached && cached.unit !== App.tempUnit) { cached.unit = App.tempUnit; zjWeatherRenderWeather(target, cached.weatherData, cached.place); }
            else if (!cached) fetchWeather(target);
          }
        }

        function renderSavedCities() {
          const el = document.getElementById('saved-cities');
          if (!el) return;
          el.replaceChildren();
          if (!Array.isArray(App.cities) || App.cities.length === 0) {
            const hint = document.createElement('span');
            hint.style.cssText = 'font-size:11px;color:var(--text-dim);';
            hint.textContent = 'No saved cities yet. Use "Save city" to add one.';
            el.appendChild(hint);
            return;
          }
          App.cities.forEach((city, i) => {
            const isObj = city && typeof city === 'object';
            const label = isObj ? (city.label || zjWeatherFormatPlace(city)) : String(city);
            const chip = document.createElement('div');
            chip.className = 'city-chip';
            chip.setAttribute('role', 'button');
            chip.setAttribute('tabindex', '0');
            chip.dataset.action = 'weather-open-city:' + i;
            chip.title = 'Show weather for ' + label;
            chip.textContent = label;
            const remove = document.createElement('span');
            remove.className = 'remove';
            remove.setAttribute('role', 'button');
            remove.setAttribute('tabindex', '0');
            remove.setAttribute('aria-label', 'Remove ' + label);
            remove.dataset.action = 'weather-remove-city:' + i;
            remove.textContent = '×';
            chip.appendChild(remove);
            el.appendChild(chip);
          });
        }

        function openSavedWeatherCity(index) {
          const city = App.cities[index];
          if (city == null) return;
          const input = document.getElementById('weather-full-input');
          if (!input) return;
          if (city && typeof city === 'object' && Number.isFinite(city.latitude)) {
            zjWeatherPlaceSelections.full = city;
            input.value = city.latitude + ', ' + city.longitude;
            fetchWeather('full', city);
          } else {
            input.value = String(city);
            fetchWeather('full');
          }
        }

        function removeCity(i) {
          if (!Array.isArray(App.cities) || i < 0 || i >= App.cities.length) return;
          App.cities.splice(i, 1);
          save();
          renderSavedCities();
        }

        function exportWeatherSnapshot() {
          const cached = zjWeatherLastRendered.full || zjWeatherLastRendered.widget;
          if (!cached) { toast('Load weather first', 'info'); return; }
          const { weatherData, place } = cached;
          const c = Number(weatherData.current?.temperature_2m);
          const isF = App.tempUnit === 'F';
          const temp = Number.isFinite(c) ? Math.round(isF ? c * 9 / 5 + 32 : c) : null;
          const snapshot = {
            exportedAt: new Date().toISOString(),
            unit: App.tempUnit,
            location: zjWeatherFormatPlace(place),
            latitude: place.latitude,
            longitude: place.longitude,
            temperature: temp,
            condition: weatherDescription(weatherData.current?.weather_code),
            humidity: weatherData.current?.relative_humidity_2m ?? null,
            wind_kph: weatherData.current?.wind_speed_10m ?? null,
            forecast: (weatherData.daily?.time || []).map((date, i) => ({
              date, high: weatherData.daily.temperature_2m_max?.[i] ?? null, low: weatherData.daily.temperature_2m_min?.[i] ?? null, code: weatherData.daily.weather_code?.[i] ?? null,
            })),
          };
          downloadText('zj-weather-snapshot.json', JSON.stringify(snapshot, null, 2), 'application/json');
        }

        function weatherDescription(code) {
          const d = {
            0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Depositing rime fog',
            51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
            56: 'Freezing drizzle', 57: 'Heavy freezing drizzle',
            61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
            66: 'Freezing rain', 67: 'Heavy freezing rain',
            71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
            80: 'Rain showers', 81: 'Heavy showers', 82: 'Violent showers',
            85: 'Snow showers', 86: 'Heavy snow showers',
            95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm',
          };
          return d[Number(code)] || 'Current conditions';
        }

        function zjWeatherResolveFromPreviousSelection(target, query) {
          const prev = zjWeatherPlaceSelections[target];
          if (!prev) return null;
          const placeLabel = zjWeatherFormatPlace(prev);
          const coordStr = prev.latitude + ', ' + prev.longitude;
          if (query === placeLabel || query === coordStr) return prev;
          return null;
        }

        function zjWeatherNormalizePlace(p) {
          return {
            latitude: Number(p.latitude), longitude: Number(p.longitude),
            name: String(p.name || ''), country_code: String(p.country_code || ''),
            country: String(p.country || ''), admin1: String(p.admin1 || ''),
            timezone: String(p.timezone || ''), population: Number(p.population || 0),
          };
        }

        function zjWeatherFormatPlace(place) {
          if (!place) return '';
          return [place.name, place.admin1, place.country_code || place.country].filter(Boolean).join(', ');
        }

        function zjWeatherParseCoords(query) {
          const m = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
          if (!m) return null;
          const latitude = Number(m[1]);
          const longitude = Number(m[2]);
          if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
          if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
          return { latitude, longitude };
        }

        async function zjWeatherGeocode(query, target) {
          if (zjWeatherSearchControllers[target]) zjWeatherSearchControllers[target].abort();
          const controller = new AbortController();
          zjWeatherSearchControllers[target] = controller;
          const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
          url.search = new URLSearchParams({ name: query, count: '10', language: 'en', format: 'json' }).toString();
          const res = await fetch(url.toString(), { signal: controller.signal });
          if (res.status === 429) throw new Error('City search is rate-limited. Please wait a minute and try again.');
          if (!res.ok) throw new Error('City search failed (HTTP ' + res.status + ').');
          const data = await res.json();
          const places = Array.isArray(data.results) ? data.results : [];
          const seen = new Set();
          const out = [];
          for (const p of places) {
            const key = (p.name || '') + '|' + (p.admin1 || '') + '|' + (p.country || '');
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(zjWeatherNormalizePlace(p));
          }
          out.sort((a, b) => (b.population || 0) - (a.population || 0));
          return out.slice(0, ZJ_WEATHER_MAX_CHOICES);
        }

        async function zjWeatherGetWeather(latitude, longitude) {
          const key = latitude.toFixed(4) + ',' + longitude.toFixed(4);
          const cached = zjWeatherResponseCache.get(key);
          if (cached && Date.now() - cached.ts < ZJ_WEATHER_CACHE_TTL) return cached.data;
          const url = new URL('https://api.open-meteo.com/v1/forecast');
          url.search = new URLSearchParams({
            latitude: String(latitude), longitude: String(longitude),
            current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure',
            hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,uv_index,weather_code,visibility',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
            timezone: 'auto', forecast_days: '7',
          }).toString();
          const weatherController = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const weatherTimeout = weatherController ? setTimeout(() => weatherController.abort(), ZJ_WEATHER_TIMEOUT) : null;
          let res;
          try { res = await fetch(url.toString(), weatherController ? { signal: weatherController.signal } : {}); }
          catch (netErr) {
            // Network failure or timeout: fall back to the last good response for this place, if any.
            if (cached) { zjWeatherStaleNotice = true; return cached.data; }
            throw netErr;
          } finally { if (weatherTimeout) clearTimeout(weatherTimeout); }
          if (res.status === 429) { if (cached) { zjWeatherStaleNotice = true; return cached.data; } throw new Error('The weather service is rate-limiting requests. Please wait a minute and press Retry.'); }
          if (!res.ok) { if (cached) { zjWeatherStaleNotice = true; return cached.data; } throw new Error('Weather service failed (HTTP ' + res.status + ').'); }
          zjWeatherStaleNotice = false;
          const data = await res.json();
          if (!data.current || !data.daily) throw new Error('Weather data is incomplete.');
          zjWeatherResponseCache.set(key, { data, ts: Date.now() });
          return data;
        }

        function zjWeatherRenderWeather(target, w, place) {
          zjWeatherSetSkeleton(target, false);
          const c = Number(w.current?.temperature_2m);
          const isF = App.tempUnit === 'F';
          const temp = Number.isFinite(c) ? Math.round(isF ? c * 9 / 5 + 32 : c) : '—';
          zjWeatherSetText(target, 'temp', String(temp));
          zjWeatherSetText(target, 'desc', weatherDescription(w.current?.weather_code));
          const code = Number(w.current?.weather_code);
          const iconName = code === 0 ? 'sun' : [1,2].includes(code) ? 'cloud-sun' : code === 3 ? 'cloud' : [45,48].includes(code) ? 'cloud-fog' : [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code) ? 'cloud-rain' : [71,73,75,77,85,86].includes(code) ? 'cloud-snow' : [95,96,99].includes(code) ? 'cloud-lightning' : 'cloud';
          const weatherIcon = document.getElementById('weather-icon-' + target);
          if (weatherIcon) { weatherIcon.setAttribute('data-lucide', iconName); if (window.lucide) window.lucide.createIcons(); }
          zjWeatherSetText(target, 'loc', zjWeatherFormatPlace(place));
          const now = new Date();
          const hourly = Array.isArray(w.hourly?.time) ? w.hourly.time : [];
          let idx = hourly.findIndex((t) => new Date(t).getTime() >= now.getTime());
          if (idx < 0) idx = Math.max(0, hourly.length - 1);
          const rain = w.hourly?.precipitation_probability?.[idx];
          const humidity = w.current?.relative_humidity_2m ?? w.hourly?.relative_humidity_2m?.[idx];
          const uv = w.hourly?.uv_index?.[idx];
          const wind = w.current?.wind_speed_10m;
          zjWeatherSetText(target, 'rain', rain == null ? '—' : Math.round(rain) + '%');
          zjWeatherSetText(target, 'humidity', humidity == null ? '—' : Math.round(humidity) + '%');
          zjWeatherSetText(target, 'wind', wind == null ? '—' : Math.round(wind) + ' km/h');
          zjWeatherSetText(target, 'uv', uv == null ? '—' : Number(uv).toFixed(1));
          if (target === 'full') {
            const host = document.getElementById('forecast-list')?.parentElement;
            if (host) {
              let extra = document.getElementById('zj-weather-live-details');
              if (!extra) { extra=document.createElement('div'); extra.id='zj-weather-live-details'; extra.className='card'; extra.style.cssText='padding:12px;margin-top:12px'; document.getElementById('forecast-list')?.before(extra); }
              const feels = w.current?.apparent_temperature;
              const pressure = w.current?.surface_pressure;
              const uvLabel = uv == null ? 'Unavailable' : uv < 3 ? 'Low' : uv < 6 ? 'Moderate' : uv < 8 ? 'High' : uv < 11 ? 'Very high' : 'Extreme';
              const hourlyTimes=w.hourly?.time||[], hourlyTemps=w.hourly?.temperature_2m||[], hourlyCodes=w.hourly?.weather_code||[], hourlyRain=w.hourly?.precipitation_probability||[];
              let hourHtml=''; let count=0;
              for(let j=0;j<hourlyTimes.length && count<8;j++){const dt=new Date(hourlyTimes[j]);if(dt.getTime()<Date.now()-30*60*1000)continue;const tc=Number(hourlyTemps[j]);const tv=Number.isFinite(tc)?Math.round(isF?tc*9/5+32:tc)+'°':'—';hourHtml+='<div class="zj-hour-item"><b>'+dt.toLocaleTimeString([], {hour:'numeric'})+'</b><span>'+tv+'</span><small>'+weatherDescription(hourlyCodes[j])+'</small><small>Rain '+(hourlyRain[j]??'—')+'%</small></div>';count++;}
              extra.innerHTML='<div class="card-title" style="margin-bottom:8px">Current conditions</div><div class="zj-weather-metrics"><span>Feels like <b>'+(feels==null?'—':Math.round(isF?feels*9/5+32:feels)+'°')+'</b></span><span>UV <b>'+(uv==null?'—':Number(uv).toFixed(1)+' · '+uvLabel)+'</b></span><span>Pressure <b>'+(pressure==null?'—':Math.round(pressure)+' hPa')+'</b></span><span>Wind <b>'+(wind==null?'—':Math.round(wind)+' km/h '+zjWeatherCompass(w.current?.wind_direction_10m))+'</b></span><span>Visibility <b>'+zjWeatherVisibility(w.hourly?.visibility?.[idx])+'</b></span><span>Sunrise <b>'+zjWeatherClockTime(w.daily?.sunrise?.[0])+'</b></span><span>Sunset <b>'+zjWeatherClockTime(w.daily?.sunset?.[0])+'</b></span></div><div class="card-title" style="margin:12px 0 8px">7-day temperature</div>'+zjWeatherChart(w,isF)+'<div class="card-title" style="margin:12px 0 8px">Next hours</div><div class="zj-hour-strip">'+(hourHtml||'<small>Hourly forecast unavailable</small>')+'</div>';
            }
            zjWeatherRenderForecast(w); zjWeatherUpdateFreshness();
            if (zjWeatherStaleNotice) toast('Showing the last saved weather - the service could not be reached.', 'warning');
            zjWeatherRememberRecent(place); zjWeatherRenderRecent();
          }
        }

        function zjWeatherRecent() { const r = ZJStorage.get('weatherRecent', []); return Array.isArray(r) ? r : []; }
        function zjWeatherRememberRecent(place) {
          if (!place || !Number.isFinite(place.latitude)) return;
          const key = (p) => p.latitude.toFixed(2) + ',' + p.longitude.toFixed(2);
          const list = zjWeatherRecent().filter((p) => p && Number.isFinite(p.latitude) && key(p) !== key(place));
          list.unshift({ latitude: place.latitude, longitude: place.longitude, name: place.name, admin1: place.admin1, country: place.country, country_code: place.country_code, timezone: place.timezone });
          ZJStorage.set('weatherRecent', list.slice(0, 6));
        }
        function zjWeatherRenderRecent() {
          const host = document.getElementById('weather-recent'); if (!host) return;
          const list = zjWeatherRecent();
          host.hidden = !list.length; host.replaceChildren();
          if (!list.length) return;
          const t = document.createElement('span'); t.className = 'zj-wrecent-t'; t.textContent = 'Recent'; host.appendChild(t);
          list.forEach((p) => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'zj-wrecent';
            b.textContent = zjWeatherFormatPlace(p); b.title = 'Show weather for ' + zjWeatherFormatPlace(p);
            b.addEventListener('click', () => { const i = document.getElementById('weather-full-input'); if (i) i.value = p.name; fetchWeather('full', p); });
            host.appendChild(b);
          });
        }
        const ZJ_COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
        function zjWeatherCompass(deg) { const d = Number(deg); return Number.isFinite(d) ? ZJ_COMPASS[Math.round(((d % 360) + 360) % 360 / 22.5) % 16] : ''; }
        function zjWeatherVisibility(m) { const v = Number(m); if (m == null || !Number.isFinite(v)) return '—'; return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + ' km' : Math.round(v) + ' m'; }
        function zjWeatherClockTime(iso) {
          if (!iso) return '—';
          const m = String(iso).match(/T(\d{2}):(\d{2})/); if (!m) return '—';   // Open-Meteo returns the place's local time
          const h = +m[1];
          return App.clock24h === false ? ((h % 12) || 12) + ':' + m[2] + ' ' + (h >= 12 ? 'PM' : 'AM') : m[1] + ':' + m[2];
        }
        function zjWeatherChart(w, isF) {
          const hi = w.daily?.temperature_2m_max || [], lo = w.daily?.temperature_2m_min || [];
          if (hi.length < 2 || lo.length < 2) return '<small>Chart unavailable</small>';
          const cv = (t) => isF ? t * 9 / 5 + 32 : t;
          const H = hi.map((t) => cv(Number(t))), Lw = lo.map((t) => cv(Number(t)));
          if (H.concat(Lw).some((n) => !Number.isFinite(n))) return '<small>Chart unavailable</small>';
          const mn = Math.min.apply(null, Lw) - 1, mx = Math.max.apply(null, H) + 1, W = 300, Ht = 90, px = 14, step = (W - px * 2) / (H.length - 1);
          const y = (t) => (Ht - 14 - ((t - mn) / (mx - mn || 1)) * (Ht - 28)).toFixed(1), x = (i) => (px + i * step).toFixed(1);
          const pts = (a) => a.map((t, i) => x(i) + ',' + y(t)).join(' ');
          const label = H.map((t, i) => '<text x="' + x(i) + '" y="' + (y(t) - 5) + '" text-anchor="middle" font-size="8" fill="var(--color-text-secondary)">' + Math.round(t) + '°</text>').join('');
          return '<svg class="zj-wchart" viewBox="0 0 ' + W + ' ' + Ht + '" role="img" aria-label="Daily high and low temperature for the next 7 days"><polyline fill="none" stroke="var(--color-warning)" stroke-width="2" points="' + pts(H) + '"/><polyline fill="none" stroke="var(--color-secondary)" stroke-width="2" points="' + pts(Lw) + '"/>' + label + '</svg><div class="zj-wlegend"><span><i style="background:var(--color-warning)"></i>High</span><span><i style="background:var(--color-secondary)"></i>Low</span></div>';
        }

        function zjWeatherRenderForecast(w) {
          const list = document.getElementById('forecast-list');
          if (!list) return;
          list.replaceChildren();
          const times = w.daily?.time || [];
          const maxArr = w.daily?.temperature_2m_max || [];
          const minArr = w.daily?.temperature_2m_min || [];
          const codes = w.daily?.weather_code || [];
          const unit = App.tempUnit === 'C' ? '°C' : '°F';
          const isF = App.tempUnit === 'F';
          for (let i = 0; i < Math.min(7, times.length); i++) {
            const date = new Date(times[i] + 'T12:00:00');
            const day = Number.isNaN(date.getTime()) ? times[i] : date.toLocaleDateString('en-US', { weekday: 'long' });
            const highC = Number(maxArr[i]);
            const lowC = Number(minArr[i]);
            const high = Number.isFinite(highC) ? Math.round(isF ? highC * 9 / 5 + 32 : highC) : '—';
            const low = Number.isFinite(lowC) ? Math.round(isF ? lowC * 9 / 5 + 32 : lowC) : '—';
            const item = document.createElement('div');
            item.className = 'list-item';
            item.style.padding = '8px 12px';
            const left = document.createElement('div');
            const dayEl = document.createElement('div');
            dayEl.style.fontSize = '12px';
            dayEl.textContent = day;
            const condEl = document.createElement('div');
            condEl.style.cssText = 'font-size:11px;color:var(--text-muted);';
            condEl.textContent = weatherDescription(codes[i]);
            left.append(dayEl, condEl);
            const right = document.createElement('div');
            right.style.cssText = "font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent-primary);";
            right.textContent = high + unit + ' / ' + low + unit;
            item.append(left, right);
            list.appendChild(item);
          }
        }

        function zjWeatherPresentChoices(target, choices, query) {
          zjWeatherSetSkeleton(target, false);
          zjWeatherSetText(target, 'desc', 'Choose a matching city below');
          zjWeatherSetText(target, 'loc', 'Select a city');
          zjWeatherSetPlaceholderStats(target);
          const resultsEl = document.getElementById('weather-city-results-' + target);
          if (!resultsEl) return;
          resultsEl.replaceChildren();
          const header = document.createElement('div');
          header.style.cssText = 'padding:9px 12px;font-size:11px;color:var(--text-muted);border-bottom:1px solid var(--border);';
          header.textContent = choices.length + ' matches for "' + query + '". Choose the correct place:';
          resultsEl.appendChild(header);
          choices.forEach((place, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'weather-city-option';
            btn.setAttribute('role', 'option');
            btn.dataset.action = 'weather-select-city:' + target + ':' + index;
            const wrap = document.createElement('span');
            const name = document.createElement('strong');
            name.textContent = place.name || 'Unknown';
            const small = document.createElement('small');
            small.textContent = [place.admin1, place.country].filter(Boolean).join(', ') + (place.timezone ? ' · ' + place.timezone : '');
            wrap.append(name, small);
            const icon = document.createElement('i');
            icon.setAttribute('data-lucide', 'arrow-up-right');
            icon.style.cssText = 'width:14px;height:14px;';
            btn.append(wrap, icon);
            resultsEl.appendChild(btn);
          });
          resultsEl.classList.add('active');
          if (window.lucide) window.lucide.createIcons();
        }

        function zjWeatherClearCityResults(target) {
          const el = document.getElementById('weather-city-results-' + target);
          if (!el) return;
          el.classList.remove('active');
          el.replaceChildren();
        }

        function zjWeatherShowNotFound(target, query) {
          zjWeatherSetSkeleton(target, false);
          zjWeatherSetText(target, 'desc', 'City not found');
          zjWeatherSetText(target, 'loc', 'No match for "' + query + '"');
          zjWeatherSetPlaceholderStats(target);
          toast('No matching city found. Try adding a country name.', 'error');
        }

        function zjWeatherShowError(target, message) {
          zjWeatherSetSkeleton(target, false);
          zjWeatherSetText(target, 'desc', 'Weather unavailable');
          zjWeatherSetText(target, 'loc', '—');
          zjWeatherSetPlaceholderStats(target);
          if (target === 'full') {
            const fresh = document.getElementById('weather-freshness');
            if (fresh) {
              fresh.textContent = message + ' ';
              const b = document.createElement('button');
              b.type = 'button'; b.className = 'btn btn-sm btn-secondary'; b.textContent = 'Retry';
              b.addEventListener('click', () => fetchWeather('full', zjWeatherPlaceSelections.full));
              fresh.appendChild(b);
            }
          }
        }

        function zjWeatherSetSkeleton(target, on) {
          const tempContainer = document.getElementById('weather-temp-container-' + target);
          const descEl = document.getElementById('weather-desc-' + target);
          const locEl = document.getElementById('weather-loc-' + target);
          const statEls = ['rain', 'humidity', 'wind', 'uv'].map((k) => document.getElementById('weather-' + k + '-' + target));
          if (tempContainer) tempContainer.classList.toggle('skeleton', on);
          if (descEl) { descEl.classList.toggle('skeleton', on); if (on) descEl.textContent = '…'; }
          if (locEl) { locEl.classList.toggle('skeleton', on); if (on) locEl.textContent = '…'; }
          statEls.forEach((el) => { if (el) el.classList.toggle('skeleton', on); });
        }

        function zjWeatherSetPlaceholderStats(target) {
          ['rain', 'humidity', 'wind', 'uv'].forEach((k) => {
            const el = document.getElementById('weather-' + k + '-' + target);
            if (el) { el.classList.remove('skeleton'); el.textContent = '—'; }
          });
        }

        function zjWeatherSetText(target, field, value) {
          const el = document.getElementById('weather-' + field + '-' + target);
          if (el) el.textContent = value;
        }

        function zjWeatherSetUnitLabels(unit) {
          const label = unit === 'C' ? '°C' : '°F';
          document.querySelectorAll('.weather-temp-unit').forEach((el) => { el.textContent = label; });
        }

        function zjWeatherUpdateFreshness() {
          const el = document.getElementById('weather-freshness');
          if (!el) return;
          el.textContent = 'Last updated ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + '.';
        }

        function zjWeatherNormalizeSavedCities() {
          if (!Array.isArray(App.cities)) { App.cities = [ZJ_WEATHER_DEFAULT_CITY]; save(); return; }
          App.cities = App.cities.map((c) => {
            if (c && typeof c === 'object') {
              if (!c.label) c.label = zjWeatherFormatPlace(c) || String(c.name || 'Saved city');
              return c;
            }
            return { label: String(c) };
          });
        }

        /* ============ js/command-palette.js ============ */
        const ZJ_CP_BASE_COMMANDS = [
          { id: 'tab-dashboard', label: 'Go to Dashboard', cat: 'Navigation', icon: 'layout-grid', action: () => { closeCommandPalette(); switchTab('dashboard'); } },
          { id: 'tab-notion', label: 'Go to Workspace', cat: 'Navigation', icon: 'file-text', action: () => { closeCommandPalette(); switchTab('notion'); } },
          { id: 'tab-habits', label: 'Go to Habits', cat: 'Navigation', icon: 'target', action: () => { closeCommandPalette(); switchTab('habits'); } },
          { id: 'tab-calendar', label: 'Go to Calendar', cat: 'Navigation', icon: 'calendar', action: () => { closeCommandPalette(); switchTab('calendar'); } },
          { id: 'tab-calculator', label: 'Go to Calculator', cat: 'Navigation', icon: 'calculator', action: () => { closeCommandPalette(); switchTab('calculator'); } },
          { id: 'tab-weather', label: 'Go to Weather', cat: 'Navigation', icon: 'cloud', action: () => { closeCommandPalette(); switchTab('weather'); } },
          { id: 'tab-clock', label: 'Go to Clock', cat: 'Navigation', icon: 'clock', action: () => { closeCommandPalette(); switchTab('clock'); } },
          { id: 'tab-gallery', label: 'Go to Gallery', cat: 'Navigation', icon: 'image', action: () => { closeCommandPalette(); switchTab('gallery'); } },
          { id: 'tab-notes', label: 'Go to Notes', cat: 'Navigation', icon: 'sticky-note', action: () => { closeCommandPalette(); switchTab('notes'); } },
          { id: 'tab-todo', label: 'Go to Tasks', cat: 'Navigation', icon: 'check-square', action: () => { closeCommandPalette(); switchTab('todo'); } },
          { id: 'tab-bookmarks', label: 'Go to Bookmarks', cat: 'Navigation', icon: 'bookmark', action: () => { closeCommandPalette(); switchTab('bookmarks'); } },
          { id: 'tab-pomodoro', label: 'Go to Pomodoro', cat: 'Navigation', icon: 'timer', action: () => { closeCommandPalette(); switchTab('pomodoro'); } },
          { id: 'tab-converter', label: 'Go to Converter', cat: 'Navigation', icon: 'arrow-left-right', action: () => { closeCommandPalette(); switchTab('converter'); } },
          { id: 'tab-password', label: 'Go to Password Gen', cat: 'Navigation', icon: 'key', action: () => { closeCommandPalette(); switchTab('password'); } },
          { id: 'tab-colorpicker', label: 'Go to Color Picker', cat: 'Navigation', icon: 'palette', action: () => { closeCommandPalette(); switchTab('colorpicker'); } },
          { id: 'tab-chatbot', label: 'Go to Assistant', cat: 'Navigation', icon: 'message-square', action: () => { closeCommandPalette(); switchTab('chatbot'); } },
          { id: 'new-note', label: 'Create New Note', cat: 'Actions', icon: 'plus', action: () => { closeCommandPalette(); switchTab('notes'); setTimeout(() => openNoteDialog(), 100); } },
          { id: 'new-task', label: 'Add Task', cat: 'Actions', icon: 'plus', action: () => { closeCommandPalette(); switchTab('todo'); setTimeout(() => document.getElementById('todo-input')?.focus(), 100); } },
          { id: 'new-chat', label: 'Start New Chat', cat: 'Actions', icon: 'message-square', action: () => { closeCommandPalette(); switchTab('chatbot'); setTimeout(() => createNewChat(), 100); } },
          { id: 'new-page', label: 'Create Notion Page', cat: 'Actions', icon: 'file-plus', action: () => { closeCommandPalette(); switchTab('notion'); setTimeout(() => createNotionPage(), 100); } },
          { id: 'new-habit', label: 'Add Habit', cat: 'Actions', icon: 'target', action: () => { closeCommandPalette(); switchTab('habits'); setTimeout(() => document.getElementById('habit-dialog')?.showModal(), 100); } },
          { id: 'new-bookmark', label: 'Add Bookmark', cat: 'Actions', icon: 'bookmark', action: () => { closeCommandPalette(); switchTab('bookmarks'); setTimeout(() => document.getElementById('bookmark-dialog')?.showModal(), 100); } },
          { id: 'new-alarm', label: 'Set Alarm', cat: 'Actions', icon: 'alarm-clock', action: () => { closeCommandPalette(); switchTab('clock'); setTimeout(() => window.zjSwitchClockTab && window.zjSwitchClockTab('alarms'), 100); } },
          { id: 'toggle-theme', label: 'Change Theme', cat: 'Settings', icon: 'palette', action: () => { closeCommandPalette(); document.getElementById('theme-dialog')?.showModal(); } },
          { id: 'toggle-mode', label: 'Toggle Light/Dark', cat: 'Settings', icon: 'sun', action: () => { closeCommandPalette(); setMode(App.mode === 'dark' ? 'light' : 'dark'); } },
          { id: 'toggle-sound-cmd', label: 'Toggle Sound', cat: 'Settings', icon: 'volume-2', action: () => {
            App.sound = !App.sound;
            save();
            const t = document.getElementById('toggle-sound'); if (t) t.checked = App.sound;
            toast(App.sound ? 'Sound on' : 'Sound off', 'success');
            closeCommandPalette();
          } },
          { id: 'export-all', label: 'Export Data', cat: 'Settings', icon: 'download', action: () => { closeCommandPalette(); exportData(); } },
          { id: 'settings', label: 'Open Settings', cat: 'Settings', icon: 'settings', action: () => { closeCommandPalette(); document.getElementById('settings-dialog')?.showModal(); } },
        ];

        let zjCpSelectedIndex = 0;
        let zjCpFiltered = [];
        let zjCpInputEl = null;
        let zjCpResultsEl = null;
        let zjCpPaletteEl = null;

        function openCommandPalette() {
          zjCpPaletteEl = document.getElementById('command-palette');
          zjCpInputEl = document.getElementById('command-input');
          zjCpResultsEl = document.getElementById('command-results');
          if (!zjCpPaletteEl || !zjCpInputEl || !zjCpResultsEl) return;
          zjCpPaletteEl.classList.add('active');
          zjCpInputEl.value = '';
          zjCpSelectedIndex = 0;
          zjCpRenderResults('');
          setTimeout(() => zjCpInputEl.focus(), 30);
        }

        function closeCommandPalette() {
          const el = document.getElementById('command-palette');
          el?.classList.remove('active');
        }

        function executeCommand(index) {
          const row = zjCpFiltered[index];
          if (!row) return;
          closeCommandPalette();
          try { row.action(); }
          catch (err) { console.error('zj-os: command failed', err); toast('Command failed', 'error'); }
        }

        function bindCommandPalette() {
          zjCpPaletteEl = document.getElementById('command-palette');
          zjCpInputEl = document.getElementById('command-input');
          zjCpResultsEl = document.getElementById('command-results');
          if (!zjCpPaletteEl || !zjCpInputEl || !zjCpResultsEl) return;
          zjCpInputEl.addEventListener('input', (e) => { zjCpSelectedIndex = 0; zjCpRenderResults(e.target.value); });
          zjCpInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); zjCpSelectedIndex = Math.min(zjCpSelectedIndex + 1, zjCpFiltered.length - 1); zjCpRenderResults(zjCpInputEl.value); zjCpScrollSelectedIntoView(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); zjCpSelectedIndex = Math.max(zjCpSelectedIndex - 1, 0); zjCpRenderResults(zjCpInputEl.value); zjCpScrollSelectedIntoView(); }
            else if (e.key === 'Enter') { e.preventDefault(); executeCommand(zjCpSelectedIndex); }
            else if (e.key === 'Escape') closeCommandPalette();
          });
          zjCpPaletteEl.addEventListener('click', (e) => { if (e.target === zjCpPaletteEl) closeCommandPalette(); });
          zjCpResultsEl.addEventListener('click', (e) => {
            const row = e.target.closest('.command-item');
            if (!row) return;
            const idx = Number(row.dataset.index);
            if (Number.isFinite(idx)) executeCommand(idx);
          });
          document.addEventListener('keydown', (e) => {
            const t = e.target;
            const inField = t && (t.matches?.('input, textarea, select') || t.isContentEditable);
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K') && !inField) {
              e.preventDefault();
              if (zjCpPaletteEl.classList.contains('active')) closeCommandPalette();
              else openCommandPalette();
            }
          });
        }

        function zjCpBuildAll() {
          const rows = [...ZJ_CP_BASE_COMMANDS];
          const A = App;
          for (const note of (A.notes || [])) {
            if (!note || !note.title) continue;
            rows.push({ id: 'note-' + note.id, label: String(note.title), cat: 'Note', icon: 'sticky-note', action: () => { closeCommandPalette(); switchTab('notes'); setTimeout(() => editNote(note.id), 100); } });
          }
          for (const todo of (A.todos || [])) {
            if (!todo || !todo.text) continue;
            rows.push({ id: 'todo-' + todo.id, label: String(todo.text), cat: 'Task', icon: 'check-square', action: () => { closeCommandPalette(); switchTab('todo'); setTimeout(() => editTodo(todo.id), 100); } });
          }
          for (const chat of (A.chats || [])) {
            if (!chat || !chat.title) continue;
            rows.push({ id: 'chat-' + chat.id, label: String(chat.title), cat: 'Chat', icon: 'message-square', action: () => { closeCommandPalette(); switchTab('chatbot'); setTimeout(() => switchChat(chat.id), 100); } });
          }
          for (const bm of (A.bookmarks || [])) {
            if (!bm) continue;
            const title = String(bm.title || '');
            const url = String(bm.url || '');
            if (!title && !url) continue;
            rows.push({ id: 'bookmark-' + bm.id, label: title || url, haystack: title + ' ' + url, cat: 'Bookmark', icon: 'bookmark', action: () => { closeCommandPalette(); switchTab('bookmarks'); try { window.open(url, '_blank', 'noopener'); } catch (_) {} } });
          }
          for (const habit of (A.habits || [])) {
            if (!habit || !habit.name) continue;
            rows.push({ id: 'habit-' + habit.id, label: String(habit.name), cat: 'Habit', icon: 'target', action: () => { closeCommandPalette(); switchTab('habits'); setTimeout(() => document.querySelector('[data-action="habit-toggle:' + zjCpCssEscape(habit.id) + '"]')?.focus(), 100); } });
          }
          for (const alarm of (A.alarms || [])) {
            if (!alarm) continue;
            const label = String(alarm.label || 'Alarm');
            const time = String(alarm.time || '');
            rows.push({ id: 'alarm-' + alarm.id, label: time + ' ' + label, haystack: label + ' ' + time + ' ' + (alarm.repeat || ''), cat: 'Alarm', icon: 'alarm-clock', action: () => { closeCommandPalette(); switchTab('clock'); setTimeout(() => switchClockTab('alarms'), 100); } });
          }
          return rows;
        }

        function zjCpRenderResults(query) {
          if (!zjCpResultsEl) return;
          const rows = zjCpBuildAll();
          zjCpFiltered = zjCpFilterAndSort(rows, query);
          if (zjCpFiltered.length === 0) {
            zjCpResultsEl.replaceChildren();
            const empty = document.createElement('div');
            empty.className = 'command-empty';
            empty.textContent = query ? 'No results for "' + query + '"' : 'Type to search or press Escape to close';
            zjCpResultsEl.appendChild(empty);
            return;
          }
          if (zjCpSelectedIndex >= zjCpFiltered.length) zjCpSelectedIndex = zjCpFiltered.length - 1;
          if (zjCpSelectedIndex < 0) zjCpSelectedIndex = 0;
          zjCpResultsEl.replaceChildren();
          zjCpFiltered.forEach((row, i) => {
            const item = document.createElement('div');
            item.className = 'command-item' + (i === zjCpSelectedIndex ? ' selected' : '');
            item.dataset.index = String(i);
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', String(i === zjCpSelectedIndex));
            const icon = document.createElement('i');
            icon.setAttribute('data-lucide', row.icon || 'circle');
            const text = document.createElement('span');
            text.className = 'command-item-text';
            text.textContent = row.label;
            const cat = document.createElement('span');
            cat.className = 'command-item-cat';
            cat.textContent = row.cat || '';
            item.append(icon, text, cat);
            zjCpResultsEl.appendChild(item);
          });
          if (window.lucide) window.lucide.createIcons();
        }

        function zjCpFilterAndSort(rows, query) {
          const q = String(query || '').trim().toLowerCase();
          if (!q) return rows;
          const tokens = q.split(/\s+/).filter(Boolean);
          const scored = [];
          for (const row of rows) {
            const haystack = (row.haystack || (row.label + ' ' + row.cat)).toLowerCase();
            let allMatch = true;
            let score = 0;
            for (const tok of tokens) {
              const pos = haystack.indexOf(tok);
              if (pos < 0) { allMatch = false; break; }
              const before = pos === 0 ? ' ' : haystack[pos - 1];
              if (/[\s,./]/.test(before)) score += 10;
              score += Math.max(0, 5 - pos / 10);
            }
            if (!allMatch) continue;
            scored.push({ row, score });
          }
          scored.sort((a, b) => b.score - a.score);
          return scored.map((s) => s.row);
        }

        function zjCpScrollSelectedIntoView() {
          if (!zjCpResultsEl) return;
          const el = zjCpResultsEl.querySelector('.command-item.selected');
          if (el) el.scrollIntoView({ block: 'nearest' });
        }

        function zjCpCssEscape(s) {
          return (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
        }

        /* ============ js/settings.js ============ */
        const ZJ_VALID_THEMES = new Set(['gold']);
        const ZJ_VALID_MODES = new Set(['dark', 'light']);
        const ZJ_BACKUP_VERSION = 1;
        const ZJ_BACKUP_FIELDS = [
          'notes', 'todos', 'alarms', 'images', 'chats', 'notionPages', 'habits',
          'bookmarks', 'cities', 'recentColors', 'activeChat', 'activePage',
          'theme', 'mode', 'sound', 'tempUnit', 'clock24h',
          'calcLog', 'pomoSessions', 'pomoLastDate',
          'activeCities', 'enhancements',
        ];
        const ZJ_ARRAY_FIELDS = new Set(['notes', 'todos', 'alarms', 'images', 'chats', 'notionPages', 'habits', 'bookmarks', 'cities', 'recentColors', 'calcLog', 'activeCities']);

        function zjUpdateSwatchUI(theme) {
          document.querySelectorAll('[data-theme-swatch]').forEach((el) => { el.classList.toggle('active', el.dataset.themeSwatch === theme); });
        }

        // Single place that applies the colour scheme: data-mode + data-theme both
        // carry "dark" | "light" so every token selector resolves, and the browser
        // chrome colour (PWA / mobile address bar) follows the active palette.
        function zjApplyScheme(mode) {
          const root = document.documentElement;
          root.setAttribute('data-mode', mode);
          root.setAttribute('data-theme', mode);
          root.style.colorScheme = mode;
          const meta = document.querySelector('meta[name="theme-color"]');
          if (meta) meta.setAttribute('content', mode === 'light' ? '#F8FAFC' : '#02060D');
        }

        function zjUpdateModeUI(mode) {
          document.querySelectorAll('[data-mode-btn]').forEach((b) => { b.classList.toggle('active', b.dataset.modeBtn === mode); });
        }

        function setTheme(theme, persist) {
          if (persist === undefined) persist = true;
          // The legacy accent-theme key is kept for stored-data compatibility only.
          // The official ZJ OS palette is chosen by mode (dark / light) via setMode().
          theme = 'gold';
          App.theme = theme;
          zjUpdateSwatchUI(theme);
          if (persist) saveNow();
        }

        function setMode(mode, persist) {
          if (persist === undefined) persist = true;
          mode = mode === 'light' ? 'light' : 'dark';
          zjApplyScheme(mode);
          App.mode = mode;
          zjUpdateModeUI(mode);
          if (persist) { saveNow(); toast(mode === 'light' ? 'Light theme applied' : 'Dark theme applied', 'success'); }
        }

        function exportData() {
          saveNow();
          const data = {};
          for (const key of ZJ_BACKUP_FIELDS) {
            const raw = localStorage.getItem('zj_' + key);
            if (raw === null) continue;
            try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
          }
          const backup = { schema: 'zj-os-backup', version: ZJ_BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
          const filename = 'zj-os-backup-' + new Date().toISOString().slice(0, 10) + '.json';
          downloadText(filename, JSON.stringify(backup, null, 2), 'application/json');
          toast('Backup exported', 'success');
        }

        function importData() {
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = 'application/json,.json';
          fileInput.addEventListener('change', () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) { toast('Backup is too large (maximum 10 MB)', 'error'); return; }
            const reader = new FileReader();
            reader.onerror = () => toast('Could not read the selected backup', 'error');
            reader.onload = () => {
              try { zjApplyImport(String(reader.result || '')); }
              catch (err) { toast(err && err.message ? err.message : 'Invalid backup file', 'error'); }
            };
            reader.readAsText(file);
          });
          fileInput.click();
        }

        function zjApplyImport(raw) {
          const parsed = JSON.parse(raw);
          const isWrapped = parsed && parsed.schema === 'zj-os-backup';
          const payload = isWrapped ? parsed.data : parsed;
          if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Backup format is invalid');
          if (isWrapped && parsed.version > ZJ_BACKUP_VERSION) throw new Error('This backup was created by a newer version of ZJ OS');
          const allowed = new Set(ZJ_BACKUP_FIELDS);
          const accepted = {};
          for (const key of Object.keys(payload)) {
            if (!allowed.has(key)) continue;
            if (ZJ_ARRAY_FIELDS.has(key) && !Array.isArray(payload[key])) throw new Error('Invalid data for ' + key + ' (expected array)');
            accepted[key] = payload[key];
          }
          const keys = Object.keys(accepted);
          if (keys.length === 0) throw new Error('No supported ZJ OS data found in this file');
          confirmAction('Import Backup', 'Restore ' + keys.length + ' data categories? Existing values in those categories will be replaced.', () => zjDoImport(accepted));
        }

        function zjDoImport(accepted) {
          let written = 0;
          for (const [key, value] of Object.entries(accepted)) {
            // FIX: use module-scoped ZJStorage.
            if (ZJStorage.set(key, value)) written++;
            else console.warn('zj-os: import write failed for', key);
          }
          toast('Backup imported (' + written + ' categories). Reloading…', 'success');
          setTimeout(() => location.reload(), 700);
        }

        function clearAllData() {
          confirmAction('Clear All Data', 'Delete ZJ OS data stored in this browser? Export a backup first if you may need it later.', () => {
            try {
              const keys = [];
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('zj_')) keys.push(k);
              }
              for (const k of keys) localStorage.removeItem(k);
            } catch (err) {
              console.error('zj-os: clear failed', err);
              toast('Could not clear local data in this browser', 'error');
              return;
            }
            location.reload();
          });
        }

        function initSettings() {
          const A = App;
          if (!ZJ_VALID_MODES.has(A.mode)) A.mode = 'dark';
          zjApplyScheme(A.mode);
          zjUpdateSwatchUI(A.theme);
          zjUpdateModeUI(A.mode);
          window.addEventListener('zj:sync', (e) => {
            const d = e.detail;
            if (!d) return;
            if (d.key === 'theme' && ZJ_VALID_THEMES.has(d.value) && d.value !== A.theme) setTheme(d.value, false);
            if (d.key === 'mode' && ZJ_VALID_MODES.has(d.value) && d.value !== A.mode) setMode(d.value, false);
          });
          window.addEventListener('zj:theme-change', (e) => {
            const d = e.detail || {};
            if (d.theme && ZJ_VALID_THEMES.has(d.theme) && d.theme !== A.theme) { A.theme = d.theme; zjUpdateSwatchUI(A.theme); }
            if (d.mode && ZJ_VALID_MODES.has(d.mode) && d.mode !== A.mode) { A.mode = d.mode; zjUpdateModeUI(A.mode); }
          });
          // FIX: use module-scoped ZJStorage for reading persisted theme/mode.
          const storedTheme = ZJStorage.get('theme', null);
          if (ZJ_VALID_THEMES.has(storedTheme) && storedTheme !== A.theme) {
            A.theme = storedTheme;
            zjUpdateSwatchUI(A.theme);
          }
          const storedMode = ZJStorage.get('mode', null);
          if (ZJ_VALID_MODES.has(storedMode) && storedMode !== A.mode) {
            A.mode = storedMode;
            zjApplyScheme(A.mode);
            zjUpdateModeUI(A.mode);
          }
        }

        /* ============ js/chatbot.js ============ */
        const ZJ_CHAT_STREAM_TIMEOUT_MS = 60000;
        const ZJ_CHAT_MAX_INPUT_LEN = 2000;
        const ZJ_CHAT_CONTEXT_WINDOW_MESSAGES = 18;
        const ZJ_CHAT_SUMMARY_KEEP_MESSAGES = 12;
        const ZJ_CHAT_SUMMARY_BATCH_MIN = 4;
        const ZJ_CHAT_SUMMARY_MAX_CHARS = 6000;
        const zjChatSummaryInFlight = new Set();

        let zjChatSearchQuery = '';
        let zjChatAbort = null;
        let zjChatGenerationId = 0;

        function initChatbot() {
          const A = App;
          if (A.chats && A.chats.length && !A.chats.some((c) => c.id === A.activeChat)) A.activeChat = A.chats[0].id;
          renderChatSidebar();
          renderChatMessages();
          zjChatEnsureRenameDialog();
        }

        function bindChatActions() {
          document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action || '';
            if (action.startsWith('chat-switch:')) { e.preventDefault(); switchChat(action.slice(12)); return; }
            if (action.startsWith('chat-star:')) { e.preventDefault(); e.stopPropagation(); toggleStarChat(action.slice(10)); return; }
            if (action.startsWith('chat-del:')) { e.preventDefault(); e.stopPropagation(); deleteChat(action.slice(9)); return; }
            if (action === 'chat-rename-cancel') { e.preventDefault(); document.getElementById('chat-rename-dialog')?.close(); return; }
            if (action === 'chat-rename-save') { e.preventDefault(); zjChatSaveRename(); return; }
            if (action.startsWith('chat-copy:')) {
              e.preventDefault();
              const parts = action.split(':');
              copyChatMessage(parts[1], Number(parts[2]));
              return;
            }
            if (action.startsWith('chat-reuse:')) {
              e.preventDefault();
              const parts = action.split(':');
              reuseChatReply(parts[1], Number(parts[2]));
              return;
            }
          });
          document.addEventListener('keydown', (e) => {
            if (e.target?.id === 'chat-rename-input' && e.key === 'Enter') { e.preventDefault(); zjChatSaveRename(); }
          });
          window.addEventListener('zj:sync', (e) => {
            if (e.detail?.key === 'chats' || e.detail?.key === 'activeChat') {
              renderChatSidebar(document.getElementById('chat-history-filter')?.value || '');
              renderChatMessages();
            }
          });
        }

        function openAssistant() {
          switchTab('chatbot');
          if (!App.activeChat || !App.chats.some((c) => c.id === App.activeChat)) createNewChat();
          setTimeout(() => document.getElementById('chat-input')?.focus(), 80);
        }

        function toggleChatHistory(force) {
          const layout = document.getElementById('chat-layout');
          if (!layout) return;
          const open = typeof force === 'boolean' ? force : !layout.classList.contains('history-open');
          layout.classList.toggle('history-open', open);
        }

        function createNewChat() {
          const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString();
          const chat = { id, title: 'New Chat', messages: [], contextSummary: '', contextSummaryCount: 0, contextSummaryUpdatedAt: null, contextRevision: 0, starred: false, createdAt: Date.now(), updatedAt: Date.now() };
          App.chats.unshift(chat);
          App.activeChat = id;
          zjChatSearchQuery = '';
          const filterInput = document.getElementById('chat-history-filter');
          if (filterInput) filterInput.value = '';
          saveNow();
          renderChatSidebar();
          renderChatMessages();
          toggleChatHistory(false);
          document.getElementById('chat-input')?.focus();
        }

        function switchChat(id) {
          if (!App.chats.some((c) => c.id === id)) return;
          if (zjChatAbort) stopGeneration();
          App.activeChat = id;
          zjChatSearchQuery = '';
          saveNow();
          renderChatSidebar(document.getElementById('chat-history-filter')?.value || '');
          renderChatMessages();
          toggleChatHistory(false);
        }

        function toggleStarChat(id) {
          const chat = App.chats.find((x) => x.id === id);
          if (!chat) return;
          chat.starred = !chat.starred;
          chat.updatedAt = Date.now();
          save();
          renderChatSidebar(document.getElementById('chat-history-filter')?.value || '');
        }

        function clearActiveChat() {
          const chat = App.chats.find((x) => x.id === App.activeChat);
          if (!chat) return toast('Choose a chat first.', 'error');
          confirmAction('Clear messages', 'Remove all messages from this chat? The conversation itself will remain in history.', () => {
            chat.messages = [];
            chat.contextSummary = '';
            chat.contextSummaryCount = 0;
            chat.contextSummaryUpdatedAt = null;
            chat.contextRevision = (Number(chat.contextRevision) || 0) + 1;
            chat.title = 'New Chat';
            chat.updatedAt = Date.now();
            saveNow();
            renderChatSidebar();
            renderChatMessages();
            toast('Chat messages cleared.', 'success');
          });
        }

        function deleteChat(id) {
          const chat = App.chats.find((x) => x.id === id);
          if (!chat) return;
          confirmAction('Delete conversation', 'Permanently delete "' + (chat.title || 'New Chat') + '" and its messages from this device?', () => {
            if (id === App.activeChat && zjChatAbort) stopGeneration();
            App.chats = App.chats.filter((x) => x.id !== id);
            if (App.activeChat === id) App.activeChat = App.chats[0]?.id || null;
            saveNow();
            renderChatSidebar(document.getElementById('chat-history-filter')?.value || '');
            renderChatMessages();
            toast('Conversation deleted.', 'success');
          });
        }

        function deleteActiveChat() {
          if (!App.activeChat) return toast('Choose a chat first.', 'error');
          deleteChat(App.activeChat);
        }

        function renameActiveChat() {
          const chat = App.chats.find((x) => x.id === App.activeChat);
          if (!chat) return toast('Choose a chat first.', 'error');
          zjChatEnsureRenameDialog();
          const dlg = document.getElementById('chat-rename-dialog');
          const input = document.getElementById('chat-rename-input');
          if (!dlg || !input) return;
          input.value = chat.title || 'New Chat';
          dlg.dataset.chatId = chat.id;
          dlg.showModal();
          setTimeout(() => { input.focus(); input.select(); }, 50);
        }

        function exportActiveChat() {
          const chat = App.chats.find((x) => x.id === App.activeChat);
          if (!chat) return toast('Choose a chat first.', 'error');
          const safe = (chat.title || 'zj-chat').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 60);
          const body = '# ' + (chat.title || 'New Chat') + '\n\n' + (chat.messages || []).map((m) => '**' + (m.role === 'user' ? 'You' : 'ZJ Assistant') + ':**\n\n' + m.content).join('\n\n---\n\n');
          downloadText(safe + '.md', body, 'text/markdown');
        }

        function exportAllChats() {
          const md = App.chats.map((c) =>
            '# ' + (c.title || 'New Chat') + '\n\n' +
            (c.messages || []).map((m) => '**' + (m.role === 'user' ? 'You' : 'AI') + ':** ' + m.content).join('\n\n')
          ).join('\n\n---\n\n');
          downloadText('zj-chats.md', md, 'text/markdown');
          toast('Exported all chats.', 'success');
        }

        function searchChat(q) { zjChatSearchQuery = String(q || ''); renderChatMessages(); }

        function renderChatSidebar(filter) {
          if (filter === undefined) filter = '';
          const list = document.getElementById('chat-list');
          if (!list) return;
          const q = String(filter || '').trim().toLowerCase();
          const chats = App.chats.filter((c) =>
            !q || String(c.title || '').toLowerCase().includes(q) ||
            (c.messages || []).some((m) => String(m.content || '').toLowerCase().includes(q))
          );
          list.replaceChildren();
          if (chats.length === 0) {
            const wrap = document.createElement('div');
            wrap.innerHTML = createEmptyState('message-square', 'No chats yet', 'Start a new conversation');
            list.appendChild(wrap);
            if (window.lucide) window.lucide.createIcons();
            return;
          }
          for (const chat of chats) {
            const item = document.createElement('div');
            item.className = 'chat-list-item' + (chat.id === App.activeChat ? ' active' : '');
            item.dataset.action = 'chat-switch:' + chat.id;
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            const title = document.createElement('span');
            title.className = 'chat-title';
            title.title = String(chat.title || 'New Chat');
            title.textContent = (chat.starred ? '⭐ ' : '') + String(chat.title || 'New Chat');
            const actions = document.createElement('span');
            actions.className = 'chat-actions';
            const star = document.createElement('button');
            star.type = 'button';
            star.className = 'chat-action';
            star.dataset.action = 'chat-star:' + chat.id;
            star.setAttribute('aria-label', chat.starred ? 'Unstar chat' : 'Star chat');
            star.title = chat.starred ? 'Unstar' : 'Star';
            const starIcon = document.createElement('i');
            starIcon.setAttribute('data-lucide', 'star');
            starIcon.style.cssText = 'width:11px;height:11px;' + (chat.starred ? 'fill:var(--warning);color:var(--warning);' : '');
            star.appendChild(starIcon);
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'chat-action delete';
            del.dataset.action = 'chat-del:' + chat.id;
            del.setAttribute('aria-label', 'Delete chat');
            del.title = 'Delete chat';
            const delIcon = document.createElement('i');
            delIcon.setAttribute('data-lucide', 'trash-2');
            delIcon.style.cssText = 'width:11px;height:11px;';
            del.appendChild(delIcon);
            actions.append(star, del);
            item.append(title, actions);
            list.appendChild(item);
          }
          if (window.lucide) window.lucide.createIcons();
        }

        function renderChatMessages() {
          const el = document.getElementById('chat-messages');
          const nameEl = document.getElementById('active-chat-name');
          if (!el || !nameEl) return;
          const chat = App.chats.find((x) => x.id === App.activeChat);
          if (!chat) {
            el.replaceChildren();
            const wrap = document.createElement('div');
            wrap.innerHTML = createEmptyState('message-square', 'No chat selected', 'Start a new chat or select one');
            el.appendChild(wrap);
            nameEl.textContent = 'No Chat';
            if (window.lucide) window.lucide.createIcons();
            return;
          }
          nameEl.textContent = chat.title || 'New Chat';
          let msgs = Array.isArray(chat.messages) ? chat.messages.slice() : [];
          if (zjChatSearchQuery) {
            const q = zjChatSearchQuery.toLowerCase();
            msgs = msgs.filter((m) => String(m.content || '').toLowerCase().includes(q));
          }
          el.replaceChildren();
          if (msgs.length === 0) {
            const wrap = document.createElement('div');
            wrap.innerHTML = createEmptyState('messages-square', 'No messages yet', 'Ask anything or choose a quick prompt');
            el.appendChild(wrap);
            if (window.lucide) window.lucide.createIcons();
            return;
          }
          const originalIndices = msgs.map((m) => chat.messages.indexOf(m));
          msgs.forEach((msg, i) => { el.appendChild(zjChatBuildMessageRow(chat.id, msg, originalIndices[i])); });
          if (window.lucide) window.lucide.createIcons();
          el.scrollTop = el.scrollHeight;
        }

        async function copyChatMessage(chatId, index) {
          const chat = App.chats.find((x) => x.id === chatId);
          const msg = chat?.messages?.[index];
          if (!msg) return;
          try { await navigator.clipboard.writeText(String(msg.content || '')); toast('Copied message.', 'success'); }
          catch (_) { toast('Clipboard permission was blocked.', 'error'); }
        }

        function reuseChatReply(chatId, index) {
          const chat = App.chats.find((x) => x.id === chatId);
          const msg = chat?.messages?.[index];
          if (!msg) return;
          const input = document.getElementById('chat-input');
          if (!input) return;
          input.value = String(msg.content || '');
          autoResizeChat(input);
          input.focus();
        }

        function useQuickPrompt(prompt) {
          const input = document.getElementById('chat-input');
          if (!input) return;
          input.value = String(prompt || '');
          autoResizeChat(input);
          input.focus();
        }

        function autoResizeChat(el) {
          if (!el) return;
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 120) + 'px';
          const counter = document.getElementById('char-count');
          if (counter) counter.textContent = el.value.length + '/' + ZJ_CHAT_MAX_INPUT_LEN;
        }

        function handleChatKey(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.querySelector('#tab-chatbot .chat-input-area')?.requestSubmit();
          }
        }

        function startVoiceInput() {
          const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SR) return toast('Voice input is not supported by this browser.', 'error');
          const rec = new SR();
          rec.lang = 'en-US';
          rec.onresult = (e) => {
            const input = document.getElementById('chat-input');
            if (!input) return;
            input.value = e.results[0][0].transcript;
            autoResizeChat(input);
          };
          rec.onerror = () => toast('Voice input could not start. Check microphone permission.', 'error');
          try { rec.start(); toast('Listening…', 'info'); }
          catch (_) { toast('Voice input could not start.', 'error'); }
        }

        function stopGeneration() {
          if (!zjChatAbort) return;
          const chat = App.chats.find((x) => x.id === App.activeChat);
          try { zjChatAbort.abort(); } catch (_) {}
          zjChatAbort = null;
          zjChatGenerationId++;
          zjChatDropStreamingBubble();
          document.getElementById('typing-ind')?.remove();
          if (chat) {
            chat.messages.push({ role: 'assistant', content: 'Generation stopped.', timestamp: Date.now(), error: true });
            chat.updatedAt = Date.now();
            saveNow();
          }
          const sendBtn = document.getElementById('chat-send-btn');
          const stopBtn = document.getElementById('chat-stop-btn');
          if (sendBtn) { sendBtn.disabled = false; sendBtn.classList.remove('hidden'); }
          if (stopBtn) stopBtn.classList.add('hidden');
          renderChatMessages();
          toast('Generation stopped.', 'info');
        }

        function zjChatGetContextMessages(chat, limit = ZJ_CHAT_CONTEXT_WINDOW_MESSAGES) {
          const valid = (Array.isArray(chat?.messages) ? chat.messages : [])
            .filter((m) => m && !m.error && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
            .map((m) => ({ role: m.role, content: String(m.content).slice(0, 8000) }));
          const selected = [];
          let totalChars = 0;
          // Stay below the server's 40,000-character validation ceiling with headroom.
          for (let i = valid.length - 1; i >= 0 && selected.length < limit; i--) {
            const item = valid[i];
            if (totalChars + item.content.length > 32000) break;
            selected.push(item);
            totalChars += item.content.length;
          }
          return selected.reverse();
        }

        async function zjChatMaybeUpdateSummary(chat) {
          if (!chat?.id || zjChatSummaryInFlight.has(chat.id)) return;
          const valid = (Array.isArray(chat.messages) ? chat.messages : [])
            .filter((m) => m && !m.error && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim());
          const alreadySummarized = Math.max(0, Math.min(valid.length, Number(chat.contextSummaryCount) || 0));
          const desiredCount = Math.max(0, valid.length - ZJ_CHAT_SUMMARY_KEEP_MESSAGES);
          let targetCount = alreadySummarized;
          let batchChars = 0;
          // Summarize complete turns in bounded batches under the API's 40k-char limit.
          while (targetCount < desiredCount && targetCount - alreadySummarized < 20) {
            const nextLength = String(valid[targetCount].content).slice(0, 8000).length;
            if (batchChars + nextLength > 32000) break;
            batchChars += nextLength;
            targetCount++;
          }
          targetCount -= (targetCount - alreadySummarized) % 2;
          const pendingCount = targetCount - alreadySummarized;
          if (pendingCount < ZJ_CHAT_SUMMARY_BATCH_MIN) return;

          const batch = valid.slice(alreadySummarized, targetCount).map((m) => ({
            role: m.role,
            content: String(m.content).slice(0, 8000)
          }));
          if (!batch.length) return;

          const summaryRevision = Number(chat.contextRevision) || 0;
          zjChatSummaryInFlight.add(chat.id);
          let summaryUpdated = false;
          try {
            const response = await fetch('/api/chat/summarize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              cache: 'no-store',
              body: JSON.stringify({
                summary: String(chat.contextSummary || '').slice(0, ZJ_CHAT_SUMMARY_MAX_CHARS),
                messages: batch
              })
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error || 'Memory summary request failed (' + response.status + ').');
            if (typeof body.summary !== 'string') throw new Error('Memory summary response was invalid.');

            // The chat may have been deleted while the summary request was running.
            const current = App.chats.find((item) => item.id === chat.id);
            if (!current || (Number(current.contextRevision) || 0) !== summaryRevision) return;
            current.contextSummary = body.summary.slice(0, ZJ_CHAT_SUMMARY_MAX_CHARS);
            current.contextSummaryCount = alreadySummarized + batch.length;
            current.contextSummaryUpdatedAt = Date.now();
            saveNow();
            summaryUpdated = true;
          } catch (error) {
            console.warn('zj-os: conversation memory summary was not updated:', error);
          } finally {
            zjChatSummaryInFlight.delete(chat.id);
            if (summaryUpdated) {
              const current = App.chats.find((item) => item.id === chat.id);
              if (current) {
                const remaining = (Array.isArray(current.messages) ? current.messages : [])
                  .filter((m) => m && !m.error && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim()).length
                  - (Number(current.contextSummaryCount) || 0) - ZJ_CHAT_SUMMARY_KEEP_MESSAGES;
                if (remaining >= ZJ_CHAT_SUMMARY_BATCH_MIN) void zjChatMaybeUpdateSummary(current);
              }
            }
          }
        }

        async function sendChatMessage(e) {
          e?.preventDefault?.();
          const input = document.getElementById('chat-input');
          if (!input) return;
          const msg = input.value.trim();
          if (!msg) return;
          if (msg.length > ZJ_CHAT_MAX_INPUT_LEN) {
            toast('Message is too long. Keep it under ' + ZJ_CHAT_MAX_INPUT_LEN + ' characters.', 'error');
            return;
          }

          let chat = App.chats.find((x) => x.id === App.activeChat);
          if (!chat) {
            createNewChat();
            chat = App.chats.find((x) => x.id === App.activeChat);
          }
          if (!chat) return toast('Could not create a chat. Please try again.', 'error');
          if (!Array.isArray(chat.messages)) chat.messages = [];

          if (chat.messages.length === 0 || chat.title === 'New Chat') {
            chat.title = msg.substring(0, 38) + (msg.length > 38 ? '…' : '');
            renderChatSidebar(document.getElementById('chat-history-filter')?.value || '');
          }

          chat.messages.push({ role: 'user', content: msg, timestamp: Date.now() });
          chat.updatedAt = Date.now();
          save();
          renderChatMessages();

          input.value = '';
          input.style.height = 'auto';
          const counter = document.getElementById('char-count');
          if (counter) counter.textContent = '0/' + ZJ_CHAT_MAX_INPUT_LEN;

          const sendBtn = document.getElementById('chat-send-btn');
          const stopBtn = document.getElementById('chat-stop-btn');
          if (sendBtn) { sendBtn.disabled = true; sendBtn.classList.add('hidden'); }
          if (stopBtn) stopBtn.classList.remove('hidden');

          zjChatShowTypingIndicator();
          const generationId = ++zjChatGenerationId;
          const controller = new AbortController();
          zjChatAbort = controller;
          let timedOut = false;
          const timeoutId = setTimeout(() => {
            timedOut = true;
            try { controller.abort(); } catch (_) {}
          }, ZJ_CHAT_STREAM_TIMEOUT_MS);
          let responseSucceeded = false;

          const mode = document.getElementById('chat-context-mode')?.value || 'off';
          const appContext = zjChatBuildAssistantContext(mode);
          const contextMessages = zjChatGetContextMessages(chat, chat.contextSummary ? ZJ_CHAT_SUMMARY_KEEP_MESSAGES : ZJ_CHAT_CONTEXT_WINDOW_MESSAGES);

          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
              cache: 'no-store',
              body: JSON.stringify({
                messages: contextMessages,
                summary: String(chat.contextSummary || '').slice(0, ZJ_CHAT_SUMMARY_MAX_CHARS),
                app_context: appContext
              }),
              signal: controller.signal
            });

            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.error || body.reply || ('AI service returned ' + res.status));
            }
            if (!res.body || typeof res.body.getReader !== 'function') {
              throw new Error('This browser cannot read the AI response stream. Please update your browser.');
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let accumulated = '';
            let streamDone = false;

            while (true) {
              const part = await reader.read();
              if (part.done) break;
              buffer += decoder.decode(part.value, { stream: true });
              const events = buffer.split(/\r?\n\r?\n/);
              buffer = events.pop() || '';

              for (const eventText of events) {
                const dataLine = eventText.split(/\r?\n/).find((line) => line.startsWith('data:'));
                if (!dataLine) continue;
                let event;
                try { event = JSON.parse(dataLine.slice(5).trim()); }
                catch (_) { continue; }
                if (event.type === 'token' && typeof event.delta === 'string') {
                  accumulated += event.delta;
                  zjChatAppendStreamingToken(accumulated);
                } else if (event.type === 'error') {
                  throw new Error(event.message || 'The AI response was interrupted.');
                } else if (event.type === 'done') {
                  streamDone = true;
                }
              }
            }
            buffer += decoder.decode();
            if (buffer.trim()) {
              const dataLine = buffer.split(/\r?\n/).find((line) => line.startsWith('data:'));
              if (dataLine) {
                try {
                  const event = JSON.parse(dataLine.slice(5).trim());
                  if (event.type === 'token' && typeof event.delta === 'string') accumulated += event.delta;
                  if (event.type === 'error') throw new Error(event.message || 'The AI response was interrupted.');
                  if (event.type === 'done') streamDone = true;
                } catch (error) {
                  if (error instanceof Error && error.message !== 'Unexpected end of JSON input') throw error;
                }
              }
            }

            const finalContent = accumulated.trim();
            if (!finalContent) throw new Error('AI service returned an empty response.');
            if (!streamDone) console.warn('zj-os: AI stream ended without a done event; preserving received text.');

            chat.messages.push({ role: 'assistant', content: finalContent, timestamp: Date.now() });
            responseSucceeded = true;
            chat.updatedAt = Date.now();
            saveNow();
            zjChatDropStreamingBubble();
            document.getElementById('typing-ind')?.remove();
            renderChatMessages();
            renderChatSidebar(document.getElementById('chat-history-filter')?.value || '');

          } catch (err) {
            if (generationId !== zjChatGenerationId) return;
            zjChatDropStreamingBubble();
            document.getElementById('typing-ind')?.remove();

            let errorMsg;
            if (err?.name === 'AbortError') {
              errorMsg = timedOut ? 'AI service is taking too long.' : 'Generation stopped.';
            } else {
              console.error('zj-os: chat request failed', err);
              errorMsg = err?.message || 'Could not connect to the AI service.';
            }

            chat.messages.push({ role: 'assistant', content: errorMsg, timestamp: Date.now(), error: true });
            chat.updatedAt = Date.now();
            saveNow();
            renderChatMessages();

            if (timedOut) toast('AI service is taking too long. Try again.', 'error');
            else if (err?.name !== 'AbortError') toast('AI request failed. Check the API configuration and server logs.', 'error');

          } finally {
            clearTimeout(timeoutId);
            if (generationId === zjChatGenerationId) {
              zjChatAbort = null;
              if (sendBtn) { sendBtn.disabled = false; sendBtn.classList.remove('hidden'); }
              if (stopBtn) stopBtn.classList.add('hidden');
            }
            // Summarization runs separately and never blocks the completed answer.
            if (responseSucceeded) void zjChatMaybeUpdateSummary(chat);
          }
        }

        function zjChatShowTypingIndicator() {
          const el = document.getElementById('chat-messages');
          if (!el) return;
          document.getElementById('typing-ind')?.remove();
          const wrap = document.createElement('div');
          wrap.className = 'message assistant';
          wrap.id = 'typing-ind';
          const avatar = document.createElement('div');
          avatar.className = 'message-avatar';
          avatar.textContent = 'AI';
          const bubble = document.createElement('div');
          bubble.className = 'message-bubble typing-indicator';
          for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.className = 'typing-dot';
            bubble.appendChild(dot);
          }
          wrap.append(avatar, bubble);
          el.appendChild(wrap);
          el.scrollTop = el.scrollHeight;
        }

        function zjChatAppendStreamingToken(accumulated) {
          document.getElementById('typing-ind')?.remove();
          const el = document.getElementById('chat-messages');
          if (!el) return;
          let bubble = el.querySelector('.message.assistant.streaming');
          if (!bubble) {
            bubble = document.createElement('div');
            bubble.className = 'message assistant streaming';
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = 'AI';
            const content = document.createElement('div');
            content.className = 'message-bubble markdown-body streaming-content';
            bubble.append(avatar, content);
            el.appendChild(bubble);
          }
          const content = bubble.querySelector('.streaming-content');
          if (content) content.innerHTML = parseMd(accumulated);
          const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
          if (nearBottom) el.scrollTop = el.scrollHeight;
        }

        function zjChatDropStreamingBubble() {
          document.querySelectorAll('.message.assistant.streaming').forEach((el) => el.remove());
        }

        function zjChatBuildMessageRow(chatId, msg, index) {
          const row = document.createElement('div');
          row.className = 'message ' + (msg.role === 'user' ? 'user' : 'assistant');
          const avatar = document.createElement('div');
          avatar.className = 'message-avatar';
          avatar.textContent = msg.role === 'user' ? 'YOU' : 'AI';
          const bubble = document.createElement('div');
          bubble.className = 'message-bubble' + (msg.role === 'assistant' ? ' markdown-body' : '');
          bubble.innerHTML = msg.role === 'assistant' ? parseMd(String(msg.content || '')) : escapeHtml(String(msg.content || ''));
          if (index >= 0) zjChatAddMessageActions(bubble, chatId, index);
          row.append(avatar, bubble);
          return row;
        }

        function zjChatAddMessageActions(bubble, chatId, index) {
          if (bubble.querySelector('.chat-message-actions')) return;
          const actions = document.createElement('div');
          actions.className = 'chat-message-actions';
          const copy = document.createElement('button');
          copy.type = 'button';
          copy.textContent = 'Copy';
          copy.dataset.action = 'chat-copy:' + chatId + ':' + index;
          actions.appendChild(copy);
          const chat = App.chats.find((x) => x.id === chatId);
          const msg = chat?.messages?.[index];
          if (msg && msg.role === 'assistant' && !msg.error) {
            const reuse = document.createElement('button');
            reuse.type = 'button';
            reuse.textContent = 'Use as prompt';
            reuse.dataset.action = 'chat-reuse:' + chatId + ':' + index;
            actions.appendChild(reuse);
          }
          bubble.appendChild(actions);
        }

        function zjChatBuildAssistantContext(mode) {
          if (!mode || mode === 'off') return '';
          const clip = (v, n) => String(v ?? '').slice(0, n || 1200);
          const sections = [];
          if (mode === 'all' || mode === 'tasks') {
            sections.push('TASKS: ' + JSON.stringify((App.todos || []).slice(0, 40).map((t) => ({
              title: clip(t.text || t.title, 160), done: !!t.done, due: t.due || null, priority: t.priority || null, recurrence: t.recurrence || 'none',
            }))));
            sections.push('HABITS: ' + JSON.stringify((App.habits || []).slice(0, 30).map((h) => ({
              name: clip(h.name, 120), streak: h.streak || 0, longestStreak: h.longestStreak || 0, lastDone: h.lastDone || null,
            }))));
          }
          if (mode === 'all' || mode === 'notes') {
            sections.push('NOTES: ' + JSON.stringify((App.notes || []).slice(0, 15).map((n) => ({
              title: clip(n.title, 120), content: clip(n.content, 700), tags: Array.isArray(n.tags) ? n.tags : [],
            }))));
            sections.push('WORKSPACE PAGES: ' + JSON.stringify((App.notionPages || []).slice(0, 12).map((p) => ({
              title: clip(p.title, 120), blocks: (p.blocks || []).slice(0, 8).map((b) => clip(b.content, 250)),
            }))));
            sections.push('BOOKMARKS: ' + JSON.stringify((App.bookmarks || []).slice(0, 15).map((b) => ({
              title: clip(b.title, 100), url: clip(b.url, 180),
            }))));
          }
          if (mode === 'all' || mode === 'weather') {
            sections.push('DASHBOARD: theme=' + App.theme + ', mode=' + App.mode + ', tempUnit=' + App.tempUnit);
            const loc = document.getElementById('weather-loc-widget')?.textContent || '';
            const temp = document.getElementById('weather-temp-widget')?.textContent || '';
            const desc = document.getElementById('weather-desc-widget')?.textContent || '';
            sections.push('WEATHER DISPLAY: ' + clip(loc, 120) + ', ' + clip(temp, 30) + '°' + App.tempUnit + ', ' + clip(desc, 100));
            const cities = (App.cities || []).slice(0, 20).map((c) => (c && typeof c === 'object' ? (c.label || [c.name, c.admin1, c.country].filter(Boolean).join(', ')) : clip(c, 120)));
            sections.push('SAVED CITIES: ' + JSON.stringify(cities));
          }
          if (mode === 'all') {
            sections.push('CALCULATOR: display=' + clip(document.getElementById('calc-val-widget')?.textContent, 60) + '; recent=' + JSON.stringify((App.calcLog || []).slice(-8)));
            sections.push('POMODORO: time=' + clip(document.getElementById('pomo-time')?.textContent, 30) + '; running=' + !!App.pomoRunning + '; today=' + (App.pomoSessions || 0));
            sections.push('ALARMS: ' + JSON.stringify((App.alarms || []).slice(0, 20).map((a) => ({ time: a.time, label: clip(a.label, 100), repeat: a.repeat, active: a.active }))));
            sections.push('RECENT COLORS: ' + JSON.stringify((App.recentColors || []).slice(0, 10)));
            // FIX: use module-scoped ZJStorage.
            sections.push('WORLD CLOCKS: ' + JSON.stringify(ZJStorage.get('activeCities', [])));
          }
          return sections.join('\n').slice(0, 6500);
        }

        function zjChatEnsureRenameDialog() {
          if (document.getElementById('chat-rename-dialog')) return;
          const dlg = document.createElement('dialog');
          dlg.id = 'chat-rename-dialog';
          dlg.innerHTML =
            '<div class="modal-header">' +
              '<div class="modal-title">Rename Chat</div>' +
              '<button type="button" class="btn-icon" data-action="chat-rename-cancel" style="width:28px;height:28px;" aria-label="Close">' +
                '<i data-lucide="x" style="width:12px;height:12px;"></i>' +
              '</button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<input type="text" id="chat-rename-input" class="input" placeholder="Chat name" maxlength="80">' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" data-action="chat-rename-cancel">Cancel</button>' +
              '<button type="button" class="btn btn-primary" data-action="chat-rename-save">Save</button>' +
            '</div>';
          document.body.appendChild(dlg);
          if (window.lucide) window.lucide.createIcons();
        }

        function zjChatSaveRename() {
          const dlg = document.getElementById('chat-rename-dialog');
          const input = document.getElementById('chat-rename-input');
          if (!dlg || !input) return;
          const chat = App.chats.find((x) => x.id === dlg.dataset.chatId);
          if (!chat) { dlg.close(); return; }
          const title = input.value.trim().slice(0, 80);
          if (!title) return toast('Chat name cannot be empty.', 'error');
          chat.title = title;
          chat.updatedAt = Date.now();
          saveNow();
          renderChatSidebar(document.getElementById('chat-history-filter')?.value || '');
          renderChatMessages();
          dlg.close();
        }

        /* ============ js/calendar.js ============ */
        let zjCalCursorYear = new Date().getFullYear();
        let zjCalCursorMonth = new Date().getMonth();
        let zjCalSelectedKey = null;
        const ZJ_CAL_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        function initCalendar() {
          const today = new Date();
          zjCalCursorYear = today.getFullYear();
          zjCalCursorMonth = today.getMonth();
          zjCalSelectedKey = zjCalToDayKey(today);
          renderCalendar();
        }

        function bindCalendarActions() {
          document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action || '';
            if (action === 'cal-prev-month') { e.preventDefault(); zjCalNavigateMonth(-1); return; }
            if (action === 'cal-next-month') { e.preventDefault(); zjCalNavigateMonth(1); return; }
            if (action === 'cal-today') { e.preventDefault(); zjCalGoToday(); return; }
            if (action.startsWith('cal-select:')) { e.preventDefault(); zjCalSelectDay(action.slice(11)); return; }
            if (action.startsWith('cal-task-open:')) { e.preventDefault(); zjCalOpenTask(action.slice(14)); return; }
            if (action.startsWith('cal-habit-open:')) { e.preventDefault(); zjCalOpenHabit(action.slice(15)); return; }
          });
          document.addEventListener('keydown', zjCalOnGridKeydown);
          window.addEventListener('zj:sync', (e) => {
            const k = e.detail?.key;
            if (k === 'todos' || k === 'habits') renderCalendar();
          });
          window.addEventListener('zj:tab-change', (e) => { if (e.detail?.tab === 'calendar') renderCalendar(); });
        }

        function renderCalendar() {
          const grid = document.getElementById('cal-grid');
          const label = document.getElementById('cal-month-label');
          const detail = document.getElementById('cal-detail');
          if (!grid || !label) return;
          label.textContent = ZJ_CAL_MONTH_NAMES[zjCalCursorMonth] + ' ' + zjCalCursorYear;
          const todayKey = zjCalToDayKey(new Date());
          const firstOfMonth = new Date(zjCalCursorYear, zjCalCursorMonth, 1);
          const firstDow = firstOfMonth.getDay();
          const gridStart = new Date(zjCalCursorYear, zjCalCursorMonth, 1 - firstDow);
          grid.replaceChildren();
          for (let i = 0; i < 42; i++) {
            const d = new Date(gridStart);
            d.setDate(d.getDate() + i);
            const key = zjCalToDayKey(d);
            const inMonth = d.getMonth() === zjCalCursorMonth;
            const tasks = zjCalTasksForDay(key);
            const habits = zjCalHabitsForDay(key);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cal-cell';
            if (!inMonth) btn.classList.add('other-month');
            if (key === todayKey) btn.classList.add('today');
            if (key === zjCalSelectedKey) btn.classList.add('selected');
            if (tasks.length + habits.length > 0) btn.classList.add('has-items');
            btn.dataset.action = 'cal-select:' + key;
            btn.setAttribute('aria-label', zjCalAriaLabel(d, tasks.length, habits.length));
            btn.setAttribute('aria-pressed', String(key === zjCalSelectedKey));
            const num = document.createElement('span');
            num.className = 'cal-day-num';
            num.textContent = String(d.getDate());
            btn.appendChild(num);
            const dots = document.createElement('span');
            dots.className = 'cal-dots';
            if (tasks.length > 0) {
              const dot = document.createElement('span');
              dot.className = 'cal-dot cal-dot-task';
              dot.title = tasks.length + ' task' + (tasks.length === 1 ? '' : 's') + ' due';
              dots.appendChild(dot);
            }
            if (habits.length > 0) {
              const dot = document.createElement('span');
              dot.className = 'cal-dot cal-dot-habit';
              dot.title = habits.length + ' habit' + (habits.length === 1 ? '' : 's') + ' completed';
              dots.appendChild(dot);
            }
            btn.appendChild(dots);
            grid.appendChild(btn);
          }
          zjCalRenderDetail(detail);
        }

        function zjCalNavigateMonth(delta) {
          const d = new Date(zjCalCursorYear, zjCalCursorMonth + delta, 1);
          zjCalCursorYear = d.getFullYear();
          zjCalCursorMonth = d.getMonth();
          renderCalendar();
        }

        function zjCalGoToday() {
          const today = new Date();
          zjCalCursorYear = today.getFullYear();
          zjCalCursorMonth = today.getMonth();
          zjCalSelectedKey = zjCalToDayKey(today);
          renderCalendar();
          const btn = document.querySelector('[data-action="cal-select:' + zjCalSelectedKey + '"]');
          if (btn) btn.focus();
        }

        function zjCalSelectDay(key) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
          zjCalSelectedKey = key;
          const d = zjCalParseDayKey(key);
          if (d.getFullYear() !== zjCalCursorYear || d.getMonth() !== zjCalCursorMonth) {
            zjCalCursorYear = d.getFullYear();
            zjCalCursorMonth = d.getMonth();
          }
          renderCalendar();
          requestAnimationFrame(() => { document.querySelector('[data-action="cal-select:' + key + '"]')?.focus(); });
        }

        function zjCalOnGridKeydown(e) {
          const btn = e.target.closest?.('[data-action^="cal-select:"]');
          if (!btn) return;
          const key = btn.dataset.action.slice('cal-select:'.length);
          let delta = 0;
          if (e.key === 'ArrowLeft') delta = -1;
          else if (e.key === 'ArrowRight') delta = 1;
          else if (e.key === 'ArrowUp') delta = -7;
          else if (e.key === 'ArrowDown') delta = 7;
          else if (e.key === 'Home') { e.preventDefault(); zjCalGoToday(); return; }
          else if (e.key === 'Escape') { e.preventDefault(); zjCalSelectedKey = null; renderCalendar(); return; }
          else return;
          e.preventDefault();
          const next = zjCalAddDays(zjCalParseDayKey(key), delta);
          const nextKey = zjCalToDayKey(next);
          if (next.getFullYear() !== zjCalCursorYear || next.getMonth() !== zjCalCursorMonth) {
            zjCalCursorYear = next.getFullYear();
            zjCalCursorMonth = next.getMonth();
          }
          zjCalSelectedKey = nextKey;
          renderCalendar();
          requestAnimationFrame(() => { document.querySelector('[data-action="cal-select:' + nextKey + '"]')?.focus(); });
        }

        function zjCalOpenTask(id) {
          if (!id) return;
          switchTab('todo');
          setTimeout(() => {
            if (typeof editTodo === 'function') editTodo(id);
            else toast('Task not found', 'info');
          }, 120);
        }

        function zjCalOpenHabit(id) {
          if (!id) return;
          switchTab('habits');
          setTimeout(() => {
            const btn = document.querySelector('[data-action="habit-toggle:' + zjCalCssEscape(id) + '"]');
            if (btn) btn.focus();
          }, 120);
        }

        function zjCalRenderDetail(detail) {
          if (!detail) return;
          detail.replaceChildren();
          if (!zjCalSelectedKey) return;
          const date = zjCalParseDayKey(zjCalSelectedKey);
          const header = document.createElement('div');
          header.className = 'cal-detail-header';
          header.textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
          detail.appendChild(header);
          const tasks = zjCalTasksForDay(zjCalSelectedKey);
          const habits = zjCalHabitsForDay(zjCalSelectedKey);
          if (tasks.length === 0 && habits.length === 0) {
            const empty = document.createElement('div');
            empty.innerHTML = createEmptyState('calendar', 'Nothing scheduled', 'No tasks due or habits completed on this day');
            detail.appendChild(empty);
            if (window.lucide) window.lucide.createIcons();
            return;
          }
          if (tasks.length > 0) {
            const label = document.createElement('div');
            label.className = 'cal-section-label';
            label.textContent = 'Tasks (' + tasks.length + ')';
            detail.appendChild(label);
            const list = document.createElement('div');
            list.className = 'cal-item-list';
            for (const t of tasks) {
              list.appendChild(zjCalBuildItem({ action: 'cal-task-open:' + t.id, title: String(t.text || ''), meta: (t.priority || 'medium') + (t.done ? ' · done' : ''), done: !!t.done }));
            }
            detail.appendChild(list);
          }
          if (habits.length > 0) {
            const label = document.createElement('div');
            label.className = 'cal-section-label';
            label.textContent = 'Habits (' + habits.length + ')';
            detail.appendChild(label);
            const list = document.createElement('div');
            list.className = 'cal-item-list';
            for (const h of habits) {
              list.appendChild(zjCalBuildItem({ action: 'cal-habit-open:' + h.id, title: (h.icon || '🎯') + ' ' + (h.name || ''), meta: 'streak ' + (h.streak || 0) + ' day' + ((h.streak || 0) === 1 ? '' : 's'), done: false }));
            }
            detail.appendChild(list);
          }
          if (window.lucide) window.lucide.createIcons();
        }

        function zjCalBuildItem(opts) {
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'list-item cal-item';
          row.style.cssText = 'width:100%;text-align:left;cursor:pointer;';
          row.dataset.action = opts.action;
          const left = document.createElement('div');
          left.style.cssText = 'flex:1;min-width:0;';
          const t = document.createElement('div');
          t.style.fontSize = '13px';
          if (opts.done) t.style.cssText += 'text-decoration:line-through;color:var(--text-dim);';
          t.textContent = opts.title;
          left.appendChild(t);
          if (opts.meta) {
            const m = document.createElement('div');
            m.style.cssText = 'font-size:10px;color:var(--text-muted);margin-top:2px;';
            m.textContent = opts.meta;
            left.appendChild(m);
          }
          row.appendChild(left);
          return row;
        }

        function zjCalTasksForDay(key) {
          if (!Array.isArray(App.todos)) return [];
          return App.todos.filter((t) => t && typeof t.due === 'string' && t.due === key);
        }

        function zjCalHabitsForDay(key) {
          if (!Array.isArray(App.habits)) return [];
          return App.habits.filter((h) => {
            if (!h || !Array.isArray(h.history)) return false;
            return h.history.some((entry) => zjCalToDayKey(entry) === key);
          });
        }

        function zjCalToDayKey(d) {
          if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
          const date = d instanceof Date ? d : new Date(d);
          if (Number.isNaN(date.getTime())) return null;
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return y + '-' + m + '-' + day;
        }

        function zjCalParseDayKey(key) {
          const parts = key.split('-').map(Number);
          return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
        }

        function zjCalAddDays(date, n) {
          const d = new Date(date);
          d.setDate(d.getDate() + n);
          return d;
        }

        function zjCalAriaLabel(d, tasksCount, habitsCount) {
          const base = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
          const bits = [];
          if (tasksCount > 0) bits.push(tasksCount + ' task' + (tasksCount === 1 ? '' : 's'));
          if (habitsCount > 0) bits.push(habitsCount + ' habit' + (habitsCount === 1 ? '' : 's'));
          return bits.length ? base + ', ' + bits.join(', ') : base;
        }

        function zjCalCssEscape(s) {
          return (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
        }

        /* ============ js/colorpicker.js ============ */
        const ZJ_COLOR_DEFAULT = '#0EA5E9';
        const ZJ_COLOR_HEX_RE = /^#[0-9a-fA-F]{6}$/;
        const ZJ_COLOR_RECENT_LIMIT = 12;
        const ZJ_COLOR_PALETTE_OFFSETS = [0, 35, 180, 210, 330];
        const ZJ_COLOR_PALETTE_LIGHTNESSES = [42, 52, 62, 38, 72];

        let zjColorCurrentPalette = [];

        function initColorPicker() {
          const saved = Array.isArray(App.recentColors) ? App.recentColors[0] : null;
          const initial = (typeof saved === 'string' && ZJ_COLOR_HEX_RE.test(saved)) ? saved : ZJ_COLOR_DEFAULT;
          updateColor(initial);
        }

        function updateColor(hex) {
          const normalized = String(hex || '').toLowerCase();
          if (!ZJ_COLOR_HEX_RE.test(normalized)) return;
          const input = document.getElementById('color-input');
          if (input && input.value !== normalized) input.value = normalized;
          const preview = document.getElementById('color-preview');
          if (preview) preview.style.background = normalized;
          const r = parseInt(normalized.slice(1, 3), 16);
          const g = parseInt(normalized.slice(3, 5), 16);
          const b = parseInt(normalized.slice(5, 7), 16);
          zjColorSetText('color-hex', normalized.toUpperCase());
          zjColorSetText('color-rgb', 'rgb(' + r + ', ' + g + ', ' + b + ')');
          const hsl = zjColorRgbToHsl(r, g, b);
          zjColorSetText('color-hsl', 'hsl(' + Math.round(hsl.h) + ', ' + Math.round(hsl.s * 100) + '%, ' + Math.round(hsl.l * 100) + '%)');
          const deduped = Array.isArray(App.recentColors) ? App.recentColors.filter((c) => typeof c === 'string' && c !== normalized) : [];
          App.recentColors = [normalized, ...deduped].slice(0, ZJ_COLOR_RECENT_LIMIT);
          save();
          zjColorRenderRecentColors();
        }

        function copyColor(type) {
          const val = document.getElementById('color-' + type)?.textContent;
          if (!val) return;
          navigator.clipboard.writeText(val).then(
            () => toast('Copied ' + String(type).toUpperCase(), 'success'),
            () => toast('Clipboard permission was blocked.', 'error')
          );
        }

        function generateColorPalette() {
          const input = document.getElementById('color-input');
          const hex = String(input?.value || ZJ_COLOR_DEFAULT).toLowerCase();
          if (!ZJ_COLOR_HEX_RE.test(hex)) return;
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          const hsl = zjColorRgbToHsl(r, g, b);
          const rn = r / 255, gn = g / 255, bn = b / 255;
          const chroma = Math.max(rn, gn, bn) - Math.min(rn, gn, bn);
          const satBase = Math.max(35, Math.min(85, Math.round(chroma * 100 + 45)));
          zjColorCurrentPalette = ZJ_COLOR_PALETTE_OFFSETS.map((offset, i) => {
            const hh = (hsl.h + offset + 360) % 360;
            return 'hsl(' + Math.round(hh) + ', ' + satBase + '%, ' + ZJ_COLOR_PALETTE_LIGHTNESSES[i] + '%)';
          });
          zjColorRenderPalette();
        }

        function exportColorPalette() {
          const pal = zjColorCurrentPalette.length > 0 ? zjColorCurrentPalette : [String(document.getElementById('color-input')?.value || ZJ_COLOR_DEFAULT)];
          const css = ':root {\n' + pal.map((c, i) => '  --zj-color-' + (i + 1) + ': ' + c + ';').join('\n') + '\n}\n';
          downloadText('zj-color-palette.css', css, 'text/css');
        }

        function checkColorContrast() {
          const el = document.getElementById('color-contrast-result');
          if (!el) return;
          const hex = String(document.getElementById('color-input')?.value || ZJ_COLOR_DEFAULT).toLowerCase();
          if (!ZJ_COLOR_HEX_RE.test(hex)) return;
          const lum = zjColorLuminance(hex);
          const whiteRatio = 1.05 / (lum + 0.05);
          const blackRatio = (lum + 0.05) / 0.05;
          el.textContent = 'Contrast with white: ' + whiteRatio.toFixed(2) + ':1 (' + (whiteRatio >= 4.5 ? 'AA text pass' : 'AA text fail') + '). ' + 'Contrast with black: ' + blackRatio.toFixed(2) + ':1 (' + (blackRatio >= 4.5 ? 'AA text pass' : 'AA text fail') + ').';
        }

        function zjColorRenderRecentColors() {
          const el = document.getElementById('recent-colors');
          if (!el) return;
          el.replaceChildren();
          const colors = Array.isArray(App.recentColors) ? App.recentColors : [];
          for (const color of colors) {
            if (!ZJ_COLOR_HEX_RE.test(color)) continue;
            const swatch = document.createElement('div');
            swatch.style.cssText = 'width:24px;height:24px;border-radius:50%;background:' + color + ';cursor:pointer;border:1px solid var(--border);';
            swatch.title = color;
            swatch.setAttribute('role', 'button');
            swatch.setAttribute('tabindex', '0');
            swatch.setAttribute('aria-label', 'Use color ' + color);
            swatch.addEventListener('click', () => updateColor(color));
            swatch.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateColor(color); } });
            el.appendChild(swatch);
          }
        }

        function zjColorRenderPalette() {
          const el = document.getElementById('generated-palette');
          if (!el) return;
          el.replaceChildren();
          for (const color of zjColorCurrentPalette) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.title = color;
            btn.setAttribute('aria-label', 'Copy ' + color);
            btn.style.cssText = 'height:54px;border:1px solid var(--border);border-radius:8px;background:' + color + ';cursor:pointer;';
            btn.addEventListener('click', () => {
              navigator.clipboard.writeText(color).then(
                () => toast('Color copied', 'success'),
                () => toast('Clipboard permission was blocked.', 'error')
              );
            });
            el.appendChild(btn);
          }
        }

        function zjColorRgbToHsl(r, g, b) {
          const rn = r / 255, gn = g / 255, bn = b / 255;
          const max = Math.max(rn, gn, bn);
          const min = Math.min(rn, gn, bn);
          const l = (max + min) / 2;
          let h = 0, s = 0;
          if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
            else if (max === gn) h = ((bn - rn) / d + 2) * 60;
            else h = ((rn - gn) / d + 4) * 60;
          }
          return { h, s, l };
        }

        function zjColorLuminance(hex) {
          const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
          const linear = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
          return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
        }

        function zjColorSetText(id, text) {
          const el = document.getElementById(id);
          if (el) el.textContent = text;
        }

        /* ============ js/main.js ============ */
        let zjCalcRadians = false;

        function toggleCalcAngle() {
          zjCalcRadians = !zjCalcRadians;
          const label = document.getElementById('calc-angle-label');
          if (label) label.textContent = zjCalcRadians ? 'Radians' : 'Degrees';
        }

        function zjWrapCalcInput(ch) { return calcInput(ch, App, save); }
        function zjWrapScientificCalc(kind) { return scientificCalc(kind, App, save, zjCalcRadians); }

        function exportCalcHistory() {
          const rows = [['expression', 'result', 'timestamp']];
          for (const entry of (App.calcLog || [])) {
            rows.push([entry.expr || '', entry.result || '', new Date(entry.ts || Date.now()).toISOString()]);
          }
          const csv = rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
          downloadText('zj-calculator-history.csv', csv, 'text/csv');
        }

        function renderCalcLog() {
          const list = document.getElementById('calc-history-list');
          if (!list) return;
          const log = App.calcLog || [];
          list.replaceChildren();
          if (log.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'color:var(--text-dim);text-align:center;padding:20px;';
            empty.textContent = 'No history';
            list.appendChild(empty);
            return;
          }
          log.forEach((entry, i) => {
            const row = document.createElement('div');
            row.style.cssText = 'padding:6px 8px;border-bottom:1px solid var(--border-soft);cursor:pointer;color:var(--text-muted);';
            row.textContent = (entry.expr || '') + ' ' + (entry.result || '');
            row.addEventListener('click', () => reuseCalc(i));
            list.appendChild(row);
          });
        }

        function reuseCalc(i) {
          const entry = (App.calcLog || [])[i];
          if (!entry) return;
          App.calcVal = String(entry.result || '0');
          const w = document.getElementById('calc-val-widget');
          const f = document.getElementById('calc-val-full');
          if (w) w.textContent = App.calcVal;
          if (f) f.textContent = App.calcVal;
          document.getElementById('calc-history-dialog')?.close();
          toast('Reused result', 'success');
        }

        function clearCalcHistory() {
          App.calcLog = [];
          saveNow();
          renderCalcLog();
          const w = document.getElementById('calc-hist-widget');
          const f = document.getElementById('calc-hist-full');
          if (w) w.textContent = '';
          if (f) f.textContent = '';
          toast('History cleared', 'success');
        }

        function zjWrapGeneratePassword() {
          const length = parseInt(document.getElementById('pwd-length')?.value, 10) || 20;
          const upper = !!document.getElementById('pwd-upper')?.checked;
          const lower = !!document.getElementById('pwd-lower')?.checked;
          const numbers = !!document.getElementById('pwd-num')?.checked;
          const symbols = !!document.getElementById('pwd-sym')?.checked;
          const excludeAmbiguous = !!document.getElementById('pwd-ambiguous')?.checked;
          const noRepeat = !!document.getElementById('pwd-no-repeat')?.checked;
          let pwd;
          try { pwd = generatePassword({ length, upper, lower, numbers, symbols, excludeAmbiguous, noRepeat }); }
          catch (err) { toast(err.message, 'error'); return; }
          const out = document.getElementById('pwd-output');
          if (out) out.textContent = pwd;
          zjRenderPwdStrength(length, symbols, numbers);
        }

        function zjWrapGeneratePassphrase() {
          const phrase = generatePassphrase();
          const out = document.getElementById('pwd-output');
          if (out) out.textContent = phrase;
          const bar = document.getElementById('pwd-strength');
          const label = document.getElementById('pwd-strength-label');
          if (bar) { bar.style.width = '85%'; bar.className = 'strength-fill strength-strong'; }
          if (label) label.textContent = 'Passphrase generated locally';
        }

        function zjRenderPwdStrength(length, hasSymbols, hasNumbers) {
          const s = Math.min(100, (length / 32) * 100 + (hasSymbols ? 20 : 0) + (hasNumbers ? 10 : 0));
          const bar = document.getElementById('pwd-strength');
          const label = document.getElementById('pwd-strength-label');
          if (bar) { bar.style.width = s + '%'; bar.className = 'strength-fill ' + (s < 40 ? 'strength-weak' : s < 70 ? 'strength-medium' : 'strength-strong'); }
          if (label) label.textContent = s < 40 ? 'Weak' : s < 70 ? 'Medium' : 'Strong';
        }

        function copyPassword() {
          const el = document.getElementById('pwd-output');
          const pwd = el?.textContent || '';
          if (!pwd || pwd === 'Click "Generate"' || pwd === 'Select options') return;
          navigator.clipboard.writeText(pwd).then(
            () => toast('Copied', 'success'),
            () => toast('Clipboard permission was blocked.', 'error')
          );
        }

        function zjInitMagneticElements() {
          if (window.innerWidth < 1024) return;
          document.querySelectorAll('.magnetic').forEach((magnet) => {
            if (magnet.dataset.magneticBound === '1') return;
            magnet.dataset.magneticBound = '1';
            magnet.addEventListener('mousemove', (e) => {
              const rect = magnet.getBoundingClientRect();
              const x = e.clientX - rect.left - rect.width / 2;
              const y = e.clientY - rect.top - rect.height / 2;
              const mx = Math.max(-10, Math.min(10, x * 0.2));
              const my = Math.max(-10, Math.min(10, y * 0.2));
              magnet.style.transform = 'translate(' + mx + 'px, ' + my + 'px) scale(1.02)';
              magnet.style.boxShadow = '0 10px 30px rgba(var(--rgb-primary),0.15)';
            });
            magnet.addEventListener('mouseleave', () => { magnet.style.transform = ''; magnet.style.boxShadow = ''; });
          });
        }

        function zjExposeGlobalHandlers() {
          // CRITICAL FIX: expose the module-scoped state and utility functions on window.
          // Without these, `window.save()`, `window.toast()`, `window.App.*`, `window.playSound()`,
          // `window.createEmptyState()`, `window.downloadText()`, `window.escapeHtml()`, `window.parseMd()`,
          // `window.animateValue()`, `window.triggerElectricPulse()`, `window.confirmAction()`,
          // `window.saveNow()` are all undefined at runtime — that would cause data loss (save never runs)
          // and TypeError crashes (saveNow/toast called without `?.`).
          Object.assign(window, {
            App,
            ZJStorage,
            save,
            saveNow,
            toast,
            playSound,
            confirmAction,
            downloadText,
            escapeHtml,
            parseMd,
            formatTime,
            createEmptyState,
            animateValue,
            triggerElectricPulse,

            switchTab,
            renderNotes, openNoteDialog, editNote, saveNote, zjNotesFlushOnClose, searchNotes, togglePinNote, deleteNote,
            renderTodos, addTodo, editTodo, toggleTodo, deleteTodo, filterTodos,
            renderHabits, saveHabit, toggleHabit, deleteHabit, exportHabitData, openHabitReflection,
            renderBookmarks, saveBookmark, searchBookmarks, deleteBookmark,
            renderGallery, openLightbox, closeLightbox, nextImage, prevImage,
            handleImageUpload, addCustomImage, filterGalleryItems, sortGalleryItems, exportGalleryIndex,
            renderNotionPages, selectPage, createNotionPage, deletePage, saveNotionTitle,
            filterNotionPages, duplicateActiveNotionPage, exportAllNotionPages, exportNotionPage,
            loadActivePage, addNotionBlock, addBlockAfter, showBlockMenu, changeBlockType,
            setPomoDuration, startPomodoro, pausePomodoro, resetPomodoro,
            updateClock, buildClockTicks, toggleClockFormat,
            fetchWeather, selectWeatherCity, saveCurrentWeatherCity, autoLocate,
            renderSavedCities, openSavedWeatherCity, removeCity, toggleTempUnit,
            exportWeatherSnapshot, weatherDescription,
            openCommandPalette, closeCommandPalette, executeCommand,
            setTheme, setMode, exportData, importData, clearAllData, zjTodosSetSearch,
            openAssistant, toggleChatHistory, createNewChat, switchChat, toggleStarChat,
            clearActiveChat, deleteChat, deleteActiveChat, renameActiveChat, exportActiveChat,
            exportAllChats, searchChat, sendChatMessage, stopGeneration, handleChatKey,
            autoResizeChat, startVoiceInput, useQuickPrompt, copyChatMessage, reuseChatReply,
            renderChatSidebar, renderChatMessages,
            calcInput: zjWrapCalcInput,
            scientificCalc: zjWrapScientificCalc,
            toggleCalcAngle, exportCalcHistory, renderCalcLog, reuseCalc, clearCalcHistory,
            generatePassword: zjWrapGeneratePassword,
            generatePassphrase: zjWrapGeneratePassphrase,
            copyPassword,
            doConvert: runConvert, updateConverter, swapConverter,
            updateColor, copyColor, generateColorPalette, exportColorPalette, checkColorContrast,
            __zj_app: App,
            __zj_save: save,
            __zj_saveNow: saveNow,
            __zj_toast: toast,
          });
        }

        function zjFailLoud() {
          const expected = [
            'switchTab', 'renderNotes', 'openNoteDialog', 'saveNote',
            'renderTodos', 'addTodo', 'renderHabits', 'toggleHabit',
            'renderBookmarks', 'saveBookmark', 'renderGallery', 'openLightbox',
            'renderNotionPages', 'createNotionPage', 'setPomoDuration', 'startPomodoro',
            'updateClock', 'fetchWeather', 'autoLocate',
            'openCommandPalette', 'setTheme', 'openAssistant', 'sendChatMessage',
            'calcInput', 'generatePassword', 'doConvert',
            'App', 'save', 'saveNow', 'toast', 'playSound', 'confirmAction', 'downloadText',
          ];
          const missing = expected.filter((name) => {
            if (name === 'App' || name === 'ZJStorage') return typeof window[name] !== 'object';
            return typeof window[name] !== 'function';
          });
          if (missing.length > 0) console.error('zj-os: expected window handlers are missing:', missing);
        }

        function zjBoot() {
          bindTabActions();
          bindTabShortcuts();
          bindNoteActions();
          bindTodoActions();
          bindHabitActions();
          bindBookmarkActions();
          bindGalleryActions();
          bindNotionActions();
          bindPomodoroShortcuts();
          bindPomodoroSync();
          bindWeatherActions();
          bindCommandPalette();
          bindChatActions();
          bindCalendarActions();

          zjExposeGlobalHandlers();

          initSettings();
          initPomodoro();
          initClock();
          initWeather();
          initChatbot();
          initCalendar();

          renderNotes();
          renderTodos();
          renderHabits();
          renderBookmarks();
          renderGallery();
          renderNotionPages();
          loadActivePage();

          try { initColorPicker(); }
          catch (err) { console.warn('zj-os: colorpicker init failed', err); }

          document.getElementById('calc-history-dialog')?.addEventListener('toggle', (e) => {
            if (e.target?.open) renderCalcLog();
          });

          zjInitMagneticElements();
          window.addEventListener('zj:tab-change', zjInitMagneticElements);

          zjFailLoud();

          const preloader = document.getElementById('preloader');
          if (preloader && !preloader.classList.contains('hidden')) {
            preloader.classList.add('hidden');
            setTimeout(() => { preloader.style.display = 'none'; }, 500);
          }
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', zjBoot, { once: true });
        } else {
          zjBoot();
        }
})();

/* ===== js/zj-cities.js ===== */
/* Generated city database for the World Clock offline search: [city, ISO country code, IANA time zone].
   Source: IANA tz database (zone.tab) plus a curated list of major cities. Online search (Open-Meteo geocoding) extends this. */
window.ZJ_COUNTRIES={"AD":"Andorra","AE":"United Arab Emirates","AF":"Afghanistan","AG":"Antigua & Barbuda","AI":"Anguilla","AL":"Albania","AM":"Armenia","AO":"Angola","AQ":"Antarctica","AR":"Argentina","AS":"Samoa (American)","AT":"Austria","AU":"Australia","AW":"Aruba","AX":"Åland Islands","AZ":"Azerbaijan","BA":"Bosnia & Herzegovina","BB":"Barbados","BD":"Bangladesh","BE":"Belgium","BF":"Burkina Faso","BG":"Bulgaria","BH":"Bahrain","BI":"Burundi","BJ":"Benin","BL":"St Barthelemy","BM":"Bermuda","BN":"Brunei","BO":"Bolivia","BQ":"Caribbean NL","BR":"Brazil","BS":"Bahamas","BT":"Bhutan","BW":"Botswana","BY":"Belarus","BZ":"Belize","CA":"Canada","CC":"Cocos (Keeling) Islands","CD":"Congo (Dem. Rep.)","CF":"Central African Rep.","CG":"Congo (Rep.)","CH":"Switzerland","CI":"Côte d’Ivoire","CK":"Cook Islands","CL":"Chile","CM":"Cameroon","CN":"China","CO":"Colombia","CR":"Costa Rica","CU":"Cuba","CV":"Cape Verde","CW":"Curaçao","CX":"Christmas Island","CY":"Cyprus","CZ":"Czech Republic","DE":"Germany","DJ":"Djibouti","DK":"Denmark","DM":"Dominica","DO":"Dominican Republic","DZ":"Algeria","EC":"Ecuador","EE":"Estonia","EG":"Egypt","EH":"Western Sahara","ER":"Eritrea","ES":"Spain","ET":"Ethiopia","FI":"Finland","FJ":"Fiji","FK":"Falkland Islands","FM":"Micronesia","FO":"Faroe Islands","FR":"France","GA":"Gabon","GB":"Britain (UK)","GD":"Grenada","GE":"Georgia","GF":"French Guiana","GG":"Guernsey","GH":"Ghana","GI":"Gibraltar","GL":"Greenland","GM":"Gambia","GN":"Guinea","GP":"Guadeloupe","GQ":"Equatorial Guinea","GR":"Greece","GS":"South Georgia & the South Sandwich Islands","GT":"Guatemala","GU":"Guam","GW":"Guinea-Bissau","GY":"Guyana","HK":"Hong Kong","HN":"Honduras","HR":"Croatia","HT":"Haiti","HU":"Hungary","ID":"Indonesia","IE":"Ireland","IL":"Israel","IM":"Isle of Man","IN":"India","IO":"British Indian Ocean Territory","IQ":"Iraq","IR":"Iran","IS":"Iceland","IT":"Italy","JE":"Jersey","JM":"Jamaica","JO":"Jordan","JP":"Japan","KE":"Kenya","KG":"Kyrgyzstan","KH":"Cambodia","KI":"Kiribati","KM":"Comoros","KN":"St Kitts & Nevis","KP":"Korea (North)","KR":"Korea (South)","KW":"Kuwait","KY":"Cayman Islands","KZ":"Kazakhstan","LA":"Laos","LB":"Lebanon","LC":"St Lucia","LI":"Liechtenstein","LK":"Sri Lanka","LR":"Liberia","LS":"Lesotho","LT":"Lithuania","LU":"Luxembourg","LV":"Latvia","LY":"Libya","MA":"Morocco","MC":"Monaco","MD":"Moldova","ME":"Montenegro","MF":"St Martin (French)","MG":"Madagascar","MH":"Marshall Islands","MK":"North Macedonia","ML":"Mali","MM":"Myanmar (Burma)","MN":"Mongolia","MO":"Macau","MP":"Northern Mariana Islands","MQ":"Martinique","MR":"Mauritania","MS":"Montserrat","MT":"Malta","MU":"Mauritius","MV":"Maldives","MW":"Malawi","MX":"Mexico","MY":"Malaysia","MZ":"Mozambique","NA":"Namibia","NC":"New Caledonia","NE":"Niger","NF":"Norfolk Island","NG":"Nigeria","NI":"Nicaragua","NL":"Netherlands","NO":"Norway","NP":"Nepal","NR":"Nauru","NU":"Niue","NZ":"New Zealand","OM":"Oman","PA":"Panama","PE":"Peru","PF":"French Polynesia","PG":"Papua New Guinea","PH":"Philippines","PK":"Pakistan","PL":"Poland","PM":"St Pierre & Miquelon","PN":"Pitcairn","PR":"Puerto Rico","PS":"Palestine","PT":"Portugal","PW":"Palau","PY":"Paraguay","QA":"Qatar","RE":"Réunion","RO":"Romania","RS":"Serbia","RU":"Russia","RW":"Rwanda","SA":"Saudi Arabia","SB":"Solomon Islands","SC":"Seychelles","SD":"Sudan","SE":"Sweden","SG":"Singapore","SH":"St Helena","SI":"Slovenia","SJ":"Svalbard & Jan Mayen","SK":"Slovakia","SL":"Sierra Leone","SM":"San Marino","SN":"Senegal","SO":"Somalia","SR":"Suriname","SS":"South Sudan","ST":"Sao Tome & Principe","SV":"El Salvador","SX":"St Maarten (Dutch)","SY":"Syria","SZ":"Eswatini (Swaziland)","TC":"Turks & Caicos Is","TD":"Chad","TF":"French S. Terr.","TG":"Togo","TH":"Thailand","TJ":"Tajikistan","TK":"Tokelau","TL":"East Timor","TM":"Turkmenistan","TN":"Tunisia","TO":"Tonga","TR":"Turkey","TT":"Trinidad & Tobago","TV":"Tuvalu","TW":"Taiwan","TZ":"Tanzania","UA":"Ukraine","UG":"Uganda","UM":"US minor outlying islands","US":"United States","UY":"Uruguay","UZ":"Uzbekistan","VA":"Vatican City","VC":"St Vincent","VE":"Venezuela","VG":"Virgin Islands (UK)","VI":"Virgin Islands (US)","VN":"Vietnam","VU":"Vanuatu","WF":"Wallis & Futuna","WS":"Samoa (western)","YE":"Yemen","YT":"Mayotte","ZA":"South Africa","ZM":"Zambia","ZW":"Zimbabwe"};
window.ZJ_CITIES=[["Abidjan","CI","Africa/Abidjan"],["Abu Dhabi","AE","Asia/Dubai"],["Abuja","NG","Africa/Lagos"],["Accra","GH","Africa/Accra"],["Adak","US","America/Adak"],["Addis Ababa","ET","Africa/Addis_Ababa"],["Adelaide","AU","Australia/Adelaide"],["Aden","YE","Asia/Aden"],["Ahmedabad","IN","Asia/Kolkata"],["Algiers","DZ","Africa/Algiers"],["Almaty","KZ","Asia/Almaty"],["Amman","JO","Asia/Amman"],["Amsterdam","NL","Europe/Amsterdam"],["Anadyr","RU","Asia/Anadyr"],["Anchorage","US","America/Anchorage"],["Andorra","AD","Europe/Andorra"],["Anguilla","AI","America/Anguilla"],["Ankara","TR","Europe/Istanbul"],["Antananarivo","MG","Indian/Antananarivo"],["Antigua","AG","America/Antigua"],["Apia","WS","Pacific/Apia"],["Aqtau","KZ","Asia/Aqtau"],["Aqtobe","KZ","Asia/Aqtobe"],["Araguaina","BR","America/Araguaina"],["Aruba","AW","America/Aruba"],["Ashgabat","TM","Asia/Ashgabat"],["Asmara","ER","Africa/Asmara"],["Astrakhan","RU","Europe/Astrakhan"],["Asuncion","PY","America/Asuncion"],["Athens","GR","Europe/Athens"],["Atikokan","CA","America/Atikokan"],["Atlanta","US","America/New_York"],["Atyrau","KZ","Asia/Atyrau"],["Auckland","NZ","Pacific/Auckland"],["Austin","US","America/Chicago"],["Azores","PT","Atlantic/Azores"],["Baghdad","IQ","Asia/Baghdad"],["Bahia","BR","America/Bahia"],["Bahia Banderas","MX","America/Bahia_Banderas"],["Baku","AZ","Asia/Baku"],["Bali","ID","Asia/Makassar"],["Bamako","ML","Africa/Bamako"],["Bandar Seri Begawan","BN","Asia/Brunei"],["Bangkok","TH","Asia/Bangkok"],["Bangui","CF","Africa/Bangui"],["Banjul","GM","Africa/Banjul"],["Barbados","BB","America/Barbados"],["Barcelona","ES","Europe/Madrid"],["Barnaul","RU","Asia/Barnaul"],["Beijing","CN","Asia/Shanghai"],["Beirut","LB","Asia/Beirut"],["Belem","BR","America/Belem"],["Belgrade","RS","Europe/Belgrade"],["Belize","BZ","America/Belize"],["Bengaluru","IN","Asia/Kolkata"],["Bergen","NO","Europe/Oslo"],["Berlin","DE","Europe/Berlin"],["Bermuda","BM","Atlantic/Bermuda"],["Beulah","US","America/North_Dakota/Beulah"],["Birmingham","GB","Europe/London"],["Bishkek","KG","Asia/Bishkek"],["Bissau","GW","Africa/Bissau"],["Blanc-Sablon","CA","America/Blanc-Sablon"],["Blantyre","MW","Africa/Blantyre"],["Boa Vista","BR","America/Boa_Vista"],["Bogotá","CO","America/Bogota"],["Boise","US","America/Boise"],["Boston","US","America/New_York"],["Bougainville","PG","Pacific/Bougainville"],["Brasília","BR","America/Sao_Paulo"],["Bratislava","SK","Europe/Bratislava"],["Brazzaville","CG","Africa/Brazzaville"],["Brisbane","AU","Australia/Brisbane"],["Broken Hill","AU","Australia/Broken_Hill"],["Brussels","BE","Europe/Brussels"],["Bucharest","RO","Europe/Bucharest"],["Budapest","HU","Europe/Budapest"],["Buenos Aires","AR","America/Argentina/Buenos_Aires"],["Bujumbura","BI","Africa/Bujumbura"],["Busan","KR","Asia/Seoul"],["Busingen","DE","Europe/Busingen"],["Cairo","EG","Africa/Cairo"],["Calgary","CA","America/Edmonton"],["Cambridge Bay","CA","America/Cambridge_Bay"],["Campo Grande","BR","America/Campo_Grande"],["Canary","ES","Atlantic/Canary"],["Canberra","AU","Australia/Sydney"],["Cancun","MX","America/Cancun"],["Cape Town","ZA","Africa/Johannesburg"],["Cape Verde","CV","Atlantic/Cape_Verde"],["Caracas","VE","America/Caracas"],["Cardiff","GB","Europe/London"],["Casablanca","MA","Africa/Casablanca"],["Casey","AQ","Antarctica/Casey"],["Catamarca","AR","America/Argentina/Catamarca"],["Cayenne","GF","America/Cayenne"],["Cayman","KY","America/Cayman"],["Cebu","PH","Asia/Manila"],["Center","US","America/North_Dakota/Center"],["Ceuta","ES","Africa/Ceuta"],["Chagos","IO","Indian/Chagos"],["Chatham","NZ","Pacific/Chatham"],["Chengdu","CN","Asia/Shanghai"],["Chennai","IN","Asia/Kolkata"],["Chicago","US","America/Chicago"],["Chihuahua","MX","America/Chihuahua"],["Chisinau","MD","Europe/Chisinau"],["Chita","RU","Asia/Chita"],["Chittagong","BD","Asia/Dhaka"],["Christchurch","NZ","Pacific/Auckland"],["Christmas","CX","Indian/Christmas"],["Chuuk","FM","Pacific/Chuuk"],["Ciudad Juarez","MX","America/Ciudad_Juarez"],["Cocos","CC","Indian/Cocos"],["Cologne","DE","Europe/Berlin"],["Colombo","LK","Asia/Colombo"],["Comoro","KM","Indian/Comoro"],["Conakry","GN","Africa/Conakry"],["Copenhagen","DK","Europe/Copenhagen"],["Cordoba","AR","America/Argentina/Cordoba"],["Cork","IE","Europe/Dublin"],["Costa Rica","CR","America/Costa_Rica"],["Coyhaique","CL","America/Coyhaique"],["Creston","CA","America/Creston"],["Cuiaba","BR","America/Cuiaba"],["Curacao","CW","America/Curacao"],["Dakar","SN","Africa/Dakar"],["Dallas","US","America/Chicago"],["Damascus","SY","Asia/Damascus"],["Danmarkshavn","GL","America/Danmarkshavn"],["Dar es Salaam","TZ","Africa/Dar_es_Salaam"],["Darwin","AU","Australia/Darwin"],["Davis","AQ","Antarctica/Davis"],["Dawson","CA","America/Dawson"],["Dawson Creek","CA","America/Dawson_Creek"],["Delhi","IN","Asia/Kolkata"],["Denver","US","America/Denver"],["Detroit","US","America/Detroit"],["Dhaka","BD","Asia/Dhaka"],["Dili","TL","Asia/Dili"],["Djibouti","DJ","Africa/Djibouti"],["Doha","QA","Asia/Qatar"],["Dominica","DM","America/Dominica"],["Douala","CM","Africa/Douala"],["Dubai","AE","Asia/Dubai"],["Dublin","IE","Europe/Dublin"],["DumontDUrville","AQ","Antarctica/DumontDUrville"],["Dushanbe","TJ","Asia/Dushanbe"],["Easter","CL","Pacific/Easter"],["Edinburgh","GB","Europe/London"],["Edmonton","CA","America/Edmonton"],["Efate","VU","Pacific/Efate"],["Eirunepe","BR","America/Eirunepe"],["El Aaiun","EH","Africa/El_Aaiun"],["El Salvador","SV","America/El_Salvador"],["Eucla","AU","Australia/Eucla"],["Fakaofo","TK","Pacific/Fakaofo"],["Famagusta","CY","Asia/Famagusta"],["Faroe","FO","Atlantic/Faroe"],["Fiji","FJ","Pacific/Fiji"],["Florence","IT","Europe/Rome"],["Fort Nelson","CA","America/Fort_Nelson"],["Fortaleza","BR","America/Fortaleza"],["Frankfurt","DE","Europe/Berlin"],["Freetown","SL","Africa/Freetown"],["Funafuti","TV","Pacific/Funafuti"],["Gaborone","BW","Africa/Gaborone"],["Galapagos","EC","Pacific/Galapagos"],["Gambier","PF","Pacific/Gambier"],["Gaza","PS","Asia/Gaza"],["Geneva","CH","Europe/Zurich"],["Gibraltar","GI","Europe/Gibraltar"],["Glace Bay","CA","America/Glace_Bay"],["Glasgow","GB","Europe/London"],["Gold Coast","AU","Australia/Brisbane"],["Goose Bay","CA","America/Goose_Bay"],["Gothenburg","SE","Europe/Stockholm"],["Grand Turk","TC","America/Grand_Turk"],["Grenada","GD","America/Grenada"],["Guadalajara","MX","America/Mexico_City"],["Guadalcanal","SB","Pacific/Guadalcanal"],["Guadeloupe","GP","America/Guadeloupe"],["Guam","GU","Pacific/Guam"],["Guangzhou","CN","Asia/Shanghai"],["Guatemala","GT","America/Guatemala"],["Guayaquil","EC","America/Guayaquil"],["Guernsey","GG","Europe/Guernsey"],["Guyana","GY","America/Guyana"],["Halifax","CA","America/Halifax"],["Hamburg","DE","Europe/Berlin"],["Hanoi","VN","Asia/Ho_Chi_Minh"],["Harare","ZW","Africa/Harare"],["Havana","CU","America/Havana"],["Hebron","PS","Asia/Hebron"],["Helsinki","FI","Europe/Helsinki"],["Hermosillo","MX","America/Hermosillo"],["Ho Chi Minh City","VN","Asia/Ho_Chi_Minh"],["Hobart","AU","Australia/Hobart"],["Hong Kong","HK","Asia/Hong_Kong"],["Honolulu","US","Pacific/Honolulu"],["Houston","US","America/Chicago"],["Hovd","MN","Asia/Hovd"],["Hyderabad","IN","Asia/Kolkata"],["Indianapolis","US","America/Indiana/Indianapolis"],["Inuvik","CA","America/Inuvik"],["Iqaluit","CA","America/Iqaluit"],["Irkutsk","RU","Asia/Irkutsk"],["Islamabad","PK","Asia/Karachi"],["Isle of Man","IM","Europe/Isle_of_Man"],["Istanbul","TR","Europe/Istanbul"],["Izmir","TR","Europe/Istanbul"],["Jaipur","IN","Asia/Kolkata"],["Jakarta","ID","Asia/Jakarta"],["Jamaica","JM","America/Jamaica"],["Jayapura","ID","Asia/Jayapura"],["Jeddah","SA","Asia/Riyadh"],["Jersey","JE","Europe/Jersey"],["Jerusalem","IL","Asia/Jerusalem"],["Johannesburg","ZA","Africa/Johannesburg"],["Juba","SS","Africa/Juba"],["Jujuy","AR","America/Argentina/Jujuy"],["Juneau","US","America/Juneau"],["Kabul","AF","Asia/Kabul"],["Kaliningrad","RU","Europe/Kaliningrad"],["Kamchatka","RU","Asia/Kamchatka"],["Kampala","UG","Africa/Kampala"],["Kanton","KI","Pacific/Kanton"],["Karachi","PK","Asia/Karachi"],["Kathmandu","NP","Asia/Kathmandu"],["Kerguelen","TF","Indian/Kerguelen"],["Khandyga","RU","Asia/Khandyga"],["Khartoum","SD","Africa/Khartoum"],["Kigali","RW","Africa/Kigali"],["Kinshasa","CD","Africa/Kinshasa"],["Kiritimati","KI","Pacific/Kiritimati"],["Kirov","RU","Europe/Kirov"],["Knox","US","America/Indiana/Knox"],["Kolkata","IN","Asia/Kolkata"],["Kosrae","FM","Pacific/Kosrae"],["Krakow","PL","Europe/Warsaw"],["Kralendijk","BQ","America/Kralendijk"],["Krasnoyarsk","RU","Asia/Krasnoyarsk"],["Kuala Lumpur","MY","Asia/Kuala_Lumpur"],["Kuching","MY","Asia/Kuching"],["Kuwait City","KW","Asia/Kuwait"],["Kwajalein","MH","Pacific/Kwajalein"],["Kyiv","UA","Europe/Kyiv"],["Kyoto","JP","Asia/Tokyo"],["La Paz","BO","America/La_Paz"],["La Rioja","AR","America/Argentina/La_Rioja"],["Lagos","NG","Africa/Lagos"],["Lahore","PK","Asia/Karachi"],["Las Vegas","US","America/Los_Angeles"],["Libreville","GA","Africa/Libreville"],["Lima","PE","America/Lima"],["Lindeman","AU","Australia/Lindeman"],["Lisbon","PT","Europe/Lisbon"],["Liverpool","GB","Europe/London"],["Ljubljana","SI","Europe/Ljubljana"],["Lome","TG","Africa/Lome"],["London","GB","Europe/London"],["Longyearbyen","SJ","Arctic/Longyearbyen"],["Lord Howe","AU","Australia/Lord_Howe"],["Los Angeles","US","America/Los_Angeles"],["Louisville","US","America/Kentucky/Louisville"],["Lower Princes","SX","America/Lower_Princes"],["Luanda","AO","Africa/Luanda"],["Lubumbashi","CD","Africa/Lubumbashi"],["Lusaka","ZM","Africa/Lusaka"],["Luxembourg","LU","Europe/Luxembourg"],["Lyon","FR","Europe/Paris"],["Macau","MO","Asia/Macau"],["Maceio","BR","America/Maceio"],["Macquarie","AU","Antarctica/Macquarie"],["Madeira","PT","Atlantic/Madeira"],["Madrid","ES","Europe/Madrid"],["Magadan","RU","Asia/Magadan"],["Mahe","SC","Indian/Mahe"],["Majuro","MH","Pacific/Majuro"],["Makassar","ID","Asia/Makassar"],["Malabo","GQ","Africa/Malabo"],["Maldives","MV","Indian/Maldives"],["Malta","MT","Europe/Malta"],["Managua","NI","America/Managua"],["Manama","BH","Asia/Bahrain"],["Manaus","BR","America/Manaus"],["Manchester","GB","Europe/London"],["Manila","PH","Asia/Manila"],["Maputo","MZ","Africa/Maputo"],["Marengo","US","America/Indiana/Marengo"],["Mariehamn","AX","Europe/Mariehamn"],["Marigot","MF","America/Marigot"],["Marquesas","PF","Pacific/Marquesas"],["Marseille","FR","Europe/Paris"],["Martinique","MQ","America/Martinique"],["Maseru","LS","Africa/Maseru"],["Matamoros","MX","America/Matamoros"],["Mauritius","MU","Indian/Mauritius"],["Mawson","AQ","Antarctica/Mawson"],["Mayotte","YT","Indian/Mayotte"],["Mazatlan","MX","America/Mazatlan"],["Mbabane","SZ","Africa/Mbabane"],["McMurdo","AQ","Antarctica/McMurdo"],["Mecca","SA","Asia/Riyadh"],["Medellín","CO","America/Bogota"],["Medina","SA","Asia/Riyadh"],["Melbourne","AU","Australia/Melbourne"],["Mendoza","AR","America/Argentina/Mendoza"],["Menominee","US","America/Menominee"],["Merida","MX","America/Merida"],["Metlakatla","US","America/Metlakatla"],["Mexico City","MX","America/Mexico_City"],["Miami","US","America/New_York"],["Midway","UM","Pacific/Midway"],["Milan","IT","Europe/Rome"],["Minneapolis","US","America/Chicago"],["Minsk","BY","Europe/Minsk"],["Miquelon","PM","America/Miquelon"],["Mogadishu","SO","Africa/Mogadishu"],["Monaco","MC","Europe/Monaco"],["Moncton","CA","America/Moncton"],["Monrovia","LR","Africa/Monrovia"],["Monterrey","MX","America/Monterrey"],["Montevideo","UY","America/Montevideo"],["Monticello","US","America/Kentucky/Monticello"],["Montreal","CA","America/Toronto"],["Montserrat","MS","America/Montserrat"],["Moscow","RU","Europe/Moscow"],["Mumbai","IN","Asia/Kolkata"],["Munich","DE","Europe/Berlin"],["Muscat","OM","Asia/Muscat"],["Nairobi","KE","Africa/Nairobi"],["Naples","IT","Europe/Rome"],["Nassau","BS","America/Nassau"],["Nauru","NR","Pacific/Nauru"],["Ndjamena","TD","Africa/Ndjamena"],["New Delhi","IN","Asia/Kolkata"],["New Salem","US","America/North_Dakota/New_Salem"],["New York","US","America/New_York"],["Niamey","NE","Africa/Niamey"],["Nice","FR","Europe/Paris"],["Nicosia","CY","Asia/Nicosia"],["Niue","NU","Pacific/Niue"],["Nome","US","America/Nome"],["Norfolk","NF","Pacific/Norfolk"],["Noronha","BR","America/Noronha"],["Nouakchott","MR","Africa/Nouakchott"],["Noumea","NC","Pacific/Noumea"],["Novokuznetsk","RU","Asia/Novokuznetsk"],["Novosibirsk","RU","Asia/Novosibirsk"],["Nuuk","GL","America/Nuuk"],["Ojinaga","MX","America/Ojinaga"],["Omsk","RU","Asia/Omsk"],["Oral","KZ","Asia/Oral"],["Orlando","US","America/New_York"],["Osaka","JP","Asia/Tokyo"],["Oslo","NO","Europe/Oslo"],["Ottawa","CA","America/Toronto"],["Ouagadougou","BF","Africa/Ouagadougou"],["Pago Pago","AS","Pacific/Pago_Pago"],["Palau","PW","Pacific/Palau"],["Palmer","AQ","Antarctica/Palmer"],["Panama","PA","America/Panama"],["Paramaribo","SR","America/Paramaribo"],["Paris","FR","Europe/Paris"],["Perth","AU","Australia/Perth"],["Petersburg","US","America/Indiana/Petersburg"],["Philadelphia","US","America/New_York"],["Phnom Penh","KH","Asia/Phnom_Penh"],["Phoenix","US","America/Phoenix"],["Pitcairn","PN","Pacific/Pitcairn"],["Pittsburgh","US","America/New_York"],["Podgorica","ME","Europe/Podgorica"],["Pohnpei","FM","Pacific/Pohnpei"],["Pontianak","ID","Asia/Pontianak"],["Port Moresby","PG","Pacific/Port_Moresby"],["Port of Spain","TT","America/Port_of_Spain"],["Port-au-Prince","HT","America/Port-au-Prince"],["Portland","US","America/Los_Angeles"],["Porto","PT","Europe/Lisbon"],["Porto Velho","BR","America/Porto_Velho"],["Porto-Novo","BJ","Africa/Porto-Novo"],["Prague","CZ","Europe/Prague"],["Pretoria","ZA","Africa/Johannesburg"],["Puerto Rico","PR","America/Puerto_Rico"],["Pune","IN","Asia/Kolkata"],["Punta Arenas","CL","America/Punta_Arenas"],["Pyongyang","KP","Asia/Pyongyang"],["Qostanay","KZ","Asia/Qostanay"],["Quito","EC","America/Guayaquil"],["Qyzylorda","KZ","Asia/Qyzylorda"],["Rankin Inlet","CA","America/Rankin_Inlet"],["Rarotonga","CK","Pacific/Rarotonga"],["Recife","BR","America/Recife"],["Regina","CA","America/Regina"],["Resolute","CA","America/Resolute"],["Reunion","RE","Indian/Reunion"],["Reykjavik","IS","Atlantic/Reykjavik"],["Riga","LV","Europe/Riga"],["Rio Branco","BR","America/Rio_Branco"],["Rio Gallegos","AR","America/Argentina/Rio_Gallegos"],["Rio de Janeiro","BR","America/Sao_Paulo"],["Riyadh","SA","Asia/Riyadh"],["Rome","IT","Europe/Rome"],["Rothera","AQ","Antarctica/Rothera"],["Rotterdam","NL","Europe/Amsterdam"],["Saint Petersburg","RU","Europe/Moscow"],["Saipan","MP","Pacific/Saipan"],["Sakhalin","RU","Asia/Sakhalin"],["Salt Lake City","US","America/Denver"],["Salta","AR","America/Argentina/Salta"],["Samara","RU","Europe/Samara"],["Samarkand","UZ","Asia/Samarkand"],["San Antonio","US","America/Chicago"],["San Diego","US","America/Los_Angeles"],["San Francisco","US","America/Los_Angeles"],["San Juan","AR","America/Argentina/San_Juan"],["San Luis","AR","America/Argentina/San_Luis"],["San Marino","SM","Europe/San_Marino"],["Santarem","BR","America/Santarem"],["Santiago","CL","America/Santiago"],["Santo Domingo","DO","America/Santo_Domingo"],["Sao Tome","ST","Africa/Sao_Tome"],["Sarajevo","BA","Europe/Sarajevo"],["Saratov","RU","Europe/Saratov"],["Scoresbysund","GL","America/Scoresbysund"],["Seattle","US","America/Los_Angeles"],["Seoul","KR","Asia/Seoul"],["Seville","ES","Europe/Madrid"],["Shanghai","CN","Asia/Shanghai"],["Shenzhen","CN","Asia/Shanghai"],["Simferopol","UA","Europe/Simferopol"],["Singapore","SG","Asia/Singapore"],["Sitka","US","America/Sitka"],["Skopje","MK","Europe/Skopje"],["Sofia","BG","Europe/Sofia"],["South Georgia","GS","Atlantic/South_Georgia"],["Srednekolymsk","RU","Asia/Srednekolymsk"],["St Barthelemy","BL","America/St_Barthelemy"],["St Helena","SH","Atlantic/St_Helena"],["St Johns","CA","America/St_Johns"],["St Kitts","KN","America/St_Kitts"],["St Lucia","LC","America/St_Lucia"],["St Thomas","VI","America/St_Thomas"],["St Vincent","VC","America/St_Vincent"],["Stanley","FK","Atlantic/Stanley"],["Stockholm","SE","Europe/Stockholm"],["Surabaya","ID","Asia/Jakarta"],["Swift Current","CA","America/Swift_Current"],["Sydney","AU","Australia/Sydney"],["Syowa","AQ","Antarctica/Syowa"],["São Paulo","BR","America/Sao_Paulo"],["Tahiti","PF","Pacific/Tahiti"],["Taipei","TW","Asia/Taipei"],["Tallinn","EE","Europe/Tallinn"],["Tarawa","KI","Pacific/Tarawa"],["Tashkent","UZ","Asia/Tashkent"],["Tbilisi","GE","Asia/Tbilisi"],["Tegucigalpa","HN","America/Tegucigalpa"],["Tehran","IR","Asia/Tehran"],["Tel Aviv","IL","Asia/Jerusalem"],["Tell City","US","America/Indiana/Tell_City"],["Thimphu","BT","Asia/Thimphu"],["Thule","GL","America/Thule"],["Tijuana","MX","America/Tijuana"],["Tirane","AL","Europe/Tirane"],["Tokyo","JP","Asia/Tokyo"],["Tomsk","RU","Asia/Tomsk"],["Tongatapu","TO","Pacific/Tongatapu"],["Toronto","CA","America/Toronto"],["Tortola","VG","America/Tortola"],["Tripoli","LY","Africa/Tripoli"],["Troll","AQ","Antarctica/Troll"],["Tucuman","AR","America/Argentina/Tucuman"],["Tunis","TN","Africa/Tunis"],["Turin","IT","Europe/Rome"],["Ulaanbaatar","MN","Asia/Ulaanbaatar"],["Ulyanovsk","RU","Europe/Ulyanovsk"],["Urumqi","CN","Asia/Urumqi"],["Ushuaia","AR","America/Argentina/Ushuaia"],["Ust-Nera","RU","Asia/Ust-Nera"],["Vaduz","LI","Europe/Vaduz"],["Valencia","ES","Europe/Madrid"],["Vancouver","CA","America/Vancouver"],["Vatican","VA","Europe/Vatican"],["Venice","IT","Europe/Rome"],["Vevay","US","America/Indiana/Vevay"],["Vienna","AT","Europe/Vienna"],["Vientiane","LA","Asia/Vientiane"],["Vilnius","LT","Europe/Vilnius"],["Vincennes","US","America/Indiana/Vincennes"],["Vladivostok","RU","Asia/Vladivostok"],["Volgograd","RU","Europe/Volgograd"],["Vostok","AQ","Antarctica/Vostok"],["Wake","UM","Pacific/Wake"],["Wallis","WF","Pacific/Wallis"],["Warsaw","PL","Europe/Warsaw"],["Washington, D.C.","US","America/New_York"],["Wellington","NZ","Pacific/Auckland"],["Whitehorse","CA","America/Whitehorse"],["Winamac","US","America/Indiana/Winamac"],["Windhoek","NA","Africa/Windhoek"],["Winnipeg","CA","America/Winnipeg"],["Yakutat","US","America/Yakutat"],["Yakutsk","RU","Asia/Yakutsk"],["Yangon","MM","Asia/Yangon"],["Yekaterinburg","RU","Asia/Yekaterinburg"],["Yerevan","AM","Asia/Yerevan"],["Yokohama","JP","Asia/Tokyo"],["Zagreb","HR","Europe/Zagreb"],["Zurich","CH","Europe/Zurich"],["Zürich","CH","Europe/Zurich"]];

/* ===== js/zj-shell.js ===== */
/* ZJ OS — shell enhancements: mobile bottom navigation, More sheet, mobile home,
 * calendar "add task", note editor save-state/back handling.
 *
 * Reads the live app state exposed by index.html (window.__zj_app) and drives the
 * existing switchTab(); it never writes to localStorage directly — new notes/tasks
 * go through the app's own save() so existing data structures are untouched.
 */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = () => window.__zj_app || window.App || null;
  const isMobile = () => window.matchMedia('(max-width: 1023.98px)').matches;
  const icons = () => { try { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); } catch (_) {} };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const TITLES = {
    dashboard: 'Home', calendar: 'Calendar', todo: 'Tasks', notes: 'Notes', notion: 'Workspace', habits: 'Habits',
    calculator: 'Calculator', weather: 'Weather', clock: 'Clock', gallery: 'Gallery', bookmarks: 'Bookmarks',
    pomodoro: 'Pomodoro', converter: 'Converter', password: 'Password Generator', colorpicker: 'Color Picker', chatbot: 'Assistant',
  };
  const PRIMARY = ['dashboard', 'calendar', 'todo', 'notes'];
  // Only applications that exist in this project.
  const MORE_ITEMS = [
    ['notion', 'Workspace', 'file-text'], ['habits', 'Habits', 'target'], ['calculator', 'Calculator', 'calculator'],
    ['weather', 'Weather', 'cloud'], ['clock', 'Clock', 'clock'], ['gallery', 'Gallery', 'image'],
    ['bookmarks', 'Bookmarks', 'bookmark'], ['pomodoro', 'Pomodoro', 'timer'], ['converter', 'Converter', 'arrow-left-right'],
    ['password', 'Password Gen', 'key'], ['colorpicker', 'Color Picker', 'palette'], ['chatbot', 'Assistant', 'message-square'],
    ['__settings', 'Settings', 'settings'],
  ];

  let activeTab = 'dashboard';

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */
  function go(tab) {
    if (typeof window.switchTab === 'function') window.switchTab(tab);
  }

  function syncNav(tab) {
    activeTab = tab || activeTab;
    const title = $('#zj-m-title');
    if (title) title.textContent = TITLES[activeTab] || 'ZJ OS';
    document.querySelectorAll('.zj-bn-item').forEach((b) => {
      const key = b.dataset.nav;
      const on = key === 'more' ? !PRIMARY.includes(activeTab) : key === activeTab;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    document.querySelectorAll('.zj-more-tile').forEach((t) => t.classList.toggle('active', t.dataset.tab === activeTab));
  }

  /* More sheet */
  let lastFocus = null;
  function openSheet() {
    const sheet = $('#zj-more-sheet'), back = $('#zj-sheet-backdrop'), btn = $('#zj-more-btn');
    if (!sheet || !sheet.hidden) return;
    lastFocus = document.activeElement;
    sheet.hidden = false; back.hidden = false;
    document.body.classList.add('zj-sheet-open');
    btn && btn.setAttribute('aria-expanded', 'true');
    const first = $('.zj-more-tile', sheet) || $('#zj-more-close');
    first && first.focus({ preventScroll: true });
  }
  function closeSheet(restoreFocus) {
    const sheet = $('#zj-more-sheet'), back = $('#zj-sheet-backdrop'), btn = $('#zj-more-btn');
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true; back.hidden = true;
    document.body.classList.remove('zj-sheet-open');
    btn && btn.setAttribute('aria-expanded', 'false');
    if (restoreFocus !== false && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function buildMore() {
    const grid = $('#zj-more-grid');
    if (!grid) return;
    grid.innerHTML = MORE_ITEMS.map(([tab, label, icon]) =>
      '<button type="button" class="zj-more-tile" data-tab="' + tab + '"><i data-lucide="' + icon + '"></i><span>' + esc(label) + '</span></button>').join('');
    icons();
  }

  function bindNav() {
    $('#zj-bottom-nav')?.addEventListener('click', (e) => {
      const b = e.target.closest('.zj-bn-item');
      if (!b) return;
      if (b.dataset.nav === 'more') { const sh = $('#zj-more-sheet'); sh.hidden ? openSheet() : closeSheet(); return; }
      closeSheet(false);
      go(b.dataset.nav);
    });
    $('#zj-more-grid')?.addEventListener('click', (e) => {
      const t = e.target.closest('.zj-more-tile');
      if (!t) return;
      closeSheet(false);
      if (t.dataset.tab === '__settings') { $('#settings-dialog')?.showModal(); return; }
      go(t.dataset.tab);
    });
    $('#zj-more-close')?.addEventListener('click', () => closeSheet());
    $('#zj-sheet-backdrop')?.addEventListener('click', () => closeSheet());
    document.addEventListener('keydown', (e) => {
      const sheet = $('#zj-more-sheet');
      if (!sheet || sheet.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
      if (e.key === 'Tab') {            // keep focus inside the open sheet
        const f = Array.from(sheet.querySelectorAll('button')).filter((x) => !x.disabled);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('resize', () => { if (!isMobile()) closeSheet(false); });
    window.addEventListener('zj:tab-change', (e) => {
      const tab = e.detail && e.detail.tab;
      syncNav(tab);
      closeSheet(false);
      $('#main-scroll-area')?.scrollTo({ top: 0 });
      if (tab === 'dashboard') renderHome();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mobile home (real data only)                                        */
  /* ------------------------------------------------------------------ */
  function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fmtDue(due) {
    if (!due) return { text: 'No date', overdue: false };
    const t = dayKey(new Date());
    if (due < t) return { text: 'Overdue', overdue: true };
    if (due === t) return { text: 'Today', overdue: false };
    const d = new Date(due + 'T00:00:00');
    return { text: isNaN(d) ? due : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), overdue: false };
  }
  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }

  function renderHome() {
    const host = $('#zj-m-home');
    const A = app();
    if (!host || !A) return;
    const todos = Array.isArray(A.todos) ? A.todos : [];
    const notes = Array.isArray(A.notes) ? A.notes : [];
    const habits = Array.isArray(A.habits) ? A.habits : [];
    const total = todos.length;
    const done = todos.filter((t) => t.done).length;
    const open = total - done;
    const rate = total ? Math.round((done / total) * 100) : 0;
    const today = dayKey(new Date());
    const dueToday = todos.filter((t) => !t.done && t.due === today).length;
    const overdue = todos.filter((t) => !t.done && t.due && t.due < today).length;

    const upcoming = todos.filter((t) => !t.done).sort((a, b) => {
      if (!a.due && !b.due) return 0; if (!a.due) return 1; if (!b.due) return -1; return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
    }).slice(0, 5);

    const activity = [];
    todos.forEach((t) => { if (t.done && t.completedAt) activity.push({ at: t.completedAt, label: 'Completed: ' + (t.text || 'Task'), tab: 'todo', icon: 'check-circle-2' }); });
    notes.forEach((n) => { const at = n.updatedAt || n.createdAt; if (at) activity.push({ at, label: (n.updatedAt && n.updatedAt !== n.createdAt ? 'Edited note: ' : 'New note: ') + (n.title || 'Untitled'), tab: 'notes', icon: 'sticky-note' }); });
    activity.sort((a, b) => (a.at < b.at ? 1 : -1));
    const recent = activity.slice(0, 4);

    const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const hint = overdue ? overdue + ' overdue ' + (overdue === 1 ? 'task needs' : 'tasks need') + ' attention.'
      : dueToday ? dueToday + ' ' + (dueToday === 1 ? 'task is' : 'tasks are') + ' due today.'
      : open ? open + ' open ' + (open === 1 ? 'task' : 'tasks') + '.' : 'You are all caught up.';

    host.innerHTML =
      '<section class="zj-m-hero"><h2>' + greeting() + ', <span>ZJ</span></h2><p>' + esc(hint) + '</p>' +
      '<div class="zj-m-date"><i data-lucide="calendar-days"></i><span>' + esc(dateStr) + '</span></div></section>' +

      '<section class="zj-m-stats" aria-label="Productivity statistics">' +
        stat('Tasks', total, open + ' open', 'primary', 'todo') +
        stat('Completed', done, rate + '% complete', 'success', 'todo') +
        stat('Notes', notes.length, 'saved', 'premium', 'notes') +
        stat('Habits', habits.length, 'tracked', 'teal', 'habits') +
      '</section>' +

      '<section class="zj-m-section"><h3>Quick access</h3><div class="zj-m-quick">' +
        quick('plus-circle', 'New task', 'new-task') + quick('file-plus', 'New note', 'new-note') +
        quick('timer', 'Focus', 'pomodoro') + quick('message-square', 'Assistant', 'assistant') +
      '</div></section>' +

      '<section class="zj-m-section"><h3>Upcoming tasks <button type="button" data-go="todo">View all</button></h3>' +
        (upcoming.length ? upcoming.map((t) => { const d = fmtDue(t.due);
          return '<button type="button" class="zj-m-row" data-go="todo"><span class="zj-m-pri" data-p="' + esc(t.priority || 'medium') + '" title="' + esc(t.priority || 'medium') + ' priority"></span>' +
            '<span class="t">' + esc(t.text) + '</span><span class="m' + (d.overdue ? ' overdue' : '') + '">' + esc(d.text) + '</span></button>'; }).join('')
          : '<div class="zj-m-empty">No open tasks. Add one to see it here.</div>') +
      '</section>' +

      '<section class="zj-m-section"><h3>Recent activity</h3>' +
        (recent.length ? recent.map((r) => '<button type="button" class="zj-m-row" data-go="' + r.tab + '"><span class="t">' + esc(r.label) + '</span><span class="m">' + esc(ago(r.at)) + '</span></button>').join('')
          : '<div class="zj-m-empty">Your recent activity will appear here.</div>') +
      '</section>' +

      '<section class="zj-m-section zj-m-quicknote"><h3>Quick note</h3>' +
        '<label class="sr-only" for="zj-m-note">Quick note</label>' +
        '<textarea id="zj-m-note" class="input" placeholder="Capture a thought..." rows="3"></textarea>' +
        '<button type="button" class="btn btn-primary" id="zj-m-note-save">Save to notes</button></section>';
    icons();
  }
  function stat(k, v, s, tone, go) {
    return '<button type="button" class="zj-m-stat" data-tone="' + tone + '" data-go="' + go + '"><span class="k">' + k + '</span><span class="v">' + v + '</span><span class="s">' + esc(s) + '</span></button>';
  }
  function quick(icon, label, act) { return '<button type="button" data-act="' + act + '"><i data-lucide="' + icon + '"></i><span>' + label + '</span></button>'; }
  function ago(iso) {
    const t = new Date(iso).getTime(); if (isNaN(t)) return '';
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'now'; if (m < 60) return m + 'm ago'; const h = Math.round(m / 60); if (h < 24) return h + 'h ago';
    const d = Math.round(h / 24); return d < 7 ? d + 'd ago' : new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function bindHome() {
    const host = $('#zj-m-home');
    if (!host) return;
    host.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]');
      if (g) { go(g.dataset.go); return; }
      const a = e.target.closest('[data-act]');
      if (a) {
        const act = a.dataset.act;
        if (act === 'new-task') { go('todo'); setTimeout(() => $('#todo-input')?.focus(), 150); }
        else if (act === 'new-note') { go('notes'); setTimeout(() => window.openNoteDialog && window.openNoteDialog(), 100); }
        else if (act === 'pomodoro') go('pomodoro');
        else if (act === 'assistant') { window.openAssistant ? window.openAssistant() : go('chatbot'); }
        return;
      }
      if (e.target.closest('#zj-m-note-save')) {
        const A = app(); const ta = $('#zj-m-note');
        const text = ((ta && ta.value) || '').trim();
        if (!A || !text) { ta && ta.focus(); window.toast && window.toast('Write something first.', 'info'); return; }
        const firstLine = text.split('\n')[0].trim();
        const title = firstLine.length > 48 ? firstLine.slice(0, 45) + '...' : firstLine;
        const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
        A.notes.unshift({ id, title, content: text, tags: [], pinned: false, createdAt: new Date().toISOString() });
        if (window.save) window.save();
        if (window.renderNotes) window.renderNotes();
        window.toast && window.toast('Note saved', 'success');
        renderHome();
      }
    });
    // Keep the home view fresh when data changes from another tab.
    window.addEventListener('zj:sync', () => { if (activeTab === 'dashboard') renderHome(); });
  }

  /* ------------------------------------------------------------------ */
  /* Calendar: add a task for the selected day                           */
  /* ------------------------------------------------------------------ */
  function enhanceCalendar() {
    const detail = $('#cal-detail');
    if (!detail) return;
    const add = () => {
      if (detail.querySelector('.zj-cal-add')) return;
      const sel = $('#cal-grid .cal-cell.selected');
      if (!sel) return;
      const key = (sel.dataset.action || '').replace('cal-select:', '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-secondary zj-cal-add'; b.dataset.date = key;
      b.textContent = 'Add task for this day';
      detail.appendChild(b);
    };
    new MutationObserver(add).observe(detail, { childList: true });
    detail.addEventListener('click', (e) => {
      const b = e.target.closest('.zj-cal-add');
      if (!b) return;
      go('todo');
      setTimeout(() => { const due = $('#todo-due'); if (due) due.value = b.dataset.date; $('#todo-input')?.focus(); }, 150);
    });
    add();
  }

  /* ------------------------------------------------------------------ */
  /* Notes editor: save-state indicator + back                           */
  /* ------------------------------------------------------------------ */
  function enhanceNotes() {
    // Autosave + save-state live in index.html (notes module); here only the mobile back button.
    $('#note-back')?.addEventListener('click', () => { window.saveNote && window.saveNote(); });
  }

  /* Clear the task-title error state as soon as the person types. */
  function enhanceTaskForm() {
    const inp = $('#todo-input');
    inp && inp.addEventListener('input', () => {
      inp.removeAttribute('aria-invalid');
      const e = $('#todo-form-error'); if (e) { e.hidden = true; e.textContent = ''; }
    });
  }


  /* ------------------------------------------------------------------ */
  /* Color system panel (Settings): every token of the active palette    */
  /* ------------------------------------------------------------------ */
  const PAL = {
    dark: [
      ['Obsidian Base', '--zj-obsidian-base', 'Page background'], ['Carbon Titanium', '--zj-carbon-titanium', 'Sidebar, top bar'],
      ['Abyssal Sapphire', '--zj-abyssal-sapphire', 'Inputs, secondary sidebars, workspace zones'], ['Brushed Slate', '--zj-brushed-slate', 'Cards and widgets'],
      ['Liquid Steel', '--zj-liquid-steel', 'Hover, modals'], ['Dark Liquid Glass', '--zj-dark-liquid-glass', 'Glass panels, bottom nav'],
      ['Specular Glass Rim', '--zj-specular-glass-rim', 'Top-left edge light on glass'], ['Electric Cyan', '--zj-electric-cyan', 'Primary actions, active nav'],
      ['Neon Cobalt', '--zj-neon-cobalt', 'Links, progress, data'], ['Royal Electric', '--zj-royal-electric', 'Switches, sliders'],
      ['Arctic Mint', '--zj-arctic-mint', 'Habits, streaks'], ['Laser Yellow', '--zj-laser-yellow', 'Medium priority, warnings'],
      ['Solar Amber', '--zj-solar-amber', 'High priority, Pomodoro ring'], ['Hyper Green', '--zj-hyper-green', 'Success, completed'],
      ['Champagne Gold', '--zj-champagne-gold', 'Premium metrics'], ['Sovereign Gold', '--zj-sovereign-gold', 'Focus rings, pinned, favorites, achievements'],
      ['Crimson Pulse', '--zj-crimson-pulse', 'Delete, overdue'], ['Dark Chromium', '--zj-dark-chromium', 'Borders, dividers'],
      ['Cryo Silver', '--zj-cryo-silver', 'Polished metal card edges'], ['Liquid Mercury', '--zj-liquid-mercury', 'Inactive icons, scrollbars'],
      ['Polar Ice', '--zj-polar-ice', 'Primary text'], ['Steel Mist', '--zj-steel-mist', 'Secondary text'], ['Ghost Slate', '--zj-ghost-slate', 'Muted text, placeholders'],
    ],
    light: [
      ['Silver-Gray Base', '--zj-silver-gray-base', 'Page background'], ['Mist Titanium', '--zj-mist-titanium', 'Sidebar, top bar'],
      ['Pearl Silver', '--zj-pearl-silver', 'Inputs, nested containers'], ['Soft Off-White', '--zj-soft-off-white', 'Cards, fields'],
      ['Polished Steel', '--zj-polished-steel', 'Hover, modals'], ['Light Liquid Glass', '--zj-light-liquid-glass', 'Glass panels, bottom nav'],
      ['Frosted Silver Rim', '--zj-frosted-silver-rim', 'Top-left edge light on glass'], ['Electric Cyan', '--zj-electric-cyan', 'Primary actions'],
      ['Glacier Cyan', '--zj-glacier-cyan', 'Links, progress, data'], ['Deep Cobalt', '--zj-deep-cobalt', 'Secondary accents'],
      ['Cobalt Royal', '--zj-cobalt-royal', 'Active tabs, switches, focus, accent text'], ['Deep Teal', '--zj-deep-teal', 'Habits, streaks'],
      ['Amber Gold', '--zj-amber-gold', 'Medium priority, warnings'], ['Burnished Gold', '--zj-burnished-gold', 'High priority, Pomodoro ring, achievements'],
      ['Champagne Gold', '--zj-champagne-gold', 'Premium metrics'], ['Bronze Brass', '--zj-bronze-brass', 'Luxury text accents'],
      ['Emerald Green', '--zj-emerald-green', 'Success, completed'], ['Signal Red', '--zj-signal-red', 'Delete, overdue'],
      ['Silver Chromium', '--zj-silver-chromium', 'Borders, dividers'], ['Brushed Platinum', '--zj-brushed-platinum', 'Inactive icons, scrollbars'],
      ['Obsidian Dark', '--zj-obsidian-dark', 'Primary text'], ['Slate Grey', '--zj-slate-grey', 'Secondary text'],
    ],
  };
  function renderPalette() {
    const grid = $('#zj-palette-grid'); if (!grid) return;
    const mode = document.documentElement.dataset.mode === 'light' ? 'light' : 'dark';
    const cs = getComputedStyle(document.documentElement);
    $('#zj-palette-sub').textContent = (mode === 'light' ? 'Light' : 'Dark') + ' theme: ' + PAL[mode].length + ' colours, each used by the interface as described.';
    grid.innerHTML = PAL[mode].map(([name, v, role]) => {
      const hex = cs.getPropertyValue(v).trim().toUpperCase();
      return '<div class="zj-swatch"><i style="--sw:' + esc(hex) + '"><b></b></i><span>' + esc(name) + '<em>' + esc(hex) + ' · ' + esc(role) + '</em></span></div>';
    }).join('');
  }
  function bindPalette() {
    const dlg = $('#settings-dialog'); if (!dlg) return;
    new MutationObserver(() => { if (dlg.open) renderPalette(); }).observe(dlg, { attributes: true, attributeFilter: ['open'] });
    new MutationObserver(renderPalette).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
    renderPalette();
  }

  /* ------------------------------------------------------------------ */
  function init() {
    // One-time cleanup of obsolete 3D-background preferences (no user content).
    try { ['zj_bg3d', 'zj_shape'].forEach((k) => localStorage.removeItem(k)); } catch (_) {}
    buildMore(); bindPalette(); bindNav(); bindHome(); enhanceCalendar(); enhanceNotes(); enhanceTaskForm();
    syncNav('dashboard');
    // App state loads asynchronously during boot; render once data is ready.
    let tries = 0;
    const t = setInterval(() => { tries++; if (app() || tries > 40) { clearInterval(t); renderHome(); } }, 100);
    // Re-render the home when the viewport crosses the mobile breakpoint.
    window.matchMedia('(max-width: 1023.98px)').addEventListener?.('change', () => { renderHome(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ===== js/zj-clock.js ===== */
/* ZJ OS — Clock module (World Clock, Alarms, Timer, Stopwatch, sound engine).
 *
 * Storage (all local):
 *   zj_worldClocks  [{id,city,country,cc,tz,region,pinned}]   (migrated once from zj_activeCities, which is left untouched)
 *   zj_alarms       App.alarms  [{id,time,label,repeat,days,active,sound,snoozeMin,lastTriggered,snoozeUntil}]  (old alarms keep working)
 *   zj_clockTimer   {durationMs,endAt,remainingMs,running,repeat,sound}
 *   zj_clockStopwatch {elapsed,laps[],running,startedAt}  (laps are cumulative splits, same shape as before)
 *   zj_clockSound   {volume,muted,alarmSound,timerSound,lapTick}
 *
 * Browser limitation: alarms, timers and sounds only run while ZJ OS is open in a tab or installed app.
 * Web pages cannot wake a closed browser; the UI says so.
 */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const app = () => window.__zj_app;
  const rd = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n, l) => String(n).padStart(l || 2, '0');
  const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id' + Date.now() + Math.random().toString(36).slice(2, 7);
  const icons = () => { try { window.lucide && window.lucide.createIcons(); } catch (_) {} };
  const toast = (m, t) => { try { window.toast && window.toast(m, t || 'info'); } catch (_) {} };
  const is24 = () => { const a = app(); return !a || a.clock24h !== false; };
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* ======================================================= Sound engine */
  const SOUNDS = {
    chime:   { label: 'Chime',   notes: [[880, 0, .35, 'sine'], [1175, .22, .35, 'sine'], [1568, .44, .6, 'sine']], len: 1.6 },
    beep:    { label: 'Beep',    notes: [[1000, 0, .15, 'square'], [1000, .25, .15, 'square']], len: 1 },
    digital: { label: 'Digital', notes: [[1320, 0, .09, 'square'], [1320, .14, .09, 'square'], [1320, .28, .09, 'square'], [1760, .48, .2, 'square']], len: 1.2 },
    bell:    { label: 'Bell',    notes: [[660, 0, 1.1, 'triangle'], [1320, 0, .7, 'sine']], len: 1.8 },
    pulse:   { label: 'Pulse',   notes: [[520, 0, .25, 'sawtooth'], [780, .3, .25, 'sawtooth']], len: 1.2 },
    soft:    { label: 'Soft',    notes: [[523, 0, .5, 'sine'], [659, .35, .5, 'sine'], [784, .7, .8, 'sine']], len: 2 },
  };
  let actx = null;
  const prefs = () => Object.assign({ volume: 0.7, muted: false, alarmSound: 'chime', timerSound: 'beep', lapTick: true }, rd('zj_clockSound', {}));
  const savePrefs = (p) => wr('zj_clockSound', p);
  function ctx() {
    if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { actx = new C(); } catch (_) { return null; } }
    return actx;
  }
  function audioReady() { const c = ctx(); return !!c && c.state === 'running'; }
  function unlock() { const c = ctx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); updateAudioBanner(); }
  ['pointerdown', 'keydown', 'touchstart'].forEach((e) => document.addEventListener(e, unlock, { passive: true }));

  function playOnce(name, vol, force) {
    const p = prefs(); if (p.muted && !force) return false;
    const c = ctx(); if (!c) return false;
    if (c.state === 'suspended') { c.resume().catch(() => {}); }
    const def = SOUNDS[name] || SOUNDS.chime; const t0 = c.currentTime + 0.02;
    const master = c.createGain(); master.gain.value = Math.max(0, Math.min(1, vol == null ? p.volume : vol)) * 0.5; master.connect(c.destination);
    def.notes.forEach(([f, off, dur, type]) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + off); g.gain.exponentialRampToValueAtTime(1, t0 + off + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + dur);
      o.connect(g); g.connect(master); o.start(t0 + off); o.stop(t0 + off + dur + 0.05);
    });
    return c.state === 'running';
  }
  let loopTimer = null;
  function startLoop(name, maxMs) {
    stopLoop(); const def = SOUNDS[name] || SOUNDS.chime; const begin = Date.now();
    const go = () => { if (Date.now() - begin > (maxMs || 120000)) { stopLoop(); return; } playOnce(name); };
    go(); loopTimer = setInterval(go, Math.round(def.len * 1000) + 400);
  }
  function stopLoop() { if (loopTimer) { clearInterval(loopTimer); loopTimer = null; } }

  function updateAudioBanner() {
    const b = $('#zjc-audio-note'); if (!b) return;
    const c = ctx();
    if (!c) { b.hidden = false; b.textContent = 'This browser does not support audio playback, so alarm and timer sounds are unavailable. Visual alerts still work.'; return; }
    b.hidden = c.state === 'running';
    if (!b.hidden) b.textContent = 'Sound is not enabled yet. Tap or click anywhere on the page once to allow audio.';
  }

  /* ======================================================= Shared helpers */
  function fmtOffset(tz, d) {
    try {
      const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(d || new Date()).find((x) => x.type === 'timeZoneName');
      const v = (p && p.value) || 'GMT'; const m = v.match(/GMT([+-])(\d{2}):(\d{2})/);
      if (!m) return 'UTC+0'; const h = parseInt(m[2], 10), mi = m[3];
      return 'UTC' + m[1] + h + (mi !== '00' ? ':' + mi : '');
    } catch (_) { return 'UTC'; }
  }
  function offsetMinutes(tz, d) {
    try {
      const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(d || new Date()).find((x) => x.type === 'timeZoneName');
      const m = p && p.value.match(/GMT([+-])(\d{2}):(\d{2})/); if (!m) return 0;
      return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
    } catch (_) { return 0; }
  }
  function validTz(tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (_) { return false; } }
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  /* ======================================================= World clock */
  const WMAX = 100;
  let world = [];
  let wQuery = '';
  let wOnline = [];          // online geocoding results for the current query
  let wState = 'idle';       // idle | loading | error
  let wTimer = null, wSeq = 0;

  function loadWorld() {
    let list = rd('zj_worldClocks', null);
    if (!Array.isArray(list)) {                       // one-time migration from the old tz-string list
      const old = rd('zj_activeCities', ['Europe/London', 'America/New_York', 'Asia/Tokyo']);
      list = [];
      (Array.isArray(old) ? old : []).forEach((tz) => {
        if (typeof tz !== 'string' || !validTz(tz)) return;
        const hit = (window.ZJ_CITIES || []).find((r) => r[2] === tz && norm(r[0]) === norm(tz.split('/').pop().replace(/_/g, ' '))) || (window.ZJ_CITIES || []).find((r) => r[2] === tz);
        list.push(hit ? mk(hit[0], hit[1], tz, '') : mk(tz.split('/').pop().replace(/_/g, ' '), '', tz, ''));
      });
      wr('zj_worldClocks', list);
    }
    world = list.filter((c) => c && c.tz && validTz(c.tz));
  }
  function mk(city, cc, tz, region) { return { id: uid(), city, cc: cc || '', country: (window.ZJ_COUNTRIES && window.ZJ_COUNTRIES[cc]) || '', tz, region: region || '', pinned: false }; }
  const saveWorld = () => wr('zj_worldClocks', world);
  const keyOf = (c) => norm(c.city) + '|' + (c.cc || '') + '|' + norm(c.region) + '|' + c.tz;

  function searchLocal(q) {
    const n = norm(q); if (!n) return [];
    const offM = n.replace(/\s/g, '').match(/^(?:utc|gmt)?([+-]\d{1,2})(?::?(\d{2}))?$/);
    const out = [];
    (window.ZJ_CITIES || []).forEach((r) => {
      const [city, cc, tz] = r; const cn = norm(city), co = norm((window.ZJ_COUNTRIES || {})[cc]), tn = norm(tz.replace(/_/g, ' '));
      let score = 0;
      if (cn === n) score = 100; else if (cn.startsWith(n)) score = 80; else if (cn.includes(n)) score = 60;
      else if (co === n || cc.toLowerCase() === n) score = 45; else if (co.startsWith(n)) score = 40; else if (tn.includes(n)) score = 30;
      else if (offM) { const want = parseInt(offM[1], 10) * 60 + (offM[2] ? Math.sign(parseInt(offM[1], 10) || 1) * parseInt(offM[2], 10) : 0); if (offsetMinutes(tz) === want) score = 20; }
      if (score) out.push({ score, city, cc, tz, country: (window.ZJ_COUNTRIES || {})[cc] || '', region: '' });
    });
    out.sort((a, b) => b.score - a.score || a.city.localeCompare(b.city));
    return out.slice(0, 40);
  }
  function runOnline(q) {
    clearTimeout(wTimer);
    if (q.trim().length < 2 || !navigator.onLine) { wOnline = []; wState = 'idle'; renderResults(); return; }
    wState = 'loading'; renderResults();
    const seq = ++wSeq;
    wTimer = setTimeout(async () => {
      try {
        const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 6000);
        const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&format=json&name=' + encodeURIComponent(q.trim()), { signal: ctl.signal });
        clearTimeout(to); if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json(); if (seq !== wSeq) return;
        wOnline = (j.results || []).filter((x) => x.timezone && validTz(x.timezone)).map((x) => ({ city: x.name, cc: x.country_code || '', country: x.country || '', region: x.admin1 || '', tz: x.timezone, score: 10 }));
        wState = 'idle';
      } catch (_) { if (seq !== wSeq) return; wOnline = []; wState = 'error'; }
      renderResults();
    }, 350);
  }
  function mergedResults() {
    const seen = new Set(), out = [];
    searchLocal(wQuery).concat(wOnline).forEach((r) => {
      // local rows have no region; skip an online duplicate of the same city/country/zone
      const k = norm(r.city) + '|' + r.cc + '|' + r.tz;
      if (seen.has(k) && !r.region) return;
      if (seen.has(k)) { const i = out.findIndex((o) => norm(o.city) + '|' + o.cc + '|' + o.tz === k && !o.region); if (i >= 0) out[i] = r; return; }
      seen.add(k); out.push(r);
    });
    return out.slice(0, 30);
  }
  function renderResults() {
    const box = $('#zjc-w-results'); if (!box) return;
    if (!wQuery.trim()) { box.innerHTML = ''; return; }
    const rows = mergedResults(); const has = new Set(world.map(keyOf));
    let h = '';
    rows.forEach((r, i) => {
      const dupe = has.has(keyOf({ city: r.city, cc: r.cc, region: r.region, tz: r.tz }));
      const sub = [r.region, r.country || r.cc].filter(Boolean).join(', ');
      h += '<li><button type="button" class="zjc-res" data-i="' + i + '"' + (dupe ? ' disabled' : '') + '><span><b>' + esc(r.city) + '</b><small>' + esc(sub) + ' · ' + esc(r.tz.replace(/_/g, ' ')) + ' · ' + fmtOffset(r.tz) + '</small></span><span class="zjc-add">' + (dupe ? 'Added' : 'Add') + '</span></button></li>';
    });
    if (!rows.length) h = '<li class="zjc-muted">' + (wState === 'loading' ? 'Searching…' : 'No matching cities. Try a country, time zone or different spelling.') + '</li>';
    else if (wState === 'loading') h += '<li class="zjc-muted">Searching more locations…</li>';
    if (wState === 'error') h += '<li class="zjc-muted">Online search is unavailable; showing built-in cities only.</li>';
    box.innerHTML = h; box._rows = rows;
  }
  function addCity(r) {
    if (world.length >= WMAX) { toast('You can keep up to ' + WMAX + ' clocks.', 'warning'); return; }
    const c = mk(r.city, r.cc, r.tz, r.region); if (r.country) c.country = r.country;
    if (world.some((x) => keyOf(x) === keyOf(c))) { toast(r.city + ' is already added.', 'info'); return; }
    world.push(c); saveWorld(); renderWorld(); renderResults(); toast('Added ' + r.city, 'success');
  }
  function sortedWorld() { return world.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || world.indexOf(a) - world.indexOf(b)); }
  function renderWorld() {
    const list = $('#zjc-w-list'); if (!list) return;
    if (!world.length) { list.innerHTML = '<div class="zjc-empty"><i data-lucide="globe"></i><p>No world clocks yet</p><small>Search for a city, country or time zone above to add one.</small></div>'; icons(); return; }
    list.innerHTML = sortedWorld().map((c) => {
      const sub = [c.region, c.country || c.cc].filter(Boolean).join(', ');
      return '<article class="zjc-city" data-id="' + c.id + '" data-tz="' + esc(c.tz) + '"><div class="zjc-city-main"><div class="zjc-city-name">' + (c.pinned ? '<i data-lucide="pin" aria-label="Pinned"></i>' : '') + esc(c.city) + '</div><div class="zjc-city-sub">' + esc(sub) + '</div><div class="zjc-city-tz">' + esc(c.tz.replace(/_/g, ' ')) + ' · <span data-f="off"></span> · <span data-f="rel"></span></div></div>' +
        '<div class="zjc-city-time"><div class="zjc-time" data-f="time">--:--:--</div><div class="zjc-date" data-f="date"></div><div class="zjc-dn" data-f="dn"></div></div>' +
        '<div class="zjc-city-actions"><button type="button" class="btn-icon" data-wact="pin" aria-pressed="' + c.pinned + '" aria-label="' + (c.pinned ? 'Unpin ' : 'Pin ') + esc(c.city) + '"><i data-lucide="pin"></i></button>' +
        '<button type="button" class="btn-icon" data-wact="up" aria-label="Move ' + esc(c.city) + ' up"><i data-lucide="arrow-up"></i></button><button type="button" class="btn-icon" data-wact="down" aria-label="Move ' + esc(c.city) + ' down"><i data-lucide="arrow-down"></i></button>' +
        '<button type="button" class="btn-icon" data-wact="del" aria-label="Remove ' + esc(c.city) + '"><i data-lucide="trash-2"></i></button></div></article>';
    }).join('');
    icons(); tickWorld();
  }
  function tickWorld() {
    const now = new Date(), h12 = !is24(), localOff = -now.getTimezoneOffset();
    document.querySelectorAll('#zjc-w-list .zjc-city').forEach((el) => {
      const tz = el.dataset.tz; const set = (f, v) => { const n = el.querySelector('[data-f="' + f + '"]'); if (n && n.textContent !== v) n.textContent = v; };
      try {
        set('time', new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: h12 }).format(now));
        set('date', new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(now));
        const hr = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(now), 10) % 24;
        const day = hr >= 6 && hr < 18; set('dn', (day ? '☀ Day' : '☾ Night'));
        el.dataset.daynight = day ? 'day' : 'night';
        set('off', fmtOffset(tz, now));
        const diff = offsetMinutes(tz, now) - localOff; const ah = Math.floor(Math.abs(diff) / 60), am = Math.abs(diff) % 60;
        set('rel', diff === 0 ? 'same time as you' : (diff > 0 ? '+' : '-') + ah + 'h' + (am ? ' ' + am + 'm' : '') + ' from you');
      } catch (_) {}
    });
  }
  function worldAction(id, act) {
    const i = world.findIndex((c) => c.id === id); if (i < 0) return;
    if (act === 'del') { const [rm] = world.splice(i, 1); saveWorld(); renderWorld(); renderResults(); toast('Removed ' + rm.city, 'info'); return; }
    if (act === 'pin') { world[i].pinned = !world[i].pinned; }
    if (act === 'up' || act === 'down') {
      const view = sortedWorld(); const vi = view.findIndex((c) => c.id === id); const vj = act === 'up' ? vi - 1 : vi + 1;
      if (vj < 0 || vj >= view.length || view[vj].pinned !== view[vi].pinned) return;   // reorder within pinned / unpinned group
      const a = world.indexOf(view[vi]), b = world.indexOf(view[vj]); [world[a], world[b]] = [world[b], world[a]];
    }
    saveWorld(); renderWorld();
    const el = $('#zjc-w-list [data-id="' + id + '"] [data-wact="' + act + '"]'); el && el.focus();
  }
  function buildWorldPanel() {
    const p = $('#clock-panel-world'); if (!p) return;
    p.innerHTML = '<div class="zjc-search"><label for="zjc-w-q">Add a city</label><input id="zjc-w-q" class="input" type="search" placeholder="Search city, country or time zone (e.g. Tokyo, Brazil, UTC+5:30)" autocomplete="off" enterkeyhint="search" aria-controls="zjc-w-results"><ul id="zjc-w-results" class="zjc-results" aria-live="polite"></ul></div><div id="zjc-w-list" class="zjc-cities"></div>';
    $('#zjc-w-q').addEventListener('input', (e) => { wQuery = e.target.value; renderResults(); runOnline(wQuery); });
    $('#zjc-w-results').addEventListener('click', (e) => { const b = e.target.closest('.zjc-res'); if (!b || b.disabled) return; const r = $('#zjc-w-results')._rows[+b.dataset.i]; if (r) addCity(r); });
    $('#zjc-w-list').addEventListener('click', (e) => { const b = e.target.closest('[data-wact]'); const c = e.target.closest('.zjc-city'); if (b && c) worldAction(c.dataset.id, b.dataset.wact); });
    renderWorld();
  }

  /* ======================================================= Alarms */
  let ringing = null;   // {alarm, kind}
  const alarms = () => { const a = app(); return a && Array.isArray(a.alarms) ? a.alarms : []; };
  const persistAlarms = () => { try { window.save && window.save(); } catch (_) {} };
  function alarmDays(a) {
    if (Array.isArray(a.days) && a.days.length) return a.days;
    if (a.repeat === 'daily') return [0, 1, 2, 3, 4, 5, 6];
    if (a.repeat === 'weekdays') return [1, 2, 3, 4, 5];
    if (a.repeat === 'weekends') return [0, 6];
    return [];
  }
  function repeatText(a) {
    const d = alarmDays(a); if (!d.length) return 'Once';
    if (d.length === 7) return 'Every day'; if (d.join() === '1,2,3,4,5') return 'Weekdays'; if (d.join() === '0,6') return 'Weekends';
    return d.slice().sort().map((x) => DAYS[x]).join(', ');
  }
  function fmtAlarmTime(t) {
    const [h, m] = String(t || '00:00').split(':').map((x) => parseInt(x, 10) || 0);
    return is24() ? pad(h) + ':' + pad(m) : pad(h % 12 || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'PM' : 'AM');
  }
  function nextOccurrence(a, from) {
    if (!a.active) return null;
    const now = from || new Date(); const [h, m] = String(a.time).split(':').map((x) => parseInt(x, 10) || 0); const days = alarmDays(a);
    if (a.snoozeUntil && a.snoozeUntil > now.getTime()) return new Date(a.snoozeUntil);
    for (let i = 0; i < 8; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(h, m, 0, 0);
      if (d <= now) continue; if (days.length && !days.includes(d.getDay())) continue; return d;
    }
    return null;
  }
  function untilText(d) {
    const ms = d - Date.now(); const m = Math.max(0, Math.round(ms / 60000)); const dd = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60;
    return 'in ' + (dd ? dd + 'd ' : '') + (hh ? hh + 'h ' : '') + mm + 'm';
  }
  function renderAlarms() {
    const box = $('#zjc-a-list'); if (!box) return;
    const list = alarms().slice().sort((a, b) => String(a.time).localeCompare(String(b.time)));
    let nxt = null, nxtA = null;
    list.forEach((a) => { const o = nextOccurrence(a); if (o && (!nxt || o < nxt)) { nxt = o; nxtA = a; } });
    const ni = $('#zjc-a-next'); if (ni) ni.textContent = nxt ? 'Next alarm: ' + (nxtA.label || 'Alarm') + ' · ' + nxt.toLocaleDateString(undefined, { weekday: 'short' }) + ' ' + fmtAlarmTime(pad(nxt.getHours()) + ':' + pad(nxt.getMinutes())) + ' (' + untilText(nxt) + ')' : 'No upcoming alarms';
    if (!list.length) { box.innerHTML = '<div class="zjc-empty"><i data-lucide="alarm-clock"></i><p>No alarms set</p><small>Use “New alarm” to create one.</small></div>'; icons(); return; }
    box.innerHTML = list.map((a) => '<article class="zjc-alarm' + (a.active ? '' : ' off') + '" data-id="' + esc(a.id) + '"><div class="zjc-alarm-main"><div class="zjc-alarm-time">' + fmtAlarmTime(a.time) + '</div><div class="zjc-alarm-meta">' + esc(a.label || 'Alarm') + ' · ' + esc(repeatText(a)) + ' · ' + esc((SOUNDS[a.sound] || SOUNDS[prefs().alarmSound] || SOUNDS.chime).label) + (a.snoozeUntil > Date.now() ? ' · snoozed' : '') + '</div></div>' +
      '<label class="zjc-switch"><input type="checkbox" data-aact="toggle" ' + (a.active ? 'checked' : '') + ' aria-label="' + (a.active ? 'Disable' : 'Enable') + ' alarm ' + esc(a.label || fmtAlarmTime(a.time)) + '"><span></span></label>' +
      '<button type="button" class="btn-icon" data-aact="edit" aria-label="Edit alarm"><i data-lucide="pencil"></i></button><button type="button" class="btn-icon" data-aact="del" aria-label="Delete alarm"><i data-lucide="trash-2"></i></button></article>').join('');
    icons();
  }
  function soundOptions(sel) { return Object.keys(SOUNDS).map((k) => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + SOUNDS[k].label + '</option>').join(''); }
  function buildAlarmPanel() {
    const p = $('#clock-panel-alarms'); if (!p) return;
    const pr = prefs();
    p.innerHTML = '<div class="zjc-a-top"><div id="zjc-a-next" class="zjc-next" role="status"></div><button type="button" class="btn btn-primary btn-sm" id="zjc-a-new"><i data-lucide="plus"></i> New alarm</button></div>' +
      '<p id="zjc-audio-note" class="zjc-note" hidden></p>' +
      '<div class="zjc-sound-box"><div class="zjc-sound-row"><label for="zjc-vol">Volume</label><input id="zjc-vol" type="range" min="0" max="100" value="' + Math.round(pr.volume * 100) + '" aria-valuetext="' + Math.round(pr.volume * 100) + ' percent"><span id="zjc-vol-v">' + Math.round(pr.volume * 100) + '%</span></div>' +
      '<div class="zjc-sound-row"><label class="zjc-check"><input type="checkbox" id="zjc-mute" ' + (pr.muted ? 'checked' : '') + '> Mute clock sounds</label><button type="button" class="btn btn-secondary btn-sm" id="zjc-test">Test sound</button></div>' +
      '<div class="zjc-sound-row"><label for="zjc-def-alarm">Default alarm sound</label><select id="zjc-def-alarm" class="input">' + soundOptions(pr.alarmSound) + '</select></div></div>' +
      '<div id="zjc-a-list" class="zjc-alarms"></div>' +
      '<p class="zjc-note">Alarms and timers ring only while ZJ OS is open in a browser tab or installed app. Browsers cannot wake a closed page. Allow notifications for a visual reminder: <button type="button" class="btn btn-secondary btn-sm" id="zjc-notif">Enable notifications</button></p>' +
      '<dialog id="zjc-a-dialog" aria-labelledby="zjc-a-title"><form id="zjc-a-form" novalidate><div class="modal-header"><div class="modal-title" id="zjc-a-title">New alarm</div><button type="button" class="btn-icon" data-close aria-label="Close"><i data-lucide="x"></i></button></div>' +
      '<div class="modal-body zjc-form"><div class="zj-field"><label for="zjc-f-time">Time</label><input id="zjc-f-time" class="input" type="time" required></div>' +
      '<div class="zj-field"><label for="zjc-f-label">Label</label><input id="zjc-f-label" class="input" type="text" maxlength="40" placeholder="Alarm" autocomplete="off"></div>' +
      '<fieldset class="zjc-days"><legend>Repeat (none selected = once)</legend>' + DAYS.map((d, i) => '<label class="zjc-day"><input type="checkbox" name="zjc-day" value="' + i + '"><span>' + d + '</span></label>').join('') + '</fieldset>' +
      '<div class="zjc-quick"><button type="button" class="btn btn-secondary btn-sm" data-days="">Once</button><button type="button" class="btn btn-secondary btn-sm" data-days="0,1,2,3,4,5,6">Every day</button><button type="button" class="btn btn-secondary btn-sm" data-days="1,2,3,4,5">Weekdays</button><button type="button" class="btn btn-secondary btn-sm" data-days="0,6">Weekends</button></div>' +
      '<div class="zj-field"><label for="zjc-f-sound">Sound</label><div class="zjc-inline"><select id="zjc-f-sound" class="input">' + soundOptions(pr.alarmSound) + '</select><button type="button" class="btn btn-secondary" id="zjc-f-prev">Preview</button></div></div>' +
      '<div class="zj-field"><label for="zjc-f-snooze">Snooze length</label><select id="zjc-f-snooze" class="input"><option value="5">5 minutes</option><option value="10" selected>10 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option></select></div>' +
      '<p id="zjc-f-err" class="zj-form-error" role="alert" hidden></p></div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="submit" class="btn btn-primary">Save alarm</button></div></form></dialog>';
    const dlg = $('#zjc-a-dialog'); let editing = null;
    const open = (a) => {
      editing = a ? a.id : null; $('#zjc-a-title').textContent = a ? 'Edit alarm' : 'New alarm'; $('#zjc-f-err').hidden = true;
      $('#zjc-f-time').value = a ? a.time : ''; $('#zjc-f-label').value = a ? (a.label || '') : '';
      const days = a ? alarmDays(a) : []; dlg.querySelectorAll('[name="zjc-day"]').forEach((c) => { c.checked = days.includes(+c.value); });
      $('#zjc-f-sound').value = (a && SOUNDS[a.sound]) ? a.sound : prefs().alarmSound; $('#zjc-f-snooze').value = String((a && a.snoozeMin) || 10);
      dlg.showModal(); $('#zjc-f-time').focus();
    };
    $('#zjc-a-new').addEventListener('click', () => open(null));
    dlg.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { stopLoop(); dlg.close(); } const q = e.target.closest('[data-days]'); if (q) { const set = q.dataset.days ? q.dataset.days.split(',').map(Number) : []; dlg.querySelectorAll('[name="zjc-day"]').forEach((c) => { c.checked = set.includes(+c.value); }); } });
    $('#zjc-f-prev').addEventListener('click', () => { unlock(); playOnce($('#zjc-f-sound').value, null, true); });
    $('#zjc-a-form').addEventListener('submit', (e) => {
      e.preventDefault(); const time = $('#zjc-f-time').value; const err = $('#zjc-f-err');
      if (!/^\d{2}:\d{2}$/.test(time)) { err.textContent = 'Choose a time for the alarm.'; err.hidden = false; $('#zjc-f-time').focus(); return; }
      const days = Array.from(dlg.querySelectorAll('[name="zjc-day"]:checked')).map((c) => +c.value);
      const data = { time, label: $('#zjc-f-label').value.trim().slice(0, 40) || 'Alarm', days, repeat: days.length === 7 ? 'daily' : days.length ? 'custom' : 'once', sound: $('#zjc-f-sound').value, snoozeMin: +$('#zjc-f-snooze').value || 10, active: true, snoozeUntil: 0, lastTriggered: '' };
      const a = app(); if (!a) return;
      if (editing) { const t = a.alarms.find((x) => x.id === editing); if (t) Object.assign(t, data); } else a.alarms.push(Object.assign({ id: uid() }, data));
      persistAlarms(); renderAlarms(); dlg.close(); toast(editing ? 'Alarm updated' : 'Alarm set for ' + fmtAlarmTime(time), 'success');
    });
    $('#zjc-a-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-aact]'); const row = e.target.closest('.zjc-alarm'); if (!b || !row) return; const a = alarms().find((x) => x.id === row.dataset.id); if (!a) return;
      if (b.dataset.aact === 'edit') open(a);
      if (b.dataset.aact === 'del') { const i = app().alarms.indexOf(a); app().alarms.splice(i, 1); persistAlarms(); renderAlarms(); toast('Deleted alarm', 'warning', { label: 'Undo', onClick: () => { app().alarms.splice(Math.min(i, app().alarms.length), 0, a); persistAlarms(); renderAlarms(); } }); }
    });
    $('#zjc-a-list').addEventListener('change', (e) => { const b = e.target.closest('[data-aact="toggle"]'); const row = e.target.closest('.zjc-alarm'); if (!b || !row) return; const a = alarms().find((x) => x.id === row.dataset.id); if (!a) return; a.active = b.checked; if (a.active) { a.snoozeUntil = 0; a.lastTriggered = ''; } persistAlarms(); renderAlarms(); });
    $('#zjc-vol').addEventListener('input', (e) => { const pr2 = prefs(); pr2.volume = e.target.value / 100; savePrefs(pr2); $('#zjc-vol-v').textContent = e.target.value + '%'; e.target.setAttribute('aria-valuetext', e.target.value + ' percent'); });
    $('#zjc-vol').addEventListener('change', () => { unlock(); playOnce(prefs().alarmSound, null, false); });
    $('#zjc-mute').addEventListener('change', (e) => { const pr2 = prefs(); pr2.muted = e.target.checked; savePrefs(pr2); });
    $('#zjc-def-alarm').addEventListener('change', (e) => { const pr2 = prefs(); pr2.alarmSound = e.target.value; savePrefs(pr2); });
    $('#zjc-test').addEventListener('click', () => { unlock(); const ok = playOnce(prefs().alarmSound, null, true); toast(ok ? 'Playing test sound' : 'Could not start audio. Tap the page once and try again.', ok ? 'info' : 'warning'); setTimeout(updateAudioBanner, 300); });
    $('#zjc-notif').addEventListener('click', async () => { if (!('Notification' in window)) { toast('Notifications are not supported in this browser.', 'warning'); return; } const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Notifications enabled' : 'Notifications not allowed', r === 'granted' ? 'success' : 'warning'); });
    renderAlarms(); updateAudioBanner(); icons();
  }

  /* ---- ringing overlay + alarm engine */
  function ringUI() {
    let o = $('#zjc-ring'); if (o) return o;
    o = document.createElement('div'); o.id = 'zjc-ring'; o.className = 'zjc-ring zj-glass'; o.setAttribute('role', 'alertdialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'zjc-ring-t'); o.hidden = true;
    o.innerHTML = '<div class="zjc-ring-icon"><i data-lucide="bell-ring"></i></div><h2 id="zjc-ring-t"></h2><p id="zjc-ring-s"></p><div class="zjc-ring-btns"><button type="button" class="btn btn-secondary" id="zjc-snooze">Snooze</button><button type="button" class="btn btn-primary" id="zjc-dismiss">Dismiss</button></div>';
    document.body.appendChild(o);
    $('#zjc-dismiss').addEventListener('click', dismiss); $('#zjc-snooze').addEventListener('click', snooze);
    o.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismiss(); }); return o;
  }
  function showRing(title, sub, canSnooze, sound) {
    const o = ringUI(); $('#zjc-ring-t').textContent = title; $('#zjc-ring-s').textContent = sub; $('#zjc-snooze').hidden = !canSnooze; o.hidden = false; icons();
    document.body.classList.add('zj-alarm-flash'); startLoop(sound); setTimeout(() => $('#zjc-dismiss').focus(), 50);
    if ('Notification' in window && Notification.permission === 'granted') { try { new Notification('ZJ OS · ' + title, { body: sub, tag: 'zj-clock' }); } catch (_) {} }
    updateAudioBanner();
  }
  function hideRing() { const o = $('#zjc-ring'); if (o) o.hidden = true; stopLoop(); document.body.classList.remove('zj-alarm-flash'); ringing = null; }
  function dismiss() { if (ringing && ringing.kind === 'alarm') { const a = ringing.alarm; a.snoozeUntil = 0; if (!alarmDays(a).length) a.active = false; persistAlarms(); renderAlarms(); } hideRing(); }
  function snooze() { if (ringing && ringing.kind === 'alarm') { const a = ringing.alarm; a.snoozeUntil = Date.now() + (a.snoozeMin || 10) * 60000; a.active = true; persistAlarms(); renderAlarms(); toast('Snoozed for ' + (a.snoozeMin || 10) + ' minutes', 'info'); } hideRing(); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function checkAlarms() {
    if (ringing) return; const now = new Date(), key = dayKey(now), cur = pad(now.getHours()) + ':' + pad(now.getMinutes());
    for (const a of alarms()) {
      if (!a.active) continue;
      const snoozeDue = a.snoozeUntil && a.snoozeUntil <= now.getTime();
      const timeDue = !a.snoozeUntil && a.time === cur && a.lastTriggered !== key + ' ' + cur && (!alarmDays(a).length || alarmDays(a).includes(now.getDay()));
      if (!snoozeDue && !timeDue) continue;
      a.lastTriggered = key + ' ' + cur; a.snoozeUntil = 0; persistAlarms(); ringing = { alarm: a, kind: 'alarm' };
      showRing(a.label || 'Alarm', fmtAlarmTime(a.time) + (alarmDays(a).length ? ' · ' + repeatText(a) : ''), true, SOUNDS[a.sound] ? a.sound : prefs().alarmSound); renderAlarms(); return;
    }
  }
  function reportMissed() {   // alarms whose time passed in the last 30 min while the app was closed
    const now = new Date(), key = dayKey(now), missed = [];
    alarms().forEach((a) => {
      if (!a.active || a.snoozeUntil) return; const [h, m] = String(a.time).split(':').map((x) => parseInt(x, 10) || 0); const t = new Date(now); t.setHours(h, m, 0, 0);
      const diff = now - t; if (diff <= 60000 || diff > 30 * 60000) return; if (alarmDays(a).length && !alarmDays(a).includes(now.getDay())) return;
      if (a.lastTriggered && a.lastTriggered.startsWith(key)) return; a.lastTriggered = key + ' ' + a.time; if (!alarmDays(a).length) a.active = false; missed.push((a.label || 'Alarm') + ' at ' + fmtAlarmTime(a.time));
    });
    if (missed.length) { persistAlarms(); renderAlarms(); toast('Missed while ZJ OS was closed: ' + missed.join(', '), 'warning'); }
  }

  /* ======================================================= Timer */
  let T = Object.assign({ durationMs: 300000, endAt: 0, remainingMs: 300000, running: false, repeat: false, sound: '' }, rd('zj_clockTimer', {}));
  let tInt = null;
  const saveT = () => wr('zj_clockTimer', T);
  const fmtHMS = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60); };
  function timerRemaining() { return T.running ? Math.max(0, T.endAt - Date.now()) : T.remainingMs; }
  function renderTimer() {
    const d = $('#zjc-t-display'); if (!d) return; const rem = timerRemaining(); d.textContent = fmtHMS(rem);
    const pct = T.durationMs ? Math.max(0, Math.min(100, (1 - rem / T.durationMs) * 100)) : 0; const bar = $('#zjc-t-bar'); if (bar) bar.style.width = pct + '%';
    const st = T.running ? 'running' : (rem < T.durationMs && rem > 0 ? 'paused' : 'idle'); const root = $('#zjc-t'); if (root) root.dataset.state = st;
    const go = $('#zjc-t-go'); if (go) go.textContent = st === 'running' ? 'Pause' : st === 'paused' ? 'Resume' : 'Start';
    ['h', 'm', 's'].forEach((k) => { const i = $('#zjc-t-' + k); if (i) i.disabled = st !== 'idle'; });
    document.querySelectorAll('#zjc-t [data-preset]').forEach((b) => { b.disabled = st !== 'idle'; });
  }
  function readInputs() { const g = (k) => Math.max(0, parseInt($('#zjc-t-' + k).value, 10) || 0); return (Math.min(99, g('h')) * 3600 + Math.min(59, g('m')) * 60 + Math.min(59, g('s'))) * 1000; }
  function setInputs(ms) { const s = Math.round(ms / 1000); $('#zjc-t-h').value = Math.floor(s / 3600); $('#zjc-t-m').value = Math.floor((s % 3600) / 60); $('#zjc-t-s').value = s % 60; }
  function timerTick() {
    if (!T.running) return; const rem = T.endAt - Date.now();
    if (rem <= 0) { timerDone(); return; } renderTimer();
  }
  function timerDone() {
    clearInterval(tInt); tInt = null; T.running = false; T.remainingMs = T.durationMs; T.endAt = 0; saveT(); renderTimer();
    const snd = T.sound && SOUNDS[T.sound] ? T.sound : prefs().timerSound;
    if (T.repeat) { toast('Timer finished. Restarting.', 'info'); playOnce(snd); startTimer(true); return; }
    ringing = { kind: 'timer' }; showRing('Timer finished', fmtHMS(T.durationMs) + ' elapsed', false, snd);
  }
  function startTimer(auto) {
    if (T.running) return;
    if (!auto && (T.remainingMs >= T.durationMs || T.remainingMs <= 0)) { const ms = readInputs(); if (ms <= 0) { const e = $('#zjc-t-err'); e.textContent = 'Set a duration greater than zero.'; e.hidden = false; return; } T.durationMs = ms; T.remainingMs = ms; }
    $('#zjc-t-err').hidden = true; T.running = true; T.endAt = Date.now() + T.remainingMs; saveT(); clearInterval(tInt); tInt = setInterval(timerTick, 200); renderTimer(); unlock();
  }
  function pauseTimer() { if (!T.running) return; T.remainingMs = Math.max(0, T.endAt - Date.now()); T.running = false; clearInterval(tInt); tInt = null; saveT(); renderTimer(); }
  function resetTimer() { clearInterval(tInt); tInt = null; T.running = false; T.remainingMs = T.durationMs; T.endAt = 0; saveT(); setInputs(T.durationMs); renderTimer(); }
  function buildTimerPanel() {
    const p = $('#clock-panel-timer'); if (!p) return; const pr = prefs();
    p.innerHTML = '<div id="zjc-t" class="zjc-timer" data-state="idle"><div class="zjc-big" id="zjc-t-display" role="timer" aria-live="off">00:05:00</div><div class="zjc-progress" aria-hidden="true"><span id="zjc-t-bar"></span></div>' +
      '<div class="zjc-hms"><div class="zj-field"><label for="zjc-t-h">Hours</label><input id="zjc-t-h" class="input" type="number" min="0" max="99" inputmode="numeric"></div><div class="zj-field"><label for="zjc-t-m">Minutes</label><input id="zjc-t-m" class="input" type="number" min="0" max="59" inputmode="numeric"></div><div class="zj-field"><label for="zjc-t-s">Seconds</label><input id="zjc-t-s" class="input" type="number" min="0" max="59" inputmode="numeric"></div></div>' +
      '<p id="zjc-t-err" class="zj-form-error" role="alert" hidden></p>' +
      '<div class="zjc-btns"><button type="button" class="btn btn-primary" id="zjc-t-go">Start</button><button type="button" class="btn btn-danger" id="zjc-t-reset">Reset</button></div>' +
      '<div class="zjc-presets">' + [[1, '1 min'], [5, '5 min'], [10, '10 min'], [15, '15 min'], [25, '25 min'], [30, '30 min'], [60, '1 hour']].map(([m, l]) => '<button type="button" class="btn btn-secondary btn-sm" data-preset="' + m + '">' + l + '</button>').join('') + '</div>' +
      '<div class="zjc-sound-row"><label class="zjc-check"><input type="checkbox" id="zjc-t-repeat"> Repeat when finished</label></div>' +
      '<div class="zj-field"><label for="zjc-t-sound">Completion sound</label><div class="zjc-inline"><select id="zjc-t-sound" class="input">' + soundOptions(T.sound || pr.timerSound) + '</select><button type="button" class="btn btn-secondary" id="zjc-t-prev">Preview</button></div></div></div>';
    setInputs(T.running ? T.durationMs : T.remainingMs); $('#zjc-t-repeat').checked = !!T.repeat;
    $('#zjc-t-go').addEventListener('click', () => { if (T.running) pauseTimer(); else startTimer(); });
    $('#zjc-t-reset').addEventListener('click', resetTimer);
    $('#zjc-t').addEventListener('click', (e) => { const b = e.target.closest('[data-preset]'); if (!b || b.disabled) return; const ms = +b.dataset.preset * 60000; T.durationMs = ms; T.remainingMs = ms; setInputs(ms); saveT(); renderTimer(); });
    ['h', 'm', 's'].forEach((k) => $('#zjc-t-' + k).addEventListener('input', () => { if (T.running) return; const ms = readInputs(); T.durationMs = ms || T.durationMs; T.remainingMs = ms; saveT(); $('#zjc-t-display').textContent = fmtHMS(ms); $('#zjc-t-err').hidden = true; }));
    $('#zjc-t-repeat').addEventListener('change', (e) => { T.repeat = e.target.checked; saveT(); });
    $('#zjc-t-sound').addEventListener('change', (e) => { T.sound = e.target.value; saveT(); const pr2 = prefs(); pr2.timerSound = e.target.value; savePrefs(pr2); });
    $('#zjc-t-prev').addEventListener('click', () => { unlock(); playOnce($('#zjc-t-sound').value, null, true); });
    // restore a running timer after reload
    if (T.running) { if (T.endAt <= Date.now()) { timerDone(); } else { clearInterval(tInt); tInt = setInterval(timerTick, 200); } }
    renderTimer();
  }

  /* ======================================================= Stopwatch */
  let SW = Object.assign({ elapsed: 0, laps: [], running: false, startedAt: 0 }, rd('zj_clockStopwatch', {}));
  if (!Array.isArray(SW.laps)) SW.laps = []; let swRaf = null;
  const saveSW = () => wr('zj_clockStopwatch', SW);
  const swNow = () => SW.running ? Date.now() - SW.startedAt : SW.elapsed;
  const fmtSW = (ms) => { const t = Math.floor(ms / 10), cs = t % 100, s = Math.floor(t / 100); return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60) + '.' + pad(cs); };
  function renderSW() {
    const d = $('#zjc-sw-display'); if (d) d.textContent = fmtSW(swNow());
    const go = $('#zjc-sw-go'); if (go) go.textContent = SW.running ? 'Pause' : (SW.elapsed > 0 ? 'Resume' : 'Start');
    const lap = $('#zjc-sw-lap'); if (lap) lap.disabled = !SW.running;
  }
  function renderLaps() {
    const box = $('#zjc-sw-laps'); if (!box) return;
    if (!SW.laps.length) { box.innerHTML = '<div class="zjc-muted">No laps recorded.</div>'; return; }
    const diffs = SW.laps.map((v, i) => v - (i ? SW.laps[i - 1] : 0)); const fast = Math.min.apply(null, diffs), slow = Math.max.apply(null, diffs);
    let h = '<table class="zjc-laps"><thead><tr><th>Lap</th><th>Lap time</th><th>Split</th></tr></thead><tbody>';
    for (let i = diffs.length - 1; i >= 0; i--) h += '<tr><td>' + (i + 1) + (diffs.length > 1 && diffs[i] === fast ? ' <b class="zjc-tag ok">fastest</b>' : '') + (diffs.length > 1 && diffs[i] === slow && fast !== slow ? ' <b class="zjc-tag warn">slowest</b>' : '') + '</td><td>' + fmtSW(diffs[i]) + '</td><td>' + fmtSW(SW.laps[i]) + '</td></tr>';
    box.innerHTML = h + '</tbody></table>';
  }
  function swLoop() { renderSW(); if (SW.running) swRaf = requestAnimationFrame(swLoop); }
  function buildSWPanel() {
    const p = $('#clock-panel-stopwatch'); if (!p) return;
    p.innerHTML = '<div class="zjc-big zjc-sw" id="zjc-sw-display" role="timer" aria-live="off">00:00:00.00</div><div class="zjc-btns"><button type="button" class="btn btn-primary" id="zjc-sw-go">Start</button><button type="button" class="btn btn-secondary" id="zjc-sw-lap" disabled>Lap</button><button type="button" class="btn btn-danger" id="zjc-sw-reset">Reset</button></div>' +
      '<div class="zjc-sound-row"><label class="zjc-check"><input type="checkbox" id="zjc-sw-tick"> Play a tick on lap</label><button type="button" class="btn btn-secondary btn-sm" id="zjc-sw-clear">Clear laps</button></div><div id="zjc-sw-laps"></div>';
    $('#zjc-sw-tick').checked = !!prefs().lapTick;
    $('#zjc-sw-go').addEventListener('click', () => {
      if (SW.running) { SW.elapsed = Date.now() - SW.startedAt; SW.running = false; cancelAnimationFrame(swRaf); }
      else { SW.startedAt = Date.now() - SW.elapsed; SW.running = true; swLoop(); }
      saveSW(); renderSW();
    });
    $('#zjc-sw-lap').addEventListener('click', () => { if (!SW.running) return; SW.laps.push(swNow()); saveSW(); renderLaps(); if (prefs().lapTick) { unlock(); playOnce('digital', .35); } });
    $('#zjc-sw-reset').addEventListener('click', () => { cancelAnimationFrame(swRaf); SW = { elapsed: 0, laps: [], running: false, startedAt: 0 }; saveSW(); renderSW(); renderLaps(); });
    $('#zjc-sw-clear').addEventListener('click', () => { SW.laps = []; saveSW(); renderLaps(); });
    $('#zjc-sw-tick').addEventListener('change', (e) => { const pr2 = prefs(); pr2.lapTick = e.target.checked; savePrefs(pr2); });
    if (SW.running) swLoop(); renderSW(); renderLaps();
  }
  window.addEventListener('pagehide', () => { if (SW.running) saveSW(); });

  /* ======================================================= Tabs + init */
  function switchTab(name) {
    document.querySelectorAll('#tab-clock .clock-panel').forEach((x) => x.classList.toggle('hidden', x.id !== 'clock-panel-' + name));
    document.querySelectorAll('#clock-tabs [data-ctab]').forEach((b) => { const on = b.dataset.ctab === name; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    if (name === 'world') tickWorld(); if (name === 'alarms') { renderAlarms(); updateAudioBanner(); }
  }
  function init() {
    const tabs = $('#clock-tabs'); if (!tabs) return;
    loadWorld(); buildWorldPanel(); buildAlarmPanel(); buildTimerPanel(); buildSWPanel();
    tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-ctab]'); if (b) switchTab(b.dataset.ctab); });
    tabs.addEventListener('keydown', (e) => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const bs = Array.from(tabs.querySelectorAll('[data-ctab]')); const i = bs.indexOf(document.activeElement); if (i < 0) return; const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; n.focus(); switchTab(n.dataset.ctab); });
    window.zjSwitchClockTab = switchTab;
    setInterval(() => { tickWorld(); checkAlarms(); if (!$('#zjc-a-list')?.closest('.hidden')) { const n = $('#zjc-a-next'); if (n && app()) renderAlarms(); } }, 1000);
    window.addEventListener('storage', (e) => { if (e.key === 'zj_worldClocks') { loadWorld(); renderWorld(); } });
    window.addEventListener('zj:sync', (e) => { if (e.detail && e.detail.key === 'alarms') renderAlarms(); });
    window.addEventListener('zj:clock-format', () => { renderWorld(); renderAlarms(); });
    let tries = 0; const t = setInterval(() => { if (app() || ++tries > 40) { clearInterval(t); renderAlarms(); reportMissed(); } }, 150);
    window.ZJClock = { playOnce, startLoop, stopLoop, SOUNDS };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ===== js/zj-tasks.js ===== */
/* ZJ OS — Tasks views: search, sort, Board (kanban) and Calendar shortcut.
 * All views read the same App.todos array. Board status uses an optional `status` field
 * ("doing"); "done" is always todo.done so list, board, stats and calendar stay consistent.
 * Sort/view are UI preferences stored in zj_todoSort / zj_todoView; task data is never reordered.
 */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const app = () => window.__zj_app;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rd = (k, d) => { try { return localStorage.getItem(k) || d; } catch (_) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  let view = rd('zj_todoView', 'list') === 'board' ? 'board' : 'list';
  let query = '';
  const COLS = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];

  const statusOf = (t) => t.done ? 'done' : (t.status === 'doing' ? 'doing' : 'todo');
  const tagsOf = (t) => (Array.isArray(t.tags) ? t.tags : []);
  function visible(t) {
    const q = query.toLowerCase();
    return !q || String(t.text || '').toLowerCase().includes(q) || tagsOf(t).some((g) => String(g).toLowerCase().includes(q));
  }
  function dueLabel(t) {
    if (!t.due) return '';
    const d = new Date(t.due + 'T00:00:00'); const today = new Date(); today.setHours(0, 0, 0, 0);
    const over = !t.done && d < today;
    return '<span class="zjt-due' + (over ? ' over' : '') + '">' + (over ? 'Overdue · ' : '') + esc(isNaN(d) ? t.due : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) + '</span>';
  }

  function renderBoard() {
    const host = $('#todo-board'); const A = app();
    if (!host || !A || view !== 'board') return;
    const todos = (A.todos || []).filter(visible);
    host.innerHTML = COLS.map(([key, label], ci) => {
      const items = todos.filter((t) => statusOf(t) === key);
      return '<section class="zjt-col" data-col="' + key + '" aria-label="' + label + '"><h3>' + label + ' <span class="zjt-count">' + items.length + '</span></h3><div class="zjt-drop" data-col="' + key + '">' +
        (items.length ? items.map((t) => {
          const subs = Array.isArray(t.subtasks) ? t.subtasks : []; const sd = subs.filter((s) => s.done).length;
          return '<article class="zjt-card" draggable="true" data-id="' + esc(t.id) + '"><div class="zjt-title' + (t.done ? ' done' : '') + '">' + esc(t.text) + '</div><div class="zjt-meta"><span class="zjt-pri" data-p="' + esc(t.priority || 'medium') + '">' + esc(t.priority || 'medium') + '</span>' + dueLabel(t) +
            (subs.length ? '<span>' + sd + '/' + subs.length + ' subtasks</span>' : '') + (t.recurrence && t.recurrence !== 'none' ? '<span>repeats ' + esc(t.recurrence) + '</span>' : '') + '</div>' +
            (tagsOf(t).length ? '<div class="zjt-tags">' + tagsOf(t).map((g) => '<span>' + esc(g) + '</span>').join('') + '</div>' : '') +
            '<div class="zjt-actions">' + (ci > 0 ? '<button type="button" class="btn btn-secondary btn-sm" data-move="' + COLS[ci - 1][0] + '" aria-label="Move to ' + COLS[ci - 1][1] + '">&larr; ' + COLS[ci - 1][1] + '</button>' : '') +
            (ci < 2 ? '<button type="button" class="btn btn-secondary btn-sm" data-move="' + COLS[ci + 1][0] + '" aria-label="Move to ' + COLS[ci + 1][1] + '">' + COLS[ci + 1][1] + ' &rarr;</button>' : '') +
            '<button type="button" class="btn btn-secondary btn-sm" data-edit aria-label="Edit task">Edit</button></div></article>';
        }).join('') : '<div class="zjt-empty">Nothing here</div>') + '</div></section>';
    }).join('');
  }

  function moveTo(id, col) {
    const A = app(); const t = A && A.todos.find((x) => x.id === id); if (!t) return;
    const cur = statusOf(t); if (cur === col) return;
    if (col === 'done') { delete t.status; window.toggleTodo(id); return; }          // reuses completion + recurrence logic
    if (t.done) window.toggleTodo(id);                                                  // reopen
    if (col === 'doing') t.status = 'doing'; else delete t.status;
    window.save && window.save(); window.renderTodos && window.renderTodos();
  }

  function setView(v) {
    view = v === 'board' ? 'board' : 'list'; wr('zj_todoView', view);
    const list = $('#todo-list'), board = $('#todo-board'), tabs = $('#tab-todo .zj-filter-tabs');
    if (list) list.hidden = view === 'board'; if (board) board.hidden = view !== 'board'; if (tabs) tabs.hidden = view === 'board';
    document.querySelectorAll('.zjt-views [data-tview]').forEach((b) => { const on = b.dataset.tview === view; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    renderBoard();
  }

  function init() {
    const tb = $('.zjt-toolbar'); if (!tb) return;
    const sort = $('#todo-sort'); sort.value = rd('zj_todoSort', 'newest');
    sort.addEventListener('change', () => { wr('zj_todoSort', sort.value); window.renderTodos && window.renderTodos(); });
    $('#todo-search').addEventListener('input', (e) => { query = e.target.value.trim(); window.zjTodosSetSearch && window.zjTodosSetSearch(query); });
    tb.addEventListener('click', (e) => { const b = e.target.closest('[data-tview]'); if (!b) return; if (b.dataset.tview === 'calendar') { window.switchTab && window.switchTab('calendar'); return; } setView(b.dataset.tview); });
    const board = $('#todo-board');
    board.addEventListener('click', (e) => {
      const card = e.target.closest('.zjt-card'); if (!card) return;
      const mv = e.target.closest('[data-move]'); if (mv) { moveTo(card.dataset.id, mv.dataset.move); return; }
      if (e.target.closest('[data-edit]')) window.editTodo && window.editTodo(card.dataset.id);
    });
    board.addEventListener('dragstart', (e) => { const c = e.target.closest('.zjt-card'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging'); });
    board.addEventListener('dragend', (e) => { e.target.closest && e.target.closest('.zjt-card')?.classList.remove('dragging'); board.querySelectorAll('.over').forEach((x) => x.classList.remove('over')); });
    board.addEventListener('dragover', (e) => { const d = e.target.closest('.zjt-drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
    board.addEventListener('dragleave', (e) => { e.target.closest && e.target.closest('.zjt-drop')?.classList.remove('over'); });
    board.addEventListener('drop', (e) => { const d = e.target.closest('.zjt-drop'); if (!d) return; e.preventDefault(); d.classList.remove('over'); const id = e.dataTransfer.getData('text/plain'); if (id) moveTo(id, d.dataset.col); });
    window.addEventListener('zj:todos-rendered', () => { if (view === 'board') setTimeout(renderBoard, 0); });
    setView(view);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ===== js/zj-calendar.js ===== */
/* ZJ OS — Calendar events + Week / Day / Agenda views.
 * Events live in the EXISTING key zj_pro_calendar_events ({id,title,date,time,end,notes}); new optional
 * fields (repeat, reminder) are added only to events created/edited here, so old events load unchanged.
 * Month grid stays with the original renderer; this module decorates it with event dots + day details.
 */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const KEY = 'zj_pro_calendar_events';
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const dkey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const app = () => window.__zj_app;
  const toast = (m, t) => { try { window.toast && window.toast(m, t || 'info'); } catch (_) {} };
  const is24 = () => { const a = app(); return !a || a.clock24h !== false; };
  const fmtT = (t) => { if (!/^\d{2}:\d{2}$/.test(t || '')) return ''; if (is24()) return t; const h = +t.slice(0, 2); return ((h % 12) || 12) + ':' + t.slice(3) + ' ' + (h >= 12 ? 'PM' : 'AM'); };

  function load() { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch (_) { return []; } }
  function store(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) { toast('Could not save the event (storage is full or blocked).', 'error'); return false; }
    try { new BroadcastChannel('zj-os').postMessage({ type: 'sync', key: 'zj_pro_calendar_events' }); } catch (_) {}
    return true;
  }
  function occursOn(e, key) {
    if (!e || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) return false;
    if (e.date === key) return true;
    if (key < e.date) return false;
    const a = parse(e.date), b = parse(key);
    switch (e.repeat) {
      case 'daily': return true;
      case 'weekly': return a.getDay() === b.getDay();
      case 'monthly': return a.getDate() === b.getDate();
      case 'yearly': return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
      default: return false;
    }
  }
  const eventsOn = (key) => load().filter((e) => occursOn(e, key)).sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  const tasksOn = (key) => ((app() && app().todos) || []).filter((t) => t.due === key);

  /* ------------------------------------------------ event dialog */
  function ensureDialog() {
    let d = $('#zjcal-dialog'); if (d) return d;
    d = document.createElement('dialog'); d.id = 'zjcal-dialog'; d.setAttribute('aria-labelledby', 'zjcal-title');
    d.innerHTML = '<form id="zjcal-form" novalidate><div class="modal-header"><div class="modal-title" id="zjcal-title">New event</div><button type="button" class="btn-icon" data-close aria-label="Close"><i data-lucide="x"></i></button></div>' +
      '<div class="modal-body zjc-form"><div class="zj-field"><label for="zjcal-t">Title</label><input id="zjcal-t" class="input" maxlength="120" autocomplete="off"></div>' +
      '<div class="zj-field"><label for="zjcal-d">Date</label><input id="zjcal-d" class="input" type="date"></div>' +
      '<div class="zjcal-row"><div class="zj-field"><label for="zjcal-s">Start</label><input id="zjcal-s" class="input" type="time" value="09:00"></div><div class="zj-field"><label for="zjcal-e">End</label><input id="zjcal-e" class="input" type="time" value="10:00"></div></div>' +
      '<div class="zjcal-row"><div class="zj-field"><label for="zjcal-r">Repeat</label><select id="zjcal-r" class="input"><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></div>' +
      '<div class="zj-field"><label for="zjcal-m">Reminder</label><select id="zjcal-m" class="input"><option value="">None</option><option value="0">At start</option><option value="5">5 min before</option><option value="15">15 min before</option><option value="60">1 hour before</option></select></div></div>' +
      '<div class="zj-field"><label for="zjcal-n">Notes or location</label><textarea id="zjcal-n" class="input" rows="3"></textarea></div><p id="zjcal-err" class="zj-form-error" role="alert" hidden></p></div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-danger" id="zjcal-del" hidden>Delete</button><button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="submit" class="btn btn-primary">Save event</button></div></form>';
    document.body.appendChild(d);
    d.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) d.close(); });
    $('#zjcal-form').addEventListener('submit', (e) => { e.preventDefault(); save(d); });
    $('#zjcal-del').addEventListener('click', () => { const id = d.dataset.id; if (!id) return; const all = load(); const i = all.findIndex((x) => x.id === id); if (i < 0) return; const [rm] = all.splice(i, 1); store(all); d.close(); refresh(); toast('Deleted event', 'warning', { label: 'Undo', onClick: () => { const cur = load(); cur.splice(Math.min(i, cur.length), 0, rm); store(cur); refresh(); } }); });
    return d;
  }
  function openEvent(ev, dateKey) {
    const d = ensureDialog(); const err = $('#zjcal-err'); err.hidden = true;
    d.dataset.id = ev ? ev.id : '';
    $('#zjcal-title').textContent = ev ? 'Edit event' : 'New event';
    $('#zjcal-t').value = ev ? ev.title : ''; $('#zjcal-d').value = ev ? ev.date : (dateKey || dkey(new Date()));
    $('#zjcal-s').value = ev ? (ev.time || '09:00') : '09:00'; $('#zjcal-e').value = ev ? (ev.end || '10:00') : '10:00';
    $('#zjcal-r').value = ev && ev.repeat ? ev.repeat : 'none'; $('#zjcal-m').value = ev && ev.reminder != null ? String(ev.reminder) : '';
    $('#zjcal-n').value = ev ? (ev.notes || '') : ''; $('#zjcal-del').hidden = !ev;
    d.showModal(); $('#zjcal-t').focus();
  }
  function save(d) {
    const err = $('#zjcal-err'); const fail = (m, f) => { err.textContent = m; err.hidden = false; $(f).focus(); };
    const title = $('#zjcal-t').value.trim(), date = $('#zjcal-d').value, s = $('#zjcal-s').value, e = $('#zjcal-e').value;
    if (!title) return fail('Enter a title for the event.', '#zjcal-t');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Choose a date.', '#zjcal-d');
    if (!s || !e) return fail('Enter a start and end time.', '#zjcal-s');
    if (e <= s) return fail('End time must be later than the start time.', '#zjcal-e');
    const rem = $('#zjcal-m').value;
    const data = { title: title.slice(0, 120), date, time: s, end: e, notes: $('#zjcal-n').value.trim().slice(0, 1000), repeat: $('#zjcal-r').value, reminder: rem === '' ? null : +rem };
    const all = load();
    if (d.dataset.id) { const t = all.find((x) => x.id === d.dataset.id); if (t) { Object.assign(t, data); delete t.notified; } }
    else all.push(Object.assign({ id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'ev' + Date.now() }, data));
    if (!store(all)) return;
    d.close(); refresh(); toast(d.dataset.id ? 'Event updated' : 'Event saved', 'success');
  }

  /* ------------------------------------------------ month decoration */
  function decorateMonth() {
    const grid = $('#cal-grid'); if (!grid || view !== 'month') return;
    const evs = load();
    grid.querySelectorAll('.cal-cell').forEach((c) => {
      const key = (c.dataset.action || '').replace('cal-select:', ''); if (!/^\d{4}-/.test(key)) return;
      const n = evs.filter((e) => occursOn(e, key)).length;
      let dot = c.querySelector('.cal-dot-event');
      if (n && !dot) { dot = document.createElement('span'); dot.className = 'cal-dot cal-dot-event'; (c.querySelector('.cal-dots') || c).appendChild(dot); }
      if (dot) { if (!n) dot.remove(); else dot.title = n + ' event' + (n === 1 ? '' : 's'); }
      if (n) { const base = (c.getAttribute('aria-label') || '').replace(/, \d+ events?$/, ''); c.setAttribute('aria-label', base + ', ' + n + ' event' + (n === 1 ? '' : 's')); }
    });
  }
  function decorateDetail() {
    const det = $('#cal-detail'); if (!det || view !== 'month') return;
    const sel = $('#cal-grid .cal-cell.selected'); det.querySelectorAll('.zjcal-detail').forEach((x) => x.remove()); det.querySelectorAll('.zj-cal-add').forEach((x) => x.remove());
    if (!sel) return; const key = (sel.dataset.action || '').replace('cal-select:', ''); if (!/^\d{4}-/.test(key)) return;
    const wrap = document.createElement('div'); wrap.className = 'zjcal-detail';
    const ev = eventsOn(key);
    wrap.innerHTML = '<h4 class="zjcal-h">Events</h4>' + (ev.length ? ev.map(rowHtml).join('') : '<div class="zjcal-none">No events on this day.</div>') + notesOn(key).map(noteHtml).join('') +
      '<div class="zjcal-btns"><button type="button" class="btn btn-primary" data-newev="' + key + '">Add event</button><button type="button" class="btn btn-secondary zj-cal-add" data-date="' + key + '">Add task for this day</button></div>';
    det.appendChild(wrap);
  }
  const rowHtml = (e) => '<button type="button" class="zjcal-ev" data-ev="' + esc(e.id) + '"><span class="zjcal-time">' + esc(fmtT(e.time)) + (e.end ? '–' + esc(fmtT(e.end)) : '') + '</span><span class="zjcal-name">' + esc(e.title) + (e.repeat && e.repeat !== 'none' ? ' <small>(' + esc(e.repeat) + ')</small>' : '') + '</span></button>';
  const notesOn = (k) => ((window.__zj_app && Array.isArray(window.__zj_app.notes)) ? window.__zj_app.notes : []).filter((n) => n && n.date === k);
  const noteHtml = (n) => '<button type="button" class="zjcal-task zjcal-note" data-note-open="' + esc(n.id) + '"><span class="zjcal-time">Note</span><span class="zjcal-name">' + esc(n.title || 'Untitled') + '</span></button>';
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-note-open]'); if (!b) return; if (window.switchTab) window.switchTab('notes'); setTimeout(() => window.editNote && window.editNote(b.dataset.noteOpen), 150); });
  const taskHtml = (t) => '<button type="button" class="zjcal-task' + (t.done ? ' done' : '') + '" data-task="' + esc(t.id) + '"><span class="zjcal-time">Task</span><span class="zjcal-name">' + esc(t.text) + '</span></button>';

  /* ------------------------------------------------ week / day / agenda */
  let view = 'month'; let cursor = new Date();
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function dayBlock(key, withHeader) {
    const d = parse(key); const ev = eventsOn(key), tk = tasksOn(key); const today = key === dkey(new Date());
    return '<section class="zjcal-day' + (today ? ' today' : '') + '" aria-label="' + esc(d.toDateString()) + '">' + (withHeader ? '<h4 class="zjcal-h"><span>' + DOW[d.getDay()] + '</span> ' + d.getDate() + ' ' + d.toLocaleDateString(undefined, { month: 'short' }) + '</h4>' : '') +
      ((ev.length || tk.length || notesOn(key).length) ? ev.map(rowHtml).join('') + tk.map(taskHtml).join('') + notesOn(key).map(noteHtml).join('') : '<div class="zjcal-none">Nothing scheduled</div>') + '<button type="button" class="zjcal-addmini" data-newev="' + key + '" aria-label="Add event on ' + esc(d.toDateString()) + '">+ Add event</button></section>';
  }
  function title() {
    const o = { month: 'long', year: 'numeric' };
    if (view === 'day') return cursor.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'week') { const s = addDays(cursor, -cursor.getDay()), e = addDays(s, 6); return s.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' – ' + e.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
    if (view === 'agenda') return 'Next 30 days';
    return cursor.toLocaleDateString(undefined, o);
  }
  function renderViews() {
    const host = $('#zjcal-views'); if (!host) return;
    const month = view === 'month';
    ['#cal-grid', '#cal-detail', '.zj-cal-weekdays'].forEach((s) => { const el = $(s); if (el) el.hidden = !month; });
    host.hidden = month; document.querySelectorAll('.zjcal-vsw [data-cview]').forEach((b) => { const on = b.dataset.cview === view; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    const lbl = $('#cal-month-label'); if (!month && lbl) lbl.textContent = title();
    if (month) { decorateMonth(); decorateDetail(); return; }
    let h = '';
    if (view === 'day') h = dayBlock(dkey(cursor), false);
    else if (view === 'week') { const s = addDays(cursor, -cursor.getDay()); h = '<div class="zjcal-week">' + [0, 1, 2, 3, 4, 5, 6].map((i) => dayBlock(dkey(addDays(s, i)), true)).join('') + '</div>'; }
    else { const s = new Date(); s.setHours(0, 0, 0, 0); let any = false; for (let i = 0; i < 30; i++) { const k = dkey(addDays(s, i)); if (eventsOn(k).length || tasksOn(k).length) { any = true; h += dayBlock(k, true); } } if (!any) h = '<div class="zjcal-none" style="padding:24px 0;text-align:center">No upcoming events or task deadlines in the next 30 days.</div>'; }
    host.innerHTML = h;
  }
  function refresh() { renderViews(); }

  function setView(v) { view = v; if (v !== 'month') cursor = new Date(); renderViews(); if (v === 'month') { const l = $('#cal-month-label'); } }
  function nav(delta) { cursor = view === 'week' ? addDays(cursor, 7 * delta) : addDays(cursor, delta); renderViews(); }

  /* ------------------------------------------------ reminders (only while the app is open) */
  function checkReminders() {
    const now = new Date(), all = load(); let changed = false;
    all.forEach((e) => {
      if (e.reminder == null || !e.time) return;
      for (const off of [0, 1]) {   // today, plus tomorrow for events right after midnight
        const day = addDays(now, off), key = dkey(day); if (!occursOn(e, key)) continue;
        const [h, m] = e.time.split(':').map(Number); const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime();
        const fireAt = start - e.reminder * 60000; const tag = key + '@' + e.time;
        if (Date.now() >= fireAt && Date.now() < start + 60000 && e.notified !== tag) {
          e.notified = tag; changed = true;
          const msg = e.reminder === 0 ? 'starting now' : 'in ' + e.reminder + ' min';
          toast('Event ' + msg + ': ' + e.title, 'info');
          try { window.ZJClock && window.ZJClock.playOnce('chime'); } catch (_) {}
          if ('Notification' in window && Notification.permission === 'granted') { try { new Notification('ZJ OS · ' + e.title, { body: 'Starts ' + fmtT(e.time), tag: e.id }); } catch (_) {} }
        }
      }
    });
    if (changed) store(all);
  }

  function init() {
    const card = $('.zj-cal-card'); if (!card || $('#zjcal-views')) return;
    // view switcher + add button
    const head = $('.zj-cal-head');
    const sw = document.createElement('div'); sw.className = 'zj-segmented zjcal-vsw'; sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', 'Calendar view');
    sw.innerHTML = ['month', 'week', 'day', 'agenda'].map((v) => '<button type="button" data-cview="' + v + '" aria-pressed="' + (v === 'month') + '"' + (v === 'month' ? ' class="active"' : '') + '>' + v[0].toUpperCase() + v.slice(1) + '</button>').join('');
    head.insertAdjacentElement('afterend', sw);
    const host = document.createElement('div'); host.id = 'zjcal-views'; host.hidden = true; host.setAttribute('aria-live', 'polite'); $('#cal-grid').insertAdjacentElement('beforebegin', host);
    sw.addEventListener('click', (e) => { const b = e.target.closest('[data-cview]'); if (b) setView(b.dataset.cview); });
    // intercept month navigation controls for non-month views (capture phase, before the legacy handler)
    document.addEventListener('click', (e) => {
      if (view === 'month') return; const el = e.target.closest('[data-action]'); if (!el) return; const a = el.dataset.action;
      if (a === 'cal-prev-month') { e.stopImmediatePropagation(); e.preventDefault(); nav(-1); }
      else if (a === 'cal-next-month') { e.stopImmediatePropagation(); e.preventDefault(); nav(1); }
      else if (a === 'cal-today') { e.stopImmediatePropagation(); e.preventDefault(); cursor = new Date(); renderViews(); }
    }, true);
    card.addEventListener('click', (e) => {
      const n = e.target.closest('[data-newev]'); if (n) { openEvent(null, n.dataset.newev); return; }
      const ev = e.target.closest('[data-ev]'); if (ev) { const x = load().find((q) => q.id === ev.dataset.ev); if (x) openEvent(x); return; }
      const t = e.target.closest('[data-task]'); if (t && window.editTodo) window.editTodo(t.dataset.task);
    });
    // decorate whenever the legacy renderer redraws the month grid / detail
    const mo = new MutationObserver(() => { if (view === 'month') { mo.disconnect(); try { decorateMonth(); decorateDetail(); } finally { start(); } } });
    const start = () => { const g = $('#cal-grid'), d = $('#cal-detail'); g && mo.observe(g, { childList: true }); d && mo.observe(d, { childList: true }); };
    start(); decorateMonth(); decorateDetail();
    window.addEventListener('storage', (e) => { if (e.key === KEY) refresh(); });
    window.addEventListener('zj:tab-change', (e) => { if (e.detail && e.detail.tab === 'calendar') setTimeout(refresh, 0); });
    window.addEventListener('zj:sync', () => { if (view !== 'month') refresh(); });
    setInterval(checkReminders, 30000); setTimeout(checkReminders, 3000);
    window.ZJCalendar = { openEvent, eventsOn };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ===== js/zj-backgrounds.js ===== */
/* ZJ OS 2.0 — real per-application background compositor.
 * Backgrounds are applied to app surfaces automatically; there are no
 * text-only background entries or settings controls.
 */
(function () {
  'use strict';
  const APP_MAP = Object.freeze({
    dashboard: 'dashboard', todo: 'tasks', calendar: 'calendar', notes: 'notes',
    chatbot: 'assistant', notion: 'workspace', habits: 'focus', pomodoro: 'focus',
    calculator: 'calculator', weather: 'weather', clock: 'clock', bookmarks: 'bookmarks',
    gallery: 'gallery', converter: 'calculator', password: 'settings', colorpicker: 'settings'
  });
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const getMode = () => root.getAttribute('data-mode') === 'light' || root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const getDevice = () => matchMedia('(max-width: 767px)').matches ? 'mobile' : matchMedia('(max-width: 1023px)').matches ? 'tablet' : 'desktop';
  const pathFor = (app) => window.ZJ_IMAGE(`${app}-${getMode()}-${getDevice()}`);
  let activeApp = 'dashboard';

  function resolveApp(tab) {
    const raw = (tab || '').replace(/^tab-/, '') || document.querySelector('.tab-content.active')?.id?.replace(/^tab-/, '') || 'dashboard';
    return APP_MAP[raw] || 'dashboard';
  }

  function apply(tab) {
    const active = document.querySelector('.tab-content.active');
    if (!active) return;
    const app = resolveApp(tab || active.id);
    activeApp = app;
    const url = pathFor(app);
    active.dataset.zjBackground = app;
    active.style.setProperty('--zj-app-background', `url("${url}")`);
    active.style.setProperty('--zj-background-image', `url("${url}")`);
    active.style.setProperty('--zj-background-mode', getMode());
    active.style.setProperty('--zj-background-device', getDevice());
    const imageCheck = new Image();
    imageCheck.onload = () => active.classList.add('zj-background-ready');
    imageCheck.onerror = () => { active.classList.remove('zj-background-ready'); console.warn('[ZJ OS] Background asset failed to load:', url); };
    imageCheck.src = url;

    // Preload the matching art for the next theme/device transition.
    const opposite = window.ZJ_IMAGE(`${app}-${getMode() === 'dark' ? 'light' : 'dark'}-${getDevice()}`);
    const preload = new Image(); preload.src = opposite;
  }

  function applyAllInitial() {
    document.querySelectorAll('.tab-content').forEach((el) => {
      const app = resolveApp(el.id);
      el.dataset.zjBackgroundApp = app;
    });
    apply();
  }

  function init() {
    applyAllInitial();
    window.addEventListener('zj:tab-change', (event) => apply(event.detail?.tab));
    window.addEventListener('resize', () => apply());
    window.addEventListener('orientationchange', () => apply());
    new MutationObserver(() => apply()).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });
    // Also handle app switches made by restored state or other navigation code.
    new MutationObserver(() => {
      const active = document.querySelector('.tab-content.active');
      if (active && active.dataset.zjBackground !== resolveApp(active.id)) apply(active.id);
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.ZJBackgrounds = Object.freeze({ apply, getActive: () => activeApp });
})();
