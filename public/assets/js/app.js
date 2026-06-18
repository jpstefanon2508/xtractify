const SOURCE_DATA = window.OFICINA_DATA || {};
const STORAGE_KEY = "estratificacao.local.db.v1";
const SESSION_KEY = "estratificacao.local.session";
const SUPABASE_SESSION_KEY = "xtractify.supabase.session";
const SUPABASE = window.XTRACTIFY_SUPABASE || {};

const STATUS = ["rascunho", "enviado", "validado", "rejeitado", "corrigido", "importado"];
const ID1_COLORS = {
  "SERVICO": "#0f8b8d",
  "SERVIÃ‡O": "#0f8b8d",
  "ESPERA": "#cf514a",
  "PARALISACAO": "#d79722",
  "PARALISAÃ‡ÃƒO": "#d79722",
  "DESLOCAMENTO": "#34699a",
  "MOBILIZACAO": "#6f5aa7",
  "MOBILIZAÃ‡ÃƒO": "#6f5aa7",
  "APOIO": "#3d8b58",
  "QSMSRS": "#7d8a99",
};

const state = {
  page: "home",
  dataTab: "time",
  cadastroTab: "employees",
  editingTimeId: null,
  editingProductionId: null,
  editingActionId: null,
  editingMasterId: null,
  reviewSessionId: null,
  profileMode: "developer",
  currentUser: null,
  db: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const fmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

const ICON_PATHS = {
  filter: "M4 5h16M7 12h10M10 19h4",
  save: "M5 4h12l2 2v14H5zM8 4v6h8V4M8 20v-6h8v6",
  check: "M20 6L9 17l-5-5",
  close: "M6 6l12 12M18 6L6 18",
  edit: "M4 20h4l11-11-4-4L4 16v4zM14 6l4 4",
  copy: "M8 8h12v12H8zM4 16V4h12",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3",
  export: "M12 3v12M8 7l4-4 4 4M4 21h16",
  reset: "M3 12a9 9 0 119 9M3 12h6M3 12l4-4",
  user: "M12 12a5 5 0 100-10 5 5 0 000 10zm8 10a8 8 0 10-16 0",
  plus: "M12 5v14M5 12h14",
  play: "M8 5v14l11-7z",
};

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON_PATHS[name] || ICON_PATHS.check}"/></svg>`;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  }[char]));
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function dateIso(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function currentTimeValue() {
  const date = new Date();
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function startOfWeek(value) {
  const date = parseDate(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return dateIso(date);
}

function addDays(value, days) {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return dateIso(date);
}

function formatDate(value) {
  if (!value) return "-";
  return parseDate(value).toLocaleDateString("pt-BR");
}

function median(values) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function groupBy(rows, keyFn) {
  return rows.reduce((acc, row) => {
    const key = keyFn(row);
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(row);
    return acc;
  }, new Map());
}

function unique(rows, key) {
  return [...new Set(rows.map((row) => String(row[key] ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function buildInitialDb() {
  const timeRows = (SOURCE_DATA.timeRows || []).map((row, index) => ({
    id: `time_${index + 1}`,
    date: row.date,
    id1: row.id1 || "",
    id2: row.id2 || "",
    id2_desc: row.id2_desc || "",
    hh: Number(row.hh) || 0,
    funcionario: row.funcionario || "",
    cargo: row.cargo || "",
    apurador: row.apurador || "",
    bloco: String(row.bloco ?? ""),
    processo: row.processo || "",
    comentario: row.comentario || "",
    hora_inicio: row.hora_inicio || "",
    hora_termino: row.hora_termino || "",
    origem: "importado",
    status: "importado",
    deleted: false,
    created_at: "base-original",
    updated_at: "base-original",
  }));

  const productionRows = (SOURCE_DATA.productionRows || []).map((row, index) => ({
    id: `qs_${index + 1}`,
    date: row.date,
    qtde: Number(row.qtde) || 0,
    tag: row.tag || "",
    tipo: row.tipo || "",
    bloco: String(row.bloco ?? ""),
    peso_tn: Number(row.peso_tn) || 0,
    origem: "importado",
    status: "importado",
    deleted: false,
    created_at: "base-original",
    updated_at: "base-original",
  }));
  const masterEmployees = [...groupBy(timeRows.filter((row) => row.funcionario), (row) => `${row.funcionario}|${row.cargo || ""}`).entries()]
    .map(([key, rows], index) => {
      const [name, cargo] = key.split("|");
      return { id: `emp_${index + 1}`, code: name, name, cargo, status: "active", source: "excel" };
    });
  const masterJobRoles = unique(timeRows, "cargo").map((name, index) => ({ id: `cargo_${index + 1}`, code: name, name, status: "active", source: "excel" }));
  const masterProcesses = unique(timeRows, "processo").map((name, index) => ({ id: `proc_${index + 1}`, code: name, name, status: "active", source: "excel" }));
  const masterBlocks = unique([...timeRows, ...productionRows], "bloco").map((name, index) => ({ id: `bloco_${index + 1}`, code: name, name: `Bloco ${name}`, status: "active", source: "excel" }));
  const masterSurveyors = unique(timeRows, "apurador").map((name, index) => ({ id: `apurador_${index + 1}`, code: name, name, status: "active", source: "excel" }));

  return {
    version: 1,
    loaded_at: new Date().toISOString(),
    users: [{
      id: "user_admin",
      email: "admin@oficina.local",
      password: "admin123",
      role: "admin",
      profileMode: "developer",
      status: "approved",
      name: "Administrador local",
      reason: "Usuario inicial do prototipo local.",
      created_at: "base-original",
      approved_at: "base-original",
      approved_by: "system",
    }],
    timeRows,
    productionRows,
    classifications: SOURCE_DATA.catalog || [],
    masterEmployees,
    masterJobRoles,
    masterProcesses,
    masterBlocks,
    masterSurveyors,
    importBatches: [{
      id: "batch_original",
      file_name: SOURCE_DATA.metadata?.source || "Oficina Estratificacao.xlsx",
      type: "base_original",
      status: "completed",
      total_rows: timeRows.length + productionRows.length,
      imported_rows: timeRows.length + productionRows.length,
      rejected_rows: 0,
      created_at: "base-original",
    }],
    fieldSessions: [],
    auditLogs: [{
      id: uid("audit"),
      event: "base_inicial_carregada",
      entity: "system",
      entity_id: "base_original",
      user_email: "admin@oficina.local",
      details: "Base original carregada no armazenamento local.",
      created_at: new Date().toISOString(),
    }],
    actionItems: [],
    exportJobs: [],
  };
}

function loadDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return buildInitialDb();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.version) return buildInitialDb();
    parsed.fieldSessions ||= [];
    parsed.actionItems ||= [];
    parsed.exportJobs ||= [];
    parsed.auditLogs ||= [];
    parsed.users ||= buildInitialDb().users;
    parsed.users = parsed.users.map((user, index) => ({
      id: user.id || `user_${index + 1}`,
      email: user.email,
      password: user.password || (user.email === "admin@oficina.local" ? "admin123" : ""),
      role: user.role || (user.email === "admin@oficina.local" ? "admin" : "user"),
      profileMode: user.profileMode || (user.role === "admin" ? "developer" : "client"),
      status: user.status || "approved",
      name: user.name || user.email,
      reason: user.reason || "",
      created_at: user.created_at || "base-original",
      approved_at: user.approved_at || "",
      approved_by: user.approved_by || "",
    }));
    parsed.masterEmployees ||= [...groupBy((parsed.timeRows || []).filter((row) => row.funcionario), (row) => `${row.funcionario}|${row.cargo || ""}`).entries()]
      .map(([key, rows], index) => {
        const [name, cargo] = key.split("|");
        return { id: `emp_${index + 1}`, code: name, name, cargo, status: "active", source: "excel" };
      });
    parsed.masterJobRoles ||= unique(parsed.timeRows || [], "cargo").map((name, index) => ({ id: `cargo_${index + 1}`, code: name, name, status: "active", source: "excel" }));
    parsed.masterProcesses ||= unique(parsed.timeRows || [], "processo").map((name, index) => ({ id: `proc_${index + 1}`, code: name, name, status: "active", source: "excel" }));
    parsed.masterBlocks ||= unique([...(parsed.timeRows || []), ...(parsed.productionRows || [])], "bloco").map((name, index) => ({ id: `bloco_${index + 1}`, code: name, name: `Bloco ${name}`, status: "active", source: "excel" }));
    parsed.masterSurveyors ||= unique(parsed.timeRows || [], "apurador").map((name, index) => ({ id: `apurador_${index + 1}`, code: name, name, status: "active", source: "excel" }));
    return parsed;
  } catch {
    return buildInitialDb();
  }
}

function saveDb() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
}

function audit(event, entity, entityId, details) {
  state.db.auditLogs.unshift({
    id: uid("audit"),
    event,
    entity,
    entity_id: entityId,
    user_email: state.currentUser?.email || "admin@oficina.local",
    details,
    created_at: new Date().toISOString(),
  });
  state.db.auditLogs = state.db.auditLogs.slice(0, 500);
}

function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2600);
}

function activeRows(kind) {
  return state.db[kind].filter((row) => !row.deleted);
}

function allDates() {
  const dates = [
    ...activeRows("timeRows").map((row) => row.date),
    ...activeRows("productionRows").map((row) => row.date),
  ].filter(Boolean).sort();
  return { min: dates[0] || todayIso(), max: dates.at(-1) || todayIso() };
}

function selectedValues(id) {
  return [...$(`#${id}`).selectedOptions].map((option) => option.value).filter(Boolean);
}

function getFilters() {
  return {
    start: $("#startDate").value,
    end: $("#endDate").value,
    id1: selectedValues("filterId1"),
    id2: selectedValues("filterId2"),
    funcionario: selectedValues("filterFuncionario"),
    cargo: selectedValues("filterCargo"),
    bloco: selectedValues("filterBloco"),
    apurador: selectedValues("filterApurador"),
    qsUnit: $("#qsUnit")?.value || "qtde",
    search: normalizeText($("#globalSearch").value),
  };
}

function inPeriod(date, filters) {
  if (!date) return false;
  return (!filters.start || date >= filters.start) && (!filters.end || date <= filters.end);
}

function includesSelection(rowValue, values) {
  if (!values.length) return true;
  return values.includes(String(rowValue ?? ""));
}

function rowText(row) {
  return normalizeText(Object.values(row).join(" "));
}

function filteredTimeRows(filters = getFilters()) {
  return activeRows("timeRows").filter((row) => (
    inPeriod(row.date, filters) &&
    includesSelection(row.id1, filters.id1) &&
    includesSelection(row.id2, filters.id2) &&
    includesSelection(row.funcionario, filters.funcionario) &&
    includesSelection(row.cargo, filters.cargo) &&
    includesSelection(row.bloco, filters.bloco) &&
    includesSelection(row.apurador, filters.apurador) &&
    (!filters.search || rowText(row).includes(filters.search))
  ));
}

function filteredProductionRows(filters = getFilters()) {
  return activeRows("productionRows").filter((row) => (
    inPeriod(row.date, filters) &&
    includesSelection(row.bloco, filters.bloco) &&
    (!filters.search || rowText(row).includes(filters.search))
  ));
}

function computeMetrics(filters = getFilters()) {
  const timeRows = filteredTimeRows(filters);
  const productionRows = filteredProductionRows(filters);
  const hh = sum(timeRows, "hh");
  const qsField = filters.qsUnit === "peso_tn" ? "peso_tn" : "qtde";
  const qs = sum(productionRows, qsField);
  const rup = qs ? hh / qs : null;

  const dates = [...new Set([
    ...timeRows.map((row) => row.date),
    ...productionRows.map((row) => row.date),
  ])].sort();

  const timeByDate = groupBy(timeRows, (row) => row.date);
  const qsByDate = groupBy(productionRows, (row) => row.date);
  let cumHh = 0;
  let cumQs = 0;
  const daily = dates.map((date) => {
    const dayHh = sum(timeByDate.get(date) || [], "hh");
    const dayQs = sum(qsByDate.get(date) || [], qsField);
    cumHh += dayHh;
    cumQs += dayQs;
    return {
      date,
      hh: dayHh,
      qs: dayQs,
      rup: dayQs ? dayHh / dayQs : null,
      cum_hh: cumHh,
      cum_qs: cumQs,
      rup_cum: cumQs ? cumHh / cumQs : null,
    };
  });

  const validRups = daily.map((row) => row.rup).filter((value) => Number.isFinite(value) && value > 0);
  const averageRup = validRups.length ? validRups.reduce((a, b) => a + b, 0) / validRups.length : null;
  const potential = averageRup ? median(validRups.filter((value) => value < averageRup)) : null;

  const id1Distribution = [...groupBy(timeRows, (row) => row.id1 || "Sem ID1").entries()]
    .map(([id1, rows]) => ({ id1, hh: sum(rows, "hh"), count: rows.length }))
    .sort((a, b) => b.hh - a.hh);

  const id2Pareto = [...groupBy(timeRows, (row) => `${row.id1 || ""}|${row.id2 || "Sem ID2"}|${row.id2_desc || ""}`).entries()]
    .map(([key, rows]) => {
      const [id1, id2, desc] = key.split("|");
      return { id1, id2, desc, hh: sum(rows, "hh"), count: rows.length };
    })
    .sort((a, b) => b.hh - a.hh);
  let acc = 0;
  id2Pareto.forEach((row) => {
    acc += row.hh;
    row.share = hh ? row.hh / hh : 0;
    row.accShare = hh ? acc / hh : 0;
  });

  const espera = id1Distribution.find((row) => normalizeText(row.id1) === "ESPERA")?.hh || 0;
  const paral = id1Distribution.find((row) => normalizeText(row.id1) === "PARALISACAO")?.hh || 0;

  return { filters, timeRows, productionRows, hh, qs, rup, potential, daily, id1Distribution, id2Pareto, espera, paral };
}

function setPage(page) {
  if (!pageAllowed(page)) page = allowedPages()[0] || "home";
  state.page = page;
  syncNavigation();
  if (page === "usuarios" && supabaseReady() && isDeveloperUser()) {
    fetchSupabaseProfiles()
      .then(() => {
        if (state.page === "usuarios") render();
      })
      .catch((error) => toast(error.message || "Nao foi possivel atualizar usuarios."));
  }
  render();
  $("#appMain").focus();
}

function fillSelect(id, values) {
  const current = selectedValues(id);
  $(`#${id}`).innerHTML = `<option value="">Todos</option>` + values.map((value) => (
    `<option value="${escapeHtml(value)}" ${current.includes(value) ? "selected" : ""}>${escapeHtml(value)}</option>`
  )).join("");
}

function populateFilters() {
  const { min, max } = allDates();
  $("#startDate").min = min;
  $("#startDate").max = max;
  $("#endDate").min = min;
  $("#endDate").max = max;
  if (!$("#startDate").value) $("#startDate").value = min;
  if (!$("#endDate").value) $("#endDate").value = max;
  fillSelect("filterId1", unique(activeRows("timeRows"), "id1"));
  const activeId1 = selectedValues("filterId1");
  const id2Source = activeId1.length ? activeRows("timeRows").filter((row) => activeId1.includes(row.id1)) : activeRows("timeRows");
  fillSelect("filterId2", unique(id2Source, "id2"));
  fillSelect("filterFuncionario", unique(activeRows("timeRows"), "funcionario"));
  fillSelect("filterCargo", unique(activeRows("timeRows"), "cargo"));
  fillSelect("filterBloco", unique([...activeRows("timeRows"), ...activeRows("productionRows")], "bloco"));
  fillSelect("filterApurador", unique(activeRows("timeRows"), "apurador"));
}

function applyPreset(preset) {
  const { min, max } = allDates();
  if (preset === "all") {
    $("#startDate").value = min;
    $("#endDate").value = max;
  }
  if (preset === "yesterday") {
    $("#startDate").value = max;
    $("#endDate").value = max;
  }
  if (preset === "current-week") {
    const start = startOfWeek(max);
    $("#startDate").value = start < min ? min : start;
    $("#endDate").value = max;
  }
  if (preset === "last-week") {
    const currentStart = startOfWeek(max);
    const lastStart = addDays(currentStart, -7);
    const lastEnd = addDays(currentStart, -1);
    $("#startDate").value = lastStart < min ? min : lastStart;
    $("#endDate").value = lastEnd > max ? max : lastEnd;
  }
}

const ROLE_PAGES = {
  developer: ["home", "campo", "cadastros", "usuarios", "perfil"],
  client: ["home", "perfil"],
  apurador: ["home", "campo", "perfil"],
};

const FILTER_PAGES = ["home"];

function allowedPages() {
  return ROLE_PAGES[state.profileMode] || ROLE_PAGES.developer;
}

function isDeveloperUser() {
  return state.currentUser?.profileMode === "developer" || state.currentUser?.role === "admin";
}

function pageAllowed(page) {
  return allowedPages().includes(page);
}

function syncNavigation() {
  $$("#sideNav button").forEach((button) => {
    const allowed = pageAllowed(button.dataset.page);
    button.classList.toggle("hidden", !allowed);
    button.classList.toggle("active", button.dataset.page === state.page);
  });
  if ($("#profileMode")) $("#profileMode").value = state.profileMode;
  $(".profile-switch")?.classList.toggle("hidden", !isDeveloperUser());
  if (!pageAllowed(state.page)) state.page = allowedPages()[0] || "home";
}

function syncFilterVisibility() {
  const panel = $("#globalFilters");
  if (!panel) return;
  panel.classList.toggle("hidden", !FILTER_PAGES.includes(state.page));
}

function renderKpis(metrics) {
  return `
    <section class="kpi-grid">
      ${kpi("Hh total", fmt.format(metrics.hh), `${fmt0.format(metrics.timeRows.length)} apontamentos`)}
      ${kpi("QS total", fmt0.format(metrics.qs), `${fmt0.format(metrics.productionRows.length)} registros QS`)}
      ${kpi("RUP acumulada", metrics.rup ? fmt.format(metrics.rup) : "-", "Hh / peca")}
      ${kpi("RUP potencial", metrics.potential ? fmt.format(metrics.potential) : "-", "mediana abaixo da media")}
      ${kpi("Espera", fmt.format(metrics.espera), metrics.hh ? pct.format(metrics.espera / metrics.hh) : "0,0%")}
      ${kpi("Paralisacao", fmt.format(metrics.paral), metrics.hh ? pct.format(metrics.paral / metrics.hh) : "0,0%")}
    </section>
  `;
}

function kpi(label, value, foot) {
  return `
    <article class="kpi-card">
      <p class="kpi-label">${escapeHtml(label)}</p>
      <p class="kpi-value">${escapeHtml(value)}</p>
      <p class="kpi-foot">${escapeHtml(foot)}</p>
    </article>
  `;
}

function lineChart(daily, potential) {
  if (!daily.length) return empty("Sem dados para o periodo filtrado.");
  const width = 640;
  const height = 240;
  const pad = { l: 42, r: 20, t: 18, b: 34 };
  const values = daily.flatMap((row) => [row.rup, row.rup_cum]).filter((value) => Number.isFinite(value));
  if (potential) values.push(potential);
  const max = Math.max(...values, 1);
  const x = (i) => pad.l + (daily.length === 1 ? 0 : i * ((width - pad.l - pad.r) / (daily.length - 1)));
  const y = (value) => height - pad.b - ((value || 0) / max) * (height - pad.t - pad.b);
  const path = (key) => daily.map((row, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(row[key]).toFixed(1)}`).join(" ");
  const potentialY = potential ? y(potential) : null;
  return `
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="RUP diaria, acumulada e potencial">
      ${[0, 0.25, 0.5, 0.75, 1].map((p) => {
        const yy = pad.t + p * (height - pad.t - pad.b);
        const label = fmt.format(max * (1 - p));
        return `<line class="grid-line" x1="${pad.l}" x2="${width - pad.r}" y1="${yy}" y2="${yy}"></line><text x="4" y="${yy + 4}">${label}</text>`;
      }).join("")}
      <path d="${path("rup")}" fill="none" stroke="#cf514a" stroke-width="3"></path>
      <path d="${path("rup_cum")}" fill="none" stroke="#0f8b8d" stroke-width="3"></path>
      ${potentialY ? `<line x1="${pad.l}" x2="${width - pad.r}" y1="${potentialY}" y2="${potentialY}" stroke="#d79722" stroke-width="2" stroke-dasharray="7 5"></line>` : ""}
      ${daily.map((row, i) => `<circle cx="${x(i)}" cy="${y(row.rup || 0)}" r="3" fill="#cf514a"><title>${formatDate(row.date)} RUP ${row.rup ? fmt.format(row.rup) : "-"}</title></circle>`).join("")}
      <text x="${pad.l}" y="${height - 9}">Inicio</text>
      <text x="${width - 82}" y="${height - 9}">Fim</text>
      <text x="${width - 230}" y="16">RUP diaria</text>
      <text x="${width - 145}" y="16">RUP acum.</text>
      <text x="${width - 65}" y="16">Potencial</text>
    </svg>
  `;
}

function barChart(rows, labelKey, valueKey, colorFn) {
  if (!rows.length) return empty("Sem dados para exibir.");
  const topRows = rows.slice(0, 10);
  const width = 640;
  const height = 260;
  const pad = { l: 140, r: 34, t: 14, b: 22 };
  const max = Math.max(...topRows.map((row) => Number(row[valueKey]) || 0), 1);
  const barH = (height - pad.t - pad.b) / topRows.length - 8;
  return `
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Barras ordenadas">
      ${topRows.map((row, i) => {
        const y = pad.t + i * (barH + 8);
        const w = ((Number(row[valueKey]) || 0) / max) * (width - pad.l - pad.r);
        const color = colorFn ? colorFn(row) : "#0f8b8d";
        const filterAttr = ["id1", "id2"].includes(labelKey) ? `data-chart-filter="${labelKey}" data-chart-value="${escapeHtml(String(row[labelKey]))}"` : "";
        return `
          <text x="4" y="${y + barH * 0.7}">${escapeHtml(String(row[labelKey]).slice(0, 18))}</text>
          <rect class="chart-clickable" ${filterAttr} x="${pad.l}" y="${y}" width="${w}" height="${barH}" rx="4" fill="${color}"></rect>
          <text x="${pad.l + w + 6}" y="${y + barH * 0.7}">${fmt.format(row[valueKey])}</text>
        `;
      }).join("")}
    </svg>
  `;
}

function qsChart(daily) {
  const rows = daily.filter((row) => row.qs > 0);
  return barChart(rows.map((row) => ({ label: formatDate(row.date), qs: row.qs })), "label", "qs", () => "#34699a");
}

function donutChart(rows, total) {
  if (!rows.length || !total) return empty("Sem dados para compor a pizza.");
  let start = 0;
  const stops = rows.map((row) => {
    const share = total ? row.hh / total : 0;
    const end = start + share * 360;
    const color = id1Color(row.id1);
    const part = `${color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
    start = end;
    return part;
  }).join(", ");
  return `
    <div class="donut-layout">
      <div class="donut" style="background: conic-gradient(${stops});">
        <div><span>% Hh</span><strong>${fmt.format(total)}</strong></div>
      </div>
      <div class="donut-legend">
        ${rows.map((row) => `
          <button type="button" data-chart-filter="id1" data-chart-value="${escapeHtml(row.id1)}">
            <span style="background:${id1Color(row.id1)}"></span>
            <strong>${escapeHtml(row.id1)}</strong>
            <em>${pct.format(total ? row.hh / total : 0)}</em>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function id1Color(id1) {
  return ID1_COLORS[normalizeText(id1)] || "#7d8a99";
}

function empty(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function pageHeader(title, description, actions = "") {
  return `
    <div class="section-title">
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="row-actions">${actions}</div>
    </div>
  `;
}

function renderHome(metrics) {
  return `
    ${renderKpis(metrics)}
    <section class="grid cols-2" style="margin-top:14px">
      <article class="card">
        ${pageHeader("RUP diaria, acumulada e potencial", "Atualiza automaticamente com filtros e novos registros.")}
        ${lineChart(metrics.daily, metrics.potential)}
      </article>
      <article class="card">
        ${pageHeader("Pizza de % Hh por categoria (ID1)", "Clique em uma categoria para filtrar o dashboard.")}
        ${donutChart(metrics.id1Distribution, metrics.hh)}
      </article>
      <article class="card">
        ${pageHeader("RUP por categoria (ID1)", "Hh por categoria para estratificar a produtividade.")}
        ${barChart(metrics.id1Distribution, "id1", "hh", (row) => id1Color(row.id1))}
      </article>
      <article class="card">
        ${pageHeader("Pareto de subcausas (ID2)", "Clique em uma subcausa para filtrar os demais graficos.")}
        ${barChart(metrics.id2Pareto.slice(0, 12), "id2", "hh", () => "#d79722")}
      </article>
      <article class="card">
        ${pageHeader("Producao (QS)", "Pecas por data, vindas da base QS.")}
        ${qsChart(metrics.daily)}
      </article>
    </section>
    <section class="table-card" style="margin-top:14px">
      ${pageHeader("Drill-down ID2", "Ranking detalhado das causas filtradas.")}
      ${renderParetoTable(metrics.id2Pareto)}
    </section>
  `;
}

function renderParetoTable(rows) {
  if (!rows.length) return empty("Sem registros para os filtros atuais.");
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID1</th><th>ID2</th><th>Significado</th><th>Hh</th><th>% Hh</th><th>% acum.</th><th>Ocorrencias</th></tr></thead>
        <tbody>
          ${rows.slice(0, 80).map((row) => `
            <tr>
              <td>${escapeHtml(row.id1)}</td>
              <td>${escapeHtml(row.id2)}</td>
              <td>${escapeHtml(row.desc)}</td>
              <td>${fmt.format(row.hh)}</td>
              <td>${pct.format(row.share || 0)}</td>
              <td>${pct.format(row.accShare || 0)}</td>
              <td>${fmt0.format(row.count)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function optionList(values, selected = "") {
  return values.map((value) => `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(value)}</option>`).join("");
}

function timeToSeconds(value) {
  if (!value) return null;
  const [h, m, s = 0] = String(value).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null;
  return h * 3600 + m * 60 + s;
}

function minutesToHours(startTime, endTime) {
  const start = timeToSeconds(startTime);
  let end = timeToSeconds(endTime);
  if (start === null || end === null) return null;
  if (end < start) end += 24 * 3600;
  if (end === start) return null;
  return (end - start) / 3600;
}

function elapsedSeconds(startTime, endTime = currentTimeValue()) {
  const start = timeToSeconds(startTime);
  let end = timeToSeconds(endTime);
  if (start === null || end === null) return 0;
  if (end < start) end += 24 * 3600;
  return Math.max(0, end - start);
}

function formatElapsedSeconds(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hours ? `${hours}h ${pad2(mins)}min ${pad2(secs)}s` : `${mins}min ${pad2(secs)}s`;
}

function employeeCatalog() {
  const map = new Map();
  (state.db.masterEmployees || []).forEach((row) => {
    if (!row.name || row.status === "inactive") return;
    const key = `${row.name}|${row.cargo || ""}`;
    map.set(key, { funcionario: row.name, cargo: row.cargo || "" });
  });
  activeRows("timeRows").forEach((row) => {
    if (!row.funcionario) return;
    const key = `${row.funcionario}|${row.cargo || ""}`;
    if (!map.has(key)) map.set(key, { funcionario: row.funcionario, cargo: row.cargo || "" });
  });
  return [...map.values()].sort((a, b) => a.funcionario.localeCompare(b.funcionario, "pt-BR"));
}

function parseManualTeam(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [funcionario, cargo = ""] = line.split("|").map((part) => part.trim());
      return { funcionario, cargo };
    })
    .filter((member) => member.funcionario);
}

function selectedTeamFromForm(form) {
  const catalog = employeeCatalog();
  const selected = [...(form.elements.team_existing?.selectedOptions || [])]
    .map((option) => catalog.find((member) => `${member.funcionario}|${member.cargo}` === option.value))
    .filter(Boolean);
  const manual = parseManualTeam(form.elements.team_manual?.value);
  const byName = new Map();
  [...selected, ...manual].forEach((member) => {
    const key = normalizeText(`${member.funcionario}|${member.cargo}`);
    if (!byName.has(key)) byName.set(key, member);
  });
  return [...byName.values()];
}

function activeFieldSession() {
  return state.db.fieldSessions.find((session) => session.status === "active") || null;
}

function memberKey(member) {
  return normalizeText(`${member.funcionario}|${member.cargo || ""}`);
}

function id2RowsForId1(id1) {
  return state.db.classifications
    .filter((row) => !id1 || normalizeText(row.id1) === normalizeText(id1))
    .sort((a, b) => String(a.id2).localeCompare(String(b.id2), "pt-BR"));
}

function id2OptionsForId1(id1, selected = "") {
  const rows = id2RowsForId1(id1);
  return `<option value="">Selecione</option>${rows.map((row) => `<option value="${escapeHtml(row.id2)}" ${String(row.id2) === String(selected) ? "selected" : ""}>${escapeHtml(row.id2)} - ${escapeHtml(row.significado || "")}</option>`).join("")}`;
}

function ensureMemberActivityState(session) {
  session.openByMember ||= {};
  if (session.currentActivity && !Object.keys(session.openByMember).length) {
    session.team.forEach((member) => {
      session.openByMember[memberKey(member)] = { ...session.currentActivity };
    });
    session.currentActivity = null;
  }
}

function launchRowsForActivity(session, endTime, closeReason) {
  if (!session?.currentActivity) return { created: 0, hhEach: 0 };
  const hhEach = minutesToHours(session.currentActivity.start_time, endTime);
  if (!hhEach) return { created: 0, hhEach: 0 };
  const now = new Date().toISOString();
  const id2Desc = state.db.classifications.find((row) => row.id2 === session.currentActivity.id2)?.significado || "";
  session.team.forEach((member) => {
    state.db.timeRows.push({
      id: uid("time"),
      date: session.date,
      id1: session.currentActivity.id1,
      id2: session.currentActivity.id2,
      id2_desc: id2Desc,
      hh: Number(hhEach.toFixed(3)),
      funcionario: member.funcionario,
      cargo: member.cargo || "",
      apurador: session.apurador,
      bloco: session.bloco,
      processo: session.processo,
      comentario: session.currentActivity.comentario || "",
      hora_inicio: session.currentActivity.start_time,
      hora_termino: endTime,
      origem: "campo",
      status: closeReason === "encerramento" ? "enviado" : "enviado",
      field_session_id: session.id,
      deleted: false,
      created_at: now,
      updated_at: now,
    });
  });
  session.activities ||= [];
  session.activities.push({
    ...session.currentActivity,
    end_time: endTime,
    hh_each: Number(hhEach.toFixed(3)),
    team_size: session.team.length,
    created_at: now,
  });
  audit("atividade_aferida", "field_sessions", session.id, `${session.team.length} apontamentos gerados de ${session.currentActivity.start_time} a ${endTime}.`);
  return { created: session.team.length, hhEach };
}

function closeMemberActivity(session, member, endTime, closeReason = "troca") {
  ensureMemberActivityState(session);
  const key = memberKey(member);
  const open = session.openByMember[key];
  if (!open) return { created: 0, hh: 0 };
  const hh = minutesToHours(open.start_time, endTime);
  if (!hh) return { created: 0, hh: 0 };
  const now = new Date().toISOString();
  const id2Desc = state.db.classifications.find((row) => row.id2 === open.id2 && row.id1 === open.id1)?.significado || "";
  state.db.timeRows.push({
    id: uid("time"),
    date: session.date,
    id1: open.id1,
    id2: open.id2,
    id2_desc: id2Desc,
    hh: Number(hh.toFixed(4)),
    funcionario: member.funcionario,
    cargo: member.cargo || "",
    apurador: session.apurador,
    bloco: session.bloco,
    processo: session.processo,
    comentario: open.comentario || id2Desc || "",
    hora_inicio: open.start_time,
    hora_termino: endTime,
    origem: "campo",
    status: closeReason === "encerramento" ? "enviado" : "enviado",
    field_session_id: session.id,
    deleted: false,
    created_at: now,
    updated_at: now,
  });
  session.activities ||= [];
  session.activities.push({
    ...open,
    funcionario: member.funcionario,
    cargo: member.cargo || "",
    end_time: endTime,
    hh_each: Number(hh.toFixed(4)),
    team_size: 1,
    created_at: now,
  });
  audit("atividade_aferida", "field_sessions", session.id, `${member.funcionario}: ${open.id1}/${open.id2} de ${open.start_time} a ${endTime}.`);
  return { created: 1, hh };
}

function setMemberActivity(session, memberKeyValue, id1, id2, comentario = "") {
  ensureMemberActivityState(session);
  const member = session.team.find((item) => memberKey(item) === memberKeyValue);
  if (!member || !id1 || !id2) return { created: 0, hh: 0, skipped: true };
  const current = session.openByMember[memberKeyValue];
  if (current?.id1 === id1 && current?.id2 === id2 && (current.comentario || "") === (comentario || "")) {
    return { created: 0, hh: 0, skipped: true };
  }
  const nowTime = currentTimeValue();
  const result = closeMemberActivity(session, member, nowTime, "troca");
  session.openByMember[memberKeyValue] = {
    start_time: nowTime,
    id1,
    id2,
    comentario: comentario || "",
  };
  return result;
}

function timeForm(row = {}, formId = "timeForm") {
  const id1Values = unique(activeRows("timeRows").concat(state.db.classifications), "id1");
  const id2Values = unique(activeRows("timeRows").concat(state.db.classifications), "id2");
  const defaultDate = row.date || allDates().max;
  return `
    <form id="${formId}" class="form-grid">
      <label>Data <input name="date" type="date" value="${escapeHtml(defaultDate)}" required></label>
      <label>Processo <input name="processo" value="${escapeHtml(row.processo || "M-EM MODULOS")}" required></label>
      <label>Funcionario <input name="funcionario" value="${escapeHtml(row.funcionario || "")}" required></label>
      <label>Cargo <input name="cargo" value="${escapeHtml(row.cargo || "")}" required></label>
      <label>Apurador <input name="apurador" value="${escapeHtml(row.apurador || "")}" required></label>
      <label>Bloco <input name="bloco" value="${escapeHtml(row.bloco || "1")}" required></label>
      <label>ID1 <select name="id1" required>${optionList(id1Values, row.id1 || id1Values[0] || "")}</select></label>
      <label>ID2 <select name="id2" required>${optionList(id2Values, row.id2 || "")}</select></label>
      <label>Hh <input name="hh" type="number" step="0.001" min="0" value="${escapeHtml(row.hh ?? "")}" required></label>
      <label>Status <select name="status">${optionList(STATUS, row.status || "validado")}</select></label>
      <label class="wide">Comentario <input name="comentario" value="${escapeHtml(row.comentario || "")}"></label>
      <div class="full row-actions">
        <button class="primary-button" type="submit">${icon("save")}${state.editingTimeId ? "Salvar alteracao" : "Criar apontamento"}</button>
        ${state.editingTimeId ? `<button class="ghost-button" data-cancel-edit="time" type="button">${icon("close")}Cancelar</button>` : ""}
      </div>
    </form>
  `;
}

function productionForm(row = {}, formId = "productionForm") {
  const defaultDate = row.date || allDates().max;
  return `
    <form id="${formId}" class="form-grid">
      <label>Data <input name="date" type="date" value="${escapeHtml(defaultDate)}" required></label>
      <label>Quantidade QS <input name="qtde" type="number" step="1" min="0" value="${escapeHtml(row.qtde ?? "")}" required></label>
      <label>TAG <input name="tag" value="${escapeHtml(row.tag || "")}" required></label>
      <label>Tipo <input name="tipo" value="${escapeHtml(row.tipo || "VIGA")}" required></label>
      <label>Bloco <input name="bloco" value="${escapeHtml(row.bloco || "1")}" required></label>
      <label>Peso tn <input name="peso_tn" type="number" step="0.001" min="0" value="${escapeHtml(row.peso_tn ?? 0)}"></label>
      <div class="full row-actions">
        <button class="primary-button" type="submit">${icon("save")}${state.editingProductionId ? "Salvar QS" : "Criar QS"}</button>
        ${state.editingProductionId ? `<button class="ghost-button" data-cancel-edit="production" type="button">${icon("close")}Cancelar</button>` : ""}
      </div>
    </form>
  `;
}

function renderDados(metrics) {
  return `
    <div class="tabs">
      <button class="${state.dataTab === "time" ? "active" : ""}" data-tab="time" type="button">Apontamentos</button>
      <button class="${state.dataTab === "qs" ? "active" : ""}" data-tab="qs" type="button">Producao QS</button>
    </div>
    ${state.dataTab === "time" ? `
      <section class="card">
        ${pageHeader("Novo apontamento", "Cadastro manual atualiza o dashboard imediatamente.")}
        ${timeForm({})}
      </section>
      <section class="table-card" style="margin-top:14px">
        ${pageHeader("Apontamentos filtrados", `${metrics.timeRows.length} registros ativos.`)}
        ${renderTimeTable(metrics.timeRows)}
      </section>
    ` : `
      <section class="card">
        ${pageHeader("Nova producao QS", "QS alimenta o denominador da RUP.")}
        ${productionForm({})}
      </section>
      <section class="table-card" style="margin-top:14px">
        ${pageHeader("Producao filtrada", `${metrics.productionRows.length} registros ativos.`)}
        ${renderProductionTable(metrics.productionRows)}
      </section>
    `}
  `;
}

function renderTimeTable(rows, limit = 150) {
  if (!rows.length) return empty("Nenhum apontamento encontrado.");
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>ID1</th><th>ID2</th><th>Funcionario</th><th>Cargo</th><th>Bloco</th><th>Hh</th><th>Status</th><th>Acoes</th></tr></thead>
        <tbody>
          ${rows.slice(0, limit).map((row) => `
            <tr>
              <td>${formatDate(row.date)}</td>
              <td>${escapeHtml(row.id1)}</td>
              <td>${escapeHtml(row.id2)}</td>
              <td>${escapeHtml(row.funcionario)}</td>
              <td>${escapeHtml(row.cargo)}</td>
              <td>${escapeHtml(row.bloco)}</td>
              <td>${fmt.format(row.hh)}</td>
              <td><span class="tag">${escapeHtml(row.status)}</span></td>
              <td class="row-actions">
                <button class="small-button" data-edit-time="${row.id}" type="button">${icon("edit")}Editar</button>
                <button class="small-button" data-duplicate-time="${row.id}" type="button">${icon("copy")}Duplicar</button>
                <button class="small-button" data-delete-time="${row.id}" type="button">${icon("trash")}Excluir</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ${rows.length > limit ? `<p class="muted">Mostrando ${limit} de ${rows.length} registros filtrados.</p>` : ""}
  `;
}

function renderProductionTable(rows, limit = 150) {
  if (!rows.length) return empty("Nenhuma producao QS encontrada.");
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>TAG</th><th>Tipo</th><th>Bloco</th><th>QS</th><th>Peso tn</th><th>Status</th><th>Acoes</th></tr></thead>
        <tbody>
          ${rows.slice(0, limit).map((row) => `
            <tr>
              <td>${formatDate(row.date)}</td>
              <td>${escapeHtml(row.tag)}</td>
              <td>${escapeHtml(row.tipo)}</td>
              <td>${escapeHtml(row.bloco)}</td>
              <td>${fmt0.format(row.qtde)}</td>
              <td>${fmt.format(row.peso_tn || 0)}</td>
              <td><span class="tag">${escapeHtml(row.status)}</span></td>
              <td class="row-actions">
                <button class="small-button" data-edit-production="${row.id}" type="button">${icon("edit")}Editar</button>
                <button class="small-button" data-delete-production="${row.id}" type="button">${icon("trash")}Excluir</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ${rows.length > limit ? `<p class="muted">Mostrando ${limit} de ${rows.length} registros filtrados.</p>` : ""}
  `;
}

function renderCampo() {
  return renderCampoV2();
}

function renderCampoV2() {
  const session = activeFieldSession();
  const catalog = employeeCatalog();
  const id1Values = unique(activeRows("timeRows").concat(state.db.classifications), "id1");
  const processOptions = uniqueValues([
    ...unique(activeRows("timeRows"), "processo"),
    ...(state.db.masterProcesses || []).map((row) => row.name || row.code),
  ]);
  const blockOptions = uniqueValues([
    ...unique([...activeRows("timeRows"), ...activeRows("productionRows")], "bloco"),
    ...(state.db.masterBlocks || []).map((row) => row.code || row.name),
  ]);
  const surveyorOptions = uniqueValues([
    ...unique(activeRows("timeRows"), "apurador"),
    ...(state.db.masterSurveyors || []).map((row) => row.name || row.code),
  ]);
  const nowDate = todayIso();
  const nowTime = currentTimeValue();
  if (session) ensureMemberActivityState(session);
  const openCount = session ? Object.keys(session.openByMember || {}).length : 0;
  return `
    <section class="stacked-flow">
      <article class="card">
        ${pageHeader("Sessao de Afericao", "Monte a equipe. Cada colaborador passa a ter sua propria atividade aberta.")}
        ${session ? `
          <div class="field-session-summary">
            <div><span class="muted">Aferidor</span><strong>${escapeHtml(session.apurador)}</strong></div>
            <div><span class="muted">Inicio</span><strong>${formatDate(session.date)} ${escapeHtml(session.start_time)}</strong></div>
            <div><span class="muted">Equipe</span><strong>${session.team.length} pessoas</strong></div>
            <div><span class="muted">Atividades abertas</span><strong>${fmt0.format(openCount)}</strong></div>
            <div><span class="muted">Relogio</span><strong data-live-clock>${escapeHtml(nowTime)}</strong></div>
            <div><span class="muted">Modelo</span><strong>Por colaborador</strong></div>
          </div>
          <div class="team-list">
            ${session.team.map((member) => `<span class="tag">${escapeHtml(member.funcionario)}${member.cargo ? ` - ${escapeHtml(member.cargo)}` : ""}</span>`).join("")}
          </div>
          <div class="row-actions" style="margin-top:12px">
            <button class="secondary-button" id="finishFieldSession" type="button">${icon("check")}Encerrar turno agora</button>
            <button class="secondary-button" id="exportExcel" type="button">${icon("export")}Exportar Excel</button>
            <button class="ghost-button" id="cancelFieldSession" type="button">${icon("close")}Cancelar sessao</button>
          </div>
        ` : `
          <form id="fieldSessionForm" class="form-grid">
            <input name="date" type="hidden" value="${escapeHtml(nowDate)}">
            <input name="start_time" type="hidden" value="${escapeHtml(nowTime)}">
            <div class="field-now full">
              <span>Sessao inicia agora</span>
              <strong>${formatDate(nowDate)} ${escapeHtml(nowTime)}</strong>
            </div>
            <label>Processo
              <select name="processo" required>
                ${optionList(processOptions, processOptions.includes("M-EM MODULOS") ? "M-EM MODULOS" : processOptions[0])}
              </select>
            </label>
            <label>Bloco
              <select name="bloco" required>
                ${optionList(blockOptions, blockOptions.includes("1") ? "1" : blockOptions[0])}
              </select>
            </label>
            <label>Aferidor
              <select name="apurador" required>
                ${optionList(surveyorOptions, surveyorOptions[0])}
              </select>
            </label>
            <label class="full">Colaboradores da equipe vistoriada
              <select name="team_existing" multiple>
                ${catalog.map((member) => `<option value="${escapeHtml(`${member.funcionario}|${member.cargo}`)}">${escapeHtml(member.funcionario)}${member.cargo ? ` - ${escapeHtml(member.cargo)}` : ""}</option>`).join("")}
              </select>
            </label>
            <div class="full row-actions">
              <button class="primary-button" type="submit">${icon("plus")}Criar sessao e equipe</button>
              <button class="secondary-button" id="exportExcel" type="button">${icon("export")}Exportar Excel</button>
            </div>
          </form>
        `}
      </article>
      <article class="card">
        ${pageHeader("Registro em tempo real", "Trocar a atividade de um colaborador fecha o intervalo anterior no segundo atual.")}
        <div class="field-now">
          <span>Horario oficial da coleta</span>
          <strong data-live-clock>${escapeHtml(nowTime)}</strong>
        </div>
        <p class="muted">O ID1 filtra a lista de ID2. Ao aplicar uma nova atividade, somente o colaborador daquela linha e fechado e reaberto; os demais continuam contando normalmente.</p>
      </article>
    </section>
    ${session ? `
      <section class="field-board" style="margin-top:14px">
        ${session.team.map((member) => {
          const key = memberKey(member);
          const open = session.openByMember?.[key];
          const selectedId1 = open?.id1 || "";
          const elapsed = open ? formatElapsedSeconds(elapsedSeconds(open.start_time, nowTime)) : "-";
          return `
            <article class="field-member" data-member="${escapeHtml(key)}">
              <div class="field-member-head">
                <div>
                  <strong>${escapeHtml(member.funcionario)}</strong>
                  <span>${escapeHtml(member.cargo || "Sem cargo")}</span>
                </div>
                <span class="status-pill ${open ? "good" : "warn"}">${open ? "ativo" : "sem atividade"}</span>
              </div>
              <div class="field-member-current">
                <span>Atual</span>
                <strong>${open ? `${escapeHtml(open.id1)} / ${escapeHtml(open.id2)}` : "Nenhuma atividade aberta"}</strong>
                <small>${open ? `Desde ${escapeHtml(open.start_time)} - ` : ""}<span data-open-elapsed data-start-time="${escapeHtml(open?.start_time || "")}">${elapsed}</span></small>
              </div>
              <div class="field-member-controls">
                <label>ID1
                  <select data-member-id1="${escapeHtml(key)}">
                    <option value="">Selecione</option>
                    ${id1Values.map((id1) => `<option value="${escapeHtml(id1)}" ${id1 === selectedId1 ? "selected" : ""}>${escapeHtml(id1)}</option>`).join("")}
                  </select>
                </label>
                <label>ID2
                  <select data-member-id2="${escapeHtml(key)}">
                    ${id2OptionsForId1(selectedId1, open?.id2 || "")}
                  </select>
                </label>
                <label class="full">Comentario
                  <input data-member-comment="${escapeHtml(key)}" value="${escapeHtml(open?.comentario || "")}" placeholder="Opcional">
                </label>
              </div>
              <div class="row-actions">
                <button class="primary-button" data-apply-member="${escapeHtml(key)}" type="button">${icon("play")}Aplicar atividade agora</button>
                ${open ? `<button class="ghost-button" data-close-member="${escapeHtml(key)}" type="button">${icon("check")}Encerrar colaborador</button>` : ""}
              </div>
            </article>
          `;
        }).join("")}
      </section>
    ` : ""}
    <section class="table-card" style="margin-top:14px">
      ${pageHeader("Intervalos da sessao", "Historico fechado por colaborador.")}
      ${session?.activities?.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Funcionario</th><th>Inicio</th><th>Fim</th><th>ID1</th><th>ID2</th><th>Hh</th><th>Comentario</th></tr></thead>
            <tbody>
              ${session.activities.slice().reverse().map((activity) => `
                <tr>
                  <td>${escapeHtml(activity.funcionario || "")}</td>
                  <td>${escapeHtml(activity.start_time)}</td>
                  <td>${escapeHtml(activity.end_time)}</td>
                  <td>${escapeHtml(activity.id1)}</td>
                  <td>${escapeHtml(activity.id2)}</td>
                  <td>${fmt.format(activity.hh_each)}</td>
                  <td>${escapeHtml(activity.comentario || "")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : empty("Nenhum intervalo fechado ainda.")}
    </section>
    <section class="table-card" style="margin-top:14px">
      ${pageHeader("Ultimos registros gerados em campo", "Cada troca gera uma linha de Hh do colaborador alterado.")}
      ${renderTimeTable(activeRows("timeRows").filter((row) => row.origem === "campo").slice().reverse(), 80)}
    </section>
  `;
}

function renderValidacao() {
  const pending = activeRows("timeRows").filter((row) => ["rascunho", "enviado", "corrigido"].includes(row.status));
  return `
    <section class="table-card">
      ${pageHeader("Validacao e Ajustes", "Aprove, rejeite ou corrija registros antes de uso oficial.")}
      ${pending.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>ID1</th><th>ID2</th><th>Funcionario</th><th>Hh</th><th>Status</th><th>Comentario</th><th>Acoes</th></tr></thead>
            <tbody>
              ${pending.map((row) => `
                <tr>
                  <td>${formatDate(row.date)}</td>
                  <td>${escapeHtml(row.id1)}</td>
                  <td>${escapeHtml(row.id2)}</td>
                  <td>${escapeHtml(row.funcionario)}</td>
                  <td>${fmt.format(row.hh)}</td>
                  <td><span class="tag">${escapeHtml(row.status)}</span></td>
                  <td>${escapeHtml(row.comentario || "")}</td>
                  <td class="row-actions">
                    <button class="small-button" data-validate-time="${row.id}" type="button">Aprovar</button>
                    <button class="small-button" data-reject-time="${row.id}" type="button">Rejeitar</button>
                    <button class="small-button" data-edit-time="${row.id}" type="button">Corrigir</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : empty("Nenhum registro pendente de validacao.")}
    </section>
  `;
}

function renderExportacoes(metrics) {
  const filterChips = [
    ["Periodo", `${formatDate(metrics.filters.start)} a ${formatDate(metrics.filters.end)}`],
    ["ID1", selectedValues("#filterId1").join(", ") || "Todos"],
    ["ID2", selectedValues("#filterId2").join(", ") || "Todos"],
    ["Funcionario", selectedValues("#filterFuncionario").join(", ") || "Todos"],
    ["Bloco", selectedValues("#filterBloco").join(", ") || "Todos"],
    ["Apurador", selectedValues("#filterApurador").join(", ") || "Todos"],
  ];
  return `
    <section class="export-hero">
      <div>
        <p class="eyebrow">Exportacoes</p>
        <h2>Pacotes prontos para auditoria, cliente e analise operacional</h2>
        <p class="muted">Todo arquivo respeita o filtro global atual. Para mudar o recorte, ajuste os filtros no topo e volte para exportar.</p>
      </div>
      <div class="export-summary">
        <div><span>Apontamentos</span><strong>${fmt0.format(metrics.timeRows.length)}</strong></div>
        <div><span>QS</span><strong>${fmt0.format(metrics.productionRows.length)}</strong></div>
        <div><span>Hh</span><strong>${fmt.format(metrics.hh)}</strong></div>
        <div><span>RUP</span><strong>${metrics.rup ? fmt.format(metrics.rup) : "-"}</strong></div>
      </div>
    </section>

    <section class="grid cols-3">
      <article class="export-card primary-export">
        <span class="export-icon">XLS</span>
        ${pageHeader("Excel completo", "Workbook com resumo, apontamentos, QS, servicos, funcionarios e historico.")}
        <button class="primary-button" id="exportExcel" type="button">Baixar Excel completo</button>
      </article>
      <article class="export-card">
        <span class="export-icon">CSV</span>
        ${pageHeader("Apontamentos", "Arquivo leve com os lancamentos de Hh do recorte atual.")}
        <button class="secondary-button" id="exportTimeCsv" type="button">Baixar CSV apontamentos</button>
      </article>
      <article class="export-card">
        <span class="export-icon">QS</span>
        ${pageHeader("Producao", "Arquivo separado com quantidade de servico e toneladas.")}
        <button class="secondary-button" id="exportQsCsv" type="button">Baixar CSV QS</button>
      </article>
    </section>

    <section class="grid cols-2" style="margin-top:14px">
      <article class="card">
        ${pageHeader("Recorte que sera exportado", "Filtros ativos neste momento.")}
        <div class="filter-chips">
          ${filterChips.map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`).join("")}
        </div>
      </article>
      <article class="card">
        ${pageHeader("Atalho operacional", "Semana anterior filtrada apenas para SERVICO.")}
        <p class="muted">O periodo e calculado a partir da data mais recente da base local. Quando a base estiver atualizada diariamente, o atalho acompanha a semana operacional anterior.</p>
        <button class="secondary-button" id="exportLastWeekService" type="button">Baixar semana passada / SERVICO</button>
      </article>
    </section>
    <section class="table-card" style="margin-top:14px">
      ${pageHeader("Historico de exportacoes", "Auditoria local dos arquivos gerados.")}
      ${renderExportHistory()}
    </section>
  `;
}

function renderExportHistory() {
  if (!state.db.exportJobs.length) return empty("Nenhuma exportacao gerada.");
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>Arquivo</th><th>Formato</th><th>Status</th><th>Linhas</th><th>Resumo</th></tr></thead>
        <tbody>
          ${state.db.exportJobs.map((job) => `
            <tr>
              <td>${new Date(job.created_at).toLocaleString("pt-BR")}</td>
              <td>${escapeHtml(job.file_name)}</td>
              <td>${escapeHtml(job.format)}</td>
              <td><span class="tag">${escapeHtml(job.status)}</span></td>
              <td>${fmt0.format(job.total_rows)}</td>
              <td>${escapeHtml(job.summary)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

const MASTER_CONFIG = {
  employees: {
    title: "Colaboradores",
    description: "Funcionarios/equipes vindos do Excel e novos cadastros.",
    store: "masterEmployees",
    fields: [
      ["code", "Codigo"],
      ["name", "Nome"],
      ["cargo", "Cargo"],
      ["status", "Status"],
    ],
  },
  services: {
    title: "Servicos ID1/ID2",
    description: "Classificacoes EAO usadas na apropriacao e nos filtros.",
    store: "classifications",
    fields: [
      ["id1", "ID1"],
      ["id2", "ID2"],
      ["id3", "ID3"],
      ["significado", "Significado"],
    ],
  },
  processes: {
    title: "Processos",
    description: "Processos produtivos disponiveis.",
    store: "masterProcesses",
    fields: [
      ["code", "Codigo"],
      ["name", "Nome"],
      ["status", "Status"],
    ],
  },
  blocks: {
    title: "Blocos",
    description: "Blocos/frentes/localizacoes.",
    store: "masterBlocks",
    fields: [
      ["code", "Codigo"],
      ["name", "Nome"],
      ["status", "Status"],
    ],
  },
  roles: {
    title: "Cargos",
    description: "Cargos usados nos apontamentos.",
    store: "masterJobRoles",
    fields: [
      ["code", "Codigo"],
      ["name", "Nome"],
      ["status", "Status"],
    ],
  },
  surveyors: {
    title: "Apuradores",
    description: "Responsaveis por afericao/apropriacao.",
    store: "masterSurveyors",
    fields: [
      ["code", "Codigo"],
      ["name", "Nome"],
      ["status", "Status"],
    ],
  },
};

function renderCadastros() {
  const cfg = MASTER_CONFIG[state.cadastroTab] || MASTER_CONFIG.employees;
  const rows = state.db[cfg.store] || [];
  return `
    <div class="tabs">
      ${Object.entries(MASTER_CONFIG).map(([key, item]) => `<button class="${state.cadastroTab === key ? "active" : ""}" data-cadastro-tab="${key}" type="button">${escapeHtml(item.title)}</button>`).join("")}
    </div>
    <section class="card">
      ${pageHeader(`Novo cadastro: ${cfg.title}`, cfg.description)}
      <form id="masterForm" class="form-grid" data-master-kind="${state.cadastroTab}">
        ${cfg.fields.map(([key, label]) => `
          <label class="${key === "significado" ? "wide" : ""}">${escapeHtml(label)}
            <input name="${escapeHtml(key)}" value="${escapeHtml(key === "status" ? "active" : "")}" ${key === "status" ? "" : "required"}>
          </label>
        `).join("")}
        <div class="full row-actions">
          <button class="primary-button" type="submit">${icon("plus")}Adicionar cadastro</button>
        </div>
      </form>
    </section>
    <section class="table-card" style="margin-top:14px">
      ${pageHeader(cfg.title, `${rows.length} registros cadastrados.`)}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${cfg.fields.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}<th>Origem</th><th>Acoes</th></tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                ${cfg.fields.map(([key]) => `<td>${escapeHtml(row[key] || "")}</td>`).join("")}
                <td>${escapeHtml(row.source || "manual")}</td>
                <td class="row-actions">
                  <button class="small-button" data-edit-master="${row.id}" type="button">${icon("edit")}Editar</button>
                  <button class="small-button" data-delete-master="${row.id}" type="button">${icon("trash")}Excluir</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderPerfil() {
  const activeProfileLabel = profileLabel(state.profileMode);
  const pages = allowedPages().map((page) => ({
    home: "Dashboard",
    campo: "Apropriacao",
    cadastros: "Cadastros",
    usuarios: "Usuarios",
    perfil: "Perfil",
  }[page] || page));
  return `
    <section class="grid cols-2">
      <article class="card profile-card">
        ${pageHeader("Meu perfil", "Informacoes da sessao local e permissoes visiveis.")}
        <div class="profile-avatar">${escapeHtml((state.currentUser?.name || state.currentUser?.email || "U").slice(0, 2).toUpperCase())}</div>
        <dl class="profile-list">
          <div><dt>Nome</dt><dd>${escapeHtml(state.currentUser?.name || "Usuario local")}</dd></div>
          <div><dt>Email</dt><dd>${escapeHtml(state.currentUser?.email || "admin@oficina.local")}</dd></div>
          <div><dt>Perfil visualizado</dt><dd>${escapeHtml(activeProfileLabel)}</dd></div>
          <div><dt>Ambiente</dt><dd>Local / navegador</dd></div>
        </dl>
      </article>
      <article class="card">
        ${pageHeader("Telas liberadas", "O menu lateral usa esta lista para mostrar ou ocultar telas.")}
        <div class="permission-list">
          ${pages.map((page) => `<span class="tag">${escapeHtml(page)}</span>`).join("")}
        </div>
        <p class="muted">Na versao online, este controle deve ser ligado ao Supabase Auth e a regras de seguranca no banco.</p>
      </article>
    </section>
  `;
}

function modalShell(title, body) {
  return `
    <div class="modal-backdrop" role="presentation">
      <section class="modal-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="modal-head">
          <h3>${escapeHtml(title)}</h3>
          <button class="icon-only" data-cancel-edit="all" type="button" aria-label="Fechar">${icon("close")}</button>
        </div>
        ${body}
      </section>
    </div>
  `;
}

function profileLabel(value) {
  return {
    developer: "Desenvolvedor",
    client: "Cliente",
    apurador: "Apurador",
  }[value] || "Cliente";
}

function statusLabel(value) {
  return {
    approved: "aprovado",
    pending: "pendente",
    rejected: "rejeitado",
  }[value] || value || "-";
}

function renderUsuarios() {
  const rows = (state.db.users || []).slice().sort((a, b) => {
    const order = { pending: 0, approved: 1, rejected: 2 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9) || String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
  });
  const pending = rows.filter((row) => row.status === "pending").length;
  return `
    <section class="grid cols-2">
      <article class="card">
        ${pageHeader("Usuarios", "Aprove novas contas e defina qual visao cada pessoa podera acessar.")}
        <div class="field-session-summary">
          <div><span class="muted">Pendentes</span><strong>${fmt0.format(pending)}</strong></div>
          <div><span class="muted">Total</span><strong>${fmt0.format(rows.length)}</strong></div>
        </div>
        <p class="muted">No ambiente online, esta regra vira permissao no Supabase. Aqui ela simula o fluxo real de aceite antes do primeiro acesso.</p>
      </article>
      <article class="card">
        ${pageHeader("Perfis disponiveis", "Cada perfil libera um conjunto diferente de telas.")}
        <div class="permission-list">
          <span class="tag">Desenvolvedor: tudo</span>
          <span class="tag">Cliente: dashboard e perfil</span>
          <span class="tag">Apurador: dashboard, apropriacao e perfil</span>
        </div>
      </article>
    </section>
    <section class="table-card" style="margin-top:14px">
      ${pageHeader("Solicitacoes e acessos", "Acoes aplicadas aqui controlam quem consegue entrar no aplicativo.")}
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Email</th><th>Status</th><th>Perfil</th><th>Justificativa</th><th>Acoes</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${escapeHtml(row.name || "")}</td>
                <td>${escapeHtml(row.email || "")}</td>
                <td><span class="user-status ${escapeHtml(row.status || "")}">${escapeHtml(statusLabel(row.status))}</span></td>
                <td>
                  <select data-user-profile="${escapeHtml(row.id)}" ${row.email === state.currentUser?.email ? "disabled" : ""}>
                    <option value="client" ${row.profileMode === "client" ? "selected" : ""}>Cliente</option>
                    <option value="apurador" ${row.profileMode === "apurador" ? "selected" : ""}>Apurador</option>
                    <option value="developer" ${row.profileMode === "developer" ? "selected" : ""}>Desenvolvedor</option>
                  </select>
                </td>
                <td>${escapeHtml(row.reason || "-")}</td>
                <td class="row-actions">
                  <button class="small-button" data-approve-user="${escapeHtml(row.id)}" type="button" ${row.email === state.currentUser?.email ? "disabled" : ""}>${icon("check")}Aprovar</button>
                  <button class="small-button" data-reject-user="${escapeHtml(row.id)}" type="button" ${row.email === state.currentUser?.email ? "disabled" : ""}>${icon("close")}Cancelar</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderSessionReviewModal() {
  if (!state.reviewSessionId || state.editingTimeId || state.editingProductionId || state.editingMasterId) return "";
  const session = state.db.fieldSessions.find((item) => item.id === state.reviewSessionId);
  if (!session) return "";
  const rows = activeRows("timeRows")
    .filter((row) => row.field_session_id === session.id)
    .slice()
    .sort((a, b) => `${a.hora_inicio || ""}${a.funcionario || ""}`.localeCompare(`${b.hora_inicio || ""}${b.funcionario || ""}`));
  return `
    <div class="modal-backdrop" role="presentation">
      <section class="modal-card review-modal" role="dialog" aria-modal="true" aria-label="Revisar registros da sessao">
        <div class="modal-head">
          <div>
            <h3>Revisar registros da sessao</h3>
            <p class="muted">Confira os apontamentos gerados antes de validar. Voce tambem pode fechar e revisar depois na tabela da Apropriacao.</p>
          </div>
          <button class="icon-only" data-close-review type="button" aria-label="Fechar">${icon("close")}</button>
        </div>
        <div class="field-session-summary">
          <div><span class="muted">Aferidor</span><strong>${escapeHtml(session.apurador || "-")}</strong></div>
          <div><span class="muted">Periodo</span><strong>${formatDate(session.date)} ${escapeHtml(session.start_time || "")} a ${escapeHtml(session.end_time || "")}</strong></div>
          <div><span class="muted">Equipe</span><strong>${fmt0.format(session.team?.length || 0)} pessoas</strong></div>
          <div><span class="muted">Registros</span><strong>${fmt0.format(rows.length)}</strong></div>
        </div>
        ${renderTimeTable(rows, 200)}
        <div class="row-actions" style="margin-top:14px">
          <button class="primary-button" data-validate-review type="button">${icon("check")}Validar tudo</button>
          <button class="ghost-button" data-close-review type="button">${icon("close")}Validar depois</button>
        </div>
      </section>
    </div>
  `;
}

function renderEditModal() {
  if (state.editingTimeId) {
    const row = state.db.timeRows.find((item) => item.id === state.editingTimeId);
    if (!row) return "";
    return modalShell("Editar apontamento", `${timeForm(row, "timeFormModal")}<div class="modal-actions"><button class="ghost-button" data-cancel-edit="time" type="button">${icon("close")}Cancelar</button></div>`);
  }
  if (state.editingProductionId) {
    const row = state.db.productionRows.find((item) => item.id === state.editingProductionId);
    if (!row) return "";
    return modalShell("Editar producao QS", `${productionForm(row, "productionFormModal")}<div class="modal-actions"><button class="ghost-button" data-cancel-edit="production" type="button">${icon("close")}Cancelar</button></div>`);
  }
  if (state.editingMasterId) {
    const cfg = MASTER_CONFIG[state.cadastroTab] || MASTER_CONFIG.employees;
    const row = (state.db[cfg.store] || []).find((item) => item.id === state.editingMasterId);
    if (!row) return "";
    const form = `
      <form id="masterFormModal" class="form-grid" data-master-kind="${state.cadastroTab}">
        ${cfg.fields.map(([key, label]) => `
          <label class="${key === "significado" ? "wide" : ""}">${escapeHtml(label)}
            <input name="${escapeHtml(key)}" value="${escapeHtml(row[key] || "")}" ${key === "status" ? "" : "required"}>
          </label>
        `).join("")}
        <div class="full row-actions">
          <button class="primary-button" type="submit">${icon("save")}Confirmar</button>
          <button class="ghost-button" data-cancel-edit="master" type="button">${icon("close")}Cancelar</button>
        </div>
      </form>
    `;
    return modalShell(`Editar ${cfg.title}`, form);
  }
  return "";
}

function render() {
  populateFilters();
  const metrics = computeMetrics();
  const titles = {
    home: "Dashboard Operacional",
    campo: "Apropriacao",
    cadastros: "Cadastros",
    usuarios: "Usuarios",
    perfil: "Perfil",
  };
  syncNavigation();
  syncFilterVisibility();
  $("#pageTitle").textContent = titles[state.page] || "Sistema";
  const { max } = allDates();
  const daysOld = Math.round((parseDate(todayIso()) - parseDate(max)) / 86400000);
  const badge = $("#freshnessBadge");
  if (badge) {
    badge.textContent = daysOld <= 1 ? `Atualizado: ${formatDate(max)}` : `Base ate ${formatDate(max)}`;
    badge.className = `status-pill ${daysOld <= 1 ? "good" : "warn"}`;
  }
  const profileButton = $("#profileButton");
  if (profileButton) {
    const label = profileLabel(state.profileMode);
    const name = state.currentUser?.name || "Administrador local";
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AL";
    profileButton.innerHTML = `<span class="user-avatar">${escapeHtml(initials)}</span><span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(label)}</small></span>`;
  }

  const pages = {
    home: () => renderHome(metrics),
    campo: () => renderCampoV2(),
    cadastros: () => renderCadastros(),
    usuarios: () => renderUsuarios(),
    perfil: () => renderPerfil(),
  };
  $("#appMain").innerHTML = (pages[state.page] || pages.home)() + renderEditModal() + renderSessionReviewModal();
  updateLiveClocks();
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function supabaseReady() {
  return Boolean(SUPABASE.url && SUPABASE.key);
}

function localUserFromProfile(profile) {
  return {
    id: profile.id,
    email: profile.email,
    role: profile.role === "developer" ? "admin" : "user",
    profileMode: profile.role || "client",
    status: profile.status || "pending",
    name: profile.full_name || profile.email,
    reason: profile.requested_reason || "",
    created_at: profile.created_at || "",
    approved_at: profile.approved_at || "",
    approved_by: profile.approved_by || "",
  };
}

async function supabaseFetch(path, options = {}) {
  if (!supabaseReady()) throw new Error("Supabase nao configurado.");
  const session = getSupabaseSession();
  const headers = {
    apikey: SUPABASE.key,
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${SUPABASE.url}${path}`, { ...options, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.msg || payload?.message || payload?.error_description || "Erro ao comunicar com Supabase.");
  }
  return payload;
}

function getSupabaseSession() {
  try {
    return JSON.parse(localStorage.getItem(SUPABASE_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function setSupabaseSession(payload) {
  localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: payload.expires_at || null,
    user: payload.user,
  }));
}

function clearSupabaseSession() {
  localStorage.removeItem(SUPABASE_SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

async function supabaseSignIn(email, password) {
  const payload = await supabaseFetch("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setSupabaseSession(payload);
  const profile = await fetchSupabaseProfile(payload.user.id);
  if (!profile) throw new Error("Perfil nao encontrado. Peça para o desenvolvedor aprovar seu cadastro.");
  return profile;
}

async function supabaseSignUp(payload) {
  const authPayload = await supabaseFetch("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      data: { full_name: payload.name, requested_reason: payload.reason || "" },
    }),
  });
  if (!authPayload.session?.access_token && !authPayload.access_token) {
    throw new Error("Cadastro criado. Confirme seu email antes de solicitar a aprovacao.");
  }
  setSupabaseSession(authPayload.session || authPayload);
  await supabaseFetch("/rest/v1/user_profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id: authPayload.user.id,
      organization_id: SUPABASE.organizationId,
      full_name: payload.name,
      email: payload.email,
      role: "client",
      status: "pending",
      requested_reason: payload.reason || "",
    }),
  });
  clearSupabaseSession();
}

async function fetchSupabaseProfile(userId) {
  const rows = await supabaseFetch(`/rest/v1/user_profiles?id=eq.${encodeURIComponent(userId)}&select=*`, {
    method: "GET",
  });
  return rows?.[0] || null;
}

async function fetchSupabaseProfiles() {
  const rows = await supabaseFetch("/rest/v1/user_profiles?select=*&order=created_at.desc", {
    method: "GET",
  });
  state.db.users = rows.map(localUserFromProfile);
  saveDb();
  return state.db.users;
}

async function updateSupabaseUserProfile(id, patch) {
  const rows = await supabaseFetch(`/rest/v1/user_profiles?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      ...patch,
      updated_at: new Date().toISOString(),
    }),
  });
  const updated = rows?.[0];
  if (!updated) throw new Error("Nenhum registro foi atualizado no Supabase.");
  if (updated) {
    const index = state.db.users.findIndex((item) => item.id === updated.id);
    const local = localUserFromProfile(updated);
    if (index >= 0) state.db.users[index] = local;
    else state.db.users.push(local);
    saveDb();
  }
  return updated;
}

function findUserByEmail(email) {
  return (state.db.users || []).find((user) => normalizeText(user.email) === normalizeText(email));
}

function enterApp(user) {
  state.currentUser = {
    id: user.id,
    email: user.email,
    role: user.role || "user",
    name: user.name || user.email,
    profileMode: user.profileMode || "client",
  };
  state.profileMode = state.currentUser.profileMode;
  state.page = allowedPages()[0] || "home";
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.currentUser));
  $("#loginView").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
  render();
}

function updateLiveClocks() {
  const now = currentTimeValue();
  $$("[data-live-clock]").forEach((node) => {
    node.textContent = now;
  });
  $$("[data-open-elapsed]").forEach((node) => {
    const startTime = node.dataset.startTime;
    node.textContent = startTime ? formatElapsedSeconds(elapsedSeconds(startTime, now)) : "-";
  });
}

function upsertTime(payload, source = "manual") {
  const now = new Date().toISOString();
  const id2Desc = state.db.classifications.find((row) => row.id2 === payload.id2)?.significado || payload.id2_desc || "";
  const row = {
    date: payload.date,
    id1: payload.id1,
    id2: payload.id2,
    id2_desc: id2Desc,
    hh: Number(payload.hh) || 0,
    funcionario: payload.funcionario,
    cargo: payload.cargo,
    apurador: payload.apurador,
    bloco: String(payload.bloco ?? ""),
    processo: payload.processo,
    comentario: payload.comentario || "",
    origem: payload.origem || source,
    status: payload.status || "validado",
    deleted: false,
    updated_at: now,
  };
  if (state.editingTimeId) {
    const index = state.db.timeRows.findIndex((item) => item.id === state.editingTimeId);
    state.db.timeRows[index] = { ...state.db.timeRows[index], ...row, status: row.status === "validado" ? "corrigido" : row.status };
    audit("apontamento_editado", "time_entries", state.editingTimeId, `Apontamento ${state.editingTimeId} alterado.`);
    state.editingTimeId = null;
  } else {
    const id = uid("time");
    state.db.timeRows.push({ id, ...row, created_at: now });
    audit("apontamento_criado", "time_entries", id, `Novo apontamento de ${fmt.format(row.hh)} Hh em ${row.date}.`);
  }
  saveDb();
  render();
  toast("Apontamento salvo e dashboard atualizado.");
}

function upsertProduction(payload) {
  const now = new Date().toISOString();
  const row = {
    date: payload.date,
    qtde: Number(payload.qtde) || 0,
    tag: payload.tag,
    tipo: payload.tipo,
    bloco: String(payload.bloco ?? ""),
    peso_tn: Number(payload.peso_tn) || 0,
    origem: "manual",
    status: "validado",
    deleted: false,
    updated_at: now,
  };
  if (state.editingProductionId) {
    const index = state.db.productionRows.findIndex((item) => item.id === state.editingProductionId);
    state.db.productionRows[index] = { ...state.db.productionRows[index], ...row };
    audit("qs_editado", "production_entries", state.editingProductionId, `QS ${state.editingProductionId} alterado.`);
    state.editingProductionId = null;
  } else {
    const id = uid("qs");
    state.db.productionRows.push({ id, ...row, created_at: now });
    audit("qs_criado", "production_entries", id, `Nova producao QS ${row.qtde} em ${row.date}.`);
  }
  saveDb();
  render();
  toast("Producao QS salva e dashboard atualizado.");
}

function upsertMaster(kind, payload) {
  const cfg = MASTER_CONFIG[kind] || MASTER_CONFIG.employees;
  const rows = state.db[cfg.store];
  if (state.editingMasterId) {
    const index = rows.findIndex((row) => row.id === state.editingMasterId);
    rows[index] = { ...rows[index], ...payload, updated_at: new Date().toISOString() };
    audit("cadastro_editado", cfg.store, state.editingMasterId, `${cfg.title} alterado.`);
    state.editingMasterId = null;
  } else {
    const id = uid(kind);
    rows.unshift({ id, ...payload, source: "manual", created_at: new Date().toISOString() });
    audit("cadastro_criado", cfg.store, id, `${cfg.title} criado.`);
  }
  saveDb();
  render();
  toast("Cadastro salvo.");
}

function deleteMaster(kind, id) {
  const cfg = MASTER_CONFIG[kind] || MASTER_CONFIG.employees;
  const rows = state.db[cfg.store];
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return;
  rows.splice(index, 1);
  audit("cadastro_excluido", cfg.store, id, `${cfg.title} removido.`);
  saveDb();
  render();
  toast("Cadastro excluido.");
}

function softDelete(kind, id, label) {
  const row = state.db[kind].find((item) => item.id === id);
  if (!row) return;
  row.deleted = true;
  row.updated_at = new Date().toISOString();
  audit(`${label}_excluido`, kind, id, `${label} ${id} excluido logicamente.`);
  saveDb();
  render();
  toast("Registro excluido e dashboard atualizado.");
}

function duplicateTime(id) {
  const row = state.db.timeRows.find((item) => item.id === id);
  if (!row) return;
  const clone = { ...row, id: uid("time"), origem: "manual", status: "rascunho", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  state.db.timeRows.push(clone);
  audit("apontamento_duplicado", "time_entries", clone.id, `Duplicado a partir de ${id}.`);
  saveDb();
  render();
  toast("Registro duplicado como rascunho.");
}

function changeTimeStatus(id, status) {
  const row = state.db.timeRows.find((item) => item.id === id);
  if (!row) return;
  row.status = status;
  row.updated_at = new Date().toISOString();
  audit(`apontamento_${status}`, "time_entries", id, `Status alterado para ${status}.`);
  saveDb();
  render();
  toast(`Status alterado para ${status}.`);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadBlob(fileName, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function rowsToCsv(rows, columns) {
  return [
    columns.map((col) => csvEscape(col.label)).join(";"),
    ...rows.map((row) => columns.map((col) => csvEscape(row[col.key])).join(";")),
  ].join("\n");
}

function worksheet(name, rows) {
  return `
    <Worksheet ss:Name="${escapeXml(name).slice(0, 31)}">
      <Table>
        ${rows.map((row) => `
          <Row>${row.map((cell) => `<Cell><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${escapeXml(cell)}</Data></Cell>`).join("")}</Row>
        `).join("")}
      </Table>
    </Worksheet>
  `;
}

function columnName(index) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function safeSheetName(name) {
  return String(name).replace(/[\[\]:*?/\\]/g, "_").slice(0, 31) || "aba";
}

function sheetXml(rows) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <sheetData>
        ${rows.map((row, rIndex) => `
          <row r="${rIndex + 1}">
            ${row.map((cell, cIndex) => {
              const ref = `${columnName(cIndex)}${rIndex + 1}`;
              if (typeof cell === "number" && Number.isFinite(cell)) return `<c r="${ref}"><v>${cell}</v></c>`;
              return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
            }).join("")}
          </row>
        `).join("")}
      </sheetData>
    </worksheet>`;
}

function crc32(bytes) {
  if (!crc32.table) {
    crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc32.table[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crc32.table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function concatBytes(parts) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function writeHeader(length) {
  return new Uint8Array(length);
}

function buildZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, day } = dosDateTime();

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    const crc = crc32(data);

    const local = writeHeader(30);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, time, true);
    lv.setUint16(12, day, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localParts.push(local, nameBytes, data);

    const central = writeHeader(46);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, day, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralParts.push(central, nameBytes);

    offset += local.length + nameBytes.length + data.length;
  });

  const central = concatBytes(centralParts);
  const end = writeHeader(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, central.length, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);
  return concatBytes([...localParts, central, end]);
}

function buildXlsxWorkbook(sheets) {
  const safeSheets = sheets.map((sheet, index) => ({ ...sheet, name: safeSheetName(sheet.name), id: index + 1 }));
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
      <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
      ${safeSheets.map((sheet) => `<Override PartName="/xl/worksheets/sheet${sheet.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
    </Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
    </Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets>
        ${safeSheets.map((sheet) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${sheet.id}" r:id="rId${sheet.id}"/>`).join("")}
      </sheets>
    </workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      ${safeSheets.map((sheet) => `<Relationship Id="rId${sheet.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheet.id}.xml"/>`).join("")}
      <Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
    </Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
      <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
      <borders count="1"><border/></borders>
      <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
      <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
      <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
    </styleSheet>`;

  const files = [
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "xl/workbook.xml", data: workbook },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRels },
    { name: "xl/styles.xml", data: styles },
    ...safeSheets.map((sheet) => ({ name: `xl/worksheets/sheet${sheet.id}.xml`, data: sheetXml(sheet.rows) })),
  ];
  return buildZip(files);
}

function exportWorkbook(metrics = computeMetrics(), forcedSummary = "") {
  const now = new Date();
  const filters = metrics.filters;
  const id1Rows = metrics.id1Distribution.map((row) => [row.id1, row.hh, row.count, metrics.hh ? row.hh / metrics.hh : 0]);
  const paretoRows = metrics.id2Pareto.map((row) => [row.id1, row.id2, row.desc, row.hh, row.share, row.accShare, row.count]);
  const timeRows = metrics.timeRows.map((row) => [row.date, row.processo, row.id1, row.id2, row.id2_desc, row.hh, row.funcionario, row.cargo, row.apurador, row.bloco, row.status, row.origem, row.comentario]);
  const qsRows = metrics.productionRows.map((row) => [row.date, row.tag, row.tipo, row.bloco, row.qtde, row.peso_tn, row.status, row.origem]);
  const auditRows = state.db.auditLogs.slice(0, 300).map((row) => [row.created_at, row.user_email, row.event, row.entity, row.entity_id, row.details]);
  const filterSummary = forcedSummary || `Periodo ${filters.start} a ${filters.end}; ID1 ${filters.id1.join(", ") || "todos"}; ID2 ${filters.id2.join(", ") || "todos"}`;
  const sheets = [
    { name: "resumo_filtros", rows: [
      ["Campo", "Valor"],
      ["Gerado em", now.toLocaleString("pt-BR")],
      ["Usuario", state.currentUser?.email || "admin@oficina.local"],
      ["Resumo", filterSummary],
      ["Inicio", filters.start],
      ["Fim", filters.end],
      ["ID1", filters.id1.join(", ") || "Todos"],
      ["ID2", filters.id2.join(", ") || "Todos"],
      ["Funcionario", filters.funcionario.join(", ") || "Todos"],
      ["Cargo", filters.cargo.join(", ") || "Todos"],
      ["Bloco", filters.bloco.join(", ") || "Todos"],
      ["Apurador", filters.apurador.join(", ") || "Todos"],
    ] },
    { name: "kpis", rows: [
      ["Indicador", "Valor"],
      ["Hh total", metrics.hh],
      ["QS total", metrics.qs],
      ["RUP acumulada", metrics.rup || ""],
      ["RUP potencial", metrics.potential || ""],
      ["Espera Hh", metrics.espera],
      ["Paralisacao Hh", metrics.paral],
    ] },
    { name: "apontamentos", rows: [["Data", "Processo", "ID1", "ID2", "Significado", "Hh", "Funcionario", "Cargo", "Apurador", "Bloco", "Status", "Origem", "Comentario"], ...timeRows] },
    { name: "producao_qs", rows: [["Data", "TAG", "Tipo", "Bloco", "QS", "Peso tn", "Status", "Origem"], ...qsRows] },
    { name: "distribuicao_id1", rows: [["ID1", "Hh", "Ocorrencias", "% Hh"], ...id1Rows] },
    { name: "pareto_id2", rows: [["ID1", "ID2", "Significado", "Hh", "% Hh", "% acumulado", "Ocorrencias"], ...paretoRows] },
    { name: "auditoria", rows: [["Data", "Usuario", "Evento", "Entidade", "ID", "Detalhes"], ...auditRows] },
  ];
  const fileName = `exportacao_estratificacao_${dateIso(now)}_${now.getHours()}${String(now.getMinutes()).padStart(2, "0")}.xlsx`;
  const bytes = buildXlsxWorkbook(sheets);
  downloadBlob(fileName, bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const job = {
    id: uid("export"),
    file_name: fileName,
    format: "xlsx",
    status: "completed",
    total_rows: metrics.timeRows.length + metrics.productionRows.length,
    summary: filterSummary,
    created_at: now.toISOString(),
  };
  state.db.exportJobs.unshift(job);
  audit("excel_exportado", "export_jobs", job.id, `Arquivo ${fileName} gerado.`);
  saveDb();
  render();
  toast("XLSX gerado com abas e filtros.");
}

function exportCsv(kind) {
  const metrics = computeMetrics();
  if (kind === "time") {
    const columns = [
      ["date", "Data"], ["processo", "Processo"], ["id1", "ID1"], ["id2", "ID2"], ["id2_desc", "Significado"], ["hh", "Hh"], ["funcionario", "Funcionario"], ["cargo", "Cargo"], ["apurador", "Apurador"], ["bloco", "Bloco"], ["status", "Status"], ["origem", "Origem"], ["comentario", "Comentario"],
    ].map(([key, label]) => ({ key, label }));
    downloadBlob("apontamentos_filtrados.csv", `\ufeff${rowsToCsv(metrics.timeRows, columns)}`, "text/csv;charset=utf-8");
  } else {
    const columns = [["date", "Data"], ["tag", "TAG"], ["tipo", "Tipo"], ["bloco", "Bloco"], ["qtde", "QS"], ["peso_tn", "Peso tn"], ["status", "Status"], ["origem", "Origem"]].map(([key, label]) => ({ key, label }));
    downloadBlob("producao_qs_filtrada.csv", `\ufeff${rowsToCsv(metrics.productionRows, columns)}`, "text/csv;charset=utf-8");
  }
  toast("CSV gerado.");
}

function bindEvents() {
  $("#showLogin").addEventListener("click", () => {
    $("#showLogin").classList.add("active");
    $("#showSignup").classList.remove("active");
    $("#loginForm").classList.remove("hidden");
    $("#signupForm").classList.add("hidden");
  });

  $("#showSignup").addEventListener("click", () => {
    $("#showSignup").classList.add("active");
    $("#showLogin").classList.remove("active");
    $("#signupForm").classList.remove("hidden");
    $("#loginForm").classList.add("hidden");
  });

  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = formData(event.currentTarget);
    let user = null;
    if (supabaseReady()) {
      try {
        const profile = await supabaseSignIn(payload.email, payload.password);
        user = localUserFromProfile(profile);
        const index = state.db.users.findIndex((item) => item.id === user.id);
        if (index >= 0) state.db.users[index] = user;
        else state.db.users.push(user);
        if (user.profileMode === "developer") await fetchSupabaseProfiles();
      } catch (error) {
        toast(error.message || "Email ou senha invalidos.");
        return;
      }
    } else {
      user = findUserByEmail(payload.email);
    }
    if (!user || (!supabaseReady() && user.password !== payload.password)) {
      toast("Email ou senha invalidos.");
      return;
    }
    if (user.status === "pending") {
      if (supabaseReady()) clearSupabaseSession();
      toast("Seu cadastro ainda esta pendente de aprovacao.");
      return;
    }
    if (user.status === "rejected") {
      if (supabaseReady()) clearSupabaseSession();
      toast("Seu acesso foi cancelado. Fale com o administrador.");
      return;
    }
    enterApp(user);
  });

  $("#signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = formData(event.currentTarget);
    if (supabaseReady()) {
      try {
        await supabaseSignUp(payload);
        event.currentTarget.reset();
        $("#showLogin").click();
        toast("Solicitacao enviada. Aguarde a validacao do desenvolvedor.");
      } catch (error) {
        toast(error.message || "Nao foi possivel criar o cadastro.");
      }
      return;
    }
    if (findUserByEmail(payload.email)) {
      toast("Ja existe um cadastro com este email.");
      return;
    }
    const id = uid("user");
    state.db.users.push({
      id,
      email: payload.email,
      password: payload.password,
      role: "user",
      profileMode: "client",
      status: "pending",
      name: payload.name,
      reason: payload.reason || "",
      created_at: new Date().toISOString(),
      approved_at: "",
      approved_by: "",
    });
    audit("usuario_solicitado", "users", id, `Novo usuario solicitou acesso: ${payload.email}.`);
    saveDb();
    event.currentTarget.reset();
    $("#showLogin").click();
    toast("Solicitacao enviada. Aguarde a validacao do desenvolvedor.");
  });

  $("#logoutButton").addEventListener("click", () => {
    clearSupabaseSession();
    state.currentUser = null;
    state.profileMode = "developer";
    state.page = "home";
    $("#appShell").classList.add("hidden");
    $("#loginView").classList.remove("hidden");
  });

  $("#resetDemoData").addEventListener("click", () => {
    if (!confirm("Restaurar a base local original? Registros manuais serao apagados.")) return;
    localStorage.removeItem(STORAGE_KEY);
    state.db = buildInitialDb();
    saveDb();
    state.editingTimeId = null;
    state.editingProductionId = null;
    render();
    toast("Base original restaurada.");
  });

  $("#toggleSidebar").addEventListener("click", () => {
    $("#appShell").classList.toggle("sidebar-collapsed");
    $("#toggleSidebar").setAttribute("aria-label", $("#appShell").classList.contains("sidebar-collapsed") ? "Abrir menu" : "Fechar menu");
  });

  $("#sidebarScrim").addEventListener("click", () => {
    $("#appShell").classList.add("sidebar-collapsed");
    $("#toggleSidebar").setAttribute("aria-label", "Abrir menu");
  });

  $("#profileButton").addEventListener("click", () => {
    setPage("perfil");
  });

  $("#exportExcelTop").addEventListener("click", () => {
    exportWorkbook();
  });

  $("#profileMode").addEventListener("change", (event) => {
    state.profileMode = event.target.value;
    if (!pageAllowed(state.page)) state.page = allowedPages()[0] || "home";
    render();
    toast(`Visao alterada para ${event.target.selectedOptions[0].textContent}.`);
  });

  $("#sideNav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (button) setPage(button.dataset.page);
  });

  $("#globalFilters").addEventListener("change", (event) => {
    if (event.target.id === "periodPreset") applyPreset(event.target.value);
    if (["startDate", "endDate"].includes(event.target.id)) $("#periodPreset").value = "custom";
    render();
  });
  $("#globalSearch").addEventListener("input", render);
  $("#clearFilters").addEventListener("click", () => {
    $("#periodPreset").value = "all";
    $$("#globalFilters select").forEach((select) => { select.selectedIndex = 0; });
    $("#globalSearch").value = "";
    const { min, max } = allDates();
    $("#startDate").value = min;
    $("#endDate").value = max;
    render();
  });
  $("#serviceOnly").addEventListener("click", () => {
    const select = $("#filterId1");
    [...select.options].forEach((option) => { option.selected = normalizeText(option.value) === "SERVICO"; });
    render();
  });

  $("#appMain").addEventListener("click", async (event) => {
    const nav = event.target.closest("[data-nav]");
    if (nav) setPage(nav.dataset.nav);

    const chartFilter = event.target.closest("[data-chart-filter]");
    if (chartFilter) {
      const field = chartFilter.dataset.chartFilter;
      const value = chartFilter.dataset.chartValue;
      const selectId = field === "id1" ? "filterId1" : field === "id2" ? "filterId2" : "";
      if (selectId && $(`#${selectId}`)) {
        $(`#${selectId}`).value = value;
        if (field === "id1") $("#filterId2").value = "";
        render();
        toast(`Filtro aplicado: ${field.toUpperCase()} ${value}`);
      }
    }

    const tab = event.target.closest("[data-tab]");
    if (tab) {
      state.dataTab = tab.dataset.tab;
      state.editingTimeId = null;
      state.editingProductionId = null;
      render();
    }

    const cadastroTab = event.target.closest("[data-cadastro-tab]");
    if (cadastroTab) {
      state.cadastroTab = cadastroTab.dataset.cadastroTab;
      state.editingMasterId = null;
      render();
    }

    const editTime = event.target.closest("[data-edit-time]");
    if (editTime) {
      state.dataTab = "time";
      state.editingTimeId = editTime.dataset.editTime;
      render();
    }
    const duplicate = event.target.closest("[data-duplicate-time]");
    if (duplicate) duplicateTime(duplicate.dataset.duplicateTime);
    const deleteTime = event.target.closest("[data-delete-time]");
    if (deleteTime && confirm("Excluir este apontamento?")) softDelete("timeRows", deleteTime.dataset.deleteTime, "apontamento");

    const editProduction = event.target.closest("[data-edit-production]");
    if (editProduction) {
      state.dataTab = "qs";
      state.editingProductionId = editProduction.dataset.editProduction;
      render();
    }
    const deleteProduction = event.target.closest("[data-delete-production]");
    if (deleteProduction && confirm("Excluir este registro QS?")) softDelete("productionRows", deleteProduction.dataset.deleteProduction, "qs");

    const validate = event.target.closest("[data-validate-time]");
    if (validate) changeTimeStatus(validate.dataset.validateTime, "validado");
    const reject = event.target.closest("[data-reject-time]");
    if (reject) changeTimeStatus(reject.dataset.rejectTime, "rejeitado");

    const cancel = event.target.closest("[data-cancel-edit]");
    if (cancel) {
      if (cancel.dataset.cancelEdit === "all") {
        state.editingTimeId = null;
        state.editingProductionId = null;
        state.editingMasterId = null;
        state.reviewSessionId = null;
      }
      if (cancel.dataset.cancelEdit === "time") state.editingTimeId = null;
      if (cancel.dataset.cancelEdit === "production") state.editingProductionId = null;
      if (cancel.dataset.cancelEdit === "master") state.editingMasterId = null;
      render();
    }

    const exportExcel = event.target.closest("#exportExcel");
    if (exportExcel) exportWorkbook();
    const exportTimeCsv = event.target.closest("#exportTimeCsv");
    if (exportTimeCsv) exportCsv("time");
    const exportQsCsv = event.target.closest("#exportQsCsv");
    if (exportQsCsv) exportCsv("qs");
    const exportLastWeekService = event.target.closest("#exportLastWeekService");
    if (exportLastWeekService) {
      $("#periodPreset").value = "last-week";
      applyPreset("last-week");
      [...$("#filterId1").options].forEach((option) => { option.selected = normalizeText(option.value) === "SERVICO"; });
      const metrics = computeMetrics();
      exportWorkbook(metrics, `Semana passada da base; ID1 = SERVICO; periodo ${metrics.filters.start} a ${metrics.filters.end}`);
    }

    const cancelFieldSession = event.target.closest("#cancelFieldSession");
    if (cancelFieldSession) {
      const session = activeFieldSession();
      if (session && confirm("Cancelar a sessao atual? Intervalos ja fechados permanecem lancados.")) {
        session.status = "cancelled";
        session.ended_at = new Date().toISOString();
        audit("sessao_afericao_cancelada", "field_sessions", session.id, "Sessao de afericao cancelada.");
        saveDb();
        render();
        toast("Sessao cancelada.");
      }
    }

    const finishFieldSession = event.target.closest("#finishFieldSession");
    if (finishFieldSession) {
      event.preventDefault();
      const session = activeFieldSession();
      if (!session) return;
      ensureMemberActivityState(session);
      const endTime = currentTimeValue();
      let created = 0;
      session.team.forEach((member) => {
        const result = closeMemberActivity(session, member, endTime, "encerramento");
        created += result.created;
        if (result.created) delete session.openByMember[memberKey(member)];
      });
      session.status = "finished";
      session.end_time = endTime;
      session.ended_at = new Date().toISOString();
      state.reviewSessionId = session.id;
      audit("sessao_afericao_encerrada", "field_sessions", session.id, `Sessao encerrada as ${endTime}.`);
      saveDb();
      render();
      toast(`Turno encerrado. ${created} apontamentos gerados.`);
    }

    const closeReview = event.target.closest("[data-close-review]");
    if (closeReview) {
      state.reviewSessionId = null;
      render();
    }

    const validateReview = event.target.closest("[data-validate-review]");
    if (validateReview) {
      const rows = activeRows("timeRows").filter((row) => row.field_session_id === state.reviewSessionId);
      rows.forEach((row) => {
        row.status = "validado";
        row.updated_at = new Date().toISOString();
      });
      audit("sessao_afericao_validada", "field_sessions", state.reviewSessionId, `${rows.length} apontamentos validados no fechamento.`);
      state.reviewSessionId = null;
      saveDb();
      render();
      toast(`${rows.length} apontamentos validados.`);
    }

    const applyMember = event.target.closest("[data-apply-member]");
    if (applyMember) {
      const session = activeFieldSession();
      if (!session) return;
      const key = applyMember.dataset.applyMember;
      const card = applyMember.closest("[data-member]");
      const id1 = card?.querySelector("[data-member-id1]")?.value;
      const id2 = card?.querySelector("[data-member-id2]")?.value;
      const comentario = card?.querySelector("[data-member-comment]")?.value || "";
      if (!id1 || !id2) {
        toast("Selecione ID1 e ID2 para aplicar a atividade.");
        return;
      }
      const result = setMemberActivity(session, key, id1, id2, comentario);
      saveDb();
      render();
      toast(result.created ? `Intervalo fechado e nova atividade aberta.` : `Atividade aberta.`);
    }

    const closeMember = event.target.closest("[data-close-member]");
    if (closeMember) {
      const session = activeFieldSession();
      if (!session) return;
      ensureMemberActivityState(session);
      const key = closeMember.dataset.closeMember;
      const member = session.team.find((item) => memberKey(item) === key);
      if (!member) return;
      const result = closeMemberActivity(session, member, currentTimeValue(), "encerramento");
      if (result.created) delete session.openByMember[key];
      saveDb();
      render();
      toast(result.created ? "Colaborador encerrado." : "Nada para encerrar neste colaborador.");
    }

    const editMaster = event.target.closest("[data-edit-master]");
    if (editMaster) {
      state.editingMasterId = editMaster.dataset.editMaster;
      render();
    }
    const deleteMasterButton = event.target.closest("[data-delete-master]");
    if (deleteMasterButton && confirm("Excluir este cadastro?")) {
      deleteMaster(state.cadastroTab, deleteMasterButton.dataset.deleteMaster);
    }

    const approveUser = event.target.closest("[data-approve-user]");
    if (approveUser) {
      const user = state.db.users.find((item) => item.id === approveUser.dataset.approveUser);
      if (!user) return;
      if (supabaseReady()) {
        try {
          const updated = await updateSupabaseUserProfile(user.id, {
            status: "approved",
            role: user.profileMode || "client",
            approved_by: state.currentUser?.id || null,
            approved_at: new Date().toISOString(),
          });
          Object.assign(user, localUserFromProfile(updated));
        } catch (error) {
          toast(error.message || "Nao foi possivel aprovar o usuario.");
          return;
        }
      } else {
        user.status = "approved";
        user.approved_at = new Date().toISOString();
        user.approved_by = state.currentUser?.email || "admin@oficina.local";
      }
      audit("usuario_aprovado", "users", user.id, `${user.email} aprovado como ${profileLabel(user.profileMode)}.`);
      saveDb();
      render();
      toast("Usuario aprovado.");
    }

    const rejectUser = event.target.closest("[data-reject-user]");
    if (rejectUser) {
      const user = state.db.users.find((item) => item.id === rejectUser.dataset.rejectUser);
      if (!user) return;
      if (supabaseReady()) {
        try {
          const updated = await updateSupabaseUserProfile(user.id, {
            status: "rejected",
            approved_by: state.currentUser?.id || null,
            approved_at: null,
          });
          Object.assign(user, localUserFromProfile(updated));
        } catch (error) {
          toast(error.message || "Nao foi possivel cancelar o usuario.");
          return;
        }
      } else {
        user.status = "rejected";
        user.approved_at = "";
        user.approved_by = state.currentUser?.email || "admin@oficina.local";
      }
      audit("usuario_cancelado", "users", user.id, `${user.email} cancelado.`);
      saveDb();
      render();
      toast("Usuario cancelado.");
    }
  });

  $("#appMain").addEventListener("change", async (event) => {
    const userProfile = event.target.closest("[data-user-profile]");
    if (userProfile) {
      const user = state.db.users.find((item) => item.id === userProfile.dataset.userProfile);
      if (!user) return;
      user.profileMode = userProfile.value;
      user.role = user.profileMode === "developer" ? "admin" : "user";
      if (supabaseReady()) {
        try {
          const updated = await updateSupabaseUserProfile(user.id, { role: user.profileMode });
          Object.assign(user, localUserFromProfile(updated));
        } catch (error) {
          toast(error.message || "Nao foi possivel atualizar o perfil.");
          render();
          return;
        }
      }
      audit("perfil_usuario_alterado", "users", user.id, `${user.email} definido como ${profileLabel(user.profileMode)}.`);
      saveDb();
      render();
      toast("Perfil do usuario atualizado.");
      return;
    }

    const id1Select = event.target.closest("[data-member-id1]");
    if (!id1Select) return;
    const card = id1Select.closest("[data-member]");
    const id2Select = card?.querySelector("[data-member-id2]");
    if (!id2Select) return;
    id2Select.innerHTML = id2OptionsForId1(id1Select.value);
  });

  $("#appMain").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (["timeForm", "timeFormModal"].includes(event.target.id)) upsertTime(formData(event.target), state.page === "campo" ? "campo" : "manual");
    if (["productionForm", "productionFormModal"].includes(event.target.id)) upsertProduction(formData(event.target));
    if (["masterForm", "masterFormModal"].includes(event.target.id)) upsertMaster(event.target.dataset.masterKind, formData(event.target));
    if (event.target.id === "fieldSessionForm") {
      const payload = formData(event.target);
      payload.date = todayIso();
      payload.start_time = currentTimeValue();
      const team = selectedTeamFromForm(event.target);
      if (!team.length) {
        toast("Selecione pelo menos uma pessoa cadastrada para a equipe.");
        return;
      }
      if (activeFieldSession()) {
        toast("Ja existe uma sessao ativa. Encerre ou cancele antes de criar outra.");
        return;
      }
      const id = uid("field");
      state.db.fieldSessions.unshift({
        id,
        date: payload.date,
        start_time: payload.start_time,
        processo: payload.processo,
        bloco: payload.bloco,
        apurador: payload.apurador,
        team,
        activities: [],
        openByMember: {},
        currentActivity: null,
        status: "active",
        created_at: new Date().toISOString(),
      });
      audit("sessao_afericao_criada", "field_sessions", id, `Sessao criada com ${team.length} pessoas.`);
      saveDb();
      render();
      toast("Sessao criada. Agora inicie a primeira atividade.");
    }
    if (event.target.id === "fieldActivityForm") {
      const payload = formData(event.target);
      const session = activeFieldSession();
      const eventTime = currentTimeValue();
      if (!session) return;
      if (!session.currentActivity) {
        session.currentActivity = {
          start_time: eventTime,
          id1: payload.id1,
          id2: payload.id2,
          comentario: payload.comentario || "",
        };
        audit("atividade_afericao_iniciada", "field_sessions", session.id, `Atividade ${payload.id1}/${payload.id2} iniciada as ${eventTime}.`);
        saveDb();
        render();
        toast("Atividade iniciada. Na proxima troca, o intervalo sera lancado para toda a equipe.");
        return;
      }
      const result = launchRowsForActivity(session, eventTime, "troca");
      if (!result.created) {
        toast("Informe um horario maior que o inicio da atividade atual.");
        return;
      }
      session.currentActivity = {
        start_time: eventTime,
        id1: payload.id1,
        id2: payload.id2,
        comentario: payload.comentario || "",
      };
      saveDb();
      render();
      toast(`Intervalo salvo: ${result.created} apontamentos de ${fmt.format(result.hhEach)} Hh cada.`);
    }
  });
}

async function init() {
  state.db = loadDb();
  saveDb();
  populateFilters();
  const supabaseSession = getSupabaseSession();
  if (supabaseReady() && supabaseSession?.user?.id) {
    try {
      const profile = await fetchSupabaseProfile(supabaseSession.user.id);
      if (profile?.status === "approved") {
        const user = localUserFromProfile(profile);
        const index = state.db.users.findIndex((item) => item.id === user.id);
        if (index >= 0) state.db.users[index] = user;
        else state.db.users.push(user);
        if (user.profileMode === "developer") await fetchSupabaseProfiles();
        state.currentUser = {
          id: user.id,
          email: user.email,
          role: user.role || "user",
          name: user.name || user.email,
          profileMode: user.profileMode || "client",
        };
        state.profileMode = state.currentUser.profileMode;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.currentUser));
      } else {
        clearSupabaseSession();
        state.currentUser = null;
      }
    } catch {
      clearSupabaseSession();
      state.currentUser = null;
    }
  } else {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session) {
    state.currentUser = JSON.parse(session);
    const freshUser = findUserByEmail(state.currentUser.email);
    if (freshUser?.status === "approved") {
      state.currentUser = {
        id: freshUser.id,
        email: freshUser.email,
        role: freshUser.role || "user",
        name: freshUser.name || freshUser.email,
        profileMode: freshUser.profileMode || "client",
      };
      state.profileMode = state.currentUser.profileMode;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.currentUser));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      state.currentUser = null;
    }
    }
  }
  if (state.currentUser) {
    $("#loginView").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
  }
  bindEvents();
  render();
  setInterval(updateLiveClocks, 1000);
}

init();
