// ── API Key management (stored in localStorage so user only enters it once) ──
const STORAGE_KEY = 'owm_api_key';
let API_KEY = localStorage.getItem(STORAGE_KEY) || '40274237292266bd8b7b53f81cce1650';

function showKeySetup(show) {
  document.getElementById('api-setup').style.display = show ? 'block' : 'none';
  document.getElementById('change-key').style.display = show ? 'none' : 'block';
}

document.getElementById('apikey-save').addEventListener('click', () => {
  const val = document.getElementById('apikey-input').value.trim();
  if (!val) return;
  API_KEY = val;
  localStorage.setItem(STORAGE_KEY, val);
  document.getElementById('key-status').style.display = 'block';
  setTimeout(() => {
    showKeySetup(false);
    autoLoad();
  }, 1200);
});

document.getElementById('change-key').addEventListener('click', () => {
  document.getElementById('apikey-input').value = API_KEY;
  showKeySetup(true);
});

// ── Clock ──
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) + ' · ' +
    now.toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'});
}
updateClock();
setInterval(updateClock, 1000);

// ── Stars ──
const skyEl = document.getElementById('sky-canvas');
for (let i = 0; i < 90; i++) {
  const s = document.createElement('div');
  s.className = 'star';
  const tx = (Math.random() - 0.5) * 150; // Random horizontal drift distance
  const ty = (Math.random() - 0.5) * 100; // Random vertical drift distance
  const ms = 60 + Math.random() * 80;    // Random slow speed (60-140s)
  s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;--d:${2+Math.random()*4}s;--delay:${Math.random()*5}s;--o:${0.4+Math.random()*0.6};--tx:${tx}px;--ty:${ty}px;--ms:${ms}s;width:${1+Math.random()*2}px;height:${1+Math.random()*2}px;`;
  skyEl.appendChild(s);
}

// ── Sky gradient by hour ──
function setSkyByHour(hour) {
  const t = {
    night:  'linear-gradient(160deg,#050d1a 0%,#0d1b3e 60%,#152b5a 100%)',
    dawn:   'linear-gradient(160deg,#1a1230 0%,#3d2244 40%,#c8604a 100%)',
    morning:'linear-gradient(160deg,#1e3a5f 0%,#2d6ca3 55%,#87c1e8 100%)',
    day:    'linear-gradient(160deg,#1a4a8a 0%,#3575bc 55%,#6aaee0 100%)',
    evening:'linear-gradient(160deg,#1a2e5a 0%,#7b3f2c 50%,#e8834a 100%)',
  };
  skyEl.style.background =
    hour < 5 || hour >= 22 ? t.night :
    hour < 8  ? t.dawn :
    hour < 12 ? t.morning :
    hour < 17 ? t.day : t.evening;
}
setSkyByHour(new Date().getHours());

function iconForCode(code) {
  if (code >= 200 && code < 300) return '⛈';
  if (code >= 300 && code < 400) return '🌦';
  if (code >= 500 && code < 600) return '🌧';
  if (code >= 600 && code < 700) return '❄️';
  if (code >= 700 && code < 800) return '🌫';
  if (code === 800) return '☀️';
  if (code === 801) return '🌤';
  if (code === 802) return '⛅';
  return '🌥';
}

// ── Fetch from 2.5 API (most reliable, works with all free keys) ──
async function fetchWeather(query) {
  const url = `https://api.openweathermap.org/data/2.5/weather?${query}&appid=${API_KEY}&units=metric`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      showKeySetup(true);
      throw new Error('Invalid API key — please check or wait 2 hours if newly registered.');
    }
    throw new Error(data.message || 'Could not load weather.');
  }
  return data;
}

// ── Also try OneCall 4.0 for richer data (optional) ──
async function tryOneCall(lat, lon) {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/4.0/onecall/current?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    if (!res.ok) return null;
    const d = await res.json();
    return d?.data || null;
  } catch { return null; }
}

function renderWeather(base, extra) {
  document.body.classList.remove('searching');
  document.getElementById('weather-section').style.display = 'flex';
  document.getElementById('city-name').textContent = base.name;
  document.getElementById('country').textContent   = base.sys?.country || '';

  const temp       = extra?.temp       ?? base.main.temp;
  const feelsLike  = extra?.feels_like ?? base.main.feels_like;
  const humidity   = extra?.humidity   ?? base.main.humidity;
  const windSpeed  = extra?.wind_speed ?? base.wind?.speed ?? 0;
  const pressure   = extra?.pressure   ?? base.main.pressure;
  const visibility = extra?.visibility ?? base.visibility ?? 0;
  const weather    = extra?.weather?.[0] ?? base.weather?.[0];
  const sunrise    = extra?.sunrise ?? base.sys?.sunrise;
  const sunset     = extra?.sunset  ?? base.sys?.sunset;

  document.getElementById('weather-icon').textContent = iconForCode(weather?.id ?? 800);
  document.getElementById('condition').textContent    = weather?.description ?? '';
  document.getElementById('temp').innerHTML    = `${Math.round(temp)}<sup>°C</sup>`;
  document.getElementById('feels').textContent = `Feels like ${Math.round(feelsLike)}°C`;
  document.getElementById('humidity').innerHTML   = `${humidity}<span class="stat-unit">%</span>`;
  document.getElementById('wind').innerHTML       = `${Math.round(windSpeed * 3.6)}<span class="stat-unit">km/h</span>`;
  document.getElementById('visibility').innerHTML = `${(visibility/1000).toFixed(1)}<span class="stat-unit">km</span>`;
  document.getElementById('pressure').innerHTML   = `${pressure}<span class="stat-unit">hPa</span>`;
  document.getElementById('sunrise').textContent  = sunrise ? new Date(sunrise*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—';
  document.getElementById('sunset').textContent   = sunset  ? new Date(sunset *1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—';

  const tzOffset = base.timezone ?? 0;
  const localHour = new Date(Date.now() + tzOffset*1000 - new Date().getTimezoneOffset()*60000).getUTCHours();
  setSkyByHour(localHour);
}

function showError(msg) {
  document.body.classList.remove('searching');
  const el = document.getElementById('error-msg');
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 7000);
}

async function search() {
  const city = document.getElementById('city-input').value.trim();
  if (!city) return;
  document.body.classList.add('searching');
  try {
    const base  = await fetchWeather(`q=${encodeURIComponent(city)}`);
    const extra = await tryOneCall(base.coord.lat, base.coord.lon);
    renderWeather(base, extra);
  } catch(e) { showError(e.message); }
}

document.getElementById('search-btn').addEventListener('click', search);
document.getElementById('city-input').addEventListener('keydown', e => e.key === 'Enter' && search());

document.getElementById('geo-btn').addEventListener('click', () => {
  if (!navigator.geolocation) return showError('Geolocation not supported.');
  navigator.geolocation.getCurrentPosition(async pos => {
    document.body.classList.add('searching');
    try {
      const { latitude: lat, longitude: lon } = pos.coords;
      const base  = await fetchWeather(`lat=${lat}&lon=${lon}`);
      const extra = await tryOneCall(lat, lon);
      renderWeather(base, extra);
      document.getElementById('city-input').value = base.name;
    } catch(e) { showError(e.message); }
  }, () => showError('Location permission denied.'));
});

// ── Bible Verse ──
async function fetchVerse() {
  try {
    const res  = await fetch('https://beta.ourmanna.com/api/v1/get?format=json&order=daily');
    const data = await res.json();
    const v    = data.verse?.details;
    if (v?.text) {
      document.getElementById('verse-text').textContent = v.text;
      document.getElementById('verse-ref').textContent  = '— ' + v.reference;
    } else throw new Error();
  } catch {
    document.getElementById('verse-text').textContent =
      'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.';
    document.getElementById('verse-ref').textContent = '— Jeremiah 29:11';
  }
}
fetchVerse();

// ── Shooting Stars ──
function createShootingStar() {
  const s = document.createElement('div');
  s.className = 'shooting-star';
  // Start from top-right area
  s.style.left = (50 + Math.random() * 50) + '%';
  s.style.top = (Math.random() * 40) + '%';
  s.style.animation = `shoot ${1 + Math.random() * 1.5}s ease-out forwards`;
  skyEl.appendChild(s);
  setTimeout(() => s.remove(), 2500);
}

// Attempt to spawn a shooting star every 5 seconds (with 30% chance)
setInterval(() => {
  if (Math.random() > 0.7) createShootingStar();
}, 5000);

// ── Auto-load ──
async function autoLoad() {
  // Try Calamba PH as default
  try {
    const base  = await fetchWeather('q=Calamba,PH');
    const extra = await tryOneCall(base.coord.lat, base.coord.lon);
    renderWeather(base, extra);
    document.getElementById('city-input').value = base.name;
    showKeySetup(false);
  } catch(e) {
    if (e.message.includes('Invalid API key')) showKeySetup(true);
  }
  // Override with GPS if available
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const base  = await fetchWeather(`lat=${lat}&lon=${lon}`);
        const extra = await tryOneCall(lat, lon);
        renderWeather(base, extra);
        document.getElementById('city-input').value = base.name;
      } catch {}
    }, () => {});
  }
}
autoLoad();