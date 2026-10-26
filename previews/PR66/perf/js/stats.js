// Aggregates, noise estimates and change flags. Pure functions over Float64Arrays (one
// value per run, NaN when missing), so they can be tested with Node. Changes are log
// ratios, so only positive values take part in them: a benchmark that does not allocate
// has no relative change in its allocations.

const ok = (v) => v > 0;

// Runs where the benchmarks matching `name` were measured differently than before, so
// values on either side must not be compared: notes marked `rebase` that cover the name.
export function boundariesFor(annots, name) {
  const out = new Set();
  for (const a of annots) {
    if (!a.rebase) continue;
    if (a.benchmarks && !a.benchmarks.some((p) => name.startsWith(p))) continue;
    out.add(a.run);
  }
  return out;
}

function crosses(boundaries, from, to) {
  for (const b of boundaries) if (b > from && b <= to) return true;
  return false;
}

export function median(xs) {
  if (xs.length === 0) return NaN;
  const s = Float64Array.from(xs).sort();
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// A chain-linked index of several series over runs `from..to`, starting at 1. Each step
// is the geometric mean of the ratios of the series present both in this run and in the
// last run that made it onto the index, so a series that is missing for a while does not
// contribute an old change when it comes back. A run where fewer than `minCoverage` of the
// series present anywhere in the range can be linked is left out (NaN). Across a
// boundary of a series, that series does not contribute to the step.
//
// Returns `level` and `logStep` (the log of each run's step, NaN when it has none), both
// indexed from `from`.
export function chainIndex(series, from, to, { boundaries = [], minCoverage = 0.5 } = {}) {
  const n = to - from + 1;
  const level = new Float64Array(n).fill(NaN);
  const logStep = new Float64Array(n).fill(NaN);
  const active = [];
  series.forEach((s, i) => {
    for (let r = from; r <= to; r++)
      if (ok(s[r])) return active.push({ s, bounds: boundaries[i] || new Set() });
  });
  if (active.length === 0) return { level, logStep };
  const need = Math.max(1, Math.ceil(minCoverage * active.length));

  let prev = -1;
  let current = 1;
  for (let r = from; r <= to; r++) {
    let present = 0;
    for (const { s } of active) if (ok(s[r])) present++;
    if (present < need) continue;
    if (prev < 0) {
      prev = r;
      level[r - from] = current;
      continue;
    }
    let sum = 0;
    let linked = 0;
    let comparable = 0;
    for (const { s, bounds } of active) {
      if (!ok(s[r]) || !ok(s[prev])) continue;
      comparable++;
      if (crosses(bounds, prev, r)) continue;
      sum += Math.log(s[r] / s[prev]);
      linked++;
    }
    if (comparable < need) continue;
    const step = linked > 0 ? sum / linked : 0;
    current *= Math.exp(step);
    level[r - from] = current;
    logStep[r - from] = step;
    prev = r;
  }
  return { level, logStep };
}

// Chain several chain-linked indices into one, giving each the same weight: every step is
// the mean of the log steps of the indices that have one.
export function combineIndices(indices) {
  const n = indices.length ? indices[0].level.length : 0;
  const level = new Float64Array(n).fill(NaN);
  let current = 1;
  let started = false;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let k = 0;
    let anyLevel = false;
    for (const idx of indices) {
      if (!isNaN(idx.level[i])) anyLevel = true;
      if (!isNaN(idx.logStep[i])) {
        sum += idx.logStep[i];
        k++;
      }
    }
    if (k > 0) {
      current *= Math.exp(sum / k);
      level[i] = current;
      started = true;
    } else if (anyLevel && !started) {
      level[i] = current;
      started = true;
    }
  }
  return { level };
}

// The changes between consecutive measurements of one series: `{from, to, d}` with `d`
// the log ratio, leaving out those that cross a boundary.
export function transitions(s, boundaries = new Set()) {
  const out = [];
  out.boundaries = boundaries;
  let prev = -1;
  for (let r = 0; r < s.length; r++) {
    if (!ok(s[r])) continue;
    if (prev >= 0 && !crosses(boundaries, prev, r)) {
      out.push({ from: prev, to: r, d: Math.log(s[r] / s[prev]) });
    }
    prev = r;
  }
  return out;
}

export const NOISE_WINDOW = 40;
export const NOISE_MIN = 10;

// The typical size of a change between two consecutive runs, as a robust standard
// deviation of log ratios (1.4826 × the median absolute deviation), estimated from at most
// NOISE_WINDOW transitions ending at or before run `upTo`, and after the last boundary
// before it. NaN with fewer than NOISE_MIN.
export function noiseAt(trans, upTo) {
  let end = 0;
  while (end < trans.length && trans[end].to <= upTo) end++;
  let start = end;
  while (start > 0 && end - start < NOISE_WINDOW && !crosses(trans.boundaries || [], trans[start - 1].to, upTo))
    start--;
  if (end - start < NOISE_MIN) return NaN;
  const ds = [];
  for (let i = start; i < end; i++) ds.push(trans[i].d);
  const m = median(ds);
  return 1.4826 * median(ds.map((d) => Math.abs(d - m)));
}

export const NOISE_FACTOR = 3;

// Whether a change of log ratio `d` stands out from the noise: +1 for a slowdown, -1 for a
// speedup, 0 when it is within NOISE_FACTOR × noise or below the practical `floor` (a
// fraction, e.g. 0.03 for 3%), and null when the noise is unknown.
export function classify(d, noise, floor) {
  if (isNaN(d) || isNaN(noise)) return null;
  return Math.abs(d) > Math.max(NOISE_FACTOR * noise, Math.log(1 + floor)) ? Math.sign(d) : 0;
}

// What the benchmarks table shows for one series in the runs `from..to`.
export function summarize(s, from, to, { boundaries = new Set(), floor = 0.03 } = {}) {
  let latestRun = -1;
  for (let r = from; r <= to; r++) if (!isNaN(s[r])) latestRun = r;
  if (latestRun < 0) return null;
  const idx = [];
  for (let r = from; r <= to; r++) if (ok(s[r])) idx.push(r);

  // first against last, each the median of three measurements to damp single outliers,
  // and only after the last boundary in the range
  let start = 0;
  for (let i = 1; i < idx.length; i++) if (crosses(boundaries, idx[i - 1], idx[i])) start = i;
  const k = Math.min(3, Math.floor((idx.length - start) / 2));
  const trend =
    k > 0
      ? median(idx.slice(-k).map((r) => s[r])) / median(idx.slice(start, start + k).map((r) => s[r])) - 1
      : NaN;

  // A change is flagged when it stands out from the noise before it, against both the
  // previous run and the level before it (the median of the three runs up to the
  // previous one, so that the return from a spike does not count), and the next run
  // confirms it. The latest change cannot be confirmed yet.
  const trans = transitions(s, boundaries);
  const flagged = [];
  trans.forEach((t, k) => {
    if (t.from < from || t.to > to) return;
    const noise = noiseAt(trans, t.from);
    const sign = classify(t.d, noise, floor);
    if (!sign) return;
    const before = [s[t.from]];
    for (let j = k - 1; j >= 0 && before.length < 3 && trans[j].to === trans[j + 1].from; j--)
      before.push(s[trans[j].from]);
    const level = median(before);
    if (classify(Math.log(s[t.to] / level), noise, floor) !== sign) return;
    const next = trans[k + 1];
    if (!next) flagged.push({ ...t, sign, unconfirmed: true });
    else if (next.from === t.to && classify(Math.log(s[next.to] / level), noise, floor) === sign)
      flagged.push({ ...t, sign });
  });

  const last = trans.length ? trans[trans.length - 1] : null;
  const lastChange = last && last.to === latestRun && last.from >= from ? last : null;
  return {
    latest: s[latestRun],
    latestRun,
    trend,
    // what the latest change is judged against
    noise: noiseAt(trans, latestRun),
    flagged,
    last: lastChange && {
      d: lastChange.d,
      sign: classify(lastChange.d, noiseAt(trans, lastChange.from), floor),
    },
  };
}

// The comparison of one series between runs `a` and `b`, judged against the noise of the
// changes up to `a`.
export function compareRuns(s, a, b, { boundaries = new Set(), floor = 0.03 } = {}) {
  const va = s[a];
  const vb = s[b];
  if (!ok(va) || !ok(vb)) return { va, vb, d: va === 0 && vb === 0 ? 0 : NaN, sign: null, noise: NaN };
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const d = Math.log(vb / va);
  if (crosses(boundaries, lo, hi)) return { va, vb, d, sign: null, noise: NaN, boundary: true };
  const noise = noiseAt(transitions(s, boundaries), lo);
  return { va, vb, d, noise, sign: classify(d, noise, floor) };
}

export function geomean(xs) {
  const ys = xs.filter(ok);
  if (ys.length === 0) return NaN;
  return Math.exp(ys.reduce((a, x) => a + Math.log(x), 0) / ys.length);
}
