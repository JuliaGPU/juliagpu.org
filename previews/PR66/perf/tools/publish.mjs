#!/usr/bin/env node
// Maintains a package's benchmark history and reports on pull requests; run by the
// benchmarks workflow (.github/workflows/benchmarks.yml).
//
//   publish.mjs convert --package P --data data.js --out history.json
//   publish.mjs append  --package P --history history.json --results results.json --run run.json
//                       [--data data.js]
//   publish.mjs comment --package P --history history.json --results results.json --run run.json
//                       --ancestors ancestors.txt --out comment.md [--data data.js]
//
// `--package` is a key of ../packages.json. `run.json` describes the measured commit:
// {id, commit, date, subject, author, url, build, measured}, with `date` the commit's date
// and `measured` when the benchmarks ran. `--data` brings in the runs that
// github-action-benchmark published and the history does not have yet.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDataJs, fromHistory, annotations, STATS } from "../js/data.js";
import * as S from "../js/stats.js";
import { emptyHistory, parseHistory, cloneHistory, validateResults, addRun, importLegacy, checkHistory, serialize } from "./history.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(fs.readFileSync(path.join(root, "packages.json"), "utf8"));
export const MARKER = "<!-- juliagpu-benchmarks -->";
const DASHBOARD = "https://juliagpu.org/perf/";
// the statistic changes are judged on
const STAT = "min";

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[++i];
    else out._.push(argv[i]);
  }
  return out;
}

const readJSON = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

function packageOf(key) {
  const pkg = registry.packages[key];
  if (!pkg) throw new Error(`Unknown package ${key}`);
  return pkg;
}

function readHistory(file, pkg) {
  if (file && fs.existsSync(file)) return parseHistory(fs.readFileSync(file, "utf8"));
  return emptyHistory(pkg.repo);
}

function readNotes(pkg) {
  return pkg.notes ? readJSON(path.join(root, pkg.notes)) : [];
}

function convert(o) {
  const pkg = packageOf(o.package);
  const history = emptyHistory(pkg.repo);
  const n = importLegacy(history, parseDataJs(fs.readFileSync(o.data, "utf8")), pkg.legacy);
  checkHistory(history);
  fs.writeFileSync(o.out, serialize(history));
  console.log(`Converted ${n} runs into ${o.out}`);
}

function runOf(o, results) {
  const meta = readJSON(o.run);
  for (const key of ["commit", "date"]) if (!meta[key]) throw new Error(`run.json lacks ${key}`);
  return {
    id: String(meta.id || `${meta.commit}:${meta.build || ""}`),
    commit: meta.commit,
    date: meta.date,
    subject: (meta.subject || "").split("\n")[0].slice(0, 300),
    author: meta.author || "",
    url: meta.url,
    build: meta.build,
    measured: meta.measured || undefined,
    source: "juliagpu",
    env: results.env,
  };
}

function append(o) {
  const pkg = packageOf(o.package);
  const history = readHistory(o.history, pkg);
  const results = validateResults(readJSON(o.results));
  const added = addRun(history, runOf(o, results), results.benchmarks);
  let imported = 0;
  if (o.data && fs.existsSync(o.data))
    imported = importLegacy(history, parseDataJs(fs.readFileSync(o.data, "utf8")), pkg.legacy);
  checkHistory(history);
  fs.writeFileSync(o.history, serialize(history));
  console.log(`${added ? "Added" : "Already had"} the run; imported ${imported} earlier runs`);
}

// Markdown

const code = (s) => "`" + s.replace(/`/g, "'").replace(/\|/g, "\\|") + "`";

function formatTime(ns) {
  if (ns == null || isNaN(ns)) return "—";
  const num = (x) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2));
  if (ns >= 1e9) return num(ns / 1e9) + " s";
  if (ns >= 1e6) return num(ns / 1e6) + " ms";
  if (ns >= 1e3) return num(ns / 1e3) + " µs";
  return num(ns) + " ns";
}

function formatChange(d) {
  if (d == null || isNaN(d)) return "—";
  const pct = (Math.exp(d) - 1) * 100;
  return (pct >= 0 ? "+" : "−") + Math.abs(pct).toFixed(1) + "%";
}

// The comparison of the results of a pull request with the history of its base branch,
// using the statistic, boundaries, floors and noise model of the dashboard. The baseline
// is the latest measured commit among `ancestors` (the merge base and its ancestors,
// newest first), or else the latest run.
export function report(pkgKey, history, results, run, ancestors) {
  const pkg = packageOf(pkgKey);
  // the pull request's run takes the place of its commit date among the others, so that
  // the notes that apply to it are those of changes made before it. Its commit is renamed
  // so it cannot replace a run of the same commit on the default branch.
  const merged = cloneHistory(history);
  addRun(merged, { ...run, commit: `pull-request:${run.commit}`, id: "pull-request" }, results.benchmarks);
  const ds = fromHistory(merged, { categories: registry.categories });
  ds.notes = readNotes(pkg);
  const annots = annotations(ds);
  const b = ds.runs.findIndex((r) => r.id === "pull-request");
  if (b < 0) throw new Error("The results were measured with an older Julia version than the history");
  const stat = ds.stats[STAT] ? STAT : Object.keys(ds.stats).find((s) => STATS[s].unit === "time");
  const values = ds.stats[stat];

  const measured = new Map();
  ds.runs.forEach((r, i) => i !== b && measured.set(r.commit, i));
  let a = -1;
  let distance = 0;
  for (const sha of ancestors) {
    if (measured.has(sha)) {
      a = measured.get(sha);
      break;
    }
    distance++;
  }
  const fallback = a < 0;
  if (fallback) a = b === ds.runs.length - 1 ? b - 1 : ds.runs.length - 1;
  if (a < 0) return `${MARKER}\n### Benchmark results\n\nThere is no history to compare with yet.\n`;
  const base = ds.runs[a];

  const rows = [];
  ds.benches.forEach((bench, i) => {
    const s = values[i];
    if (isNaN(s[b])) return;
    const floor = registry.categories.find((c) => c.id === bench.category).floor;
    const cmp = S.compareRuns(s, a, b, { boundaries: S.boundariesFor(annots, bench.name), floor });
    rows.push({ ...bench, ...cmp });
  });

  const lines = [MARKER, `### Benchmark results`, ""];
  const baseLink = `[${base.short}](${base.url || `${pkg.repo}/commit/${base.commit}`})`;
  if (fallback)
    lines.push(`Compared with ${baseLink}, the latest commit measured on the default branch: none of the ${ancestors.length} commits up to the merge base of this pull request was measured, so the differences may include changes that are not part of it.`);
  else
    lines.push(`Compared with ${baseLink}${distance ? `, the latest measured ancestor of the merge base (${distance} commit${distance > 1 ? "s" : ""} before it)` : ", the merge base"}.`);
  lines.push(`Times are the ${STATS[stat].label.toLowerCase()} of every benchmark. A change is unusual when it exceeds both three times the benchmark's typical change between consecutive runs on the default branch and a minimum per category (${registry.categories.map((c) => `${c.label.toLowerCase()} ${Math.round(c.floor * 100)}%`).join(", ")}). A single run can still be a fluke, so rerun before drawing conclusions.`, "");

  lines.push("| | Geometric mean | Unusual: slower | Unusual: faster | Compared |", "|:--|--:|--:|--:|--:|");
  for (const c of registry.categories) {
    const cs = rows.filter((r) => r.category === c.id && !isNaN(r.d) && !r.boundary);
    if (!cs.length) continue;
    const g = cs.reduce((x, r) => x + r.d, 0) / cs.length;
    lines.push(`| ${c.label} | ${formatChange(g)} | ${cs.filter((r) => r.sign > 0).length} | ${cs.filter((r) => r.sign < 0).length} | ${cs.length} |`);
  }
  lines.push("");

  const table = (rs) => [
    "| Benchmark | Baseline | This PR | Change | |",
    "|:--|--:|--:|--:|:--|",
    ...rs.map((r) => {
      const note = r.boundary ? "not comparable" : r.sign > 0 ? "🔴 slower" : r.sign < 0 ? "🟢 faster" : r.sign === null && !isNaN(r.d) ? "noise unknown" : "";
      return `| ${code(r.name)} | ${formatTime(r.va)} | ${formatTime(r.vb)} | ${formatChange(r.d)} | ${note} |`;
    }),
  ];
  const unusual = rows.filter((r) => r.sign).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  if (unusual.length) lines.push(...table(unusual), "");
  else lines.push("No unusual changes.", "");

  const all = [...rows].sort((x, y) => x.name.localeCompare(y.name));
  lines.push("<details><summary>All benchmarks</summary>", "", ...table(all), "", "</details>", "");
  lines.push(`History: ${DASHBOARD}?pkg=${pkgKey}`);
  return lines.join("\n") + "\n";
}

function comment(o) {
  const pkg = packageOf(o.package);
  const history = readHistory(o.history, pkg);
  if (o.data && fs.existsSync(o.data))
    importLegacy(history, parseDataJs(fs.readFileSync(o.data, "utf8")), pkg.legacy);
  const results = validateResults(readJSON(o.results));
  const ancestors = o.ancestors && fs.existsSync(o.ancestors)
    ? fs.readFileSync(o.ancestors, "utf8").split(/\s+/).filter(Boolean)
    : [];
  fs.writeFileSync(o.out, report(o.package, history, results, runOf(o, results), ancestors));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const o = args(process.argv.slice(2));
  const commands = { convert, append, comment };
  const cmd = commands[o._[0]];
  if (!cmd) {
    console.error("usage: publish.mjs convert|append|comment ...");
    process.exit(2);
  }
  cmd(o);
}
