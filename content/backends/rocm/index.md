+++
title = "AMD ROCm"
description = "Array and kernel programming for AMD Radeon and Instinct GPUs, with the ROCm libraries downloaded automatically."
weight = 2

[[params.packages]]
name = "AMDGPU.jl"
repository = "https://github.com/JuliaGPU/AMDGPU.jl"
documentation = "https://amdgpu.juliagpu.org/stable/"
+++

[AMDGPU.jl](https://github.com/JuliaGPU/AMDGPU.jl) is the Julia package for
programming AMD GPUs. It is built on AMD's ROCm platform and follows the
structure of [CUDA.jl](/backends/cuda/): a `ROCArray` type for array
programming, a compiler for kernels written in Julia, and wrappers for the ROCm
libraries. It works on 64-bit Linux and Windows, with Radeon GPUs and APUs as
well as Instinct accelerators.

## Installation

AMDGPU.jl is installed with Julia's package manager. Only the GPU driver needs
to be present on the system: the `amdgpu` kernel driver on Linux, or AMD
Software: Adrenalin Edition on Windows. The ROCm runtime and libraries are
downloaded as artifacts, selected for the GPU detected on the host. On Linux,
your user also needs access to `/dev/kfd`, usually by being in the `render`
group.

AMDGPU.jl supports Julia 1.10 and later. The ROCm artifacts cover most Radeon
GPUs and APUs from RDNA1 to RDNA4 and Instinct accelerators from the MI100 on,
though some architectures, such as the MI300, only have bundles for Linux.

`AMDGPU.versioninfo()` shows what was found:

```julia-repl
pkg> add AMDGPU

julia> using AMDGPU

julia> AMDGPU.versioninfo()
AMDGPU versioninfo
ROCm provider: downloaded artifacts
⋮

AMDGPU devices
┌────┬─────────────────────┬──────────┬───────────┬────────────┬───────────────┐
│ Id │                Name │ GCN arch │ Wavefront │     Memory │ Shared Memory │
├────┼─────────────────────┼──────────┼───────────┼────────────┼───────────────┤
│  1 │ AMD Radeon Graphics │  gfx1036 │        32 │ 30.179 GiB │    64.000 KiB │
└────┴─────────────────────┴──────────┴───────────┴────────────┴───────────────┘
```

## Array programming

The easiest way to use the GPU is through `ROCArray`. Operations on these
arrays, such as broadcasting, reductions, sorting and matrix multiplication,
run on the GPU:

```julia-repl
julia> A = ROCArray(ones(5, 5));

julia> A .+ 1
5×5 ROCArray{Float64, 2, AMDGPU.Runtime.Mem.HIPBuffer}:
 2.0  2.0  2.0  2.0  2.0
 2.0  2.0  2.0  2.0  2.0
 2.0  2.0  2.0  2.0  2.0
 2.0  2.0  2.0  2.0  2.0
 2.0  2.0  2.0  2.0  2.0
```

Since `ROCArray` implements Julia's array interface, a lot of generic code works
on it unchanged, including packages like Flux.jl for machine learning. The ROCm
libraries are mostly used through the same standard interfaces: rocBLAS and
rocSOLVER back `LinearAlgebra` operations like `*`, `\` and `cholesky`, rocFFT
implements the AbstractFFTs.jl interface, rocRAND generates the numbers for
`AMDGPU.rand`, rocSPARSE provides sparse matrices, and MIOpen provides the
convolutions and pooling used by NNlib.jl and Flux.jl.

## Kernel programming

When array operations are not enough, you can write kernels in Julia and launch
them with `@roc`. The `groupsize` and `gridsize` keywords correspond to the
block size and number of blocks in CUDA:

```julia-repl
julia> function add_one!(A)
           i = workitemIdx().x
           A[i] += 1
           return
       end

julia> @roc groupsize=length(A) add_one!(A);

julia> A
5×5 ROCArray{Float64, 2, AMDGPU.Runtime.Mem.HIPBuffer}:
 2.0  2.0  2.0  2.0  2.0
 2.0  2.0  2.0  2.0  2.0
 2.0  2.0  2.0  2.0  2.0
 2.0  2.0  2.0  2.0  2.0
 2.0  2.0  2.0  2.0  2.0
```

For kernels that should also run on other GPUs or on the CPU, write them with
[KernelAbstractions.jl](https://github.com/JuliaGPU/KernelAbstractions.jl) and
launch them on `ROCBackend()`.

## Learn more

- The [AMDGPU.jl documentation](https://amdgpu.juliagpu.org/stable/) starts
  with a [quick start](https://amdgpu.juliagpu.org/stable/tutorials/quickstart).
  It also covers [installation](https://amdgpu.juliagpu.org/stable/install_tips),
  including using a local ROCm installation, [supported
  hardware](https://amdgpu.juliagpu.org/stable/faq), [array
  programming](https://amdgpu.juliagpu.org/stable/usage/arrays), the libraries
  for [linear algebra](https://amdgpu.juliagpu.org/stable/libraries/linalg),
  [sparse arrays](https://amdgpu.juliagpu.org/stable/libraries/sparse),
  [FFTs](https://amdgpu.juliagpu.org/stable/libraries/fft) and [deep
  learning](https://amdgpu.juliagpu.org/stable/libraries/dnn),
  [profiling](https://amdgpu.juliagpu.org/stable/tutorials/profiling) and
  [performance tips](https://amdgpu.juliagpu.org/stable/tutorials/perf).
- AMDGPU.jl's benchmark history is on the [performance
  dashboard](/perf/?pkg=amdgpu).
- [AMDGPU.jl 2.8–2.12: ROCm as artifacts, a performance dashboard, and a faster core](/post/2026-11-16-amdgpu-2.12/)
- [AMDGPU.jl 2.6 and 2.7: linear algebra, sparse arrays, and RDNA4 matrix cores](/post/2026-07-06-amdgpu-2.7/)
- [State of Julia's GPU ecosystem in 2026](/post/2026-08-03-gpu_ecosystem/)
- Questions can be asked in the GPU category of the [Julia
  Discourse](https://discourse.julialang.org/c/domain/gpu), and bugs reported
  on the [issue tracker](https://github.com/JuliaGPU/AMDGPU.jl/issues).
