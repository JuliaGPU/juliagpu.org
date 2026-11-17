+++
title = "Apple Metal"
description = "GPU programming on Apple silicon Macs, with array operations, kernels written in Julia, and Apple's Metal Performance Shaders for linear algebra and FFTs."
weight = 4

[[params.packages]]
name = "Metal.jl"
repository = "https://github.com/JuliaGPU/Metal.jl"
documentation = "https://metal.juliagpu.org/stable/"
+++

[Metal.jl](https://github.com/JuliaGPU/Metal.jl) is the Julia package for
programming the GPU of an Apple silicon Mac. It compiles Julia code to Apple's
intermediate representation (AIR) and runs it through the
[Metal](https://developer.apple.com/documentation/metal) framework, so neither
Xcode nor a Metal toolchain is needed. Like the other JuliaGPU back-ends, it can
be used at several levels: the `MtlArray` type for array programming, kernels
written in Julia and launched with `@metal`, and wrappers for the Metal and
Metal Performance Shaders (MPS) APIs.

## Installation

Metal.jl is installed with Julia's package manager, and works with the Metal
framework that is part of macOS. It requires a Mac with Apple silicon (M1 or
newer) running macOS 15 or later, and the native Apple silicon build of Julia
1.10 or later; Intel Macs are not supported. `Metal.versioninfo()` reports the
system, the toolchain and the GPU that was found:

```julia-repl
pkg> add Metal

julia> using Metal

julia> Metal.versioninfo()
macOS 26.7.0, Darwin 25.6.0

Toolchain:
- Julia: 1.13.4
- LLVM: 20.1.8
- Metal: 4.0 (MSL), 2.8 (AIR), 1.2.9 (metallib)

Julia packages:
- Metal.jl: 1.12.0
- GPUArrays: 12.2.0
- GPUCompiler: 2.22.2
- KernelInterface: 0.4.6
- ObjectiveC: 7.2.0
- LLVM: 10.4.3
- LLVMDowngrader_jll: 0.12.2+0
- KernelAbstractions: 0.10.7

1 device:
- Apple M3 Pro (14 GPU cores, 80.000 KiB allocated; Apple9, Metal4 family)
```

## Array programming

The easiest way to use the GPU is through `MtlArray`. Operations on these
arrays, such as broadcasting, reductions, sorting and matrix multiplication,
run on the GPU:

```julia-repl
julia> a = MtlArray(Float32[1 2; 3 4])
2×2 MtlMatrix{Float32, Metal.SharedStorage}:
 1.0  2.0
 3.0  4.0

julia> a .+ 1f0
2×2 MtlMatrix{Float32, Metal.SharedStorage}:
 2.0  3.0
 4.0  5.0

julia> sum(sin.(a); dims=1)
1×2 MtlMatrix{Float32, Metal.SharedStorage}:
 0.982591  0.152495

julia> Array(a * a)
2×2 Matrix{Float32}:
  7.0  10.0
 15.0  22.0
```

Metal.jl also uses Apple's [Metal Performance
Shaders](https://developer.apple.com/documentation/metalperformanceshaders) and
MPSGraph frameworks behind standard Julia interfaces: matrix multiplication,
linear solvers and factorizations from LinearAlgebra, FFTs through
AbstractFFTs.jl, random numbers, and NNlib.jl's softmax, convolution and
pooling. Apple GPUs have no double-precision arithmetic, so `Float64` can't be
used in GPU code; the `mtl` function converts existing data to `Float32`.

## Kernel programming

When array operations are not enough, you can write a kernel in Julia and
launch it with `@metal`, specifying the number of threads per threadgroup and
the number of threadgroups:

```julia-repl
julia> function vadd(a, b, c)
           i = thread_position_in_grid().x
           if i <= length(c)
               @inbounds c[i] = a[i] + b[i]
           end
           return
       end
vadd (generic function with 1 method)

julia> a = MtlArray(rand(Float32, 1000)); b = MtlArray(rand(Float32, 1000)); c = similar(a);

julia> @metal threads=256 groups=cld(length(c), 256) vadd(a, b, c);

julia> Array(c) ≈ Array(a) + Array(b)
true
```

For kernels that are portable across GPU back-ends, use
[KernelAbstractions.jl](https://github.com/JuliaGPU/KernelAbstractions.jl) with
`MetalBackend()`.

## Learn more

- The [Metal.jl documentation](https://metal.juliagpu.org/stable/), with
  sections on [requirements](https://metal.juliagpu.org/dev/),
  [arrays](https://metal.juliagpu.org/dev/usage/array/),
  [kernel programming](https://metal.juliagpu.org/dev/usage/kernel/),
  [numerical operations and Metal Performance
  Shaders](https://metal.juliagpu.org/dev/usage/numerical/),
  [profiling](https://metal.juliagpu.org/dev/development/profiling/), [Xcode
  and Instruments](https://metal.juliagpu.org/dev/development/xcode/) and
  [troubleshooting](https://metal.juliagpu.org/dev/development/troubleshooting/).
- Metal.jl's benchmarks on the [performance dashboard](/perf/?pkg=metal).
- [Metal.jl 1.10: Linear algebra, FFTs, and a faster runtime](/post/2026-07-01-metal-1.10/)
- [Metal.jl 1.6: Initial MPSGraph support](/post/2025-05-30-metal_1.6/)
- [Metal.jl 1.4: Improved random numbers](/post/2024-10-07-metal-1.4/)
- [Metal.jl 0.2: Metal Performance Shaders](/post/2023-03-03-metal_0.2/)
- [Technical preview: Programming Apple M1 GPUs in Julia with Metal.jl](/post/2022-06-24-metal/)
- [State of Julia's GPU ecosystem in 2026](/post/2026-08-03-gpu_ecosystem/)
- Questions can be asked in the GPU category of the [Julia
  Discourse](https://discourse.julialang.org/c/domain/gpu), and bugs reported
  on the [issue tracker](https://github.com/JuliaGPU/Metal.jl/issues).
