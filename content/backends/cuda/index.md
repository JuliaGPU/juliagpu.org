+++
title = "NVIDIA CUDA"
description = "The most mature back-end, with GPU arrays, kernel programming on par with CUDA C, wrappers for NVIDIA's libraries, and tile-based kernels through cuTile.jl."
weight = 1

[[params.packages]]
name = "CUDA.jl"
repository = "https://github.com/JuliaGPU/CUDA.jl"
documentation = "https://cuda.juliagpu.org/stable/"

[[params.packages]]
name = "cuTile.jl"
repository = "https://github.com/JuliaGPU/cuTile.jl"
documentation = "https://juliagpu.github.io/cuTile.jl/stable/"
+++

NVIDIA GPUs are programmed from Julia with two packages:

- [CUDA.jl](https://github.com/JuliaGPU/CUDA.jl) is the foundation. It provides the
  `CuArray` array type, a compiler for writing CUDA kernels in Julia, wrappers for
  NVIDIA's libraries such as cuBLAS and cuDNN, and profiling tools. It has been developed
  since 2014 and is the most complete of the JuliaGPU back-ends.
- [cuTile.jl](https://github.com/JuliaGPU/cuTile.jl) builds on CUDA.jl and adds another way
  to write kernels. Instead of describing what a single GPU thread does, a cuTile kernel
  operates on *tiles*, fixed-size blocks of an array, and NVIDIA's [Tile
  IR](https://docs.nvidia.com/cuda/tile-ir/) compiler decides how to map that work onto
  threads, tensor cores and the tensor memory accelerator.

Most code only needs CUDA.jl's arrays. Custom kernels are for the parts that array
operations do not cover or do not run fast enough, and cuTile.jl is worth considering when
such a kernel is a dense computation over blocks of data, like a matrix multiplication or an
attention layer.


## Installation

Install CUDA.jl with Julia's package manager:

```julia-repl
pkg> add CUDA
```

All you need on the system is a recent [NVIDIA driver](https://www.nvidia.com/en-us/drivers/).
There is no need to install the CUDA toolkit: CUDA.jl downloads a version that is compatible
with your driver when it is first used. CUDA.jl supports the latest Julia LTS release and
newer, on Linux (x86-64 and ARM64, including NVIDIA Jetson boards) and Windows (x86-64), with
GPUs from the Maxwell architecture onwards as long as the selected toolkit still supports them.

`CUDA.versioninfo()` shows what was installed and which GPUs were detected, which makes it
the first thing to run, and to include in bug reports:

```julia-repl
julia> using CUDA

julia> CUDA.versioninfo()
CUDA toolchain: 
- runtime 13.4.0, artifact installation
- driver 615.78.8 for CUDA 13.5, forward-compatible
- compiler 13.5.37, artifact installation

CUDA libraries: 
- cuBLAS: 13.8.0
- cuSPARSE: 12.8.6
- cuSOLVER: 12.3.5
- cuFFT: 12.4.0
- cuRAND: 10.4.4
- CUPTI: 2026.3.1 (API 13.4.1)
- NVML: 13.0.0+615.78.8
⋮

1 device:
  0: NVIDIA GeForce RTX 5080 (sm_120, 15.522 GiB / 15.921 GiB available)
     compiles to sm_120a / PTX 9.4 (LLVM: sm_120a / PTX 9.2)
```

## Array programming

A `CuArray` is a Julia array that lives in GPU memory. Operations on it run on the GPU, and
most generic Julia code that works with arrays works with a `CuArray` too:

```julia-repl
julia> a = CuArray(Float32[1 2; 3 4])
2×2 CuArray{Float32, 2, CUDACore.DeviceMemory}:
 1.0  2.0
 3.0  4.0

julia> a * a'
2×2 CuArray{Float32, 2, CUDACore.DeviceMemory}:
  5.0  11.0
 11.0  25.0

julia> sqrt.(a .+ 1)
2×2 CuArray{Float32, 2, CUDACore.DeviceMemory}:
 1.41421  1.73205
 2.0      2.23607

julia> sum(a)
10.0f0

julia> Array(a)
2×2 Matrix{Float32}:
 1.0  2.0
 3.0  4.0
```

CUDA.jl wraps NVIDIA's libraries, and most of their functionality is reached through Julia's
standard interfaces: the matrix multiplication above calls cuBLAS, `cholesky` and `\` call
cuSOLVER, `fft` from [AbstractFFTs.jl](https://github.com/JuliaMath/AbstractFFTs.jl) calls
cuFFT, and sparse matrices like `CuSparseMatrixCSR` are backed by cuSPARSE. Libraries such as
cuDNN and cuTENSOR are available as separate packages.


## Kernel programming

When array operations are not enough, you can write a kernel as a regular Julia function and
launch it with `@cuda`. Kernels follow CUDA's SIMT model: the function runs once per thread,
and uses the thread and block indices to decide which elements to work on:

```julia-repl
julia> function vadd!(c, a, b)
           i = (blockIdx().x - 1) * blockDim().x + threadIdx().x
           if i <= length(c)
               @inbounds c[i] = a[i] + b[i]
           end
           return
       end
vadd! (generic function with 1 method)

julia> a = CUDA.rand(Float32, 10_000);

julia> b = CUDA.rand(Float32, 10_000);

julia> c = similar(a);

julia> @cuda threads=256 blocks=cld(length(c), 256) vadd!(c, a, b);

julia> c == a .+ b
true
```

If you want kernels that also run on GPUs from other vendors, write them with
[KernelAbstractions.jl](https://github.com/JuliaGPU/KernelAbstractions.jl) instead, which
CUDA.jl supports as a back-end.

### Tile kernels with cuTile.jl

In a cuTile kernel there is no `threadIdx`. Each block loads tiles from its input arrays,
computes on them with ordinary Julia operations, and stores the result. Here is a matrix
multiplication where every block computes one 64×64 tile of `C`:

```julia-repl
julia> using CUDA, cuTile

julia> import cuTile as ct

julia> function matmul!(C, A, B)
           a_tiles = ct.eachtile(A, (64, 32))
           b_tiles = ct.eachtile(B, (32, 64))
           c_tiles = ct.eachtile(C, (64, 64))
           m, n = ct.bid(1), ct.bid(2)
           acc = zeros(Float32, (64, 64))
           for k in Int32(1):Int32(size(a_tiles, 2))
               acc = muladd(a_tiles[m, k], b_tiles[k, n], acc)
           end
           c_tiles[m, n] = acc
           return
       end
matmul! (generic function with 1 method)

julia> A = CUDA.rand(Float16, 1024, 512);

julia> B = CUDA.rand(Float16, 512, 1024);

julia> C = CUDA.zeros(Float32, 1024, 1024);

julia> @cuda backend=cuTile blocks=(16, 16) matmul!(C, A, B);

julia> C ≈ Float32.(A) * Float32.(B)
true
```

The kernel does not say how the work is divided among threads or how to use tensor cores:
the Tile IR compiler makes those decisions. cuTile.jl kernels take `CuArray`s, are launched
with `@cuda`, and run on CUDA.jl's current stream, so they mix freely with array operations,
library calls and SIMT kernels.

Choose cuTile.jl for kernels that decompose into regular blocks of work, especially when they
should use tensor cores: matrix multiplications, attention, normalization layers, softmax.
Choose CUDA.jl kernels when you need control over individual threads, for example for
irregular data structures or data-dependent control flow, or when you need to support GPUs
older than Ampere. cuTile.jl requires Julia 1.11 or newer, an NVIDIA driver that supports
CUDA 13 (version 580 or later), and a GPU with compute capability 8.0 or newer (Ampere or
later).


## Learn more

- The [CUDA.jl documentation](https://cuda.juliagpu.org/stable/) starts with an
  [introductory tutorial](https://cuda.juliagpu.org/stable/tutorials/introduction/) that
  goes from array operations to an optimized kernel. It also covers
  [installation](https://cuda.juliagpu.org/stable/installation/overview/) with a specific or
  local toolkit, [porting an application](https://cuda.juliagpu.org/stable/usage/workflow/),
  [array programming](https://cuda.juliagpu.org/stable/usage/array/) and the vendor
  libraries, [kernel programming](https://cuda.juliagpu.org/stable/development/kernel/), and
  [profiling](https://cuda.juliagpu.org/stable/development/profiling/). The
  [requirements](https://github.com/JuliaGPU/CUDA.jl#requirements) in the README list the
  supported combinations of Julia, toolkit and GPU.
- The [cuTile.jl documentation](https://juliagpu.github.io/cuTile.jl/stable/) explains the
  [programming model](https://juliagpu.github.io/cuTile.jl/stable/man/programming_model/),
  builds up a [matrix
  multiplication](https://juliagpu.github.io/cuTile.jl/stable/tutorials/matmul/) step by
  step, lists [hardware and compiler
  requirements](https://juliagpu.github.io/cuTile.jl/stable/man/compatibility/), and
  [compares](https://juliagpu.github.io/cuTile.jl/stable/man/comparison/) the API with cuTile
  Python.
- The [Get started](/get-started/) page has more tutorials and recorded workshops.
- Posts on this site: [CUDA.jl 6.3](/post/2026-08-19-cuda_6.3/) and
  [6.4](/post/2026-09-14-cuda_6.4/), [cuTile.jl 1.0](/post/2026-08-19-cutile_1.0/) and
  [0.3](/post/2026-05-05-cutile_0.3/), and the [overview of Julia's GPU
  ecosystem](/post/2026-08-03-gpu_ecosystem/). Other release announcements are on the
  [blog](/post/).
- CUDA.jl's benchmark history is on the [performance dashboard](/perf/?pkg=cuda).
- Questions can be asked in the GPU category of the [Julia
  Discourse](https://discourse.julialang.org/c/domain/gpu), and bugs reported on the issue
  trackers of [CUDA.jl](https://github.com/JuliaGPU/CUDA.jl/issues) and
  [cuTile.jl](https://github.com/JuliaGPU/cuTile.jl/issues).
