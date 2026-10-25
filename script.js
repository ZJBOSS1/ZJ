document.addEventListener('DOMContentLoaded', () => {
  // Initialize Icons
  lucide.createIcons();

  // =========================================
  // CORE UI & THEME
  // =========================================
  const html = document.documentElement;
  const themeIcon = document.querySelector('#themeToggle i');
  
  // Set initial theme based on localStorage or system preference
  const savedTheme = localStorage.getItem('zj_theme') || 'dark';
  html.setAttribute('data-theme', savedTheme);
  themeIcon.setAttribute('data-lucide', savedTheme === 'dark' ? 'moon' : 'sun');
  lucide.createIcons();

  // Event Delegation for Actions
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const target = btn.dataset.target;

    if (action === 'toggle-sidebar') {
      document.getElementById('sidebar').classList.toggle('hidden');
      document.getElementById('sidebarBackdrop').classList.toggle('active');
    } else if (action === 'scroll') {
      document.getElementById(target).scrollIntoView({ behavior: 'smooth' });
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.add('hidden');
        document.getElementById('sidebarBackdrop').classList.remove('active');
      }
    } else if (action === 'open-modal') {
      document.getElementById(target).showModal();
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.add('hidden');
        document.getElementById('sidebarBackdrop').classList.remove('active');
      }
    } else if (action === 'close-modal') {
      btn.closest('dialog').close();
    } else if (action === 'open-chat') {
      document.getElementById('chatOverlay').classList.add('active');
      document.getElementById('chatInput').focus();
    }
  });

  // Theme Toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('zj_theme', next);
    themeIcon.setAttribute('data-lucide', next === 'dark' ? 'moon' : 'sun');
    lucide.createIcons();
  });

  // Live Clock
  const updateClock = () => {
    document.getElementById('liveClock').textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
  };
  setInterval(updateClock, 1000);
  updateClock();

  // Toast System
  window.showToast = (msg) => {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // =========================================
  // CALCULATOR (Basic)
  // =========================================
  let calcCurrent = '0';
  let calcHistoryArr = JSON.parse(localStorage.getItem('zj_calcHistory')) || [];

  const renderCalc = () => {
    document.getElementById('calcDisplay').textContent = calcCurrent;
    document.getElementById('calcHistory').innerHTML = calcHistoryArr.map(h => `<div>${h}</div>`).join('');
  };

  document.querySelectorAll('[data-calc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.calc;
      if (key === 'AC') calcCurrent = '0';
      else if (key === 'DEL') calcCurrent = calcCurrent.length > 1 ? calcCurrent.slice(0, -1) : '0';
      else if (key === '=') {
        try {
          // Safe evaluation using Function constructor
          const result = Function('"use strict";return (' + calcCurrent + ')')();
          calcHistoryArr.push(`${calcCurrent} = ${result}`);
          if (calcHistoryArr.length > 5) calcHistoryArr.shift();
          localStorage.setItem('zj_calcHistory', JSON.stringify(calcHistoryArr));
          calcCurrent = String(result);
        } catch { calcCurrent = 'Error'; }
      } else {
        if (calcCurrent === '0' || calcCurrent === 'Error') calcCurrent = key;
        else calcCurrent += key;
      }
      renderCalc();
    });
  });
  renderCalc();

  // =========================================
  // SCIENTIFIC CALCULATOR
  // =========================================
  let sciCurrent = '0';
  const sciDisplay = document.getElementById('sciDisplay');

  document.querySelectorAll('[data-sci]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sci;
      if (key === 'AC') sciCurrent = '0';
      else if (key === 'DEL') sciCurrent = sciCurrent.length > 1 ? sciCurrent.slice(0, -1) : '0';
      else if (key === '=') {
        try {
          let evalString = sciCurrent
            .replace(/sin\(/g, 'Math.sin(')
            .replace(/cos\(/g, 'Math.cos(')
            .replace(/tan\(/g, 'Math.tan(')
            .replace(/log\(/g, 'Math.log10(')
            .replace(/ln\(/g, 'Math.log(')
            .replace(/√\(/g, 'Math.sqrt(')
            .replace(/π/g, 'Math.PI')
            .replace(/e/g, 'Math.E')
            .replace(/\^/g, '**');
          sciCurrent = String(Function('"use strict";return (' + evalString + ')')());
        } catch { sciCurrent = 'Error'; }
      } else {
        if (sciCurrent === '0' || sciCurrent === 'Error') sciCurrent = key;
        else sciCurrent += key;
      }
      sciDisplay.textContent = sciCurrent;
    });
  });

  // =========================================
  // WEATHER (Open-Meteo API)
  // =========================================
  const weatherCodeMap = {
    0: { desc: 'Clear Sky', icon: 'sun' }, 1: { desc: 'Mainly Clear', icon: 'sun' },
    2: { desc: 'Partly Cloudy', icon: 'cloud-sun' }, 3: { desc: 'Overcast', icon: 'cloud' },
    45: { desc: 'Fog', icon: 'cloud-fog' }, 48: { desc: 'Rime Fog', icon: 'cloud-fog' },
    51: { desc: 'Light Drizzle', icon: 'cloud-drizzle' }, 53: { desc: 'Drizzle', icon: 'cloud-drizzle' }, 55: { desc: 'Heavy Drizzle', icon: 'cloud-drizzle' },
    61: { desc: 'Light Rain', icon: 'cloud-rain' }, 63: { desc: 'Rain', icon: 'cloud-rain' }, 65: { desc: 'Heavy Rain', icon: 'cloud-rain' },
    71: { desc: 'Light Snow', icon: 'cloud-snow' }, 73: { desc: 'Snow', icon: 'cloud-snow' }, 75: { desc: 'Heavy Snow', icon: 'cloud-snow' },
    95: { desc: 'Thunderstorm', icon: 'cloud-lightning' }
  };

  window.getWeather = async (city) => {
    if (!city) return;
    document.getElementById('wDesc').textContent = 'Loading...';
    document.getElementById('wLoc').textContent = 'DETECTING...';
    
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
      const geoData = await geoRes.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        showToast('City not found');
        document.getElementById('wDesc').textContent = 'Not Found';
        return;
      }
      const { latitude, longitude, name, country_code } = geoData.results[0];
      
      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
      const wData = await wRes.json();
      const current = wData.current_weather;
      const daily = wData.daily;

      // Update Current UI
      document.getElementById('wTemp').textContent = Math.round(current.temperature);
      document.getElementById('wWind').textContent = `${current.windspeed} km/h`;
      document.getElementById('wLoc').textContent = `${name}, ${country_code}`;
      
      const codeInfo = weatherCodeMap[current.weathercode] || { desc: 'Unknown', icon: 'cloud' };
      document.getElementById('wDesc').textContent = codeInfo.desc;
      
      // Update Icon
      const iconContainer = document.getElementById('wIcon');
      iconContainer.innerHTML = `<i data-lucide="${codeInfo.icon}"></i>`;
      lucide.createIcons();

      // Mock stats for missing data
      document.getElementById('wRain').textContent = `${Math.floor(Math.random() * 30)}%`;
      document.getElementById('wHum').textContent = `${Math.floor(Math.random() * 40) + 40}%`;
      document.getElementById('wUv').textContent = (Math.random() * 8).toFixed(1);

      // Forecast
      const forecastContainer = document.getElementById('wForecast');
      forecastContainer.innerHTML = '';
      for (let i = 0; i < 7; i++) {
        const date = new Date(daily.time[i]);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        forecastContainer.innerHTML += `
          <div class="forecast-day">
            <div>${dayName}</div>
            <i data-lucide="sun" size="16"></i>
            <div style="font-size:10px;">${Math.round(daily.temperature_2m_max[i])}° ${Math.round(daily.temperature_2m_min[i])}°</div>
          </div>
        `;
      }
      lucide.createIcons();
      showToast('Weather updated');

    } catch (err) {
      console.error(err);
      showToast('Error fetching weather');
    }
  };

  document.getElementById('searchWeatherBtn').addEventListener('click', () => {
    getWeather(document.getElementById('cityInput').value);
  });
  document.getElementById('cityInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') getWeather(e.target.value);
  });
  document.getElementById('geoWeatherBtn').addEventListener('click', () => {
    showToast('Geolocation requested (Simulated)');
    getWeather('Hyderabad');
  });
  getWeather('Hyderabad'); // Initial Load

  // =========================================
  // NOTES (LocalStorage)
  // =========================================
  let notes = JSON.parse(localStorage.getItem('zj_notes')) || [];
  const renderNotes = () => {
    document.getElementById('notesList').innerHTML = notes.map((note, i) => `
      <div class="list-item">
        <span>${note}</span>
        <button class="btn-danger" onclick="deleteNote(${i})"><i data-lucide="trash-2" size="14"></i></button>
      </div>
    `).join('');
    lucide.createIcons();
  };

  window.deleteNote = (index) => {
    notes.splice(index, 1);
    localStorage.setItem('zj_notes', JSON.stringify(notes));
    renderNotes();
  };

  document.getElementById('addNoteBtn').addEventListener('click', () => {
    const input = document.getElementById('noteInput');
    if (!input.value.trim()) return;
    notes.push(input.value.trim());
    localStorage.setItem('zj_notes', JSON.stringify(notes));
    input.value = '';
    renderNotes();
    showToast('Note added');
  });
  renderNotes();

  // =========================================
  // TODO LIST (LocalStorage)
  // =========================================
  let todos = JSON.parse(localStorage.getItem('zj_todos')) || [];
  let currentFilter = 'all';

  const renderTodos = () => {
    let filtered = todos;
    if (currentFilter === 'active') filtered = todos.filter(t => !t.done);
    if (currentFilter === 'done') filtered = todos.filter(t => t.done);

    document.getElementById('todoList').innerHTML = filtered.map((t) => {
      const originalIndex = todos.indexOf(t);
      return `
      <div class="list-item" style="opacity: ${t.done ? 0.5 : 1}">
        <span style="text-decoration: ${t.done ? 'line-through' : 'none'}; cursor:pointer;" onclick="toggleTodo(${originalIndex})">
          ${t.text}
        </span>
        <button class="btn-danger" onclick="deleteTodo(${originalIndex})"><i data-lucide="trash-2" size="14"></i></button>
      </div>
    `}).join('');
    lucide.createIcons();
  };

  window.toggleTodo = (index) => {
    todos[index].done = !todos[index].done;
    localStorage.setItem('zj_todos', JSON.stringify(todos));
    renderTodos();
  };
  window.deleteTodo = (index) => {
    todos.splice(index, 1);
    localStorage.setItem('zj_todos', JSON.stringify(todos));
    renderTodos();
  };

  document.getElementById('addTodoBtn').addEventListener('click', () => {
    const input = document.getElementById('todoInput');
    if (!input.value.trim()) return;
    todos.push({ text: input.value.trim(), done: false });
    localStorage.setItem('zj_todos', JSON.stringify(todos));
    input.value = '';
    renderTodos();
  });

  document.querySelectorAll('#todoTabs .tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('#todoTabs .tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderTodos();
    });
  });
  renderTodos();

  // =========================================
  // POMODORO
  // =========================================
  let pomoTime = 25 * 60;
  let pomoInterval = null;
  let pomoRunning = false;
  const maxDash = 553;

  const updatePomoDisplay = () => {
    const m = Math.floor(pomoTime / 60);
    const s = pomoTime % 60;
    document.getElementById('pomoTime').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    
    const currentTotal = parseInt(document.getElementById('pomoStartBtn').dataset.total || 1500);
    document.getElementById('pomoRing').style.strokeDashoffset = maxDash - (pomoTime / currentTotal) * maxDash;
  };

  document.querySelectorAll('#pomoTabs .tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      if (pomoRunning) return;
      document.querySelectorAll('#pomoTabs .tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      pomoTime = parseInt(e.target.dataset.time) * 60;
      document.getElementById('pomoStartBtn').dataset.total = pomoTime;
      document.getElementById('pomoStartBtn').textContent = 'Start';
      updatePomoDisplay();
    });
  });

  document.getElementById('pomoStartBtn').addEventListener('click', (e) => {
    pomoRunning = !pomoRunning;
    if (pomoRunning) {
      e.target.textContent = 'Pause';
      pomoInterval = setInterval(() => {
        pomoTime--;
        updatePomoDisplay();
        if (pomoTime <= 0) {
          clearInterval(pomoInterval);
          pomoRunning = false;
          e.target.textContent = 'Start';
          showToast('Timer finished!');
          try { new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play(); } catch(err){}
        }
      }, 1000);
    } else {
      e.target.textContent = 'Start';
      clearInterval(pomoInterval);
    }
  });

  document.getElementById('pomoResetBtn').addEventListener('click', () => {
    clearInterval(pomoInterval);
    pomoRunning = false;
    document.getElementById('pomoStartBtn').textContent = 'Start';
    const activeTab = document.querySelector('#pomoTabs .tab.active');
    pomoTime = parseInt(activeTab.dataset.time) * 60;
    updatePomoDisplay();
  });
  document.getElementById('pomoStartBtn').dataset.total = 1500;
  updatePomoDisplay();

  // =========================================
  // UNIT CONVERTER
  // =========================================
  const convData = {
    length: { m: 1, km: 0.001, cm: 100, mm: 1000, inch: 39.37, ft: 3.28, mi: 0.000621 },
    mass: { kg: 1, g: 1000, mg: 1000000, lb: 2.204, oz: 35.27 },
    temperature: { C: 1, F: 1, K: 1 }, 
    data: { B: 1, KB: 0.001, MB: 0.000001, GB: 0.000000001 }
  };

  const updateConvUnits = () => {
    const cat = document.getElementById('convCategory').value;
    const units = Object.keys(convData[cat]);
    document.getElementById('convFrom').innerHTML = units.map(u => `<option value="${u}">${u.toUpperCase()}</option>`).join('');
    document.getElementById('convTo').innerHTML = units.map(u => `<option value="${u}">${u.toUpperCase()}</option>`).join('');
    document.getElementById('convTo').selectedIndex = 1;
    convert();
  };

  const convert = () => {
    const cat = document.getElementById('convCategory').value;
    const val = parseFloat(document.getElementById('convInput').value) || 0;
    const from = document.getElementById('convFrom').value;
    const to = document.getElementById('convTo').value;
    let result = 0;

    if (cat === 'temperature') {
      let c = from === 'C' ? val : (from === 'F' ? (val - 32) * 5/9 : val - 273.15);
      result = to === 'C' ? c : (to === 'F' ? (c * 9/5) + 32 : c + 273.15);
    } else {
      result = (val / convData[cat][from]) * convData[cat][to];
    }
    document.getElementById('convOutput').value = Number(result.toFixed(6));
  };

  document.getElementById('convCategory').addEventListener('change', updateConvUnits);
  document.getElementById('convInput').addEventListener('input', convert);
  document.getElementById('convFrom').addEventListener('change', convert);
  document.getElementById('convTo').addEventListener('change', convert);
  document.getElementById('convSwapBtn').addEventListener('click', () => {
    const from = document.getElementById('convFrom');
    const to = document.getElementById('convTo');
    const temp = from.value;
    from.value = to.value;
    to.value = temp;
    convert();
  });
  updateConvUnits();

  // =========================================
  // CHAT LOGIC (Connected to Flask Backend)
  // =========================================
  const CHAT_ENDPOINT = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') 
    ? 'http://localhost:5000/chat' 
    : '/api/chat';

  const chatOverlay = document.getElementById('chatOverlay');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');

  document.getElementById('closeChatBtn').addEventListener('click', () => chatOverlay.classList.remove('active'));
  document.getElementById('chatFab').addEventListener('click', () => {
    chatOverlay.classList.add('active');
    chatInput.focus();
  });

  document.getElementById('clearChatBtn').addEventListener('click', () => {
    chatMessages.innerHTML = `
      <div class="msg-system"><i data-lucide="check-circle"></i> ZJ Bot is ready.</div>
      <div class="msg-row bot"><div class="bubble">Hey there! 👋 I'm ZJ Bot. How can I help you today?</div></div>
    `;
    lucide.createIcons();
  });

  const sendMessage = async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    // Append User Message (Safely with textContent)
    const userRow = document.createElement('div');
    userRow.className = 'msg-row user';
    const userBubble = document.createElement('div');
    userBubble.className = 'bubble';
    userBubble.textContent = text;
    userRow.appendChild(userBubble);
    chatMessages.appendChild(userRow);

    chatInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Lock UI
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    // Typing Indicator
    const typing = document.createElement('div');
    typing.className = 'msg-row bot';
    typing.id = 'typingIndicator';
    typing.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    let botText = '';

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const raw = await response.text();
      let data = null;
      try { data = JSON.parse(raw); } catch (_) {}

      if (!response.ok) {
        botText = (data && data.reply) ? data.reply : `⚠️ Server Error: ${response.status}`;
      } else if (data && data.reply) {
        botText = data.reply;
      } else {
        botText = '⚠️ Unexpected response format.';
      }
    } catch (err) {
      botText = '⚠️ Cannot reach the backend. Verify the deployment.';
    } finally {
      if (typing.parentNode) typing.remove();

      const botRow = document.createElement('div');
      botRow.className = 'msg-row bot';
      const botBubble = document.createElement('div');
      botBubble.className = 'bubble';
      if (botText.startsWith('⚠️')) botBubble.style.color = 'var(--accent-red)';
      botBubble.textContent = botText;
      botRow.appendChild(botBubble);
      chatMessages.appendChild(botRow);

      chatInput.disabled = false;
      chatSendBtn.disabled = false;
      chatInput.focus();
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  };

  chatSendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      chatOverlay.classList.remove('active');
    }
  });
});
