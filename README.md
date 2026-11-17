# JuliaGPU website

The sources of <https://juliagpu.org/>, the landing page of the JuliaGPU organization: an
introduction to GPU programming in Julia, pages on each back-end, and a blog with release
announcements. The site is built with [Hugo](https://gohugo.io/).

## Writing a blog post

Create a file in `content/post` named after the publication date, which also sets the date
and URL of the post:

```sh
hugo new content post/2026-12-01-cuda_6.5.md
```

Use a directory with an `index.md` instead (`post/2026-12-01-cuda_6.5/index.md`) when the
post has images, and put them next to it. Hugo skips posts dated in the future. The first paragraph, up to `<!--more-->`, is the
summary shown on the home page and in the feed. REPL sessions go in `julia-repl` code blocks.

External articles can be listed on the blog with a post that only has front matter:

```toml
+++
title = "Title of the article"

[build]
render = "never"

[params]
externalLink = "https://..."
+++
```

## Building

Install Hugo (the version CI uses is in `.github/actions/setup-hugo/action.yml`), and run
`hugo server` to preview the site at <http://localhost:1313/>.

Pull requests are built by CI and deployed to `https://juliagpu.org/pr-preview/pr-<number>/`,
except for pull requests from forks. Merging to `master` deploys the site to the `gh-pages`
branch, which GitHub Pages serves. A scheduled workflow opens a pull request when a new
version of Hugo is released.

## Old URLs

The site moved from Hugo to Franklin.jl in 2021, and back to Hugo in 2026. Pages that moved
list their old URLs as `aliases`, and posts published before 2021 have a `guid` so that feed
readers recognize them. New posts need neither. Images that used to be served from `/assets/`
are mounted there in `hugo.toml`.
