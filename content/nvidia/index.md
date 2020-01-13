---
title: "NVIDIA CUDA"
---

[![][docs-usage-img]][docs-usage-url]

[docs-usage-img]: https://img.shields.io/badge/docs-usage-blue.svg
[docs-usage-url]: https://juliagpu.gitlab.io/CUDA.jl/

The programming support for NVIDIA GPUs in Julia is built on the CUDA toolkit, and aims to
be as full-featured and offer the same performance as working with GPUs in CUDA C. It is a
mature toolchain that has been under development since 2014 and is supported out-of-the-box
on all current versions of Julia. The toolchain is composed of several Julia packages, ecah
with separate responsibilities:

* [CUDAdrv.jl](https://github.com/JuliaGPU/CUDAdrv.jl): interfacing with the CUDA driver library
* [CUDAnative.jl](https://github.com/JuliaGPU/CUDAnative.jl): GPU kernel programming support
* [CuArrays.jl](https://github.com/JuliaGPU/CuArrays.jl): array programming interface

Each of these packages has its own specific documentation, but for a more high-level
overview there is the [CUDA.jl website](https://juliagpu.gitlab.io/CUDA.jl/) with guidelines
and tutorials on effective CUDA programming in Julia.


## Performance

Julia on the CPU is known for its good performance, approaching that of statically compiled
languages like C. The same holds for programming NVIDIA GPUs with CUDAnative.jl, where we
have [shown][cudanative-paper] the performance to approach and even sometimes exceed that of
CUDA C on a selection[^1] of applications from the Rodinia benchmark suite:

[^1]: Since porting applications from one programming language to another is labour
intensive, we only ported and analyzed the 10 smallest benchmarks from the suite. More
details can be found in [the paper][cudanative-paper].

{{< bootstrap-card
    img="performance.png"
    text="Relative performance of Rodinia benchmarks [implemented in Julia with CUDAnative.jl](https://github.com/JuliaParallel/rodinia)."
    command="Resize"
    options="700x"
    class="mb-3" >}}


## Publications

Much of the software in this toolchain was developed as part of academic research. If you
would like to help support it, please star the relevant repositories as such metrics may
help us secure funding in the future. If you use our software as part of your research,
teaching, or other activities, we would be grateful if you could cite our work:

[cudanative-paper]: https://www.sciencedirect.com/science/article/pii/S0965997818310123
- **CuArrays.jl**: Tim Besard, Valentin Churavy, Alan Edelman and Bjorn De Sutter. "[Rapid
  software prototyping for heterogeneous and distributed platforms.][cudanative-paper]"
  *Advances in Engineering Software* (2019).

- **CUDAnative.jl and CUDAdrv.jl**: Tim Besard, Christophe Foket, and Bjorn De Sutter.
  "[Effective extensible programming: Unleashing Julia on
  GPUs.](https://ieeexplore.ieee.org/abstract/document/8471188)" *IEEE Transactions on
  Parallel and Distributed Systems* (2018).

- Tim Besard. "[Abstractions for Programming Graphics Processors in High-Level Programming
  Languages.](https://blog.maleadt.net/phd.pdf)" (2019) PhD dissertation.
