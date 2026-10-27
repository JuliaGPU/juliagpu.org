// Loading a package's benchmarks: its configuration from its repository, and its data from
// its gh-pages branch.

import { parseAny } from "benchmark-action/data.js";

export async function loadRegistry(url = "packages.json") {
  const resp = await fetch(url, { cache: "no-cache" });
  if (!resp.ok) throw new Error(`Could not load ${url}: HTTP ${resp.status}`);
  return resp.json();
}

async function fetchText(url) {
  const resp = await fetch(url, { cache: "no-cache" });
  if (!resp.ok) throw new Error(`Could not load ${url}: HTTP ${resp.status}`);
  return resp.text();
}

// The package's benchmark configuration on its default branch, where the publishing
// workflow reads it too. Without one, all benchmarks show up under "Other".
export function configUrl(pkg) {
  if (pkg.config) return pkg.config;
  if (!pkg.repo) return null;
  const repo = pkg.repo.replace(/^https:\/\/github\.com\//, "");
  return `https://raw.githubusercontent.com/${repo}/${pkg.branch || "main"}/perf/benchmark-config.json`;
}

// A package without a configuration gets the defaults; one that cannot be read is an error,
// as its older data would be misread without it.
async function loadConfig(url) {
  if (!url) return {};
  const resp = await fetch(url, { cache: "no-cache" });
  if (resp.status === 404) return {};
  if (!resp.ok) throw new Error(`Could not load ${url}: HTTP ${resp.status}`);
  return resp.json();
}

export async function loadPackage(pkg) {
  const [config, text] = await Promise.all([loadConfig(configUrl(pkg)), loadData(pkg)]);
  return parseAny(text, config);
}

// `history` is preferred; `data` is the github-action-benchmark file used before the
// package published a history.
async function loadData(pkg) {
  try {
    return await fetchText(pkg.history || pkg.data);
  } catch (e) {
    if (!pkg.history || !pkg.data) throw e;
    return fetchText(pkg.data);
  }
}
