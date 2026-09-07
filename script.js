/* =========================================================
   Simulador de turnero para hospital
   - Fila de espera con prioridad
   - 2 ventanillas de atención
   - Tiempo de atención aleatorio (3 a 15 minutos)
   - Una ventanilla no puede tomar otro turno hasta terminar
     el paciente actual (heurística: prevención de errores)
   ========================================================= */

const WINDOW_COUNT = 2;
const MIN_MINUTES = 3;
const MAX_MINUTES = 15;

let nextArrivalOrder = 1;
let nextPatientId = 1;
let simSeconds = 0;      // reloj interno de la simulación (avanza con la velocidad elegida)
let speedMultiplier = 1; // 1x, 5x o 10x

// Fila de espera: cada paciente = { id, name, priority, arrivalOrder, joinedAt }
let queue = [];

// Ventanillas: cada una = { id, busy, patient, totalSeconds, remainingSeconds }
let windows = Array.from({ length: WINDOW_COUNT }, (_, i) => ({
  id: i + 1,
  busy: false,
  patient: null,
  totalSeconds: 0,
  remainingSeconds: 0
}));

// Historial de pacientes ya atendidos, para las estadísticas
let history = []; // { waitSeconds, attentionSeconds }

const queueListEl = document.getElementById("queueList");
const queueCountEl = document.getElementById("queueCount");
const windowsEl = document.getElementById("windows");
const clockEl = document.getElementById("clock");
const form = document.getElementById("patientForm");
const soundToggle = document.getElementById("soundToggle");
const speedButtons = document.querySelectorAll(".speed-btn");

const statAttendedEl = document.getElementById("statAttended");
const statAvgWaitEl = document.getElementById("statAvgWait");
const statAvgAttentionEl = document.getElementById("statAvgAttention");
const statElapsedEl = document.getElementById("statElapsed");

/* ---------- Utilidades ---------- */

function randomAttentionSeconds() {
  const minutes = Math.floor(
    Math.random() * (MAX_MINUTES - MIN_MINUTES + 1) + MIN_MINUTES
  );
  return minutes * 60;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function sortQueue() {
  // Prioritarios primero; dentro de cada grupo, respeta el orden de llegada
  queue.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === "priority" ? -1 : 1;
    }
    return a.arrivalOrder - b.arrivalOrder;
  });
}

/* ---------- Render ---------- */

function renderQueue() {
  queueCountEl.textContent =
    queue.length === 1 ? "1 paciente" : `${queue.length} pacientes`;

  if (queue.length === 0) {
    queueListEl.innerHTML =
      '<li class="empty-state">No hay pacientes en espera. Añade uno abajo.</li>';
    return;
  }

  queueListEl.innerHTML = queue
    .map((p, index) => {
      const tag =
        p.priority === "priority" ? "Prioritario" : "Consulta general";
      const isNext = index === 0;
      return `
        <li class="queue-item ${p.priority === "priority" ? "priority" : ""} ${isNext ? "next" : ""}">
          <span class="queue-num">${isNext ? "→" : index + 1}</span>
          <span class="queue-info">
            <div class="queue-name">${escapeHTML(p.name)}</div>
            <div class="queue-tag">${isNext ? "Siguiente · " : ""}${tag} · turno #${p.arrivalOrder}</div>
          </span>
          <button class="queue-remove" title="Quitar de la fila" data-id="${p.id}">✕</button>
        </li>`;
    })
    .join("");

  queueListEl.querySelectorAll(".queue-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const patient = queue.find((p) => p.id === id);
      if (patient && confirm(`¿Quitar a ${patient.name} de la fila?`)) {
        queue = queue.filter((p) => p.id !== id);
        renderQueue();
      }
    });
  });
}

function renderWindows(justCalledIds = []) {
  windowsEl.innerHTML = windows
    .map((w) => {
      const calling = justCalledIds.includes(w.id) ? "calling" : "";
      if (!w.busy) {
        return `
          <div class="window-card free" data-window="${w.id}">
            <div class="window-title"><span><span class="window-status-dot"></span>Ventanilla ${w.id}</span>Libre</div>
            <div class="window-empty">Esperando siguiente paciente…</div>
          </div>`;
      }
      const pct = Math.max(
        0,
        Math.round(
          ((w.totalSeconds - w.remainingSeconds) / w.totalSeconds) * 100
        )
      );
      const tag = w.patient.priority === "priority" ? "Prioritario" : "Consulta general";
      return `
        <div class="window-card busy ${calling}" data-window="${w.id}">
          <div class="window-title"><span><span class="window-status-dot"></span>Ventanilla ${w.id}</span>En atención</div>
          <div class="window-patient">${escapeHTML(w.patient.name)}</div>
          <div class="window-meta">${tag} · restante ${formatTime(w.remainingSeconds)}</div>
          <div class="window-bar"><div class="window-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
    })
    .join("");

  if (justCalledIds.length > 0) {
    justCalledIds.forEach((id) => {
      setTimeout(() => {
        document.querySelector(`[data-window="${id}"]`)?.classList.remove("calling");
      }, 1200);
    });
  }
}

function playBeep() {
  if (!soundToggle.checked) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => ctx.close();
  } catch (e) {
    /* audio no disponible en este navegador */
  }
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderStats() {
  statAttendedEl.textContent = history.length;

  if (history.length > 0) {
    const avgWait =
      history.reduce((sum, h) => sum + h.waitSeconds, 0) / history.length;
    const avgAttention =
      history.reduce((sum, h) => sum + h.attentionSeconds, 0) / history.length;
    statAvgWaitEl.textContent = formatTime(Math.round(avgWait));
    statAvgAttentionEl.textContent = formatTime(Math.round(avgAttention));
  } else {
    statAvgWaitEl.textContent = "0:00";
    statAvgAttentionEl.textContent = "0:00";
  }

  statElapsedEl.textContent = formatTime(simSeconds);
}

/* ---------- Lógica de asignación ---------- */

function assignFreeWindows() {
  // Prevención de errores: una ventanilla ocupada NO toma un nuevo turno
  // hasta que termine con el paciente actual.
  const calledIds = [];
  windows.forEach((w) => {
    if (!w.busy && queue.length > 0) {
      const next = queue.shift(); // ya viene ordenado por prioridad/llegada
      const seconds = randomAttentionSeconds();
      next.waitSeconds = simSeconds - next.joinedAt;
      w.busy = true;
      w.patient = next;
      w.totalSeconds = seconds;
      w.remainingSeconds = seconds;
      calledIds.push(w.id);
    }
  });
  return calledIds;
}

function tick() {
  simSeconds += speedMultiplier;

  windows.forEach((w) => {
    if (w.busy) {
      w.remainingSeconds -= speedMultiplier;
      if (w.remainingSeconds <= 0) {
        history.push({
          waitSeconds: w.patient.waitSeconds,
          attentionSeconds: w.totalSeconds
        });
        w.busy = false;
        w.patient = null;
        w.totalSeconds = 0;
        w.remainingSeconds = 0;
      }
    }
  });

  const calledIds = assignFreeWindows();
  renderWindows(calledIds);
  renderQueue();
  renderStats();
  if (calledIds.length > 0) playBeep();
}

/* ---------- Reloj ---------- */

function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString("es-MX", { hour12: false });
}

/* ---------- Registro de pacientes ---------- */

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("patientName");
  const priorityInput = document.getElementById("patientPriority");

  const name = nameInput.value.trim();
  if (!name) return;

  queue.push({
    id: nextPatientId++,
    name,
    priority: priorityInput.value,
    arrivalOrder: nextArrivalOrder++,
    joinedAt: simSeconds
  });

  sortQueue();
  const calledIds = assignFreeWindows();
  renderQueue();
  renderWindows(calledIds);
  renderStats();
  if (calledIds.length > 0) playBeep();

  nameInput.value = "";
  priorityInput.value = "normal";
  nameInput.focus();
});

/* ---------- Control de velocidad ---------- */

speedButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    speedMultiplier = Number(btn.dataset.speed);
    speedButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

/* ---------- Inicio ---------- */

renderWindows();
renderQueue();
renderStats();
updateClock();
setInterval(updateClock, 1000);
setInterval(tick, 1000);
