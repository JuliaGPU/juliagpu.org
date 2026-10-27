import { STATS, annotations, environmentDiff } from "benchmark-action/data.js";
import * as S from "benchmark-action/stats.js";
import { loadRegistry, loadPackage } from "./load.js";

const MAX_SERIES = 8;
const DEFAULT_WINDOW = 180;
const DAY = 24 * 3600 * 1000;

const $ = (id) => document.getElementById(id);

const state = {
  pkg: null,
  dataUrl: null,
  configUrl: null,
  cat: null,
  view: "history",
  stat: null,
  window: DEFAULT_WINDOW,
  selected: [], // series keys, `g:<group>` or `b:<benchmark>`
  filter: "",
  sort: { col: "trend", desc: true },
  from: null,
  to: null,
  compareFilter: "",
  onlyUnusual: false,
  compareSort: { col: "score", desc: true },
};

let registry;
let ds; // the dataset of the current package
let annots = [];
let chart;
const slots = new Map(); // series key -> colour slot, kept while the series is selected
const datasets = new Map(); // package key -> dataset promise

// Formatting

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function formatValue(v, stat = state.stat) {
  if (v == null || isNaN(v)) return "—";
  const unit = STATS[stat]?.unit || "time";
  const num = (x) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2));
  if (unit === "time") {
    if (v >= 1e9) return num(v / 1e9) + " s";
    if (v >= 1e6) return num(v / 1e6) + " ms";
    if (v >= 1e3) return num(v / 1e3) + " µs";
    return num(v) + " ns";
  }
  if (unit === "bytes") {
    if (v >= 2 ** 30) return num(v / 2 ** 30) + " GiB";
    if (v >= 2 ** 20) return num(v / 2 ** 20) + " MiB";
    if (v >= 2 ** 10) return num(v / 2 ** 10) + " KiB";
    return v.toFixed(0) + " B";
  }
  return v >= 1000 ? Math.round(v).toLocaleString("en-US") : String(+v.toFixed(2));
}

// a change given as a log ratio
function formatChange(d, digits = 1) {
  if (d == null || isNaN(d)) return "—";
  const pct = (Math.exp(d) - 1) * 100;
  if (Math.abs(pct) < 0.05) return "0.0%";
  return (pct > 0 ? "+" : "−") + Math.abs(pct).toFixed(digits) + "%";
}

function formatPct(pct) {
  if (pct == null || isNaN(pct)) return "—";
  return (pct > 0 ? "+" : pct < 0 ? "−" : "") + Math.abs(pct).toFixed(1) + "%";
}

function formatNoise(sigma) {
  if (sigma == null || isNaN(sigma)) return "—";
  return "±" + ((Math.exp(sigma) - 1) * 100).toFixed(1) + "%";
}

function formatDate(t) {
  return new Date(t).toISOString().slice(0, 10);
}

// Ticks at the runs where a period begins: months for ranges of more than 120 days, else
// days, at most about ten. Their labels go to `tickLabels`.
const tickLabels = new Map();

function calendarTicks(min, max) {
  const lo = Math.max(0, Math.ceil(min));
  const hi = Math.min(ds.runs.length - 1, Math.floor(max));
  tickLabels.clear();
  if (hi < lo) return [];
  const months = ds.runs[hi].date - ds.runs[lo].date > 120 * DAY;
  const fmt = months
    ? { month: "short", year: "numeric", timeZone: "UTC" }
    : { month: "short", day: "numeric", timeZone: "UTC" };
  const starts = [];
  let last = null;
  for (let r = lo; r <= hi; r++) {
    const label = new Date(ds.runs[r].date).toLocaleDateString("en-US", fmt);
    if (label !== last) starts.push({ value: r, label });
    last = label;
  }
  // months with few runs would crowd their labels: keep ticks a tenth of the range apart
  const gap = (hi - lo) / 10;
  const ticks = [];
  for (const t of starts) if (!ticks.length || t.value - ticks[ticks.length - 1].value >= gap) ticks.push(t);
  for (const t of ticks) tickLabels.set(t.value, t.label);
  return ticks.map((t) => ({ value: t.value }));
}

function changeClass(x) {
  return x > 0 ? "worse" : x < 0 ? "better" : "";
}

// a slower measurement is worse, for every metric we record
function verdict(sign, unconfirmed) {
  if (!sign) return "";
  const cls = `flag ${changeClass(sign)}${unconfirmed ? " unconfirmed" : ""}`;
  const text = sign > 0 ? "▲ worse" : "▼ better";
  return `<span class="${cls}">${text}${unconfirmed ? "?" : ""}</span>`;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// URL state

function readURL() {
  const p = new URLSearchParams(location.search);
  state.pkg = p.get("pkg");
  state.dataUrl = p.get("data");
  state.configUrl = p.get("config");
  state.cat = p.get("cat");
  state.view = p.get("view") === "compare" ? "compare" : "history";
  state.stat = p.get("stat");
  if (p.has("w")) state.window = parseInt(p.get("w")) || 0;
  state.selected = p.has("sel") ? p.get("sel").split(",").filter(Boolean) : null;
  state.filter = p.get("q") || "";
  state.from = p.get("from");
  state.to = p.get("to");
  state.compareFilter = p.get("cq") || "";
  state.onlyUnusual = p.get("u") === "1";
}

function writeURL() {
  const p = new URLSearchParams();
  if (state.pkg) p.set("pkg", state.pkg);
  if (state.dataUrl) p.set("data", state.dataUrl);
  if (state.configUrl) p.set("config", state.configUrl);
  p.set("cat", state.cat);
  if (state.view === "compare") p.set("view", "compare");
  if (state.stat && state.stat !== defaultStat()) p.set("stat", state.stat);
  if (state.view === "history") {
    if (state.window !== DEFAULT_WINDOW) p.set("w", state.window);
    p.set("sel", state.selected.join(","));
    if (state.filter) p.set("q", state.filter);
  } else {
    if (state.from) p.set("from", state.from);
    if (state.to) p.set("to", state.to);
    if (state.compareFilter) p.set("cq", state.compareFilter);
    if (state.onlyUnusual) p.set("u", "1");
  }
  const url = `${location.pathname}?${p.toString().replace(/%2F/g, "/").replace(/%2C/g, ",").replace(/%3A/g, ":")}`;
  history.replaceState(null, "", url);
}

// Dataset queries

function defaultStat() {
  if (!ds) return null;
  for (const s of [ds.config.stat, "min", "time", "median", "mean"]) if (ds.stats[s]) return s;
  return Object.keys(ds.stats)[0];
}

function values() {
  return ds.stats[state.stat];
}

function category() {
  return ds.config.categories.find((c) => c.id === state.cat);
}

function windowRange() {
  const last = ds.runs.length - 1;
  if (!state.window) return { from: 0, to: last };
  const cutoff = ds.runs[last].date - state.window * DAY;
  let from = 0;
  while (from < last && ds.runs[from].date < cutoff) from++;
  return { from, to: last };
}

function benchesIn(cat, from = 0, to = ds.runs.length - 1) {
  const v = values();
  const out = [];
  ds.benches.forEach((b, i) => {
    if (b.category !== cat) return;
    for (let r = from; r <= to; r++)
      if (!isNaN(v[i][r])) return out.push(i);
  });
  return out;
}

function boundaries(i) {
  return S.boundariesFor(annots, ds.benches[i].name);
}

function groupsOf(idx) {
  const groups = new Map();
  for (const i of idx) {
    const g = ds.benches[i].group;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(i);
  }
  return groups;
}

function chainOf(idx, from, to) {
  const v = values();
  return S.chainIndex(
    idx.map((i) => v[i]),
    from,
    to,
    { boundaries: idx.map(boundaries) },
  );
}

function lastLevel(level) {
  for (let i = level.length - 1; i >= 0; i--) if (!isNaN(level[i])) return level[i];
  return NaN;
}

function runIndex(commit) {
  if (!commit) return -1;
  for (let r = ds.runs.length - 1; r >= 0; r--) if (ds.runs[r].commit.startsWith(commit)) return r;
  return -1;
}

// Series selection and colours

function seriesColor(key) {
  return cssVar(`--s${slots.get(key) + 1}`);
}

function select(key) {
  if (state.selected.includes(key)) return;
  if (state.selected.length >= MAX_SERIES) {
    flash(`At most ${MAX_SERIES} series can be shown at once; deselect one first.`);
    return;
  }
  const used = new Set(state.selected.map((k) => slots.get(k)));
  let slot = 0;
  while (used.has(slot)) slot++;
  slots.set(key, slot);
  state.selected.push(key);
}

function deselect(key) {
  state.selected = state.selected.filter((k) => k !== key);
  slots.delete(key);
}

function toggle(key) {
  if (state.selected.includes(key)) deselect(key);
  else select(key);
  render();
}

function resetSelection(groupNames) {
  slots.clear();
  const keys = state.selected ?? (groupNames.length <= MAX_SERIES ? groupNames.map((g) => `g:${g}`) : []);
  state.selected = [];
  for (const k of keys) select(k);
}

let flashTimer;
function flash(text) {
  const el = $("table-status");
  el.textContent = text;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(render, 3000);
}

// Rendering

function renderHeader() {
  const pkgs = $("packages");
  pkgs.innerHTML = "";
  if (!state.dataUrl) {
    for (const [key, p] of Object.entries(registry.packages)) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = p.name;
      b.setAttribute("aria-pressed", key === state.pkg);
      b.onclick = () => switchPackage(key);
      pkgs.append(b);
    }
  }

  const cats = $("categories");
  cats.innerHTML = "";
  for (const c of ds.config.categories) {
    const n = ds.benches.filter((b) => b.category === c.id).length;
    if (n === 0) continue;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = c.label;
    b.title = c.description;
    b.setAttribute("aria-pressed", c.id === state.cat);
    b.onclick = () => {
      state.cat = c.id;
      state.selected = null;
      render();
    };
    cats.append(b);
  }
  $("category-description").textContent = category().description;

  for (const b of $("views").querySelectorAll("button"))
    b.setAttribute("aria-pressed", b.dataset.view === state.view);

  const stat = $("stat");
  stat.innerHTML = "";
  for (const s of Object.keys(STATS)) {
    if (!ds.stats[s]) continue;
    const o = document.createElement("option");
    o.value = s;
    o.textContent = STATS[s].label;
    stat.append(o);
  }
  stat.value = state.stat;
  $("window").value = String(state.window);

  const last = ds.runs[ds.runs.length - 1];
  $("updated").textContent = `Latest run ${formatDate(last.date)} · ${ds.runs.length} runs`;
  const pkg = registry.packages[state.pkg];
  const gpu = last.env.gpu || pkg?.hardware;
  $("hardware").textContent = gpu ? `Measured on ${gpu}.` : "";
  $("data-link").href = state.dataUrl || pkg?.history || pkg?.data;

  document.querySelectorAll(".history-only").forEach((el) => (el.hidden = state.view !== "history"));
  document.querySelectorAll(".compare-only").forEach((el) => (el.hidden = state.view !== "compare"));
  if (state.view === "history") $("reset-zoom").hidden = !chart?.isZoomedOrPanned?.();
}

function sparkline(level) {
  const pts = [];
  let lo = Infinity;
  let hi = -Infinity;
  level.forEach((y) => {
    if (isNaN(y)) return;
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  });
  if (!isFinite(lo)) return "";
  const n = level.length;
  const span = hi - lo || 1;
  level.forEach((y, i) => {
    if (isNaN(y)) return;
    const x = n > 1 ? (i / (n - 1)) * 62 + 1 : 32;
    pts.push(`${x.toFixed(1)},${(18 - ((y - lo) / span) * 16).toFixed(1)}`);
  });
  return `<svg class="spark" viewBox="0 0 64 20" aria-hidden="true"><path d="M${pts.join("L")}"/></svg>`;
}

function renderHistory() {
  const { from, to } = windowRange();
  const idx = benchesIn(state.cat, from, to);
  const groups = groupsOf(idx);
  if (state.selected === null) resetSelection([...groups.keys()]);

  const chains = new Map();
  for (const [g, gi] of groups) chains.set(g, chainOf(gi, from, to));
  const overall = S.combineIndices([...chains.values()]);

  // sidebar
  const list = $("group-list");
  const trendCell = (level) => {
    const t = (lastLevel(level) - 1) * 100;
    return `<span class="trend ${changeClass(Math.abs(t) >= 1 ? t : 0)}">${formatPct(t)}</span>`;
  };
  let html = `<li class="overall" title="Every group weighted equally"><span class="chip line" style="background:var(--text)"></span><span class="name">Overall</span>${trendCell(overall.level)}${sparkline(overall.level)}</li>`;
  for (const [g, gi] of groups) {
    const key = `g:${g}`;
    const on = state.selected.includes(key);
    const chip = on ? `background:${seriesColor(key)};border-color:${seriesColor(key)}` : "";
    html += `<li data-key="${esc(key)}" aria-selected="${on}" title="Show or hide ${esc(g)}"><span class="chip" style="${chip}"></span><span class="name">${esc(g).replace(/[/_]/g, "$&<wbr>")} <span class="count">${gi.length}</span></span>${trendCell(chains.get(g).level)}${sparkline(chains.get(g).level)}</li>`;
  }
  list.innerHTML = html;
  list.querySelectorAll("li[data-key]").forEach((li) => (li.onclick = () => toggle(li.dataset.key)));

  renderChart(from, to, chains, overall);
  renderBenchTable(from, to, idx);
}

function relativeSeries(level, from, to) {
  const data = [];
  for (let r = from; r <= to; r++) {
    const y = level[r - from];
    data.push({ x: r, y: isNaN(y) ? null : (y - 1) * 100 });
  }
  return data;
}

function renderChart(from, to, chains, overall) {
  const v = values();
  const text = cssVar("--text");
  const muted = cssVar("--muted");
  const grid = cssVar("--grid");
  const series = [];

  const benchKeys = state.selected.filter((k) => k.startsWith("b:"));
  const absolute = state.selected.length === 1 && benchKeys.length === 1;

  if (absolute) {
    const name = benchKeys[0].slice(2);
    const i = ds.benches.findIndex((b) => b.name === name);
    const s = v[i];
    const summary = S.summarize(s, from, to, { boundaries: boundaries(i), floor: category().floor });
    const flags = new Map((summary?.flagged || []).map((f) => [f.to, f]));
    const data = [];
    const colors = [];
    const radii = [];
    for (let r = from; r <= to; r++) {
      data.push({ x: r, y: isNaN(s[r]) ? null : s[r] });
      const f = flags.get(r);
      colors.push(f ? cssVar(f.sign > 0 ? "--worse" : "--better") : seriesColor(benchKeys[0]));
      radii.push(f ? 5 : 2);
    }
    series.push({
      label: ds.benches[i].short,
      data,
      bench: i,
      borderColor: seriesColor(benchKeys[0]),
      pointBackgroundColor: colors,
      pointBorderColor: colors,
      pointRadius: radii,
    });
  } else {
    series.push({ label: "Overall", data: relativeSeries(overall.level, from, to), borderColor: text, borderWidth: 2.5, order: -1 });
    for (const key of state.selected) {
      let level;
      let bench;
      if (key.startsWith("g:")) {
        level = chains.get(key.slice(2))?.level;
      } else {
        bench = ds.benches.findIndex((b) => b.name === key.slice(2));
        if (bench >= 0) level = chainOf([bench], from, to).level;
      }
      if (!level) continue;
      const label = bench == null ? key.slice(2) : ds.benches[bench].short;
      series.push({ label, data: relativeSeries(level, from, to), bench, borderColor: seriesColor(key) });
    }
  }

  $("legend").innerHTML = series
    .map((s) => `<span><span class="chip line" style="background:${s.borderColor}"></span>${esc(s.label)}</span>`)
    .join("");

  const many = to - from > 120;
  const config = {
    type: "line",
    data: {
      datasets: series.map((s) => ({
        borderWidth: 2,
        pointRadius: many ? 0 : 2,
        pointHoverRadius: 5,
        pointHitRadius: 8,
        spanGaps: true,
        tension: 0,
        ...s,
        backgroundColor: s.borderColor,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      normalized: true,
      interaction: { mode: "index", intersect: false, axis: "x" },
      scales: {
        x: {
          type: "linear",
          min: from,
          max: to,
          grid: { color: grid },
          // the runs are not evenly spaced in time, so ticks go to the first run of a month
          // (or a day), with the scale's range following the zoom
          afterBuildTicks: (scale) => {
            scale.ticks = calendarTicks(scale.min, scale.max);
          },
          ticks: {
            color: muted,
            maxRotation: 0,
            autoSkip: false,
            callback: (x) => tickLabels.get(x) ?? "",
          },
        },
        y: {
          ...robustRange(series),
          grid: { color: grid },
          ticks: {
            color: muted,
            includeBounds: false,
            callback: (y) => (absolute ? formatValue(y) : formatPct(y)),
          },
          title: {
            display: true,
            color: muted,
            text: absolute ? STATS[state.stat].label : `Change since ${formatDate(ds.runs[firstShown(series, from)].date)}`,
          },
          beginAtZero: false,
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: cssVar("--raised"),
          titleColor: text,
          bodyColor: text,
          footerColor: muted,
          borderColor: cssVar("--axis"),
          borderWidth: 1,
          usePointStyle: true,
          boxHeight: 3,
          callbacks: {
            title: (items) => {
              const r = ds.runs[items[0]?.raw.x];
              return r ? `${formatDate(r.date)}  ${r.short}` : "";
            },
            afterTitle: (items) => {
              const r = ds.runs[items[0]?.raw.x];
              return r ? r.subject.slice(0, 72) : "";
            },
            label: (item) => {
              const y = item.raw.y;
              if (y == null) return null;
              if (absolute) return `${formatValue(y)}  ${item.dataset.label}`;
              const bench = item.dataset.bench;
              const abs = bench != null ? `  (${formatValue(v[bench][item.raw.x])})` : "";
              return `${formatPct(y)}  ${item.dataset.label}${abs}`;
            },
            labelPointStyle: () => ({ pointStyle: "line", rotation: 0 }),
            // what explains a change the commit does not
            afterBody: (items) => {
              const r = items[0]?.raw.x;
              if (!r) return [];
              const diff = environmentDiff(ds.runs[r - 1].env, ds.runs[r].env);
              return diff.length ? ["", ...diff.map((d) => `${d.label} ${d.from} → ${d.to}`)] : [];
            },
            footer: (items) => (items[0]?.raw.x > 0 ? "Click to compare with the previous run" : ""),
          },
        },
        zoom: {
          zoom: {
            drag: { enabled: true, backgroundColor: "rgba(127,127,127,0.15)" },
            mode: "x",
            onZoomComplete: () => ($("reset-zoom").hidden = false),
          },
        },
        annotation: { annotations: noteAnnotations(from, to) },
      },
      onClick: (evt, elements, c) => {
        const el = elements[0];
        const x = el && c.data.datasets[el.datasetIndex].data[el.index].x;
        if (x == null || x === 0) return;
        state.from = ds.runs[x - 1].short;
        state.to = ds.runs[x].short;
        state.view = "compare";
        render();
        window.scrollTo(0, 0);
      },
      onHover: (evt, elements) => {
        evt.native.target.style.cursor = elements.length ? "pointer" : "";
      },
    },
    plugins: [crosshair],
  };

  if (chart) chart.destroy();
  chart = new Chart($("chart"), config);
}

// The first run any series has a value for.
function firstShown(series, from) {
  let first = Infinity;
  for (const s of series) {
    const p = s.data.find((p) => p.y != null);
    if (p) first = Math.min(first, p.x);
  }
  return isFinite(first) ? first : from;
}

// The y range of the 1st to the 99th percentile of the values shown, with some room, so a
// single outlying run does not flatten everything else; it runs off the chart instead.
function robustRange(series) {
  const ys = series.flatMap((s) => s.data.map((p) => p.y)).filter((y) => y != null).sort((a, b) => a - b);
  if (ys.length < 20) return {};
  const lo = ys[Math.floor(ys.length * 0.01)];
  const hi = ys[Math.ceil(ys.length * 0.99) - 1];
  const pad = (hi - lo) * 0.15 || Math.abs(hi) * 0.05 || 1;
  return {
    min: ys[0] < lo - pad ? lo - pad : undefined,
    max: ys[ys.length - 1] > hi + pad ? hi + pad : undefined,
  };
}

// a vertical hairline at the hovered run
const crosshair = {
  id: "crosshair",
  afterDatasetsDraw(c) {
    const active = c.tooltip?.getActiveElements?.();
    if (!active?.length) return;
    const x = active[0].element.x;
    const { top, bottom } = c.chartArea;
    const ctx = c.ctx;
    ctx.save();
    ctx.strokeStyle = cssVar("--axis");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.restore();
  },
};

// Dashed lines with labels for the annotations within the runs shown, between the run
// before the change and the first run after it. Labels that would overlap are moved
// down a row.
function noteAnnotations(from, to) {
  const out = {};
  const visible = annots.filter((a) => a.run > from && a.run <= to);
  const rowEnd = [];
  const span = Math.max(1, to - from);
  const muted = cssVar("--muted");
  const tip = $("note-tip");
  visible.forEach((a, k) => {
    // a label is about 7px per character; keep labels of one row this far apart
    const width = ((a.label.length * 7 + 16) / 900) * span;
    let row = rowEnd.findIndex((end) => end < a.run);
    if (row < 0) row = rowEnd.length;
    rowEnd[row] = a.run + width;
    out[`note${k}`] = {
      type: "line",
      xMin: a.run - 0.5,
      xMax: a.run - 0.5,
      borderColor: muted,
      borderWidth: 1,
      borderDash: a.rebase ? [] : [4, 4],
      label: {
        display: true,
        content: a.label,
        position: "end",
        yAdjust: row * 22,
        backgroundColor: cssVar("--raised"),
        color: cssVar("--text-2"),
        borderColor: cssVar("--axis"),
        borderWidth: 1,
        font: { size: 11 },
        padding: 3,
      },
      enter: (ctx, event) => {
        tip.innerHTML = `<strong>${esc(a.label)}</strong>${esc(a.description || "")}${a.rebase ? "<br><em>Values before and after are not compared.</em>" : ""}${a.url ? "<br>Click to open the change." : ""}`;
        tip.hidden = false;
        tip.style.left = `${Math.min(event.native.clientX + 12, window.innerWidth - 380)}px`;
        tip.style.top = `${event.native.clientY + 12}px`;
      },
      leave: () => {
        tip.hidden = true;
      },
      click: a.url ? () => window.open(a.url, "_blank", "noopener") : undefined,
    };
  });
  return out;
}

function sortRows(rows, sort) {
  const dir = sort.desc ? -1 : 1;
  rows.sort((a, b) => {
    const x = a[sort.col];
    const y = b[sort.col];
    const xm = x == null || (typeof x === "number" && isNaN(x));
    const ym = y == null || (typeof y === "number" && isNaN(y));
    if (xm || ym) return xm - ym;
    return (typeof x === "string" ? x.localeCompare(y) : x - y) * dir;
  });
}

function tableHead(thead, cols, sort, onSort) {
  thead.innerHTML = `<tr>${cols
    .map(([key, label, title]) => {
      const aria = sort.col === key ? ` aria-sort="${sort.desc ? "descending" : "ascending"}"` : "";
      return `<th data-col="${key}"${aria}${title ? ` title="${esc(title)}"` : ""}>${label}</th>`;
    })
    .join("")}</tr>`;
  thead.querySelectorAll("th").forEach((th) => {
    th.onclick = () => {
      const col = th.dataset.col;
      if (sort.col === col) sort.desc = !sort.desc;
      else {
        sort.col = col;
        sort.desc = col !== "name";
      }
      onSort();
    };
  });
}

function renderBenchTable(from, to, idx) {
  const v = values();
  const floor = category().floor;
  const needle = state.filter.toLowerCase();
  const rows = [];
  for (const i of idx) {
    const b = ds.benches[i];
    if (needle && !b.name.toLowerCase().includes(needle)) continue;
    const s = S.summarize(v[i], from, to, { boundaries: boundaries(i), floor });
    if (!s) continue;
    // a change the next run has not confirmed yet only shows as the last change
    const confirmed = s.flagged.filter((f) => !f.unconfirmed);
    const worse = confirmed.filter((f) => f.sign > 0);
    const better = confirmed.filter((f) => f.sign < 0);
    // the last change of a series that is no longer measured is history, not news
    const current = s.latestRun === to;
    if (!current) s.last = null;
    rows.push({
      i,
      name: b.name,
      short: b.short,
      latest: s.latest,
      latestRun: s.latestRun,
      current,
      trend: Math.abs(s.trend),
      trendSigned: s.trend,
      last: s.last ? Math.abs(s.last.d) : NaN,
      lastD: s.last?.d,
      lastSign: s.last?.sign,
      noise: s.noise,
      unusual: confirmed.length,
      worse,
      better,
    });
  }
  sortRows(rows, state.sort);

  tableHead(
    $("bench-table").querySelector("thead"),
    [
      ["name", "Benchmark"],
      ["latest", "Latest"],
      ["trend", "Change in range", "The median of the last three runs against the first three in the range (after the last setup change that affects the benchmark)"],
      ["last", "Last change", "The latest run against the run before"],
      ["noise", "Noise", "The typical change between consecutive runs: a robust standard deviation over the last 40 changes, after the last change to how the benchmark is measured"],
      ["unusual", "Unusual changes", "Changes in the range that stand out from the noise and hold at the next run"],
    ],
    state.sort,
    render,
  );

  const runList = (fs) => fs.map((f) => `${formatDate(ds.runs[f.to].date)} ${ds.runs[f.to].short} ${formatChange(f.d)}`).join("\n");
  const body = rows
    .map((r) => {
      const key = `b:${r.name}`;
      const on = state.selected.includes(key);
      const chip = on ? `background:${seriesColor(key)};border-color:${seriesColor(key)}` : "";
      const changes = [
        r.worse.length ? `<span class="worse" title="${esc(runList(r.worse))}">▲${r.worse.length}</span>` : "",
        r.better.length ? `<span class="better" title="${esc(runList(r.better))}">▼${r.better.length}</span>` : "",
      ].join(" ");
      return `<tr data-key="${esc(key)}" class="${on ? "selected" : ""}">
        <td class="name" title="${esc(r.name)}"><span class="chip" style="${chip}"></span>${esc(r.short)}</td>
        <td>${r.current ? "" : `<span class="muted" title="Not measured since">${formatDate(ds.runs[r.latestRun].date)}</span> `}${formatValue(r.latest)}</td>
        <td class="${Math.abs(r.trendSigned) >= 0.01 ? changeClass(r.trendSigned) : ""}">${formatPct(r.trendSigned * 100)}</td>
        <td>${formatChange(r.lastD)} ${verdict(r.lastSign, true)}</td>
        <td>${formatNoise(r.noise)}</td>
        <td>${changes}</td>
      </tr>`;
    })
    .join("");
  const tbody = $("bench-table").querySelector("tbody");
  tbody.innerHTML = body || `<tr><td colspan="6">No benchmarks match.</td></tr>`;
  tbody.querySelectorAll("tr[data-key]").forEach((tr) => (tr.onclick = () => toggle(tr.dataset.key)));

  const flagged = rows.filter((r) => r.unusual > 0).length;
  $("table-status").textContent = `${rows.length} benchmarks, ${flagged} with unusual changes in this range. Click a row to plot it.`;
}

// Compare view

function renderCompare() {
  const runs = ds.runs;
  let b = runIndex(state.to);
  if (b < 0) b = runs.length - 1;
  let a = runIndex(state.from);
  if (a < 0 || a === b) a = Math.max(0, b - 1);
  state.from = runs[a].short;
  state.to = runs[b].short;

  for (const [id, sel] of [["from", a], ["to", b]]) {
    const el = $(id);
    if (el.options.length !== runs.length) {
      el.innerHTML = runs
        .map((r, i) => `<option value="${i}">${formatDate(r.date)} ${r.short} ${esc(r.subject.slice(0, 60))}</option>`)
        .reverse()
        .join("");
    }
    el.value = String(sel);
  }
  const repo = registry.packages[state.pkg]?.repo || ds.repoUrl;
  const gh = $("github-compare");
  gh.hidden = !repo;
  if (repo) gh.href = `${repo}/compare/${runs[a].commit}...${runs[b].commit}`;

  const v = values();
  const results = new Map();
  for (const c of ds.config.categories) {
    const rows = [];
    for (const i of benchesIn(c.id)) {
      const cmp = S.compareRuns(v[i], a, b, { boundaries: boundaries(i), floor: c.floor });
      rows.push({ i, name: ds.benches[i].name, short: ds.benches[i].short, ...cmp });
    }
    if (rows.length) results.set(c.id, rows);
  }

  // one card per category
  const cards = [];
  for (const [cat, rows] of results) {
    const c = ds.config.categories.find((x) => x.id === cat);
    const both = rows.filter((r) => !isNaN(r.d) && !r.boundary);
    const g = both.length ? both.reduce((s, r) => s + r.d, 0) / both.length : NaN;
    const worse = rows.filter((r) => r.sign > 0).length;
    const better = rows.filter((r) => r.sign < 0).length;
    cards.push(`<div class="card${cat === state.cat ? " active" : ""}" data-cat="${esc(cat)}">
      <h3>${esc(c.label)}</h3>
      <div class="big ${Math.abs(g) >= 0.01 ? changeClass(g) : ""}" title="Geometric mean of the change of the ${both.length} benchmarks measured in both runs">${formatChange(g)}</div>
      <div class="counts"><span class="worse">▲ ${worse} worse</span><span class="better">▼ ${better} better</span><span class="muted">${both.length} compared</span></div>
    </div>`);
  }
  const summary = $("compare-summary");
  summary.innerHTML = cards.join("");
  const diff = environmentDiff(runs[a].env, runs[b].env);
  $("compare-env").innerHTML = diff.length
    ? `<strong>Environment:</strong> ${diff.map((d) => `${esc(d.label)} ${esc(d.from)} → ${esc(d.to)}`).join(", ")}`
    : "";
  summary.querySelectorAll(".card").forEach((el) => {
    el.onclick = () => {
      state.cat = el.dataset.cat;
      render();
    };
  });

  const floor = category().floor;
  const needle = state.compareFilter.toLowerCase();
  const rows = (results.get(state.cat) || [])
    .filter((r) => !needle || r.name.toLowerCase().includes(needle))
    .filter((r) => !state.onlyUnusual || r.sign)
    .map((r) => {
      const threshold = Math.max(S.NOISE_FACTOR * (isNaN(r.noise) ? 0 : r.noise), Math.log(1 + floor));
      return { ...r, change: Math.abs(r.d), score: isNaN(r.d) ? NaN : Math.abs(r.d) / threshold };
    });
  sortRows(rows, state.compareSort);
  lastCompare = { a, b, rows };

  tableHead(
    $("compare-table").querySelector("thead"),
    [
      ["name", "Benchmark"],
      ["va", "Baseline"],
      ["vb", "Compared"],
      ["change", "Change"],
      ["noise", "Noise", "The typical change between consecutive runs up to the baseline (robust standard deviation)"],
      ["score", "Verdict", "Sorted by the size of the change relative to the threshold for an unusual change"],
    ],
    state.compareSort,
    render,
  );
  const body = rows
    .map((r) => {
      let note = verdict(r.sign);
      if (r.boundary) note = `<span class="muted" title="The way this benchmark is measured changed between the two runs">not comparable</span>`;
      else if (isNaN(r.va) && !isNaN(r.vb)) note = `<span class="muted">new</span>`;
      else if (!isNaN(r.va) && isNaN(r.vb)) note = `<span class="muted">not measured</span>`;
      else if (r.sign === null && !isNaN(r.d)) note = `<span class="muted" title="Not enough history to estimate the noise">noise unknown</span>`;
      return `<tr data-name="${esc(r.name)}" title="Show the history of this benchmark">
        <td title="${esc(r.name)}">${esc(r.short)}</td>
        <td>${formatValue(r.va)}</td>
        <td>${formatValue(r.vb)}</td>
        <td class="${r.sign ? changeClass(r.sign) : ""}">${formatChange(r.d)}</td>
        <td>${formatNoise(r.noise)}</td>
        <td>${note}</td>
      </tr>`;
    })
    .join("");
  const tbody = $("compare-table").querySelector("tbody");
  tbody.innerHTML = body || `<tr><td colspan="6">No benchmarks match.</td></tr>`;
  tbody.querySelectorAll("tr[data-name]").forEach((tr) => {
    tr.onclick = () => showHistoryOf(tr.dataset.name, a);
  });
  $("compare-status").textContent = `${rows.length} benchmarks`;
}

let lastCompare;

// Switch to the history of one benchmark, over a range that includes run `from`.
function showHistoryOf(name, from) {
  const age = (ds.runs[ds.runs.length - 1].date - ds.runs[from].date) / DAY;
  const fits = [...$("window").options].map((o) => +o.value).filter((w) => w === 0 || w > age + 7);
  state.window = Math.min(...fits.map((w) => w || Infinity));
  if (!isFinite(state.window)) state.window = 0;
  state.view = "history";
  slots.clear();
  state.selected = [];
  select(`b:${name}`);
  render();
}

function compareMarkdown() {
  const { a, b, rows } = lastCompare;
  const runs = ds.runs;
  const name = state.pkg ? `${registry.packages[state.pkg].name}, ` : "";
  const link = (r) => `[${r.short}](${r.url})`;
  const shown = rows.filter((r) => !isNaN(r.d));
  let md = `${name}${category().label.toLowerCase()} benchmarks, ${STATS[state.stat].label.toLowerCase()}: ${link(runs[a])} → ${link(runs[b])}\n\n`;
  md += `| Benchmark | Baseline | Compared | Change | |\n|:--|--:|--:|--:|:--|\n`;
  for (const r of shown)
    md += `| \`${r.short}\` | ${formatValue(r.va)} | ${formatValue(r.vb)} | ${formatChange(r.d)} | ${r.boundary ? "not comparable" : r.sign > 0 ? "▲ worse" : r.sign < 0 ? "▼ better" : ""} |\n`;
  md += `\n[Details](${location.href})\n`;
  return md;
}

// Top level

function render() {
  if (!ds) return;
  if (!ds.stats[state.stat]) state.stat = defaultStat();
  if (!category() || !ds.benches.some((b) => b.category === state.cat)) {
    if (state.cat) state.selected = null;
    state.cat = ds.config.categories.find((c) => ds.benches.some((b) => b.category === c.id)).id;
  }
  renderHeader();
  $("history").hidden = state.view !== "history";
  $("compare").hidden = state.view !== "compare";
  if (state.view === "history") renderHistory();
  else renderCompare();
  writeURL();
}

function showMessage(text) {
  const m = $("message");
  m.textContent = text;
  m.hidden = !text;
}

async function switchPackage(key) {
  if (key === state.pkg && ds) return;
  state.pkg = key;
  state.selected = null;
  state.from = state.to = null;
  await load();
}

let loading = 0;

async function load() {
  const generation = ++loading;
  // `?data=` and `?config=` replace those of `?pkg=` (to preview them), or show data of
  // their own
  let pkg = registry.packages[state.pkg] || { name: state.dataUrl };
  if (state.dataUrl) pkg = { ...pkg, history: state.dataUrl, data: undefined };
  if (state.configUrl) pkg = { ...pkg, config: state.configUrl };
  const key = [state.pkg, state.dataUrl, state.configUrl].join(" ");
  showMessage(`Loading ${pkg.name} benchmarks…`);
  document.body.style.cursor = "progress";
  try {
    if (!datasets.has(key)) datasets.set(key, loadPackage(pkg));
    const loaded = await datasets.get(key);
    // the user may have switched to another package in the meantime
    if (generation !== loading) return;
    ds = loaded;
    annots = annotations(ds);
    showMessage("");
    slots.clear();
    if (state.selected) {
      const keys = state.selected;
      state.selected = [];
      for (const k of keys) select(k);
    }
    render();
  } catch (e) {
    datasets.delete(key);
    if (generation === loading) showMessage(`Could not load the benchmark data of ${pkg.name}: ${e.message}`);
  } finally {
    if (generation === loading) document.body.style.cursor = "";
  }
}

function bindControls() {
  $("views").querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      state.view = b.dataset.view;
      render();
    };
  });
  $("stat").onchange = (e) => {
    state.stat = e.target.value;
    render();
  };
  $("window").onchange = (e) => {
    state.window = parseInt(e.target.value);
    render();
  };
  $("reset-zoom").onclick = () => {
    chart?.resetZoom();
    $("reset-zoom").hidden = true;
  };
  $("groups-none").onclick = () => {
    slots.clear();
    state.selected = [];
    render();
  };
  $("filter").value = state.filter;
  $("filter").oninput = (e) => {
    state.filter = e.target.value;
    render();
  };
  $("compare-filter").value = state.compareFilter;
  $("compare-filter").oninput = (e) => {
    state.compareFilter = e.target.value;
    render();
  };
  $("only-unusual").checked = state.onlyUnusual;
  $("only-unusual").onchange = (e) => {
    state.onlyUnusual = e.target.checked;
    render();
  };
  $("from").onchange = (e) => {
    state.from = ds.runs[+e.target.value].short;
    render();
  };
  $("to").onchange = (e) => {
    state.to = ds.runs[+e.target.value].short;
    render();
  };
  $("swap").onclick = () => {
    [state.from, state.to] = [state.to, state.from];
    render();
  };
  $("copy-markdown").onclick = async () => {
    try {
      await navigator.clipboard.writeText(compareMarkdown());
      $("compare-status").textContent = "Copied.";
    } catch {
      $("compare-status").textContent = "Could not access the clipboard.";
    }
  };
  $("theme").onclick = () => {
    const root = document.documentElement;
    const next = { undefined: "light", light: "dark", dark: undefined }[root.dataset.theme];
    if (next) root.dataset.theme = next;
    else delete root.dataset.theme;
    try {
      if (next) localStorage.setItem("perf-theme", next);
      else localStorage.removeItem("perf-theme");
    } catch {}
    render();
  };
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", render);
}

async function main() {
  for (const plugin of [window.ChartZoom, window["chartjs-plugin-annotation"]]) if (plugin) Chart.register(plugin);
  readURL();
  bindControls();
  try {
    registry = await loadRegistry();
  } catch (e) {
    showMessage(e.message);
    return;
  }
  if (!registry.packages[state.pkg]) state.pkg = state.dataUrl ? null : Object.keys(registry.packages)[0];
  await load();
}

main();
