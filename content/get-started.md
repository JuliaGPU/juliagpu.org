+++
title = "Get started"
aliases = ["/learn/"]
description = "Get from zero to running GPU code in Julia, then find the documentation, tutorials and talks to go further."
+++

This page takes you through installing a GPU back-end, working with GPU arrays, writing
your first kernel, and measuring performance. It ends with pointers to more in-depth
material and to places where you can ask for help. You need a recent version of
[Julia](https://julialang.org/downloads/) and a supported GPU.

## Pick your back-end

Every GPU vendor is supported by its own package. Each provides an array type and a macro to
launch kernels written in Julia, and most also wrap the vendor's libraries for linear
algebra, FFTs, random numbers and more.

| Hardware                 | Package                            | Array type | Kernel launch |
|--------------------------|------------------------------------|------------|---------------|
| NVIDIA GPUs              | [CUDA.jl](/backends/cuda/)         | `CuArray`  | `@cuda`       |
| AMD GPUs                 | [AMDGPU.jl](/backends/rocm/)       | `ROCArray` | `@roc`        |
| Intel GPUs               | [oneAPI.jl](/backends/oneapi/)     | `oneArray` | `@oneapi`     |
| Apple M-series chips     | [Metal.jl](/backends/metal/)       | `MtlArray` | `@metal`      |
| Other OpenCL devices, CPUs | [OpenCL.jl](/backends/opencl/)   | `CLArray`  | `@opencl`     |

CUDA.jl is the most mature of these. The others implement the same array interface, so most
of what follows applies to all of them. The examples on this page use CUDA.jl; where a name
differs, substitute the one from the table above (`CUDA.rand` becomes `AMDGPU.rand`,
`oneAPI.rand` or `Metal.rand`, and so on).

## Install and check

Install the package for your hardware from the package manager (press `]` at the Julia
prompt to enter it):

```julia-repl
pkg> add CUDA
```

None of the back-ends require you to install a vendor toolkit yourself. What you do need:

- **CUDA.jl**: an NVIDIA driver, on Linux or Windows. The CUDA toolkit is downloaded
  automatically.
- **AMDGPU.jl**: the AMD GPU driver, on Linux or Windows. The ROCm runtime and libraries are
  downloaded automatically for the GPUs that are detected.
- **oneAPI.jl**: Linux (Windows through WSL2 is experimental), and Intel Gen9 graphics or
  newer.
- **Metal.jl**: a Mac with an M-series chip, running macOS 15 or later.
- **OpenCL.jl**: an OpenCL driver, or the `pocl_jll` package to run kernels on the CPU.

Then load the package and call its `versioninfo` function (`AMDGPU.versioninfo()`,
`oneAPI.versioninfo()`, …) to check that it finds your GPU. The first time, this takes a
while to precompile and download the necessary libraries:

```julia-repl
julia> using CUDA

julia> CUDA.versioninfo()
CUDA toolchain:
- runtime 13.4.0, artifact installation
- driver 620.70.6 for CUDA 13.5
- compiler 13.5.37, artifact installation
⋮

1 device:
  0: NVIDIA RTX 6000 Ada Generation (sm_89, 1.777 GiB / 47.988 GiB available)
     compiles to sm_89 / PTX 9.4 (LLVM: sm_89 / PTX 9.2)
```

If this fails, or your GPU is not listed, see the installation section of the package's
documentation, or [ask for help](#getting-help).

## Working with GPU arrays

The easiest way to use a GPU is through its array type. Create one by converting a CPU
array, or with one of the constructors the package provides:

```julia-repl
julia> a = CuArray([1f0, 2f0, 3f0, 4f0])
4-element CuArray{Float32, 1, CUDACore.DeviceMemory}:
 1.0
 2.0
 3.0
 4.0

julia> b = CUDA.rand(Float32, 1024, 1024);
```

Operations on GPU arrays run on the GPU. Broadcasting fuses an entire expression, including
functions you defined yourself, into a single kernel; reductions, matrix multiplication and
most other array operations work as they do on the CPU:

```julia-repl
julia> c = b .* 2 .+ sin.(b);

julia> sum(c)
1.529925f6

julia> maximum(c; dims=1)
1×1024 CuArray{Float32, 2, CUDACore.DeviceMemory}:
 2.84102  2.84119  2.83742  2.84132  2.83999  …  2.83644  2.83749  2.83905  2.83915

julia> c * c
1024×1024 CuArray{Float32, 2, CUDACore.DeviceMemory}:
 2190.23  2096.57  2247.94  2215.04  2192.84  …  2212.13  2186.21  2268.97  2227.84
 2204.3   2063.32  2257.47  2190.88  2221.25     2211.86  2180.25  2208.53  2237.91
    ⋮                                         ⋱     ⋮
```

To move data back to the CPU, convert to an `Array`. The `cu` function goes the other way,
and also converts `Float64` to `Float32` (see [performance tips](#performance-tips) for why):

```julia-repl
julia> Array(a)
4-element Vector{Float32}:
 1.0
 2.0
 3.0
 4.0

julia> cu(rand(3))
3-element CuArray{Float32, 1, CUDACore.DeviceMemory}:
 0.21175165
 0.16454825
 0.36926574
```

### Scalar indexing

Reading or writing a single element of a GPU array from the CPU is possible, but each access
is a separate copy between CPU and GPU. Code that loops over the elements of a GPU array this
way runs on the CPU, and very slowly. To catch such code, scalar indexing is disallowed:

```julia-repl
julia> a[1]
ERROR: Scalar indexing is disallowed.
Invocation of getindex resulted in scalar indexing of a GPU array.
This is typically caused by calling an iterating implementation of a method.
Such implementations *do not* execute on the GPU, but very slowly on the CPU,
and therefore should be avoided.

If you want to allow scalar iteration, use `allowscalar` or `@allowscalar`
to enable scalar iteration globally or for the operations in question.
⋮

julia> CUDA.@allowscalar a[1]
1.0f0
```

If you hit this error, look for a function that does not have a GPU implementation, and
replace it with a broadcast, a reduction or another array operation. Use `@allowscalar` only
for the occasional element you really need on the CPU. Metal.jl is an exception: by default
its arrays live in memory shared with the CPU, which can be indexed directly.

### Writing code that runs on any array

Generic Julia code that uses array operations works for CPU and GPU arrays alike:

```julia-repl
julia> rms(x) = sqrt(sum(abs2, x) / length(x))
rms (generic function with 1 method)

julia> rms(rand(Float32, 1_000_000))
0.5775573f0

julia> rms(CUDA.rand(Float32, 1_000_000))
0.57691807f0
```

A few patterns keep such code independent of the back-end:

- Allocate new arrays with `similar(x)`, `similar(x, T, dims)`, `zero(x)` or
  `fill!(similar(x), v)` instead of calling a specific constructor. They return an array of
  the same kind as `x`, on the same device.
- Dispatch on `AbstractGPUArray` from
  [GPUArrays.jl](https://github.com/JuliaGPU/GPUArrays.jl) when you need a GPU-specific
  method.
- Use [Adapt.jl](https://github.com/JuliaGPU/Adapt.jl) to move a structure containing arrays
  to the GPU as a whole. One `@adapt_structure` line teaches it about your own types:

```julia-repl
julia> using Adapt

julia> struct Particles{T}
           pos::T
           vel::T
       end

julia> Adapt.@adapt_structure Particles

julia> p = Particles(rand(Float32, 3), zeros(Float32, 3));

julia> adapt(CuArray, p)
Particles{CuArray{Float32, 1, CUDACore.DeviceMemory}}(CuArray(Float32[0.6189147, 0.40415162, 0.79802877]), CuArray(Float32[0.0, 0.0, 0.0]))
```

## Writing kernels

When an operation cannot be expressed with array operations, or you need more control, you
can write a kernel: a Julia function that is executed by many GPU threads in parallel. Each
thread computes its own index and processes one element:

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

julia> @cuda threads=256 blocks=cld(length(c), 256) vadd!(c, a, b)
CUDACore.HostKernel for vadd!(CuDeviceVector{Float32, 1}, CuDeviceVector{Float32, 1}, CuDeviceVector{Float32, 1})

julia> c == a .+ b
true
```

The launch configuration asks for blocks of 256 threads, and enough blocks to cover the whole
array; the `if` guards against the threads past the end. Kernels must return `nothing`, and
only support a subset of Julia: they generally cannot allocate memory or perform I/O, and
code that is not type stable does not compile.

The other back-ends work the same way, with their own names for the launch macro and the
index functions:

- AMDGPU.jl: `@roc groupsize=256 gridsize=…`, with `workitemIdx()`, `workgroupIdx()` and
  `workgroupDim()`.
- oneAPI.jl: `@oneapi items=256 groups=…`, with `get_global_id()`.
- Metal.jl: `@metal threads=256 groups=…`, with `thread_position_in_grid().x`.

### Portable kernels with KernelAbstractions.jl

To write a kernel once and run it on any back-end, use
[KernelAbstractions.jl](https://github.com/JuliaGPU/KernelAbstractions.jl). The kernel is
marked with `@kernel`, and `@index` returns the index of the current work item:

```julia
using KernelAbstractions

@kernel function vadd_kernel!(c, @Const(a), @Const(b))
    i = @index(Global)
    @inbounds c[i] = a[i] + b[i]
end

function vadd_ka!(c, a, b)
    backend = get_backend(c)
    vadd_kernel!(backend)(c, a, b; ndrange=length(c))
    return c
end
```

`get_backend` picks the back-end that matches the array, and `ndrange` sets the number of
work items; KernelAbstractions skips the work items past the end of the range, so no bounds
check is needed. The same code then works with a CPU `Array`, executed through
[PoCL](https://portablecl.org/), and with a `CuArray`:

```julia-repl
julia> a = rand(Float32, 10_000); b = rand(Float32, 10_000);

julia> get_backend(a)
POCLBackend()

julia> vadd_ka!(similar(a), a, b) == a .+ b
true

julia> using CUDA

julia> a_d = CuArray(a); b_d = CuArray(b);

julia> get_backend(a_d)
CUDABackend(false, false, false)

julia> vadd_ka!(similar(a_d), a_d, b_d) == a_d .+ b_d
true
```

And, unchanged, on an Apple M3 Pro with Metal.jl:

```julia-repl
julia> using Metal

julia> a = MtlArray(rand(Float32, 10_000)); b = MtlArray(rand(Float32, 10_000));

julia> get_backend(a)
MetalBackend()

julia> vadd_ka!(similar(a), a, b) == a .+ b
true
```

Kernels are launched asynchronously: call `KernelAbstractions.synchronize(backend)` before
using the result on the CPU, unless you copy it back (as the comparisons above do), which
waits for the kernel to finish. The [KernelAbstractions.jl
documentation](https://juliagpu.github.io/KernelAbstractions.jl/stable/) covers workgroups,
local memory and atomics.

### Ready-made algorithms with AcceleratedKernels.jl

Before writing a kernel, check
[AcceleratedKernels.jl](https://github.com/JuliaGPU/AcceleratedKernels.jl). It is written
with KernelAbstractions.jl and provides sorting, reductions, prefix scans, `findall`, binary
search and a parallel `foreachindex` loop, for every back-end and for multithreaded CPUs:

```julia-repl
julia> import AcceleratedKernels as AK

julia> v = CUDA.rand(Float32, 10_000_000);

julia> AK.sort!(v);

julia> issorted(Array(v))
true

julia> function double!(y, x)
           AK.foreachindex(x) do i
               @inbounds y[i] = 2 * x[i]
           end
           return y
       end
double! (generic function with 1 method)

julia> x = CUDA.rand(Float32, 1000);

julia> double!(similar(x), x) == 2 .* x
true
```

As with any kernel, the body of `foreachindex` is compiled for the GPU, so it has to be in a
function: referring to the non-constant globals of the REPL session fails to compile.

## Performance tips

**Synchronize when measuring time.** GPU operations are asynchronous: they return once the
work is queued, not when it is done. Benchmarking without synchronizing measures only the
launch. Wrap the operation in `CUDA.@sync` (or `AMDGPU.@sync`, `oneAPI.@sync`,
`Metal.@sync`):

```julia-repl
julia> using BenchmarkTools

julia> A = CUDA.rand(Float32, 4096, 4096);

julia> @btime $A * $A;
  15.000 μs (23 allocations: 992 bytes)

julia> @btime CUDA.@sync $A * $A;
  4.041 ms (37 allocations: 1.36 KiB)
```

**Use `Float32`.** Most GPUs are much slower in double precision. On the RTX 6000 Ada used
above, the same matrix multiplication in `Float64` is about 25 times slower:

```julia-repl
julia> B = CUDA.rand(Float64, 4096, 4096);

julia> @btime CUDA.@sync $B * $B;
  102.409 ms (37 allocations: 1.36 KiB)
```

Watch out for literals and functions like `rand()` that produce `Float64` values and promote
the whole computation: write `2f0` or `Float32(π)` instead. Metal.jl does not support
`Float64` at all.

**Keep data on the GPU.** Copying between CPU and GPU is slow compared to the GPU's own memory
bandwidth. Move the data once, do as much work as possible on the GPU, and only copy back the
results you need. Summing an array on the GPU is much faster than first copying it to the CPU:

```julia-repl
julia> @btime CUDA.@sync sum($A);
  31.050 μs (59 allocations: 1.78 KiB)

julia> @btime sum(Array($A));
  30.209 ms (325 allocations: 64.02 MiB)
```

**Profile before optimizing.** CUDA.jl has an integrated profiler, `CUDA.@profile`, that
shows which kernels and API calls take time, and works with NVIDIA's Nsight tools. See the
[CUDA.jl profiling guide](https://cuda.juliagpu.org/stable/development/profiling/), the
[AMDGPU.jl profiling tutorial](https://amdgpu.juliagpu.org/stable/tutorials/profiling), the
[Metal.jl profiling page](https://metal.juliagpu.org/stable/profiling/), or the [blog post on
profiling oneAPI.jl](/post/2023-07-19-oneapi_profiling/).

The [CUDA.jl performance
tutorial](https://cuda.juliagpu.org/stable/tutorials/performance/) goes into more detail,
and most of it applies to the other back-ends too.

## Going further

### Documentation and tutorials

- Each back-end's documentation, linked from its page under [Back-ends](/backends/). The
  [CUDA.jl documentation](https://cuda.juliagpu.org/stable/) is the most complete, and much
  of it is useful regardless of your hardware. Start with its [introduction
  tutorial](https://cuda.juliagpu.org/stable/tutorials/introduction/), which builds up from
  CPU code to array operations and kernels, and the [workflow
  guide](https://cuda.juliagpu.org/stable/usage/workflow/) for porting an application.
- The [KernelAbstractions.jl
  quickstart](https://juliagpu.github.io/KernelAbstractions.jl/stable/quickstart/), and its
  examples of matrix multiplication, transposition and atomics.
- The [AcceleratedKernels.jl manual](https://juliagpu.github.io/AcceleratedKernels.jl/stable/),
  with all available algorithms and their options.
- The [JuliaGPU/Learning](https://github.com/JuliaGPU/Learning) repository, with the
  notebooks of a [2023 course on advanced GPU programming with
  CUDA.jl](https://github.com/JuliaGPU/Learning/tree/main/Courses/AdvancedCUDA) taught at
  CSCS: application and kernel optimization, memory management and concurrent computing.
  Recordings of [part 1](https://www.youtube.com/watch?v=plgbsH9f7gI) and [part
  2](https://www.youtube.com/watch?v=Emr9gfcQr9A) are on YouTube.

### Talks and workshops

A 3-hour workshop from JuliaCon 2021 covering array programming, kernel programming,
profiling with CUDA.jl, AMDGPU.jl and KernelAbstractions.jl. Some APIs have changed since,
but the concepts have not:

{{< youtube Hz9IMJuW5hU >}}

An introduction to writing portable kernels with KernelAbstractions.jl, from JuliaCon Paris
2025:

{{< youtube F4S6LpLPO7A >}}

More recordings:

- [Hands-on with Julia for HPC on GPUs and
  CPUs](https://www.youtube.com/watch?v=kYRnWjS7QWo), a JuliaCon 2025 workshop that
  parallelizes an application with KernelAbstractions.jl, ParallelStencil.jl and JACC.jl.
- [AcceleratedKernels.jl: Cross-Architecture Parallel
  Algorithms](https://www.youtube.com/watch?v=lTn7-M6bdKc), JuliaCon 2025.
- [What's new and improved in CUDA.jl?](https://www.youtube.com/watch?v=AHwDp805ZLY) and
  [What's new in AMDGPU.jl](https://www.youtube.com/watch?v=VsJrA2N-0ks), JuliaCon 2025.
- [Reviving OpenCL.jl for CPU glory](https://www.youtube.com/watch?v=3MMq5VRwWr4), JuliaCon
  2025.
- [Multi-GPU Algorithms with Dagger.jl](https://www.youtube.com/watch?v=226Wtt4q1pc),
  JuliaCon 2026.

### On this site

- [State of Julia's GPU ecosystem in 2026](/post/2026-08-03-gpu_ecosystem/): an overview
  of the packages built on top of the back-ends, from linear algebra and tensor operations
  to whole-program compilers.
- [GPUArrays v11: Port to KernelAbstractions.jl](/post/2025-01-07-gpuarrays-11/): how the
  shared array implementation uses KernelAbstractions.jl.
- [Portable data-parallel primitives for the Julia GPU
  stack](/post/2026-10-14-gsoc-portability/): the algorithms in AcceleratedKernels.jl and
  how they compare to vendor libraries.
- [Showcases](/showcases/) of applications built on these packages, and the
  [blog](/post/) for release announcements.

## Getting help

If you are stuck, or have questions about GPU programming in Julia, you can find members of
the community at:

- Julia Discourse, in the dedicated [GPU
  section](https://discourse.julialang.org/c/domain/gpu/11)
- Julia Slack ([register here](https://julialang.org/slack/)), on the [#gpu
  channel](https://julialang.slack.com/messages/C689Y34LE/)
- [JuliaGPU office hours](https://meet.google.com/hmv-zqvp-tbf), every other week at 2PM
  CET (check the [Julia community calendar](https://julialang.org/community/#events) for
  details)

When reporting a problem, include the output of the back-end's `versioninfo()`.
