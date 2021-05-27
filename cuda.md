+++
title = "NVIDIA CUDA"
+++

# NVIDIA CUDA

~~~
<p>
<a href="https://juliagpu.gitlab.io/CUDA.jl/">
  <img src="https://img.shields.io/badge/docs-latest-blue.svg" alt>
</a>
<a href="https://github.com/JuliaGPU/CUDA.jl">
  <img src="https://img.shields.io/github/stars/JuliaGPU/CUDA.jl?style=social" alt>
</a>
</p>
~~~

The programming support for NVIDIA GPUs in Julia is provided by the
[CUDA.jl](https://github.com/JuliaGPU/CUDA.jl) package.
It is built on the CUDA toolkit, and aims to be as full-featured and offer the same performance as CUDA C.
The toolchain is mature, has been under development since 2014 and can easily be installed on any current version of Julia using the integrated package manager.

CUDA.jl makes it possible to program NVIDIA GPUs at different abstraction levels:

- by using the `CuArray` type, providing a user-friendly yet powerful abstraction that does not require any GPU programming experience;
- by writing CUDA kernels, with the same performance as kernels written in CUDA C;
- by interfacing with CUDA APIs and libraries directly, offering the same level of
  flexibility you would expect from a C-based programming environment.

The [documentation](https://juliagpu.gitlab.io/CUDA.jl/) of CUDA.jl demonstrates each of these approaches.


## Performance

Julia on the CPU is known for its good performance, approaching that of statically compiled languages like C. The same holds for programming NVIDIA GPUs with kernels written using CUDA.jl, where we have [shown][compiler-paper] the performance to approach and even sometimes exceed that of CUDA C on a selection[^1] of applications from the Rodinia benchmark suite:

~~~
<div class="card mb-3">
  <a href="/assets/img/cuda-performance.png">
    <img src="/assets/img/cuda-performance.png" class=card-img-top alt>
  </a>
  <div class=card-body>
    <p class=card-text>
      Relative performance of Rodinia benchmarks <a href=https://github.com/JuliaParallel/rodinia>implemented in Julia with CUDA.jl</a>.
    </p>
  </div>
</div>
~~~

## Publications

Much of the software in this toolchain was developed as part of academic research. If you would like to help support it, please star the relevant repositories as such metrics may help us secure funding in the future. If you use our software as part of your research, teaching, or other activities, we would be grateful if you could cite our work:

- Tim Besard, Christophe Foket, and Bjorn De Sutter. "[Effective extensible programming: Unleashing Julia on GPUs.](https://ieeexplore.ieee.org/abstract/document/8471188)" *IEEE Transactions on Parallel and Distributed Systems* (2018).

---

[^1]: Since porting applications from one programming language to another is labour
intensive, we only ported and analyzed the 10 smallest benchmarks from the suite. More details can be found in [the paper][compiler-paper].
