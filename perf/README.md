# JuliaGPU performance dashboard

The benchmark history of the JuliaGPU back-ends, served at <https://juliagpu.org/perf/>.
It is a static page, which Hugo copies into the site as it is (see the mount in `hugo.toml`).

The page only renders. The packages run their benchmarks on Buildkite, and
[JuliaGPU/benchmark-action](https://github.com/JuliaGPU/benchmark-action) publishes the
results to each package's gh-pages branch and comments on pull requests. That repository
also has the data formats and the statistics, which the page loads through the import map
in `index.html` (pinned to a commit), so the page and the comments judge changes the same
way.

## Packages

`packages.json` lists the packages: where their history (`history`) and their older
github-action-benchmark data (`data`) are published, and their repository and default
branch. A package's benchmark configuration, `perf/benchmark-config.json` on its default
branch, says how its benchmarks are categorized, which statistic its older data recorded,
and which changes to how the benchmarks are run to annotate.

`?data=<url>` and `?config=<url>` show other data or another configuration, also together
with `?pkg=<package>` to preview changes to a package's. The data has to be served with
CORS headers, as GitHub Pages does.

## Development

Run `hugo server` in the repository root and open <http://localhost:1313/perf/>. To try
changes to the shared code, point the import map in `index.html` at a local checkout of
benchmark-action served with CORS headers.
