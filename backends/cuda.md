+++
title = "NVIDIA CUDA"
+++

# NVIDIA CUDA

~~~
<p>
<a href="https://cuda.juliagpu.org/stable/">
  <img src="https://img.shields.io/badge/docs-stable-blue.svg" alt>
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

The [documentation](https://cuda.juliagpu.org/stable/) of CUDA.jl demonstrates each of these approaches.


## Getting started

CUDA.jl can be easily installed through Julia's package manager. You only need
to install the NVIDIA driver; CUDA.jl will automatically download and install a
compatible CUDA toolkit:

```
pkg> add CUDA
```

Once you have the package installed, you can import it and start using it, e.g.,
via the `CuArray` array abstraction:

```julia
julia> using CUDA

julia> A = CuArray(ones(5, 5));

julia> A .+ 1
5×5 CuMatrix{Float64, CUDA.DeviceMemory}:
 2.0  2.0  2.0  2.0  2.0
 2.0  2.0  2.0  2.0  2.0
 2.0  2.0  2.0  2.0  2.0
 2.0  2.0  2.0  2.0  2.0
 2.0  2.0  2.0  2.0  2.0
```

Array operations like the `A .+ 1` above are automatically offloaded to the GPU,
and allow for a very high-level programming style. If you need more control,
you can write your own CUDA kernels directly in Julia:

```julia
julia> function add_one(A)
           i = threadIdx().x
           A[i] += 1
           return
       end

julia> @cuda threads=length(A) add_one(A);

julia> A
5×5 CuMatrix{Float64, CUDA.DeviceMemory}:
 3.0  3.0  3.0  3.0  3.0
 3.0  3.0  3.0  3.0  3.0
 3.0  3.0  3.0  3.0  3.0
 3.0  3.0  3.0  3.0  3.0
 3.0  3.0  3.0  3.0  3.0
```

Even though in the example above CUDA.jl takes care of low-level details like
memory management or device synchronization, it is still possible to do this
yourself by directly calling into the underlying CUDA APIs. For more details,
refer to the [CUDA.jl
documentation](https://cuda.juliagpu.org/stable/lib/driver/).


## Support

CUDA.jl aims to support:

- all current versions of Julia, starting from the latest LTS;
- the current and previous major version of the CUDA toolkit;
- all platforms that the CUDA toolkit supports (i.e., x86 and arm64, Linux
  and Window), including support for embedded devices like NVIDIA Jetson.

In terms of API coverage, CUDA.jl aims to cover all APIs provided by the CUDA
toolkkit, including its libraries like cuBLAS, cuFFT, cuSPARSE, etc. Other
common libraries, like cuDNN, are also supported. For each of these, we always
provide low-level bindings to the CUDA APIs (making it possible to easily port
existing code), while also providing high-level wrappers for most common APIs.


## Performance

Julia on the CPU is known for its good performance, approaching that of
statically compiled languages like C. The same holds for programming NVIDIA GPUs
with kernels written using CUDA.jl, where we have [shown][compiler-paper] the
performance to approach and even sometimes exceed that of CUDA C on a
selection[^1] of applications from the Rodinia benchmark suite:

~~~
<div class="card mb-3">
  <a href="/assets/img/cuda-performance.png">
    <img src="/assets/img/cuda-performance.png" class=card-img-top alt>
  </a>
  <div class=card-body>
    <p class=card-text align=center>
      Relative performance of Rodinia benchmarks <a href=https://github.com/JuliaParallel/rodinia>implemented in Julia with CUDA.jl</a>.
    </p>
  </div>
</div>
~~~

---

[^1]: Since porting applications from one programming language to another is labour
intensive, we only ported and analyzed the 10 smallest benchmarks from the suite. More details can be found in [the paper][compiler-paper].

[compiler-paper]: https://www.sciencedirect.com/science/article/pii/S0965997818310123
