---
title: "NVIDIA CUDA"
---

[![][docs-latest-img]][docs-latest-url] [![][github-stars-img]][github-stars-url]

[docs-latest-img]: https://img.shields.io/badge/docs-latest-blue.svg
[docs-latest-url]: https://juliagpu.gitlab.io/CUDA.jl/

[github-stars-img]: https://img.shields.io/github/stars/JuliaGPU/CUDA.jl?style=social
[github-stars-url]: https://github.com/JuliaGPU/CUDA.jl

The programming support for NVIDIA GPUs in Julia is provided by the
[CUDA.jl](https://github.com/JuliaGPU/CUDA.jl) package. It is built on the CUDA toolkit, and
aims to be as full-featured and offer the same performance as CUDA C. The toolchain is
mature, has been under development since 2014 and can easily be installed on any current
version of Julia using the integrated package manager.

CUDA.jl makes it possible to program NVIDIA GPUs at different abstraction levels:

- by using the `CuArray` type, providing a user-friendly yet powerful abstraction that does
  not require any GPU programming experience;
- by writing CUDA kernels, with the same performance as kernels written in CUDA C;
- by interfacing with CUDA APIs and libraries directly, offering the same level of
  flexibility you would expect from a C-based programming environment.

The [documentation](https://juliagpu.gitlab.io/CUDA.jl/) of CUDA.jl demonstrates each of
these approaches.


## Performance

Julia on the CPU is known for its good performance, approaching that of statically compiled
languages like C. The same holds for programming NVIDIA GPUs with kernels written using
CUDA.jl, where we have [shown][compiler-paper] the performance to approach and even
sometimes exceed that of CUDA C on a selection[^1] of applications from the Rodinia
benchmark suite:

[^1]: Since porting applications from one programming language to another is labour
intensive, we only ported and analyzed the 10 smallest benchmarks from the suite. More
details can be found in [the paper][compiler-paper].

{{< bootstrap-card
    img="performance.png"
    text="Relative performance of Rodinia benchmarks [implemented in Julia with CUDA.jl](https://github.com/JuliaParallel/rodinia)."
    command="Resize"
    options="700x"
    class="mb-3" >}}


## Publications

Much of the software in this toolchain was developed as part of academic research. If you
would like to help support it, please star the relevant repositories as such metrics may
help us secure funding in the future. If you use our software as part of your research,
teaching, or other activities, we would be grateful if you could cite our work:

[compiler-paper]: https://www.sciencedirect.com/science/article/pii/S0965997818310123
- Tim Besard, Valentin Churavy, Alan Edelman and Bjorn De Sutter. "[Rapid software
  prototyping for heterogeneous and distributed platforms.][compiler-paper]" *Advances in
  Engineering Software* (2019).

- Tim Besard, Christophe Foket, and Bjorn De Sutter. "[Effective extensible programming:
  Unleashing Julia on GPUs.](https://ieeexplore.ieee.org/abstract/document/8471188)" *IEEE
  Transactions on Parallel and Distributed Systems* (2018).

- Tim Besard. "[Abstractions for Programming Graphics Processors in High-Level Programming
  Languages.](https://blog.maleadt.net/phd.pdf)" (2019) PhD dissertation.
