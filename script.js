const canvas = document.getElementById('skyCanvas');
const ctx = canvas.getContext('2d');

// Controls Handles
const locationSelect = document.getElementById('locationSelect');
const viewSelect = document.getElementById('viewSelect');
const paletteSelect = document.getElementById('paletteSelect');
const toggleSun = document.getElementById('toggleSun');
const togglePlanets = document.getElementById('togglePlanets');
const speedSelect = document.getElementById('speedSelect');
const timeline = document.getElementById('timeline');
const timeDisplay = document.getElementById('timeDisplay');
const datePicker = document.getElementById('datePicker');
const timePicker = document.getElementById('timePicker');
const btnLive = document.getElementById('btnLive');
const btnPlay = document.getElementById('btnPlay');
const btnPause = document.getElementById('btnPause');
const btnRewind = document.getElementById('btnRewind');
const btnForward = document.getElementById('btnForward');

// Default Coordinates (Liverpool, UK)
let currentLat = 53.4084;
let currentLng = -2.9916;

// App State
let currentTime = new Date();
let isLive = true;
let isPlaying = true;
let timeMultiplier = 1;

const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Location Menu Handling
locationSelect.addEventListener('change', (e) => {
  const val = e.target.value;
  if (val === 'device') {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          currentLat = pos.coords.latitude;
          currentLng = pos.coords.longitude;
        },
        () => {
          alert("Unable to retrieve device location. Defaulting to Liverpool, UK.");
          locationSelect.value = "53.4084,-2.9916";
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  } else {
    const [lat, lng] = val.split(',').map(Number);
    currentLat = lat;
    currentLng = lng;
  }
});

paletteSelect.addEventListener('change', (e) => {
  document.body.className = e.target.value;
});

btnPlay.addEventListener('click', () => {
  isPlaying = true;
  btnPlay.classList.add('active');
  btnPause.classList.remove('active');
});

btnPause.addEventListener('click', () => {
  isPlaying = false;
  btnPause.classList.add('active');
  btnPlay.classList.remove('active');
});

btnLive.addEventListener('click', () => {
  isLive = true;
  isPlaying = true;
  currentTime = new Date();
  timeMultiplier = 1;
  speedSelect.value = "1";
  btnPlay.classList.add('active');
  btnPause.classList.remove('active');
});

speedSelect.addEventListener('change', (e) => {
  timeMultiplier = parseFloat(e.target.value);
});

timeline.addEventListener('input', (e) => {
  isLive = false;
  const totalSec = parseInt(e.target.value);
  currentTime.setHours(Math.floor(totalSec / 3600));
  currentTime.setMinutes(Math.floor((totalSec % 3600) / 60));
  currentTime.setSeconds(totalSec % 60);
  syncUI();
});

datePicker.addEventListener('change', () => {
  isLive = false;
  const [y, m, d] = datePicker.value.split('-').map(Number);
  currentTime.setFullYear(y, m - 1, d);
  syncUI();
});

timePicker.addEventListener('change', () => {
  isLive = false;
  const [h, min, s] = timePicker.value.split(':').map(Number);
  currentTime.setHours(h, min, s || 0);
  syncUI();
});

btnRewind.addEventListener('click', () => {
  isLive = false;
  currentTime = new Date(currentTime.getTime() - 3600000);
  syncUI();
});

btnForward.addEventListener('click', () => {
  isLive = false;
  currentTime = new Date(currentTime.getTime() + 3600000);
  syncUI();
});

function syncUI() {
  const dayName = daysOfWeek[currentTime.getDay()];
  const year = currentTime.getFullYear();
  const month = String(currentTime.getMonth() + 1).padStart(2, '0');
  const day = String(currentTime.getDate()).padStart(2, '0');
  const hours = String(currentTime.getHours()).padStart(2, '0');
  const mins = String(currentTime.getMinutes()).padStart(2, '0');
  const secs = String(currentTime.getSeconds()).padStart(2, '0');

  datePicker.value = `${year}-${month}-${day}`;
  timePicker.value = `${hours}:${mins}:${secs}`;
  
  const secondsInDay = (currentTime.getHours() * 3600) + (currentTime.getMinutes() * 60) + currentTime.getSeconds();
  timeline.value = secondsInDay;

  timeDisplay.innerText = `${dayName} ${year}-${month}-${day} ${hours}:${mins}:${secs}`;
  btnLive.style.opacity = isLive ? "1" : "0.4";
}

// Accurate Sun & Moon Positions via SunCalc Library
function getCelestialPositions(date) {
  const sunPos = SunCalc.getPosition(date, currentLat, currentLng);
  const sunAzimuth = (sunPos.azimuth * (180 / Math.PI) + 180) % 360;
  const sunAltitude = sunPos.altitude * (180 / Math.PI);

  const moonPos = SunCalc.getMoonPosition(date, currentLat, currentLng);
  const moonAzimuth = (moonPos.azimuth * (180 / Math.PI) + 180) % 360;
  const moonAltitude = moonPos.altitude * (180 / Math.PI);
  const moonIllum = SunCalc.getMoonIllumination(date);

  const sec = (date.getHours() * 3600) + (date.getMinutes() * 60) + date.getSeconds();
  const dayFraction = sec / 86400;

  const planetList = [
    { name: 'VENUS', offset: 0.1, maxAlt: 45, color: '#fef08a' },
    { name: 'MARS', offset: 0.3, maxAlt: 50, color: '#f87171' },
    { name: 'JUPITER', offset: 0.6, maxAlt: 58, color: '#fed7aa' },
    { name: 'SATURN', offset: 0.8, maxAlt: 40, color: '#fef08a' }
  ].map(p => {
    const frac = (dayFraction + p.offset) % 1.0;
    return {
      name: p.name,
      color: p.color,
      azimuth: (90 + (frac * 360)) % 360,
      altitude: Math.sin((frac - 0.25) * Math.PI * 2) * p.maxAlt
    };
  });

  return { sunAzimuth, sunAltitude, moonAzimuth, moonAltitude, moonIllum, planetList };
}

function drawScenery(w, horizonY) {
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--ground').trim();

  const skyScrapers = [
    { x: w * 0.38, bw: 18, bh: 65 },
    { x: w * 0.40, bw: 24, bh: 95 },
    { x: w * 0.43, bw: 16, bh: 50 },
    { x: w * 0.45, bw: 30, bh: 110 },
    { x: w * 0.49, bw: 22, bh: 75 },
    { x: w * 0.52, bw: 28, bh: 100 },
    { x: w * 0.56, bw: 15, bh: 60 }
  ];
  skyScrapers.forEach(s => ctx.fillRect(s.x, horizonY - s.bh, s.bw, s.bh));

  const houses = [
    { x: w * 0.15, w: 22, h: 18 },
    { x: w * 0.22, w: 26, h: 20 },
    { x: w * 0.70, w: 25, h: 20 },
    { x: w * 0.82, w: 22, h: 16 }
  ];
  houses.forEach(h => {
    ctx.fillRect(h.x, horizonY - h.h, h.w, h.h);
    ctx.beginPath();
    ctx.moveTo(h.x - 2, horizonY - h.h);
    ctx.lineTo(h.x + (h.w / 2), horizonY - h.h - 10);
    ctx.lineTo(h.x + h.w + 2, horizonY - h.h);
    ctx.fill();
  });

  const trees = [
    { x: w * 0.05, r: 16, h: 32, type: 'round' },
    { x: w * 0.09, r: 12, h: 28, type: 'pine' },
    { x: w * 0.28, r: 14, h: 30, type: 'round' },
    { x: w * 0.65, r: 12, h: 28, type: 'pine' },
    { x: w * 0.77, r: 15, h: 35, type: 'round' },
    { x: w * 0.92, r: 14, h: 30, type: 'pine' }
  ];
  trees.forEach(t => {
    ctx.fillRect(t.x - 2, horizonY - 10, 4, 10);
    if (t.type === 'round') {
      ctx.beginPath();
      ctx.arc(t.x, horizonY - t.h + t.r, t.r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(t.x - t.r, horizonY - 8);
      ctx.lineTo(t.x, horizonY - t.h);
      ctx.lineTo(t.x + t.r, horizonY - 8);
      ctx.fill();
    }
  });
}

function render() {
  const w = canvas.width;
  const h = canvas.height;
  const horizonY = h * 0.78;

  const pos = getCelestialPositions(currentTime);
  const viewMode = viewSelect.value;

  let skyTop, skyBottom;
  if (pos.sunAltitude > 0) {
    skyTop = '#0284c7';
    skyBottom = '#bae6fd';
  } else if (pos.sunAltitude > -12) {
    skyTop = '#312e81';
    skyBottom = '#f43f5e';
  } else {
    skyTop = getComputedStyle(document.body).getPropertyValue('--bg-top').trim();
    skyBottom = getComputedStyle(document.body).getPropertyValue('--bg-bottom').trim();
  }

  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(1, skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horizonY);

  function azimuthToX(az) {
    if (viewMode === 'all') {
      return (az / 360) * w;
    } else {
      const centerAz = parseFloat(viewMode);
      let diff = az - centerAz;
      if (diff < -180) diff += 360;
      if (diff > 180) diff -= 360;
      return (w / 2) + (diff / 60) * (w / 2);
    }
  }

  function altitudeToY(alt) {
    return horizonY - (alt / 90) * (horizonY * 0.9);
  }

  // Draw Sun
  if (toggleSun.checked) {
    const sunX = azimuthToX(pos.sunAzimuth);
    const sunY = altitudeToY(pos.sunAltitude);

    if (sunY <= horizonY + 20 && sunX >= -30 && sunX <= w + 30) {
      ctx.save();
      ctx.shadowBlur = 25;
      ctx.shadowColor = "#f59e0b";
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('SUN', sunX, sunY - 22);
      ctx.restore();
    }
  }

  // Draw Moon
  const moonX = azimuthToX(pos.moonAzimuth);
  const moonY = altitudeToY(pos.moonAltitude);

  if (moonY <= horizonY + 20 && moonX >= -30 && moonX <= w + 30) {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(224, 242, 254, 0.8)";
    
    const r = 14;
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.arc(moonX, moonY, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f8fafc";

    const p = pos.moonIllum.phase; 
    ctx.beginPath();
    if (p < 0.5) {
      ctx.arc(moonX, moonY, r, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(moonX, moonY, r * Math.abs(1 - 4 * p), r, 0, Math.PI / 2, -Math.PI / 2, p < 0.25);
    } else {
      ctx.arc(moonX, moonY, r, Math.PI / 2, -Math.PI / 2, false);
      ctx.ellipse(moonX, moonY, r * Math.abs(1 - 4 * (p - 0.5)), r, 0, -Math.PI / 2, Math.PI / 2, p < 0.75);
    }
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('MOON', moonX, moonY - 20);
    ctx.restore();
  }

  // Draw Planets
  if (togglePlanets.checked) {
    pos.planetList.forEach(p => {
      const px = azimuthToX(p.azimuth);
      const py = altitudeToY(p.altitude);

      if (py <= horizonY + 10 && px >= -20 && px <= w + 20) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 9px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, px, py - 10);
        ctx.restore();
      }
    });
  }

  // Draw Ground
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--ground').trim();
  ctx.fillRect(0, horizonY, w, h - horizonY);

  drawScenery(w, horizonY);

  const horizonColor = getComputedStyle(document.body).getPropertyValue('--horizon').trim();
  ctx.strokeStyle = horizonColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(w, horizonY);
  ctx.stroke();

  // Cardinal Markers
  const cardinalPoints = [
    { label: 'N', az: 0 },
    { label: 'E', az: 90 },
    { label: 'S', az: 180 },
    { label: 'W', az: 270 }
  ];

  cardinalPoints.forEach(pt => {
    const x = azimuthToX(pt.az);
    if (x >= -20 && x <= w + 20) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, horizonY - 6);
      ctx.lineTo(x, horizonY + 6);
      ctx.stroke();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x - 12, horizonY + 8, 24, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pt.label, x, horizonY + 17);
    }
  });
}

let lastStamp = performance.now();
function loop(now) {
  const deltaSec = (now - lastStamp) / 1000;
  lastStamp = now;

  if (isPlaying) {
    if (isLive) {
      currentTime = new Date();
    } else {
      currentTime = new Date(currentTime.getTime() + (deltaSec * 1000 * timeMultiplier));
    }
    syncUI();
  }

  render();
  requestAnimationFrame(loop);
}

syncUI();
requestAnimationFrame(loop);