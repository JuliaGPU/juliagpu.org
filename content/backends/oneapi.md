+++
title = "Intel oneAPI"
description = "Support for Intel GPUs, from integrated graphics to Arc and Data Center GPU Max, with array operations, kernel programming and oneMKL."
weight = 3

[[params.packages]]
name = "oneAPI.jl"
repository = "https://github.com/JuliaGPU/oneAPI.jl"
documentation = "https://juliagpu.github.io/oneAPI.jl/stable/"
+++

[oneAPI.jl](https://github.com/JuliaGPU/oneAPI.jl) makes it possible to program Intel GPUs
from Julia. It talks to the GPU through [Level Zero](https://github.com/oneapi-src/level-zero),
the low-level interface underneath Intel's oneAPI toolkit.

Like the other JuliaGPU back-ends, oneAPI.jl can be used at several levels: with the
`oneArray` array type and Julia's array operations, by writing kernels in Julia and launching
them with `@oneapi`, or directly through the Level Zero API in the `oneL0` submodule.


## Installation

oneAPI.jl requires Julia 1.10 or later and runs on Linux, or experimentally on Windows
through WSL2. It supports the GPUs that Intel's [Compute
Runtime](https://github.com/intel/compute-runtime) driver supports: integrated graphics from
Tiger Lake onwards and the discrete Arc GPUs (the A series needs Linux 6.2 or later), as well as
the Data Center GPU Max GPUs in the Aurora supercomputer. The Compute Runtime, oneMKL and the
other libraries are downloaded as Julia packages, so you don't need to install the oneAPI
toolkit, but your user does need access to the GPU, which on most distributions means being a
member of the `render` group. Install the package with Julia's package manager:

```julia-repl
pkg> add oneAPI
```

`oneAPI.versioninfo()` shows the versions of the downloaded components and the GPUs that
were found, which makes it the first thing to run, and to include in bug reports:

```julia-repl
julia> using oneAPI

julia> oneAPI.versioninfo()
Binary dependencies:
- NEO: 26.35.39758+2
- libigc: 2.41.5+5
- gmmlib: 22.10.0+0
- SPIRV_LLVM_Backend: 23.1.4+5
- SPIRV_LLVM_Translator: 23.1.4+2
- SPIRV_Tools: 2025.4.0+0
- oneAPI_Support: 0.11.0+0 (oneMKL v2026.1.0)

Toolchain:
- Julia: 1.13.4
- LLVM: 20.1.8

Julia packages:
- oneAPI.jl: 2.10.0
- GPUArrays: 12.2.0
- GPUCompiler: 2.22.2
- KernelAbstractions: 0.10.7
- KernelInterface: 0.4.6
- LLVM: 10.4.3
- SPIRVIntrinsics: 1.6.0

1 driver:
- 00000000-0000-0000-18e8-cf8601039b4e (v1.3.39758, API v1.17.0)

1 device:
- Intel(R) Arc(TM) A770 Graphics
```

If several devices are listed, `device!` selects the one to use. The [installation
guide](https://juliagpu.github.io/oneAPI.jl/stable/installation/) explains how to use the
drivers installed on your system instead, and what to set on systems with Intel's
long-term-servicing driver, such as Aurora.


## Array programming

A `oneArray` is a Julia array that lives in GPU memory. Operations on it, like broadcasting
and reductions, run on the GPU:

```julia-repl
julia> a = oneArray(rand(Float32, 2, 3))
2×3 oneArray{Float32, 2, oneAPI.oneL0.DeviceBuffer}:
 0.0308319  0.193295  0.0890354
 0.568051   0.945077  0.728369

julia> b = a .* 2 .+ 1
2×3 oneArray{Float32, 2, oneAPI.oneL0.DeviceBuffer}:
 1.06166  1.38659  1.17807
 2.1361   2.89015  2.45674

julia> sum(b; dims=2)
2×1 oneArray{Float32, 2, oneAPI.oneL0.DeviceBuffer}:
 3.626324
 7.4829917

julia> Array(b)
2×3 Matrix{Float32}:
 1.06166  1.38659  1.17807
 2.1361   2.89015  2.45674
```

Accessing individual elements from the CPU is not allowed by default, because it is very
slow, so code that does so needs to be expressed in terms of array operations instead. Also
note that many Intel GPUs, especially integrated ones, do not support `Float64`, so it is best
to work with `Float32` data.

Linear algebra is handled by Intel's oneMKL library: matrix multiplication and other BLAS
operations from the LinearAlgebra standard library call oneMKL, sparse matrices are available
as `oneMKL.oneSparseMatrixCSR` and related types, and `fft` from
[AbstractFFTs.jl](https://github.com/JuliaMath/AbstractFFTs.jl) works on a `oneArray`. The
[oneMKL chapter](https://juliagpu.github.io/oneAPI.jl/stable/onemkl/) of the documentation
covers what else is wrapped.


## Kernel programming

When array operations are not enough, you can write a kernel as a Julia function and launch
it with `@oneapi`, specifying the number of work-items per work-group (`items`) and the
number of work-groups (`groups`). Inside the kernel, functions like `get_global_id()` return
the 1-based index of the current work-item:

```julia-repl
julia> function vadd(a, b, c)
           i = get_global_id()
           @inbounds c[i] = a[i] + b[i]
           return
       end
vadd (generic function with 1 method)

julia> a = oneArray(rand(Float32, 1024)); b = oneArray(rand(Float32, 1024));

julia> c = similar(a);

julia> @oneapi items=256 groups=4 vadd(a, b, c);

julia> Array(c) ≈ Array(a) + Array(b)
true
```

To write kernels that also run on other vendors' GPUs, use
[KernelAbstractions.jl](https://github.com/JuliaGPU/KernelAbstractions.jl), which oneAPI.jl
supports through its `oneAPIBackend`.


## Learn more

- The [oneAPI.jl documentation](https://juliagpu.github.io/oneAPI.jl/stable/), with chapters
  on [array](https://juliagpu.github.io/oneAPI.jl/stable/arrays/) and
  [kernel](https://juliagpu.github.io/oneAPI.jl/stable/kernels/) programming, oneMKL,
  profiling and [troubleshooting](https://juliagpu.github.io/oneAPI.jl/stable/troubleshooting/).
- Posts on this site:
  [the first release](/post/2020-11-05-oneapi_0.1/),
  [a 2022 status update](/post/2022-04-06-oneapi_update/),
  [oneAPI.jl 1.0 with oneMKL and Arc support](/post/2023-02-08-oneapi_1.0/),
  [profiling with VTune](/post/2023-07-19-oneapi_profiling/), and
  [oneAPI.jl 1.5 with Ponte Vecchio support and more oneMKL wrappers](/post/2024-05-24-oneapi_1.5/).
- [The JuliaGPU ecosystem](/post/2026-08-03-gpu_ecosystem/), for the packages that build on
  oneAPI.jl and the other back-ends.
- Questions and bug reports go to the [issue
  tracker](https://github.com/JuliaGPU/oneAPI.jl/issues).
