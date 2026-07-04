// --- Differential Drive Simulation Widget (thin client) ---
// All pose-integration / turn-mode / arc math lives in the backend (backend/main.py).
// This file only renders SVG from server-pushed "tick" data and wires the UI —
// it never computes robot motion itself.
(function () {
  const svgNS = 'http://www.w3.org/2000/svg';
  const AXLE_Y = 19;
  const MAX_TRAIL = 160;
  const STRIPE_PERIOD = 7;
  const STRIPE_SPEED = 25;
  const MAXSPD = 1.6; // mirrors backend MAXSPD, used only for the cosmetic stripe scroll speed

  const simModeLabels = {
    straight: { vi: 'Đi thẳng', en: 'Straight', tw: '直線前進' },
    pivot: { vi: 'Quay tại chỗ', en: 'Pivot in place', tw: '原地旋轉' },
    arc: { vi: 'Quay vòng cung', en: 'Arc turn', tw: '弧線轉彎' },
    wheelLeft: { vi: 'Quay quanh bánh trái', en: 'Pivoting on left wheel', tw: '繞左輪旋轉' },
    wheelRight: { vi: 'Quay quanh bánh phải', en: 'Pivoting on right wheel', tw: '繞右輪旋轉' }
  };

  let els = null;
  let socket = null;
  let reconnectTimer = null;
  let rafId = null;
  let trailPts = [];
  let lastT = null;
  let stripeLOffset = 0;
  let stripeROffset = 0;
  let mediaRecorder = null;
  let recordedChunks = [];

  window.renderSimulationWidget = function renderSimulationWidget() {
    return `
      <div class="sim-widget" id="sim-widget">
        <div class="sim-stage-wrap">
          <svg id="sim-stage" viewBox="0 0 680 420">
            <defs>
              <pattern id="sim-gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#888" stroke-width="0.8"/>
              </pattern>
              <clipPath id="sim-clipWheelL">
                <rect x="-30" y="8" width="10" height="22" rx="2"/>
              </clipPath>
              <clipPath id="sim-clipWheelR">
                <rect x="20" y="8" width="10" height="22" rx="2"/>
              </clipPath>
            </defs>
            <rect width="680" height="420" fill="url(#sim-gridPattern)" opacity="0.35"/>
            <g id="sim-trail"></g>
            <path id="sim-predictedPath" fill="none" stroke="#E07B20" stroke-width="2" stroke-dasharray="10 6" opacity="0.85"/>
            <g id="sim-robot">
              <rect id="sim-body" x="-22" y="-30" width="44" height="60" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
              <rect id="sim-wheelL" x="-30" y="8" width="10" height="22" rx="2" fill="#2563eb"/>
              <rect id="sim-wheelR" x="20" y="8" width="10" height="22" rx="2" fill="#2563eb"/>
              <g id="sim-stripesL" clip-path="url(#sim-clipWheelL)">
                <line x1="-30" y1="1" x2="-20" y2="1" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
                <line x1="-30" y1="8" x2="-20" y2="8" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
                <line x1="-30" y1="15" x2="-20" y2="15" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
                <line x1="-30" y1="22" x2="-20" y2="22" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
                <line x1="-30" y1="29" x2="-20" y2="29" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
                <line x1="-30" y1="36" x2="-20" y2="36" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
              </g>
              <g id="sim-stripesR" clip-path="url(#sim-clipWheelR)">
                <line x1="20" y1="1" x2="30" y2="1" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
                <line x1="20" y1="8" x2="30" y2="8" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
                <line x1="20" y1="15" x2="30" y2="15" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
                <line x1="20" y1="22" x2="30" y2="22" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
                <line x1="20" y1="29" x2="30" y2="29" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
                <line x1="20" y1="36" x2="30" y2="36" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
              </g>
              <circle id="sim-caster" cx="0" cy="-22" r="5" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
              <path id="sim-heading" d="M 0 -12 L -8 10 L 8 10 Z" fill="#2563eb"/>
            </g>
            <g id="sim-radiusLine"></g>
            <circle id="sim-centerDot" cx="0" cy="0" r="0" fill="#D85A30"/>
          </svg>
          <div id="sim-modeLabel" class="sim-badge sim-badge-mode">Đi thẳng</div>
          <div id="sim-radiusLabel" class="sim-badge sim-badge-radius">R = 0</div>
          <div id="sim-connStatus" class="sim-badge sim-badge-status">
            <span lang="vi">Đang kết nối...</span>
            <span lang="en">Connecting...</span>
            <span lang="tw">連線中...</span>
          </div>
        </div>

        <div class="sim-controls-panel">
          <div class="sim-controls">
            <div class="sim-slider-row">
              <label for="sim-vL" lang="vi">Bánh trái</label>
              <label for="sim-vL" lang="en">Left wheel</label>
              <label for="sim-vL" lang="tw">左輪</label>
              <input type="range" min="-100" max="100" step="1" value="60" id="sim-vL"/>
              <span id="sim-vL-out">60</span>
            </div>
            <div class="sim-slider-row">
              <label for="sim-vR" lang="vi">Bánh phải</label>
              <label for="sim-vR" lang="en">Right wheel</label>
              <label for="sim-vR" lang="tw">右輪</label>
              <input type="range" min="-100" max="100" step="1" value="60" id="sim-vR"/>
              <span id="sim-vR-out">60</span>
            </div>
          </div>

          <div class="sim-button-row">
            <button type="button" id="sim-presetStraight">
              <span lang="vi">Đi thẳng</span><span lang="en">Straight</span><span lang="tw">直線</span>
            </button>
            <button type="button" id="sim-presetPivot">
              <span lang="vi">Quay tại chỗ</span><span lang="en">Pivot</span><span lang="tw">原地旋轉</span>
            </button>
            <button type="button" id="sim-presetArc">
              <span lang="vi">Quay vòng cung</span><span lang="en">Arc turn</span><span lang="tw">弧線轉彎</span>
            </button>
            <button type="button" id="sim-presetWheel">
              <span lang="vi">Quay quanh bánh</span><span lang="en">Wheel pivot</span><span lang="tw">繞輪旋轉</span>
            </button>
            <button type="button" id="sim-resetPos">↻ <span lang="vi">Vị trí</span><span lang="en">Position</span><span lang="tw">位置</span></button>
          </div>

          <div class="sim-record-row">
            <button type="button" id="sim-recordBtn">⏺ <span lang="vi">Quay màn hình</span><span lang="en">Record screen</span><span lang="tw">螢幕錄影</span></button>
            <span id="sim-recIndicator" class="sim-rec-indicator" hidden>
              <span class="sim-rec-dot"></span>
              <span lang="vi">Đang quay…</span><span lang="en">Recording…</span><span lang="tw">錄影中…</span>
            </span>
          </div>

          <div class="sim-stats-grid">
            <div class="sim-stat-card">
              <p lang="vi">Vận tốc dài</p><p lang="en">Linear speed</p><p lang="tw">線速度</p>
              <p id="sim-statV">0</p>
            </div>
            <div class="sim-stat-card">
              <p lang="vi">Vận tốc góc</p><p lang="en">Angular speed</p><p lang="tw">角速度</p>
              <p id="sim-statW">0</p>
            </div>
            <div class="sim-stat-card">
              <p lang="vi">Bán kính quay</p><p lang="en">Turn radius</p><p lang="tw">轉彎半徑</p>
              <p id="sim-statR">∞</p>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  function getSimWsUrl() {
    const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
    if (isLocal) return 'ws://localhost:8000/ws';
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}/api/sim/ws`;
  }

  function cacheEls() {
    els = {
      root: document.getElementById('sim-widget'),
      robot: document.getElementById('sim-robot'),
      trail: document.getElementById('sim-trail'),
      predictedPath: document.getElementById('sim-predictedPath'),
      centerDot: document.getElementById('sim-centerDot'),
      radiusLine: document.getElementById('sim-radiusLine'),
      modeLabel: document.getElementById('sim-modeLabel'),
      radiusLabel: document.getElementById('sim-radiusLabel'),
      connStatus: document.getElementById('sim-connStatus'),
      vL: document.getElementById('sim-vL'),
      vR: document.getElementById('sim-vR'),
      vLOut: document.getElementById('sim-vL-out'),
      vROut: document.getElementById('sim-vR-out'),
      statV: document.getElementById('sim-statV'),
      statW: document.getElementById('sim-statW'),
      statR: document.getElementById('sim-statR'),
      stripesL: document.getElementById('sim-stripesL'),
      stripesR: document.getElementById('sim-stripesR'),
      recordBtn: document.getElementById('sim-recordBtn'),
      recIndicator: document.getElementById('sim-recIndicator')
    };
  }

  function sendInput() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'input',
        vl: parseFloat(els.vL.value),
        vr: parseFloat(els.vR.value)
      }));
    }
  }

  function syncOut() {
    els.vLOut.textContent = els.vL.value;
    els.vROut.textContent = els.vR.value;
  }

  function wireControls() {
    els.vL.addEventListener('input', () => { syncOut(); sendInput(); });
    els.vR.addEventListener('input', () => { syncOut(); sendInput(); });

    document.getElementById('sim-presetStraight').addEventListener('click', () => {
      els.vL.value = 60; els.vR.value = 60; syncOut(); sendInput();
    });
    document.getElementById('sim-presetPivot').addEventListener('click', () => {
      els.vL.value = -50; els.vR.value = 50; syncOut(); sendInput();
    });
    document.getElementById('sim-presetArc').addEventListener('click', () => {
      els.vL.value = 30; els.vR.value = 80; syncOut(); sendInput();
    });
    document.getElementById('sim-presetWheel').addEventListener('click', () => {
      els.vL.value = 0; els.vR.value = 60; syncOut(); sendInput();
    });
    document.getElementById('sim-resetPos').addEventListener('click', () => {
      trailPts = [];
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'reset' }));
      }
    });

    els.recordBtn.addEventListener('click', handleRecordClick);
  }

  function connectSocket() {
    setConnStatus('connecting');
    socket = new WebSocket(getSimWsUrl());

    socket.onopen = () => {
      setConnStatus('connected');
      sendInput();
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'tick') applyTick(data);
    };

    socket.onclose = () => {
      setConnStatus('disconnected');
      if (els && els.root) {
        reconnectTimer = setTimeout(connectSocket, 2000);
      }
    };

    socket.onerror = () => {
      if (socket) socket.close();
    };
  }

  function setConnStatus(state) {
    if (!els || !els.connStatus) return;
    if (state === 'connected') {
      els.connStatus.style.display = 'none';
    } else {
      els.connStatus.style.display = 'flex';
      const lang = document.body.getAttribute('data-lang') || 'vi';
      const msgs = {
        connecting: { vi: 'Đang kết nối...', en: 'Connecting...', tw: '連線中...' },
        disconnected: { vi: 'Mất kết nối, đang thử lại...', en: 'Disconnected, retrying...', tw: '連線中斷，重試中...' }
      };
      els.connStatus.textContent = msgs[state][lang];
    }
  }

  function applyTick(data) {
    const pose = data.pose;
    const deg = (pose.theta * 180 / Math.PI) + 90;
    els.robot.setAttribute('transform',
      `translate(${pose.x.toFixed(2)},${pose.y.toFixed(2)}) rotate(${deg.toFixed(2)}) translate(0,${-AXLE_Y})`);

    if (data.moving) {
      trailPts.push({ x: pose.x, y: pose.y });
      if (trailPts.length > MAX_TRAIL) trailPts.shift();
    }
    renderTrail();

    if (data.predicted) {
      const p = data.predicted;
      if (p.type === 'line') {
        els.predictedPath.setAttribute('d',
          `M ${p.x1.toFixed(1)} ${p.y1.toFixed(1)} L ${p.x2.toFixed(1)} ${p.y2.toFixed(1)}`);
      } else {
        els.predictedPath.setAttribute('d',
          `M ${p.x1.toFixed(1)} ${p.y1.toFixed(1)} A ${p.radius.toFixed(1)} ${p.radius.toFixed(1)} 0 ${p.largeArc} ${p.sweep} ${p.x2.toFixed(1)} ${p.y2.toFixed(1)}`);
      }
    } else {
      els.predictedPath.setAttribute('d', '');
    }

    els.statV.textContent = data.v.toFixed(2) + ' u/s';
    els.statW.textContent = (data.w * 180 / Math.PI).toFixed(1) + '°/s';
    els.statR.textContent = data.radius != null ? data.radius.toFixed(1) + ' u' : '∞';

    const lang = document.body.getAttribute('data-lang') || 'vi';

    if (data.mode === 'straight') {
      els.modeLabel.textContent = simModeLabels.straight[lang];
      els.radiusLabel.style.display = 'none';
      els.centerDot.setAttribute('r', '0');
      els.radiusLine.innerHTML = '';
      return;
    }

    let labelKey = data.mode;
    if (data.mode === 'wheel') {
      labelKey = data.fixedWheel === 'left' ? 'wheelLeft' : 'wheelRight';
    }
    els.modeLabel.textContent = simModeLabels[labelKey][lang];

    els.radiusLabel.style.display = 'block';
    els.radiusLabel.textContent = 'R = ' + (data.radius === 0 ? '0' : data.radius.toFixed(1) + ' u');

    if (data.center) {
      els.centerDot.setAttribute('cx', data.center.x.toFixed(2));
      els.centerDot.setAttribute('cy', data.center.y.toFixed(2));
      els.centerDot.setAttribute('r', '6');
    }

    els.radiusLine.innerHTML = '';
    if (data.mode !== 'pivot' && data.center) {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', pose.x.toFixed(2));
      line.setAttribute('y1', pose.y.toFixed(2));
      line.setAttribute('x2', data.center.x.toFixed(2));
      line.setAttribute('y2', data.center.y.toFixed(2));
      line.setAttribute('stroke', 'rgba(0,0,0,0.15)');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-dasharray', '4 4');
      els.radiusLine.appendChild(line);
    }
  }

  function renderTrail() {
    let d = '';
    trailPts.forEach((p, i) => {
      d += (i === 0 ? 'M ' : 'L ') + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' ';
    });
    let path = els.trail.querySelector('path');
    if (!path) {
      path = document.createElementNS(svgNS, 'path');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(83,74,183,0.35)');
      path.setAttribute('stroke-width', '3');
      path.setAttribute('stroke-linecap', 'round');
      els.trail.appendChild(path);
    }
    path.setAttribute('d', d);
  }

  // Purely cosmetic wheel-stripe scroll — a trivial linear offset, independent
  // of the protected physics, kept client-side for smooth 60fps visuals.
  function cosmeticLoop(t) {
    if (lastT === null) lastT = t;
    let dt = (t - lastT) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastT = t;

    if (els && els.vL) {
      const vl = (parseFloat(els.vL.value) / 100) * MAXSPD;
      const vr = (parseFloat(els.vR.value) / 100) * MAXSPD;
      stripeLOffset = ((stripeLOffset + vl * dt * STRIPE_SPEED) % STRIPE_PERIOD + STRIPE_PERIOD) % STRIPE_PERIOD;
      stripeROffset = ((stripeROffset + vr * dt * STRIPE_SPEED) % STRIPE_PERIOD + STRIPE_PERIOD) % STRIPE_PERIOD;
      els.stripesL.setAttribute('transform', `translate(0,${stripeLOffset.toFixed(3)})`);
      els.stripesR.setAttribute('transform', `translate(0,${stripeROffset.toFixed(3)})`);
    }

    rafId = requestAnimationFrame(cosmeticLoop);
  }

  function handleRecordClick() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }

    navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false })
      .then((stream) => {
        recordedChunks = [];
        const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
          .find(m => MediaRecorder.isTypeSupported(m)) || '';
        mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          els.recordBtn.textContent = '⏺ Quay màn hình';
          els.recordBtn.classList.remove('recording');
          els.recIndicator.hidden = true;

          const blob = new Blob(recordedChunks, { type: mimeType || 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          a.href = url;
          a.download = `robot-sim-${ts}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        };

        stream.getVideoTracks()[0].onended = () => {
          if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        };

        mediaRecorder.start();
        els.recordBtn.textContent = '⏹ Dừng quay';
        els.recordBtn.classList.add('recording');
        els.recIndicator.hidden = false;
      })
      .catch(() => { /* user cancelled or denied screen share */ });
  }

  window.initSimulationWidget = function initSimulationWidget() {
    const root = document.getElementById('sim-widget');
    if (!root) return;

    cacheEls();
    wireControls();
    syncOut();
    connectSocket();

    lastT = null;
    trailPts = [];
    rafId = requestAnimationFrame(cosmeticLoop);
  };

  window.teardownSimulationWidget = function teardownSimulationWidget() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    els = null;
  };
})();
