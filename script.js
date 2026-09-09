/* =========================================================
   Hospital San Rafael — lógica del sistema
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Datos base ---------- */
  const ESPECIALISTAS = [
    { id: "d1", nombre: "Dra. Ana López",      especialidad: "Cardiología",       dias: [1,2,3,4,5],   horas: ["08:00","09:00","10:00","11:00","16:00","17:00"] },
    { id: "d2", nombre: "Dr. Carlos Ruiz",      especialidad: "Pediatría",         dias: [1,3,5],       horas: ["09:00","10:00","11:00","12:00"] },
    { id: "d3", nombre: "Dra. María Torres",    especialidad: "Dermatología",      dias: [2,4],         horas: ["08:00","09:00","10:00"] },
    { id: "d4", nombre: "Dr. Jorge Ramírez",    especialidad: "Traumatología",     dias: [1,2,3,4,5],   horas: ["13:00","14:00","15:00","16:00"] },
    { id: "d5", nombre: "Dra. Laura Gómez",     especialidad: "Ginecología",       dias: [2,3,4],       horas: ["08:00","09:00","10:00","11:00"] },
    { id: "d6", nombre: "Dr. Pedro Sánchez",    especialidad: "Medicina General",  dias: [1,2,3,4,5,6], horas: ["08:00","09:00","10:00","11:00","12:00","13:00"] },
  ];

  const NIVELES = [
    { nivel: 1, etiqueta: "Crítica",        desc: "Riesgo vital inmediato" },
    { nivel: 2, etiqueta: "Urgente",        desc: "Atención en minutos" },
    { nivel: 3, etiqueta: "Moderada",       desc: "Puede esperar un poco" },
    { nivel: 4, etiqueta: "Leve",           desc: "Sin riesgo inmediato" },
    { nivel: 5, etiqueta: "Cita programada",desc: "Con hora reservada" },
  ];
  const nivelInfo = (n) => NIVELES.find(x => x.nivel === n);

  const DIAS_NOMBRE = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

  const ESTADOS_CURP = {
    AS:"Aguascalientes", BC:"Baja California", BS:"Baja California Sur", CC:"Campeche",
    CL:"Coahuila", CM:"Colima", CS:"Chiapas", CH:"Chihuahua", DF:"Ciudad de México",
    DG:"Durango", GT:"Guanajuato", GR:"Guerrero", HG:"Hidalgo", JC:"Jalisco",
    MC:"Estado de México", MN:"Michoacán", MS:"Morelos", NT:"Nayarit", NL:"Nuevo León",
    OC:"Oaxaca", PL:"Puebla", QO:"Querétaro", QR:"Quintana Roo", SP:"San Luis Potosí",
    SL:"Sinaloa", SR:"Sonora", TC:"Tabasco", TS:"Tamaulipas", TL:"Tlaxcala",
    VZ:"Veracruz", YN:"Yucatán", ZS:"Zacatecas", NE:"Nacido en el extranjero",
  };

  /* ---------- Almacenamiento ---------- */
  const LS_CITAS = "hsr_citas";
  const LS_FOLIO = "hsr_folio_contador";
  const LS_PACIENTES = "hsr_pacientes";

  function cargarCitas() { try { return JSON.parse(localStorage.getItem(LS_CITAS)) || []; } catch { return []; } }
  function guardarCitas(v) { localStorage.setItem(LS_CITAS, JSON.stringify(v)); }
  let citas = cargarCitas();

  function cargarPacientes() { try { return JSON.parse(localStorage.getItem(LS_PACIENTES)) || {}; } catch { return {}; } }
  function guardarPacientes(v) { localStorage.setItem(LS_PACIENTES, JSON.stringify(v)); }
  let pacientes = cargarPacientes();

  function siguienteFolio() {
    let n = parseInt(localStorage.getItem(LS_FOLIO) || "0", 10) + 1;
    localStorage.setItem(LS_FOLIO, String(n));
    const hoy = new Date();
    const yy = String(hoy.getFullYear()).slice(2);
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    return `C-${yy}${mm}${dd}-${String(n).padStart(4, "0")}`;
  }

  /* ---------- Utilidades ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 10);
  }

  function toast(mensaje, tipo = "ok") {
    const stack = $("#toastStack");
    const el = document.createElement("div");
    el.className = `toast ${tipo}`;
    el.textContent = mensaje;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function setError(fieldId, msg) {
    const errEl = $("#err-" + fieldId);
    const inputEl = $("#" + fieldId);
    if (errEl) errEl.textContent = msg || "";
    if (inputEl) inputEl.closest(".field")?.classList.toggle("has-error", !!msg);
    return !msg;
  }

  function confirmarAccion(titulo, texto) {
    return new Promise((resolve) => {
      const modal = $("#modalConfirmar");
      $("#confirmarTitulo").textContent = titulo;
      $("#confirmarTexto").textContent = texto;
      modal.hidden = false;
      const onAceptar = () => cerrar(true);
      const onCancelar = () => cerrar(false);
      function cerrar(res) {
        modal.hidden = true;
        $("#confirmarAceptar").removeEventListener("click", onAceptar);
        $("#confirmarCancelar").removeEventListener("click", onCancelar);
        resolve(res);
      }
      $("#confirmarAceptar").addEventListener("click", onAceptar);
      $("#confirmarCancelar").addEventListener("click", onCancelar);
    });
  }

  /* ---------- Validadores ---------- */
  const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü'’ ]{2,60}$/;
  const RE_TEL = /^[0-9]{10}$/;
  const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const RE_CURP = /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QO|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d$/;

  function parseCurp(curpRaw) {
    const curp = (curpRaw || "").toUpperCase();
    if (!RE_CURP.test(curp)) return null;
    const yy = Number(curp.slice(4, 6));
    const mm = Number(curp.slice(6, 8));
    const dd = Number(curp.slice(8, 10));
    const sexoChar = curp[10];
    const estadoCod = curp.slice(11, 13);
    const diffChar = curp[16]; // dígito = nacido antes de 2000, letra = 2000 en adelante
    const siglo = /\d/.test(diffChar) ? 1900 : 2000;
    const anioNac = siglo + yy;
    const nacimiento = new Date(anioNac, mm - 1, dd);
    const hoy = new Date();
    let edad = hoy.getFullYear() - anioNac;
    if (hoy.getMonth() < mm - 1 || (hoy.getMonth() === mm - 1 && hoy.getDate() < dd)) edad -= 1;
    return {
      curp,
      sexo: sexoChar === "H" ? "Hombre" : "Mujer",
      estado: ESTADOS_CURP[estadoCod] || estadoCod,
      nacimiento: `${String(dd).padStart(2,"0")}/${String(mm).padStart(2,"0")}/${anioNac}`,
      edad: edad >= 0 && edad < 130 ? edad : null,
    };
  }

  function validarPaso1() {
    let ok = true;
    const curp = $("#fCurp").value.trim().toUpperCase();
    const info = parseCurp(curp);

    ok = setError("fCurp", info ? "" : "Escriba una CURP válida de 18 caracteres.") && ok;
    if (!info) { estadoReserva.pacienteValido = false; return ok; }

    const existente = pacientes[curp];
    if (existente) {
      estadoReserva.pacienteValido = true;
      estadoReserva.pacienteDatos = { ...existente, ...info };
      return ok;
    }

    // Paciente nuevo: se piden solo estos tres datos, una sola vez.
    const nombre = $("#pNombre")?.value.trim() || "";
    const telefono = $("#pTelefono")?.value.trim() || "";
    const correo = $("#pCorreo")?.value.trim() || "";
    ok = setError("pNombre", RE_NOMBRE.test(nombre) ? "" : "Escriba el nombre completo (solo letras).") && ok;
    ok = setError("pTelefono", RE_TEL.test(telefono) ? "" : "El teléfono debe tener 10 dígitos.") && ok;
    ok = setError("pCorreo", RE_CORREO.test(correo) ? "" : "Escriba un correo válido.") && ok;

    estadoReserva.pacienteValido = ok;
    if (ok) estadoReserva.pacienteDatos = { nombre, telefono, correo, ...info };
    return ok;
  }

  function renderPatientPanel() {
    const panel = $("#patientPanel");
    const curp = $("#fCurp").value.trim().toUpperCase();

    if (curp.length < 18) {
      panel.hidden = true;
      panel.innerHTML = "";
      setError("fCurp", curp.length ? "" : "");
      return;
    }
    const info = parseCurp(curp);
    if (!info) {
      panel.hidden = true;
      setError("fCurp", "Esa CURP no tiene un formato válido. Revísela.");
      return;
    }
    setError("fCurp", "");
    panel.hidden = false;

    const existente = pacientes[curp];
    if (existente) {
      panel.className = "patient-panel is-found";
      panel.innerHTML = `
        <span class="patient-panel__tag">Paciente encontrado — no necesita volver a escribir sus datos</span>
        <div class="patient-card">
          <dl>
            <dt>Nombre</dt><dd id="ppNombre">${existente.nombre}</dd>
            <dt>Teléfono</dt><dd id="ppTelefono">${existente.telefono}</dd>
            <dt>Correo</dt><dd id="ppCorreo">${existente.correo}</dd>
            <dt>Sexo (según CURP)</dt><dd>${info.sexo}</dd>
            <dt>Edad aprox.</dt><dd>${info.edad ?? "—"} años</dd>
            <dt>Entidad de nacimiento</dt><dd>${info.estado}</dd>
          </dl>
        </div>
        <button class="link-btn" type="button" id="btnEditarPaciente">¿No son correctos? Actualizar mis datos</button>
        <div id="editarPacienteForm" hidden style="margin-top:.8rem;">
          <div class="field"><label for="pNombre">Nombre completo</label><input type="text" id="pNombre" value="${existente.nombre}"><p class="field-error" id="err-pNombre"></p></div>
          <div class="field"><label for="pTelefono">Teléfono (10 dígitos)</label><input type="tel" id="pTelefono" maxlength="10" value="${existente.telefono}"><p class="field-error" id="err-pTelefono"></p></div>
          <div class="field"><label for="pCorreo">Correo electrónico</label><input type="email" id="pCorreo" value="${existente.correo}"><p class="field-error" id="err-pCorreo"></p></div>
        </div>`;
      $("#btnEditarPaciente").addEventListener("click", () => {
        const f = $("#editarPacienteForm");
        f.hidden = !f.hidden;
      });
    } else {
      panel.className = "patient-panel is-new";
      panel.innerHTML = `
        <span class="patient-panel__tag">CURP nueva en el sistema — complete estos datos una sola vez</span>
        <p class="derived-note">Según su CURP: ${info.sexo}, ${info.edad ?? "—"} años aprox., nacido(a) en ${info.estado}.</p>
        <div class="field"><label for="pNombre">Nombre completo</label><input type="text" id="pNombre" placeholder="Ej. María Hernández López"><p class="field-error" id="err-pNombre"></p></div>
        <div class="field"><label for="pTelefono">Teléfono (10 dígitos)</label><input type="tel" id="pTelefono" maxlength="10" placeholder="8341234567" inputmode="numeric"><p class="field-error" id="err-pTelefono"></p></div>
        <div class="field"><label for="pCorreo">Correo electrónico</label><input type="email" id="pCorreo" placeholder="nombre@correo.com"><p class="field-error" id="err-pCorreo"></p></div>`;
    }
  }

  function validarPaso2() {
    let ok = true;
    const espId = $("#fEspecialidad").value;
    const docId = $("#fDoctor").value;
    const fecha = $("#fFecha").value;
    const hora = estadoReserva.horaSeleccionada;
    const doctor = ESPECIALISTAS.find(d => d.id === docId);

    ok = setError("fEspecialidad", espId ? "" : "Seleccione una especialidad de la lista.") && ok;
    ok = setError("fDoctor", doctor ? "" : "Seleccione un doctor(a) que exista en el sistema.") && ok;

    if (!fecha) {
      ok = setError("fFecha", "Elija una fecha.") && ok;
    } else if (fecha < todayISO()) {
      ok = setError("fFecha", "No se permiten fechas pasadas.") && ok;
    } else if (doctor) {
      const diaSemana = new Date(fecha + "T00:00:00").getDay();
      if (!doctor.dias.includes(diaSemana)) {
        ok = setError("fFecha", `${doctor.nombre} no atiende los ${DIAS_NOMBRE[diaSemana]}. Elija otra fecha.`) && ok;
      } else {
        ok = setError("fFecha", "") && ok;
      }
    }
    ok = setError("fHora", hora ? "" : "Seleccione un horario disponible.") && ok;
    return ok;
  }

  /* ---------- Flujo de reserva ---------- */
  const estadoReserva = { paso: 1, horaSeleccionada: null, pacienteValido: false, pacienteDatos: null };

  function poblarEspecialidades() {
    const sel = $("#fEspecialidad");
    [...new Set(ESPECIALISTAS.map(d => d.especialidad))].forEach(esp => {
      const opt = document.createElement("option");
      opt.value = esp; opt.textContent = esp;
      sel.appendChild(opt);
    });
  }

  function poblarDoctores() {
    const espSel = $("#fEspecialidad").value;
    const docSel = $("#fDoctor");
    docSel.innerHTML = "";
    if (!espSel) {
      docSel.disabled = true;
      docSel.innerHTML = `<option value="">Elija primero una especialidad</option>`;
      return;
    }
    docSel.disabled = false;
    docSel.innerHTML = `<option value="">Seleccione un doctor(a)</option>`;
    ESPECIALISTAS.filter(d => d.especialidad === espSel).forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id; opt.textContent = d.nombre;
      docSel.appendChild(opt);
    });
  }

  function habilitarFecha() {
    const docId = $("#fDoctor").value;
    const fechaInput = $("#fFecha");
    const help = $("#help-fFecha");
    fechaInput.value = "";
    estadoReserva.horaSeleccionada = null;
    if (!docId) {
      fechaInput.disabled = true;
      help.textContent = "Elija primero un doctor.";
      renderSlots();
      return;
    }
    fechaInput.disabled = false;
    fechaInput.min = todayISO();
    const doctor = ESPECIALISTAS.find(d => d.id === docId);
    help.textContent = `${doctor.nombre} atiende: ${doctor.dias.map(d => DIAS_NOMBRE[d]).join(", ")}.`;
    renderSlots();
  }

  function horaAOrdinal(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  function renderSlots() {
    const grid = $("#slotGrid");
    const docId = $("#fDoctor").value;
    const fecha = $("#fFecha").value;
    estadoReserva.horaSeleccionada = null;
    grid.innerHTML = "";

    if (!docId || !fecha) {
      grid.innerHTML = `<p class="slot-empty">Complete especialidad, doctor y fecha para ver horarios.</p>`;
      return;
    }
    const doctor = ESPECIALISTAS.find(d => d.id === docId);
    const diaSemana = new Date(fecha + "T00:00:00").getDay();

    if (!doctor.dias.includes(diaSemana)) {
      grid.innerHTML = `<p class="slot-empty">${doctor.nombre} no atiende los ${DIAS_NOMBRE[diaSemana]}. Elija otra fecha.</p>`;
      return;
    }

    const esHoy = fecha === todayISO();
    const ahoraOrdinal = new Date().getHours() * 60 + new Date().getMinutes() + 60;

    const ocupadas = new Set(
      citas.filter(c => c.doctorId === docId && c.fecha === fecha && c.estado === "confirmada").map(c => c.hora)
    );

    doctor.horas.forEach(h => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot-btn";
      btn.textContent = h;
      const pasada = esHoy && horaAOrdinal(h) < ahoraOrdinal;
      const ocupada = ocupadas.has(h);
      if (ocupada || pasada) {
        btn.disabled = true;
        btn.title = ocupada ? "Horario ya reservado" : "Horario no disponible hoy";
      } else {
        btn.addEventListener("click", () => {
          $$(".slot-btn", grid).forEach(b => b.classList.remove("is-selected"));
          btn.classList.add("is-selected");
          estadoReserva.horaSeleccionada = h;
          setError("fHora", "");
        });
      }
      grid.appendChild(btn);
    });
  }

  function irAPaso(n) {
    estadoReserva.paso = n;
    $$(".step-panel").forEach(p => p.classList.toggle("is-current", Number(p.dataset.step) === n));
    $$(".stepper__item").forEach(li => {
      const s = Number(li.dataset.step);
      li.classList.toggle("is-current", s === n);
      li.classList.toggle("is-done", s < n);
    });
    if (n === 3) renderResumen();
    const panel = $(`.step-panel[data-step="${n}"]`);
    panel?.querySelector("input, select, button")?.focus();
  }

  function renderResumen() {
    const p = estadoReserva.pacienteDatos || {};
    const doctor = ESPECIALISTAS.find(d => d.id === $("#fDoctor").value);
    const fecha = $("#fFecha").value;
    $("#reviewCard").innerHTML = `
      <dl>
        <dt>Paciente</dt><dd>${p.nombre ?? ""}</dd>
        <dt>CURP</dt><dd>${p.curp ?? ""}</dd>
        <dt>Teléfono</dt><dd>${p.telefono ?? ""}</dd>
        <dt>Especialidad</dt><dd>${doctor?.especialidad ?? ""}</dd>
        <dt>Doctor(a)</dt><dd>${doctor?.nombre ?? ""}</dd>
        <dt>Fecha</dt><dd>${fecha}</dd>
        <dt>Hora</dt><dd>${estadoReserva.horaSeleccionada ?? ""}</dd>
      </dl>`;
  }

  function reservaDuplicada(curp, fecha) {
    return citas.some(c => c.curp === curp && c.fecha === fecha && c.estado === "confirmada");
  }

  function inicializarFormularioCita() {
    poblarEspecialidades();

    $("#fCurp").addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase();
      renderPatientPanel();
    });

    $("#fEspecialidad").addEventListener("change", () => { poblarDoctores(); habilitarFecha(); });
    $("#fDoctor").addEventListener("change", habilitarFecha);
    $("#fFecha").addEventListener("change", renderSlots);

    $$('[data-next]').forEach(btn => {
      btn.addEventListener("click", () => {
        const destino = Number(btn.dataset.next);
        if (destino === 2 && !validarPaso1()) { toast("Revise los datos marcados en rojo.", "error"); return; }
        if (destino === 3 && !validarPaso2()) { toast("Revise el especialista y el horario.", "error"); return; }
        irAPaso(destino);
      });
    });
    $$('[data-prev]').forEach(btn => btn.addEventListener("click", () => irAPaso(Number(btn.dataset.prev))));

    $("#formCita").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validarPaso1() || !validarPaso2()) {
        toast("Hay datos por corregir antes de confirmar.", "error");
        return;
      }
      const p = estadoReserva.pacienteDatos;
      const fecha = $("#fFecha").value;
      const docId = $("#fDoctor").value;
      const hora = estadoReserva.horaSeleccionada;

      const yaOcupado = citas.some(c => c.doctorId === docId && c.fecha === fecha && c.hora === hora && c.estado === "confirmada");
      if (yaOcupado) {
        toast("Ese horario acaba de ser tomado por otra persona. Elija otro.", "error");
        renderSlots();
        irAPaso(2);
        return;
      }
      if (reservaDuplicada(p.curp, fecha)) {
        toast("Esta CURP ya tiene una cita confirmada ese día.", "error");
        irAPaso(1);
        return;
      }

      // Guardar/actualizar el registro del paciente para que la próxima vez solo pida la CURP.
      pacientes[p.curp] = { nombre: p.nombre, telefono: p.telefono, correo: p.correo };
      guardarPacientes(pacientes);

      const doctor = ESPECIALISTAS.find(d => d.id === docId);
      const folio = siguienteFolio();
      const nuevaCita = {
        folio, curp: p.curp, nombre: p.nombre, telefono: p.telefono, correo: p.correo,
        especialidad: doctor.especialidad, doctorId: doctor.id, doctorNombre: doctor.nombre,
        fecha, hora, estado: "confirmada", checkin: false, creada: Date.now(),
      };
      citas.push(nuevaCita);
      guardarCitas(citas);

      $("#formCita").hidden = true;
      $("#stepper").hidden = true;
      $("#confirmPanel").hidden = false;
      $("#confirmText").textContent = `${nuevaCita.nombre}, su cita con ${doctor.nombre} (${doctor.especialidad}) quedó registrada para el ${fecha} a las ${hora}.`;
      $("#confirmFolio").textContent = `Folio: ${folio}`;
      toast("Cita confirmada correctamente.", "ok");
      actualizarInicio();
      renderCitasHoy();
    });

    $("#btnNuevaCita").addEventListener("click", () => {
      $("#formCita").reset();
      $("#formCita").hidden = false;
      $("#stepper").hidden = false;
      $("#confirmPanel").hidden = true;
      $("#patientPanel").hidden = true;
      poblarDoctores();
      habilitarFecha();
      $$(".field-error").forEach(el => el.textContent = "");
      $$(".field").forEach(f => f.classList.remove("has-error"));
      estadoReserva.pacienteDatos = null;
      irAPaso(1);
    });
  }

  /* =========================================================
     Ventanillas — urgencias y citas de hoy en una sola fila
     ========================================================= */
  const SIMULACION_MS = 1000; // 1 "minuto" simulado = 1 segundo real

  const colaGeneral = []; // {id, tipo:'urgencia'|'cita', nombre, nivel, llegada, ...datos}
  const ventanillasState = [
    { id: 1, atendiendo: null, restante: 0, total: 0, timer: null, historial: [] },
    { id: 2, atendiendo: null, restante: 0, total: 0, timer: null, historial: [] },
  ];
  let contadorUrgencia = 0;

  function renderPriorityPicker() {
    const cont = $("#priorityPicker");
    cont.innerHTML = "";
    NIVELES.filter(n => n.nivel <= 4).forEach(n => {
      const label = document.createElement("label");
      label.className = `priority-opt sel-${n.nivel}`;
      label.innerHTML = `
        <input type="radio" name="nivel" value="${n.nivel}">
        <span class="dot" aria-hidden="true"></span>
        <span>${n.etiqueta}</span>
        <small>${n.desc}</small>`;
      cont.appendChild(label);
    });
  }

  function ordenarCola() {
    colaGeneral.sort((a, b) => (a.nivel - b.nivel) || (a.llegada - b.llegada));
  }

  function promedioGlobalSegundos() {
    const todos = ventanillasState.flatMap(v => v.historial);
    if (!todos.length) return 9;
    return Math.round(todos.reduce((a, b) => a + b, 0) / todos.length);
  }

  function renderCola() {
    const ul = $("#queueList");
    ordenarCola();
    if (!colaGeneral.length) {
      ul.innerHTML = `<li class="queue-empty">No hay pacientes en espera.</li>`;
    } else {
      const prom = promedioGlobalSegundos();
      ul.innerHTML = colaGeneral.map((p, i) => {
        const espera = Math.ceil((i + 1) / 2) * prom;
        const etiqueta = p.tipo === "cita" ? `Cita · ${p.hora}` : nivelInfo(p.nivel).etiqueta;
        return `
          <li class="queue-row">
            <span class="queue-row__pos">${i + 1}</span>
            <span class="badge badge-${p.nivel}">${etiqueta}</span>
            <span class="queue-row__name">${p.nombre}</span>
            <span class="queue-row__wait">~${espera} min de espera</span>
          </li>`;
      }).join("");
    }
    $("#promedioPill").textContent = `Promedio: ${promedioGlobalSegundos()} min por persona`;
    $("#statEnCola").textContent = colaGeneral.length;
  }

  function renderVentanillas() {
    const cont = $("#ventanillas");
    cont.innerHTML = ventanillasState.map(v => {
      if (v.atendiendo) {
        const pct = Math.round(((v.total - v.restante) / v.total) * 100);
        const etiqueta = v.atendiendo.tipo === "cita" ? `Cita · ${v.atendiendo.hora}` : nivelInfo(v.atendiendo.nivel).etiqueta;
        return `
          <div class="vent-card">
            <div class="vent-card__title">Ventanilla ${v.id}</div>
            <div class="vent-card__status">
              <div class="vent-card__patient">${v.atendiendo.nombre}</div>
              <div class="badge badge-${v.atendiendo.nivel}">${etiqueta}</div>
            </div>
            <div class="vent-card__timer">${v.restante} min restantes</div>
            <div class="vent-card__bar"><div class="vent-card__bar-fill" style="width:${pct}%"></div></div>
            <button class="btn btn-ghost btn-small" disabled>Atendiendo…</button>
          </div>`;
      }
      const disponible = colaGeneral.length > 0;
      return `
        <div class="vent-card">
          <div class="vent-card__title">Ventanilla ${v.id}</div>
          <div class="vent-card__status">
            <p class="vent-card__idle">${disponible ? "Libre, lista para llamar." : "Libre. Fila vacía."}</p>
          </div>
          <button class="btn btn-primary btn-small" data-ventanilla="${v.id}" ${disponible ? "" : "disabled"}>
            Llamar siguiente
          </button>
        </div>`;
    }).join("");

    $$("[data-ventanilla]", cont).forEach(btn => {
      btn.addEventListener("click", () => atenderSiguiente(Number(btn.dataset.ventanilla)));
    });
  }

  function atenderSiguiente(ventanillaId) {
    const v = ventanillasState.find(x => x.id === ventanillaId);
    if (v.atendiendo) {
      toast(`La ventanilla ${ventanillaId} no puede avanzar hasta terminar con el paciente actual.`, "warn");
      return;
    }
    ordenarCola();
    if (!colaGeneral.length) {
      toast("No hay pacientes en la fila.", "warn");
      return;
    }
    const paciente = colaGeneral.shift();
    const duracion = Math.floor(Math.random() * (15 - 3 + 1)) + 3;
    v.atendiendo = paciente;
    v.total = duracion;
    v.restante = duracion;
    renderVentanillas();
    renderCola();

    v.timer = setInterval(() => {
      v.restante -= 1;
      if (v.restante <= 0) {
        clearInterval(v.timer);
        v.historial.push(v.total);
        toast(`Ventanilla ${v.id}: ${v.atendiendo.nombre} fue atendido(a).`, "ok");
        v.atendiendo = null;
        v.timer = null;
        actualizarInicio();
        renderVentanillas();
        renderCola();
      } else {
        renderVentanillas();
      }
    }, SIMULACION_MS);
  }

  function validarUrgencia() {
    let ok = true;
    const nombre = $("#uNombre").value.trim();
    const edad = $("#uEdad").value;
    const motivo = $("#uMotivo").value;
    const nivel = $('input[name="nivel"]:checked');
    ok = setError("uNombre", RE_NOMBRE.test(nombre) ? "" : "Escriba solo letras, 2 a 60 caracteres.") && ok;
    ok = setError("uEdad", (edad !== "" && Number(edad) >= 0 && Number(edad) <= 120) ? "" : "Escriba una edad válida (0 a 120).") && ok;
    ok = setError("uMotivo", motivo ? "" : "Seleccione un motivo de consulta.") && ok;
    ok = setError("uNivel", nivel ? "" : "Seleccione el nivel de gravedad.") && ok;
    return ok;
  }

  function inicializarUrgencias() {
    renderPriorityPicker();
    renderVentanillas();
    renderCola();

    $("#formUrgencia").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validarUrgencia()) {
        toast("Complete los datos del paciente antes de continuar.", "error");
        return;
      }
      contadorUrgencia += 1;
      colaGeneral.push({
        id: "u" + contadorUrgencia,
        tipo: "urgencia",
        nombre: $("#uNombre").value.trim(),
        edad: $("#uEdad").value,
        motivo: $("#uMotivo").value,
        nivel: Number($('input[name="nivel"]:checked').value),
        llegada: Date.now(),
      });
      renderCola();
      renderVentanillas();
      toast(`${$("#uNombre").value.trim()} se agregó a la fila de urgencias.`, "ok");
      e.target.reset();
      $$(".field-error", e.target).forEach(el => el.textContent = "");
      $$(".field", e.target).forEach(f => f.classList.remove("has-error"));
      $("#uNombre").focus();
    });
  }

  /* ---------- Citas de hoy → registrar llegada en ventanilla ---------- */
  function renderCitasHoy() {
    const ul = $("#citasHoyList");
    const hoy = todayISO();
    const deHoy = citas.filter(c => c.fecha === hoy && c.estado === "confirmada" && !c.checkin);

    if (!deHoy.length) {
      ul.innerHTML = `<li class="queue-empty">No hay citas confirmadas para hoy.</li>`;
      return;
    }
    ul.innerHTML = deHoy.map(c => `
      <li class="checkin-row">
        <span class="checkin-row__name">${c.nombre} — ${c.doctorNombre}</span>
        <span class="checkin-row__meta">${c.hora} · ${c.especialidad}</span>
        <button class="btn btn-outline btn-small" data-checkin="${c.folio}" type="button">Registrar llegada</button>
      </li>`).join("");

    $$("[data-checkin]", ul).forEach(btn => {
      btn.addEventListener("click", () => {
        const cita = citas.find(c => c.folio === btn.dataset.checkin);
        if (!cita || cita.checkin) return;
        cita.checkin = true;
        guardarCitas(citas);
        colaGeneral.push({
          id: "c" + cita.folio,
          tipo: "cita",
          nombre: cita.nombre,
          nivel: 5,
          hora: cita.hora,
          folio: cita.folio,
          llegada: Date.now(),
        });
        renderCitasHoy();
        renderCola();
        renderVentanillas();
        toast(`${cita.nombre} pasó a la fila de ventanilla.`, "ok");
      });
    });
  }

  /* =========================================================
     Mis citas — consulta y cancelación
     ========================================================= */
  function inicializarMisCitas() {
    $("#formBuscar").addEventListener("submit", (e) => {
      e.preventDefault();
      const q = $("#bBusqueda").value.trim().toLowerCase();
      const cont = $("#resultadosCitas");
      if (!q) { cont.innerHTML = `<p class="resultados-empty">Escriba una CURP o folio para buscar.</p>`; return; }

      const encontradas = citas.filter(c => c.curp.toLowerCase() === q || c.folio.toLowerCase() === q);
      if (!encontradas.length) {
        cont.innerHTML = `<p class="resultados-empty">No se encontraron citas con ese dato.</p>`;
        return;
      }

      cont.innerHTML = "";
      encontradas.forEach(c => {
        const row = document.createElement("div");
        row.className = "cita-row" + (c.estado === "cancelada" ? " is-cancelada" : "");
        row.innerHTML = `
          <div class="cita-row__info">
            <strong>${c.doctorNombre} — ${c.especialidad}</strong>
            <span>${c.nombre} · ${c.fecha} ${c.hora} · Folio ${c.folio}</span>
          </div>
          <div style="display:flex;align-items:center;gap:.7rem;">
            <span class="status-tag ${c.estado}">${c.estado === "confirmada" ? "Confirmada" : "Cancelada"}</span>
            ${c.estado === "confirmada" ? `<button class="btn btn-ghost btn-small" data-cancelar="${c.folio}">Cancelar cita</button>` : ""}
          </div>`;
        cont.appendChild(row);
      });

      $$("[data-cancelar]", cont).forEach(btn => {
        btn.addEventListener("click", async () => {
          const folio = btn.dataset.cancelar;
          const cita = citas.find(c => c.folio === folio);
          const confirmar = await confirmarAccion(
            "¿Cancelar esta cita?",
            `Se cancelará la cita de ${cita.nombre} con ${cita.doctorNombre} el ${cita.fecha} a las ${cita.hora}. El horario quedará libre para otra persona.`
          );
          if (!confirmar) return;
          cita.estado = "cancelada";
          guardarCitas(citas);
          toast("Cita cancelada. El horario quedó disponible de nuevo.", "ok");
          actualizarInicio();
          renderCitasHoy();
          $("#formBuscar").dispatchEvent(new Event("submit"));
        });
      });
    });
  }

  /* =========================================================
     Navegación entre vistas
     ========================================================= */
  function cambiarVista(nombre) {
    $$(".view").forEach(v => v.classList.toggle("is-active", v.id === "view-" + nombre));
    $$(".navlink").forEach(b => b.classList.toggle("is-active", b.dataset.view === nombre));
    if (nombre === "emergencias") renderCitasHoy();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function inicializarNav() {
    $$(".navlink").forEach(btn => btn.addEventListener("click", () => cambiarVista(btn.dataset.view)));
    $$("[data-goto]").forEach(btn => btn.addEventListener("click", () => cambiarVista(btn.dataset.goto)));
  }

  function inicializarAyuda() {
    const modal = $("#modalAyuda");
    $("#btnAyuda").addEventListener("click", () => { modal.hidden = false; });
    $("#cerrarAyuda").addEventListener("click", () => { modal.hidden = true; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { modal.hidden = true; $("#modalConfirmar").hidden = true; }
    });
  }

  function actualizarInicio() {
    $("#statEspecialistas").textContent = ESPECIALISTAS.length;
    const hoy = todayISO();
    $("#statCitasHoy").textContent = citas.filter(c => c.fecha === hoy && c.estado === "confirmada").length;
    $("#statEnCola").textContent = colaGeneral.length;
    const todos = ventanillasState.flatMap(v => v.historial);
    $("#statTiempoProm").textContent = todos.length ? promedioGlobalSegundos() : "—";
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    inicializarNav();
    inicializarAyuda();
    inicializarFormularioCita();
    inicializarUrgencias();
    inicializarMisCitas();
    habilitarFecha();
    renderCitasHoy();
    actualizarInicio();
  });
})();
