+++
title = "OpenCL"
description = "Vendor-neutral array and kernel programming for any device with an OpenCL driver, including CPUs through PoCL."
weight = 5

[[params.packages]]
name = "OpenCL.jl"
repository = "https://github.com/JuliaGPU/OpenCL.jl"
documentation = "https://juliagpu.github.io/OpenCL.jl/stable/"
+++

[OpenCL.jl](https://github.com/JuliaGPU/OpenCL.jl) makes it possible to program
any device with an OpenCL driver from Julia: GPUs from NVIDIA, AMD and Intel,
but also CPUs, using [PoCL](https://portablecl.org/) or Intel's CPU runtime.
It offers the same programming model as the other JuliaGPU back-ends: a
`CLArray` type for array programming, and kernels written in Julia and launched
with `@opencl`. These kernels are compiled to SPIR-V, and on drivers that can't
load SPIR-V, such as NVIDIA's, translated to OpenCL C. Traditional kernels
written in OpenCL C are supported as well.

With PoCL, OpenCL.jl can execute GPU-style Julia code on the CPU, which is
useful for testing GPU code on machines without a GPU, and as a CPU back-end for
portable libraries.

## Installation

OpenCL.jl is installed with Julia's package manager. It needs an OpenCL driver,
which can be installed system-wide (e.g., with the GPU vendor's driver package),
or added as a Julia package: `pocl_jll` provides PoCL on all platforms, and
`intel_opencl_rt_jll` Intel's CPU runtime on x86_64 Linux and Windows. These
need to be loaded before OpenCL.jl is first used, because the list of drivers
is only read once. OpenCL.jl supports Julia 1.10 and later on Linux, macOS and
Windows, and is tested with PoCL, Intel's CPU runtime and NVIDIA's OpenCL
driver; what works on other drivers depends on the features they support.
`OpenCL.versioninfo()` shows what was found:

```julia-repl
pkg> add OpenCL, pocl_jll

julia> using pocl_jll, OpenCL

julia> OpenCL.versioninfo()
OpenCL.jl version 1.0.0

Toolchain:
 - Julia v1.13.4
 - OpenCL: 2024.10.24+1
 - SPIRV_LLVM_Backend: 23.1.4+5
 - SPIRV_Tools: 2025.4.0+0
 - spirv2clc: 0.2.8+0

Julia packages:
- GPUArrays: 12.2.0
- GPUCompiler: 2.22.2
- KernelInterface: 0.4.6
- KernelAbstractions: 0.10.7
- LLVM: 10.4.3
- SPIRVIntrinsics: 1.6.0
- pocl_jll: 7.2.2+20

Available platforms: 3
 - Portable Computing Language
   OpenCL 3.0, PoCL 7.2~julia-3a77808afb23  Linux, Release, RELOC, SPIR-V, LLVM 22.1.8jl, SLEEF, DISTRO, POCL_DEBUG
   · cpu-haswell-AMD Ryzen 9 5950X 16-Core Processor (svm:c+f, usm:h+d, bda, fp16, fp64, il, sg:shfl+blt)
 - Intel(R) OpenCL Graphics (discrete)
   OpenCL 3.0
   · Intel(R) Arc(TM) A770 Graphics (svm:c, usm:h+d, fp16, il, sg:shfl+blt)
 - NVIDIA CUDA
   OpenCL 3.0, CUDA 13.5.41
   · NVIDIA RTX 6000 Ada Generation (svm:c, fp64)
```

## Array programming

The easiest way to use a device is through `CLArray`. Operations on these
arrays, such as broadcasting and reductions, are executed by the OpenCL device:

```julia-repl
julia> a = CLArray(Float32[1, 2, 3, 4])
4-element CLArray{Float32, 1, OpenCL.cl.UnifiedDeviceMemory}:
 1.0
 2.0
 3.0
 4.0

julia> b = a .^ 2 .+ 1f0
4-element CLArray{Float32, 1, OpenCL.cl.UnifiedDeviceMemory}:
  2.0
  5.0
 10.0
 17.0

julia> sum(b)
34.0f0
```

By default, OpenCL.jl uses the first device of the first platform; another
one can be selected with `cl.platform!` and `cl.device!`, e.g.,
`cl.platform!("NVIDIA")`.

## Kernel programming

Kernels can be written in Julia and launched with `@opencl`, specifying the
total number of work-items with `global_size`. Here on an NVIDIA GPU, whose
driver does not accept SPIR-V, so OpenCL.jl translates the kernel to OpenCL C
first:

```julia-repl
julia> using OpenCL

julia> cl.platform!("NVIDIA");

julia> function vadd(a, b, c)
           i = get_global_id()
           @inbounds c[i] = a[i] + b[i]
           return
       end
vadd (generic function with 1 method)

julia> a = CLArray(rand(Float32, 1024)); b = CLArray(rand(Float32, 1024)); c = similar(a);

julia> @opencl global_size=length(c) vadd(a, b, c);
┌ Warning: Device 'NVIDIA RTX 6000 Ada Generation' lacks IL support; using OpenCL C translation.
└ @ OpenCL ~/.julia/packages/OpenCL/DrrmN/src/compiler/compilation.jl:316

julia> Array(c) ≈ Array(a) + Array(b)
true
```

For kernels that are portable across GPU back-ends, use
[KernelAbstractions.jl](https://github.com/JuliaGPU/KernelAbstractions.jl) with
`OpenCLBackend()`. Existing kernels written in OpenCL C can be used too, as
shown in the [documentation](https://juliagpu.github.io/OpenCL.jl/stable/#Basic-example:-vector-add).

## Learn more

- The [OpenCL.jl documentation](https://juliagpu.github.io/OpenCL.jl/stable/),
  with sections on [installation](https://juliagpu.github.io/OpenCL.jl/stable/#Installation),
  [profiling](https://juliagpu.github.io/OpenCL.jl/stable/01-profiling/),
  [exceptions](https://juliagpu.github.io/OpenCL.jl/stable/02-exceptions/) and
  [using host memory](https://juliagpu.github.io/OpenCL.jl/stable/03-host-memory/),
  and the [release notes](https://github.com/JuliaGPU/OpenCL.jl/blob/main/NEWS.md)
  for users of OpenCL.jl 0.9 and earlier.
- [OpenCL.jl 0.10: Now with native Julia kernels](/post/2025-01-13-opencl_0.10/)
- [State of Julia's GPU ecosystem in 2026](/post/2026-08-03-gpu_ecosystem/)
- Questions can be asked in the GPU category of the [Julia
  Discourse](https://discourse.julialang.org/c/domain/gpu), and bugs reported
  on the [issue tracker](https://github.com/JuliaGPU/OpenCL.jl/issues).
