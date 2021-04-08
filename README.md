# JuliaGPU website

This repository hosts the landing page of the JuliaGPU organization. It is intended to
quickly describe the GPU programming capabilities of the Julia programming language, and
point to relevant resources for each of the GPU platforms.

The website is built with [Franklin.jl](https://github.com/tlienart/Franklin.jl), and the
master branch is automatically deployed by Github Actions.


## Quick start

To view the site locally, install Franklin and run `serve()` in the root of this repository.
A manifest is provided to exactly reproduce the package dependencies as used by CI.

For deploying to `juliagpu.org`, just create a pull request. A comment will appear with a
link to a preview of the website. Once the PR is merged to master, CI will automatically
build the website and deploy to Github pages.
